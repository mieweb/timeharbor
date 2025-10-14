import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { formatTime, formatDate, calculateTotalTime } from '../../utils/TimeUtils.js';
import { getTeamName, getUserEmail, getUserName } from '../../utils/UserTeamUtils.js';
import { dateToLocalString, formatDateForDisplay, getTodayBoundaries, getWeekBoundaries, getDayBoundaries } from '../../utils/DateUtils.js';
import { Grid } from 'ag-grid-community';
import { isTeamsLoading } from '../layout/MainLayout.js';

// Constants
const GRID_CONFIG = {
  PAGINATION_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  DEFAULT_SORT_COLUMN: 'startTime',
  DEFAULT_SORT_ORDER: 'desc'
};

// Utility functions
const calculateTimeForEvents = (events) => {
  return events.reduce((totalSeconds, event) => {
    const endTime = event.endTime || Date.now();
    return totalSeconds + Math.floor((endTime - event.startTimestamp) / 1000);
  }, 0);
};

const getColumnDefinitions = () => [
  { headerName: 'Date', field: 'date', flex: 1, sortable: true, filter: 'agDateColumnFilter',
    valueFormatter: p => formatDateForDisplay(p.value) },
  { 
    headerName: 'Team Member', field: 'displayName', flex: 1.5, sortable: true, filter: 'agTextColumnFilter',
    cellRenderer: (params) => {
      return `<span class="cursor-pointer text-primary hover:text-primary-focus hover:underline" 
                     data-user-id="${params.data.userId}" 
                     data-user-name="${params.value}"
                     onclick="window.viewUserTimesheet('${params.data.userId}', '${params.value}')">
                ${params.value}
              </span>`;
    }
  },
  { headerName: 'Email', field: 'userEmail', flex: 1.5, sortable: true, filter: 'agTextColumnFilter' },
  { 
    headerName: 'Hours', field: 'totalSeconds', flex: 1, sortable: true, filter: 'agNumberColumnFilter',
    valueFormatter: p => formatTime(p.value)
  },
  { 
    headerName: 'Clock-in', field: 'firstClockIn', flex: 1.2, sortable: true, filter: 'agDateColumnFilter',
    valueFormatter: p => p.value ? new Date(p.value).toLocaleTimeString() : 'No activity'
  },
  { 
    headerName: 'Clock-out', field: 'lastClockOut', flex: 1.2, sortable: true, filter: 'agDateColumnFilter',
    valueFormatter: p => {
      if (!p.value) return p.data?.hasActiveSession ? 'Active' : '-';
      return new Date(p.value).toLocaleTimeString();
    }
  },
  { 
    headerName: 'Tickets', field: 'tickets', flex: 1.5, sortable: false, filter: false,
    valueFormatter: p => (Array.isArray(p.value) && p.value.length) ? p.value.join(', ') : 'No tickets'
  }
];

const createGridOptions = () => ({
  columnDefs: getColumnDefinitions(),
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
  }
});

Template.home.onCreated(function () {
  const template = this;
  
  // Initialize reactive variables
  const today = new Date();
  const todayStr = dateToLocalString(today);
  template.startDate = new ReactiveVar(todayStr);
  template.endDate = new ReactiveVar(todayStr);
  template.selectedPreset = new ReactiveVar('today');
  template.gridOptions = createGridOptions();
  
  // Subscribe to data
  this.autorun(() => {
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    
    if (teamIds.length) {
      this.subscribe('clockEventsForTeams', teamIds);
      this.subscribe('teamTickets', teamIds);
    }
    
    // Subscribe to all users from teams for proper display
    const allTeams = Teams.find({
      $or: [
        { members: Meteor.userId() },
        { leader: Meteor.userId() },
        { admins: Meteor.userId() }
      ]
    }).fetch();
    
    const allMembers = Array.from(new Set(
      allTeams.flatMap(t => [...(t.members || []), ...(t.admins || []), t.leader].filter(id => id))
    ));
    
    if (allMembers.length) {
      this.subscribe('usersByIds', allMembers);
    }
  });
  
  // Optimized team member summary computation
  template.computeTeamMemberSummary = () => {
    const startDateStr = template.startDate.get();
    const endDateStr = template.endDate.get();
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    
    if (!leaderTeams.length) return [];

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');
    const teamIds = leaderTeams.map(t => t._id);

    const allMembers = Array.from(new Set(
      leaderTeams.flatMap(t => [...(t.members || []), ...(t.admins || []), t.leader].filter(id => id))
    ));

    const rows = [];
    
    // Generate all dates in range
    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const localDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      dates.push(localDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process each member and date combination
    allMembers.forEach(userId => {
      dates.forEach(date => {
        const dayBoundaries = getDayBoundaries(date);
        
        const dayClockEvents = ClockEvents.find({
          userId: userId,
          teamId: { $in: teamIds },
          $or: [
            { startTimestamp: { $gte: dayBoundaries.start, $lte: dayBoundaries.end } },
            { 
              startTimestamp: { $lt: dayBoundaries.start },
              $or: [
                { endTime: { $gte: dayBoundaries.start, $lte: dayBoundaries.end } },
                { endTime: { $exists: false } }
              ]
            }
          ]
        }).fetch();

        if (dayClockEvents.length > 0) {
          let totalSeconds = 0;
          let firstClockIn = null;
          let lastClockOut = null;
          let hasActiveSession = false;
          const ticketTitles = new Set();

          dayClockEvents.forEach(clockEvent => {
            const sessionStart = clockEvent.startTimestamp;
            const sessionEnd = clockEvent.endTime || Date.now();
            
            const overlapStart = Math.max(sessionStart, dayBoundaries.start);
            const overlapEnd = Math.min(sessionEnd, dayBoundaries.end);
            
            if (overlapStart < overlapEnd) {
              const daySessionSeconds = Math.floor((overlapEnd - overlapStart) / 1000);
              totalSeconds += daySessionSeconds;
              
              if (sessionStart >= dayBoundaries.start && sessionStart <= dayBoundaries.end) {
                if (!firstClockIn || sessionStart > firstClockIn) {
                  firstClockIn = sessionStart;
                }
              }
             
              if (clockEvent.endTime && clockEvent.endTime >= dayBoundaries.start && clockEvent.endTime <= dayBoundaries.end) {
                if (!lastClockOut || clockEvent.endTime > lastClockOut) {
                  lastClockOut = clockEvent.endTime;
                }
              } else if (!clockEvent.endTime && sessionEnd >= dayBoundaries.start && sessionEnd <= dayBoundaries.end) {
                hasActiveSession = true;
              }
              
              clockEvent.tickets?.forEach(ticket => {
                const ticketDoc = Tickets.findOne(ticket.ticketId);
                if (ticketDoc) ticketTitles.add(ticketDoc.title);
              });
            }
          });

          if (totalSeconds > 0 || hasActiveSession) {
            const localDateStr = dateToLocalString(date);
            
            rows.push({
              date: localDateStr,
              userId,
              displayName: getUserName(userId),
              userEmail: getUserEmail(userId),
              totalSeconds,
              firstClockIn,
              lastClockOut,
              hasActiveSession,
              tickets: Array.from(ticketTitles)
            });
          }
        }
      });
    });

    return rows.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.displayName.localeCompare(b.displayName);
    });
  };
});

Template.home.onRendered(function () {
  const instance = this;

  // Initialize grid when ready
  instance.autorun(() => {
    const teamsReady = !isTeamsLoading.get();
    const hasLeaderTeam = !!Teams.findOne({ leader: Meteor.userId() });
    if (!teamsReady || !hasLeaderTeam) return;

    Tracker.afterFlush(() => {
      const gridEl = instance.find('#teamDashboardGrid');
      if (gridEl && !gridEl.__ag_initialized) {
        new Grid(gridEl, instance.gridOptions);
        gridEl.__ag_initialized = true;
        const initialRows = instance.computeTeamMemberSummary();
        if (instance.gridOptions?.api) {
          instance.gridOptions.api.setRowData(initialRows);
        }
      }
    });

    // Global function for user timesheet navigation
    window.viewUserTimesheet = (userId, userName) => {
      console.log(`Viewing timesheet for user: ${userName} (${userId})`);
      FlowRouter.go(`/timesheet/${userId}`);
    };
  });

  // Reactive updates for grid data
  instance.autorun(() => {
    instance.startDate.get();
    instance.endDate.get();
    Teams.find({ leader: Meteor.userId() }).fetch();
    ClockEvents.find().fetch();
    Tickets.find().fetch();

    const rows = instance.computeTeamMemberSummary();
    if (instance.gridOptions?.api) {
      instance.gridOptions.api.setRowData(rows);
    }
  });
});

Template.home.onDestroyed(function () {
  if (this.gridOptions?.api) {
    this.gridOptions.api.destroy();
  }
});

Template.home.helpers({
  // User role helpers
  isTeamLeader() {
    return Teams.findOne({ leader: Meteor.userId() });
  },
  
  isFirstTimeUser() {
    const userClockEvents = ClockEvents.find({ userId: Meteor.userId() }).count();
    const userTeams = Teams.find({ members: Meteor.userId() }).count();
    return userClockEvents === 0 && userTeams === 0;
  },
  
  // Optimized personal dashboard helpers
  todayHours() {
    const todayBoundaries = getTodayBoundaries();
    const todayEvents = ClockEvents.find({
      userId: Meteor.userId(),
      startTimestamp: { $gte: todayBoundaries.start, $lte: todayBoundaries.end }
    }).fetch();
    
    return formatTime(calculateTimeForEvents(todayEvents));
  },
  
  weekHours() {
    const weekBoundaries = getWeekBoundaries();
    const weekEvents = ClockEvents.find({
      userId: Meteor.userId(),
      startTimestamp: { $gte: weekBoundaries.start, $lte: weekBoundaries.end }
    }).fetch();
    
    return formatTime(calculateTimeForEvents(weekEvents));
  },
  
  activeSessionsCount() {
    return ClockEvents.find({ 
      userId: Meteor.userId(), 
      endTime: null 
    }).count();
  },
  
  totalProjects() {
    return Teams.find({ members: Meteor.userId() }).count();
  },
  
  hasRecentActivity() {
    return ClockEvents.find({ 
      userId: Meteor.userId() 
    }, { 
      sort: { startTimestamp: -1 }, 
      limit: 5 
    }).count() > 0;
  },
  
  recentClockEvents() {
    return ClockEvents.find({ 
      userId: Meteor.userId() 
    }, { 
      sort: { startTimestamp: -1 }, 
      limit: 5 
    }).fetch();
  },
  
  hasActiveSessions() {
    return ClockEvents.find({ 
      userId: Meteor.userId(), 
      endTime: null 
    }).count() > 0;
  },
  
  activeClockEvents() {
    return ClockEvents.find({ 
      userId: Meteor.userId(), 
      endTime: null 
    }).fetch();
  },
  
  // Legacy helpers for team dashboard
  allClockEvents() {
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    return ClockEvents.find({ teamId: { $in: teamIds } }, { sort: { startTimestamp: -1 } }).fetch();
  },
  
  // Utility helpers
  teamName: getTeamName,
  userName: getUserEmail,
  formatDate,
  
  ticketTitle(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket ? ticket.title : `Unknown Ticket (${ticketId})`;
  },
  
  clockEventTotalTime: calculateTotalTime,
  ticketTotalTime: calculateTotalTime,
  formatTime,
  
  // Team Dashboard helpers
  startDate() { return Template.instance().startDate.get(); },
  endDate() { return Template.instance().endDate.get(); },
  
  formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  },
  
  teamMemberSummary() {
    return [];
  },
  
  getDisplayName: getUserName,
  
  isPresetSelected(presetName) {
    return Template.instance().selectedPreset.get() === presetName;
  }
});

Template.home.events({
  'click #apply-range': (e, t) => {
    const start = t.$('#start-date').val();
    const end = t.$('#end-date').val();
    if (start) t.startDate.set(start);
    if (end) t.endDate.set(end);
    t.selectedPreset.set('custom');
  },
  
  'click #preset-today': (e, t) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    t.startDate.set(todayStr);
    t.endDate.set(todayStr);
    t.$('#start-date').val(todayStr);
    t.$('#end-date').val(todayStr);
    t.selectedPreset.set('today');
  },
  
  'click #preset-yesterday': (e, t) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    t.startDate.set(yesterdayStr);
    t.endDate.set(yesterdayStr);
    t.$('#start-date').val(yesterdayStr);
    t.$('#end-date').val(yesterdayStr);
    t.selectedPreset.set('yesterday');
  },
  
  'click #preset-last7': (e, t) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('last7');
  },
  
  'click #preset-last14': (e, t) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('last14');
  },
  
  'click #preset-thisweek': (e, t) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    t.startDate.set(mondayStr);
    t.endDate.set(sundayStr);
    t.$('#start-date').val(mondayStr);
    t.$('#end-date').val(sundayStr);
    t.selectedPreset.set('thisweek');
  },
  
  'click #viewMyTimesheet': (e, t) => {
    FlowRouter.go(`/timesheet/${Meteor.userId()}`);
  },
  
  'click #reportIssue': (e, t) => {
    window.open('https://github.com/mieweb/timeharbor/issues/new', '_blank');
  },
  
  'click #joinTeam': (e, t) => {
    FlowRouter.go('/teams');
  },
  
  'click #viewGuide': (e, t) => {
    FlowRouter.go('/guide');
  }
});
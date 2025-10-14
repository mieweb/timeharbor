import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ClockEvents, Teams, Tickets } from '../../../collections.js';
import { formatTime, formatDate } from '../../utils/TimeUtils.js';
import { getUserName, getUserEmail } from '../../utils/UserTeamUtils.js';
import { dateToLocalString, getToday, getYesterday, getDaysAgo, getThisWeekStart, formatDateForDisplay } from '../../utils/DateUtils.js';
import { Grid } from 'ag-grid-community';

// Constants
const GRID_CONFIG = {
  PAGINATION_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  DEFAULT_SORT_COLUMN: 'startTime',
  DEFAULT_SORT_ORDER: 'desc'
};

const COLUMN_DEFINITIONS = [
  { 
    headerName: 'Date', 
    field: 'date', 
    flex: 0.8, 
    sortable: true, 
    filter: 'agDateColumnFilter',
    valueFormatter: p => formatDateForDisplay(p.value),
    cellClass: 'font-medium'
  },
  { 
    headerName: 'Clock-in', 
    field: 'startTime', 
    flex: 1, 
    sortable: true, 
    filter: 'agDateColumnFilter',
    valueFormatter: p => p.value ? new Date(p.value).toLocaleTimeString() : 'No session',
    cellClass: 'text-primary'
  },
  { 
    headerName: 'Clock-out', 
    field: 'endTime', 
    flex: 1, 
    sortable: true, 
    filter: 'agDateColumnFilter',
    valueFormatter: p => {
      if (!p.value) return p.data?.isActive ? '🟢 Active' : 'No session';
      return new Date(p.value).toLocaleTimeString();
    },
    cellClass: p => p.data?.isActive ? 'text-success font-bold' : 'text-base-content'
  },
  { 
    headerName: 'Duration', 
    field: 'duration', 
    flex: 0.8, 
    sortable: true, 
    filter: 'agNumberColumnFilter',
    valueFormatter: p => p.value ? formatTime(p.value) : (p.data?.isActive ? 'Running...' : 'No session'),
    cellClass: p => p.value ? 'text-info font-medium' : 'text-base-content opacity-60',
    comparator: (valueA, valueB) => (valueA || 0) - (valueB || 0)
  },
  { 
    headerName: 'Activity', 
    field: 'activityTitle', 
    flex: 1.5, 
    sortable: true, 
    filter: 'agTextColumnFilter',
    valueFormatter: p => p.value || 'No activity',
    cellClass: p => p.value ? 'text-base-content' : 'text-base-content opacity-60',
    tooltipField: 'activityTitle'
  },
  { 
    headerName: 'Team', 
    field: 'teamName', 
    flex: 1, 
    sortable: true, 
    filter: 'agTextColumnFilter',
    valueFormatter: p => p.value || 'No team',
    cellClass: p => p.value ? 'text-primary' : 'text-base-content opacity-60',
    tooltipField: 'teamName'
  },
  { 
    headerName: 'Status', 
    field: 'isActive', 
    flex: 0.6, 
    sortable: true, 
    filter: 'agSetColumnFilter',
    valueFormatter: p => p.value ? '🟢 Active' : '✅ Completed',
    cellClass: p => p.value ? 'text-success font-bold' : 'text-base-content opacity-70',
    filterParams: { values: ['Active', 'Completed'] }
  }
];

// Utility functions
const createDateRange = (startDateStr, endDateStr) => ({
  start: new Date(startDateStr + 'T00:00:00'),
  end: new Date(endDateStr + 'T23:59:59')
});

const isEventInDateRange = (eventStart, dateRange) => 
  eventStart >= dateRange.start && eventStart <= dateRange.end;

const processSessionData = (event, ticketsCache, teamsCache) => {
  const startTime = new Date(event.startTimestamp);
  const endTime = event.endTime ? new Date(event.endTime) : null;
  const duration = endTime ? (endTime - startTime) / 1000 : null;
  
  return {
    date: dateToLocalString(startTime),
    startTime,
    endTime,
    duration,
    isActive: !endTime,
    activityTitle: event.ticketId ? (ticketsCache.get(event.ticketId)?.title || null) : null,
    teamName: event.teamId ? (teamsCache.get(event.teamId)?.name || null) : null,
    ticketId: event.ticketId,
    teamId: event.teamId
  };
};

const createGridOptions = () => ({
  columnDefs: COLUMN_DEFINITIONS,
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
    menuTabs: ['filterMenuTab', 'generalMenuTab'],
  },
  pagination: true,
  paginationPageSize: GRID_CONFIG.PAGINATION_SIZE,
  paginationPageSizeSelector: GRID_CONFIG.PAGE_SIZES,
  rowSelection: 'none',
  animateRows: true,
  enableCellTextSelection: true,
  ensureDomOrder: true,
  suppressRowClickSelection: true,
  suppressCellFocus: false,
  getRowClass: (params) => 
    params.data?.isActive ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' : '',
  onGridReady: (params) => params.api.sizeColumnsToFit(),
  onFirstDataRendered: (params) => {
    params.api.applyColumnState({
      state: [{ colId: GRID_CONFIG.DEFAULT_SORT_COLUMN, sort: GRID_CONFIG.DEFAULT_SORT_ORDER }],
      defaultState: { sort: null }
    });
  }
});

Template.timesheet.onCreated(function () {
  const instance = this;
  
  // Initialize reactive variables
  const today = getToday();
  instance.userId = FlowRouter.getParam('userId');
  instance.startDate = new ReactiveVar(dateToLocalString(today));
  instance.endDate = new ReactiveVar(dateToLocalString(today));
  instance.selectedPreset = new ReactiveVar('today');
  instance.gridOptions = createGridOptions();
  
  // Data caches for performance
  instance.ticketsCache = new Map();
  instance.teamsCache = new Map();
  
  // Subscribe to data
  this.autorun(() => {
    const userId = instance.userId;
    const currentUserId = Meteor.userId();
    
    if (userId) {
      // Check if user is viewing their own timesheet or if current user is admin/leader
      const isViewingOwnTimesheet = userId === currentUserId;
      const leaderTeams = Teams.find({ leader: currentUserId }).fetch();
      const adminTeams = Teams.find({ admins: currentUserId }).fetch();
      const isAdminOrLeader = leaderTeams.length > 0 || adminTeams.length > 0;
      
      if (isViewingOwnTimesheet) {
        // Regular team member viewing their own timesheet
        this.subscribe('clockEventsForUser'); // Only their own clock events
        this.subscribe('userTeams'); // Teams they're part of
        this.subscribe('teamTickets', Teams.find({ members: currentUserId }).fetch().map(t => t._id));
      } else if (isAdminOrLeader) {
        // Admin/leader viewing team member timesheet
        const allTeamIds = [...leaderTeams, ...adminTeams].map(t => t._id);
        
        if (allTeamIds.length) {
          this.subscribe('clockEventsForTeams', allTeamIds);
          this.subscribe('teamTickets', allTeamIds);
        }
        
        // Subscribe to user teams for user info
        this.subscribe('userTeams');
        
        // Subscribe to user data for all team members to display names properly
        const allTeams = Teams.find({
          $or: [
            { members: currentUserId },
            { leader: currentUserId },
            { admins: currentUserId }
          ]
        }).fetch();
        
        const allMembers = Array.from(new Set(
          allTeams.flatMap(t => [...(t.members || []), ...(t.admins || []), t.leader].filter(id => id))
        ));
        
        if (allMembers.length) {
          this.subscribe('usersByIds', allMembers);
        }
      }
    }
  });
  
  // Build caches when data is ready
  this.autorun(() => {
    // Update tickets cache
    const tickets = Tickets.find().fetch();
    instance.ticketsCache.clear();
    tickets.forEach(ticket => instance.ticketsCache.set(ticket._id, ticket));
    
    // Update teams cache
    const teams = Teams.find().fetch();
    instance.teamsCache.clear();
    teams.forEach(team => instance.teamsCache.set(team._id, team));
  });
  
  // Optimized session data computation
  instance.computeSessionData = () => {
    const { userId, startDate, endDate, ticketsCache, teamsCache } = instance;
    
    if (!userId) return [];
    
    const dateRange = createDateRange(startDate.get(), endDate.get());
    
    // Filter clock events for the specific user we're viewing
    // For own timesheet: use userId directly, for admin view: also filter by userId
    const clockEvents = ClockEvents.find({ userId }).fetch();
    
    if (clockEvents.length === 0) return [];
    
    return clockEvents
      .filter(event => isEventInDateRange(new Date(event.startTimestamp), dateRange))
      .map(event => processSessionData(event, ticketsCache, teamsCache))
      .sort((a, b) => b.startTime - a.startTime);
  };
  
  // Grid initialization
  instance.autorun(() => {
    if (!instance.userId) return;
    
    Tracker.afterFlush(() => {
      const gridEl = instance.find('#timesheetGrid');
      if (gridEl && !gridEl.__ag_initialized) {
        new Grid(gridEl, instance.gridOptions);
        gridEl.__ag_initialized = true;
        instance.updateGridData();
      }
    });
  });
  
  // Reactive grid updates
  instance.autorun(() => {
    if (!instance.userId || !instance.gridOptions?.api) return;
    instance.updateGridData();
  });
  
  // Optimized grid update method
  instance.updateGridData = () => {
    const rows = instance.computeSessionData();
    instance.gridOptions.api.setRowData(rows);
    instance.updateSessionCount(rows.length);
  };
  
  // Session count updater
  instance.updateSessionCount = (count) => {
    const sessionCountEl = instance.find('#sessionCount');
    if (sessionCountEl) {
      sessionCountEl.textContent = `${count} session${count !== 1 ? 's' : ''}`;
    }
  };
  
  // Date preset handler factory
  instance.handleDatePreset = (startDate, endDate, preset) => {
    const startStr = dateToLocalString(startDate);
    const endStr = dateToLocalString(endDate);
    
    instance.startDate.set(startStr);
    instance.endDate.set(endStr);
    instance.$('#start-date').val(startStr);
    instance.$('#end-date').val(endStr);
    instance.selectedPreset.set(preset);
    
    if (instance.gridOptions?.api) {
      instance.updateGridData();
    }
  };
});

Template.timesheet.helpers({
  userId: () => Template.instance().userId,
  userName: () => {
    const userId = Template.instance().userId;
    return userId ? getUserName(userId) : 'Unknown User';
  },
  userEmail: () => {
    const userId = Template.instance().userId;
    return userId ? getUserEmail(userId) : 'Unknown Email';
  },
  isOwnTimesheet: () => {
    const userId = Template.instance().userId;
    return userId === Meteor.userId();
  },
  startDate: () => Template.instance().startDate.get(),
  endDate: () => Template.instance().endDate.get(),
  isPresetSelected: (presetName) => Template.instance().selectedPreset.get() === presetName,
  selectedPreset: () => Template.instance().selectedPreset.get(),
  
  totalHours() {
    const rows = Template.instance().computeSessionData();
    const totalSeconds = rows.reduce((sum, row) => sum + (row.duration || 0), 0);
    return formatTime(totalSeconds);
  },
  
  totalSessions() {
    return Template.instance().computeSessionData().length;
  },
  
  averageSessionHours() {
    const rows = Template.instance().computeSessionData();
    const completedSessions = rows.filter(row => row.duration);
    if (completedSessions.length === 0) return '0h 0m';
    
    const totalSeconds = completedSessions.reduce((sum, row) => sum + row.duration, 0);
    const averageSeconds = totalSeconds / completedSessions.length;
    return formatTime(averageSeconds);
  },
  
  workingDays() {
    const rows = Template.instance().computeSessionData();
    return new Set(rows.map(row => row.date)).size;
  }
});

Template.timesheet.events({
  'click #backToHome': (e, t) => FlowRouter.go('/'),
  
  'click #refreshData': (e, t) => {
    const currentStart = t.startDate.get();
    const currentEnd = t.endDate.get();
    t.startDate.set(currentStart);
    t.endDate.set(currentEnd);
  },
  
  'click #apply-range': (e, t) => {
    const start = t.$('#start-date').val();
    const end = t.$('#end-date').val();
    if (start) t.startDate.set(start);
    if (end) t.endDate.set(end);
    t.selectedPreset.set('custom');
    t.updateGridData();
  },
  
  'click #preset-today': (e, t) => 
    t.handleDatePreset(getToday(), getToday(), 'today'),
  
  'click #preset-yesterday': (e, t) => 
    t.handleDatePreset(getYesterday(), getYesterday(), 'yesterday'),
  
  'click #preset-last7': (e, t) => 
    t.handleDatePreset(getDaysAgo(6), getToday(), 'last7'),
  
  'click #preset-thisweek': (e, t) => 
    t.handleDatePreset(getThisWeekStart(), getToday(), 'thisweek'),
  
  'click #preset-last14': (e, t) => 
    t.handleDatePreset(getDaysAgo(13), getToday(), 'last14')
});

Template.timesheet.onDestroyed(function () {
  if (this.gridOptions?.api) {
    this.gridOptions.api.destroy();
  }
});
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { formatTime, formatDate, calculateTotalTime } from '../../utils/TimeUtils.js';
import { getTeamName, getUserEmail, getUserName } from '../../utils/UserTeamUtils.js';
import { dateToLocalString, formatDateForDisplay } from '../../utils/DateUtils.js';
import { Grid } from 'ag-grid-community';
import { isTeamsLoading } from '../layout/MainLayout.js';

Template.home.onCreated(function () {
  const template = this;
  
  // Initialize reactive variables for team dashboard using local timezone
  const today = new Date();
  const todayStr = dateToLocalString(today);
  template.startDate = new ReactiveVar(todayStr); // default start: today
  template.endDate = new ReactiveVar(todayStr);   // default end: today
  template.selectedPreset = new ReactiveVar('today'); // track which preset is selected
  
  this.autorun(() => {
    // userTeams and clockEventsForUser subscriptions moved to MainLayout
    // Subscribe to all clock events for teams the user leads
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    if (teamIds.length) {
      this.subscribe('clockEventsForTeams', teamIds);
      // Also subscribe to all tickets for these teams
      this.subscribe('teamTickets', teamIds);
    }
    
    // Subscribe to all users from ALL teams (not just leader teams) for proper user display
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
});

Template.home.onRendered(function () {
  const instance = this;

  // Column definitions for daily breakdown
  const columnDefs = [
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
      valueFormatter: p => p.value ? formatDate(p.value) : 'No activity'
    },
    { 
      headerName: 'Clock-out', field: 'lastClockOut', flex: 1.2, sortable: true, filter: 'agDateColumnFilter',
      valueFormatter: p => {
        if (!p.value) return p.data?.hasActiveSession ? 'Active' : '-';
        return formatDate(p.value);
      }
    },
    { 
      headerName: 'Tickets', field: 'tickets', flex: 1.5, sortable: false, filter: false,
      valueFormatter: p => (Array.isArray(p.value) && p.value.length) ? p.value.join(', ') : 'No tickets'
    }
  ];

  instance.gridOptions = {
    columnDefs,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    }
  };

  // Daily breakdown computation - one row per person per day
  const computeTeamMemberSummary = () => {
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    if (!leaderTeams.length) return [];

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');
    const teamIds = leaderTeams.map(t => t._id);

    const allMembers = Array.from(new Set(
      leaderTeams.flatMap(t => [...(t.members || []), ...(t.admins || []), t.leader].filter(id => id))
    ));

    const rows = [];
    
    // Generate all dates in range using local timezone
    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Create date in local timezone to avoid UTC conversion issues
      const localDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      dates.push(localDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each member and each date, create a row
    allMembers.forEach(userId => {
      dates.forEach(date => {
        // Use local timezone for day boundaries
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
        
        // Get all clock events that overlap with this day
        // This includes events that start before this day but end during/after it
        const dayClockEvents = ClockEvents.find({
          userId: userId,
          teamId: { $in: teamIds },
          $or: [
            // Events that start on this day
            { startTimestamp: { $gte: startOfDay, $lte: endOfDay } },
            // Events that started before this day but are still active or end on this day
            { 
              startTimestamp: { $lt: startOfDay },
              $or: [
                { endTime: { $gte: startOfDay, $lte: endOfDay } }, // Ended on this day
                { endTime: { $exists: false } } // Still active
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
            // Handle cross-midnight sessions
            const sessionStart = clockEvent.startTimestamp;
            const sessionEnd = clockEvent.endTime || Date.now(); // Use current time if still active
            const sessionDuration = sessionEnd - sessionStart;
            
            // Calculate how much of this session belongs to this specific day
            const dayStart = startOfDay;
            const dayEnd = endOfDay;
            
            // Find overlap between session and this day
            const overlapStart = Math.max(sessionStart, dayStart);
            const overlapEnd = Math.min(sessionEnd, dayEnd);
            
            if (overlapStart < overlapEnd) {
              // This session has time on this day
              const daySessionSeconds = Math.floor((overlapEnd - overlapStart) / 1000);
              totalSeconds += daySessionSeconds;
              
               // Track latest clock-in for this day
               if (sessionStart >= dayStart && sessionStart <= dayEnd) {
                 if (!firstClockIn || sessionStart > firstClockIn) {
                   firstClockIn = sessionStart;
                 }
               }
              
              // Track last clock-out for this day
              if (clockEvent.endTime && clockEvent.endTime >= dayStart && clockEvent.endTime <= dayEnd) {
                if (!lastClockOut || clockEvent.endTime > lastClockOut) {
                  lastClockOut = clockEvent.endTime;
                }
              } else if (!clockEvent.endTime && sessionEnd >= dayStart && sessionEnd <= dayEnd) {
                hasActiveSession = true;
              }
              
              // Add tickets for this session
              clockEvent.tickets?.forEach(ticket => {
                const ticketDoc = Tickets.findOne(ticket.ticketId);
                if (ticketDoc) ticketTitles.add(ticketDoc.title);
              });
            }
          });

          // Only create a row if there's actual work time on this day
          if (totalSeconds > 0 || hasActiveSession) {
          // Format date in local timezone (YYYY-MM-DD)
          const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          
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
      // Sort by date first, then by user name
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.displayName.localeCompare(b.displayName);
    });
  };

  // Initialize grid when container exists and user is a leader (section is visible)
  // Wait until teams subscription is ready and the container is in the DOM
  instance.autorun(() => {
    const teamsReady = !isTeamsLoading.get();
    const hasLeaderTeam = !!Teams.findOne({ leader: Meteor.userId() });
    if (!teamsReady || !hasLeaderTeam) return;

    Tracker.afterFlush(() => {
      const gridEl = instance.find('#teamDashboardGrid');
      if (gridEl && !gridEl.__ag_initialized) {
        new Grid(gridEl, instance.gridOptions);
        gridEl.__ag_initialized = true;
        const initialRows = computeTeamMemberSummary();
        if (instance.gridOptions?.api) {
          instance.gridOptions.api.setRowData(initialRows);
        }
      }
    });

    // Make the viewUserTimesheet function globally available
    window.viewUserTimesheet = (userId, userName) => {
      console.log(`Viewing timesheet for user: ${userName} (${userId})`);
      // Navigate to timesheet page
      FlowRouter.go(`/timesheet/${userId}`);
    };
  });

  // Reactive updates: respond to date changes and collection updates
  instance.autorun(() => {
    // Dependencies to re-run: selected date, relevant collections
    instance.startDate.get();
    instance.endDate.get();
    Teams.find({ leader: Meteor.userId() }).fetch();
    ClockEvents.find().fetch();
    Tickets.find().fetch();

    const rows = computeTeamMemberSummary();
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
  allClockEvents() {
    // Show all clock events for teams the user leads, flat list, most recent first
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    return ClockEvents.find({ teamId: { $in: teamIds } }, { sort: { startTimestamp: -1 } }).fetch();
  },
  teamName: getTeamName,
  userName: getUserEmail,
  formatDate,  // Using imported utility
  ticketTitle(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket ? ticket.title : `Unknown Ticket (${ticketId})`;
  },
  clockEventTotalTime(clockEvent) {
    return calculateTotalTime(clockEvent);  // Using imported utility
  },
  ticketTotalTime(ticket) {
    return calculateTotalTime(ticket);  // Using imported utility
  },
  formatTime,  // Using imported utility
  
  // Team Dashboard helpers
  isTeamLeader() {
    return Teams.findOne({ leader: Meteor.userId() });
  },
  
  startDate() { return Template.instance().startDate.get(); },
  endDate() { return Template.instance().endDate.get(); },
  
  formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  },
  
  teamMemberSummary() {
    // Return empty array since we're using AG Grid for display
    // The actual data is computed in computeTeamMemberSummary()
    return [];
  },
  
  // Helper to get user name in template
  getDisplayName(userId) {
    return getUserName(userId);
  },
  
  // Helper to check if a preset button should be highlighted
  isPresetSelected(presetName) {
    return Template.instance().selectedPreset.get() === presetName;
  }
});

Template.home.events({
  'click #apply-range'(e, t) {
    const start = t.$('#start-date').val();
    const end = t.$('#end-date').val();
    if (start) t.startDate.set(start);
    if (end) t.endDate.set(end);
    t.selectedPreset.set('custom'); // mark as custom selection
  },
  'click #preset-today'(e, t) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    t.startDate.set(todayStr);
    t.endDate.set(todayStr);
    t.$('#start-date').val(todayStr);
    t.$('#end-date').val(todayStr);
    t.selectedPreset.set('today');
  },
  'click #preset-yesterday'(e, t) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    t.startDate.set(yesterdayStr);
    t.endDate.set(yesterdayStr);
    t.$('#start-date').val(yesterdayStr);
    t.$('#end-date').val(yesterdayStr);
    t.selectedPreset.set('yesterday');
  },
  'click #preset-last7'(e, t) {
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
  'click #preset-last14'(e, t) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 13); // 14 days total (today + 13 previous days)
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('last14');
  },
  'click #preset-thisweek'(e, t) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMonday = (day + 6) % 7; // Mon=0
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
  }
});
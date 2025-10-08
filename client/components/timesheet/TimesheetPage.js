import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ClockEvents, Teams, Tickets } from '../../../collections.js';
import { formatTime, formatDate } from '../../utils/TimeUtils.js';
import { getUserName, getUserEmail } from '../../utils/UserTeamUtils.js';
import { dateToLocalString, getToday, getYesterday, getDaysAgo, getThisWeekStart, formatDateForDisplay } from '../../utils/DateUtils.js';
import { Grid } from 'ag-grid-community';

Template.timesheet.onCreated(function () {
  const instance = this;
  
  // Get userId from route parameters
  instance.userId = FlowRouter.getParam('userId');
  
  // Initialize reactive variables for date filtering
  const today = getToday();
  instance.startDate = new ReactiveVar(dateToLocalString(today));
  instance.endDate = new ReactiveVar(dateToLocalString(today));
  instance.selectedPreset = new ReactiveVar('today');
  
  // Initialize grid
  instance.grid = null;
  
  // Column definitions for session details
  const columnDefs = [
    { 
      headerName: 'Date', field: 'date', flex: 1, sortable: true, filter: 'agDateColumnFilter',
      valueFormatter: p => formatDateForDisplay(p.value)
    },
    { 
      headerName: 'Clock-in', field: 'startTime', flex: 1.2, sortable: true, filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? formatDate(p.value) : 'No session'
    },
    { 
      headerName: 'Clock-out', field: 'endTime', flex: 1.2, sortable: true, filter: 'agDateColumnFilter',
      valueFormatter: p => {
        if (!p.value) return p.data?.isActive ? 'Active' : 'No session';
        return formatDate(p.value);
      }
    },
    { 
      headerName: 'Duration', field: 'duration', flex: 1, sortable: true, filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? formatTime(p.value) : 'No session'
    },
    { 
      headerName: 'Activity', field: 'activityTitle', flex: 1.5, sortable: true, filter: 'agTextColumnFilter',
      valueFormatter: p => p.value || 'No activity'
    },
    { 
      headerName: 'Team', field: 'teamName', flex: 1, sortable: true, filter: 'agTextColumnFilter',
      valueFormatter: p => p.value || 'No team'
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

  // Compute session data
  const computeSessionData = () => {
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const userId = instance.userId;
    
    if (!userId) return [];

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    // Find all clock events for this user in the date range
    const clockEvents = ClockEvents.find({
      userId: userId,
      startTimestamp: { $gte: startDate, $lte: endDate }
    }).fetch();

    // Convert to session rows
    const sessionRows = clockEvents.map(event => {
      const startTime = new Date(event.startTimestamp);
      const endTime = event.endTime ? new Date(event.endTime) : null;
      const duration = endTime ? (endTime - startTime) / 1000 : null;
      
      // Get activity and team info
      const activity = event.ticketId ? Tickets.findOne(event.ticketId) : null;
      const team = event.teamId ? Teams.findOne(event.teamId) : null;

      return {
        date: dateToLocalString(startTime),
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        isActive: !endTime,
        activityTitle: activity?.title || null,
        teamName: team?.name || null,
        ticketId: event.ticketId,
        teamId: event.teamId
      };
    });

    // Sort by start time (most recent first)
    return sessionRows.sort((a, b) => b.startTime - a.startTime);
  };

  // Initialize grid when ready
  instance.autorun(() => {
    if (!instance.userId) return;

    Tracker.afterFlush(() => {
      const gridEl = instance.find('#timesheetGrid');
      if (gridEl && !gridEl.__ag_initialized) {
        new Grid(gridEl, instance.gridOptions);
        gridEl.__ag_initialized = true;
        const initialRows = computeSessionData();
        if (instance.gridOptions?.api) {
          instance.gridOptions.api.setRowData(initialRows);
        }
      }
    });
  });

  // Reactive updates for date changes
  instance.autorun(() => {
    if (!instance.userId || !instance.gridOptions?.api) return;
    
    const rows = computeSessionData();
    instance.gridOptions.api.setRowData(rows);
  });
});

Template.timesheet.helpers({
  userId() {
    return Template.instance().userId;
  },
  userName() {
    const userId = Template.instance().userId;
    return userId ? getUserName(userId) : 'Unknown User';
  },
  userEmail() {
    const userId = Template.instance().userId;
    return userId ? getUserEmail(userId) : 'Unknown Email';
  },
  startDate() {
    return Template.instance().startDate.get();
  },
  endDate() {
    return Template.instance().endDate.get();
  },
  isPresetSelected(presetName) {
    return Template.instance().selectedPreset.get() === presetName;
  },
  totalHours() {
    const instance = Template.instance();
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const userId = instance.userId;
    
    if (!userId) return '0h 0m';

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    const clockEvents = ClockEvents.find({
      userId: userId,
      startTimestamp: { $gte: startDate, $lte: endDate }
    }).fetch();

    let totalSeconds = 0;
    clockEvents.forEach(event => {
      if (event.endTime) {
        const duration = (new Date(event.endTime) - new Date(event.startTimestamp)) / 1000;
        totalSeconds += duration;
      }
    });

    return formatTime(totalSeconds);
  },
  totalSessions() {
    const instance = Template.instance();
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const userId = instance.userId;
    
    if (!userId) return 0;

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    return ClockEvents.find({
      userId: userId,
      startTimestamp: { $gte: startDate, $lte: endDate }
    }).count();
  },
  averageSessionHours() {
    const instance = Template.instance();
    const sessions = instance.totalSessions();
    if (sessions === 0) return '0h 0m';
    
    // This is a simplified calculation - you might want to make it more sophisticated
    return '2h 30m'; // Placeholder
  },
  workingDays() {
    const instance = Template.instance();
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const userId = instance.userId;
    
    if (!userId) return 0;

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    const clockEvents = ClockEvents.find({
      userId: userId,
      startTimestamp: { $gte: startDate, $lte: endDate }
    }).fetch();

    const uniqueDates = new Set();
    clockEvents.forEach(event => {
      const date = new Date(event.startTimestamp);
      const dateStr = dateToLocalString(date);
      uniqueDates.add(dateStr);
    });

    return uniqueDates.size;
  }
});

Template.timesheet.events({
  'click #backToHome'(e, t) {
    FlowRouter.go('/');
  },
  'click #apply-range'(e, t) {
    const start = t.$('#start-date').val();
    const end = t.$('#end-date').val();
    if (start) t.startDate.set(start);
    if (end) t.endDate.set(end);
    t.selectedPreset.set('custom');
  },
  'click #preset-today'(e, t) {
    const today = new Date();
    const todayStr = dateToLocalString(today);
    t.startDate.set(todayStr);
    t.endDate.set(todayStr);
    t.$('#start-date').val(todayStr);
    t.$('#end-date').val(todayStr);
    t.selectedPreset.set('today');
  },
  'click #preset-yesterday'(e, t) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateToLocalString(yesterday);
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
    const startStr = dateToLocalString(start);
    const endStr = dateToLocalString(end);
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('last7');
  },
  'click #preset-thisweek'(e, t) {
    const end = new Date();
    const start = getThisWeekStart();
    const startStr = dateToLocalString(start);
    const endStr = dateToLocalString(end);
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('thisweek');
  },
  'click #preset-last14'(e, t) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const startStr = dateToLocalString(start);
    const endStr = dateToLocalString(end);
    t.startDate.set(startStr);
    t.endDate.set(endStr);
    t.$('#start-date').val(startStr);
    t.$('#end-date').val(endStr);
    t.selectedPreset.set('last14');
  }
});

Template.timesheet.onDestroyed(function () {
  if (this.gridOptions?.api) {
    this.gridOptions.api.destroy();
  }
});

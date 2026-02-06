import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { createGrid } from 'ag-grid-community';
import { Teams, ClockEvents, Tickets } from '../../../collections.js';
import { getTodayBoundaries, getYesterday, getThisWeekStart, getDayBoundaries } from '../../utils/DateUtils.js';
import { formatTimeHoursMinutes, formatTimestampHoursMinutes } from '../../utils/TimeUtils.js';

// Grid column definitions
const getColumnDefinitions = () => [
  {
    headerName: 'Ticket Name',
    field: 'title',
    flex: 2,
    sortable: true,
    filter: 'agTextColumnFilter',
    cellRenderer: p => {
      const title = p.value || 'Untitled';
      const url = p.data?.url;
      if (url) {
        return `<a class="text-primary hover:text-primary-focus hover:underline font-medium" href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
      }
      return `<span class="font-medium">${title}</span>`;
    }
  },
  {
    headerName: 'Hours Worked',
    field: 'hours',
    flex: 1,
    sortable: true,
    filter: 'agNumberColumnFilter',
    valueFormatter: p => formatTimeHoursMinutes(p.value),
    cellClass: 'text-right'
  },
  {
    headerName: 'Start',
    field: 'startTime',
    flex: 1,
    sortable: true,
    filter: 'agDateColumnFilter',
    valueFormatter: p => p.value ? formatTimestampHoursMinutes(p.value, false) : '—'
  },
  {
    headerName: 'End',
    field: 'endTime',
    flex: 1,
    sortable: true,
    filter: 'agDateColumnFilter',
    valueFormatter: p => p.value ? formatTimestampHoursMinutes(p.value, false) : '—'
  },
  {
    headerName: 'Status',
    field: 'status',
    flex: 0.8,
    sortable: true,
    filter: 'agSetColumnFilter',
    cellRenderer: p => {
      const status = p.value;
      const badgeClass = status === 'Active' ? 'badge-success' : 'badge-ghost';
      return `<span class="badge ${badgeClass}">${status}</span>`;
    }
  }
];

const createGridOptions = () => ({
  columnDefs: getColumnDefinitions(),
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
  },
  pagination: true,
  paginationPageSize: 20,
  rowSelection: 'none',
  animateRows: true,
  enableCellTextSelection: true,
  ensureDomOrder: true,
  suppressRowClickSelection: true,
  suppressCellFocus: false,
  onGridReady: (params) => {
    if (params.api && params.api.sizeColumnsToFit) {
      params.api.sizeColumnsToFit();
    }
  }
});

Template.memberActivity.onCreated(function () {
  const instance = this;
  const params = FlowRouter.current().params;
  instance.userId = params.userId;
  instance.teamId = params.teamId;
  instance.memberData = new ReactiveVar(null);
  instance.selectedFilter = new ReactiveVar('today'); // Default to 'today'
  instance.allTickets = new ReactiveVar([]);
  instance.filteredTickets = new ReactiveVar([]);

  // Get member info
  if (instance.teamId) {
    instance.subscribe('teamDetails', instance.teamId);
    instance.subscribe('clockEventsForTeams', [instance.teamId]);
    instance.subscribe('teamTickets', [instance.teamId]);

    instance.autorun(() => {
      const team = Teams.findOne(instance.teamId);
      if (team && team.members && team.members.includes(instance.userId)) {
        Meteor.call('getUsers', [instance.userId], (err, users) => {
          if (!err && users && users.length > 0) {
            instance.memberData.set(users[0]);
          }
        });
      }
    });
  }
});

Template.memberActivity.onRendered(function () {
  const instance = this;
  const GRID_INIT_DELAY = 100;

  // Process all ticket data and store it
  instance.autorun(() => {
    const userId = instance.userId;
    const teamId = instance.teamId;
    if (!userId || !teamId) return;

    // Get all clock events for this user and team
    const allClockEvents = ClockEvents.find({ userId, teamId }).fetch();

    // Process all ticket sessions - each session is a row
    const allTickets = [];

    allClockEvents.forEach(clockEvent => {
      if (!clockEvent.tickets || clockEvent.tickets.length === 0) return;

      clockEvent.tickets.forEach(ticketEntry => {
        if (!ticketEntry.ticketId) return;

        const ticket = Tickets.findOne(ticketEntry.ticketId);
        if (!ticket) return;

        const sessions = Array.isArray(ticketEntry.sessions) ? ticketEntry.sessions : [];
        const hasSessions = sessions.length > 0;

        if (hasSessions) {
          sessions.forEach(session => {
            const startTime = session.startTimestamp;
            if (!startTime) return;
            const isActive = session.endTimestamp == null;
            const endTime = isActive ? null : session.endTimestamp;
            const sessionSeconds = isActive
              ? Math.floor((Date.now() - startTime) / 1000)
              : Math.max(0, Math.floor((endTime - startTime) / 1000));

            allTickets.push({
              ticketId: ticket._id,
              title: ticket.title,
              url: ticket.github || null,
              hours: sessionSeconds,
              startTime: startTime,
              endTime: endTime,
              status: isActive ? 'Active' : 'Done',
              startTimestamp: startTime
            });
          });
        } else if (ticketEntry.startTimestamp) {
          // Backward compatibility for older data without sessions
          const startTime = ticketEntry.startTimestamp;
          const isActive = clockEvent.endTime == null;
          const endTime = isActive ? null : (clockEvent.endTime ? clockEvent.endTime.getTime() : null);
          const sessionSeconds = isActive
            ? Math.floor((Date.now() - startTime) / 1000)
            : Math.max(0, Math.floor((endTime - startTime) / 1000));

          allTickets.push({
            ticketId: ticket._id,
            title: ticket.title,
            url: ticket.github || null,
            hours: sessionSeconds,
            startTime: startTime,
            endTime: endTime,
            status: isActive ? 'Active' : 'Done',
            startTimestamp: startTime
          });
        }
      });
    });

    instance.allTickets.set(allTickets);
  });

  // Filter tickets based on selected filter
  instance.autorun(() => {
    const filter = instance.selectedFilter.get();
    const allTickets = instance.allTickets.get();

    // Get date boundaries
    const todayBoundaries = getTodayBoundaries();
    const yesterday = getYesterday();
    const yesterdayBoundaries = getDayBoundaries(yesterday);
    const weekStart = getThisWeekStart();
    const weekBoundaries = getDayBoundaries(weekStart);
    const today = new Date();
    const weekEnd = getDayBoundaries(today);

    let filtered = [];

    switch (filter) {
      case 'today':
        filtered = allTickets.filter(t => 
          t.startTimestamp >= todayBoundaries.start && 
          t.startTimestamp <= todayBoundaries.end
        );
        break;
      case 'yesterday':
        filtered = allTickets.filter(t => 
          t.startTimestamp >= yesterdayBoundaries.start && 
          t.startTimestamp <= yesterdayBoundaries.end
        );
        break;
      case 'week':
        filtered = allTickets.filter(t => 
          t.startTimestamp >= weekBoundaries.start && 
          t.startTimestamp <= weekEnd.end
        );
        break;
      default:
        filtered = allTickets;
    }

    // Sort by start time (most recent first), don't remove duplicates
    // Each session is a separate row
    filtered.sort((a, b) => b.startTimestamp - a.startTimestamp);

    instance.filteredTickets.set(filtered);
  });

  // Initialize single grid
  Meteor.setTimeout(() => {
    const gridEl = instance.find('#ticketsGrid');
    if (gridEl && !gridEl.__ag_initialized) {
      instance.gridApi = createGrid(gridEl, createGridOptions());
      gridEl.__ag_initialized = true;
      
      // Set initial data
      const filteredData = instance.filteredTickets.get();
      if (instance.gridApi && filteredData) {
        instance.gridApi.setGridOption('rowData', filteredData);
      }
    }
  }, GRID_INIT_DELAY);

  // Update grid data reactively based on filter
  instance.autorun(() => {
    const filteredData = instance.filteredTickets.get();

    if (instance.gridApi && filteredData) {
      instance.gridApi.setGridOption('rowData', filteredData);
    }
  });
});

Template.memberActivity.helpers({
  memberName() {
    const instance = Template.instance();
    const member = instance.memberData.get();
    return member?.name || 'Loading...';
  },
  memberEmail() {
    const instance = Template.instance();
    const member = instance.memberData.get();
    return member?.email || '';
  },
  isActive() {
    const instance = Template.instance();
    const userId = instance.userId;
    const teamId = instance.teamId;
    
    if (!userId || !teamId) return false;
    
    const activeClockEvent = ClockEvents.findOne({
      userId,
      teamId,
      endTime: null
    });
    
    return !!activeClockEvent;
  },
  currentUserIsAdmin() {
    const instance = Template.instance();
    const teamId = instance.teamId;
    const userId = Meteor.userId();
    if (!teamId || !userId) return false;
    const team = Teams.findOne(teamId);
    return !!(team && Array.isArray(team.admins) && team.admins.includes(userId));
  },
  selectedFilter() {
    const instance = Template.instance();
    return instance.selectedFilter.get();
  },
  eq(a, b) {
    return a === b;
  },
  
  // Mobile card view helpers
  filteredTicketsData() {
    return Template.instance().filteredTickets.get();
  },
  
  ticketIsActive(status) {
    return status === 'Active';
  },
  
  formatTicketHours(seconds) {
    return formatTimeHoursMinutes(seconds || 0);
  },
  
  formatTicketTime(timestamp) {
    if (!timestamp) return '';
    return formatTimestampHoursMinutes(timestamp, false);
  }
});

Template.memberActivity.events({
  'click #backToTeams'(e, t) {
    e.preventDefault();
    FlowRouter.go('/teams');
  },
  'click #viewTimesheetBtn'(e, t) {
    e.preventDefault();
    if (t.userId) {
      FlowRouter.go(`/timesheet/${t.userId}`);
    }
  },
  'click .filter-btn'(e, t) {
    e.preventDefault();
    const filter = e.currentTarget.getAttribute('data-filter');
    if (filter) {
      t.selectedFilter.set(filter);
    }
  }
});


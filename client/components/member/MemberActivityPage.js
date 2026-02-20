import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { createGrid } from 'ag-grid-community';
import { Teams, ClockEvents, Tickets, Messages } from '../../../collections.js';
import { getTodayBoundaries, getYesterday, getThisWeekStart, getDayBoundaries } from '../../utils/DateUtils.js';
import { formatTimeHoursMinutes, formatTimestampHoursMinutes } from '../../utils/TimeUtils.js';

const buildThreadId = (teamId, adminId, memberId) => `${teamId}:${adminId}:${memberId}`;

const formatDayLabel = (date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const normalizeDateKey = (date) =>
  date.toISOString().slice(0, 10); // YYYY-MM-DD

const computeEventSeconds = (event, nowMs) => {
  if (!event?.startTimestamp) return 0;
  const startMs = event.startTimestamp;
  const elapsed = Math.floor((nowMs - startMs) / 1000);
  const prev = event.accumulatedTime || 0;
  if (event.endTime) {
    return Math.max(0, Math.floor((new Date(event.endTime).getTime() - startMs) / 1000));
  }
  return prev + Math.max(0, elapsed);
};

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
  instance.threadAdminId = new ReactiveVar(null);
  instance.threadId = new ReactiveVar(null);
  instance.messageDraft = new ReactiveVar('');

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

  // Resolve admin thread identity and subscribe to messages
  instance.autorun(() => {
    const teamId = instance.teamId;
    const memberId = instance.userId;
    const currentUserId = Meteor.userId();
    if (!teamId || !memberId || !currentUserId) return;

    const team = Teams.findOne(teamId);
    const isAdmin = !!(team && Array.isArray(team.admins) && team.admins.includes(currentUserId));

    let adminId = null;
    if (isAdmin) {
      adminId = currentUserId;
    } else {
      adminId = FlowRouter.getQueryParam('adminId') || null;
    }

    instance.threadAdminId.set(adminId);
    if (adminId) {
      const threadId = buildThreadId(teamId, adminId, memberId);
      instance.threadId.set(threadId);
      instance.subscribe('messages.thread', { teamId, adminId, memberId });
    } else {
      instance.threadId.set(null);
    }
  });
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
  memberInitials() {
    const member = Template.instance().memberData.get();
    const name = member?.name || '';
    if (name) {
      const parts = name.trim().split(/\s+/);
      const first = parts[0]?.[0] || '';
      const last = parts[1]?.[0] || '';
      return (first + last).toUpperCase() || '?';
    }
    const email = member?.email || '';
    return email ? email.slice(0, 2).toUpperCase() : '?';
  },
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
  currentTeamName() {
    const instance = Template.instance();
    const teamId = instance.teamId;
    if (!teamId) return '';
    const team = Teams.findOne(teamId);
    return team?.name || '';
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
  todayHours() {
    const instance = Template.instance();
    const teamId = instance.teamId;
    const userId = instance.userId;
    if (!teamId || !userId) return '0:00';
    const { start, end } = getTodayBoundaries();
    const now = Date.now();
    const events = ClockEvents.find({ userId, teamId }).fetch();
    const totalSeconds = events
      .filter(e => e.startTimestamp >= start && e.startTimestamp <= end)
      .reduce((sum, e) => sum + computeEventSeconds(e, now), 0);
    return formatTimeHoursMinutes(totalSeconds);
  },
  weekHours() {
    const instance = Template.instance();
    const teamId = instance.teamId;
    const userId = instance.userId;
    if (!teamId || !userId) return '0:00';
    const weekStart = getThisWeekStart();
    const weekStartBoundaries = getDayBoundaries(weekStart);
    const today = new Date();
    const weekEnd = getDayBoundaries(today);
    const now = Date.now();
    const events = ClockEvents.find({ userId, teamId }).fetch();
    const totalSeconds = events
      .filter(e => e.startTimestamp >= weekStartBoundaries.start && e.startTimestamp <= weekEnd.end)
      .reduce((sum, e) => sum + computeEventSeconds(e, now), 0);
    return formatTimeHoursMinutes(totalSeconds);
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
  },
  activityDays() {
    const instance = Template.instance();
    const teamId = instance.teamId;
    const userId = instance.userId;
    if (!teamId || !userId) return [];

    const events = ClockEvents.find({ userId, teamId }).fetch();
    const ticketsById = new Map(Tickets.find({ teamId }).fetch().map(t => [t._id, t]));
    const nowMs = Date.now();

    const map = new Map();

    const addEntry = (dateKey, entry) => {
      if (!map.has(dateKey)) {
        map.set(dateKey, { dateKey, dateLabel: formatDayLabel(new Date(dateKey)), entries: [] });
      }
      map.get(dateKey).entries.push(entry);
    };

    events.forEach(event => {
      if (event.startTimestamp) {
        const startDate = new Date(event.startTimestamp);
        addEntry(normalizeDateKey(startDate), {
          type: 'clock-in',
          time: event.startTimestamp
        });
      }
      if (event.endTime) {
        const endMs = new Date(event.endTime).getTime();
        const endDate = new Date(endMs);
        addEntry(normalizeDateKey(endDate), {
          type: 'clock-out',
          time: endMs
        });
      }

      (event.tickets || []).forEach(ticketEntry => {
        const ticket = ticketsById.get(ticketEntry.ticketId);
        const title = ticket?.title || 'Untitled';
        const description = ticket?.description || 'No description';
        const sessions = Array.isArray(ticketEntry.sessions) ? ticketEntry.sessions : [];

        sessions.forEach(session => {
          const start = session.startTimestamp;
          if (!start) return;
          const end = session.endTimestamp || null;
          const isActive = end == null;
          const durationSeconds = isActive ? Math.floor((nowMs - start) / 1000) : Math.floor((end - start) / 1000);
          addEntry(normalizeDateKey(new Date(start)), {
            type: 'ticket',
            time: start,
            endTime: end,
            isActive,
            durationSeconds,
            ticketTitle: title,
            ticketDescription: description
          });
        });

        if (sessions.length === 0 && ticketEntry.startTimestamp) {
          const start = ticketEntry.startTimestamp;
          const end = event.endTime ? new Date(event.endTime).getTime() : null;
          const isActive = end == null;
          const durationSeconds = isActive ? Math.floor((nowMs - start) / 1000) : Math.floor((end - start) / 1000);
          addEntry(normalizeDateKey(new Date(start)), {
            type: 'ticket',
            time: start,
            endTime: end,
            isActive,
            durationSeconds,
            ticketTitle: title,
            ticketDescription: description
          });
        }
      });
    });

    // Sort entries in each day by time descending
    const days = Array.from(map.values());
    days.forEach(day => day.entries.sort((a, b) => b.time - a.time));

    // Apply filter
    const filter = instance.selectedFilter.get();
    if (filter === 'today') {
      const todayKey = normalizeDateKey(new Date());
      return days.filter(d => d.dateKey === todayKey);
    }
    if (filter === 'yesterday') {
      const d = getYesterday();
      const key = normalizeDateKey(d);
      return days.filter(dy => dy.dateKey === key);
    }
    if (filter === 'week') {
      const weekStart = getThisWeekStart();
      const weekStartKey = normalizeDateKey(weekStart);
      return days.filter(dy => dy.dateKey >= weekStartKey);
    }

    // default: all
    return days.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  },
  isClockInEntry(entry) {
    return entry?.type === 'clock-in';
  },
  isClockOutEntry(entry) {
    return entry?.type === 'clock-out';
  },
  isTicketEntry(entry) {
    return entry?.type === 'ticket';
  },
  formatEntryTime(ts) {
    if (!ts) return '';
    return formatTimestampHoursMinutes(ts, false);
  },
  formatDayLabel(ts) {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : new Date(ts);
    return formatDayLabel(d);
  },
  formatDuration(seconds) {
    return formatTimeHoursMinutes(seconds || 0);
  },
  hasThread() {
    return !!Template.instance().threadId.get();
  },
  messages() {
    const threadId = Template.instance().threadId.get();
    if (!threadId) return [];
    return Messages.find({ threadId }, { sort: { createdAt: 1 } });
  },
  isFromCurrentUser(message) {
    return message?.fromUserId === Meteor.userId();
  },
  messageDraft() {
    return Template.instance().messageDraft.get();
  },
  canReply() {
    const t = Template.instance();
    const adminId = t.threadAdminId.get();
    return !!adminId;
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
  },
  'change #memberActivityFilter'(e, t) {
    const filter = e.currentTarget.value;
    if (filter) {
      t.selectedFilter.set(filter);
    }
  },
  'click .jump-to-reply'(e) {
    e.preventDefault();
    const input = document.getElementById('memberMessageInput');
    if (input) input.focus();
  },
  'input #memberMessageInput'(e, t) {
    t.messageDraft.set(e.currentTarget.value);
  },
  'click #memberMessageSend'(e, t) {
    e.preventDefault();
    const teamId = t.teamId;
    const memberId = t.userId;
    const currentUserId = Meteor.userId();
    const adminId = t.threadAdminId.get();
    if (!teamId || !memberId || !currentUserId || !adminId) return;

    const text = (t.messageDraft.get() || '').trim();
    if (!text) return;

    const isAdmin = currentUserId === adminId;
    const toUserId = isAdmin ? memberId : adminId;

    Meteor.call('messages.send', { teamId, toUserId, text, adminId }, (err) => {
      if (err) {
        alert('Failed to send message: ' + (err.reason || err.message));
        return;
      }
      t.messageDraft.set('');
      const input = document.getElementById('memberMessageInput');
      if (input) input.value = '';
    });
  }
});


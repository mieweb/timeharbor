import { Template } from 'meteor/templating';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { Grid } from 'ag-grid-community';
import { formatTime, formatDate } from '../../utils/TimeUtils.js';
import { getTeamName, getUserName } from '../../utils/UserTeamUtils.js';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './TimeGrid.html';

Template.timeGrid.onCreated(function() {
  this.autorun(() => {
    // Subscribe to all clock events for teams the user leads
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    if (teamIds.length) {
      this.subscribe('clockEventsForTeams', teamIds);
      // Also subscribe to all tickets for these teams
      this.subscribe('teamTickets', teamIds);
    }
    // Subscribe to all users in those teams for username display
    const allMembers = Array.from(new Set(leaderTeams.flatMap(t => t.members)));
    if (allMembers.length) {
      this.subscribe('usersByIds', allMembers);
    }
  });
});

Template.timeGrid.onRendered(function() {
  // Column Definitions - Updated to match your requirements
  const columnDefs = [
    {
      field: 'project',
      headerName: 'Project',
      sortable: true,
      filter: true
    },
    {
      field: 'user',
      headerName: 'User',
      sortable: true,
      filter: true
    },
    {
      field: 'clockInPeriod',
      headerName: 'Clock-in Period',
      sortable: true,
      filter: true,
      flex: 2
    },
    {
      field: 'totalTime',
      headerName: 'Total Clock-in Time',
      sortable: true,
      filter: true
    },
    {
      field: 'tickets',
      headerName: 'Tickets worked on',
      sortable: true,
      filter: true,
      flex: 2
    }
  ];

  // Grid Options
  const gridOptions = {
    columnDefs,
    rowData: [],
    defaultColDef: {
      flex: 1,
      minWidth: 100,
      filter: true,
      sortable: true,
      resizable: true
    },
    pagination: true,
    paginationPageSize: 10
  };

  // Initialize Grid
  const gridDiv = this.find('#myGrid');
  const grid = new Grid(gridDiv, gridOptions);

  // Update grid data when collection changes
  this.autorun(() => {
    // Show all clock events for teams the user leads, flat list, most recent first
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    const timeEntries = ClockEvents.find(
      { teamId: { $in: teamIds } },
      { sort: { startTime: -1 } }
    ).fetch().map(entry => ({
      project: getTeamName(entry.teamId),
      user: getUserName(entry.userId),
      clockInPeriod: entry.endTime 
        ? `${formatDate(entry.startTime)} - ${formatDate(entry.endTime)}`
        : `Started ${formatDate(entry.startTime)} (Active)`,
      totalTime: formatTime(entry.endTime ? entry.endTime - entry.startTime : Date.now() - entry.startTime),
      tickets: entry.tickets?.map(ticket => {
        const ticketDoc = Tickets.findOne(ticket.ticketId);
        return ticketDoc ? ticketDoc.title : `Unknown Ticket (${ticket.ticketId})`;
      }).join(', ') || '—'
    }));

    // Update grid data
    gridOptions.api.setRowData(timeEntries);
  });
});

Template.timeGrid.events({
  'input #quickFilter'(event, template) {
    const grid = document.querySelector('#myGrid')?.__agGrid;
    if (grid) {
      grid.gridOptions.api.setQuickFilter(event.target.value);
    }
  },

  'click #exportExcel'(event, template) {
    const grid = document.querySelector('#myGrid')?.__agGrid;
    if (grid) {
      grid.gridOptions.api.exportDataAsExcel({
        fileName: `TimeEntries_${new Date().toLocaleDateString()}`,
        sheetName: 'Time Entries'
      });
    }
  }
});

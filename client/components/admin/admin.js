// Admin Review Template
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets } from '../../../collections.js';
import { Grid } from 'ag-grid-community';
import { getUserName } from '../../utils/UserTeamUtils.js';
import { formatTimeHoursMinutes } from '../../utils/TimeUtils.js';

const GRID_INIT_DELAY = 200;

Template.admin.onCreated(function () {
  this.selectedAdminTeamId = new ReactiveVar(null);
  this.selectedTickets = new ReactiveVar([]);
  this.gridOptions = null;

  this.autorun(() => {
    this.subscribe('userTeams');
    const teamId = this.selectedAdminTeamId.get();
    if (teamId) {
      this.subscribe('adminTeamTickets', teamId);
      this.subscribe('teamMembers', [teamId]);
    }
  });
});

Template.admin.onRendered(function () {
  const instance = this;

  const columnDefs = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
    },
    { headerName: 'Title', field: 'title', flex: 2, sortable: true, filter: 'agTextColumnFilter' },
    { 
      headerName: 'Created', 
      field: 'createdAt', 
      sortable: true, 
      filter: 'agDateColumnFilter', 
      valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '' 
    },
    { 
      headerName: 'Time', 
      field: 'accumulatedTime', 
      sortable: true, 
      filter: 'agNumberColumnFilter', 
      valueFormatter: p => formatTimeHoursMinutes(p.value) 
    },
    { 
      headerName: 'Status', 
      field: 'status', 
      sortable: true, 
      filter: 'agSetColumnFilter', 
      valueFormatter: p => capitalizeStatus(p.value || 'open') 
    },
    { headerName: 'Creator', field: 'createdByName', sortable: true, filter: 'agTextColumnFilter' },
    { 
      headerName: 'Reviewed', 
      field: 'reviewedAt', 
      sortable: true, 
      cellRenderer: params => {
        if (!params.value) return '—';
        const reviewedBy = params.data.reviewedBy;
        const reviewerName = reviewedBy ? getUserName(reviewedBy) : 'Unknown';
        return `<div class="text-xs">
          <div>${new Date(params.value).toLocaleString()}</div>
          <div class="text-gray-500">by ${reviewerName}</div>
        </div>`;
      }
    },
    { 
      headerName: 'Reference', 
      field: 'github', 
      cellRenderer: params => params.value ? `<a href="${params.value}" target="_blank" class="link text-primary hover:text-primary-focus">View</a>` : '—' 
    }
  ];

  instance.gridOptions = {
    columnDefs,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    onSelectionChanged: () => {
      if (!instance.gridOptions?.api) return;
      const selected = instance.gridOptions.api.getSelectedRows().map(r => r._id);
      instance.selectedTickets.set(selected);
      instance.$('#selectedCount').text(`${selected.length} items selected`);
      instance.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', selected.length === 0);
    },
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
  };

  // Helper function to map tickets with user data
  const mapTicketsWithUserData = (tickets) => {
    return tickets.map(t => ({
      ...t,
      createdByName: getUserName(t.createdBy),
      reviewedBy: t.reviewedBy || null,
    }));
  };

  // Create grid when team is selected
  instance.autorun(() => {
    const teamId = instance.selectedAdminTeamId.get();
    if (!teamId) return;
    
    Meteor.setTimeout(() => {
      const gridEl = instance.find('#adminGrid');
      if (gridEl && !gridEl.__ag_initialized) {
        try {
          new Grid(gridEl, instance.gridOptions);
          gridEl.__ag_initialized = true;
          
          // Load initial data
          const tickets = Tickets.find({ teamId }).fetch();
          if (instance.gridOptions?.api) {
            instance.gridOptions.api.setRowData(mapTicketsWithUserData(tickets));
          }
        } catch (e) {
          console.error('Grid creation failed:', e);
        }
      }
    }, GRID_INIT_DELAY);
  });

  // Update grid data when tickets change
  instance.autorun(() => {
    const teamId = instance.selectedAdminTeamId.get();
    if (!teamId || !instance.gridOptions?.api) return;

    const tickets = Tickets.find({ teamId }).fetch();
    instance.gridOptions.api.setRowData(mapTicketsWithUserData(tickets));
  });
});

Template.admin.helpers({
  adminTeams() {
    return Teams.find({
      $or: [
        { leader: Meteor.userId() },
        { admins: Meteor.userId() }
      ]
    });
  },

  selectedAdminTeamId() {
    return Template.instance().selectedAdminTeamId.get();
  },

  isSelectedAdminTeam(teamId) {
    return Template.instance().selectedAdminTeamId.get() === teamId ? 'selected' : '';
  },



});

Template.admin.events({
  'change #adminTeamSelect'(e, t) {
    const teamId = e.target.value || null;
    
    // Reset grid state when changing teams
    const gridEl = t.find('#adminGrid');
    if (gridEl?.__ag_initialized && t.gridOptions?.api) {
      t.gridOptions.api.destroy();
      gridEl.__ag_initialized = false;
    }
    
    t.selectedAdminTeamId.set(teamId);
    t.selectedTickets.set([]);
    t.$('#selectedCount').text('0 items selected');
    t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
  },

  'click #batchReviewed'(e, t) {
    callBatch(t, 'reviewed');
  },

  'click #batchClosed'(e, t) {
    callBatch(t, 'closed');
  },

  'click #batchDeleted'(e, t) {
    const ids = t.selectedTickets.get();
    if (ids.length && confirm(`Are you sure you want to mark ${ids.length} items as deleted?`)) {
      callBatch(t, 'deleted');
    }
  },

  'click #helpButton'(e, t) {
    t.$('#helpModal').addClass('modal-open');
  },

  'click #closeHelpModal'(e, t) {
    t.$('#helpModal').removeClass('modal-open');
  }
});

function callBatch(t, status) {
  const ids = t.selectedTickets.get();
  const teamId = t.selectedAdminTeamId.get();
  if (!ids.length || !teamId) return;
  
  Meteor.call('batchUpdateTicketStatus', {
    ticketIds: ids,
    status: status,
    teamId: teamId
  }, (error) => {
    if (error) {
      alert('Error updating tickets: ' + error.message);
    } else {
      t.selectedTickets.set([]);
      if (t.gridOptions?.api) t.gridOptions.api.deselectAll();
      t.$('#selectedCount').text('0 items selected');
      t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
    }
  });
}

function formatTime(seconds) {
  if (!seconds || typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00:00';
  
  // Handle extremely large numbers to prevent overflow
  const maxHours = 9999; // Reasonable maximum for display
  const clampedTime = Math.min(seconds, maxHours * 3600);
  
  const h = Math.floor(clampedTime / 3600);
  const m = Math.floor((clampedTime % 3600) / 60);
  const s = Math.floor(clampedTime % 60);
  
  // If the original time was clamped, indicate it
  if (seconds > maxHours * 3600) {
    return `${h}+:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function capitalizeStatus(status) {
  const s = status || 'open';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

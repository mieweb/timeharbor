// Admin Review Template
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets } from '../../../collections.js';
import { Grid } from 'ag-grid-community';

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
      valueFormatter: p => formatTime(p.value) 
    },
    { 
      headerName: 'Status', 
      field: 'status', 
      sortable: true, 
      filter: 'agSetColumnFilter', 
      valueFormatter: p => capitalizeStatus(p.value || 'open') 
    },
    { 
      headerName: 'Creator', 
      field: 'createdByName', 
      sortable: true, 
      filter: 'agTextColumnFilter' 
    },
         { 
       headerName: 'Reviewed', 
       field: 'reviewedAt', 
       sortable: true, 
       cellRenderer: params => {
         if (!params.value) return '—';
         const reviewedBy = params.data.reviewedBy;
         const reviewerName = reviewedBy ? (Meteor.users.findOne(reviewedBy) || {}).username || 'Unknown' : 'Unknown';
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
      if (!instance.gridOptions || !instance.gridOptions.api) return;
      const selected = instance.gridOptions.api.getSelectedRows().map(r => r._id);
      instance.selectedTickets.set(selected);
      const count = selected.length;
      instance.$('#selectedCount').text(`${count} items selected`);
      const hasSelection = count > 0;
      instance.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', !hasSelection);
    },
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
  };

  // Lazily create the grid only when the container exists
  instance.autorun(() => {
    const gridEl = instance.find('#adminGrid');
    const teamIdPresent = !!instance.selectedAdminTeamId.get();
    if (gridEl && teamIdPresent && !gridEl.__ag_initialized) {
      try {
        new Grid(gridEl, instance.gridOptions);
        gridEl.__ag_initialized = true;
      } catch (e) {}
    }
  });

  // Reactively feed data to grid
  instance.autorun(() => {
    const teamId = instance.selectedAdminTeamId.get();
    if (!teamId) {
      if (instance.gridOptions && instance.gridOptions.api) {
        instance.gridOptions.api.setRowData([]);
      }
      return;
    }
         const tickets = Tickets.find({ teamId }).fetch().map(t => ({
       ...t,
       createdByName: (Meteor.users.findOne(t.createdBy) || {}).username || 'Unknown',
       // Ensure reviewedBy is available for the Reviewed column
       reviewedBy: t.reviewedBy || null,
     }));
    if (instance.gridOptions && instance.gridOptions.api) {
      instance.gridOptions.api.setRowData(tickets);
    }
  });
});

Template.admin.helpers({
  adminTeams() {
    // Only show teams where user is admin or leader
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

  hasTickets() {
    const instance = Template.instance();
    const selectedTeamId = instance.selectedAdminTeamId.get();
    if (!selectedTeamId) return false;
    return Tickets.find({ teamId: selectedTeamId }).count() > 0;
  }
});

Template.admin.events({
  'change #adminTeamSelect'(e, t) {
    const teamId = e.target.value || null;
    t.selectedAdminTeamId.set(teamId);
    t.selectedTickets.set([]);
    t.$('#selectedCount').text('0 items selected');
    t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
    
    if (t.gridOptions && t.gridOptions.api) {
      t.gridOptions.api.deselectAll();
    }
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
      if (t.gridOptions) t.gridOptions.api.deselectAll();
      t.$('#selectedCount').text('0 items selected');
      t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
    }
  });
}

function formatTime(seconds) {
  if (!seconds) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function capitalizeStatus(status) {
  const s = status || 'open';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

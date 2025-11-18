import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ClockEvents, Teams, Tickets } from '../../../collections.js';
import { formatTime, formatTimeHoursMinutes, formatDate } from '../../utils/TimeUtils.js';
import { getUserName, getUserEmail } from '../../utils/UserTeamUtils.js';
import { dateToLocalString, getToday, getYesterday, getDaysAgo, getThisWeekStart, formatDateForDisplay } from '../../utils/DateUtils.js';
import { Grid, createGrid } from 'ag-grid-community';

// Constants
const GRID_CONFIG = {
  PAGINATION_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  DEFAULT_SORT_COLUMN: 'startTime',
  DEFAULT_SORT_ORDER: 'desc'
};

const getColumnDefinitions = (isEditable) => [
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
    editable: isEditable,
    cellEditor: isEditable ? 'timeCellEditor' : undefined,
    valueParser: isEditable ? (p) => {
      // Return original value to avoid type mismatch - handleCellEdit will parse the newValue string
      return p.oldValue;
    } : undefined,
    valueFormatter: p => {
      if (!p.value) return 'No clock-in';
      const d = p.value instanceof Date ? p.value : new Date(p.value);
      return isNaN(d.getTime()) ? 'Invalid' : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    },
    cellClass: 'font-medium'
  },
  { 
    headerName: 'Clock-out', 
    field: 'endTime', 
    flex: 1, 
    sortable: true, 
    filter: 'agDateColumnFilter',
    editable: isEditable,
    cellEditor: isEditable ? 'timeCellEditor' : undefined,
    valueParser: isEditable ? (p) => {
      // Return original value to avoid type mismatch - handleCellEdit will parse the newValue string
      return p.oldValue;
    } : undefined,
    valueFormatter: p => {
      if (!p.value) return 'Not clocked out';
      const d = p.value instanceof Date ? p.value : new Date(p.value);
      return isNaN(d.getTime()) ? 'Invalid' : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    },
    cellClass: 'font-medium'
  },
  { 
    headerName: 'Duration', 
    field: 'duration', 
    flex: 0.8, 
    sortable: true, 
    filter: 'agNumberColumnFilter',
    valueFormatter: p => p.value ? formatTimeHoursMinutes(p.value) : (p.data?.isActive ? 'Running...' : 'No clock-in'),
    cellClass: p => p.value ? 'text-info font-medium' : 'font-medium',
    comparator: (valueA, valueB) => (valueA || 0) - (valueB || 0)
  },
  { 
    headerName: 'Ticket', 
    field: 'activityTitle', 
    flex: 1.5, 
    sortable: true, 
    filter: 'agTextColumnFilter',
    valueFormatter: p => p.value || 'No activity',
    cellClass: 'font-medium',
    tooltipField: 'activityTitle'
  },
  { 
    headerName: 'Team', 
    field: 'teamName', 
    flex: 1, 
    sortable: true, 
    filter: 'agTextColumnFilter',
    valueFormatter: p => p.value || 'No team',
    cellClass: p => p.value ? 'text-primary' : 'font-medium',
    tooltipField: 'teamName'
  },
  { 
    headerName: 'Status', 
    field: 'isActive', 
    flex: 0.6, 
    sortable: true, 
    filter: 'agSetColumnFilter',
    valueFormatter: p => p.value ? 'Active' : 'Completed',
    cellClass: p => p.value ? 'text-success font-bold' : 'font-medium',
    filterParams: { values: ['Active', 'Completed'] },
    cellRenderer: p => p.value ? '<span class="text-success font-bold">Active</span>' : '<span class="font-medium">Completed</span>'
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
    eventId: event._id,
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

// Custom cell editor that shows time string when editing
const TimeCellEditor = function() {};
TimeCellEditor.prototype.init = function(params) {
  this.eInput = document.createElement('input');
  this.eInput.type = 'text';
  this.eInput.className = 'ag-input-field-input ag-text-field-input';
  this.eInput.style.width = '100%';
  
  // Convert Date to time string for editing
  const value = params.value;
  if (value instanceof Date) {
    this.eInput.value = value.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } else if (value) {
    const d = new Date(value);
    this.eInput.value = isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } else {
    this.eInput.value = '';
  }
  
  this.eInput.placeholder = 'e.g., 9:00 AM or 14:05';
};
TimeCellEditor.prototype.getGui = function() { return this.eInput; };
TimeCellEditor.prototype.afterGuiAttached = function() { 
  this.eInput.focus(); 
  this.eInput.select(); 
};
TimeCellEditor.prototype.getValue = function() { return this.eInput.value; };
TimeCellEditor.prototype.destroy = function() {};
TimeCellEditor.prototype.isPopup = function() { return false; };

// Simple time parser: converts "9:00 AM" or "14:05" to timestamp
const parseTimeString = (timeStr, baseDateStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const text = timeStr.trim().toLowerCase();
  const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (!match) return null;
  
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const second = match[3] ? parseInt(match[3], 10) : 0;
  const meridiem = match[4];
  
  if (meridiem === 'am' || meridiem === 'pm') {
    if (hour === 12) hour = 0;
    if (meridiem === 'pm') hour += 12;
  }
  
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
  
  const [y, mo, d] = baseDateStr.split('-').map(n => parseInt(n, 10));
  return new Date(y, mo - 1, d, hour, minute, second).getTime();
};

const createGridOptions = (isEditable, onCellValueChanged) => ({
  columnDefs: getColumnDefinitions(isEditable),
  components: {
    timeCellEditor: TimeCellEditor
  },
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
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
  onGridReady: (params) => {
    // Store api reference for compatibility
    if (!params.api && params) {
      params.api = params; // For createGrid, api is the gridApi itself
    }
    if (params.api && params.api.sizeColumnsToFit) {
      params.api.sizeColumnsToFit();
    }
  },
  onFirstDataRendered: (params) => {
    const api = params.api || params;
    if (api && api.applyColumnState) {
      api.applyColumnState({
        state: [{ colId: GRID_CONFIG.DEFAULT_SORT_COLUMN, sort: GRID_CONFIG.DEFAULT_SORT_ORDER }],
        defaultState: { sort: null }
      });
    }
  },
  onCellValueChanged: onCellValueChanged
});

Template.timesheet.onCreated(function () {
  const instance = this;
  
  // Initialize reactive variables
  const today = getToday();
  instance.userId = FlowRouter.getParam('userId');
  instance.startDate = new ReactiveVar(dateToLocalString(today));
  instance.endDate = new ReactiveVar(dateToLocalString(today));
  instance.selectedPreset = new ReactiveVar('today');
  instance.editMode = new ReactiveVar(false);
  instance.canEdit = new ReactiveVar(false);
  instance.pendingEdits = new Map(); // eventId -> { startTimestamp?, endTimestamp? }
  
  // Helper to process a cell edit value
  instance.processCellEdit = (row, field, newValue) => {
    if (!instance.editMode.get() || !instance.canEdit.get()) return false;
    if (field !== 'startTime' && field !== 'endTime') return false;
    
    const eventId = row.eventId;
    if (!eventId) return false;
    
    // Parse the time string if it's a string
    if (typeof newValue === 'string') {
      const baseDateStr = row.date;
      const timestamp = parseTimeString(newValue, baseDateStr);
      
      if (timestamp === null) {
        alert('Invalid time format. Please use format like "9:00 AM" or "14:05"');
        return false;
      }
      
      // Store pending edit
      const existing = instance.pendingEdits.get(eventId) || {};
      if (field === 'startTime') {
        existing.startTimestamp = timestamp;
        row.startTime = new Date(timestamp);
      } else if (field === 'endTime') {
        existing.endTimestamp = timestamp;
        row.endTime = new Date(timestamp);
      }
      instance.pendingEdits.set(eventId, existing);
      
      // Update the row data with the new Date
      if (instance.gridApi && instance.gridApi.getRowNode) {
        const rowNode = instance.gridApi.getRowNode(eventId);
        if (rowNode) {
          rowNode.setData(row);
        }
      }
      return true;
    }
    return false;
  };
  
  // Cell value changed handler
  instance.handleCellEdit = (params) => {
    if (!instance.editMode.get() || !instance.canEdit.get()) return;
    const field = params.colDef.field;
    if (field !== 'startTime' && field !== 'endTime') return;
    
    const row = params.data;
    const eventId = row.eventId;
    if (!eventId) return;
    
    // Get the new value - it might be a string from the editor
    let newValue = params.newValue;
    if (typeof newValue === 'string') {
      const baseDateStr = row.date;
      const timestamp = parseTimeString(newValue, baseDateStr);
      
      if (timestamp === null) {
        alert('Invalid time format. Please use format like "9:00 AM" or "14:05"');
        // Restore original Date value
        params.node.setDataValue(field, params.oldValue);
        return;
      }
      
      // Store pending edit
      const existing = instance.pendingEdits.get(eventId) || {};
      if (field === 'startTime') {
        existing.startTimestamp = timestamp;
        row.startTime = new Date(timestamp);
      } else if (field === 'endTime') {
        existing.endTimestamp = timestamp;
        row.endTime = new Date(timestamp);
      }
      instance.pendingEdits.set(eventId, existing);
      
      // Update the row data with the new Date
      params.node.setData(row);
    }
  };
  
  instance.gridOptions = createGridOptions(false, instance.handleCellEdit);
  
  // Data caches for performance
  instance.ticketsCache = new Map();
  instance.teamsCache = new Map();
  
  // Subscribe to data
  this.autorun(() => {
    // Apply start/end from query params on first run
    const { queryParams } = FlowRouter.current();
    if (queryParams) {
      const qsStart = queryParams.start;
      const qsEnd = queryParams.end;
      let applied = false;
      if (qsStart && typeof qsStart === 'string') { instance.startDate.set(qsStart); applied = true; }
      if (qsEnd && typeof qsEnd === 'string') { instance.endDate.set(qsEnd); applied = true; }
      if (applied) instance.selectedPreset.set('custom');
    }

    const userId = instance.userId;
    const currentUserId = Meteor.userId();
    
    if (userId) {
      // Check if user is viewing their own timesheet or if current user is admin/leader
      const isViewingOwnTimesheet = userId === currentUserId;
      const leaderTeams = Teams.find({ leader: currentUserId }).fetch();
      const adminTeams = Teams.find({ admins: currentUserId }).fetch();
      const isAdminOrLeader = leaderTeams.length > 0 || adminTeams.length > 0;
      instance.canEdit.set(isAdminOrLeader);
      
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
        // Use createGrid if available, otherwise fall back to new Grid
        if (typeof createGrid === 'function') {
          instance.gridApi = createGrid(gridEl, instance.gridOptions);
        } else {
          const grid = new Grid(gridEl, instance.gridOptions);
          instance.gridApi = grid.options.api || grid;
        }
        gridEl.__ag_initialized = true;
        instance.updateGridData();
      }
    });
  });
  
  // Reactive grid updates
  instance.autorun(() => {
    if (!instance.userId || !instance.gridApi) return;
    instance.updateGridData();
  });
  
  // Optimized grid update method
  instance.updateGridData = () => {
    const rows = instance.computeSessionData();
    if (instance.gridApi) {
      if (instance.gridApi.setGridOption) {
        instance.gridApi.setGridOption('rowData', rows);
      } else if (instance.gridApi.setRowData) {
        instance.gridApi.setRowData(rows);
      }
    }
    instance.updateSessionCount(rows.length);
  };
  
  // Session count updater
  instance.updateSessionCount = (count) => {
    const clockInCountEl = instance.find('#clockInCount');
    if (clockInCountEl) {
      clockInCountEl.textContent = `${count} clock-in${count !== 1 ? 's' : ''}`;
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
    
    if (instance.gridApi) {
      instance.updateGridData();
    }
  };
});

Template.timesheet.onRendered(function () {
  const instance = this;
  
  // Enable/disable Edit button based on permissions
  instance.autorun(() => {
    const btn = instance.find('#editClockins');
    if (btn) {
      btn.disabled = !instance.canEdit.get();
    }
  });
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
  isEditMode: () => Template.instance().editMode.get(),
  
  totalHours() {
    const instance = Template.instance();
    const userId = instance.userId;
    if (!userId) return '0:00';
    
    const startDateStr = instance.startDate.get();
    const endDateStr = instance.endDate.get();
    const dateRange = createDateRange(startDateStr, endDateStr);
    
    // Use same calculation as home page: directly from ClockEvents
    const clockEvents = ClockEvents.find({ userId }).fetch();
    const filteredEvents = clockEvents.filter(event => 
      isEventInDateRange(new Date(event.startTimestamp), dateRange)
    );
    
    // Same calculation logic as home page but clamped to minutes
    const totalMinutes = filteredEvents.reduce((sum, event) => {
      const endTime = event.endTime || Date.now();
      const durationMinutes = Math.floor((endTime - event.startTimestamp) / 60000);
      return sum + durationMinutes;
    }, 0);
    
    return formatTimeHoursMinutes(totalMinutes * 60);
  },
  
  totalSessions() {
    return Template.instance().computeSessionData().length;
  },
  
  averageSessionHours() {
    const rows = Template.instance().computeSessionData();
    const completedSessions = rows.filter(row => row.duration && typeof row.duration === 'number' && row.duration > 0);
    
    if (completedSessions.length === 0) return '0:00';
    
    const totalMinutes = completedSessions.reduce((sum, row) => {
      const durationSeconds = row.duration || 0;
      const durationMinutes = Math.floor(durationSeconds / 60);
      return sum + (durationMinutes > 0 ? durationMinutes : 0);
    }, 0);
    
    if (totalMinutes <= 0) return '0:00';
    
    const averageMinutes = totalMinutes / completedSessions.length;
    
    // Additional safety check for reasonable average values
    if (averageMinutes > 24 * 60) { // More than 24 hours average seems unreasonable
      console.warn('Unusually large average session time detected:', averageMinutes);
    }
    
    return formatTimeHoursMinutes(Math.floor(averageMinutes) * 60);
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
  
  'click #editClockins': (e, t) => {
    if (!t.canEdit.get()) {
      alert('Only team admins/leaders can edit timesheets.');
      return;
    }
    
    const isCurrentlyEditing = t.editMode.get();
    
    if (isCurrentlyEditing) {
      // Clicking Save - save all pending edits
      // First, capture any currently editing cell's value before stopping
      if (t.gridApi) {
        // Get currently editing cells
        const editingCells = t.gridApi.getEditingCells ? t.gridApi.getEditingCells() : [];
        
        if (editingCells && editingCells.length > 0) {
          // Process each editing cell
          editingCells.forEach(cellInfo => {
            const rowNode = t.gridApi.getDisplayedRowAtIndex ? t.gridApi.getDisplayedRowAtIndex(cellInfo.rowIndex) : null;
            if (rowNode && rowNode.data) {
              // Get the editor instance and its value
              const cellEditor = t.gridApi.getCellEditorInstances ? t.gridApi.getCellEditorInstances({ rowNodes: [rowNode], columns: [cellInfo.column] }) : null;
              
              if (cellEditor && cellEditor.length > 0 && cellEditor[0] && cellEditor[0].getValue) {
                const editorValue = cellEditor[0].getValue();
                const field = cellInfo.column.getColId();
                const row = rowNode.data;
                
                // Process this edit before stopping
                t.processCellEdit(row, field, editorValue);
              }
            }
          });
        }
        
        // Now stop editing (this will trigger onCellValueChanged as well)
        if (t.gridApi.stopEditing) {
          t.gridApi.stopEditing(false); // false = save (don't cancel)
        }
      }
      
      // Use setTimeout to ensure all cell value changed events have fired
      Meteor.setTimeout(() => {
        const edits = Array.from(t.pendingEdits.entries());
        if (edits.length === 0) {
          // No edits, just exit edit mode
          t.editMode.set(false);
          if (t.gridApi) {
            const colDefs = getColumnDefinitions(false);
            if (t.gridApi.setGridOption) {
              t.gridApi.setGridOption('columnDefs', colDefs);
            } else if (t.gridApi.setColumnDefs) {
              t.gridApi.setColumnDefs(colDefs);
            }
          }
          return;
        }
        
        // Save all edits
        let completed = 0;
        let errors = 0;
        const total = edits.length;
        
        edits.forEach(([eventId, payload]) => {
          Meteor.call('updateClockEventTimes', {
            clockEventId: eventId,
            startTimestamp: payload.startTimestamp,
            endTimestamp: payload.endTimestamp,
          }, (err) => {
            completed++;
            if (err) {
              errors++;
              console.error('Failed to save edit for', eventId, err);
            }
            
            if (completed === total) {
              if (errors > 0) {
                alert(`Saved ${total - errors} of ${total} edit(s). Some failed - check console.`);
              } else {
                alert(`${total} edit(s) saved successfully.`);
              }
              
              // Clear pending edits and refresh
              t.pendingEdits.clear();
              t.editMode.set(false);
              if (t.gridApi) {
                const colDefs = getColumnDefinitions(false);
                if (t.gridApi.setGridOption) {
                  t.gridApi.setGridOption('columnDefs', colDefs);
                } else if (t.gridApi.setColumnDefs) {
                  t.gridApi.setColumnDefs(colDefs);
                }
                t.updateGridData(); // Refresh grid to show updated data
              }
            }
          });
        });
      }, 100); // Small delay to ensure all events have processed
      
    } else {
      // Clicking Edit - enter edit mode
      t.editMode.set(true);
      if (t.gridApi) {
        // Update column defs with edit mode
        const colDefs = getColumnDefinitions(true);
        if (t.gridApi.setGridOption) {
          t.gridApi.setGridOption('columnDefs', colDefs);
        } else if (t.gridApi.setColumnDefs) {
          t.gridApi.setColumnDefs(colDefs);
        }
      }
    }
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
  if (this.gridApi && this.gridApi.destroy) {
    this.gridApi.destroy();
  }
});
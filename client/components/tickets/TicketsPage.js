import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, calculateTotalTime } from '../../utils/TimeUtils.js';
import { extractUrlTitle } from '../../utils/UrlUtils.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';


// Utility functions
const utils = {
  // Safe Meteor call wrapper
  meteorCall: (methodName, ...args) => {
    return new Promise((resolve, reject) => {
      Meteor.call(methodName, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },


  // Get current timestamp
  now: () => Date.now(),

  // Safe error handling
  handleError: (error, message = 'Operation failed') => {
    alert(`${message}: ${error.reason || error.message}`);
  }
};

// Ticket management functions
const ticketManager = {
  // Start a new ticket
  startTicket: async (ticketId, templateInstance, clockEvent) => {
    try {
      templateInstance.activeTicketId.set(ticketId);
      const now = utils.now();
      
      await utils.meteorCall('updateTicketStart', ticketId, now);
      
      if (clockEvent) {
        await utils.meteorCall('clockEventAddTicket', clockEvent._id, ticketId, now);
      }
    } catch (error) {
      utils.handleError(error, 'Failed to start timer');
      templateInstance.activeTicketId.set(null);
    }
  },

  // Stop a ticket
  stopTicket: async (ticketId, clockEvent) => {
    try {
      const now = utils.now();
      await utils.meteorCall('updateTicketStop', ticketId, now);
      
      if (clockEvent) {
        await utils.meteorCall('clockEventStopTicket', clockEvent._id, ticketId, now);
      }
      return true;
    } catch (error) {
      utils.handleError(error, 'Failed to stop timer');
      return false;
    }
  },

  // Switch from one ticket to another
  switchTicket: async (newTicketId, templateInstance, clockEvent) => {
    const currentActiveId = templateInstance.activeTicketId.get();
    
    if (currentActiveId) {
      const success = await ticketManager.stopTicket(currentActiveId, clockEvent);
      if (!success) return false;
    }
    
    await ticketManager.startTicket(newTicketId, templateInstance, clockEvent);
    return true;
  }
};

// Session management functions
const sessionManager = {
  // Start a session
  startSession: async (teamId) => {
    try {
      await utils.meteorCall('clockEventStart', teamId);
    } catch (error) {
      utils.handleError(error, 'Failed to start session');
    }
  },

  // Stop a session
  stopSession: async (teamId, activeTicketId) => {
    try {
      if (activeTicketId) {
        await ticketManager.stopTicket(activeTicketId);
      }
      await utils.meteorCall('clockEventStop', teamId);
      return true;
    } catch (error) {
      utils.handleError(error, 'Failed to stop session');
      return false;
    }
  }
};

Template.tickets.onCreated(function () {
  // Form state
  this.showCreateTicketForm = new ReactiveVar(false);
  this.showEditTicketForm = new ReactiveVar(false);
  this.editingTicket = new ReactiveVar(null);
  
  // Data state
  this.selectedTeamId = new ReactiveVar(null);
  this.activeTicketId = new ReactiveVar(null);
  
  // Cached data to avoid repeated queries
  this.cachedTeamId = null;
  this.cachedActiveTicketId = null;
  this.cachedUserId = Meteor.userId();

  // Optimized autorun with better performance
  this.autorun(() => {
    const teamIds = Teams.find({}).map(t => t._id);
    let teamId = this.selectedTeamId.get();
    
    // Auto-select first team if none selected
    if (!teamId && teamIds.length > 0) {
      teamId = teamIds[0];
      this.selectedTeamId.set(teamId);
    }
    
    // Subscribe to data
    if (teamIds.length > 0) {
      this.subscribe('teamTickets', teamIds);
    }
    
    // Update active ticket state efficiently
    if (teamId && teamId !== this.cachedTeamId) {
      this.cachedTeamId = teamId;
      this.updateActiveTicketState(teamId);
    }
  });
  
  // Helper method to update active ticket state
  this.updateActiveTicketState = (teamId) => {
    const activeSession = ClockEvents.findOne({ 
      userId: this.cachedUserId, 
      teamId, 
      endTime: null 
    });
    
    if (activeSession) {
      const runningTicket = Tickets.findOne({ 
        teamId, 
        startTimestamp: { $exists: true } 
      });
      const newActiveId = runningTicket ? runningTicket._id : null;
      if (newActiveId !== this.cachedActiveTicketId) {
        this.cachedActiveTicketId = newActiveId;
        this.activeTicketId.set(newActiveId);
      }
    } else if (this.cachedActiveTicketId !== null) {
      this.cachedActiveTicketId = null;
      this.activeTicketId.set(null);
    }
  };
});

Template.tickets.onDestroyed(function () {
  // Clean up ReactiveVars
  this.showCreateTicketForm.set(false);
  this.showEditTicketForm.set(false);
  this.editingTicket.set(null);
  this.selectedTeamId.set(null);
  this.activeTicketId.set(null);
});

Template.tickets.helpers({
  userTeams: getUserTeams,
  isSelectedTeam(teamId) {
    return Template.instance().selectedTeamId.get() === teamId ? 'selected' : '';
  },
  showCreateTicketForm() {
    return Template.instance().showCreateTicketForm.get();
  },
  showEditTicketForm() {
    return Template.instance().showEditTicketForm.get();
  },
  editingTicket() {
    return Template.instance().editingTicket.get();
  },
  tickets() {
    const instance = Template.instance();
    const teamId = instance.selectedTeamId.get();
    if (!teamId) return [];
    
    const activeTicketId = instance.activeTicketId.get();
    const now = currentTime.get();
    
    // Optimized: Single query instead of fetch().map()
    return Tickets.find({ teamId }).map(ticket => {
      const isActive = ticket._id === activeTicketId && ticket.startTimestamp;
      const elapsed = isActive ? Math.max(0, Math.floor((now - ticket.startTimestamp) / 1000)) : 0;
      
      return {
        ...ticket,
        displayTime: (ticket.accumulatedTime || 0) + elapsed
      };
    });
  },
  isActive(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket && ticket.startTimestamp && !ticket.endTime;
  },
  formatTime,
  githubLink(github) {
    if (!github) return '';
    return github.startsWith('http') ? github : `https://github.com/${github}`;
  },
  isClockedInForTeam(teamId) {
    return !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
  },
  getButtonClasses(ticketId) {
    const instance = Template.instance();
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = instance.selectedTeamId.get();
    
    // Cache the session check to avoid repeated queries
    if (!instance._cachedSessionState) {
      instance._cachedSessionState = {};
    }
    
    if (!instance._cachedSessionState[teamId]) {
      instance._cachedSessionState[teamId] = !!ClockEvents.findOne({ 
        userId: instance.cachedUserId, 
        teamId, 
        endTime: null 
      });
    }
    
    const hasActiveSession = instance._cachedSessionState[teamId];
    
    if (isActive) return 'btn btn-outline btn-primary';
    if (hasActiveSession) return 'btn btn-outline btn-primary';
    return 'btn btn-disabled';
  },
  getButtonTooltip(ticketId) {
    const instance = Template.instance();
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = instance.selectedTeamId.get();
    
    // Reuse cached session state
    const hasActiveSession = instance._cachedSessionState && instance._cachedSessionState[teamId];
    
    if (isActive) return 'Click to stop this activity';
    if (hasActiveSession) return 'Click to start this activity';
    return 'Start a session first to begin activities';
  }
});

Template.tickets.events({
  'change #teamSelect'(e, t) {
    const newTeamId = e.target.value;
    t.selectedTeamId.set(newTeamId);
    
    // Invalidate cache when team changes
    if (t._cachedSessionState) {
      delete t._cachedSessionState[t.cachedTeamId];
    }
    t.cachedTeamId = newTeamId;
  },
  'click #showCreateTicketForm'(e, t) {
    t.showCreateTicketForm.set(true);
  },
  'click #cancelCreateTicket'(e, t) {
    t.showCreateTicketForm.set(false);
  },
  'click #cancelEditTicket'(e, t) {
    t.showEditTicketForm.set(false);
    t.editingTicket.set(null);
  },
  'blur [name="title"]'(e) {
    extractUrlTitle(e.target.value, e.target);
  },
  'paste [name="title"]'(e) {
    setTimeout(() => extractUrlTitle(e.target.value, e.target), 0);
  },
  
  async 'submit #createTicketForm'(e, t) {
    e.preventDefault();
    
    const formData = {
      teamId: t.selectedTeamId.get(),
      title: e.target.title.value?.trim(),
      github: e.target.github.value?.trim()
    };
    
    if (!formData.title) {
      alert('Ticket title is required.');
      return;
    }
    
    try {
      const ticketId = await utils.meteorCall('createTicket', { 
        teamId: formData.teamId, 
        title: formData.title, 
        github: formData.github, 
        accumulatedTime: 0
      });
      
      t.showCreateTicketForm.set(false);
      e.target.reset();
    } catch (error) {
      utils.handleError(error, 'Error creating ticket');
    }
  },
  
  async 'submit #editTicketForm'(e, t) {
    e.preventDefault();
    
    const formData = {
      ticketId: e.target.ticketId.value,
      title: e.target.title.value?.trim(),
      github: e.target.github.value?.trim()
    };
    
    if (!formData.title) {
      alert('Ticket title is required.');
      return;
    }
    
    try {
      await utils.meteorCall('updateTicket', formData.ticketId, {
        title: formData.title,
        github: formData.github
      });
      
      t.showEditTicketForm.set(false);
      t.editingTicket.set(null);
    } catch (error) {
      utils.handleError(error, 'Error updating ticket');
    }
  },
  
  'click .edit-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (ticket) {
      t.editingTicket.set(ticket);
      t.showEditTicketForm.set(true);
      t.showCreateTicketForm.set(false);
    }
  },
  
  async 'click .delete-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (!ticket) return;
    
    const confirmed = confirm(`Are you sure you want to delete ticket "${ticket.title}"? This cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await utils.meteorCall('deleteTicket', ticketId);
    } catch (error) {
      utils.handleError(error, 'Error deleting ticket');
    }
  },
  
  async 'click .activate-ticket'(e, t) {
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = t.selectedTeamId.get();
    
    // Use cached session state instead of querying
    const hasActiveSession = t._cachedSessionState && t._cachedSessionState[teamId];
    
    if (!isActive) {
      if (!hasActiveSession) {
        alert('Please start a session before starting an activity.');
        return;
      }
      
      const clockEvent = ClockEvents.findOne({ userId: t.cachedUserId, teamId, endTime: null });
      await ticketManager.startTicket(ticketId, t, clockEvent);
    } else {
      const clockEvent = ClockEvents.findOne({ userId: t.cachedUserId, teamId, endTime: null });
      await ticketManager.stopTicket(ticketId, clockEvent);
    }
  },
  
  'click #clockInBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    sessionManager.startSession(teamId);
  },
  
  async 'click #clockOutBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    const activeTicketId = t.activeTicketId.get();
    
    const success = await sessionManager.stopSession(teamId, activeTicketId);
    if (success) {
      t.activeTicketId.set(null);
    }
  }
});
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, calculateTotalTime, formatDurationText } from '../../utils/TimeUtils.js';
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
    console.error(message, error);
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
  stopSession: async (teamId) => {
    try {
      // Find running tickets created by current user and stop them
      const runningTickets = Tickets.find({ teamId, createdBy: Meteor.userId(), startTimestamp: { $exists: true } }).fetch();
      
      // Stop all running tickets
      const stopPromises = runningTickets.map(ticket => 
        ticketManager.stopTicket(ticket._id)
      );
      
      // Wait for all tickets to stop
      await Promise.all(stopPromises);
      
      // Then stop the clock event (which will also stop any remaining tickets)
      await utils.meteorCall('clockEventStop', teamId);
      return true;
    } catch (error) {
      utils.handleError(error, 'Failed to stop session');
      return false;
    }
  }
};

Template.tickets.onCreated(function () {
  this.showCreateTicketForm = new ReactiveVar(false);
  this.showEditTicketForm = new ReactiveVar(false);
  this.editingTicket = new ReactiveVar(null);
  this.selectedTeamId = new ReactiveVar(null);
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);
  this.autoClockOutTriggered = new ReactiveVar(false); // Track if auto-clock-out was triggered

  // Auto-clock-out: Check every second when timer reaches 10:00:00
  this.autorun(() => {
    const teamId = this.selectedTeamId.get();
    const now = currentTime.get(); // This updates every second
    
    if (teamId && Meteor.userId()) {
      const activeSession = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      
      if (activeSession && !this.autoClockOutTriggered.get()) {
        // Calculate continuous session duration in seconds
        const sessionDurationSeconds = Math.floor((now - activeSession.startTimestamp) / 1000);
        const TEN_HOURS_SECONDS = 10 * 60 * 60; // 36000 seconds
        
        // Auto-clock-out when timer reaches exactly 10:00:00 or above
        if (sessionDurationSeconds >= TEN_HOURS_SECONDS) {
          this.autoClockOutTriggered.set(true);
          
          // Calculate total duration for notification (using utility function)
          const totalSeconds = (activeSession.accumulatedTime || 0) + sessionDurationSeconds;
          const durationText = formatDurationText(totalSeconds);
          
          // Get team name for notification
          const team = Teams.findOne(teamId);
          const teamName = team?.name || 'your team';
          
          // Automatically clock out
          sessionManager.stopSession(teamId).then(() => {
            // Send push notification to user
            utils.meteorCall('notifyAutoClockOut', durationText, teamName).catch((err) => {
              console.error('Failed to send auto-clock-out notification:', err);
              // Don't fail if notification fails, just log it
            });
            
            alert('You have been automatically clocked out after 10 hours of continuous work.');
          }).catch((error) => {
            console.error('Auto-clock-out failed:', error);
            this.autoClockOutTriggered.set(false); // Reset flag if it failed
          });
        }
      } else if (!activeSession) {
        // Reset flag when there's no active session
        this.autoClockOutTriggered.set(false);
      }
    }
  });

  this.autorun(() => {
    const teamIds = Teams.find({}).map(t => t._id);
    let teamId = this.selectedTeamId.get();
    
    if (!teamId && teamIds.length > 0) {
      this.selectedTeamId.set(teamIds[0]);
      teamId = this.selectedTeamId.get();
    }
    
    this.subscribe('teamTickets', teamIds);
    
    if (teamId) {
      const activeSession = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      if (activeSession) {
        const runningTicket = Tickets.findOne({ teamId, createdBy: Meteor.userId(), startTimestamp: { $exists: true } });
        this.activeTicketId.set(runningTicket ? runningTicket._id : null);
      } else {
        this.activeTicketId.set(null);
      }
    }
  });
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
    const teamId = Template.instance().selectedTeamId.get();
    if (!teamId) return [];
    
    const activeTicketId = Template.instance().activeTicketId.get();
    const now = currentTime.get();
    const searchQuery = Template.instance().searchQuery.get().toLowerCase();
    
    // Show only tickets created by the current user
    return Tickets.find({ teamId, createdBy: Meteor.userId() }).fetch()
      .filter(ticket => !searchQuery || ticket.title.toLowerCase().includes(searchQuery))
      .map(ticket => {
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
  isClockedIn() {
    return Template.instance().clockedIn.get();
  },
  selectedTeamId() {
    return Template.instance().selectedTeamId.get();
  },
  isClockedInForTeam(teamId) {
    return !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
  },
  currentClockEventTime() {
    const teamId = Template.instance().selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    return clockEvent ? calculateTotalTime(clockEvent) : 0;
  },
  currentSessionTime() {
    const teamId = Template.instance().selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    if (!clockEvent) return '0:00:00';
    
    const now = currentTime.get(); // This reactive variable updates every second
    const elapsed = Math.floor((now - clockEvent.startTimestamp) / 1000);
    
    return formatTime(elapsed);
  },
  currentActiveTicketInfo() {
    const activeTicketId = Template.instance().activeTicketId.get();
    if (!activeTicketId) return null;
    
    const ticket = Tickets.findOne(activeTicketId);
    return ticket ? {
      id: ticket._id,
      title: ticket.title,
      isRunning: !!ticket.startTimestamp
    } : null;
  },
  getButtonClasses(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = Template.instance().selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) return 'btn btn-outline btn-primary';
    if (hasActiveSession) return 'btn btn-outline btn-primary';
    return 'btn btn-disabled';
  },
  getButtonTooltip(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = Template.instance().selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) return 'Click to stop this activity';
    if (hasActiveSession) return 'Click to start this activity';
    return 'Start a session first to begin activities';
  }
});

Template.tickets.events({
  'change #teamSelect'(e, t) {
    t.selectedTeamId.set(e.target.value);
  },
  'input #searchTickets'(e, t) {
    t.searchQuery.set(e.target.value);
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

  async 'submit #createTicketForm'(e, t) {
    e.preventDefault();
    
    const formData = {
      teamId: t.selectedTeamId.get(),
      title: e.target.title.value.trim(),
      github: e.target.github.value.trim()
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
  
  async 'click .activate-ticket'(e, t) {
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = t.selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    
    if (!isActive) {
      if (!clockEvent) {
        alert('Please start a session before starting an activity.');
        return;
      }
      
      await ticketManager.startTicket(ticketId, t, clockEvent);
    } else {
      await ticketManager.stopTicket(ticketId, clockEvent);
    }
  },
  
  'click #clockInBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    sessionManager.startSession(teamId);
  },
  
  async 'click #clockOutBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    
    // Get the current clock event to calculate total time BEFORE stopping
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    let totalWorkTime = 0;
    
    if (clockEvent) {
      const now = Date.now();
      totalWorkTime = Math.floor((now - clockEvent.startTimestamp) / 1000);
    }
    
    const success = await sessionManager.stopSession(teamId);
    if (success) {
      t.activeTicketId.set(null);
      
      // Show popup with total work time
      const timeFormatted = formatTime(totalWorkTime);
      document.getElementById('totalWorkTime').textContent = timeFormatted;
      document.getElementById('clockOutModal').showModal();
    }
  }
});
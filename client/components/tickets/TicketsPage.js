import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, calculateTotalTime } from '../../utils/TimeUtils.js';
import { extractUrlTitle } from '../../utils/UrlUtils.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

// Constants
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

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

  // Calculate accumulated time from form inputs
  calculateAccumulatedTime: (hours, minutes, seconds) => {
    return (hours * SECONDS_PER_HOUR) + (minutes * SECONDS_PER_MINUTE) + seconds;
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
  this.showCreateTicketForm = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);

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
        const runningTicket = Tickets.findOne({ teamId, startTimestamp: { $exists: true } });
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
  tickets() {
    const teamId = Template.instance().selectedTeamId.get();
    if (!teamId) return [];
    
    const activeTicketId = Template.instance().activeTicketId.get();
    const now = currentTime.get();
    
    return Tickets.find({ teamId }).fetch().map(ticket => {
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
  'click #showCreateTicketForm'(e, t) {
    t.showCreateTicketForm.set(true);
  },
  'click #cancelCreateTicket'(e, t) {
    t.showCreateTicketForm.set(false);
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
      title: e.target.title.value.trim(),
      github: e.target.github.value.trim(),
      hours: parseInt(e.target.hours.value) || 0,
      minutes: parseInt(e.target.minutes.value) || 0,
      seconds: parseInt(e.target.seconds.value) || 0
    };
    
    if (!formData.title) {
      alert('Ticket title is required.');
      return;
    }
    
    try {
      const accumulatedTime = utils.calculateAccumulatedTime(formData.hours, formData.minutes, formData.seconds);
      const ticketId = await utils.meteorCall('createTicket', { 
        teamId: formData.teamId, 
        title: formData.title, 
        github: formData.github, 
        accumulatedTime 
      });
      
      t.showCreateTicketForm.set(false);
      
      if (accumulatedTime > 0) {
        const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId: formData.teamId, endTime: null });
        await ticketManager.startTicket(ticketId, t, clockEvent);
      }
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
    const activeTicketId = t.activeTicketId.get();
    
    const success = await sessionManager.stopSession(teamId, activeTicketId);
    if (success) {
      t.activeTicketId.set(null);
    }
  }
});
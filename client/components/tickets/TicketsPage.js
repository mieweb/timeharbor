import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, calculateTotalTime, formatDurationText } from '../../utils/TimeUtils.js';
import { extractUrlTitle } from '../../utils/UrlUtils.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

const utils = {
  meteorCall: (methodName, ...args) =>
    new Promise((resolve, reject) => {
      Meteor.call(methodName, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),

  calculateAccumulatedTime: (hours = 0, minutes = 0, seconds = 0) =>
    (hours * SECONDS_PER_HOUR) + (minutes * SECONDS_PER_MINUTE) + seconds,

  now: () => Date.now(),

  handleError: (error, message = 'Operation failed') => {
    console.error(message, error);
    alert(`${message}: ${error.reason || error.message}`);
  }
};

const ticketManager = {
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

  switchTicket: async (newTicketId, templateInstance, clockEvent) => {
    const currentActiveId = templateInstance.activeTicketId.get();

    if (currentActiveId && currentActiveId !== newTicketId) {
      const success = await ticketManager.stopTicket(currentActiveId, clockEvent);
      if (!success) return false;
    }

    await ticketManager.startTicket(newTicketId, templateInstance, clockEvent);
    return true;
  }
};

const sessionManager = {
  startSession: async (teamId) => {
    try {
      await utils.meteorCall('clockEventStart', teamId);
    } catch (error) {
      utils.handleError(error, 'Failed to start session');
    }
  },

  stopSession: async (teamId, templateInstance) => {
    try {
      const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      const totalWorkTime = clockEvent ? Math.floor((utils.now() - clockEvent.startTimestamp) / 1000) : 0;

      const runningTickets = Tickets.find({
        teamId,
        createdBy: Meteor.userId(),
        startTimestamp: { $exists: true },
        endTime: { $exists: false }
      }).fetch();

      for (const ticket of runningTickets) {
        await ticketManager.stopTicket(ticket._id, clockEvent);
      }

      await utils.meteorCall('clockEventStop', teamId);
      templateInstance?.activeTicketId.set(null);

      return { success: true, totalWorkTime };
    } catch (error) {
      utils.handleError(error, 'Failed to stop session');
      return { success: false, totalWorkTime: 0 };
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
  this.searchQuery = new ReactiveVar(''); // Initialize search query

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

  this.getOzwellContext = () => {
    const teamId = this.selectedTeamId.get();
    const team = Teams.findOne(teamId);
    const activeTicketId = this.activeTicketId.get();
    const activeTicket = activeTicketId ? Tickets.findOne(activeTicketId) : null;

    const recentTickets = teamId
      ? Tickets.find({ teamId }, { sort: { updatedAt: -1 }, limit: 5 }).fetch()
      : [];

    const totalProjectTime = recentTickets.reduce((sum, ticket) => sum + (ticket.totalTime || 0), 0);
    const today = new Date();
    const totalTimeToday = recentTickets
      .filter(ticket => {
        const ticketDate = new Date(ticket.updatedAt || ticket.createdAt);
        return ticketDate.toDateString() === today.toDateString();
      })
      .reduce((sum, ticket) => sum + (ticket.totalTime || 0), 0);

    const recentActivitySummary = recentTickets.length > 0
      ? recentTickets
          .map(ticket => `• ${ticket.title} (${Math.round((ticket.totalTime || 0) / 60)}min)`)
          .join('\n')
      : 'No recent activity';

    return {
      teamId,
      teamName: team?.name || 'Unknown Project',
      user: {
        username: Meteor.user()?.username || 'Unknown User',
        email: Meteor.user()?.emails?.[0]?.address || ''
      },
      currentTicket: activeTicket
        ? {
            title: activeTicket.title,
            description: activeTicket.github || '',
            status: 'active',
            totalTime: activeTicket.totalTime || 0,
            formattedTime: `${Math.floor((activeTicket.totalTime || 0) / 3600)}h ${Math.floor(((activeTicket.totalTime || 0) % 3600) / 60)}m`
          }
        : null,
      projectStats: {
        totalTickets: recentTickets.length,
        totalProjectTime: Math.round(totalProjectTime / 60),
        totalTimeToday: Math.round(totalTimeToday / 60),
        formattedProjectTime: `${Math.floor(totalProjectTime / 3600)}h ${Math.floor((totalProjectTime % 3600) / 60)}m`,
        formattedTimeToday: `${Math.floor(totalTimeToday / 3600)}h ${Math.floor((totalTimeToday % 3600) / 60)}m`
      },
      recentActivitySummary,
      recentActivity: recentTickets.map(ticket => ({
        title: ticket.title,
        description: ticket.github || '',
        totalTime: ticket.totalTime || 0,
        lastUpdated: ticket.updatedAt || ticket.createdAt,
        formattedTime: `${Math.round((ticket.totalTime || 0) / 60)}min`
      }))
    };
  };

  this.autorun(() => {
    const teamIds = Teams.find({}).map(team => team._id);
    let teamId = this.selectedTeamId.get();

    if (!teamId && teamIds.length > 0) {
      this.selectedTeamId.set(teamIds[0]);
      teamId = this.selectedTeamId.get();
    }

    this.subscribe('teamTickets', teamIds);
    this.subscribe('clockEventsForUser');

    if (teamId) {
      const activeSession = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      if (activeSession) {
        const runningTicket = Tickets.findOne({
          teamId,
          createdBy: Meteor.userId(),
          startTimestamp: { $exists: true },
          endTime: { $exists: false }
        });
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
    const template = Template.instance();
    const teamId = template.selectedTeamId.get();
    if (!teamId) return [];

    const activeTicketId = template.activeTicketId.get();
    const now = currentTime.get();
    const searchQuery = (Template.instance().searchQuery?.get() || '').toLowerCase().trim();

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
    return !!(ticket && ticket.startTimestamp && !ticket.endTime);
  },
  formatTime,
  githubLink(github) {
    if (!github) return '';
    return github.startsWith('http') ? github : `https://github.com/${github}`;
  },
  isClockedInForTeam(teamId) {
    return !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
  },
  selectedTeamId() {
    return Template.instance().selectedTeamId.get();
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

    const now = currentTime.get();
    const elapsed = Math.floor((now - clockEvent.startTimestamp) / 1000);

    return formatTime(elapsed);
  },
  currentActiveTicketInfo() {
    const activeTicketId = Template.instance().activeTicketId.get();
    if (!activeTicketId) return null;

    const ticket = Tickets.findOne(activeTicketId);
    return ticket
      ? {
          id: ticket._id,
          title: ticket.title,
          isRunning: !!ticket.startTimestamp
        }
      : null;
  },
  getButtonClasses(ticketId) {
    const template = Template.instance();
    const activeTicketId = template.activeTicketId.get();
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = template.selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;

    if (isActive || activeTicketId === ticketId) return 'btn btn-outline btn-primary';
    if (hasActiveSession && (!activeTicketId || activeTicketId === ticketId)) return 'btn btn-outline btn-primary';
    if (hasActiveSession) return 'btn btn-disabled';
    return 'btn btn-disabled';
  },
  getButtonTooltip(ticketId) {
    const template = Template.instance();
    const activeTicketId = template.activeTicketId.get();
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = template.selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;

    if (isActive || activeTicketId === ticketId) return 'Click to stop this activity';
    if (hasActiveSession && (!activeTicketId || activeTicketId === ticketId)) return 'Click to start this activity';
    if (hasActiveSession) return 'Stop the current activity first';
    return 'Start a session first to begin activities';
  }
});

Template.tickets.events({
  'change #teamSelect'(event, templateInstance) {
    templateInstance.selectedTeamId.set(event.target.value);
    templateInstance.showCreateTicketForm.set(false);
    templateInstance.showEditTicketForm.set(false);
  },
  'input #searchTickets'(e, t) {
    t.searchQuery.set(e.target.value);
  },
  'click #showCreateTicketForm'(e, t) {
    t.showCreateTicketForm.set(true);
  },
  'click #cancelCreateTicket'(event, templateInstance) {
    templateInstance.showCreateTicketForm.set(false);
  },
  'click #cancelEditTicket'(event, templateInstance) {
    templateInstance.showEditTicketForm.set(false);
    templateInstance.editingTicket.set(null);
  },
  'blur [name="title"]'(event) {
    extractUrlTitle(event.target.value, event.target);
  },
  'paste [name="title"]'(event) {
    setTimeout(() => extractUrlTitle(event.target.value, event.target), 0);
  },
  'click .edit-ticket-btn'(event, templateInstance) {
    event.preventDefault();
    event.stopPropagation();
    const ticketId = event.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (ticket) {
      templateInstance.editingTicket.set(ticket);
      templateInstance.showEditTicketForm.set(true);
      templateInstance.showCreateTicketForm.set(false);
    }
  },
  async 'click .delete-ticket-btn'(event) {
    event.preventDefault();
    event.stopPropagation();
    const ticketId = event.currentTarget.dataset.id;
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
  async 'submit #editTicketForm'(event, templateInstance) {
    event.preventDefault();

    const formData = {
      ticketId: event.target.ticketId.value,
      title: event.target.title.value?.trim(),
      github: event.target.github.value?.trim()
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

      templateInstance.showEditTicketForm.set(false);
      templateInstance.editingTicket.set(null);
    } catch (error) {
      utils.handleError(error, 'Error updating ticket');
    }
  },
  async 'submit #createTicketForm'(event, templateInstance) {
    event.preventDefault();

    const hours = parseInt(event.target.hours?.value, 10) || 0;
    const minutes = parseInt(event.target.minutes?.value, 10) || 0;
    const seconds = parseInt(event.target.seconds?.value, 10) || 0;

    const formData = {
      teamId: templateInstance.selectedTeamId.get(),
      title: event.target.title.value.trim(),
      github: event.target.github.value.trim(),
      accumulatedTime: utils.calculateAccumulatedTime(hours, minutes, seconds)
    };

    if (!formData.title) {
      alert('Ticket title is required.');
      return;
    }

    try {
      const ticketId = await utils.meteorCall('createTicket', formData);

      templateInstance.showCreateTicketForm.set(false);
      event.target.reset();

      if (formData.accumulatedTime > 0) {
        const clockEvent = ClockEvents.findOne({
          userId: Meteor.userId(),
          teamId: formData.teamId,
          endTime: null
        });
        if (clockEvent) {
          await ticketManager.startTicket(ticketId, templateInstance, clockEvent);
        }
      }
    } catch (error) {
      utils.handleError(error, 'Error creating ticket');
    }
  },
  async 'click .activate-ticket'(event, templateInstance) {
    const ticketId = event.currentTarget.dataset.id;
    const teamId = templateInstance.selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    const ticket = Tickets.findOne(ticketId);
    const isActive = !!(ticket && ticket.startTimestamp && !ticket.endTime);

    if (!isActive) {
      if (!clockEvent) {
        alert('Please start a session before starting an activity.');
        return;
      }

      await ticketManager.switchTicket(ticketId, templateInstance, clockEvent);
    } else {
      const stopped = await ticketManager.stopTicket(ticketId, clockEvent);
      if (stopped) {
        templateInstance.activeTicketId.set(null);
      }
    }
  },
  'click #clockInBtn'(event, templateInstance) {
    const teamId = templateInstance.selectedTeamId.get();
    sessionManager.startSession(teamId);
  },
  async 'click #clockOutBtn'(event, templateInstance) {
    const teamId = templateInstance.selectedTeamId.get();
    const { success, totalWorkTime } = await sessionManager.stopSession(teamId, templateInstance);

    if (success) {
      const timeFormatted = formatTime(totalWorkTime);
      document.getElementById('totalWorkTime').textContent = timeFormatted;
      document.getElementById('clockOutModal').showModal();
    }
  }
});

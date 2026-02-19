import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime, selectedTeamId } from '../layout/MainLayout.js';
import { formatTime, formatDurationText } from '../../utils/TimeUtils.js';
import { sessionManager } from '../../utils/clockSession.js';
import { extractUrlTitle, openExternalUrl, normalizeReferenceUrl } from '../../utils/UrlUtils.js';
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

const HIGHLIGHT_DURATION_MS = 2000;

function processCreateTicketGithubInput(value, templateInstance) {
  const trimmed = (value || '').trim();
  const isEditing = templateInstance.editingTicket.get();
  
  if (!trimmed) {
    // When editing, keep title field visible even if GitHub is cleared
    if (!isEditing) {
      templateInstance.showTitleField.set(false);
      templateInstance.createTicketTitle.set('');
    }
    templateInstance.createTicketLoadingTitle.set(false);
    return;
  }
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  if (isUrl) {
    templateInstance.createTicketLoadingTitle.set(true);
    Meteor.call('extractUrlTitle', trimmed, (err, result) => {
      templateInstance.createTicketLoadingTitle.set(false);
      if (!err && result?.title) {
        templateInstance.createTicketTitle.set(result.title);
        templateInstance.showTitleField.set(true);
      }
    });
  } else {
    templateInstance.createTicketTitle.set(trimmed);
    templateInstance.showTitleField.set(true);
  }
}

Template.tickets.onCreated(function () {
  this.showCreateTicketForm = new ReactiveVar(false);
  this.showEditTicketForm = new ReactiveVar(false);
  this.editingTicket = new ReactiveVar(null);
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);
  this.autoClockOutTriggered = new ReactiveVar(false); // Track if auto-clock-out was triggered
  this.searchQuery = new ReactiveVar(''); // Initialize search query
  this.highlightExistingTickets = new ReactiveVar(false);
  this.createTicketTitle = new ReactiveVar('');
  this.showTitleField = new ReactiveVar(false);
  this.createTicketLoadingTitle = new ReactiveVar(false);
  this.ticketToDelete = new ReactiveVar(null);
  /** True when create modal was opened from clock-in → "New ticket" (auto-start ticket after create) */
  this.createTicketFromClockInNewTicket = new ReactiveVar(false);

  // Auto-clock-out: Check every second when timer reaches 10:00:00
  this.autorun(() => {
    const teamId = selectedTeamId.get();
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
    this.subscribe('teamTickets', teamIds);
    const teamId = selectedTeamId.get();
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

  // When navigated from layout clock-in success modal (New ticket / Existing ticket)
  this.autorun(() => {
    if (Session.get('openCreateTicketModal')) {
      Session.set('openCreateTicketModal', false);
      Tracker.afterFlush(() => {
        this.editingTicket.set(null);
        this.createTicketFromClockInNewTicket.set(true);
        this.showCreateTicketForm.set(true);
        const modal = document.getElementById('createTicketModal');
        if (modal) {
          modal.showModal();
          document.getElementById('createTicketForm')?.reset();
        }
      });
    }
    if (Session.get('highlightExistingTickets')) {
      Session.set('highlightExistingTickets', false);
      this.highlightExistingTickets.set(true);
      Tracker.afterFlush(() => {
        const el = document.getElementById('existingTicketsList');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      setTimeout(() => this.highlightExistingTickets.set(false), HIGHLIGHT_DURATION_MS);
    }
  });
});

Template.tickets.helpers({
  userTeams: getUserTeams,
  isSelectedTeam(teamId) {
    return selectedTeamId.get() === teamId ? 'selected' : '';
  },
  teamOptionAttrs(teamId) {
    const selected = selectedTeamId.get() === teamId;
    return { value: teamId, ...(selected ? { selected: true } : {}) };
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
  ticketToDelete() {
    return Template.instance().ticketToDelete.get();
  },
  highlightExistingTickets() {
    return Template.instance().highlightExistingTickets.get();
  },
  /** Class string for the play/start circle when "Existing ticket" highlight is active */
  activateTicketHighlightClass() {
    return Template.instance().highlightExistingTickets.get()
      ? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100 animate-pulse'
      : '';
  },
  createTicketTitle() {
    return Template.instance().createTicketTitle.get();
  },
  showTitleField() {
    return Template.instance().showTitleField.get();
  },
  createTicketLoadingTitle() {
    return Template.instance().createTicketLoadingTitle.get();
  },
  tickets() {
    const teamId = selectedTeamId.get();
    if (!teamId) return [];
    
    const now = currentTime.get();
    const searchQuery = (Template.instance().searchQuery?.get() || '').toLowerCase().trim();
    
    // Show only tickets created by the current user
    return Tickets.find({ teamId, createdBy: Meteor.userId() }).fetch()
      .filter(ticket => !searchQuery || ticket.title.toLowerCase().includes(searchQuery))
      .map(ticket => {
        const isActive = !!ticket.startTimestamp;
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
    return normalizeReferenceUrl(github) || '';
  },
  hasReferenceUrl(github) {
    if (!github || typeof github !== 'string') return false;
    return github.trim().length > 0;
  },
  ticketRowRefClass(github) {
    if (!github || typeof github !== 'string') return '';
    return github.trim().length > 0 ? 'cursor-pointer' : '';
  },
  isClockedIn() {
    return Template.instance().clockedIn.get();
  },
  selectedTeamId() {
    return selectedTeamId.get();
  },
  isClockedInForTeam(teamId) {
    return !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
  },
  isClockedInForCurrentTeam() {
    const teamId = selectedTeamId.get();
    return teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
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
    const teamId = selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) return 'btn btn-outline btn-primary';
    if (hasActiveSession) return 'btn btn-outline btn-primary';
    return 'btn btn-disabled';
  },
  getButtonTooltip(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) return 'Click to stop this activity';
    if (hasActiveSession) return 'Click to start this activity';
    return 'Start a session first to begin activities';
  },
  shortTicketId(ticketId) {
    if (!ticketId) return '';
    return ticketId.substring(0, 8);
  }
});

Template.tickets.events({
  'change #teamSelect'(e, t) {
    const teamId = e.target.value;
    if (teamId) {
      selectedTeamId.set(teamId);
      if (typeof localStorage !== 'undefined') localStorage.setItem('timeharbor-current-team-id', teamId);
    }
  },
  'input #searchTickets'(e, t) {
    t.searchQuery.set(e.target.value);
  },
  'click #showCreateTicketForm'(e, t) {
    t.editingTicket.set(null);
    t.createTicketFromClockInNewTicket.set(false);
    t.createTicketTitle.set('');
    t.showTitleField.set(false);
    t.createTicketLoadingTitle.set(false);
    t.showCreateTicketForm.set(true);
    Tracker.afterFlush(() => {
      const modal = document.getElementById('createTicketModal');
      if (modal) {
        const onClose = () => {
          t.showCreateTicketForm.set(false);
          t.editingTicket.set(null);
          t.createTicketTitle.set('');
          t.showTitleField.set(false);
          t.createTicketFromClockInNewTicket.set(false);
          modal.removeEventListener('close', onClose);
        };
        modal.addEventListener('close', onClose);
        modal.showModal();
        const form = document.getElementById('createTicketForm');
        if (form) form.reset();
      }
    });
  },
  'click #closeCreateTicketModal'(e, t) {
    document.getElementById('createTicketModal')?.close();
    t.showCreateTicketForm.set(false);
    t.editingTicket.set(null);
    t.createTicketTitle.set('');
    t.showTitleField.set(false);
    t.createTicketFromClockInNewTicket.set(false);
  },
  'click #createTicketModalBackdropClose'(e, t) {
    document.getElementById('createTicketModal')?.close();
    t.showCreateTicketForm.set(false);
    t.editingTicket.set(null);
    t.createTicketTitle.set('');
    t.showTitleField.set(false);
    t.createTicketFromClockInNewTicket.set(false);
  },
  'click #cancelCreateTicket'(e, t) {
    document.getElementById('createTicketModal')?.close();
    t.showCreateTicketForm.set(false);
    t.editingTicket.set(null);
    t.createTicketTitle.set('');
    t.showTitleField.set(false);
    t.createTicketFromClockInNewTicket.set(false);
  },
  'input #createTicketTitle'(e, t) {
    t.createTicketTitle.set(e.target.value);
  },
  'input #createTicketGithub'(e, t) {
    processCreateTicketGithubInput(e.target.value, t);
  },
  'paste #createTicketGithub'(e, t) {
    setTimeout(() => processCreateTicketGithubInput(t.find('#createTicketGithub')?.value || '', t), 0);
  },
  'click .ticket-row'(e, t) {
    if (e.target.closest('.activate-ticket') || e.target.closest('.dropdown')) return;
    const row = e.currentTarget;
    const url = row.getAttribute('data-github-url');
    if (url) openExternalUrl(url);
  },
  'click .edit-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (ticket) {
      t.editingTicket.set(ticket);
      t.showCreateTicketForm.set(true);
      // Pre-fill form with existing ticket data
      t.createTicketTitle.set(ticket.title || '');
      t.showTitleField.set(true);
      t.createTicketLoadingTitle.set(false);
      Tracker.afterFlush(() => {
        const modal = document.getElementById('createTicketModal');
        if (modal) {
          const onClose = () => {
            t.showCreateTicketForm.set(false);
            t.editingTicket.set(null);
            t.createTicketTitle.set('');
            t.showTitleField.set(false);
            t.createTicketLoadingTitle.set(false);
            modal.removeEventListener('close', onClose);
          };
          modal.addEventListener('close', onClose);
          modal.showModal();
          const form = document.getElementById('createTicketForm');
          if (form) {
            form.reset();
            const githubInput = form.querySelector('#createTicketGithub');
            const titleInput = form.querySelector('#createTicketTitle');
            if (githubInput && ticket.github) githubInput.value = ticket.github;
            if (titleInput && ticket.title) titleInput.value = ticket.title;
          }
        }
      });
    }
  },

  'click .delete-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (!ticket) return;

    t.ticketToDelete.set(ticket);
    Tracker.afterFlush(() => {
      const modal = document.getElementById('deleteTicketModal');
      if (modal) {
        modal.showModal();
      }
    });
  },
  'click #cancelDeleteTicket'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },
  'click #confirmDeleteTicket'(e, t) {
    const ticket = t.ticketToDelete.get();
    if (!ticket) return;

    const deleteTicket = async () => {
      try {
        await utils.meteorCall('deleteTicket', ticket._id);
        document.getElementById('deleteTicketModal')?.close();
        t.ticketToDelete.set(null);
      } catch (error) {
        utils.handleError(error, 'Error deleting ticket');
      }
    };

    deleteTicket();
  },
  'click #closeDeleteTicketModal'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },
  'click #deleteTicketModalBackdropClose'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },

  async 'submit #createTicketForm'(e, t) {
    e.preventDefault();
    const editingTicket = t.editingTicket.get();
    const github = (e.target.github?.value || '').trim();
    const titleInput = e.target.title;
    const title = titleInput ? titleInput.value.trim() : '';
    const titleFromState = t.createTicketTitle.get();
    const finalTitle = title || titleFromState;
    
    if (!finalTitle) {
      alert('Please paste a GitHub issue link to auto-fill the title, or enter a title.');
      return;
    }
    
    try {
      if (editingTicket) {
        // Update existing ticket
        await utils.meteorCall('updateTicket', editingTicket._id, {
          title: finalTitle,
          github
        });
      } else {
        // Create new ticket
        const teamId = selectedTeamId.get();
        const newTicketId = await utils.meteorCall('createTicket', {
          teamId,
          title: finalTitle,
          github,
          accumulatedTime: 0
        });
        const fromClockInNewTicket = t.createTicketFromClockInNewTicket.get();
        if (fromClockInNewTicket && newTicketId) {
          const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
          if (clockEvent) {
            await ticketManager.startTicket(newTicketId, t, clockEvent);
          }
        }
        t.createTicketFromClockInNewTicket.set(false);
      }
      document.getElementById('createTicketModal')?.close();
      t.showCreateTicketForm.set(false);
      t.editingTicket.set(null);
      t.createTicketTitle.set('');
      t.showTitleField.set(false);
      t.createTicketLoadingTitle.set(false);
      e.target.reset();
    } catch (error) {
      utils.handleError(error, editingTicket ? 'Error updating ticket' : 'Error creating ticket');
    }
  },
  
  async 'click .activate-ticket'(e, t) {
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
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
  
  });
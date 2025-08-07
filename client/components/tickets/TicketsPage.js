import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, calculateTotalTime } from '../../utils/TimeUtils.js';

import { isTeamsLoading, isClockEventsLoading } from '../layout/MainLayout.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

Template.tickets.onCreated(function () {
  this.showCreateTicketForm = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  // Restore last active ticket if it is still running
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);
  
  this.autorun(() => {
    // userTeams and clockEventsForUser subscriptions moved to MainLayout
    // If no team is selected, default to the first team
    const teamIds = Teams.find({}).map(t => t._id);

    let teamId = this.selectedTeamId.get();
    if (!teamId) {
      this.selectedTeamId.set(teamIds[0]);
      teamId = this.selectedTeamId.get();
    }

    this.subscribe('teamTickets', teamIds);

    if (teamId) {
      // Restore active ticket if any ticket for this team has a startTimestamp
      const runningTicket = Tickets.findOne({ teamId, startTimestamp: { $exists: true } });
      if (runningTicket) {
        this.activeTicketId.set(runningTicket._id);
      } else {
        this.activeTicketId.set(null);
      }
    }
  });
});

Template.tickets.onDestroyed(function() {
  // No cleanup needed anymore since we're using a global reactive timer
});

Template.tickets.helpers({
  userTeams: getUserTeams,
  isSelectedTeam(teamId) {
    // Return 'selected' if this team is the selected one
    return Template.instance().selectedTeamId && Template.instance().selectedTeamId.get() === teamId ? 'selected' : '';
  },
  showCreateTicketForm() {
    return Template.instance().showCreateTicketForm.get();
  },
  tickets() {
    const teamId = Template.instance().selectedTeamId.get();
    if (!teamId) return [];
    const activeTicketId = Template.instance().activeTicketId.get();
    const now = currentTime.get(); // Use reactive time source
    return Tickets.find({ teamId }).fetch().map(ticket => {
      // If this ticket is active and has a startTimestamp, show live time
      if (ticket._id === activeTicketId && ticket.startTimestamp) {
        const elapsed = Math.max(0, Math.floor((now - ticket.startTimestamp) / 1000));
        return {
          ...ticket,
          displayTime: (ticket.accumulatedTime || 0) + elapsed
        };
      } else {
        return {
          ...ticket,
          displayTime: ticket.accumulatedTime || 0
        };
      }
    });
  },
  isActive(ticketId) {
    return Template.instance().activeTicketId.get() === ticketId;
  },
  formatTime,  // Using imported utility
  githubLink(github) {
    if (!github) return '';
    if (github.startsWith('http')) return github;
    return `https://github.com/${github}`;
  },
  isClockedIn() {
    return Template.instance().clockedIn.get();
  },
  clockedIn() {
    return Template.instance().clockedIn.get();
  },
  selectedTeamId() {
    return Template.instance().selectedTeamId.get();
  },
  isClockedInForTeam(teamId) {
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    return !!clockEvent;
  },
  currentClockEventTime() {
    const teamId = Template.instance().selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    if (!clockEvent) return 0;
    return calculateTotalTime(clockEvent);  // Using imported utility
  },
  // Helper for button classes
  getButtonClasses(ticketId) {
    const isActive = Template.instance().activeTicketId.get() === ticketId;
    const teamId = Template.instance().selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) {
      return 'btn btn-outline btn-neutral';
    } else if (hasActiveSession) {
      return 'btn btn-outline btn-neutral';
    } else {
      return 'btn btn-disabled';
    }
  },
  // Helper for button tooltip
  getButtonTooltip(ticketId) {
    const isActive = Template.instance().activeTicketId.get() === ticketId;
    const teamId = Template.instance().selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) {
      return 'Click to stop this activity';
    } else if (hasActiveSession) {
      return 'Click to start this activity';
    } else {
      return 'Start a session first to begin activities';
    }
  },
});

// Rest of the events code remains unchanged
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
  'submit #createTicketForm'(e, t) {
    e.preventDefault();
    const teamId = t.selectedTeamId.get();
    const title = e.target.title.value.trim();
    const github = e.target.github.value.trim();
    const hours = parseInt(e.target.hours.value) || 0;
    const minutes = parseInt(e.target.minutes.value) || 0;
    const seconds = parseInt(e.target.seconds.value) || 0;
    const accumulatedTime = hours * 3600 + minutes * 60 + seconds;
    if (!title) {
      alert('Ticket title is required.');
      return;
    }
    Meteor.call('createTicket', { teamId, title, github, accumulatedTime }, (err, ticketId) => {
      if (!err) {
        t.showCreateTicketForm.set(false);
        // Auto-start the ticket if there's time specified
        if (accumulatedTime > 0) {
          const now = Date.now();
          // Start the new timer
          t.activeTicketId.set(ticketId);
          Meteor.call('updateTicketStart', ticketId, now, (err) => {
            if (err) {
              alert('Failed to start timer: ' + err.reason);
              return;
            }
            // If user is clocked in, add the ticket timing entry to the clock event
            const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
            if (clockEvent) {
              Meteor.call('clockEventAddTicket', clockEvent._id, ticketId, now, (err) => {
                if (err) {
                  alert('Failed to add ticket to clock event: ' + err.reason);
                }
              });
            }
          });
        }
      } else {
        alert('Error creating ticket: ' + err.reason);
      }
    });
  },
  'click .activate-ticket'(e, t) {
    const ticketId = e.currentTarget.dataset.id;
    const isActive = t.activeTicketId.get() === ticketId;
    const ticket = Tickets.findOne(ticketId);
    const teamId = t.selectedTeamId.get();

    // Check if user is clocked in for this team
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });

    if (!isActive) {
      // Check if session is active before allowing activity start
      if (!clockEvent) {
        alert('Please start a session before starting an activity.');
        return;
      }

      // Stop any currently active ticket first
      const currentActiveTicketId = t.activeTicketId.get();
      if (currentActiveTicketId) {
        const currentTicket = Tickets.findOne(currentActiveTicketId);
        if (currentTicket && currentTicket.startTimestamp) {
          const now = Date.now();
          // Stop the current ticket
          Meteor.call('updateTicketStop', currentActiveTicketId, now, (err) => {
            if (err) {
              alert('Failed to stop current timer: ' + err.reason);
              return;
            }
          });

          // Stop the current ticket in the clock event if needed
          if (clockEvent) {
            Meteor.call('clockEventStopTicket', clockEvent._id, currentActiveTicketId, now, (err) => {
              if (err) {
                alert('Failed to stop current ticket in clock event: ' + err.reason);
                return;
              }
            });
          }
        }
      }

      // Start the new timer
      t.activeTicketId.set(ticketId);
      const now = Date.now();
      Meteor.call('updateTicketStart', ticketId, now, (err, result) => {
        if (err) {
          alert('Failed to start timer: ' + err.reason);
          return;
        }
        // Check if server returned false (no active session)
        if (result === false) {
          alert('Please start a session before starting an activity.');
          t.activeTicketId.set(null);
          return;
        }
      });

      // If user is clocked in, add the new ticket timing entry to the clock event
      // Note: Initial accumulated time is now handled server-side in clockEventAddTicket
      if (clockEvent) {
        Meteor.call('clockEventAddTicket', clockEvent._id, ticketId, now, (err) => {
          if (err) {
            alert('Failed to add ticket to clock event: ' + err.reason);
          }
        });
      }
    } else {
      // Stop the timer: calculate elapsed, add to accumulatedTime, clear startTimestamp
      if (ticket && ticket.startTimestamp) {
        const now = Date.now();
        Meteor.call('updateTicketStop', ticketId, now, (err) => {
          if (err) {
            alert('Failed to stop timer: ' + err.reason);
          }
        });

        // If user is clocked in, stop the ticket timing in the clock event
        if (clockEvent) {
          Meteor.call('clockEventStopTicket', clockEvent._id, ticketId, now, (err) => {
            if (err) {
              alert('Failed to stop ticket in clock event: ' + err.reason);
            }
          });
        }
      }
      t.activeTicketId.set(null);
    }
  },
  'click #clockInOut'(e, t) {
    const ticketId = t.activeTicketId.get();
    const clockedIn = t.clockedIn.get();
    if (!ticketId) {
      alert('Select a ticket to clock in/out.');
      return;
    }
    if (!clockedIn) {
      Meteor.call('clockIn', ticketId, (err) => {
        if (!err) t.clockedIn.set(true);
      });
    } else {
      Meteor.call('clockOut', ticketId, (err) => {
        if (!err) t.clockedIn.set(false);
      });
    }
  },
  'click #clockInBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    Meteor.call('clockEventStart', teamId, (err, clockEventId) => {
      if (err) {
        alert('Failed to clock in: ' + err.reason);
      }
    });
  },
  'click #clockOutBtn'(e, t) {
    const teamId = t.selectedTeamId.get();
    Meteor.call('clockEventStop', teamId, (err) => {
      if (err) {
        alert('Failed to clock out: ' + err.reason);
      } else {
        // Clear active ticket when session stops
        t.activeTicketId.set(null);
      }
    });
  },
});
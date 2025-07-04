import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents } from '../collections.js';

import './main.html';

// Reactive variable to track the current template
const currentTemplate = new ReactiveVar('home');

// Reactive variable to track the current screen
const currentScreen = new ReactiveVar('authPage');

// Reactive variable to track current time for timers
const currentTime = new ReactiveVar(Date.now());
setInterval(() => currentTime.set(Date.now()), 1000);

Template.mainLayout.onCreated(function () {
  this.autorun(() => {
    if (Meteor.userId()) {
      currentScreen.set('mainLayout');
    } else {
      currentScreen.set('authPage'); // Redirect to auth screen if not logged in
    }
  });
});

Template.mainLayout.helpers({
  main() {
    return currentTemplate.get(); // Ensure it returns the current template
  },
});

Template.mainLayout.events({
  'click nav a'(event) {
    event.preventDefault();
    const target = event.currentTarget.getAttribute('href').substring(1);
    currentTemplate.set(target || 'home');
  },
});

Template.body.helpers({
  currentScreen() {
    return currentScreen.get();
  },
});

Template.authPage.events({
  'click #signup'(event) {
    event.preventDefault();

    // Switch to the signup form screen
    currentScreen.set('signupForm');
  },
  'click #login'(event) {
    event.preventDefault();

    // Switch to the login form screen
    currentScreen.set('loginForm');
  },
  'submit #signupForm'(event) {
    event.preventDefault();

    // Collect user input
    const username = event.target.username.value;
    const password = event.target.password.value;

    // Call server method to create a new user
    Meteor.call('createUserAccount', { username, password }, (err, result) => {
      if (err) {
        console.error('Error creating user:', err);
        alert('Failed to create user: ' + err.reason);
      } else {
        // Immediately log in as the new user
        Meteor.loginWithPassword(username, password, (loginErr) => {
          if (loginErr) {
            alert('Login failed: ' + loginErr.reason);
          } else {
            alert('User created and logged in successfully!');
            currentScreen.set('mainLayout');
          }
        });
      }
    });
  },
  'submit #loginForm'(event) {
    event.preventDefault();

    // Collect user input
    const username = event.target.username.value;
    const password = event.target.password.value;

    // Log in the user
    Meteor.loginWithPassword(username, password, (err) => {
      if (err) {
        console.error('Error logging in:', err);
        alert('Failed to log in: ' + err.reason);
      } else {
        alert('Logged in successfully!');
        currentScreen.set('mainLayout');
      }
    });
  },
});

Template.teams.onCreated(function () {
  this.showCreateTeam = new ReactiveVar(false);
  this.showJoinTeam = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);
  this.autorun(() => {
    this.subscribe('userTeams');
    const selectedId = this.selectedTeamId.get();
    if (selectedId) {
      this.subscribe('teamDetails', selectedId);
      const team = Teams.findOne(selectedId);
      if (team && team.members && team.members.length > 0) {
        Meteor.call('getUsers', team.members, (err, users) => {
          if (!err) {
            this.selectedTeamUsers.set(users);
          } else {
            this.selectedTeamUsers.set([]);
          }
        });
      } else {
        this.selectedTeamUsers.set([]);
      }
    } else {
      this.selectedTeamUsers.set([]);
    }
  });
});

Template.teams.helpers({
  showCreateTeam() {
    return Template.instance().showCreateTeam.get();
  },
  showJoinTeam() {
    return Template.instance().showJoinTeam.get();
  },
  userTeams() {
    console.log('My id:', Meteor.userId());
    const teams = Teams.find({ members: Meteor.userId() }).fetch();
    console.log('My teams:', teams);
    return teams;
  },
  selectedTeam() {
    const id = Template.instance().selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;
    return {
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: Template.instance().selectedTeamUsers.get(),
      admins: queriedTeam.admins,
      leader: queriedTeam.leader,
      createdAt: queriedTeam.createdAt,
    };
  },
});

Template.teams.events({
  'click #showCreateTeamForm'(e, t) {
    console.log('Create team clicked');
    t.showCreateTeam.set(true);
    t.showJoinTeam && t.showJoinTeam.set(false);
  },
  'click #showJoinTeamForm'(e, t) {
    console.log('Join team clicked');
    t.showJoinTeam.set(true);
    t.showCreateTeam && t.showCreateTeam.set(false);
  },
  'click #cancelCreateTeam'(e, t) {
    t.showCreateTeam.set(false);
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value;
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
      } else {
        alert('Error creating team: ' + err.reason);
      }
    });
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const teamCode = e.target.teamCode.value;
    Meteor.call('joinTeamWithCode', teamCode, (err) => {
      if (!err) {
        t.showJoinTeam.set(false);
      } else {
        alert('Error joining team: ' + err.reason);
      }
    });
  },
  'click .team-link'(e, t) {
    e.preventDefault();
    t.selectedTeamId.set(e.currentTarget.dataset.id);
  },
  'click #backToTeams'(e, t) {
    t.selectedTeamId.set(null);
    t.selectedTeamUsers.set([]); // Clear users when going back
  },
  'click #copyTeamCode'(e, t) {
    const teamId = Template.instance().selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          // Optional: Add some visual feedback
          const btn = e.currentTarget;
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy code to clipboard');
        });
    }
  },
});

Template.tickets.onCreated(function () {
  this.showCreateTicketForm = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  // Restore last active ticket if it is still running
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);
  this.autorun(() => {
    this.subscribe('userTeams');
    this.subscribe('clockEventsForUser');
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
  userTeams() {
    // Return the list of teams the user is in
    console.log('My id:', Meteor.userId());
    const teams = Teams.find({members: Meteor.userId()}).fetch();
    console.log('My teams:', teams);
    return teams;
  },
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
  formatTime(time) {
    if (typeof time !== 'number' || isNaN(time)) return '0:00:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = time % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },
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

    let total = clockEvent.accumulatedTime || 0;
    if (clockEvent.startTimestamp) {
      const now = currentTime.get();  // Use reactive time source
      total += Math.max(0, Math.floor((now - clockEvent.startTimestamp) / 1000));
    }
    return total;
  },
});

// Utility function to fetch title suggestion from backend
async function fetchTitleSuggestion(url) {
  try {
    const res = await fetch('/api/fetch-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    return data.suggestion;
  } catch (e) {
    return '';
  }
}

// Safe URL validation function
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

Template.tickets.events({
  'change #teamSelect'(e, t) {
    t.selectedTeamId.set(e.target.value);
  },
  'click #showCreateTicketForm'(e, t) {
    t.showCreateTicketForm.set(true);
    setTimeout(() => {
      const input = document.querySelector('input[name="github"]');
      const titleInput = document.querySelector('input[name="title"]');
      let lastSuggestedUrl = '';
      if (input && !input._hasPasteListener) {
        // Create or select the suggestion element for activity title
        let suggestionDiv = document.getElementById('activity-title-suggestion');
        if (!suggestionDiv) {
          suggestionDiv = document.createElement('div');
          suggestionDiv.id = 'activity-title-suggestion';
          suggestionDiv.style.marginTop = '4px';
          suggestionDiv.style.fontSize = '0.95em';
          suggestionDiv.style.color = '#4A5568';
          titleInput.parentNode.insertBefore(suggestionDiv, titleInput.nextSibling);
        }
        // Helper to fetch and show suggestion if valid URL
        async function handleUrlSuggestion(url) {
          if (isValidUrl(url) && url !== lastSuggestedUrl) {
            lastSuggestedUrl = url;
            suggestionDiv.textContent = 'Fetching activity title suggestion...';
            suggestionDiv.style.color = '#4A5568';
            const suggestion = await fetchTitleSuggestion(url);
            if (suggestion) {
              suggestionDiv.innerHTML = `Suggested Activity Title: <span style=\"color: #2563eb; cursor: pointer; text-decoration: underline;\">${suggestion}</span>`;
              const span = suggestionDiv.querySelector('span');
              span.onclick = () => {
                titleInput.value = suggestion;
              };
            } else {
              suggestionDiv.textContent = '';
            }
          } else if (!isValidUrl(url)) {
            suggestionDiv.textContent = '';
            lastSuggestedUrl = '';
          }
        }
        // Paste event
        input.addEventListener('paste', async function(event) {
          event.preventDefault();
          let pastedText = '';
          if (event.clipboardData && event.clipboardData.getData) {
            pastedText = event.clipboardData.getData('text');
          } else if (window.clipboardData && window.clipboardData.getData) {
            pastedText = window.clipboardData.getData('Text');
          }
          // Insert the pasted text manually
          const start = input.selectionStart;
          const end = input.selectionEnd;
          const value = input.value;
          input.value = value.slice(0, start) + pastedText + value.slice(end);
          input.setSelectionRange(start + pastedText.length, start + pastedText.length);
          await handleUrlSuggestion(pastedText);
        });
        // Blur event (when user leaves the input)
        input.addEventListener('blur', function() {
          handleUrlSuggestion(input.value.trim());
        });
        // Enter key event (when user presses Enter in the input)
        input.addEventListener('keydown', function(event) {
          if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
            handleUrlSuggestion(input.value.trim());
          }
        });
        input._hasPasteListener = true;
      }
    }, 0);
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
          debugger;
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
      debugger;
      Meteor.call('updateTicketStart', ticketId, now, (err) => {
        if (err) {
          alert('Failed to start timer: ' + err.reason);
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
      }
    });
  },
});

Template.home.onCreated(function () {
  this.autorun(() => {
    this.subscribe('userTeams');
    this.subscribe('clockEventsForUser');
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

Template.home.helpers({
  leaderTeams() {
    return Teams.find({ leader: Meteor.userId() }).fetch();
  },
  teamClockEvents(teamId) {
    return ClockEvents.find({ teamId }).fetch();
  },
  allClockEvents() {
    // Show all clock events for teams the user leads, flat list, most recent first
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    return ClockEvents.find({ teamId: { $in: teamIds } }, { sort: { startTimestamp: -1 } }).fetch();
  },
  teamName(teamId) {
    const team = Teams.findOne(teamId);
    return team && team.name ? team.name : teamId;
  },
  userName(userId) {
    const user = Meteor.users && Meteor.users.findOne(userId);
    return user && user.username ? user.username : userId;
  },
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  },
  ticketTitle(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket ? ticket.title : `Unknown Ticket (${ticketId})`;
  },
  clockEventTotalTime(clockEvent) {
    let total = clockEvent.accumulatedTime || 0;
    if (!clockEvent.endTime && clockEvent.startTimestamp) {
      const now = currentTime.get(); // Use reactive time source
      total += Math.max(0, Math.floor((now - clockEvent.startTimestamp) / 1000));
    }
    return total;
  },
  ticketTotalTime(ticket) {
    let total = ticket.accumulatedTime || 0;
    if (ticket.startTimestamp) {
      const now = currentTime.get(); // Use reactive time source
      total += Math.max(0, Math.floor((now - ticket.startTimestamp) / 1000));
    }
    return total;
  },
  formatTime(time) {
    const t = Number(time) || 0;
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },
});

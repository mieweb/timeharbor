import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams, Tickets, ClockEvents, CalendarConnections, CalendarEvents } from '../collections.js';

import './main.html';

// Reactive variable to track the current template
const currentTemplate = new ReactiveVar('home');

// Reactive variable to track the current screen
const currentScreen = new ReactiveVar('authPage');

// Reactive variable to track current time for timers
const currentTime = new ReactiveVar(Date.now());
setInterval(() => currentTime.set(Date.now()), 1000);

// Add a reactive variable for logout loading and message
const isLogoutLoading = new ReactiveVar(false);
const logoutMessage = new ReactiveVar('');

Template.mainLayout.onCreated(function () {
  this.autorun(() => {
    if (!Meteor.userId()) {
      if (typeof authState !== 'undefined') {
        authState.currentScreen.set('authPage');
      }
    } else {
      if (typeof authState !== 'undefined') {
        authState.currentScreen.set('mainLayout');
      }
    }
  });
});

Template.mainLayout.helpers({
  main() {
    return currentTemplate.get(); // Ensure it returns the current template
  },
  currentUser() {
    return Meteor.user();
  },
  isLogoutLoading() {
    return isLogoutLoading.get();
  },
  logoutMessage() {
    return logoutMessage.get();
  },
  logoutBtnAttrs() {
    return isLogoutLoading.get() ? { disabled: true } : {};
  }
});

Template.mainLayout.events({
  'click nav a'(event) {
    event.preventDefault();
    const target = event.currentTarget.getAttribute('href').substring(1);
    currentTemplate.set(target || 'home');
  },
  'click #logoutBtn'(event, instance) {
    event.preventDefault();
    if (isLogoutLoading.get()) return;
    if (confirm('Are you sure you want to log out?')) {
      isLogoutLoading.set(true);
      Meteor.logout((err) => {
        isLogoutLoading.set(false);
        if (err) {
          logoutMessage.set('Logout failed: ' + (err.reason || err.message));
        } else {
          logoutMessage.set('You have been logged out successfully.');
          // Redirect to login/auth page
          currentScreen.set('authPage');
          currentTemplate.set('home');
        }
        setTimeout(() => logoutMessage.set(''), 3000);
      });
    }
  }
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
  this.teamNameValidation = new ReactiveVar({ available: true, message: '' });
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
  // Helper to check if a team name already exists (for frontend validation)
  isTeamNameDuplicate() {
    const teamNameInput = document.querySelector('input[name="teamName"]');
    if (!teamNameInput) return false;
    
    const inputName = teamNameInput.value.trim().toLowerCase();
    if (!inputName) return false;
    
    const existingTeams = Teams.find({ members: Meteor.userId() }).fetch();
    return existingTeams.some(team => team.name.toLowerCase() === inputName);
  },
  // Helper for real-time validation feedback
  teamNameValidation() {
    return Template.instance().teamNameValidation.get();
  },
  disabledIfTeamNameUnavailable() {
    const validation = Template.instance().teamNameValidation.get();
    return validation && !validation.available ? 'disabled' : '';
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
    // Clear validation state when canceling
    t.teamNameValidation.set({ available: true, message: '' });
  },
  'input input[name="teamName"]'(e, t) {
    const teamName = e.target.value.trim();
    
    // Clear validation if input is empty
    if (!teamName) {
      t.teamNameValidation.set({ available: true, message: '' });
      return;
    }
    
    // Debounce the validation to avoid too many server calls
    clearTimeout(t.validationTimeout);
    t.validationTimeout = setTimeout(() => {
      Meteor.call('checkTeamNameAvailability', teamName, (err, result) => {
        if (!err) {
          t.teamNameValidation.set(result);
        }
      });
    }, 300); // Wait 300ms after user stops typing
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value.trim();
    
    // Basic validation
    if (!teamName) {
      alert('Project name is required.');
      return;
    }
    
    // Check validation state
    const validation = t.teamNameValidation.get();
    if (!validation.available) {
      alert(validation.message);
      return;
    }
    
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
        // Clear the form and validation state
        e.target.teamName.value = '';
        t.teamNameValidation.set({ available: true, message: '' });
      } else {
        // Handle specific error types
        if (err.error === 'duplicate-team-name') {
          alert('Project name is taken');
        } else {
          alert('Error creating project: ' + err.reason);
        }
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
    this.subscribe('pendingCalendarEvents'); // Add calendar events subscription
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
  pendingCalendarEvents() {
    return CalendarEvents.find({ 
      userId: Meteor.userId(), 
      status: 'pending' 
    }).fetch();
  },
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

// Calendar integration
Template.calendar.onCreated(function () {
  this.autorun(() => {
    this.subscribe('userTeams');
    this.subscribe('calendarConnections');
    this.subscribe('pendingCalendarEvents');
  });
  
  // Check for OAuth success/error messages in URL
  const urlParams = new URLSearchParams(window.location.search);
  const connected = urlParams.get('connected');
  const error = urlParams.get('error');
  
  if (connected) {
    alert(`${connected} Calendar connected successfully!`);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (error) {
    alert(`Calendar connection failed: ${error}`);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

Template.calendar.helpers({
  googleCalendarConnected() {
    const connection = CalendarConnections.findOne({ 
      userId: Meteor.userId(), 
      provider: 'google' 
    });
    return !!(connection && connection.accessToken);
  },
  microsoftCalendarConnected() {
    const connection = CalendarConnections.findOne({ 
      userId: Meteor.userId(), 
      provider: 'microsoft' 
    });
    return !!(connection && connection.accessToken);
  },
  googleLastSync() {
    const connection = CalendarConnections.findOne({ 
      userId: Meteor.userId(), 
      provider: 'google' 
    });
    return connection ? connection.lastSync : null;
  },
  microsoftLastSync() {
    const connection = CalendarConnections.findOne({ 
      userId: Meteor.userId(), 
      provider: 'microsoft' 
    });
    return connection ? connection.lastSync : null;
  },
  hasConnectedCalendars() {
    const connections = CalendarConnections.find({ 
      userId: Meteor.userId() 
    }).count();
    return connections > 0;
  },
  pendingEvents() {
    return CalendarEvents.find({ 
      userId: Meteor.userId(), 
      status: 'pending' 
    }, { sort: { startTime: 1 } }).fetch().map(event => {
      // Calculate suggested time
      const duration = event.endTime - event.startTime;
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      
      // Try to match project by event title
      const userTeams = Teams.find({ members: Meteor.userId() }).fetch();
      const suggestedTeam = userTeams.find(team => 
        event.title.toLowerCase().includes(team.name.toLowerCase())
      );
      
      return {
        ...event,
        suggestedHours: hours,
        suggestedMinutes: minutes,
        suggestedTeamId: suggestedTeam ? suggestedTeam._id : null,
        duration: duration
      };
    });
  },
  userTeams() {
    return Teams.find({ members: Meteor.userId() }).fetch();
  },
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  },
  formatDuration(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },
  eq(a, b) {
    return a === b;
  }
});

Template.calendar.events({
  'click #connectGoogleCalendar'(event, instance) {
    Meteor.call('calendar.initiateOAuth', 'google', (err, result) => {
      if (err) {
        alert('Failed to connect Google Calendar: ' + err.reason);
      } else {
        // Redirect to OAuth URL
        window.location.href = result.authUrl;
      }
    });
  },
  
  'click #connectMicrosoftCalendar'(event, instance) {
    Meteor.call('calendar.initiateOAuth', 'microsoft', (err, result) => {
      if (err) {
        alert('Failed to connect Microsoft Calendar: ' + err.reason);
      } else {
        // Redirect to OAuth URL
        window.location.href = result.authUrl;
      }
    });
  },
  
  'click #disconnectGoogleCalendar'(event, instance) {
    if (confirm('Are you sure you want to disconnect your Google Calendar?')) {
      Meteor.call('calendar.disconnect', 'google', (err) => {
        if (err) {
          alert('Failed to disconnect: ' + err.reason);
        } else {
          alert('Google Calendar disconnected successfully');
        }
      });
    }
  },
  
  'click #disconnectMicrosoftCalendar'(event, instance) {
    if (confirm('Are you sure you want to disconnect your Microsoft Calendar?')) {
      Meteor.call('calendar.disconnect', 'microsoft', (err) => {
        if (err) {
          alert('Failed to disconnect: ' + err.reason);
        } else {
          alert('Microsoft Calendar disconnected successfully');
        }
      });
    }
  },
  
  'click #refreshGoogleCalendar'(event, instance) {
    Meteor.call('calendar.refreshEvents', 'google', (err) => {
      if (err) {
        alert('Failed to refresh Google Calendar: ' + err.reason);
      } else {
        alert('Google Calendar refreshed successfully');
      }
    });
  },
  
  'click #refreshMicrosoftCalendar'(event, instance) {
    Meteor.call('calendar.refreshEvents', 'microsoft', (err) => {
      if (err) {
        alert('Failed to refresh Microsoft Calendar: ' + err.reason);
      } else {
        alert('Microsoft Calendar refreshed successfully');
      }
    });
  },
  
  'click #refreshCalendarEvents'(event, instance) {
    Meteor.call('calendar.refreshAllEvents', (err) => {
      if (err) {
        alert('Failed to refresh calendar events: ' + err.reason);
      } else {
        alert('Calendar events refreshed successfully');
      }
    });
  },
  
  'click .confirm-event'(event, instance) {
    const eventId = event.currentTarget.dataset.eventId;
    const eventCard = event.currentTarget.closest('.border');
    
    // Collect form data from the event card
    const hours = parseInt(eventCard.querySelector('[data-field="hours"]').value) || 0;
    const minutes = parseInt(eventCard.querySelector('[data-field="minutes"]').value) || 0;
    const teamId = eventCard.querySelector('[data-field="teamId"]').value;
    const activityTitle = eventCard.querySelector('[data-field="activityTitle"]').value;
    
    const timeData = {
      hours,
      minutes,
      teamId: teamId || null,
      activityTitle: activityTitle.trim()
    };
    
    if (!timeData.activityTitle) {
      alert('Please enter an activity title');
      return;
    }
    
    if (timeData.teamId && (timeData.hours > 0 || timeData.minutes > 0)) {
      Meteor.call('calendar.confirmEvent', eventId, timeData, (err) => {
        if (err) {
          alert('Failed to log calendar event: ' + err.reason);
        } else {
          alert('Calendar event logged successfully!');
        }
      });
    } else if (!timeData.teamId) {
      alert('Please select a project to log time against');
    } else {
      alert('Please enter time to log (hours and/or minutes)');
    }
  },
  
  'click .dismiss-event'(event, instance) {
    const eventId = event.currentTarget.dataset.eventId;
    Meteor.call('calendar.dismissEvent', eventId, (err) => {
      if (err) {
        alert('Failed to dismiss event: ' + err.reason);
      }
    });
  },
  
  'click .snooze-event'(event, instance) {
    const eventId = event.currentTarget.dataset.eventId;
    Meteor.call('calendar.snoozeEvent', eventId, (err) => {
      if (err) {
        alert('Failed to snooze event: ' + err.reason);
      }
    });
  },
  
  'click #dismissAllEvents'(event, instance) {
    if (confirm('Are you sure you want to dismiss all pending calendar events?')) {
      Meteor.call('calendar.dismissAllEvents', (err) => {
        if (err) {
          alert('Failed to dismiss events: ' + err.reason);
        } else {
          alert('All events dismissed');
        }
      });
    }
  }
});

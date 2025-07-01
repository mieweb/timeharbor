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
        const elapsed = Math.floor((now - ticket.startTimestamp) / 1000);
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
      total += Math.floor((now - clockEvent.startTimestamp) / 1000);
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
      total += Math.floor((now - clockEvent.startTimestamp) / 1000);
    }
    return total;
  },
  ticketTotalTime(ticket) {
    let total = ticket.accumulatedTime || 0;
    if (ticket.startTimestamp) {
      const now = currentTime.get(); // Use reactive time source
      total += Math.floor((now - ticket.startTimestamp) / 1000);
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

// Admin Review Template
Template.admin.onCreated(function () {
  this.selectedAdminTeamId = new ReactiveVar(null);
  this.titleFilter = new ReactiveVar('');
  this.statusFilter = new ReactiveVar('');
  this.creatorFilter = new ReactiveVar('');
  this.sortField = new ReactiveVar('createdAt');
  this.sortDirection = new ReactiveVar(-1); // -1 for desc, 1 for asc
  this.selectedTickets = new ReactiveVar([]);

  this.autorun(() => {
    this.subscribe('userTeams');
    const selectedTeamId = this.selectedAdminTeamId.get();
    if (selectedTeamId) {
      this.subscribe('adminTeamTickets', selectedTeamId);
      this.subscribe('teamMembers', [selectedTeamId]);
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
  
  adminTickets() {
    const teamId = Template.instance().selectedAdminTeamId.get();
    if (!teamId) return [];
    return Tickets.find({ teamId }).fetch();
  },
  
  filteredAndSortedTickets() {
    const instance = Template.instance();
    const teamId = instance.selectedAdminTeamId.get();
    if (!teamId) return [];
    
    let tickets = Tickets.find({ teamId }).fetch();
    
    // Apply filters
    const titleFilter = instance.titleFilter.get().toLowerCase();
    const statusFilter = instance.statusFilter.get();
    const creatorFilter = instance.creatorFilter.get();
    
    if (titleFilter) {
      tickets = tickets.filter(t => t.title.toLowerCase().includes(titleFilter));
    }
    
    if (statusFilter) {
      tickets = tickets.filter(t => (t.status || 'open') === statusFilter);
    }
    
    if (creatorFilter) {
      tickets = tickets.filter(t => t.createdBy === creatorFilter);
    }
    
    // Apply sorting
    const sortField = instance.sortField.get();
    const sortDirection = instance.sortDirection.get();
    
    tickets.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle special cases
      if (sortField === 'status') {
        aVal = aVal || 'open';
        bVal = bVal || 'open';
      }
      
      if (sortField === 'accumulatedTime') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      
      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });
    
    return tickets;
  },
  
  uniqueCreators() {
    const teamId = Template.instance().selectedAdminTeamId.get();
    if (!teamId) return [];
    
    const tickets = Tickets.find({ teamId }).fetch();
    const userIds = [...new Set(tickets.map(t => t.createdBy))];
    return Meteor.users.find({ _id: { $in: userIds } }).fetch();
  },
  
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  },
  
  formatTime(seconds) {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },
  
  statusBadgeClass(status) {
    const s = status || 'open';
    switch (s) {
      case 'open': return 'badge-primary';
      case 'reviewed': return 'badge-info';
      case 'closed': return 'badge-success';
      case 'deleted': return 'badge-error';
      default: return 'badge-ghost';
    }
  },
  
  capitalizeStatus(status) {
    const s = status || 'open';
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  
  creatorName(userId) {
    const user = Meteor.users.findOne(userId);
    return user ? user.username : 'Unknown';
  },
  
  reviewerName(userId) {
    const user = Meteor.users.findOne(userId);
    return user ? user.username : 'Unknown';
  },
  
  githubLink(github) {
    if (!github) return '';
    // If it's already a full URL, return as is
    if (github.startsWith('http://') || github.startsWith('https://')) {
      return github;
    }
    // Otherwise treat as relative link
    return github;
  }
});

Template.admin.events({
  'change #adminTeamSelect'(e, t) {
    const teamId = e.target.value;
    t.selectedAdminTeamId.set(teamId || null);
    // Reset filters when changing teams
    t.titleFilter.set('');
    t.statusFilter.set('');
    t.creatorFilter.set('');
    t.selectedTickets.set([]);
    // Reset form values
    t.$('#titleFilter').val('');
    t.$('#statusFilter').val('');
    t.$('#creatorFilter').val('');
  },
  
  'input #titleFilter'(e, t) {
    t.titleFilter.set(e.target.value);
  },
  
  'change #statusFilter'(e, t) {
    t.statusFilter.set(e.target.value);
  },
  
  'change #creatorFilter'(e, t) {
    t.creatorFilter.set(e.target.value);
  },
  
  'click .sortable'(e, t) {
    const sortField = e.currentTarget.dataset.sort;
    const currentField = t.sortField.get();
    const currentDirection = t.sortDirection.get();
    
    if (currentField === sortField) {
      // Toggle direction
      t.sortDirection.set(currentDirection * -1);
    } else {
      // New field, default to descending
      t.sortField.set(sortField);
      t.sortDirection.set(-1);
    }
    
    // Update visual indicators
    t.$('.sort-indicator').text('↕');
    const indicator = currentDirection === -1 ? '↓' : '↑';
    t.$(e.currentTarget).find('.sort-indicator').text(indicator);
  },
  
  'change .ticket-checkbox, change #headerSelectAll'(e, t) {
    const selectedTickets = [];
    t.$('.ticket-checkbox:checked').each(function() {
      selectedTickets.push($(this).data('ticket-id'));
    });
    t.selectedTickets.set(selectedTickets);
    
    // Update UI
    const count = selectedTickets.length;
    t.$('#selectedCount').text(`${count} items selected`);
    
    // Enable/disable batch buttons
    const hasSelection = count > 0;
    t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', !hasSelection);
    
    // Update select all checkbox state
    const totalVisible = t.$('.ticket-checkbox').length;
    t.$('#selectAll, #headerSelectAll').prop('checked', count === totalVisible && count > 0);
  },
  
  'click #selectAll'(e, t) {
    const checked = e.target.checked;
    t.$('.ticket-checkbox').prop('checked', checked);
    t.$('.ticket-checkbox').first().trigger('change');
  },
  
  'click #batchReviewed'(e, t) {
    const selectedTickets = t.selectedTickets.get();
    const teamId = t.selectedAdminTeamId.get();
    
    if (selectedTickets.length === 0 || !teamId) return;
    
    Meteor.call('batchUpdateTicketStatus', {
      ticketIds: selectedTickets,
      status: 'reviewed',
      teamId: teamId
    }, (error) => {
      if (error) {
        alert('Error updating tickets: ' + error.message);
      } else {
        t.selectedTickets.set([]);
        t.$('.ticket-checkbox').prop('checked', false);
        t.$('#selectedCount').text('0 items selected');
        t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
      }
    });
  },
  
  'click #batchClosed'(e, t) {
    const selectedTickets = t.selectedTickets.get();
    const teamId = t.selectedAdminTeamId.get();
    
    if (selectedTickets.length === 0 || !teamId) return;
    
    Meteor.call('batchUpdateTicketStatus', {
      ticketIds: selectedTickets,
      status: 'closed',
      teamId: teamId
    }, (error) => {
      if (error) {
        alert('Error updating tickets: ' + error.message);
      } else {
        t.selectedTickets.set([]);
        t.$('.ticket-checkbox').prop('checked', false);
        t.$('#selectedCount').text('0 items selected');
        t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
      }
    });
  },
  
  'click #batchDeleted'(e, t) {
    const selectedTickets = t.selectedTickets.get();
    const teamId = t.selectedAdminTeamId.get();
    
    if (selectedTickets.length === 0 || !teamId) return;
    
    if (!confirm(`Are you sure you want to mark ${selectedTickets.length} items as deleted?`)) {
      return;
    }
    
    Meteor.call('batchUpdateTicketStatus', {
      ticketIds: selectedTickets,
      status: 'deleted',
      teamId: teamId
    }, (error) => {
      if (error) {
        alert('Error updating tickets: ' + error.message);
      } else {
        t.selectedTickets.set([]);
        t.$('.ticket-checkbox').prop('checked', false);
        t.$('#selectedCount').text('0 items selected');
        t.$('#batchReviewed, #batchClosed, #batchDeleted').prop('disabled', true);
      }
    });
  }
});

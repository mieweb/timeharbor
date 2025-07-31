import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';
import { Tickets, Teams, Sessions, ClockEvents, CalendarConnections, CalendarEvents } from '../collections.js';

// Import webhook handlers
import './webhooks.js';

function generateTeamCode() {
  // Simple random code, can be improved for production
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

Meteor.startup(async () => {
  // Code to run on server startup
  if (await Tickets.find().countAsync() === 0) {
    await Tickets.insertAsync({ title: 'Sample Ticket', description: 'This is a sample ticket.', createdAt: new Date() });
  }

  if (await Teams.find().countAsync() === 0) {
    await Teams.insertAsync({ name: 'Sample Team', createdAt: new Date() });
  }

  if (await Sessions.find().countAsync() === 0) {
    await Sessions.insertAsync({ userId: 'sampleUser', startTime: new Date(), endTime: null });
  }

  // Add a code to any existing teams that do not have one
  const teamsWithoutCode = await Teams.find({ code: { $exists: false } }).fetchAsync();
  for (const team of teamsWithoutCode) {
    const code = generateTeamCode();
    await Teams.updateAsync(team._id, { $set: { code } });
  }
  
  // Create demo calendar connections for existing users (for demo purposes)
  if (await CalendarConnections.find().countAsync() === 0) {
    const users = await Meteor.users.find().fetchAsync();
    for (const user of users) {
      // Create a mock Google calendar connection
      await CalendarConnections.insertAsync({
        userId: user._id,
        provider: 'google',
        accessToken: 'mock-google-token',
        refreshToken: 'mock-google-refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        lastSync: new Date(),
        createdAt: new Date()
      });
    }
  }
  
  // Create a unique index on team name (case-insensitive)
  try {
    await Teams.rawCollection().createIndex(
      { name: 1 },
      { 
        unique: true,
        collation: { locale: 'en', strength: 2 } // Case-insensitive collation
      }
    );
    console.log('Created unique index on team name');
  } catch (error) {
    console.log('Team name index already exists or could not be created:', error.message);
  }
});

Meteor.publish('userTeams', function () {
  // Only publish teams the user is a member of
  return Teams.find({ members: this.userId });
});

Meteor.publish('teamDetails', function (teamId) {
  // Only publish team details if the user is a member
  return Teams.find({ _id: teamId, members: this.userId });
});

Meteor.publish('teamMembers', async function (teamIds) {
  check(teamIds, [String]);
  // Only allow if user is a member of all requested teams
  const teams = await Teams.find({ _id: { $in: teamIds }, members: this.userId }).fetchAsync();
  const userIds = Array.from(new Set(teams.flatMap(team => team.members)));
  return Meteor.users.find({ _id: { $in: userIds } }, { fields: { username: 1 } });
});

Meteor.publish('teamTickets', function (teamIds) {
  check(teamIds, [String]);
  // Only publish tickets for this team that were created by the current user
  return Tickets.find({ teamId: { $in: teamIds }, createdBy: this.userId });
});

Meteor.publish('clockEventsForUser', function () {
  if (!this.userId) return this.ready();
  // Only publish this user's own clock events
  return ClockEvents.find({ userId: this.userId });
});

Meteor.publish('clockEventsForTeams', async function (teamIds) {
  check(teamIds, [String]);
  // Only publish clock events for teams the user leads
  const leaderTeams = await Teams.find({ leader: this.userId, _id: { $in: teamIds } }).fetchAsync();
  const allowedTeamIds = leaderTeams.map(t => t._id);
  return ClockEvents.find({ teamId: { $in: allowedTeamIds } });
});

Meteor.publish('usersByIds', async function (userIds) {
  check(userIds, [String]);
  // Only publish users that are in teams the current user is a member or leader of
  const userTeams = await Teams.find({ $or: [{ members: this.userId }, { leader: this.userId }] }).fetchAsync();
  const allowedUserIds = Array.from(new Set(userTeams.flatMap(team => team.members.concat([team.leader]))));
  const filteredUserIds = userIds.filter(id => allowedUserIds.includes(id));
  return Meteor.users.find({ _id: { $in: filteredUserIds } }, { fields: { username: 1 } });
});

// Calendar integration publications
Meteor.publish('calendarConnections', function () {
  if (!this.userId) return this.ready();
  return CalendarConnections.find({ userId: this.userId });
});

Meteor.publish('pendingCalendarEvents', function () {
  if (!this.userId) return this.ready();
  return CalendarEvents.find({ 
    userId: this.userId, 
    status: { $in: ['pending', 'snoozed'] }
  });
});

Meteor.methods({
  async joinTeamWithCode(teamCode) {
    check(teamCode, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const team = await Teams.findOneAsync({ code: teamCode });
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }
    if (team.members.includes(this.userId)) {
      throw new Meteor.Error('already-member', 'You are already a member of this team');
    }
    // Prevent joining if the team is private or has restrictions (future-proofing)
    // if (team.isPrivate) throw new Meteor.Error('not-authorized', 'This team is private');
    await Teams.updateAsync(team._id, { $push: { members: this.userId } });
    return team._id;
  },
  'participants.create'(name) {
    check(name, String);
    // Logic to create a participant account
    console.log(`Creating participant with name: ${name}`);
    Accounts.createUser({ username: name });
  },
  async createTeam(teamName) {
    check(teamName, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    
    // Normalize the team name for comparison (trim whitespace and convert to lowercase)
    const normalizedTeamName = teamName.trim().toLowerCase();
    
    // Check if a team with the same name already exists (case-insensitive)
    const existingTeam = await Teams.findOneAsync({ 
      name: { $regex: new RegExp(`^${normalizedTeamName}$`, 'i') }
    });
    
    if (existingTeam) {
      throw new Meteor.Error('duplicate-team-name', 'Project name is taken');
    }
    
    const code = generateTeamCode();
    const teamId = await Teams.insertAsync({
      name: teamName.trim(), // Store the trimmed name
      members: [this.userId],
      admins: [this.userId],
      leader: this.userId,
      code,
      createdAt: new Date(),
    });
    return teamId;
  },
  
  async checkTeamNameAvailability(teamName) {
    check(teamName, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    
    const normalizedTeamName = teamName.trim().toLowerCase();
    if (!normalizedTeamName) {
      return { available: false, message: 'Project name is taken' };
    }
    
    const existingTeam = await Teams.findOneAsync({ 
      name: { $regex: new RegExp(`^${normalizedTeamName}$`, 'i') }
    });
    
    if (existingTeam) {
      return { available: false, message: 'Project name is taken' };
    }
    
    return { available: true, message: 'Project name is available' };
  },
  createUserAccount({ username, password }) {
    if (!username || !password) {
      throw new Meteor.Error('invalid-data', 'Username and password are required');
    }

    try {
      const userId = Accounts.createUser({ username, password });
      console.log('User created:', { userId, username }); // Log user creation details
      return userId;
    } catch (error) {
      console.error('Error in createUserAccount method:', error);
      throw new Meteor.Error('server-error', 'Failed to create user');
    }
  },
  async getUsers(userIds) {
    check(userIds, [String]);
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    return users.map(user => ({ id: user._id, username: user.username }));
  },
  async createTicket({ teamId, title, github, accumulatedTime }) {
    check(teamId, String);
    check(title, String);
    check(github, String);
    check(accumulatedTime, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    // Only allow creating a ticket if the user is a member of the team
    const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
    if (!team) throw new Meteor.Error('not-authorized', 'You are not a member of this team');
    
    // Create the ticket
    const ticketId = await Tickets.insertAsync({
      teamId,
      title,
      github,
      accumulatedTime,
      createdBy: this.userId,
      createdAt: new Date(),
    });

    // If there's an active clock event for this team, add the ticket to it
    const activeClockEvent = await ClockEvents.findOneAsync({ 
      userId: this.userId, 
      teamId, 
      endTime: null 
    });
    
    if (activeClockEvent) {
      const currentAccumulatedTime = activeClockEvent.accumulatedTime || 0;
      await ClockEvents.updateAsync(activeClockEvent._id, {
        $push: {
          tickets: {
            ticketId,
            startTimestamp: Date.now(),
            accumulatedTime // Include initial time in clock event
          }
        },
        $set: {
          accumulatedTime: currentAccumulatedTime + accumulatedTime // Add initial time to clock event total
        }
      });
    }

    return ticketId;
  },
  incrementTicketTime(ticketId, seconds) {
    check(ticketId, String);
    check(seconds, Number);
    Tickets.update(ticketId, { $inc: { timeSpent: seconds } });
  },
  updateTicketStart(ticketId, now) {
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    return Tickets.updateAsync(ticketId, { $set: { startTimestamp: now } });
  },
  updateTicketStop(ticketId, now) {
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    return Tickets.findOneAsync(ticketId).then(ticket => {
      if (ticket && ticket.startTimestamp) {
        const elapsed = Math.floor((now - ticket.startTimestamp) / 1000);
        const prev = ticket.accumulatedTime || 0;
        return Tickets.updateAsync(ticketId, {
          $set: { accumulatedTime: prev + elapsed },
          $unset: { startTimestamp: '' }
        });
      }
    });
  },
  async clockEventStart(teamId) {
    check(teamId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    // End any previous open clock event for this user/team
    await ClockEvents.updateAsync({ userId: this.userId, teamId, endTime: null }, { $set: { endTime: new Date() } }, { multi: true });
    // Start a new clock event
    const clockEventId = await ClockEvents.insertAsync({
      userId: this.userId,
      teamId,
      startTimestamp: Date.now(),
      accumulatedTime: 0,
      tickets: [], // Initialize empty tickets array
      endTime: null
    });
    return clockEventId;
  },
  async clockEventStop(teamId) {
    check(teamId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const clockEvent = await ClockEvents.findOneAsync({ userId: this.userId, teamId, endTime: null });
    if (clockEvent) {
      const now = Date.now();

      // Calculate and update accumulated time for the clock event
      if (clockEvent.startTimestamp) {
        const elapsed = Math.floor((now - clockEvent.startTimestamp) / 1000);
        const prev = clockEvent.accumulatedTime || 0;
        await ClockEvents.updateAsync(clockEvent._id, {
          $set: { accumulatedTime: prev + elapsed }
        });
      }

      // Stop all running tickets in this clock event
      if (clockEvent.tickets) {
        const updates = clockEvent.tickets
          .filter(t => t.startTimestamp)
          .map(async (ticket) => {
            const elapsed = Math.floor((now - ticket.startTimestamp) / 1000);
            const prev = ticket.accumulatedTime || 0;
            return ClockEvents.updateAsync(
              { _id: clockEvent._id, 'tickets.ticketId': ticket.ticketId },
              {
                $set: { 'tickets.$.accumulatedTime': prev + elapsed },
                $unset: { 'tickets.$.startTimestamp': '' }
              }
            );
          });
        await Promise.all(updates);
      }

      // Mark clock event as ended
      await ClockEvents.updateAsync(clockEvent._id, {
        $set: { endTime: new Date() },
      });
    }
  },
  async clockEventAddTicket(clockEventId, ticketId, now) {
    check(clockEventId, String);
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    // Check if ticket entry already exists in the clock event
    const clockEvent = await ClockEvents.findOneAsync(clockEventId);
    if (!clockEvent) return;
    const existing = (clockEvent.tickets || []).find(t => t.ticketId === ticketId);
    if (existing) {
      // If already exists and is stopped, start it again by setting startTimestamp
      await ClockEvents.updateAsync(
        { _id: clockEventId, 'tickets.ticketId': ticketId },
        { $set: { 'tickets.$.startTimestamp': now } }
      );
    } else {
      // Get the ticket's initial accumulated time
      const ticket = await Tickets.findOneAsync(ticketId);
      const initialTime = ticket ? (ticket.accumulatedTime || 0) : 0;
      
      // Add new ticket entry with initial accumulated time
      const clockEventData = await ClockEvents.findOneAsync(clockEventId);
      const currentAccumulatedTime = clockEventData.accumulatedTime || 0;
      
      await ClockEvents.updateAsync(clockEventId, {
        $push: {
          tickets: {
            ticketId,
            startTimestamp: now,
            accumulatedTime: initialTime // Include initial time from ticket
          }
        },
        $set: {
          accumulatedTime: currentAccumulatedTime + initialTime // Add initial time to clock event total
        }
      });
    }
  },
  async clockEventStopTicket(clockEventId, ticketId, now) {
    check(clockEventId, String);
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const clockEvent = await ClockEvents.findOneAsync(clockEventId);
    if (!clockEvent || !clockEvent.tickets) return;
    const ticketEntry = clockEvent.tickets.find(t => t.ticketId === ticketId && t.startTimestamp);
    if (ticketEntry) {
      const elapsed = Math.floor((now - ticketEntry.startTimestamp) / 1000);
      const prev = ticketEntry.accumulatedTime || 0;
      // Update the ticket entry in the tickets array
      await ClockEvents.updateAsync(
        { _id: clockEventId, 'tickets.ticketId': ticketId },
        {
          $set: {
            'tickets.$.accumulatedTime': prev + elapsed
          },
          $unset: {
            'tickets.$.startTimestamp': ''
          }
        }
      );
    }
  },
  
  // Calendar integration methods
  async 'calendar.initiateOAuth'(provider) {
    check(provider, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Generate OAuth URL based on provider
    const baseUrl = Meteor.absoluteUrl();
    const redirectUri = `${baseUrl}auth/${provider}/callback`;
    
    if (provider === 'google') {
      const clientId = Meteor.settings?.google?.clientId || process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Meteor.Error('config-error', 'Google Calendar integration not configured');
      }
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')}&` +
        `access_type=offline&` +
        `state=${this.userId}`;
      
      return { authUrl };
    } else if (provider === 'microsoft') {
      const clientId = Meteor.settings?.microsoft?.clientId || process.env.MICROSOFT_CLIENT_ID;
      if (!clientId) {
        throw new Meteor.Error('config-error', 'Microsoft Calendar integration not configured');
      }
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://graph.microsoft.com/calendars.read')}&` +
        `state=${this.userId}`;
      
      return { authUrl };
    } else {
      throw new Meteor.Error('invalid-provider', 'Unsupported calendar provider');
    }
  },
  
  async 'calendar.disconnect'(provider) {
    check(provider, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Remove the calendar connection
    await CalendarConnections.removeAsync({ userId: this.userId, provider });
    
    // Remove pending events from this provider
    await CalendarEvents.removeAsync({ userId: this.userId, source: provider });
  },
  
  async 'calendar.refreshEvents'(provider) {
    check(provider, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    const connection = await CalendarConnections.findOneAsync({ 
      userId: this.userId, 
      provider 
    });
    
    if (!connection || !connection.accessToken) {
      throw new Meteor.Error('not-connected', `${provider} calendar not connected`);
    }
    
    // This would implement the actual API calls to fetch events
    // For now, we'll create mock events for demonstration
    const mockEvents = [
      {
        calendarEventId: `mock-${provider}-1`,
        title: 'Team Meeting',
        startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 hours from now
        source: provider,
        userId: this.userId,
        status: 'pending',
        createdAt: new Date()
      },
      {
        calendarEventId: `mock-${provider}-2`,
        title: 'Project Review',
        startTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        endTime: new Date(Date.now() - 1000 * 60 * 60 * 23), // Yesterday + 1 hour
        source: provider,
        userId: this.userId,
        status: 'pending',
        createdAt: new Date()
      }
    ];
    
    // Insert mock events that don't already exist
    for (const event of mockEvents) {
      const existing = await CalendarEvents.findOneAsync({
        userId: this.userId,
        calendarEventId: event.calendarEventId
      });
      
      if (!existing) {
        await CalendarEvents.insertAsync(event);
      }
    }
    
    // Update last sync time
    await CalendarConnections.updateAsync(
      { userId: this.userId, provider },
      { $set: { lastSync: new Date() } }
    );
  },
  
  async 'calendar.refreshAllEvents'() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    const connections = await CalendarConnections.find({ userId: this.userId }).fetchAsync();
    
    for (const connection of connections) {
      try {
        await Meteor.call('calendar.refreshEvents', connection.provider);
      } catch (error) {
        console.error(`Failed to refresh ${connection.provider} events:`, error);
      }
    }
  },
  
  async 'calendar.confirmEvent'(eventId, timeData) {
    check(eventId, String);
    check(timeData, {
      hours: Number,
      minutes: Number,
      teamId: Match.Maybe(String),
      activityTitle: String
    });
    
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    const event = await CalendarEvents.findOneAsync({
      _id: eventId,
      userId: this.userId
    });
    
    if (!event) {
      throw new Meteor.Error('not-found', 'Calendar event not found');
    }
    
    if (!timeData.teamId) {
      throw new Meteor.Error('invalid-data', 'Team ID is required');
    }
    
    // Verify user is member of the team
    const team = await Teams.findOneAsync({ 
      _id: timeData.teamId, 
      members: this.userId 
    });
    
    if (!team) {
      throw new Meteor.Error('not-authorized', 'You are not a member of this team');
    }
    
    // Create a ticket/activity for this calendar event
    const accumulatedTime = (timeData.hours * 3600) + (timeData.minutes * 60);
    
    const ticketId = await Tickets.insertAsync({
      teamId: timeData.teamId,
      title: timeData.activityTitle,
      github: `Calendar event: ${event.title}`,
      accumulatedTime,
      createdBy: this.userId,
      createdAt: new Date(),
      calendarEventId: event._id // Link to calendar event
    });
    
    // Mark the calendar event as confirmed
    await CalendarEvents.updateAsync(eventId, {
      $set: { 
        status: 'confirmed', 
        confirmedAt: new Date(),
        ticketId: ticketId
      }
    });
    
    return ticketId;
  },
  
  async 'calendar.dismissEvent'(eventId) {
    check(eventId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    await CalendarEvents.updateAsync(
      { _id: eventId, userId: this.userId },
      { $set: { status: 'dismissed', dismissedAt: new Date() } }
    );
  },
  
  async 'calendar.snoozeEvent'(eventId) {
    check(eventId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Snooze for 24 hours
    const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await CalendarEvents.updateAsync(
      { _id: eventId, userId: this.userId },
      { $set: { status: 'snoozed', snoozeUntil } }
    );
  },
  
  async 'calendar.dismissAllEvents'() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    await CalendarEvents.updateAsync(
      { userId: this.userId, status: 'pending' },
      { $set: { status: 'dismissed', dismissedAt: new Date() } },
      { multi: true }
    );
  }
});

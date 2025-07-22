import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { check } from 'meteor/check';
import { Tickets, Teams, Sessions, ClockEvents } from '../collections.js';
import { AuthMethods } from './auth.js';

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
  
  // Log existing users for debugging
  const users = await Meteor.users.find().fetchAsync();
  console.log('Existing users in database:', users.map(u => ({ id: u._id, username: u.username })));

  ServiceConfiguration.configurations.upsert(
    { service: 'google' },
    {
      $set: {
        clientId: '<YOUR_GOOGLE_CLIENT_ID>',
        secret: '<YOUR_GOOGLE_CLIENT_SECRET>',
        loginStyle: 'popup',
      },
    }
  );
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
  // Authentication methods
  async checkUsernameAvailability(username) {
    return await AuthMethods.checkUsernameAvailability(username);
  },
  
  async createUserAccount({ username, password, confirmPassword }) {
    return await AuthMethods.createUserAccount({ username, password, confirmPassword });
  },
  
  // Login is now handled client-side with Meteor.loginWithPassword
  
  async requestPasswordReset(email) {
    return await AuthMethods.requestPasswordReset(email);
  },
  
  // Test method for debugging
  async testCreateUser() {
    try {
      const userId = Accounts.createUser({
        username: 'testuser',
        password: 'testpass123'
      });
      console.log('Test user created:', userId);
      return { success: true, userId };
    } catch (error) {
      console.error('Test user creation failed:', error);
      return { success: false, error: error.reason };
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
});

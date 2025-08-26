import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { Tickets, Teams, Sessions, ClockEvents } from '../collections.js';
// Import authentication methods
import { authMethods } from './methods/auth.js';
// Import team methods
import { teamMethods } from './methods/teams.js';
// Import ticket and clock event methods
import { ticketMethods } from './methods/tickets.js';
import { clockEventMethods } from './methods/clockEvents.js';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

Meteor.startup(async () => {
  // Configure Google OAuth from environment variables
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (googleClientId && googleClientSecret) {
    await ServiceConfiguration.configurations.upsertAsync(
      { service: 'google' },
      {
        $set: {
          clientId: googleClientId,
          secret: googleClientSecret,
          loginStyle: 'popup'
        }
      }
    );
    console.log('Google OAuth configured successfully from environment variables');
  } else {
    console.error('Google OAuth environment variables not found. Please check your .env file.');
    console.error('Required: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  // Configure additional find user for Google OAuth
  Accounts.setAdditionalFindUserOnExternalLogin(
    ({ serviceName, serviceData }) => {
      if (serviceName === "google") {
        // Note: Consider security implications. If someone other than the owner
        // gains access to the account on the third-party service they could use
        // the e-mail set there to access the account on your app.
        // Most often this is not an issue, but as a developer you should be aware
        // of how bad actors could play.
        return Accounts.findUserByEmail(serviceData.email);
      }
    }
  );

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
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    await Teams.updateAsync(team._id, { $set: { code } });
  }
});

Meteor.publish('userTeams', function () {
  // Publish teams where the user is a member, leader, or admin
  if (!this.userId) return this.ready();
  return Teams.find({
    $or: [
      { members: this.userId },
      { leader: this.userId },
      { admins: this.userId },
    ],
  });
});

Meteor.publish('teamDetails', function (teamId) {
  // Only publish team details if the user is a member
  return Teams.find({ _id: teamId, members: this.userId });
});

Meteor.publish('teamMembers', async function (teamIds) {
  // Filter out null/undefined values before validation
  const validTeamIds = teamIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validTeamIds, [String]);
  
  if (!this.userId) return this.ready();

  // Allow if user is a member, leader, or admin of the requested teams
  const teams = await Teams.find({
    _id: { $in: validTeamIds },
    $or: [
      { members: this.userId },
      { leader: this.userId },
      { admins: this.userId },
    ],
  }).fetchAsync();
  const userIds = Array.from(new Set(teams.flatMap(team => team.members || [])));
  return Meteor.users.find({ _id: { $in: userIds } }, { fields: { username: 1 } });
});

Meteor.publish('teamTickets', function (teamIds) {
  // Filter out null/undefined values before validation
  const validTeamIds = teamIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validTeamIds, [String]);
  
  // Only publish tickets for this team that were created by the current user
  return Tickets.find({ teamId: { $in: validTeamIds }, createdBy: this.userId });
});

Meteor.publish('clockEventsForUser', function () {
  if (!this.userId) return this.ready();
  // Only publish this user's own clock events
  return ClockEvents.find({ userId: this.userId });
});

Meteor.publish('clockEventsForTeams', async function (teamIds) {
  // Filter out null/undefined values before validation
  const validTeamIds = teamIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validTeamIds, [String]);
  
  if (!this.userId) return this.ready();

  // Publish clock events for teams the user leads OR admins
  const allowedTeams = await Teams.find({
    _id: { $in: validTeamIds },
    $or: [
      { leader: this.userId },
      { admins: this.userId },
    ],
  }).fetchAsync();
  const allowedTeamIds = allowedTeams.map(t => t._id);
  return ClockEvents.find({ teamId: { $in: allowedTeamIds } });
});

// Publish all tickets for a team for admin review (only for team leaders/admins)
Meteor.publish('adminTeamTickets', async function (teamId) {
  check(teamId, String);
  if (!this.userId) return this.ready();

  // Check if user is admin/leader of the team
  const team = await Teams.findOneAsync({ 
    _id: teamId, 
    $or: [
      { leader: this.userId },
      { admins: this.userId }
    ]
  });

  if (!team) return this.ready();

  // Return all tickets for this team (not just user's own tickets)
  return Tickets.find({ teamId });
});

Meteor.publish('usersByIds', async function (userIds) {
  // Filter out null/undefined values before validation
  const validUserIds = userIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validUserIds, [String]);
  
  // Only publish users that are in teams the current user is a member or leader of
  const userTeams = await Teams.find({ $or: [{ members: this.userId }, { leader: this.userId }] }).fetchAsync();
  
  // Filter out null/undefined values and flatten the arrays safely
  const allowedUserIds = Array.from(new Set(
    userTeams.flatMap(team => {
      const members = team.members || [];
      const leader = team.leader || null;
      return [...members, leader].filter(id => id !== null && id !== undefined);
    })
  ));
  
  const filteredUserIds = validUserIds.filter(id => allowedUserIds.includes(id));
  return Meteor.users.find({ _id: { $in: filteredUserIds } }, { fields: { username: 1 } });
});

Meteor.methods({
  ...authMethods,
  ...teamMethods,
  ...ticketMethods,
  ...clockEventMethods,

  'participants.create'(name) {
    check(name, String);
    // Logic to create a participant account
    console.log(`Creating participant with name: ${name}`);
    Accounts.createUser({ username: name });
  },
});

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
dotenv.config({ path: '.env' });

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

  // Configure GitHub OAuth from environment variables
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  if (githubClientId && githubClientSecret) {
    await ServiceConfiguration.configurations.upsertAsync(
      { service: 'github' },
      {
        $set: {
          clientId: githubClientId,
          secret: githubClientSecret,
          loginStyle: 'popup'
        }
      }
    );
    console.log('GitHub OAuth configured successfully');
  } else {
    console.error('GitHub OAuth environment variables not found. Please check your .env file.');
    console.error('Required: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  }

  // Configure additional find user for OAuth providers
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
      
      if (serviceName === "github") {
        // For GitHub, we can use the email from the service data
        // GitHub provides email in serviceData.email
        return Accounts.findUserByEmail(serviceData.email);
      }
    }
  );

  // Configure Meteor to use email-based accounts
  Accounts.config({
    forbidClientAccountCreation: false, // Allow client-side account creation
    sendVerificationEmail: false, // Don't require email verification for now
    loginExpirationInDays: 90 // Session expires after 90 days
  });

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
  // Only publish teams the user is a member of
  return Teams.find({ members: this.userId });
});

Meteor.publish('teamDetails', function (teamId) {
  // Only publish team details if the user is a member
  return Teams.find({ _id: teamId, members: this.userId });
});

Meteor.publish('teamMembers', async function (teamIds) {
  // Filter out null/undefined values before validation
  const validTeamIds = teamIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validTeamIds, [String]);
  
  // Only allow if user is a member of all requested teams
  const teams = await Teams.find({ _id: { $in: validTeamIds }, members: this.userId }).fetchAsync();
  const userIds = Array.from(new Set(teams.flatMap(team => team.members || [])));
  return Meteor.users.find({ _id: { $in: userIds } }, { fields: { 'emails.address': 1 } });
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
  
  // Only publish clock events for teams the user leads
  const leaderTeams = await Teams.find({ leader: this.userId, _id: { $in: validTeamIds } }).fetchAsync();
  const allowedTeamIds = leaderTeams.map(t => t._id);
  return ClockEvents.find({ teamId: { $in: allowedTeamIds } });
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
  return Meteor.users.find({ _id: { $in: filteredUserIds } }, { fields: { 'emails.address': 1 } });
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
    Accounts.createUser({ email: name });
  },
});

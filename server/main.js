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
// Import calendar methods
import './methods/calendar.js';
// Import notification methods
import { notificationMethods } from './methods/notifications.js';
// Import clock event helpers for auto-clock-out
import { stopTicketInClockEvent, formatDurationText } from './utils/ClockEventHelpers.js';
import { notifyTeamAdmins, notifyUser } from './utils/pushNotifications.js';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config(); // uses .env at project root by default

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
  const githubClientId = process.env.HUB_CLIENT_ID||'Ov23liEIIlKFKAfoBN0Z';
  const githubClientSecret = process.env.HUB_CLIENT_SECRET||'4fc1d608ccef2aab1a25a0714eaaf4ed3cfb703b';
  // Configure GitHub OAuth from environment variables
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

  // Auto-clock-out: Server-side backup check (runs every minute as backup to client-side check)
  const TEN_HOURS_MS = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
  const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute (backup check)

  Meteor.setInterval(async () => {
    try {
      const now = Date.now();
      // Find all active clock events (still running)
      const activeEvents = await ClockEvents.find({
        endTime: null // Still running
      }).fetchAsync();

      if (activeEvents.length > 0) {
        const longRunningEvents = [];
        
        // Check each active event to see if it has been running for 10+ hours continuously
        for (const clockEvent of activeEvents) {
          const sessionDuration = now - clockEvent.startTimestamp;
          if (sessionDuration >= TEN_HOURS_MS) {
            longRunningEvents.push(clockEvent);
          }
        }

        if (longRunningEvents.length > 0) {
          console.log(`Auto-clock-out: Found ${longRunningEvents.length} clock event(s) running for 10+ hours`);

          for (const clockEvent of longRunningEvents) {
            try {
              // Calculate total accumulated time
              const elapsed = Math.floor((now - clockEvent.startTimestamp) / 1000);
              const prev = clockEvent.accumulatedTime || 0;
              const totalSeconds = prev + elapsed;

              // Format duration text (using utility function)
              const durationText = formatDurationText(totalSeconds);

              // Stop all running tickets in this clock event
              if (clockEvent.tickets) {
                const updates = clockEvent.tickets
                  .filter(t => t.startTimestamp)
                  .map(ticket =>
                    stopTicketInClockEvent(clockEvent._id, ticket.ticketId, now, ClockEvents)
                  );
                await Promise.all(updates);
              }

              // Mark clock event as ended
              await ClockEvents.updateAsync(clockEvent._id, {
                $set: {
                  endTime: new Date(),
                  accumulatedTime: totalSeconds
                }
              });

              // Get user and team info for logging/notification
              const user = await Meteor.users.findOneAsync(clockEvent.userId);
              const userName = user?.services?.google?.name || 
                               user?.services?.github?.username || 
                               user?.profile?.name || 
                               user?.username || 
                               user?.emails?.[0]?.address?.split('@')[0] || 
                               'A user';
              
              const team = await Teams.findOneAsync(clockEvent.teamId);
              const teamName = team?.name || 'a team';

              console.log(`Auto-clock-out: Clocked out ${userName} from ${teamName} after ${durationText} (10+ hours continuous session)`);

              // Send notification to the user who was auto-clock-out
              try {
                await notifyUser(clockEvent.userId, {
                  title: 'Time Harbor - Auto Clock Out',
                  body: `You were automatically clocked out as your timer reached 10 hours straight. Total time: ${durationText}`,
                  icon: '/timeharbor-icon.svg',
                  badge: '/timeharbor-icon.svg',
                  tag: `auto-clockout-user-${clockEvent.userId}-${Date.now()}`,
                  data: {
                    type: 'auto-clock-out',
                    userId: clockEvent.userId,
                    userName: userName,
                    teamName: teamName,
                    teamId: clockEvent.teamId,
                    clockEventId: clockEvent._id,
                    duration: durationText,
                    autoClockOut: true,
                    url: '/tickets'
                  }
                });
              } catch (error) {
                console.error('Failed to send auto-clock-out notification to user:', error);
              }

              // Send notification to team admins
              try {
                await notifyTeamAdmins(clockEvent.teamId, {
                  title: 'Time Harbor - Auto Clock Out',
                  body: `${userName} was automatically clocked out of ${teamName} after ${durationText} (10+ hours limit)`,
                  icon: '/timeharbor-icon.svg',
                  badge: '/timeharbor-icon.svg',
                  tag: `auto-clockout-admin-${clockEvent.userId}-${Date.now()}`,
                  data: {
                    type: 'clock-out',
                    userId: clockEvent.userId,
                    userName: userName,
                    teamName: teamName,
                    teamId: clockEvent.teamId,
                    clockEventId: clockEvent._id,
                    duration: durationText,
                    autoClockOut: true,
                    url: '/admin'
                  }
                });
              } catch (error) {
                console.error('Failed to send auto-clock-out notification to admins:', error);
              }
            } catch (error) {
              console.error(`Failed to auto-clock-out event ${clockEvent._id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in auto-clock-out check:', error);
    }
  }, CHECK_INTERVAL_MS);

  console.log('Auto-clock-out service started: Server-side backup check runs every 1 minute');
});

Meteor.publish('userTeams', function () {
  // Publish teams where the user is a member or admin
  if (!this.userId) return this.ready();
  return Teams.find({
    $or: [
      { members: this.userId },
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

  // Allow if user is a member or admin of the requested teams
  const teams = await Teams.find({
    _id: { $in: validTeamIds },
    $or: [
      { members: this.userId },
      { admins: this.userId },
    ],
  }).fetchAsync();
  const userIds = Array.from(new Set(teams.flatMap(team => team.members || [])));
  return Meteor.users.find(
    { _id: { $in: userIds } },
    { fields: { 'emails.address': 1, 'services.google.name': 1, 'services.github.username': 1, 'profile': 1, 'username': 1 } }
  );
});

Meteor.publish('teamTickets', function (teamIds) {
  // Filter out null/undefined values before validation
  const validTeamIds = teamIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  check(validTeamIds, [String]);
  
  // Publish all tickets for these teams (not just created by current user)
  return Tickets.find({ teamId: { $in: validTeamIds } });
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

  // Publish clock events for teams the user is a member of (admin or regular member)
  const allowedTeams = await Teams.find({
    _id: { $in: validTeamIds },
    members: this.userId, // Check if user is a member (includes admins)
  }).fetchAsync();
  const allowedTeamIds = allowedTeams.map(t => t._id);
  return ClockEvents.find({ teamId: { $in: allowedTeamIds } });
});

// Publish all tickets for a team for admin review (only for team admins)
Meteor.publish('adminTeamTickets', async function (teamId) {
  check(teamId, String);
  if (!this.userId) return this.ready();

  // Check if user is admin of the team
  const team = await Teams.findOneAsync({ 
    _id: teamId, 
    admins: this.userId
  });

  if (!team) return this.ready();

  // Return all tickets for this team (not just user's own tickets)
  return Tickets.find({ teamId });
});

Meteor.publish('usersByIds', async function (userIds) {
  // Filter out null/undefined values before validation
  const validUserIds = userIds.filter(id => id !== null && id !== undefined && typeof id === 'string');
  
  if (validUserIds.length === 0) {
    return this.ready();
  }
  
  check(validUserIds, [String]);
  
  // Only publish users that are in teams the current user is a member or admin of
  const userTeams = await Teams.find({ $or: [{ members: this.userId }, { admins: this.userId }] }).fetchAsync();
  
  // Filter out null/undefined values and flatten the arrays safely
  const allowedUserIds = Array.from(new Set(
    userTeams.flatMap(team => {
      const members = team.members || [];
      const admins = team.admins || [];
      return [...members, ...admins].filter(id => id !== null && id !== undefined);
    })
  ));
  
  const filteredUserIds = validUserIds.filter(id => allowedUserIds.includes(id));
  
  if (filteredUserIds.length === 0) {
    return this.ready();
  }
  
  return Meteor.users.find({ _id: { $in: filteredUserIds } }, { 
    fields: { 
      'emails.address': 1, 
      'services.google.email': 1, 
      'services.google.name': 1,
      'services.github.username': 1,
      'profile': 1,
      'username': 1
    } 
  });
});

Meteor.methods({
  ...authMethods,
  ...teamMethods,
  ...ticketMethods,
  ...clockEventMethods,
  ...notificationMethods,

  'participants.create'(name) {
    check(name, String);
    // Logic to create a participant account
    console.log(`Creating participant with name: ${name}`);
    Accounts.createUser({ email: name });
  },
});

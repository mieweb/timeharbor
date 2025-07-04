import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import axios from 'axios';
import { Tickets, Teams, Sessions, ClockEvents } from '../collections.js';

// Server configuration for URL title proxy service
const UrlTitleConfig = {
  // Enable/disable the URL title fetching service
  enabled: Meteor.settings.urlTitleProxy?.enabled ?? true,
  
  // Maximum timeout for requests (seconds)
  timeout: Meteor.settings.urlTitleProxy?.timeout ?? 10,
  
  // Maximum response size (bytes)
  maxResponseSize: Meteor.settings.urlTitleProxy?.maxResponseSize ?? 1048576, // 1MB
  
  // Maximum title length (characters)
  maxTitleLength: Meteor.settings.urlTitleProxy?.maxTitleLength ?? 200,
  
  // Allow only authenticated users
  requireAuth: Meteor.settings.urlTitleProxy?.requireAuth ?? true,
  
  // Allowed domains (empty array means all external domains allowed)
  allowedDomains: Meteor.settings.urlTitleProxy?.allowedDomains ?? [],
  
  // Block private/internal networks
  blockPrivateNetworks: Meteor.settings.urlTitleProxy?.blockPrivateNetworks ?? true
};

function generateTeamCode() {
  // Simple random code, can be improved for production
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Enhanced security function to check if a URL is safe to fetch
function isUrlSafe(url) {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    const hostname = urlObj.hostname.toLowerCase();
    
    // If allowedDomains is configured, only allow those domains
    if (UrlTitleConfig.allowedDomains.length > 0) {
      const isAllowed = UrlTitleConfig.allowedDomains.some(domain => {
        return hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase());
      });
      if (!isAllowed) {
        return false;
      }
    }
    
    // Block private/internal networks if configured
    if (UrlTitleConfig.blockPrivateNetworks) {
      // Block localhost variations
      if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        return false;
      }
      
      // Block private IP ranges
      if (hostname.match(/^10\./) || 
          hostname.match(/^192\.168\./) || 
          hostname.match(/^172\.(1[6-9]|2\d|3[01])\./) ||
          hostname.match(/^169\.254\./) ||
          hostname.match(/^fe80:/)) {
        return false;
      }
      
      // Block other local addresses
      if (hostname.match(/\.local$/) || hostname.match(/\.localhost$/)) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Safe HTML title extraction function
function extractTitleFromHtml(html) {
  try {
    // Simple regex to extract title - using established approach for security
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Decode common HTML entities and clean up
      let title = titleMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      // Limit title length for safety
      if (title.length > UrlTitleConfig.maxTitleLength) {
        title = title.substring(0, UrlTitleConfig.maxTitleLength).trim();
      }
      
      return title;
    }
    return null;
  } catch (e) {
    return null;
  }
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
    const code = generateTeamCode();
    const teamId = await Teams.insertAsync({
      name: teamName,
      members: [this.userId],
      admins: [this.userId],
      leader: this.userId,
      code,
      createdAt: new Date(),
    });
    return teamId;
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

  async fetchUrlTitle(url) {
    check(url, String);
    
    // Check if the service is enabled
    if (!UrlTitleConfig.enabled) {
      throw new Meteor.Error('service-disabled', 'URL title proxy service is disabled');
    }
    
    // Check authentication if required
    if (UrlTitleConfig.requireAuth && !this.userId) {
      throw new Meteor.Error('not-authorized', 'Authentication required to use URL title proxy service');
    }
    
    // Validate URL format
    if (!url || typeof url !== 'string') {
      throw new Meteor.Error('invalid-url', 'Invalid URL provided');
    }
    
    // Check if URL is safe to fetch
    if (!isUrlSafe(url)) {
      throw new Meteor.Error('unsafe-url', 'URL is not allowed by security policy');
    }
    
    try {
      // Create axios instance with security configurations
      const axiosInstance = axios.create({
        timeout: UrlTitleConfig.timeout * 1000, // Convert to milliseconds
        maxRedirects: 5,
        maxContentLength: UrlTitleConfig.maxResponseSize,
        maxBodyLength: UrlTitleConfig.maxResponseSize,
        headers: {
          'User-Agent': 'TimeHarbor-URLProxy/1.0 (URL Title Fetcher)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Connection': 'close'
        },
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      // Fetch the URL with security restrictions
      const response = await axiosInstance.get(url);
      
      // Extract title from the response
      if (response && response.data) {
        const title = extractTitleFromHtml(response.data);
        if (title && title.length > 0) {
          return title;
        }
      }
      
      return null;
    } catch (error) {
      // Log error for debugging but don't expose details to client
      console.error('URL title fetch error:', {
        url: url,
        error: error.message,
        code: error.code,
        userId: this.userId
      });
      
      // Return user-friendly error messages
      if (error.code === 'ENOTFOUND') {
        throw new Meteor.Error('url-not-found', 'URL could not be reached');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Meteor.Error('request-timeout', 'Request timed out');
      } else if (error.response?.status >= 400) {
        throw new Meteor.Error('http-error', 'Server returned an error');
      } else {
        throw new Meteor.Error('fetch-failed', 'Failed to fetch URL title');
      }
    }
  },
});

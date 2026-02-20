import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Tickets, Teams, ClockEvents } from '../../collections.js';
import axios from 'axios';
import cheerio from 'cheerio';

export const ticketMethods = {
  async extractUrlTitle(url) {
    check(url, String);
    
    try {
      // Try to fetch the URL
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000 // 5 second timeout
      });

      // Check if response is HTML
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('text/html')) {
        return { error: 'URL does not contain HTML content' };
      }

      // Load HTML content into cheerio
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('title').text().trim();
      
      if (!title) {
        return { error: 'No title found in the webpage' };
      }

      return { title };
    } catch (error) {
      return { error: 'Failed to fetch URL or extract title' };
    }
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
    
    // Create the ticket (creator is initial assignee)
    const ticketId = await Tickets.insertAsync({
      teamId,
      title,
      github,
      accumulatedTime,
      createdBy: this.userId,
      assignedTo: this.userId,
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

  async updateTicketStart(ticketId, now) {
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Verify ticket exists
    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');
    
    // Ensure all tickets have ownership - assign to current user if missing
    if (!ticket.createdBy) {
      await Tickets.updateAsync(ticketId, { $set: { createdBy: this.userId } });
    } else if (ticket.createdBy !== this.userId) {
      throw new Meteor.Error('not-authorized', 'You can only start your own tickets');
    }
    
    return await Tickets.updateAsync(ticketId, { $set: { startTimestamp: now } });
  },

  async updateTicketStop(ticketId, now) {
    check(ticketId, String);
    check(now, Number);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');
    
    // Ensure all tickets have ownership - assign to current user if missing
    if (!ticket.createdBy) {
      await Tickets.updateAsync(ticketId, { $set: { createdBy: this.userId } });
    } else if (ticket.createdBy !== this.userId) {
      throw new Meteor.Error('not-authorized', 'You can only stop your own tickets');
    }
    
    if (ticket.startTimestamp) {
      const elapsed = Math.floor((now - ticket.startTimestamp) / 1000);
      const prev = ticket.accumulatedTime || 0;
      return await Tickets.updateAsync(ticketId, {
        $set: { accumulatedTime: prev + elapsed },
        $unset: { startTimestamp: '' }
      });
    }
  },

  async updateTicket(ticketId, updates) {
    check(ticketId, String);
    check(updates, Object);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

    // Ensure all tickets have ownership - assign to current user if missing
    if (!ticket.createdBy) {
      await Tickets.updateAsync(ticketId, { $set: { createdBy: this.userId } });
    } else if (ticket.createdBy !== this.userId) {
      throw new Meteor.Error('not-authorized', 'You can only edit your own tickets');
    }

    // Verify user is a member of the team
    const team = await Teams.findOneAsync({ _id: ticket.teamId, members: this.userId });
    if (!team) throw new Meteor.Error('not-authorized', 'You are not a member of this team');

    return Tickets.updateAsync(ticketId, {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    });
  },

  async deleteTicket(ticketId) {
    check(ticketId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

    // Ensure all tickets have ownership - assign to current user if missing
    if (!ticket.createdBy) {
      await Tickets.updateAsync(ticketId, { $set: { createdBy: this.userId } });
    } else if (ticket.createdBy !== this.userId) {
      throw new Meteor.Error('not-authorized', 'You can only delete your own tickets');
    }

    // Verify user is a member of the team
    const team = await Teams.findOneAsync({ _id: ticket.teamId, members: this.userId });
    if (!team) throw new Meteor.Error('not-authorized', 'You are not a member of this team');

    // Remove ticket from any active clock events for this user and team
    await ClockEvents.updateAsync(
      { userId: this.userId, teamId: ticket.teamId, 'tickets.ticketId': ticketId },
      { $pull: { tickets: { ticketId } } },
      { multi: true }
    );

    return Tickets.removeAsync(ticketId);
  },

  // Batch operations for admin review
  async batchUpdateTicketStatus({ ticketIds, status, teamId }) {
    check(ticketIds, [String]);
    check(status, String);
    check(teamId, String);

    if (!this.userId) throw new Meteor.Error('not-authorized');

    // Verify user is admin of the team
    const team = await Teams.findOneAsync({ 
      _id: teamId, 
      admins: this.userId
    });

    if (!team) throw new Meteor.Error('not-authorized', 'You are not authorized to perform this operation');

    // Validate status
    const validStatuses = ['open', 'reviewed', 'deleted', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Meteor.Error('invalid-status', 'Invalid status value');
    }

    // Build update object
    const updateFields = { 
      status,
      updatedAt: new Date(),
      updatedBy: this.userId
    };

    // If marking as reviewed, track reviewer info
    if (status === 'reviewed') {
      updateFields.reviewedBy = this.userId;
      updateFields.reviewedAt = new Date();
    }

    // Update all specified tickets that belong to this team
    const result = await Tickets.updateAsync(
      { 
        _id: { $in: ticketIds },
        teamId: teamId
      },
      { $set: updateFields },
      { multi: true }
    );

    return result;
  },

  /**
   * Assign a ticket to a team member (team admin only).
   * assignedToUserId can be null to unassign.
   */
  async assignTicket(ticketId, assignedToUserId) {
    check(ticketId, String);
    check(assignedToUserId, Match.Maybe(String));
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

    const team = await Teams.findOneAsync({ _id: ticket.teamId });
    if (!team) throw new Meteor.Error('not-found', 'Team not found');

    const isAdmin = Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isAdmin) throw new Meteor.Error('forbidden', 'Only team admins can assign tickets');

    if (assignedToUserId) {
      const isMemberOrAdmin = [
        ...(team.members || []),
        ...(team.admins || [])
      ].includes(assignedToUserId);
      if (!isMemberOrAdmin) throw new Meteor.Error('invalid-argument', 'Assignee must be a member of the team');
    }

    await Tickets.updateAsync(ticketId, {
      $set: {
        assignedTo: assignedToUserId || null,
        updatedAt: new Date()
      }
    });
    return true;
  },

  /**
   * Get time history for a ticket: total hours worked (creation to today) and hours worked today.
   */
  async getTicketTimeHistory(ticketId) {
    check(ticketId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

    const team = await Teams.findOneAsync({
      _id: ticket.teamId,
      $or: [{ members: this.userId }, { admins: this.userId }]
    });
    if (!team) throw new Meteor.Error('not-authorized', 'Not a member of this team');

    const now = Date.now();
    const today = new Date(now);
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    let totalSeconds = ticket.accumulatedTime || 0;
    if (ticket.startTimestamp) {
      totalSeconds += Math.floor((now - ticket.startTimestamp) / 1000);
    }

    let todaySeconds = 0;
    const events = await ClockEvents.find({
      userId: this.userId,
      teamId: ticket.teamId,
      'tickets.ticketId': ticketId
    }).fetchAsync();

    for (const event of events) {
      const entry = event.tickets && event.tickets.find(t => t.ticketId === ticketId);
      if (!entry) continue;
      const sessions = entry.sessions || [];
      for (const s of sessions) {
        const start = s.startTimestamp;
        const end = s.endTimestamp != null ? s.endTimestamp : now;
        const overlapStart = Math.max(start, dayStart);
        const overlapEnd = Math.min(end, dayEnd);
        if (overlapStart < overlapEnd) {
          todaySeconds += Math.floor((overlapEnd - overlapStart) / 1000);
        }
      }
      if (entry.startTimestamp) {
        const start = entry.startTimestamp;
        const end = now;
        const overlapStart = Math.max(start, dayStart);
        const overlapEnd = Math.min(end, dayEnd);
        if (overlapStart < overlapEnd) {
          todaySeconds += Math.floor((overlapEnd - overlapStart) / 1000);
        }
      }
    }

    // Today's work showcase link (from any clock-out today with a link)
    const todayEventWithLink = await ClockEvents.findOneAsync(
      {
        userId: this.userId,
        teamId: ticket.teamId,
        endTime: { $gte: new Date(dayStart), $lte: new Date(dayEnd) },
        youtubeShortLink: { $exists: true, $ne: '' }
      },
      { sort: { endTime: -1 }, fields: { youtubeShortLink: 1 } }
    );
    const todayWorkShowcaseLink = todayEventWithLink?.youtubeShortLink || null;

    return {
      ticketId,
      title: ticket.title,
      createdAt: ticket.createdAt,
      totalSeconds,
      todaySeconds,
      todayWorkShowcaseLink
    };
  },
}; 
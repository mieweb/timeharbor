import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
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

    // Verify user is admin/leader of the team
    const team = await Teams.findOneAsync({ 
      _id: teamId, 
      $or: [
        { leader: this.userId },
        { admins: this.userId }
      ]
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
}; 
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Tickets, Teams, ClockEvents } from '../../collections.js';

export const ticketMethods = {
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
}; 
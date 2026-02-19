import { ClockEvents, Tickets } from '../../collections.js';

function meteorCall(methodName, ...args) {
  return new Promise((resolve, reject) => {
    Meteor.call(methodName, ...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Stop a single ticket (updateTicketStop + clockEventStopTicket).
 * Used by stopSession to stop all running tickets before ending the clock event.
 */
async function stopTicket(ticketId, clockEvent) {
  const now = Date.now();
  await meteorCall('updateTicketStop', ticketId, now);
  if (clockEvent) {
    await meteorCall('clockEventStopTicket', clockEvent._id, ticketId, now);
  }
}

export const sessionManager = {
  async startSession(teamId) {
    try {
      await meteorCall('clockEventStart', teamId);
      return true;
    } catch (error) {
      console.error('Failed to start session', error);
      if (typeof alert === 'function') {
        alert(`Failed to start session: ${error.reason || error.message}`);
      }
      return false;
    }
  },

  async stopSession(teamId) {
    try {
      const clockEvent = ClockEvents.findOne({
        userId: Meteor.userId(),
        teamId,
        endTime: null,
      });
      const runningTickets = Tickets.find({
        teamId,
        createdBy: Meteor.userId(),
        startTimestamp: { $exists: true },
      }).fetch();

      for (const ticket of runningTickets) {
        await stopTicket(ticket._id, clockEvent);
      }
      await meteorCall('clockEventStop', teamId);
      return true;
    } catch (error) {
      console.error('Failed to stop session', error);
      if (typeof alert === 'function') {
        alert(`Failed to stop session: ${error.reason || error.message}`);
      }
      return false;
    }
  },
};

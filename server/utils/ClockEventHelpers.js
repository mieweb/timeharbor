/**
 * Format duration in seconds to "Xh Ym Zs" format
 * @param {number} totalSeconds - Total duration in seconds
 * @returns {string} Formatted duration string (e.g., "10h 0m 0s" or "5m 30s")
 */
export function formatDurationText(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export async function stopTicketInClockEvent(clockEventId, ticketId, now, ClockEvents) {
  const clockEvent = await ClockEvents.findOneAsync(clockEventId);
  if (!clockEvent || !clockEvent.tickets) return;
  const ticketEntry = clockEvent.tickets.find(t => t.ticketId === ticketId && t.startTimestamp);
  if (ticketEntry) {
    const elapsed = Math.floor((now - ticketEntry.startTimestamp) / 1000);
    const prev = ticketEntry.accumulatedTime || 0;
    await ClockEvents.updateAsync(
      { _id: clockEventId, 'tickets.ticketId': ticketId },
      {
        $set: { 'tickets.$.accumulatedTime': prev + elapsed },
        $unset: { 'tickets.$.startTimestamp': '' }
      }
    );
  }
}
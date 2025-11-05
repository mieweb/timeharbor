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
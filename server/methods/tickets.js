import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Tickets, Teams, ClockEvents } from '../../collections.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { formatDurationText } from '../utils/ClockEventHelpers.js';

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
      await ClockEvents.updateAsync(activeClockEvent._id, {
        $push: {
          tickets: {
            ticketId,
            startTimestamp: Date.now(),
            accumulatedTime // Include initial time in clock event
          }
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
  async getTicketTimeHistory(ticketId, options = {}) {
    check(ticketId, String);
    check(options, Match.Maybe(Match.ObjectIncluding({
      rangeType: Match.Maybe(Match.OneOf(
        'today',
        'yesterday',
        'last7',
        'thisWeek',
        'thisMonth',
        'thisQuarter',
        'thisYear',
        'custom'
      )),
      customDate: Match.Maybe(String),
      customStartDate: Match.Maybe(String),
      customEndDate: Match.Maybe(String)
    })));
    if (!this.userId) throw new Meteor.Error('not-authorized');

    try {
      const ticket = await Tickets.findOneAsync(ticketId);
      if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

      const team = await Teams.findOneAsync({
        _id: ticket.teamId,
        $or: [{ members: this.userId }, { admins: this.userId }]
      });
      if (!team) throw new Meteor.Error('not-authorized', 'Not a member of this team');

      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const today = new Date(now);
      const getDayBounds = (dateObj) => {
        const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0).getTime();
        const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999).getTime();
        return { start, end };
      };
      const toDateKey = (timestamp) => {
        const date = new Date(timestamp);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      const toDateLabel = (dateKey) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };
      const parseDateKey = (dateStr, label) => {
        const parts = String(dateStr || '').split('-').map(Number);
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
          throw new Meteor.Error('validation-error', `${label} must be YYYY-MM-DD`);
        }
        const [year, month, day] = parts;
        const parsed = new Date(year, month - 1, day);
        if (
          parsed.toString() === 'Invalid Date' ||
          parsed.getFullYear() !== year ||
          parsed.getMonth() !== month - 1 ||
          parsed.getDate() !== day
        ) {
          throw new Meteor.Error('validation-error', `${label} is invalid`);
        }
        return { parsed, dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
      };

      const rangeType = options?.rangeType || 'today';
      let { start: rangeStart, end: rangeEnd } = getDayBounds(today);
      let rangeLabel = 'Today';
      let selectedDateKey = toDateKey(rangeStart);

      if (rangeType === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        ({ start: rangeStart, end: rangeEnd } = getDayBounds(yesterday));
        rangeLabel = 'Yesterday';
        selectedDateKey = toDateKey(rangeStart);
      } else if (rangeType === 'thisWeek') {
        const dayIndex = today.getDay();
        const startOffset = dayIndex === 0 ? 6 : dayIndex - 1; // Monday start
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - startOffset);
        ({ start: rangeStart } = getDayBounds(startDate));
        ({ end: rangeEnd } = getDayBounds(today));
        rangeLabel = 'This Week';
        selectedDateKey = null;
      } else if (rangeType === 'thisMonth') {
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        ({ start: rangeStart } = getDayBounds(startDate));
        ({ end: rangeEnd } = getDayBounds(today));
        rangeLabel = 'This Month';
        selectedDateKey = null;
      } else if (rangeType === 'thisQuarter') {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const startDate = new Date(today.getFullYear(), quarterStartMonth, 1);
        ({ start: rangeStart } = getDayBounds(startDate));
        ({ end: rangeEnd } = getDayBounds(today));
        rangeLabel = 'This Quarter';
        selectedDateKey = null;
      } else if (rangeType === 'thisYear') {
        const startDate = new Date(today.getFullYear(), 0, 1);
        ({ start: rangeStart } = getDayBounds(startDate));
        ({ end: rangeEnd } = getDayBounds(today));
        rangeLabel = 'This Year';
        selectedDateKey = null;
      } else if (rangeType === 'custom') {
        const customStartDate = options?.customStartDate;
        const customEndDate = options?.customEndDate;

        if (customStartDate && customEndDate) {
          const startParsed = parseDateKey(customStartDate, 'customStartDate');
          const endParsed = parseDateKey(customEndDate, 'customEndDate');
          if (endParsed.parsed.getTime() < startParsed.parsed.getTime()) {
            throw new Meteor.Error('validation-error', 'customEndDate must be on or after customStartDate');
          }
          ({ start: rangeStart } = getDayBounds(startParsed.parsed));
          ({ end: rangeEnd } = getDayBounds(endParsed.parsed));
          rangeLabel = `${startParsed.parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} - ${endParsed.parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
          selectedDateKey = startParsed.dateKey === endParsed.dateKey ? startParsed.dateKey : null;
        } else {
          const customDateStr = options?.customDate;
          if (!customDateStr) {
            throw new Meteor.Error('validation-error', 'customStartDate and customEndDate are required for custom range');
          }
          const parsed = parseDateKey(customDateStr, 'customDate');
          ({ start: rangeStart, end: rangeEnd } = getDayBounds(parsed.parsed));
          rangeLabel = parsed.parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          selectedDateKey = parsed.dateKey;
        }
      } else if (rangeType === 'last7') {
        const dayBounds = getDayBounds(today);
        rangeStart = dayBounds.start - (6 * DAY_MS);
        rangeEnd = dayBounds.end;
        rangeLabel = 'Last 7 Days';
        selectedDateKey = null;
      }

      let totalSeconds = ticket.accumulatedTime || 0;
      const hasRunningSession = typeof ticket.startTimestamp === 'number';
      if (hasRunningSession) {
        totalSeconds += Math.floor((now - ticket.startTimestamp) / 1000);
      }

      // Ticket time sessions are recorded under the ticket creator's clock events.
      // Use the ticket owner for history lookups so team admins can view member history correctly.
      const ticketOwnerUserId = ticket.createdBy || this.userId;

      const events = await ClockEvents.find({
        userId: ticketOwnerUserId,
        teamId: ticket.teamId,
        'tickets.ticketId': ticketId
      }).fetchAsync();

      const sessionMap = new Map();
      const upsertSession = (startTimestamp, endTimestamp) => {
        if (typeof startTimestamp !== 'number' || Number.isNaN(startTimestamp)) return;
        const normalizedEnd = (typeof endTimestamp === 'number' && !Number.isNaN(endTimestamp)) ? endTimestamp : null;
        const key = `${startTimestamp}:${normalizedEnd ?? 'ongoing'}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, { startTimestamp, endTimestamp: normalizedEnd });
        }
      };

      for (const event of events) {
        const entry = event.tickets && event.tickets.find(t => t.ticketId === ticketId);
        if (!entry) continue;

        const sessions = Array.isArray(entry.sessions) ? entry.sessions : [];
        for (const session of sessions) {
          upsertSession(session?.startTimestamp, session?.endTimestamp);
        }

        // Backward-compatibility for entries that have startTimestamp but no open session object
        if (typeof entry.startTimestamp === 'number') {
          upsertSession(entry.startTimestamp, null);
        }
      }

      const allSessions = Array.from(sessionMap.values()).sort((a, b) => a.startTimestamp - b.startTimestamp);

      const dailyTotalsByDate = new Map();
      const dailySessionCounts = new Map();
      const addToDailyTotals = (sessionStart, sessionEnd) => {
        let cursor = sessionStart;
        const effectiveEnd = typeof sessionEnd === 'number' ? sessionEnd : now;
        if (cursor >= effectiveEnd) return;

        const startDayKey = toDateKey(sessionStart);
        dailySessionCounts.set(startDayKey, (dailySessionCounts.get(startDayKey) || 0) + 1);

        while (cursor < effectiveEnd) {
          const cursorDate = new Date(cursor);
          const dayStart = new Date(
            cursorDate.getFullYear(),
            cursorDate.getMonth(),
            cursorDate.getDate(),
            0,
            0,
            0,
            0
          ).getTime();
          const nextDayStart = dayStart + DAY_MS;
          const chunkEnd = Math.min(effectiveEnd, nextDayStart);
          const chunkSeconds = Math.floor((chunkEnd - cursor) / 1000);
          if (chunkSeconds > 0) {
            const dayKey = toDateKey(cursor);
            dailyTotalsByDate.set(dayKey, (dailyTotalsByDate.get(dayKey) || 0) + chunkSeconds);
          }
          cursor = chunkEnd;
        }
      };

      let rangeSeconds = 0;
      const selectedSessions = [];

      for (const session of allSessions) {
        const sessionStart = session.startTimestamp;
        const sessionEnd = typeof session.endTimestamp === 'number' ? session.endTimestamp : now;
        if (sessionStart >= sessionEnd) continue;

        addToDailyTotals(sessionStart, sessionEnd);

        const overlapStart = Math.max(sessionStart, rangeStart);
        const overlapEnd = Math.min(sessionEnd, rangeEnd);
        if (overlapStart < overlapEnd) {
          const overlapSeconds = Math.floor((overlapEnd - overlapStart) / 1000);
          rangeSeconds += overlapSeconds;
          selectedSessions.push({
            startTimestamp: overlapStart,
            endTimestamp: overlapEnd,
            durationSeconds: overlapSeconds,
            isOngoing: session.endTimestamp == null
          });
        }
      }

      selectedSessions.sort((a, b) => a.startTimestamp - b.startTimestamp);

      const dailyTotals = Array.from(dailyTotalsByDate.entries())
        .map(([dateKey, seconds]) => ({
          dateKey,
          dateLabel: toDateLabel(dateKey),
          totalSeconds: seconds,
          sessionCount: dailySessionCounts.get(dateKey) || 0
        }))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      // Work showcase link restricted to the selected range
      const showcaseEvent = await ClockEvents.findOneAsync(
        {
          userId: ticketOwnerUserId,
          teamId: ticket.teamId,
          endTime: { $gte: new Date(rangeStart), $lte: new Date(rangeEnd) },
          youtubeShortLink: { $exists: true, $ne: '' }
        },
        { sort: { endTime: -1 }, fields: { youtubeShortLink: 1 } }
      );
      const rangeWorkShowcaseLink = showcaseEvent?.youtubeShortLink || null;

      return {
        ticketId,
        title: ticket.title,
        createdAt: ticket.createdAt,
        generatedAt: now,
        hasRunningSession,
        totalSeconds,
        rangeSeconds,
        selectedDateTotalSeconds: selectedDateKey ? rangeSeconds : null,
        rangeLabel,
        rangeType,
        rangeStart,
        rangeEnd,
        customDate: rangeType === 'custom' ? options?.customDate || null : null,
        customStartDate: rangeType === 'custom' ? options?.customStartDate || null : null,
        customEndDate: rangeType === 'custom' ? options?.customEndDate || null : null,
        selectedDateKey,
        rangeWorkShowcaseLink,
        dailyTotals,
        selectedSessions,
        logs: selectedSessions,
        totalSecondsLabel: formatDurationText(totalSeconds),
        rangeSecondsLabel: formatDurationText(rangeSeconds)
      };
    } catch (error) {
      console.error('Error in getTicketTimeHistory:', error);
      throw new Meteor.Error('internal-server-error', error.message || 'An unexpected error occurred');
    }
  },
};
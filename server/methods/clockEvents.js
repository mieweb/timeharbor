import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ClockEvents, Tickets, Teams } from '../../collections.js';
import { stopTicketInClockEvent } from '../utils/ClockEventHelpers.js';
import { notifyTeamAdmins } from '../utils/pushNotifications.js';

export const clockEventMethods = {
  async clockEventStart(teamId) {
    check(teamId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Get user info for notification
    const user = await Meteor.users.findOneAsync(this.userId);
    const userName = user?.services?.google?.name || 
                     user?.services?.github?.username || 
                     user?.profile?.name || 
                     user?.username || 
                     user?.emails?.[0]?.address?.split('@')[0] || 
                     'A user';
    
    // Get team info
    const team = await Teams.findOneAsync(teamId);
    const teamName = team?.name || 'a team';
    
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
    
    // Send push notification to team admins/leaders
    try {
      await notifyTeamAdmins(teamId, {
        title: 'Time Harbor',
        body: `${userName} clocked in to ${teamName}`,
        icon: '/timeharbor-icon.svg',
        badge: '/timeharbor-icon.svg',
        tag: `clockin-${this.userId}-${Date.now()}`,
        data: {
          type: 'clock-in',
          userId: this.userId,
          userName: userName,
          teamName: teamName,
          teamId,
          clockEventId,
          url: '/admin'
        }
      });
    } catch (error) {
      // Don't fail the clock-in if notification fails
      console.error('Failed to send clock-in notification:', error);
    }
    
    return clockEventId;
  },

  async clockEventStop(teamId) {
    check(teamId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    
    // Get user info for notification
    const user = await Meteor.users.findOneAsync(this.userId);
    const userName = user?.services?.google?.name || 
                     user?.services?.github?.username || 
                     user?.profile?.name || 
                     user?.username || 
                     user?.emails?.[0]?.address?.split('@')[0] || 
                     'A user';
    
    // Get team info
    const team = await Teams.findOneAsync(teamId);
    const teamName = team?.name || 'a team';
    
    const clockEvent = await ClockEvents.findOneAsync({ userId: this.userId, teamId, endTime: null });
    if (clockEvent) {
      const now = Date.now();

      // Calculate and update accumulated time for the clock event
      let totalSeconds = 0;
      let durationText = '';
      
      if (clockEvent.startTimestamp) {
        const elapsed = Math.floor((now - clockEvent.startTimestamp) / 1000);
        const prev = clockEvent.accumulatedTime || 0;
        totalSeconds = prev + elapsed;
        
        // Format duration as hours, minutes, seconds
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // Build duration text
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        durationText = parts.join(' ');
        
        await ClockEvents.updateAsync(clockEvent._id, {
          $set: { accumulatedTime: totalSeconds }
        });
      }

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
        $set: { endTime: new Date() },
      });
      
      // Send push notification to team admins/leaders
      try {
        await notifyTeamAdmins(teamId, {
          title: 'Time Harbor',
          body: `${userName} clocked out of ${teamName} (${durationText})`,
          icon: '/timeharbor-icon.svg',
          badge: '/timeharbor-icon.svg',
          tag: `clockout-${this.userId}-${Date.now()}`,
          data: {
            type: 'clock-out',
            userId: this.userId,
            userName: userName,
            teamName: teamName,
            teamId,
            clockEventId: clockEvent._id,
            duration: durationText,
            url: '/admin'
          }
        });
      } catch (error) {
        // Don't fail the clock-out if notification fails
        console.error('Failed to send clock-out notification:', error);
      }
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
    await stopTicketInClockEvent(clockEventId, ticketId, now, ClockEvents);
  },

  async getUserTimesheetData(userId, startDate, endDate) {
    check(userId, String);
    check(startDate, String);
    check(endDate, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    // Check if current user has permission to view this user's data
    // Only allow if current user is a leader/admin of a team that includes the target user
    const userTeams = await Teams.find({
      $or: [
        { members: this.userId },
        { leader: this.userId },
        { admins: this.userId }
      ]
    }).fetchAsync();

    const hasPermission = userTeams.some(team => 
      team.members?.includes(userId) || 
      team.leader === userId || 
      team.admins?.includes(userId)
    );

    if (!hasPermission) {
      throw new Meteor.Error('not-authorized', 'You can only view timesheet data for team members');
    }

    // Parse dates
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    // Fetch clock events for the user in the date range
    const clockEvents = await ClockEvents.find({
      userId: userId,
      startTimestamp: { $gte: start, $lte: end }
    }).fetchAsync();

    // Process and enrich the data
    const sessionData = clockEvents.map(event => {
      const startTime = new Date(event.startTimestamp);
      const endTime = event.endTime ? new Date(event.endTime) : null;
      const duration = endTime ? (endTime - startTime) / 1000 : null;

      // Get related data
      const activity = event.ticketId ? Tickets.findOne(event.ticketId) : null;
      const team = event.teamId ? Teams.findOne(event.teamId) : null;

      return {
        id: event._id,
        date: startTime.toISOString().split('T')[0], // YYYY-MM-DD format
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        isActive: !endTime,
        activityTitle: activity?.title || null,
        teamName: team?.name || null,
        ticketId: event.ticketId,
        teamId: event.teamId,
        accumulatedTime: event.accumulatedTime || 0
      };
    });

    // Sort by start time (most recent first)
    sessionData.sort((a, b) => b.startTime - a.startTime);

    // Calculate summary statistics
    const totalSeconds = sessionData.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalSessions = sessionData.length;
    const completedSessions = sessionData.filter(s => s.duration).length;
    const averageSessionSeconds = completedSessions > 0 ? 
      sessionData.reduce((sum, session) => sum + (session.duration || 0), 0) / completedSessions : 0;
    
    const uniqueDates = new Set(sessionData.map(s => s.date));
    const workingDays = uniqueDates.size;

    return {
      sessions: sessionData,
      summary: {
        totalSeconds,
        totalSessions,
        completedSessions,
        averageSessionSeconds,
        workingDays
      }
    };
  },
}; 
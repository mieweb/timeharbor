import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Teams, Tickets } from '../../collections.js';

export const ozwellMethods = {
    // Get recent project tickets for MCP tool (context-aware suggestions)
    async getRecentProjectTickets({ teamId, days = 30, limit = 20 }) {
        check(teamId, String);
        check(days, Number);
        check(limit, Number);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Verify team membership
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        // Calculate cutoff date
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Query tickets created within the time window
        const tickets = await Tickets.find({
            teamId,
            createdAt: { $gte: cutoffDate }
        }, {
            sort: { createdAt: -1 },
            limit
        }).fetchAsync();

        // Return formatted data for AI context
        return tickets.map(t => ({
            title: t.title,
            description: t.github || '',
            time: t.accumulatedTime || 0,
            createdAt: t.createdAt
        }));
    },

    // Get project time statistics for MCP tool (time tracking queries)
    async getProjectTimeStats({ teamId, days = 30 }) {
        check(teamId, String);
        check(days, Number);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Verify team membership
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        // Calculate cutoff date
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Query tickets created within the time window
        const tickets = await Tickets.find({
            teamId,
            createdAt: { $gte: cutoffDate }
        }).fetchAsync();

        // Calculate total time in seconds
        const totalSeconds = tickets.reduce((sum, ticket) => {
            return sum + (ticket.accumulatedTime || 0);
        }, 0);

        // Format as "Xh Ym"
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const totalFormatted = `${hours}h ${minutes}m`;

        return {
            totalSeconds,
            totalFormatted,
            ticketCount: tickets.length,
            days
        };
    }
};

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { OzwellWorkspaces, OzwellUsers, OzwellConversations, OzwellPrompts, Teams, Tickets, ClockEvents } from '../../collections.js';
import axios from 'axios';

const DEFAULT_REFERENCE_BASE_URL = 'http://localhost:3000/v1';
const DEFAULT_REFERENCE_MODEL = 'llama3';

export const ozwellMethods = {
    // Test Ozwell API credentials
    async testOzwellCredentials({ apiKey, baseUrl, model }) {
        check(apiKey, String);
        check(baseUrl, String);
        check(model, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        try {
            const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
            await axios.post(url, {
                model,
                messages: [
                    { role: 'system', content: 'You are a connection test assistant.' },
                    { role: 'user', content: 'Reply with OK.' }
                ],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                timeout: 5000,
            });

            return { success: true };
        } catch (error) {
            console.error('Reference server credentials test failed:', error.response?.data || error.message);
            throw new Meteor.Error('ozwell-error', 'Connection test failed. Check base URL, model, and API key.');
        }
    },

    // Save user's Ozwell configuration
    async saveOzwellConfiguration({ apiKey, baseUrl, model }) {
        check(apiKey, String);
        check(baseUrl, String);
        check(model, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        await ozwellMethods.testOzwellCredentials.call(this, { apiKey, baseUrl, model });

        await Meteor.users.updateAsync(this.userId, {
            $set: {
                'profile.ozwellApiKey': apiKey,
                'profile.ozwellBaseUrl': baseUrl,
                'profile.ozwellModel': model,
                'profile.ozwellEnabled': true,
            }
        });

        return { success: true };
    },

    // Create or get Ozwell workspace for a team
    async getOrCreateOzwellWorkspace(teamId) {
        check(teamId, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Check if user is member of team
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        // Get user's API key
        const user = await Meteor.users.findOneAsync(this.userId);
        const apiKey = user?.profile?.ozwellApiKey;
        if (!apiKey) throw new Meteor.Error('ozwell-error', 'Ozwell API key not configured');

        // Check if workspace already exists for this team
        let workspace = await OzwellWorkspaces.findOneAsync({ teamId });

        if (!workspace) {
            // Create new workspace
            try {
                const response = await axios.post(`${OZWELL_API_BASE}/workspaces/create`, {
                    name: `TimeHarbor - ${team.name}`,
                    metaData: {
                        externalId: teamId,
                        teamName: team.name
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                workspace = {
                    teamId,
                    workspaceId: response.data.workspaceId,
                    name: team.name,
                    createdAt: new Date(),
                    createdBy: this.userId
                };

                workspace._id = await OzwellWorkspaces.insertAsync(workspace);
            } catch (error) {
                console.error('Failed to create Ozwell workspace:', error.response?.data);
                throw new Meteor.Error('ozwell-error', 'Failed to create workspace');
            }
        }

        return workspace;
    },

    // Create or get Ozwell user for current user in workspace
    async getOrCreateOzwellUser(workspaceId) {
        check(workspaceId, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Get user's API key
        const user = await Meteor.users.findOneAsync(this.userId);
        const apiKey = user?.profile?.ozwellApiKey;
        if (!apiKey) throw new Meteor.Error('ozwell-error', 'Ozwell API key not configured');

        // Check if user already exists in this workspace
        let ozwellUser = await OzwellUsers.findOneAsync({
            userId: this.userId,
            workspaceId
        });

        if (!ozwellUser) {
            // Create new user in Ozwell workspace
            try {
                const response = await axios.post(`${OZWELL_API_BASE}/workspaces/${workspaceId}/create-user`, {}, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                ozwellUser = {
                    userId: this.userId,
                    workspaceId,
                    ozwellUserId: response.data.userId,
                    username: user.username,
                    createdAt: new Date()
                };

                ozwellUser._id = await OzwellUsers.insertAsync(ozwellUser);
            } catch (error) {
                console.error('Failed to create Ozwell user:', error.response?.data);
                throw new Meteor.Error('ozwell-error', 'Failed to create user');
            }
        }

        return ozwellUser;
    },

    // Create Ozwell session for user
    async createOzwellSession(teamId, forceNewSession = false) {
        check(teamId, String);
        check(forceNewSession, Boolean);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Get user's API key
        const user = await Meteor.users.findOneAsync(this.userId);
        const apiKey = user?.profile?.ozwellApiKey;
        if (!apiKey) throw new Meteor.Error('ozwell-error', 'Ozwell API key not configured');

        // Get or create workspace
        const workspace = await ozwellMethods.getOrCreateOzwellWorkspace.call(this, teamId);

        // Get or create user
        const ozwellUser = await ozwellMethods.getOrCreateOzwellUser.call(this, workspace.workspaceId);

        // Create user session
        try {
            const response = await axios.post(`${OZWELL_API_BASE}/workspaces/${workspace.workspaceId}/create-user-session`, {
                userId: ozwellUser.ozwellUserId,
                metaData: {
                    createListenSession: true,
                    forceNewSession,
                    embedType: 'iframe-basic'
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                loginUrl: response.data.loginUrl,
                loginToken: response.data.loginToken,
                workspaceId: workspace.workspaceId,
                userId: ozwellUser.ozwellUserId
            };
        } catch (error) {
            console.error('Failed to create Ozwell session:', error.response?.data);
            throw new Meteor.Error('ozwell-error', 'Failed to create session');
        }
    },

    // Get page context for MCP
    async getPageContext(teamId, ticketId = null) {
        check(teamId, String);
        check(ticketId, Match.Maybe(String));
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Get team info
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        const context = {
            team: {
                name: team.name,
                id: team._id,
                memberCount: team.members?.length || 0
            },
            user: {
                username: (await Meteor.users.findOneAsync(this.userId))?.username
            }
        };

        // Add ticket context if provided
        if (ticketId) {
            const ticket = await Tickets.findOneAsync({ _id: ticketId, teamId });
            if (ticket) {
                context.currentTicket = {
                    title: ticket.title,
                    description: ticket.github || '',
                    status: ticket.status || 'active',
                    totalTime: ticket.totalTime || 0
                };
            }
        }

        // Add recent team activity
        const recentTickets = await Tickets.find(
            { teamId },
            { sort: { updatedAt: -1 }, limit: 5 }
        ).fetchAsync();

        context.recentActivity = recentTickets.map(ticket => ({
            title: ticket.title,
            description: ticket.github || '',
            totalTime: ticket.totalTime || 0,
            lastUpdated: ticket.updatedAt
        }));

        return context;
    },

    // Search user's history
    async searchUserHistory(query, teamId = null) {
        check(query, String);
        check(teamId, Match.Maybe(String));
        if (!this.userId) throw new Meteor.Error('not-authorized');

        const searchRegex = new RegExp(query, 'i');
        const filter = { userId: this.userId };

        if (teamId) {
            filter.teamId = teamId;
        }

        // Search in tickets
        const tickets = await Tickets.find({
            ...filter,
            $or: [
                { title: searchRegex },
                { github: searchRegex }
            ]
        }, {
            sort: { updatedAt: -1 },
            limit: 10
        }).fetchAsync();

        // Search in clock events
        const clockEvents = await ClockEvents.find({
            ...filter,
            $or: [
                { 'tickets.title': searchRegex },
                { 'tickets.github': searchRegex }
            ]
        }, {
            sort: { startTime: -1 },
            limit: 10
        }).fetchAsync();

        return {
            tickets: tickets.map(t => ({
                title: t.title,
                description: t.github || '',
                totalTime: t.totalTime || 0,
                date: t.updatedAt || t.createdAt
            })),
            sessions: clockEvents.map(ce => ({
                startTime: ce.startTime,
                endTime: ce.endTime,
                totalTime: ce.totalTime || 0,
                ticketCount: ce.tickets?.length || 0
            }))
        };
    },

    // Search project history
    async searchProjectHistory(query, teamId) {
        check(query, String);
        check(teamId, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Check team membership
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        const searchRegex = new RegExp(query, 'i');

        // Search all team tickets
        const tickets = await Tickets.find({
            teamId,
            $or: [
                { title: searchRegex },
                { github: searchRegex }
            ]
        }, {
            sort: { updatedAt: -1 },
            limit: 15
        }).fetchAsync();

        // Get usernames for context
        const userIds = [...new Set(tickets.map(t => t.userId))];
        const users = await Meteor.users.find(
            { _id: { $in: userIds } },
            { fields: { username: 1 } }
        ).fetchAsync();

        const userMap = {};
        users.forEach(u => userMap[u._id] = u.username);

        return {
            teamName: team.name,
            results: tickets.map(t => ({
                title: t.title,
                description: t.github || '',
                author: userMap[t.userId] || 'Unknown',
                totalTime: t.totalTime || 0,
                date: t.updatedAt || t.createdAt
            }))
        };
    },

    // Save conversation
    async saveOzwellConversation(conversation) {
        check(conversation, Match.ObjectIncluding({
            teamId: String,
            fieldName: String,
            messages: Array,
            metadata: Match.Maybe(Object),
            label: Match.Maybe(String),
            conversationId: Match.Maybe(String)
        }));
        const {
            conversationId = null,
            teamId,
            fieldName,
            messages,
            metadata = {},
            label
        } = conversation;
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Check team membership
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        const sanitizedLabel = (label || metadata?.promptTitle || messages.find(msg => msg.role === 'user')?.content || 'Conversation')
            .toString()
            .substring(0, 120);

        if (conversationId) {
            const existing = await OzwellConversations.findOneAsync({
                _id: conversationId,
                teamId,
                userId: this.userId
            });

            if (!existing) {
                throw new Meteor.Error('not-found', 'Conversation not found');
            }

            await OzwellConversations.updateAsync(conversationId, {
                $set: {
                    messages,
                    metadata,
                    label: sanitizedLabel,
                    updatedAt: new Date()
                }
            });

            return conversationId;
        }

        const doc = {
            teamId,
            fieldName,
            userId: this.userId,
            messages,
            metadata,
            label: sanitizedLabel,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return await OzwellConversations.insertAsync(doc);
    },

    // Get conversation history (metadata only)
    async getOzwellConversations({ teamId, fieldName = null, limit = 10 }) {
        check(teamId, String);
        check(limit, Number);
        check(fieldName, Match.Maybe(String));
        if (!this.userId) throw new Meteor.Error('not-authorized');

        // Check team membership
        const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        const query = { teamId, userId: this.userId };
        if (fieldName) {
            query.fieldName = fieldName;
        }

        return await OzwellConversations.find(query, {
            sort: { updatedAt: -1 },
            limit,
            fields: {
                messages: 0
            }
        }).fetchAsync();
    },

    async getOzwellConversation(conversationId) {
        check(conversationId, String);
        if (!this.userId) throw new Meteor.Error('not-authorized');

        const conversation = await OzwellConversations.findOneAsync({
            _id: conversationId,
            userId: this.userId
        });

        if (!conversation) {
            throw new Meteor.Error('not-found', 'Conversation not found');
        }

        // Ensure user still belongs to the team
        const team = await Teams.findOneAsync({ _id: conversation.teamId, members: this.userId });
        if (!team) throw new Meteor.Error('not-authorized', 'Not a team member');

        return conversation;
    },

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

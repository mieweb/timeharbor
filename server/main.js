import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Tickets, Teams, Sessions, ClockEvents, OzwellPrompts } from '../collections.js';
// Import authentication methods
import { authMethods } from './methods/auth.js';
// Import team methods
import { teamMethods } from './methods/teams.js';
// Import ticket and clock event methods
import { ticketMethods } from './methods/tickets.js';
import { clockEventMethods } from './methods/clockEvents.js';
// Import Ozwell methods
import { ozwellMethods } from './methods/ozwell.js';
import { ozwellPromptMethods } from './methods/ozwellPrompts.js';
import { referenceAssistantMethods } from './methods/referenceAssistant.js';
Meteor.startup(async () => {
  // Code to run on server startup
  if (await Tickets.find().countAsync() === 0) {
    await Tickets.insertAsync({ title: 'Sample Ticket', description: 'This is a sample ticket.', createdAt: new Date() });
  }

  if (await Teams.find().countAsync() === 0) {
    await Teams.insertAsync({ name: 'Sample Team', createdAt: new Date() });
  }

  if (await Sessions.find().countAsync() === 0) {
    await Sessions.insertAsync({ userId: 'sampleUser', startTime: new Date(), endTime: null });
  }
  // Add a code to any existing teams that do not have one
  const teamsWithoutCode = await Teams.find({ code: { $exists: false } }).fetchAsync();
  for (const team of teamsWithoutCode) {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    await Teams.updateAsync(team._id, { $set: { code } });
  }

  // Initialize Ozwell default prompts directly (not as a method call since we're in startup)
  const promptCount = await OzwellPrompts.find().countAsync();
  if (promptCount === 0) {
    const defaultPrompts = [
      {
        id: 'draft-time-entry',
        title: 'Help me draft a time entry',
        description: 'Get assistance writing a detailed time entry for your work',
        template: `Help me write a detailed time entry for my work today. Here's what I'm working on:

Project: {{teamName}}
{{#if currentTicket}}
Current Activity: {{currentTicket.title}}
{{#if currentTicket.description}}
Notes/Reference: {{currentTicket.description}}
{{/if}}
{{/if}}

{{#if recentActivity}}
Recent activities in this project:
{{#each recentActivity}}
- {{title}}{{#if description}} ({{description}}){{/if}}
{{/each}}
{{/if}}

Please help me write a professional time entry that describes what I accomplished, any challenges I faced, and next steps. Make it detailed enough for project tracking but concise for time logging.`,
        category: 'time-tracking',
        contexts: ['ticket-form', 'time-entry'],
        icon: 'clock',
        systemMessage: 'You are a professional time tracking assistant. Help users write clear, detailed time entries that capture their work accomplishments, challenges, and progress. Focus on being specific and actionable.',
        createdAt: new Date()
      },
      {
        id: 'summarize-daily-activity',
        title: 'Summarize my activity today',
        description: 'Create a summary of your work activities for the day',
        template: `Please create a summary of my work activities for today.

Project: {{teamName}}
User: {{user.username}}

{{#if recentActivity}}
Activities worked on:
{{#each recentActivity}}
- {{title}}{{#if description}} - {{description}}{{/if}}
  Time spent: {{totalTime}} seconds
  Last updated: {{lastUpdated}}
{{/each}}
{{/if}}

Please provide:
1. A brief overview of what I accomplished today
2. Key highlights or milestones reached
3. Any blockers or challenges encountered
4. Suggested priorities for tomorrow

Make it suitable for sharing with team members or for personal reflection.`,
        category: 'reporting',
        contexts: ['end-of-day', 'summary'],
        icon: 'chart-bar',
        systemMessage: 'You are a professional work summary assistant. Help users create clear, organized summaries of their daily work that highlight accomplishments, identify challenges, and suggest next steps.',
        createdAt: new Date()
      },
      {
        id: 'improve-activity-description',
        title: 'Improve my activity description',
        description: 'Get help making your activity description more clear and detailed',
        template: `Please help me improve this activity description:

Current text: "{{currentText}}"

{{#if currentTicket}}
Activity: {{currentTicket.title}}
{{/if}}
Project: {{teamName}}

Please help me:
1. Make the description more clear and specific
2. Add relevant technical details if appropriate
3. Ensure it's useful for future reference
4. Make it professional and well-structured

Keep the core meaning but enhance clarity, detail, and usefulness for project tracking.`,
        category: 'writing',
        contexts: ['ticket-form', 'note-taking'],
        icon: 'pencil',
        systemMessage: 'You are a professional writing assistant specializing in technical documentation. Help users write clear, detailed, and well-structured activity descriptions that are useful for project tracking and future reference.',
        createdAt: new Date()
      }
    ];

    for (const prompt of defaultPrompts) {
      await OzwellPrompts.insertAsync(prompt);
    }

    console.log('Initialized', defaultPrompts.length, 'default Ozwell prompts');
  }
});

Meteor.publish('userTeams', function () {
  // Only publish teams the user is a member of
  return Teams.find({ members: this.userId });
});

Meteor.publish('teamDetails', function (teamId) {
  // Only publish team details if the user is a member
  return Teams.find({ _id: teamId, members: this.userId });
});

Meteor.publish('teamMembers', async function (teamIds) {
  check(teamIds, [String]);
  // Only allow if user is a member of all requested teams
  const teams = await Teams.find({ _id: { $in: teamIds }, members: this.userId }).fetchAsync();
  const userIds = Array.from(new Set(teams.flatMap(team => team.members)));
  return Meteor.users.find({ _id: { $in: userIds } }, { fields: { username: 1 } });
});

Meteor.publish('teamTickets', function (teamIds) {
  check(teamIds, [String]);
  // Only publish tickets for this team that were created by the current user
  return Tickets.find({ teamId: { $in: teamIds }, createdBy: this.userId });
});

Meteor.publish('clockEventsForUser', function () {
  if (!this.userId) return this.ready();
  // Only publish this user's own clock events
  return ClockEvents.find({ userId: this.userId });
});

Meteor.publish('clockEventsForTeams', async function (teamIds) {
  check(teamIds, [String]);
  // Only publish clock events for teams the user leads
  const leaderTeams = await Teams.find({ leader: this.userId, _id: { $in: teamIds } }).fetchAsync();
  const allowedTeamIds = leaderTeams.map(t => t._id);
  return ClockEvents.find({ teamId: { $in: allowedTeamIds } });
});

Meteor.publish('usersByIds', async function (userIds) {
  check(userIds, [String]);
  // Only publish users that are in teams the current user is a member or leader of
  const userTeams = await Teams.find({ $or: [{ members: this.userId }, { leader: this.userId }] }).fetchAsync();
  const allowedUserIds = Array.from(new Set(userTeams.flatMap(team => team.members.concat([team.leader]))));
  const filteredUserIds = userIds.filter(id => allowedUserIds.includes(id));
  return Meteor.users.find({ _id: { $in: filteredUserIds } }, { fields: { username: 1 } });
});

Meteor.methods({
  ...authMethods,
  ...teamMethods,
  ...ticketMethods,
  ...clockEventMethods,
  ...ozwellMethods,
  ...ozwellPromptMethods,
  ...referenceAssistantMethods,

  'participants.create'(name) {
    check(name, String);
    // Logic to create a participant account
    console.log(`Creating participant with name: ${name}`);
    Accounts.createUser({ username: name });
  },
});

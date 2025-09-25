import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { OzwellPrompts } from '../../collections.js';

export const ozwellPromptMethods = {
    // Get all available prompts
    async getOzwellPrompts() {
        if (!this.userId) throw new Meteor.Error('not-authorized');

        return await OzwellPrompts.find({}).fetchAsync();
    },

    // Initialize default prompts (called on startup)
    async initializeDefaultPrompts() {
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
                    id: 'cross-link-related-work',
                    title: 'Find related work and cross-links',
                    description: 'Analyze current work and suggest connections to related activities',
                    template: `I'm working on: "{{currentText}}"

Project context:
{{#if currentTicket}}
Current Activity: {{currentTicket.title}}
{{#if currentTicket.description}}
Description: {{currentTicket.description}}
{{/if}}
{{/if}}

Project: {{teamName}}

{{#if recentActivity}}
Other recent activities in this project:
{{#each recentActivity}}
- {{title}}{{#if description}} ({{description}}){{/if}}
{{/each}}
{{/if}}

Please help me:
1. Identify connections between my current work and other activities
2. Suggest relevant cross-references or links to include
3. Recommend related work that might be helpful to reference
4. Improve the description to better connect with existing project work

Focus on making my work more discoverable and connected to the broader project context.`,
                    category: 'organization',
                    contexts: ['ticket-form', 'note-taking'],
                    icon: 'link',
                    systemMessage: 'You are a project organization assistant. Help users connect their current work to related activities, suggest meaningful cross-references, and improve project coherence through better linking and categorization.',
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
                },
                {
                    id: 'plan-work-session',
                    title: 'Help me plan my work session',
                    description: 'Get assistance planning and organizing your upcoming work',
                    template: `Help me plan my work session for {{teamName}}.

{{#if currentTicket}}
I'm planning to work on: {{currentTicket.title}}
{{#if currentTicket.description}}
Current notes: {{currentTicket.description}}
{{/if}}
{{/if}}

{{#if recentActivity}}
Recent project activities:
{{#each recentActivity}}
- {{title}}{{#if description}} ({{description}}){{/if}}
{{/each}}
{{/if}}

Please help me:
1. Break down the work into manageable tasks
2. Suggest a logical order for completing tasks
3. Identify potential challenges or dependencies
4. Recommend time estimates for different parts
5. Suggest any preparatory work or research needed

Focus on creating a clear, actionable plan that will help me work efficiently and track progress.`,
                    category: 'planning',
                    contexts: ['session-start', 'ticket-form'],
                    icon: 'clipboard-list',
                    systemMessage: 'You are a work planning assistant. Help users break down their work into manageable tasks, organize them logically, and create actionable plans that improve productivity and progress tracking.',
                    createdAt: new Date()
                }
            ];

            for (const prompt of defaultPrompts) {
                await OzwellPrompts.insertAsync(prompt);
            }

            console.log('Initialized', defaultPrompts.length, 'default Ozwell prompts');
        }
    }
};
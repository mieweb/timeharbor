import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';

import './OzwellModal.html';

const DEFAULT_SYSTEM_MESSAGE = 'You are a helpful assistant for time tracking and project management.';
const ENABLE_RECENT_CHATS = false;

const FALLBACK_PROMPTS = [
    {
        id: 'ticket-title',
        title: 'Write ticket title',
        description: 'Create a clear, concise ticket title',
        icon: 'pencil',
        template: 'Based on this work: "{{currentText}}" in project "{{teamName}}", create a professional ticket title that clearly describes what was accomplished. Make it concise and specific.',
        systemMessage: 'You are a project management assistant. Create clear, professional ticket titles for time tracking entries.'
    },
    {
        id: 'ticket-description',
        title: 'Write ticket description',
        description: 'Generate detailed work description',
        icon: 'chart-bar',
        template: 'Project: {{teamName}}\nCurrent work notes: "{{currentText}}"\nRecent activity: {{recentActivitySummary}}\n\nPlease write a detailed ticket description that explains what was accomplished, including technical details and business value. Format it professionally.',
        systemMessage: 'You are a technical documentation assistant. Write clear, detailed descriptions of development work for time tracking and project management.'
    },
    {
        id: 'daily-summary',
        title: 'Daily work summary',
        description: 'Summarize daily progress',
        icon: 'clock',
        template: 'Project: {{teamName}}\nToday\'s work: "{{currentText}}"\nTime spent: {{totalTimeToday}}\nRecent tickets: {{recentActivitySummary}}\n\nCreate a professional daily summary of work accomplished, highlighting key achievements and progress made.',
        systemMessage: 'You are a productivity assistant. Create concise daily work summaries for time tracking and reporting.'
    },
    {
        id: 'status-update',
        title: 'Project status update',
        description: 'Generate project status report',
        icon: 'link',
        template: 'Project: {{teamName}}\nCurrent progress: "{{currentText}}"\nRecent work: {{recentActivitySummary}}\nTotal time invested: {{totalProjectTime}}\n\nGenerate a professional status update for stakeholders, highlighting progress, current state, and next steps.',
        systemMessage: 'You are a project communication specialist. Create clear status updates for stakeholders and team members.'
    }
];

Template.ozwellModal.onCreated(function () {
    const template = this;

    template.isOzwellOpen = new ReactiveVar(false);
    template.selectedPrompt = new ReactiveVar(null);
    template.availablePrompts = new ReactiveVar([]);
    template.currentContext = new ReactiveVar(null);
    template.currentInputElement = new ReactiveVar(null);
    template.currentTeamId = new ReactiveVar(null);
    template.messages = new ReactiveVar([]);
    template.composerText = new ReactiveVar('');
    template.contextSummary = new ReactiveVar('');
    template.systemMessage = new ReactiveVar(DEFAULT_SYSTEM_MESSAGE);
    template.generatedContent = new ReactiveVar(null);
    template.canSave = new ReactiveVar(false);
    template.isGenerating = new ReactiveVar(false);
    template.errorMessage = new ReactiveVar(null);
    template.headerSubtitle = new ReactiveVar('Ready to help with your work.');
    template.suggestions = new ReactiveVar([]);
    template.selectedSuggestionIndex = new ReactiveVar(0);
    template.layoutMode = new ReactiveVar('modal'); // modal | sidecar
    template.summaryVisible = new ReactiveVar(false);
    template.recentConversations = new ReactiveVar([]);
    template.currentConversationId = new ReactiveVar(null);
    template.conversationLabel = new ReactiveVar('');
    template.currentFieldName = new ReactiveVar('general');
    template.useMcpMode = new ReactiveVar(false); // NOTE(uid_future-mcp): MCP toggle currently drives a stub transport; see comments below.

    // Expose template instance for global access
    window.ozwellModalInstance = template;

    const replaceTemplateVariables = (text = '', context = {}) => {
        if (!text) return '';

        return text
            .replace(/\{\{teamName\}\}/g, context.teamName || 'Current Project')
            .replace(/\{\{currentText\}\}/g, context.currentText || '')
            .replace(/\{\{recentActivitySummary\}\}/g, context.recentActivitySummary || 'No recent activity')
            .replace(/\{\{totalTimeToday\}\}/g, context.projectStats?.formattedTimeToday || '0m')
            .replace(/\{\{totalProjectTime\}\}/g, context.projectStats?.formattedProjectTime || '0m');
    };

    const buildContextSummary = (context = {}) => {
        const summary = [];

        if (context.teamName) {
            summary.push(`Project: ${context.teamName}`);
        }

        if (context.user?.username) {
            summary.push(`User: ${context.user.username}`);
        }

        if (context.currentTicket?.title) {
            summary.push(`Current Activity: ${context.currentTicket.title}`);
            if (context.currentTicket.description) {
                summary.push(`Details: ${context.currentTicket.description}`);
            }
        }

        if (context.projectStats?.formattedProjectTime) {
            summary.push(`Total time on project: ${context.projectStats.formattedProjectTime}`);
        }

        if (context.projectStats?.formattedTimeToday) {
            summary.push(`Time spent today: ${context.projectStats.formattedTimeToday}`);
        }

        if (context.recentActivity && Array.isArray(context.recentActivity) && context.recentActivity.length > 0) {
            summary.push('Recent Activity:');
            context.recentActivity.forEach((item) => {
                const pieces = [`- ${item.title}`];
                if (item.formattedTime) {
                    pieces.push(` (${item.formattedTime})`);
                }
                if (item.description) {
                    pieces.push(` – ${item.description}`);
                }
                summary.push(pieces.join(''));
            });
        }

        if (context.currentText) {
            summary.push(`Current input: ${context.currentText}`);
        }

        if (context.relatedFields && typeof context.relatedFields === 'object') {
            const relatedLines = Object.entries(context.relatedFields)
                .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
                .map(([key, value]) => `• ${key}: ${value}`);
            if (relatedLines.length > 0) {
                summary.push('Other form values:');
                summary.push(...relatedLines);
            }
        }

        return summary.length > 0 ? summary.join('\n') : 'No additional project context provided.';
    };

    const addMessage = (message) => {
        const history = template.messages.get();
        template.messages.set([...history, { ...message, createdAt: new Date() }]);
    };

    const stripQuotes = (value = '') => value.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').trim();

    const extractSuggestions = (text = '') => {
        if (!text) return [];

        const bulletRegex = /(?:^|\n)\s*(?:\d+\.|[-*•])\s+([\s\S]*?)(?=(?:\n\s*(?:\d+\.|[-*•])\s+)|$)/g;
        const collectBullets = (source = '') => {
            const results = [];
            let match;
            while ((match = bulletRegex.exec(source)) !== null) {
                const suggestion = stripQuotes(match[1]);
                if (suggestion) {
                    results.push(suggestion);
                }
            }
            return results;
        };

        const bullets = collectBullets(text);
        if (bullets.length > 0) {
            return bullets;
        }

        const rawParagraphs = text.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
        const paragraphs = rawParagraphs.filter((part, index) => {
            if (index === 0 && /:\s*$/.test(part)) {
                return false;
            }
            if (index === rawParagraphs.length - 1 && part.toLowerCase().startsWith('feel free')) {
                return false;
            }
            return true;
        });

        const expanded = [];
        paragraphs.forEach((part) => {
            const innerBullets = collectBullets(part);
            if (innerBullets.length > 0) {
                expanded.push(...innerBullets);
            } else {
                const stripped = stripQuotes(part);
                if (stripped) {
                    expanded.push(stripped);
                }
            }
        });

        const uniqueExpanded = expanded.filter((value, index, arr) => arr.indexOf(value) === index);

        if (uniqueExpanded.length > 1) {
            return uniqueExpanded;
        }

        return [];
    };

    const buildServerMessages = () => {
        const messages = [];
        const baseSystemMessage = template.systemMessage.get();
        const summary = template.contextSummary.get();

        if (baseSystemMessage) {
            messages.push({
                role: 'system',
                content: `${baseSystemMessage}\nInstructions: Provide only polished, ready-to-paste suggestions. Avoid Markdown, template placeholders, or meta commentary. If generating multiple options, return each as its own numbered bullet.`
            });
        }

        if (summary) {
            messages.push({ role: 'system', content: `Project context:\n${summary}` });
        }

        template.messages.get().forEach((msg) => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({ role: msg.role, content: msg.content });
            }
        });

        return messages;
    };

    const buildMessagesForPrompt = (promptText) => {
        const contextSummary = buildContextSummary(template.currentContext.get() || {});
        const system = template.systemMessage.get() || DEFAULT_SYSTEM_MESSAGE;
        const msgs = [];
        msgs.push({
            role: 'system',
            content: `${system}\nInstructions: Provide only polished, ready-to-paste suggestions. Avoid Markdown, template placeholders, or meta commentary.`
        });
        if (contextSummary) {
            msgs.push({ role: 'system', content: `Project context:\n${contextSummary}` });
        }
        msgs.push({ role: 'user', content: promptText });
        return msgs;
    };

    const callReferenceAssistant = (payload) => new Promise((resolve, reject) => {
        Meteor.call('callReferenceAssistant', payload, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });

    template.resetConversation = function () {
        template.messages.set([]);
        template.composerText.set('');
        template.contextSummary.set('');
        template.systemMessage.set(DEFAULT_SYSTEM_MESSAGE);
        template.generatedContent.set(null);
        template.canSave.set(false);
        template.isGenerating.set(false);
        template.errorMessage.set(null);
        template.suggestions.set([]);
        template.selectedSuggestionIndex.set(0);
        template.summaryVisible.set(false);
        if (ENABLE_RECENT_CHATS) {
            template.currentConversationId.set(null);
            template.conversationLabel.set('');
        }
        template.useMcpMode.set(false);
    };

    template.performAutofill = function ({ closeModal = true } = {}) {
        const content = template.generatedContent.get();
        const inputElement = template.currentInputElement.get();

        if (!content) {
            alert('No assistant content is available yet. Generate a suggestion first.');
            return;
        }

        if (!inputElement) {
            alert('Unable to find the original input field to update.');
            return;
        }

        if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
            inputElement.value = content;
        } else if (inputElement.contentEditable === 'true') {
            inputElement.textContent = content;
        }

        const inputEvent = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        inputElement.dispatchEvent(changeEvent);
        inputElement.focus();

        if (closeModal) {
            template.closeModal();
        }
    };

    template.closeModal = function () {
        template.isOzwellOpen.set(false);
        template.selectedPrompt.set(null);
        template.resetConversation();
        template.currentInputElement.set(null);
        template.currentContext.set(null);
        template.currentTeamId.set(null);
        template.headerSubtitle.set('Ready to help with your work.');
        template.layoutMode.set('modal');
        template.teardownMcpBridge();
    };

    template.loadPrompts = function () {
        Meteor.call('getOzwellPrompts', (err, prompts) => {
            if (!err && prompts) {
                template.availablePrompts.set(prompts);
            } else {
                template.availablePrompts.set(FALLBACK_PROMPTS);
            }
        });
    };

    template.openOzwell = function (inputElement, context = {}) {
        const user = Meteor.user();
        if (!user?.profile?.ozwellEnabled) {
            alert('Please configure Ozwell in your settings first.');
            return;
        }

        template.selectedPrompt.set(null);
        template.resetConversation();
        template.currentInputElement.set(inputElement);
        template.currentContext.set(context);
        template.currentTeamId.set(context.teamId || null);
        template.currentFieldName.set(context.fieldName || 'general');
        template.headerSubtitle.set(context.teamName ? `Project: ${context.teamName}` : 'Ready to help with your work.');
        template.isOzwellOpen.set(true);
        template.layoutMode.set('modal');
        if (ENABLE_RECENT_CHATS) {
            template.loadRecentConversations();
        }
    };

    template.initializeConversation = async function (prompt) {
        template.selectedPrompt.set(prompt);
        const context = template.currentContext.get() || {};
        const processedPrompt = replaceTemplateVariables(prompt?.template || prompt?.title || '', context);
        const fallbackPrompt = context.currentText || 'Help me refine this note.';
        const userMessage = processedPrompt && processedPrompt.trim().length > 0 ? processedPrompt : fallbackPrompt;

        template.systemMessage.set(prompt?.systemMessage || DEFAULT_SYSTEM_MESSAGE);
        template.contextSummary.set(buildContextSummary(context));
        template.messages.set([]);
        template.generatedContent.set(null);
        template.canSave.set(false);
        template.errorMessage.set(null);
        if (ENABLE_RECENT_CHATS) {
            template.currentConversationId.set(null);
            const promptTitle = prompt?.title || '';
            const userPreview = userMessage.replace(/\s+/g, ' ').trim().substring(0, 60);
            let conversationLabel = userPreview || promptTitle || 'Conversation';

            if (promptTitle && userPreview && prompt?.id !== 'custom') {
                conversationLabel = `${promptTitle} — ${userPreview}`.substring(0, 120);
            }

            template.conversationLabel.set(conversationLabel);
        }

        if (prompt?.title) {
            template.headerSubtitle.set(prompt.title);
        }

        await template.sendChatMessage(userMessage);
    };

    template.sendChatMessage = async function (content) {
        const trimmed = (content || '').trim();
        if (!trimmed) return;
        if (template.isGenerating.get()) return;

        addMessage({ role: 'user', content: trimmed });
        template.composerText.set('');
        template.isGenerating.set(true);
        template.canSave.set(false);
        template.errorMessage.set(null);
        template.suggestions.set([]);
        template.selectedSuggestionIndex.set(0);
        template.generatedContent.set(null);
        template.summaryVisible.set(false);
        if (ENABLE_RECENT_CHATS && !template.conversationLabel.get()) {
            template.conversationLabel.set(trimmed.substring(0, 60));
        }

        const metadata = {
            teamId: template.currentTeamId.get(),
            promptId: template.selectedPrompt.get()?.id,
        };

        try {
            const messages = buildServerMessages();
            const result = await callReferenceAssistant({
                messages,
                metadata,
            });

            const assistantContent = result?.content;
            if (assistantContent) {
                addMessage({ role: 'assistant', content: assistantContent });
                const suggestions = extractSuggestions(assistantContent.trim());
                if (suggestions.length > 0) {
                    template.suggestions.set(suggestions);
                    template.selectedSuggestionIndex.set(0);
                    template.generatedContent.set(suggestions[0]);
                } else {
                    template.suggestions.set([]);
                    template.selectedSuggestionIndex.set(0);
                    template.generatedContent.set(assistantContent.trim());
                }

                template.canSave.set(true);
                if (ENABLE_RECENT_CHATS) {
                    template.persistConversation();
                }
            } else {
                template.errorMessage.set('The assistant returned no content. Please try again.');
            }
        } catch (error) {
            console.error('Failed to generate content from reference server:', error);
        template.errorMessage.set(error?.reason || 'Failed to generate content. Please try again.');
    } finally {
        template.isGenerating.set(false);
    }
};

    template.loadRecentConversations = function () {
        if (!ENABLE_RECENT_CHATS) return;
        const teamId = template.currentTeamId.get();
        const fieldName = template.currentFieldName.get();
        if (!teamId) {
            template.recentConversations.set([]);
            return;
        }

        Meteor.call('getOzwellConversations', { teamId, fieldName, limit: 5 }, (err, conversations) => {
            if (err) {
                console.error('Failed to load Ozwell conversations:', err);
                template.recentConversations.set([]);
            } else {
                template.recentConversations.set(conversations || []);
            }
        });
    };

    template.resumeConversation = function (conversationId) {
        if (!ENABLE_RECENT_CHATS) return;
        Meteor.call('getOzwellConversation', conversationId, (err, conversation) => {
            if (err || !conversation) {
                console.error('Failed to load conversation:', err);
                return;
            }

            template.systemMessage.set(conversation.metadata?.systemMessage || DEFAULT_SYSTEM_MESSAGE);
            template.messages.set(conversation.messages || []);
            template.generatedContent.set(null);
            template.suggestions.set([]);
            template.selectedSuggestionIndex.set(0);
            template.contextSummary.set(buildContextSummary(template.currentContext.get() || {}));
            template.canSave.set(conversation.messages?.some(msg => msg.role === 'assistant') || false);
            template.currentConversationId.set(conversation._id);
            template.conversationLabel.set(conversation.label || conversation.metadata?.promptTitle || 'Conversation');
            template.summaryVisible.set(false);

            const promptMeta = conversation.metadata?.promptTitle ? {
                id: conversation.metadata?.promptId || 'existing',
                title: conversation.metadata?.promptTitle,
                systemMessage: conversation.metadata?.systemMessage || DEFAULT_SYSTEM_MESSAGE
            } : template.selectedPrompt.get();

            template.selectedPrompt.set(promptMeta || {
                id: 'existing',
                title: conversation.label || 'Previous Conversation',
                systemMessage: conversation.metadata?.systemMessage || DEFAULT_SYSTEM_MESSAGE
            });
        });
    };

    template.persistConversation = function () {
        if (!ENABLE_RECENT_CHATS) return;
        const teamId = template.currentTeamId.get();
        const fieldName = template.currentFieldName.get();
        if (!teamId || !fieldName) return;

        const messages = template.messages.get();
        if (!messages || messages.length === 0) return;

        let label = template.conversationLabel.get();
        if (!label) {
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            if (firstUserMessage?.content) {
                label = firstUserMessage.content.substring(0, 120);
                template.conversationLabel.set(label);
            } else {
                label = 'Conversation';
            }
        }

        const payload = {
            conversationId: template.currentConversationId.get(),
            teamId,
            fieldName,
            messages,
            metadata: {
                promptId: template.selectedPrompt.get()?.id,
                promptTitle: template.selectedPrompt.get()?.title,
                systemMessage: template.systemMessage.get()
            },
            label
        };

        if (!payload.conversationId) {
            delete payload.conversationId;
        }

        Meteor.call('saveOzwellConversation', payload, (err, savedId) => {
            if (err) {
                console.error('Failed to save conversation:', err);
                return;
            }

            if (savedId) {
                template.currentConversationId.set(savedId);
                template.loadRecentConversations();
            }
        });
    };

        template.setupMcpBridge = function () {
            if (template.mcpListener) return;

            template.mcpListener = function (event) {
                const data = event.data;
                if (!data || data.source !== 'ozwell-mcp-frame') return;

                const iframe = document.getElementById('ozwell-mcp-frame');
                if (!iframe || !iframe.contentWindow) return;

                const reply = (message) => {
                    iframe.contentWindow.postMessage({ source: 'ozwell-modal-bridge', ...message }, '*');
                };

                // NOTE(uid_future-mcp): This handler does NOT implement the real MCP spec. It simply
                // proxies the iframe's prompt string directly to callReferenceAssistant, and wraps the
                // REST response in a minimal model-response shape. When the reference server (or Ozwell)
                // exposes true MCP endpoints, replace this stub with actual MCP serialization.
                if (data.type === 'client-hello') {
                    const summary = buildContextSummary(template.currentContext.get() || {});
                    reply({ type: 'mcp-ready', contextSummary: summary });
                    return;
                }

            if (data.type === 'model-request') {
                const promptText = data.payload?.prompt || '';
                if (!promptText) {
                    reply({ type: 'model-error', error: 'Empty prompt' });
                    return;
                }

                const messages = buildMessagesForPrompt(promptText);
                const metadata = {
                    teamId: template.currentTeamId.get(),
                    promptId: template.selectedPrompt.get()?.id,
                    transport: 'mcp-frame'
                };

                Meteor.call('callReferenceAssistant', { messages, metadata }, (err, result) => {
                    if (err) {
                        reply({ type: 'model-error', error: err.reason || err.message || 'Unknown error' });
                    } else {
                        reply({ type: 'model-response', payload: { content: result?.content || '' } });
                    }
                });
            }
        };

        window.addEventListener('message', template.mcpListener);
    };

    template.teardownMcpBridge = function () {
        if (template.mcpListener) {
            window.removeEventListener('message', template.mcpListener);
            template.mcpListener = null;
        }
    };

    template.autorun(() => {
        const useMcp = template.useMcpMode.get();
        if (useMcp) {
            template.setupMcpBridge();
        } else {
            template.teardownMcpBridge();
        }
    });

    template.loadPrompts();
});

Template.ozwellModal.helpers({
    isOzwellOpen() {
        return Template.instance().isOzwellOpen.get();
    },
    selectedPrompt() {
        return Template.instance().selectedPrompt.get();
    },
    availablePrompts() {
        return Template.instance().availablePrompts.get();
    },
    messages() {
        return Template.instance().messages.get();
    },
    layoutIsSidecar() {
        return Template.instance().layoutMode.get() === 'sidecar';
    },
    summaryVisible() {
        return Template.instance().summaryVisible.get();
    },
    useMcpMode() {
        return Template.instance().useMcpMode.get();
    },
    recentConversations() {
        return ENABLE_RECENT_CHATS ? Template.instance().recentConversations.get() : [];
    },
    hasRecentConversations() {
        return ENABLE_RECENT_CHATS && Template.instance().recentConversations.get().length > 0;
    },
    recentsEnabled() {
        return ENABLE_RECENT_CHATS;
    },
    composerText() {
        return Template.instance().composerText.get();
    },
    composerDisabled() {
        const instance = Template.instance();
        return instance.isGenerating.get() ? 'disabled' : null;
    },
    sendDisabled() {
        const instance = Template.instance();
        return instance.isGenerating.get() ? 'disabled' : null;
    },
    contextSummary() {
        return Template.instance().contextSummary.get();
    },
    headerSubtitle() {
        return Template.instance().headerSubtitle.get();
    },
    isGenerating() {
        return Template.instance().isGenerating.get();
    },
    showEmptyState() {
        const instance = Template.instance();
        return instance.messages.get().length === 0 && instance.isGenerating.get();
    },
    suggestions() {
        const instance = Template.instance();
        return instance.suggestions.get().map((text, index) => ({ text, index }));
    },
    suggestionsAvailable() {
        return Template.instance().suggestions.get().length > 0;
    },
    suggestionMaxHeight() {
        const instance = Template.instance();
        return instance.layoutMode.get() === 'sidecar' ? '12rem' : '8rem';
    },
    messageWrapperClass(role) {
        return role === 'user' ? 'justify-end' : 'justify-start';
    },
    messageBubbleClass(role) {
        return role === 'user'
            ? 'bg-primary text-white'
            : 'bg-base-200 text-base-content';
    },
    insertDisabled() {
        const instance = Template.instance();
        return instance.canSave.get() && !instance.isGenerating.get() ? '' : 'disabled';
    },
    saveDisabled() {
        const instance = Template.instance();
        return instance.canSave.get() && !instance.isGenerating.get() ? '' : 'disabled';
    },
    errorMessage() {
        return Template.instance().errorMessage.get();
    },
    eq(a, b) {
        return a === b;
    },
    checked(index) {
        return Template.instance().selectedSuggestionIndex.get() === index ? 'checked' : '';
    },
    isCurrentConversation(conversationId) {
        return Template.instance().currentConversationId.get() === conversationId;
    },
    formatConversationTimestamp(timestamp, label) {
        if (!timestamp) return label || '';
        const date = new Date(timestamp);
        const formatted = date.toLocaleString();
        if (!label) {
            return formatted;
        }
        return `${formatted}\n${label}`;
    }
});

Template.ozwellModal.events({
    'click #ozwell-close'(event, template) {
        template.closeModal();
    },
    'click #ozwell-toggle-layout'(event, template) {
        event.preventDefault();
        const next = template.layoutMode.get() === 'sidecar' ? 'modal' : 'sidecar';
        template.layoutMode.set(next);
    },
    'click #ozwell-toggle-mode'(event, template) {
        event.preventDefault();
        const next = !template.useMcpMode.get();
        template.useMcpMode.set(next);
    },
    'click #toggle-context'(event, template) {
        event.preventDefault();
        template.summaryVisible.set(!template.summaryVisible.get());
    },
    'click .resume-conversation'(event, template) {
        if (!ENABLE_RECENT_CHATS) return;
        event.preventDefault();
        const conversationId = event.currentTarget.getAttribute('data-id');
        if (conversationId) {
            template.resumeConversation(conversationId);
        }
    },
    'click #ozwell-new-chat'(event, template) {
        if (!ENABLE_RECENT_CHATS) return;
        event.preventDefault();
        template.resetConversation();
        template.selectedPrompt.set(null);
        template.loadRecentConversations();
    },
    'click #ozwell-backdrop'(event, template) {
        if (event.target.id === 'ozwell-backdrop') {
            template.closeModal();
        }
    },
    'click #ozwell-cancel'(event, template) {
        template.closeModal();
    },
    'click .prompt-btn'(event, template) {
        event.preventDefault();
        const promptId = event.currentTarget.getAttribute('data-prompt-id');
        const prompts = template.availablePrompts.get();
        const selectedPrompt = prompts.find((prompt) => prompt.id === promptId);

        if (selectedPrompt) {
            template.selectedPrompt.set(selectedPrompt);
            template.initializeConversation(selectedPrompt);
        }
    },
    'click #use-custom-prompt'(event, template) {
        event.preventDefault();
        const customPrompt = {
            id: 'custom',
            title: 'Custom Prompt',
            template: 'Current text: "{{currentText}}"\n\nProject: {{teamName}}\n\nPlease help me improve this content.',
            systemMessage: 'You are a helpful writing assistant. Help the user improve their content while maintaining their intended meaning.'
        };

        template.selectedPrompt.set(customPrompt);
        template.initializeConversation(customPrompt);
    },
    'submit #ozwell-composer'(event, template) {
        event.preventDefault();
        if (template.isGenerating.get()) return;

        const text = template.composerText.get();
        template.sendChatMessage(text);
    },
    'input #ozwell-message-input'(event, template) {
        template.composerText.set(event.target.value);
    },
    'keydown #ozwell-message-input'(event, template) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (template.isGenerating.get()) return;
            const value = event.target.value;
            template.sendChatMessage(value);
            event.target.value = '';
            template.composerText.set('');
        }
    },
    'click #ozwell-insert'(event, template) {
        event.preventDefault();
        if (template.canSave.get()) {
            template.performAutofill({ closeModal: false });
        }
    },
    'click #ozwell-save-close'(event, template) {
        event.preventDefault();
        if (template.canSave.get()) {
            template.performAutofill({ closeModal: true });
        }
    },
    'change input[name="ozwell-suggestion"]'(event, template) {
        const index = Number(event.target.value);
        const suggestions = template.suggestions.get();
        if (!Number.isNaN(index) && suggestions[index]) {
            template.selectedSuggestionIndex.set(index);
            template.generatedContent.set(suggestions[index]);
            template.canSave.set(true);
        }
    }
});

Template.ozwellModal.onDestroyed(function () {
    if (window.ozwellModalInstance === this) {
        window.ozwellModalInstance = null;
    }
});

window.openOzwell = function (inputElement, context = {}) {
    if (window.ozwellModalInstance) {
        window.ozwellModalInstance.openOzwell(inputElement, context);
    } else {
        console.error('Ozwell modal not available');
    }
};

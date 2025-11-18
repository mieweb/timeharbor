/**
 * Ozwell MCP Tools for TimeHarbor
 * Provides tools for the AI assistant to interact with ticket forms and retrieve history
 */

// MCP Tools Definitions (OpenAI function calling format)
const mcpTools = [
  {
    type: 'function',
    function: {
      name: 'get_current_ticket_form',
      description: 'Retrieves the current values from all ticket form fields (title, description, team). Use this when the user asks what is currently filled in or to check current values.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_ticket_title',
      description: 'Updates the title field of the current ticket form',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The new title for the ticket'
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_ticket_description',
      description: 'Updates the description/reference notes field of the current ticket form',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The new description/reference notes for the ticket'
          }
        },
        required: ['description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_history',
      description: 'Retrieves recent tickets for the current project/team to provide context about past work',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look back (default: 7)',
            default: 7
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tickets to retrieve (default: 20)',
            default: 20
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_time_stats',
      description: 'Gets time statistics for the current project (total time spent, number of tickets). Use this when the user asks about time spent, hours logged, or time tracking.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look back (default: 30)',
            default: 30
          }
        },
        required: []
      }
    }
  }
];

// Add tools to OzwellChatConfig (widget reads from here)
if (window.OzwellChatConfig) {
  window.OzwellChatConfig.tools = mcpTools;
  console.log('[MCP Tools] Added', mcpTools.length, 'tools to OzwellChatConfig:', mcpTools.map(t => t.function.name).join(', '));
} else {
  console.error('[MCP Tools] window.OzwellChatConfig not found! Tools will not be available.');
}

// Tool Handler Functions
const toolHandlers = {
  get_current_ticket_form: async (params) => {
    const titleInput = document.querySelector('[name="title"]');
    const descInput = document.querySelector('[name="github"]');
    const teamSelect = document.querySelector('#teamSelect');

    const result = {
      success: true,
      data: {
        title: titleInput?.value || '',
        description: descInput?.value || '',
        team: teamSelect?.value || '',
        teamName: teamSelect?.selectedOptions[0]?.text || 'No team selected'
      },
      message: 'Retrieved current ticket form values'
    };

    console.log('[MCP Tools] get_current_ticket_form result:', result);
    return result;
  },

  update_ticket_title: async (params) => {
    const titleInput = document.querySelector('[name="title"]');
    if (!titleInput) {
      return { success: false, error: 'Title input field not found' };
    }

    titleInput.value = params.title;

    // Trigger change event for any listeners
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Sync state with widget
    if (window.ozwellStateSync) {
      window.ozwellStateSync.syncCurrentState();
    }

    return {
      success: true,
      message: `Title updated to: ${params.title}`
    };
  },

  update_ticket_description: async (params) => {
    const descInput = document.querySelector('[name="github"]');
    if (!descInput) {
      return { success: false, error: 'Description input field not found' };
    }

    descInput.value = params.description;

    // Trigger change event for any listeners
    descInput.dispatchEvent(new Event('input', { bubbles: true }));
    descInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Sync state with widget
    if (window.ozwellStateSync) {
      window.ozwellStateSync.syncCurrentState();
    }

    return {
      success: true,
      message: `Description updated`
    };
  },

  get_project_history: async (params) => {
    // Get current team ID from the page
    const teamSelect = document.querySelector('#teamSelect');
    if (!teamSelect || !teamSelect.value) {
      return {
        success: false,
        error: 'No team selected. Please select a team first.'
      };
    }

    const teamId = teamSelect.value;
    // Convert to numbers (model might send as strings)
    const days = params.days ? Number(params.days) : 30;
    const limit = params.limit ? Number(params.limit) : 20;

    try {
      // Call Meteor method to get project history
      const history = await new Promise((resolve, reject) => {
        Meteor.call('getRecentProjectTickets', { teamId, days, limit }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      return {
        success: true,
        tickets: history,
        message: `Retrieved ${history.length} recent tickets from the last ${days} days`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve project history: ${error.message}`
      };
    }
  },

  get_project_time_stats: async (params) => {
    // Get current team ID from the page
    const teamSelect = document.querySelector('#teamSelect');
    if (!teamSelect || !teamSelect.value) {
      return {
        success: false,
        error: 'No team selected. Please select a team first.'
      };
    }

    const teamId = teamSelect.value;
    // Convert days to number (model might send as string)
    const days = params.days ? Number(params.days) : 30;

    try {
      // Call Meteor method to get time statistics
      const stats = await new Promise((resolve, reject) => {
        Meteor.call('getProjectTimeStats', { teamId, days }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      return {
        success: true,
        ...stats,
        message: `Retrieved time stats: ${stats.totalFormatted} across ${stats.ticketCount} tickets in the last ${stats.days} days`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve time statistics: ${error.message}`
      };
    }
  }
};

// Initialize MCP Tools Integration
class OzwellMCPIntegration {
  constructor() {
    this.widgetIframe = null;
    this.init();
  }

  init() {
    // Wait for widget to send tool execution requests
    window.addEventListener('message', (event) => {
      // Security check: Only accept messages from our widget iframe or reference server
      const validOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001', // TimeHarbor's port (if widget is proxied through it)
        'null', // Widget iframe may have null origin due to CORS/iframe loading
        'about:' // about:srcdoc origin for sandboxed iframes
      ];

      // Check if origin starts with valid prefixes (for about:srcdoc, about:blank, etc.)
      const isValidOrigin = validOrigins.includes(event.origin) ||
                           event.origin.startsWith('about:');

      if (!isValidOrigin) {
        // Silently ignore Meteor and other internal messages
        return;
      }

      // For null or about: origins, verify it's from our widget iframe
      if (event.origin === 'null' || event.origin.startsWith('about:')) {
        const widgetIframe = document.querySelector('iframe[src*="ozwell.html"]');
        if (!widgetIframe || event.source !== widgetIframe.contentWindow) {
          return;
        }
      }

      const { source, type, tool, payload } = event.data;

      // Match Ozwell's convention: type='tool_call', tool=name, payload=args
      if (source === 'ozwell-chat-widget' && type === 'tool_call') {
        // Convert to expected format
        const toolCall = {
          name: tool,
          arguments: payload
        };
        console.log('[MCP Tools] Tool call requested:', toolCall);
        this.executeTool(toolCall);
      }
    });

    console.log('[MCP Tools] Integration initialized, listening for tool calls');
  }

  async executeTool(toolCall) {
    const { name, arguments: args } = toolCall;
    console.log(`[MCP Tools] Executing: ${name}`, args);

    const handler = toolHandlers[name];

    if (!handler) {
      this.sendToolResult({
        success: false,
        error: `Unknown tool: ${name}`
      });
      return;
    }

    try {
      const result = await handler(args);
      this.sendToolResult(result);
    } catch (error) {
      this.sendToolResult({
        success: false,
        error: `Tool execution failed: ${error.message}`
      });
    }
  }

  sendToolResult(result) {
    // Use the global OzwellChat object (created by ozwell-loader.js)
    if (!window.OzwellChat || !window.OzwellChat.iframe) {
      console.warn('[MCP Tools] window.OzwellChat.iframe not found, cannot send result');
      console.warn('[MCP Tools] Make sure Ozwell widget is loaded before executing tools');
      return;
    }

    // Send result back to widget (Ozwell's recommended pattern)
    window.OzwellChat.iframe.contentWindow.postMessage(
      {
        source: 'ozwell-chat-parent',
        type: 'tool_result',
        result: result
      },
      '*'
    );

    console.log('[MCP Tools] Tool result sent:', result.message || result.error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ozwellMCPIntegration = new OzwellMCPIntegration();
  });
} else {
  window.ozwellMCPIntegration = new OzwellMCPIntegration();
}

/**
 * OPTIONAL: Real-Time Form Sync (currently disabled)
 * For implementation: See OZWELL_SETUP.md or https://ozwellai-embedtest.opensource.mieweb.org (view source)
 */

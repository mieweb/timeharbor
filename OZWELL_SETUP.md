# Ozwell AI Assistant Setup

Quick setup guide for the AI chat widget in TimeHarbor.

---

## Quick Start

**Time required:** ~5 minutes

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull the AI model**
   ```bash
   ollama pull qwen2.5:14b
   ```

3. **Clone & start reference server**
   ```bash
   # TODO: Add final clone URL after reference server PR is merged
   # For now, contact maintainers for development branch access

   cd reference-server
   npm install
   npm run dev
   ```
   The server will start at `http://localhost:3000`

4. **Start TimeHarbor**
   ```bash
   cd timeharbor
   meteor --port 3001
   ```

5. **Test the widget**
   - Look for chat button (bottom-right corner)
   - Click to open chat
   - Try: "how much time have I spent?"

---

## What You Get

- **Context-aware suggestions** - AI reads your actual project history
- **Instant time stats** - Ask about hours logged across tickets
- **Auto-fill forms** - AI can update ticket fields for you
- **Project search** - Find recent tickets and activity

---

## Architecture

```
TimeHarbor (localhost:3001)
    |
    v
Reference Server (localhost:3000)
    |
    v
Ollama (qwen2.5:14b model)
```

All processing happens locally on your machine. No external API calls.

---

## Available MCP Tools

The AI has access to these tools when chatting:

| Tool | Purpose | Example Usage |
|------|---------|---------------|
| `get_project_history` | Retrieves recent tickets from current project | "suggest some ticket titles" |
| `get_project_time_stats` | Calculates total time spent on project | "how much time have I spent?" |
| `get_current_ticket_form` | Reads current form field values | "what's filled in right now?" |
| `update_ticket_title` | Auto-fills the title field | "set title to Fix login bug" |
| `update_ticket_description` | Auto-fills description field | "add description: Fixed auth issue" |
| `update_ticket_time` | Sets hours/minutes/seconds | "set time to 2 hours 30 minutes" |
| `get_conversation_history` | Retrieves past conversations (currently unused) | - |

---

## Adding Your Own Tool

Want to add custom functionality? Here's a quick example:

**1. Define the tool** in `/public/ozwell-mcp-tools.js`:
```javascript
{
  type: 'function',
  function: {
    name: 'get_ticket_count',
    description: 'Counts total tickets in current project',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

**2. Add the handler** in the same file:
```javascript
const toolHandlers = {
  // ... existing handlers

  get_ticket_count: async (params) => {
    const teamSelect = document.querySelector('#teamSelect');
    const teamId = teamSelect?.value;

    const count = await new Promise((resolve, reject) => {
      Meteor.call('getTicketCount', { teamId }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return {
      success: true,
      count,
      message: `Found ${count} tickets`
    };
  }
};
```

**3. Add server method** in `/server/methods/ozwell.js`:
```javascript
async getTicketCount({ teamId }) {
  check(teamId, String);
  if (!this.userId) throw new Meteor.Error('not-authorized');

  const count = await Tickets.find({ teamId }).countAsync();
  return count;
}
```

That's it! The AI can now use your custom tool.

---

## Troubleshooting

**Chat widget not appearing?**
- Check reference server is running: `curl http://localhost:3000`
- Verify browser console for errors (F12 > Console tab)

**AI not calling tools?**
- Check Ollama is running: `ollama list`
- Verify model is downloaded: Should see `qwen2.5:14b` in list
- Try restarting reference server

**Reference server failing to start?**
- Check Node.js version: `node --version` (needs v18+)
- Verify Ollama is accessible: `curl http://localhost:11434`
- Check logs in terminal for specific errors

**Where's the reference server code?**
- TODO: Add GitHub URL after PR merge
- Contact TimeHarbor maintainers for current development branch

---

## File Reference

Key files for Ozwell integration:

- `/public/chat-wrapper.js` - Widget UI and drag behavior
- `/public/ozwell-mcp-tools.js` - Tool definitions and handlers
- `/public/ozwell-iframe-sync.js` - Form state synchronization
- `/client/main.html` - Widget configuration
- `/server/methods/ozwell.js` - Meteor server methods

---

## Next Steps

After setup works:
1. Try different queries to see tool capabilities
2. Check browser console to see which tools get called
3. Customize system prompt in `/client/main.html` if needed
4. Add your own tools using the example above

For issues or questions, create an issue in the TimeHarbor repository.

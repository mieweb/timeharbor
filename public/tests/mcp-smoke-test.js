export function runMcpSmokeTest(options = {}) {
  const {
    prompt = 'Demo prompt: Summarize recent progress.',
    teamName = options.teamName || (window?.ozwellModalInstance?.currentContext?.get?.()?.teamName) || 'Sample Project',
    username = options.username || (window?.ozwellModalInstance?.currentContext?.get?.()?.user?.username) || (Meteor.user()?.username || 'User')
  } = options;

  const context = {
    teamName,
    user: { username }
  };

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.bottom = '16px';
  overlay.style.right = '16px';
  overlay.style.width = '420px';
  overlay.style.height = '620px';
  overlay.style.background = 'rgba(17,24,39,0.95)';
  overlay.style.border = '1px solid rgba(79,70,229,0.4)';
  overlay.style.borderRadius = '18px';
  overlay.style.boxShadow = '0 20px 45px rgba(15,23,42,0.4)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.color = '#f9fafb';
  overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '12px 16px';
  header.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
  header.innerHTML = '<strong>MCP Smoke Test</strong>';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#f9fafb';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    window.removeEventListener('message', handler);
    overlay.remove();
  };
  header.appendChild(closeBtn);

  const frame = document.createElement('iframe');
  frame.src = '/ozwell-frame.html';
  frame.style.flex = '1';
  frame.style.border = '0';
  frame.style.borderBottom = '1px solid rgba(255,255,255,0.08)';

  const controlBar = document.createElement('div');
  controlBar.style.display = 'flex';
  controlBar.style.gap = '8px';
  controlBar.style.padding = '12px 16px';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = prompt;
  input.placeholder = 'Type prompt...';
  input.style.flex = '1';
  input.style.borderRadius = '12px';
  input.style.border = '1px solid rgba(255,255,255,0.12)';
  input.style.background = 'rgba(255,255,255,0.06)';
  input.style.color = '#f9fafb';
  input.style.padding = '10px 12px';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send prompt';
  sendBtn.style.borderRadius = '12px';
  sendBtn.style.border = 'none';
  sendBtn.style.background = '#4f46e5';
  sendBtn.style.color = '#fff';
  sendBtn.style.padding = '10px 18px';
  sendBtn.style.cursor = 'pointer';

  const logArea = document.createElement('pre');
  logArea.style.margin = '0';
  logArea.style.padding = '12px 16px';
  logArea.style.background = 'rgba(255,255,255,0.03)';
  logArea.style.borderTop = '1px solid rgba(255,255,255,0.08)';
  logArea.style.maxHeight = '120px';
  logArea.style.overflow = 'auto';
  logArea.style.fontSize = '12px';
  logArea.textContent = 'Waiting for client hello...\n';

  controlBar.appendChild(input);
  controlBar.appendChild(sendBtn);

  overlay.appendChild(header);
  overlay.appendChild(frame);
  overlay.appendChild(controlBar);
  overlay.appendChild(logArea);

  document.body.appendChild(overlay);

  let ready = false;

  function log(line) {
    logArea.textContent += `${line}\n`;
    logArea.scrollTop = logArea.scrollHeight;
  }

  function buildMessages(promptText) {
    const systemMessage = `You are a helpful assistant for time tracking and project management.\nInstructions: Provide only polished, ready-to-paste suggestions. Avoid Markdown, template placeholders, or meta commentary.`;
    const summary = [`Project: ${context.teamName}`, `User: ${context.user.username}`].join('\n');
    return [
      { role: 'system', content: systemMessage },
      { role: 'system', content: `Project context:\n${summary}` },
      { role: 'user', content: promptText }
    ];
  }

  function reply(message) {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({ source: 'ozwell-modal-bridge', ...message }, '*');
  }

  function handler(event) {
    const data = event.data;
    if (!data || data.source !== 'ozwell-mcp-frame') return;

    if (data.type === 'client-hello') {
      log('Client hello received');
      ready = true;
      reply({ type: 'mcp-ready', contextSummary: `${context.teamName} (manual test)` });
      return;
    }

    if (data.type === 'model-request') {
      const promptText = data.payload?.prompt || '';
      log(`Model request -> ${promptText}`);
      Meteor.call('callReferenceAssistant', {
        messages: buildMessages(promptText),
        metadata: { transport: 'mcp-smoke-test', teamName: context.teamName }
      }, (err, result) => {
        if (err) {
          log(`Error: ${err.reason || err.message}`);
          reply({ type: 'model-error', error: err.reason || err.message });
        } else {
          const content = result?.content || '';
          log(`Model response <- ${content}`);
          reply({ type: 'model-response', payload: { content } });
        }
      });
      return;
    }

    if (data.type === 'model-response') {
      log(`Frame echo response: ${data.payload?.content}`);
    }

    if (data.type === 'model-error') {
      log(`Frame error: ${data.error}`);
    }
  }

  window.addEventListener('message', handler);

  sendBtn.onclick = () => {
    if (!ready) {
      log('Frame not ready yet.');
      return;
    }
    const promptText = input.value.trim();
    if (!promptText) return;
    reply({ type: 'model-request', payload: { prompt: promptText } });
  };

  log('Smoke test harness attached. Wait for client hello, then click "Send prompt".');
}

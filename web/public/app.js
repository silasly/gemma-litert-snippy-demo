import { loadLiteRt } from '@litertjs/core';

const statusBadge = document.getElementById('statusBadge');
const chatBox = document.getElementById('chatBox');
const promptForm = document.getElementById('promptForm');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const alertBanner = document.getElementById('alertBanner');
const alertMessage = document.getElementById('alertMessage');
const actionPlayground = document.getElementById('actionPlayground');
const pageBody = document.getElementById('pageBody');
const toolLogList = document.getElementById('toolLogList');
const toolCountBadge = document.getElementById('toolCountBadge');

let totalToolCalls = 0;

// Color Normalizer to handle CSS color strings, named colors, and invalid '#red' formats
function normalizeColor(colorStr) {
  if (!colorStr) return '#0f172a';
  let c = colorStr.trim().toLowerCase();
  
  // Fix invalid '#red' or '#purple' format where '#' precedes a color name
  if (c.startsWith('#') && !/^[0-9a-f]{3,8}$/i.test(c.slice(1))) {
    c = c.slice(1);
  }

  const colorMap = {
    'red': '#dc2626',
    'dark red': '#7f1d1d',
    'purple': '#581c87',
    'dark purple': '#1e1b4b',
    'blue': '#2563eb',
    'ocean blue': '#1e3a8a',
    'green': '#16a34a',
    'emerald green': '#065f46',
    'yellow': '#d97706',
    'pink': '#db2777',
    'dark': '#0f172a',
    'black': '#020617'
  };

  return colorMap[c] || c;
}

// ==========================================
// ⚡ SNIPPY GENERIC TOOL CALL DISPATCHER
// ==========================================
window.Snippy = {
  executeTool: function(toolName, args = {}) {
    totalToolCalls++;
    toolCountBadge.textContent = `${totalToolCalls} Tool Call${totalToolCalls === 1 ? '' : 's'} Executed`;

    // Add log entry to UI Activity Stream
    const logEmpty = toolLogList.querySelector('.tool-log-empty');
    if (logEmpty) logEmpty.remove();

    const logItem = document.createElement('div');
    logItem.className = 'tool-log-item';
    logItem.innerHTML = `<span>⚡</span> <span class="tool-name">${escapeHtml(toolName)}</span> <span>${escapeHtml(JSON.stringify(args))}</span>`;
    toolLogList.prepend(logItem);

    // Generic Tool Handler Dispatch
    try {
      switch (toolName) {
        case 'set_background_color':
          const targetColor = normalizeColor(args.color);
          console.log("⚡ Changing background color to:", targetColor);
          pageBody.style.backgroundColor = targetColor;
          document.documentElement.style.backgroundColor = targetColor;
          break;

        case 'show_notification':
          window.Snippy.showAlert(args.message || 'Notification', args.type);
          break;

        case 'create_ui_element':
          const tag = (args.tag || 'button').toLowerCase();
          if (tag === 'button') {
            const btn = document.createElement('button');
            btn.className = 'snippy-btn';
            if (args.css) btn.style.cssText = args.css;
            btn.textContent = args.text || 'Button';
            btn.onclick = () => {
              if (args.action) {
                cleanAndRunJs(args.action);
              } else {
                window.Snippy.showAlert('Button clicked!');
              }
            };
            actionPlayground.appendChild(btn);
          } else {
            const card = document.createElement('div');
            card.className = 'snippy-card';
            if (args.css) card.style.cssText = args.css;
            card.innerHTML = `<h3>${escapeHtml(args.text || 'Card Title')}</h3><p>${escapeHtml(args.content || '')}</p>`;
            actionPlayground.appendChild(card);
          }
          break;

        case 'run_javascript':
          if (args.code) {
            cleanAndRunJs(args.code);
          }
          break;

        default:
          console.log(`[Snippy] Executed custom generic tool: ${toolName}`, args);
          break;
      }
    } catch (e) {
      console.error(`[Snippy] Tool Execution Error for ${toolName}:`, e);
    }
  },

  showAlert: function(message) {
    alertMessage.textContent = message;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 4000);
  }
};

// Safe JS execution cleaner (strips placeholder dots '...')
function cleanAndRunJs(jsCode) {
  const validLines = jsCode
    .split('\n')
    .filter(line => !line.trim().includes('...') && line.trim().length > 0)
    .join('\n');

  if (validLines.trim()) {
    console.log("⚡ Executing Safe JS Code:\n", validLines);
    const runner = new Function('Snippy', validLines);
    runner(window.Snippy);
  }
}

// ==========================================
// UI & CHAT FUNCTIONS
// ==========================================
function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user' ? 'user-msg' : 'snippy-msg';
  msgDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'Snippy ⚡'}:</strong> ${formatText(text)}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatText(text) {
  return escapeHtml(text).replace(/```js([\s\S]*?)```/g, '<div class="code-block"><code>$1</code></div>');
}

// Extract and execute JS code generated by Snippy
function executeSnippyActions(response) {
  // Pattern 1: Code blocks ```js ... ```
  const codeBlockRegex = /```js([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const jsCode = match[1];
    try {
      cleanAndRunJs(jsCode);
    } catch (e) {
      console.error("Snippy Execution Error:", e);
    }
  }

  // Pattern 2: Direct Snippy.executeTool(...) lines if not inside code block
  if (!response.includes('```js')) {
    const directLineRegex = /(Snippy\.[a-zA-Z0-9_]+\([^)]*\));?/g;
    while ((match = directLineRegex.exec(response)) !== null) {
      const jsLine = match[1];
      try {
        cleanAndRunJs(jsLine);
      } catch (e) {
        console.error("Snippy Line Execution Error:", e);
      }
    }
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
async function initLiteRT() {
  try {
    statusBadge.textContent = "Loading WASM Runtime...";
    await loadLiteRt('/wasm/');

    statusBadge.textContent = "Snippy Ready (WebGPU)";
    statusBadge.className = "status-badge ready";

    promptInput.disabled = false;
    sendBtn.disabled = false;
    chatBox.innerHTML = '<div class="welcome-msg">⚡ Snippy agent initialized! Try asking Snippy to perform an action on this webpage.</div>';
  } catch (err) {
    console.error("Initialization Error:", err);
    statusBadge.textContent = "Error Loading Engine";
    statusBadge.className = "status-badge error";
    chatBox.innerHTML += `<div class="welcome-msg" style="color: #fca5a5;">Engine initialization failed: ${err.message}</div>`;
  }
}

promptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const promptText = promptInput.value.trim();
  if (!promptText) return;

  appendMessage('user', promptText);
  promptInput.value = '';
  promptInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });

    const data = await res.json();
    const responseText = data.text || data.error || 'No response generated.';

    appendMessage('snippy', responseText);
    
    // Live In-Browser Execution of Snippy's generated JavaScript!
    executeSnippyActions(responseText);

  } catch (err) {
    console.error("Generation Error:", err);
    appendMessage('snippy', `[Error: ${err.message}]`);
  } finally {
    promptInput.disabled = false;
    sendBtn.disabled = false;
    promptInput.focus();
  }
});

initLiteRT();

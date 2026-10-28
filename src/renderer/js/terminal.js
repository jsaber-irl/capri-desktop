'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const output = $('output');
  const form = $('form');
  const body = document.body;

  const commands = [];
  let commandIndex = 0;
  let currentDraft = '';
  let compact = false;

  const AUTOCOMPLETE_LIST = [
    '/help',
    '/clear',
    '/history',
    '/version',
    '/status',
    '/open app/',
    '/open file/',
    '/download ',
    '/system info',
    '/network status',
    '/network scan',
    '/get arasaka data',
    '/hack arasaka',
    '/netrunner status',
    '/ice status',
    '/trace origin',
    '/decrypt ',
    '/connect ',
    '/disconnect',
    '/inventory',
    '/capri teleport',
    '/capri satellite',
    '/capri chat',
    '/capri demo',
    '/capri stow',
    '/capri call',
    '/test demoSatellite',
    '/music ', '/music status', '/music play', '/music pause', '/music toggle', '/music next', '/music previous', '/music current', '/music volume ', '/music spotify ', '/music deezer '
  ];

  function line(text, kind = 'response') {
    const node = document.createElement('div');
    node.className = `line line--${kind}`;
    node.textContent = text;
    output.append(node);
  }

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  async function render(result) {
    if (!result) return;
    if (result.kind === 'clear') {
      output.replaceChildren();
      return;
    }

    const kind = result.kind || 'response';

    if (result.progress && Array.isArray(result.lines)) {
      for (const text of result.lines) {
        line(text, kind);
        scrollToBottom();
        await new Promise((resolve) => setTimeout(resolve, 160));
      }
      return;
    }

    for (const text of result.lines || []) {
      line(text, kind);
    }
    scrollToBottom();
  }

  function setCompactUI(val) {
    compact = Boolean(val);
    body.dataset.compact = String(compact);
    input.focus();
  }

  function toggleCompact(force) {
    const next = typeof force === 'boolean' ? force : !compact;
    setCompactUI(next);
    if (window.terminal?.toggleCompact) {
      window.terminal.toggleCompact(next);
    }
  }

  // Event listeners for window controls
  $('compact')?.addEventListener('click', () => toggleCompact(true));
  $('expand')?.addEventListener('click', () => toggleCompact(false));
  $('close')?.addEventListener('click', () => window.terminal?.close?.());
  $('compactClose')?.addEventListener('click', () => window.terminal?.close?.());

  // Double click dragbar to toggle compact
  $('dragbar')?.addEventListener('dblclick', () => toggleCompact(true));
  $('compactHandle')?.addEventListener('dblclick', () => toggleCompact(false));

  // Sync state from main process if available
  if (window.terminal?.onState) {
    window.terminal.onState((state) => {
      if (typeof state?.compact === 'boolean') {
        setCompactUI(state.compact);
      }
    });
  }
  window.terminal?.onDemoLog?.((message) => {
    line(message, message.includes('Erreur') ? 'error' : 'response');
    scrollToBottom();
  });

  // Initial compact query
  if (window.terminal?.isCompact) {
    window.terminal.isCompact().then((isComp) => {
      if (typeof isComp === 'boolean') setCompactUI(isComp);
    }).catch(() => { });
  }

  // Form submit (Enter key)
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    line(`capri@night-city:~$ ${value}`, 'command');
    commands.push(value);
    commandIndex = commands.length;
    currentDraft = '';
    input.value = '';

    try {
      const res = await window.terminal.execute(value);
      await render(res);
    } catch (err) {
      line(`Terminal IPC error: ${err.message}`, 'error');
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', (event) => {
    // Arrow navigation in history
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!commands.length) return;
      if (commandIndex === commands.length) {
        currentDraft = input.value;
      }
      commandIndex = Math.max(0, commandIndex - 1);
      input.value = commands[commandIndex] || '';
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!commands.length) return;
      commandIndex = Math.min(commands.length, commandIndex + 1);
      if (commandIndex === commands.length) {
        input.value = currentDraft;
      } else {
        input.value = commands[commandIndex] || '';
      }
      return;
    }

    // Tab autocomplete
    if (event.key === 'Tab') {
      event.preventDefault();
      const current = input.value.trimStart();
      if (!current) return;
      const match = AUTOCOMPLETE_LIST.find((cmd) => cmd.startsWith(current));
      if (match) {
        input.value = match;
      }
      return;
    }

    // Toggle compact shortcut Ctrl+M / Cmd+M
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      toggleCompact();
      return;
    }

    // Escape in compact mode or full mode
    if (event.key === 'Escape') {
      if (input.value) {
        input.value = '';
      }
    }
  });

  // Initial welcome message
  line('CAPRI NETRUNNER CONSOLE // ONLINE', 'info');
  line('Tapez /help pour la liste des commandes disponibles.', 'info');
  input.focus();
})();

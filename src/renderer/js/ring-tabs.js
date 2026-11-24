// What's on each card of her circular menu (ring.js): the Bond (how close you two are, her notebook
// about you), the Mic (which microphone, how loud it hears you, how sensitive), her senses, her
// character, her colours, her voice, and the rest. Each tab is { sub?, render(ctx) }: ctx comes from
// ring.js (settings, `set` to change one, the bond, the ears...).

import { THEMES, THEME_IDS, WINDOW_THEME_IDS } from './themes.js';
import { accessoryLayout } from './accessory-layout.js';
import { lifeLines } from './lines-life.js';
import { fmt } from './util.js';
import { plural, dateOf } from './bond.js';
import { micThreshold, meterLevel } from './ears.js';
import { el, heading, note, row, button, buttons, toggle, pick, seg, slider, chips, quote } from './ring-ui.js';
import { PROVIDERS, GROUPS, needsKey, isLocal } from './brain-providers.js';
import { zonedTimeToEpoch } from './reminders.mjs';

export const ORDER = ['bond', 'brain', 'mic', 'senses', 'character', 'colours', 'mods', 'voice', 'more', 'chat'];

const isWindows = (host) => (host.platform ? host.platform === 'win32' : /win/i.test(globalThis.navigator?.platform || ''));
const prettyKey = (key) => String(key || 'Control+Alt+Space').replace(/\bControl\b/g, 'Ctrl').replace(/\bCommandOrControl\b/g, 'Ctrl');

// A button that does something with her and closes the ring.
const go = (c, label, name, extra, opts) => button(label, () => {
  c.hide();
  c.actions.run?.(name, extra);
}, opts);

function formatDuration(ms, durDict) {
  if (typeof ms !== 'number' || ms <= 0) return durDict?.justNow || '< 1 min';
  if (ms < 60000) {
    const s = Math.max(1, Math.floor(ms / 1000));
    return (durDict?.seconds || '{s}s').replace('{s}', s);
  }
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000);
    return (durDict?.minutes || '{m} min').replace('{m}', m);
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return (durDict?.hoursMinutes || '{h}h {m}m').replace('{h}', h).replace('{m}', m);
}

function formatOrigin(originKey, j) {
  return j?.origins?.[originKey] || j?.origins?.calm || originKey || '—';
}

function formatReason(tag, detail, j) {
  const base = j?.reasons?.[tag];
  if (detail && (tag === 'insult' || tag === 'threat' || tag === 'wrongName')) {
    return `${base || tag} (« ${detail} »)`;
  }
  if (detail && tag === 'jealousy') {
    return `${base || tag} (${detail})`;
  }
  if (base) return base;
  if (detail) return detail;
  return j?.reasons?.none || '—';
}

function normalizedColor(value) {
  const text = String(value || '').trim();
  const hex = text.match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1];
    return `#${raw.toLowerCase()}`;
  }
  const rgb = text.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgb) return '';
  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) return '';
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function hueOf(hex) {
  const color = normalizedColor(hex) || '#ff2152';
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (!delta) return 0;
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return Math.round(((hue * 60 + 360) % 360));
}

function applyPrimaryToPalette(palette, hex) {
  const color = normalizedColor(hex);
  if (!color) return;
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  palette.hue = hueOf(color) / 360;
  palette.sat = max ? (max - min) / max : 0;
  palette.val = max;
}

function colorFromHue(degrees) {
  const hue = ((Number(degrees) % 360) + 360) % 360;
  const chroma = 0.9;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const rgb = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0]
    : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma]
      : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  const lift = 0.1;
  return `#${rgb.map((channel) => Math.round((channel + lift) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function colorControls({ label, value, onChange, k }) {
  const wrap = el('div', 'ring__color-controls');
  const preview = el('i', 'ring__color-preview');
  const range = el('input', 'ring__color-hue');
  range.type = 'range';
  range.min = '0';
  range.max = '359';
  range.step = '1';
  range.setAttribute('aria-label', `${label} · ${k.hue || 'Hue'}`);
  const text = el('input', 'ring__input ring__color-value');
  text.type = 'text';
  text.autocomplete = 'off';
  text.spellcheck = false;
  text.maxLength = 24;
  text.placeholder = '#RRGGBB or rgb(255, 0, 0)';
  text.setAttribute('aria-label', `${label} · ${k.hexOrRgb || 'HEX or RGB'}`);
  const setColor = (color, updateText = true) => {
    const safe = normalizedColor(color);
    if (!safe) return false;
    preview.style.setProperty('--chosen-color', safe);
    range.value = String(hueOf(safe));
    if (updateText) text.value = safe;
    text.setCustomValidity('');
    onChange(safe);
    return true;
  };
  const initial = normalizedColor(value) || '#ff2152';
  preview.style.setProperty('--chosen-color', initial);
  range.value = String(hueOf(initial));
  text.value = initial;
  range.addEventListener('input', () => setColor(colorFromHue(range.value)));
  text.addEventListener('input', () => {
    const safe = normalizedColor(text.value);
    text.setCustomValidity(safe || !text.value.trim() ? '' : (k.invalidColor || 'Use #RRGGBB or rgb(255, 0, 0).'));
    if (safe) setColor(safe, false);
  });
  text.addEventListener('blur', () => {
    const safe = normalizedColor(text.value);
    if (safe) text.value = safe;
  });
  text.addEventListener('click', (event) => event.stopPropagation());
  text.addEventListener('pointerdown', (event) => { event.stopPropagation(); });
  range.addEventListener('click', (event) => event.stopPropagation());
  range.addEventListener('pointerdown', (event) => { event.stopPropagation(); });
  wrap.append(preview, range, text);
  return wrap;
}

// ---------- Bond ----------

const bond = {
  sub(c) {
    return c.bond ? lifeLines(c.lang).bond.levels[c.bond.progress().level] : '';
  },
  render(c) {
    const { t, cfg, state, lang } = c;
    const b = t.bond;
    const names = lifeLines(lang).bond.levels;
    const root = el('div');
    if (!c.bond) return root;
    const d = c.bond.data;
    const p = c.bond.progress();

    root.append(toggle(b.learn, cfg.learn !== false, (v) => c.set({ learn: v })));
    if (cfg.learn === false) root.append(note(b.off, true));

    // how close you two are
    const level = el('div', 'ring__level');
    level.append(el('div', 'ring__level-name', names[p.level]));
    const ticks = el('div', 'ring__ticks');
    for (let i = 0; i < p.max; i++) ticks.append(el('i', i < p.level ? 'is-lit' : ''));
    level.append(ticks);
    root.append(level);
    const bar = el('div', 'ring__bar');
    bar.style.setProperty('--fill', `${Math.round(p.fraction * 100)}%`);
    root.append(bar);
    if (p.next === null) root.append(note(b.maxed));
    else {
      const need = [];
      if (p.needTalks) need.push(fmt(b.need.talks, { n: p.needTalks }));
      if (p.needDays) need.push(fmt(b.need.days, { n: p.needDays }));
      root.append(note(fmt(b.next, { name: names[p.next], need: need.join(b.need.and) || '…' })));
    }
    if (p.held) root.append(note(b.held));
    if (d.talks) {
      root.append(note(fmt(b.since, {
        date: dateOf(d.met, lang),
        days: `${d.days} ${plural(d.days, b.days, lang)}`,
        talks: `${d.talks} ${plural(d.talks, b.messages, lang)}`,
      }), true));
    }

    // how you want her: the dials her learning turns, there to be set by hand
    root.append(heading(b.tuneH));
    for (const key of ['short', 'slang', 'tease', 'warm']) {
      root.append(slider({
        left: b.tune[key][0],
        right: b.tune[key][1],
        min: -100,
        max: 100,
        step: 5,
        value: Math.round((d.tune[key] || 0) * 100),
        onInput: (v) => c.bond.setTune(key, v / 100),
      }));
    }
    root.append(note(b.tuneHint, true));

    // her notebook
    root.append(heading(b.notesH));
    const n = d.notes;
    let any = false;
    for (const [kind, label] of [['facts', b.facts], ['likes', b.likes], ['dislikes', b.dislikes]]) {
      if (!n[kind].length) continue;
      any = true;
      root.append(note(label, true), chips(n[kind], (text) => {
        c.bond.removeNote(kind, text);
        c.refresh();
      }, b.remove));
    }
    for (const kind of ['style', 'us']) {
      if (!n[kind]) continue;
      any = true;
      root.append(quote(b[kind], n[kind], () => {
        c.bond.removeNote(kind);
        c.refresh();
      }, b.remove));
    }
    if (!any) root.append(note(b.empty, true));

    root.append(buttons(
      button('Exporter la mémoire', async () => {
        const result = await c.host?.structuredMemoryExport?.();
        if (result?.ok) c.actions.run?.('toast', `Mémoire exportée : ${result.count} entrée(s).`);
      }),
      button('Importer Markdown', async () => {
        const result = await c.host?.structuredMemoryImport?.();
        if (result?.ok) c.actions.run?.('toast', `Mémoire importée : ${result.count} entrée(s).`);
      }),
    ));
    const structured = el('div', 'ring__structured-memory');
    structured.append(heading('Mémoire structurée'), note('Stockée uniquement sur cet ordinateur.', true));
    c.host?.structuredMemoryList?.().then((entries) => {
      if (!Array.isArray(entries) || !entries.length) {
        structured.append(note('Aucune entrée structurée.', true));
        return;
      }
      for (const entry of entries) {
        const line = el('div', 'ring__row');
        line.append(el('span', 'ring__label-text', `${entry.category} : ${entry.content}`));
        line.append(button('Supprimer', async () => {
          const result = await c.host.structuredMemoryRemove(entry.id);
          if (result?.ok) { line.remove(); }
        }, { danger: true }));
        structured.append(line);
      }
    }).catch(() => structured.append(note('Mémoire structurée indisponible.', true)));
    root.append(structured);

    // write one yourself
    if (state.adding) {
      const kinds = [['facts', b.facts], ['likes', b.likes], ['dislikes', b.dislikes]].map(([id, label]) => ({ id, label }));
      root.append(seg(kinds, state.kind || 'facts', (id) => {
        state.kind = id;
        state.draft = root.querySelector('.ring__input')?.value || '';
        c.refresh();
      }));
      const form = el('form', 'ring__form');
      const input = el('input', 'ring__input');
      input.type = 'text';
      input.maxLength = 90;
      input.placeholder = b.addPlaceholder;
      input.value = state.draft || '';
      input.spellcheck = false;
      const save = button(b.save, () => form.requestSubmit(), { primary: true });
      form.append(input, save);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (c.bond.addNote(state.kind || 'facts', input.value)) {
          state.adding = false;
          state.draft = '';
          c.refresh();
        } else input.focus();
      });
      root.append(form);
      c.focus(input);
    } else {
      root.append(buttons(button(b.add, () => {
        state.adding = true;
        c.refresh();
      })));
    }

    // wipe it
    if (d.talks || any) {
      root.append(heading(''));
      if (state.sure) {
        root.append(note(b.sure), buttons(
          button(b.wipe, () => {
            c.bond.forget();
            state.sure = false;
            c.refresh();
          }, { primary: true }),
          button(b.cancel, () => {
            state.sure = false;
            c.refresh();
          }),
        ));
      } else {
        root.append(buttons(button(b.forget, () => {
          state.sure = true;
          c.refresh();
        }, { danger: true })));
      }
    }
    return root;
  },
};

// ---------- AI: who answers her ----------

const brain = {
  sub(c) {
    return c.cfg.provider ? (PROVIDERS[c.cfg.provider]?.name || c.cfg.provider) : '';
  },
  render(c) {
    const { t, cfg, host, state } = c;
    const b = t.brain;
    const root = el('div');
    const provider = cfg.provider || 'ollama';
    const keys = cfg.keys || [];

    // what's known about whoever answers her now (the models, or why it can't): asked once per visit
    if (state.asked !== provider && !state.loading) {
      state.loading = true;
      state.asked = provider;
      Promise.resolve(host.chatModels?.()).catch(() => null).then((info) => {
        state.loading = false;
        state.info = { ...(info || { models: [], error: '' }), provider }; // (for the one that was asked about)
        c.refresh();
      });
    }
    if (state.codeFound === undefined) {
      state.codeFound = null;
      Promise.resolve(host.claudeFound?.()).catch(() => false).then((found) => {
        state.codeFound = Boolean(found);
        if (c.open) c.refresh();
      });
    }
    const info = state.info?.provider === provider ? state.info : null;
    const models = info?.models || [];
    const connected = Boolean(info) && models.length > 0 && !info.error;

    // the state of it all, and a way to check
    const head = el('div', 'ring__link');
    const dot = el('i', `ring__dot${connected ? ' is-on' : ''}`);
    const name = PROVIDERS[provider]?.name || provider;
    const model = models.find((m) => m.id === info?.current)?.label || info?.current || '';
    const line = el('div', 'ring__link-text');
    line.append(el('b', '', connected ? b.on : state.busy || state.loading ? b.checking : b.off));
    line.append(el('span', '', connected ? fmt(b.using, { name, model }) : info?.error ? String(info.error).slice(0, 110) : name));
    head.append(dot, line);
    root.append(head);
    root.append(buttons(button(b.test, async () => {
      state.busy = 'test';
      state.result = '';
      c.refresh();
      const res = await host.chatStatus().catch((err) => ({ ok: false, error: err.message }));
      state.busy = null;
      state.asked = null; // (asked again)
      state.result = res?.ok ? fmt(b.works, { n: models.length || 1 }) : `${b.fails} ${String(res?.error || '').slice(0, 100)}`;
      if (c.open) c.refresh();
    }, { disabled: Boolean(state.busy) })));
    if (state.result) root.append(note(state.result, true));

    // the key (or the address) of the one you're setting up
    const chosen = state.pick;
    if (chosen && PROVIDERS[chosen]) {
      const pname = PROVIDERS[chosen].name;
      const isUrl = chosen === 'custom';
      root.append(heading(isUrl ? b.urlH : fmt(b.keyH, { name: pname })));
      const form = el('form', 'ring__form');
      const input = el('input', 'ring__input');
      input.type = isUrl ? 'text' : 'password';
      input.placeholder = isUrl ? b.urlPlaceholder : b.keyPlaceholder;
      input.spellcheck = false;
      input.autocomplete = 'off';
      input.value = state.draft || '';
      input.addEventListener('input', () => { state.draft = input.value; });
      form.append(input, button(b.connect, () => form.requestSubmit(), { primary: true, disabled: Boolean(state.busy) }));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input.value.trim();
        if (!value) { input.focus(); return; }
        connect(c, chosen, isUrl ? { url: value } : { key: value });
      });
      root.append(form);
      if (state.error) root.append(note(`${b.fails} ${state.error}`));
      if (!isUrl) {
        root.append(note(fmt(b.keyNote, { name: pname }), true));
        if (chosen === 'anthropic') root.append(note(b.envNote, true));
        root.append(buttons(
          button(b.page, () => host.keyPage(chosen)), // (main.js setup.js KEY_PAGES: every service that takes a key has one)
          button(b.fromEnv, () => connect(c, chosen, {}), { disabled: Boolean(state.busy) }),
        ));
      }
      c.focus(input);
    } else if (state.error) root.append(note(`${b.fails} ${state.error}`));

    // who answers
    for (const group of GROUPS) {
      root.append(heading(b.groups[group]));
      const items = Object.entries(PROVIDERS).filter(([, p]) => p.group === group);
      const box = el('div', 'ring__providers');
      for (const [id] of items) {
        const [label, hint] = b.providers[id] || [PROVIDERS[id].name, ''];
        const on = id === provider;
        const btn = el('button', `ring__provider${on ? ' is-on' : ''}${state.pick === id ? ' is-pick' : ''}`);
        btn.type = 'button';
        btn.append(el('span', 'ring__provider-name', label));
        const tag = needsKey(id) && keys.includes(id) ? b.hasKey : '';
        btn.append(el('span', 'ring__provider-hint', [hint, tag && `· ${tag}`].filter(Boolean).join(' ')));
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (state.busy) return;
          state.error = '';
          if (needsKey(id) && !keys.includes(id)) { state.pick = id; c.refresh(true); return; } // asks for the key
          if (id === 'custom') { state.pick = id; c.refresh(true); return; } // and the address
          state.pick = null;
          if (id !== provider) connect(c, id);
        });
        box.append(btn);
      }
      root.append(box);
    }

    // what's special about the one that answers now
    if (provider === 'claude') root.append(note(state.codeFound === false ? b.codeMissing : b.codeNote, true));
    if (provider === 'ollama' && info && !models.length) root.append(note(b.ollamaDown, true));
    // Ollama, started by her from its folder: how it is doing, and the preparation window for what is missing
    if (provider === 'ollama' && host.ollamaStatus) {
      const box = el('div');
      root.append(box);
      const paint = (st) => {
        const text = st.phase === 'ready' ? b.ollReady.replace('{model}', st.model ? `: ${st.model}` : '')
          : st.phase === 'starting' ? b.ollStarting
          : st.phase === 'failed' ? b.ollFailed.replace('{error}', String(st.error || '').slice(0, 140))
          : b.ollOff;
        box.replaceChildren(note(text, st.phase !== 'failed'), buttons(button(b.ollPrepare, () => host.prepareShow?.())));
      };
      host.ollamaStatus().then(paint).catch(() => {});
      c.onLeave(host.onOllama(paint));
    }
    if (isLocal(provider)) root.append(note(b.localNote, true));
    else if (provider !== 'claude') root.append(note(b.cloudNote, true));
    if (keys.includes(provider) && needsKey(provider) && state.pick !== provider) {
      root.append(buttons(button(b.changeKey, () => { state.pick = provider; state.draft = ''; c.refresh(true); })));
    }

    // the model
    if (models.length > 1) {
      root.append(heading(b.modelH));
      root.append(pick_(models, info.current, (id) => c.set({ chatModel: id })));
      if (provider === 'anthropic') root.append(note(b.claudeNote, true));
    } else if (provider === 'anthropic' && connected) root.append(note(b.claudeNote, true));

    root.append(heading(''));
    root.append(buttons(go(c, b.wizard, 'setupChat')));
    return root;
  },
};

// the models as a column of rows
function pick_(models, current, onPick) {
  return pick(models.map((m) => ({ id: m.id, label: m.label })), current, onPick);
}

// Connecting: saved and tried, and put back as it was if it doesn't work (main.js setup:use).
async function connect(c, provider, extra = {}) {
  const { state, host } = c;
  state.busy = provider;
  state.error = '';
  c.refresh();
  const res = await host.useProvider({ provider, ...extra }).catch((err) => ({ ok: false, error: err.message }));
  state.busy = null;
  if (res?.ok) {
    state.pick = null;
    state.draft = '';
    state.asked = null; // (the models of the new one are asked for)
    state.result = '';
    c.cfg.provider = provider;
    if (extra.key) c.cfg.keys = [...new Set([...(c.cfg.keys || []), provider])];
  } else {
    state.pick = provider;
    state.error = String(res?.error || 'failed').slice(0, 140);
  }
  if (c.open) c.refresh();
}

// ---------- Mic ----------

const CELLS = 28;

const mic = {
  sub(c) {
    return c.cfg.ears ? `PTT ${prettyKey(c.cfg.pushToTalk)}` : '';
  },
  render(c) {
    const { t, cfg, ears, state } = c;
    const m = t.mic;
    const root = el('div');
    root.append(toggle(m.listen, cfg.ears === true, (v) => c.set({ ears: v })));
    if (!cfg.ears) {
      c.unhold('mic');
      root.append(note(m.off, true));
      return root;
    }

    // keep the mic open for the meter for as long as this tab is on screen (the badge by the clock says so)
    const opened = c.hold('mic', () => ears.watch(true), () => ears.watch(false));
    Promise.resolve(opened).then((ok) => {
      if (ok === false && c.open && !state.denied) {
        state.denied = true;
        c.refresh();
      }
    });
    if (state.denied) {
      root.append(note(m.denied), buttons(button(m.retry, () => {
        state.denied = false;
        c.unhold('mic'); // (and the next draw asks again)
        c.refresh();
      })));
    } else root.append(note(m.live, true));

    // what she hears: the waveform, a row of cells, and the line where "voice" starts
    root.append(heading(m.level));
    const scope = el('canvas', 'ring__scope');
    scope.width = 680;
    scope.height = 108;
    root.append(scope);
    const meter = el('div', 'ring__meter');
    for (let i = 0; i < CELLS; i++) meter.append(el('i'));
    const line = el('span', 'ring__thresh');
    meter.append(line);
    root.append(meter);
    const stateRow = el('div', 'ring__state');
    const word = el('b', '', m.quiet);
    const device = el('span', '', '');
    stateRow.append(word, device);
    root.append(stateRow);

    // how sensitive
    root.append(slider({
      left: m.sensitivity,
      right: '',
      min: 0,
      max: 1,
      step: 0.01,
      value: cfg.micSensitivity ?? 0.4,
      show: (v) => `${Math.round(v * 100)}%`,
      onInput: (v) => c.drag({ micSensitivity: v }),
      onChange: () => c.drop(),
    }));
    root.append(note(m.sensHint, true));

    // which microphone (the names fill in once the mic is open: the browser keeps them back until then)
    root.append(heading(m.device));
    const devices = el('div');
    root.append(devices);
    let alive = true;
    c.onLeave(() => { alive = false; });
    Promise.resolve(opened).then(() => ears.devices()).then((list) => {
      if (!alive) return;
      const items = list.map((d) => ({ id: d.id, label: d.id ? d.label : m.defaultDevice }));
      devices.replaceChildren(pick(items, cfg.micDevice || '', (id) => c.set({ micDevice: id })));
      const current = items.find((d) => d.id === (cfg.micDevice || ''));
      device.textContent = current && current.id ? current.label.slice(0, 34) : '';
    }).catch(() => {});

    // how she's talked to
    root.append(heading(m.mode));
    root.append(pick([{ id: 'ptt', label: m.ptt }, { id: 'converse', label: m.converse }], cfg.converse ? 'converse' : 'ptt', (id) => c.set({ converse: id === 'converse' })));
    root.append(toggle(m.wakeWord, cfg.wakeWord === true, (v) => c.set({ wakeWord: v }), { disabled: cfg.ears !== true }));
    if (cfg.wakeWord === true) root.append(note(m.wakeWordHint, true));
    root.append(note(fmt(m.pttKey, { key: prettyKey(cfg.pushToTalk) }), true));
    root.append(toggle(m.meter, cfg.micMeter !== false, (v) => c.set({ micMeter: v })));
    root.append(row(fmt(m.stt, { engine: m.engines[cfg.sttEngine] || cfg.sttEngine || '…' }), go(c, m.setup, 'setupEars')));

    // the live part
    const cells = [...meter.querySelectorAll('i')];
    const pen = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#ff2152';
    const g = scope.getContext('2d');
    let was = -1;
    let hearing = false;
    const tick = () => {
      const level = ears.stream ? ears.level : 0;
      const threshold = meterLevel(micThreshold(cfg.micSensitivity ?? 0.4));
      const lit = Math.round(level * CELLS);
      const cut = Math.round(threshold * CELLS);
      line.style.left = `calc(${(threshold * 100).toFixed(1)}% - 1px)`;
      if (lit !== was) {
        was = lit;
        cells.forEach((cell, i) => { cell.className = i < lit ? (i >= cut ? 'is-lit is-hot' : 'is-lit') : ''; });
      }
      const now = level >= threshold && level > 0.02;
      if (now !== hearing) {
        hearing = now;
        word.textContent = now ? m.hearing : m.quiet;
        stateRow.classList.toggle('is-hearing', now);
      }
      // her waveform, in her colour
      g.clearRect(0, 0, scope.width, scope.height);
      g.strokeStyle = pen;
      g.lineWidth = 3;
      g.beginPath();
      const data = ears.stream ? ears.vadData : null;
      const mid = scope.height / 2;
      if (data?.length) {
        const step = data.length / 170;
        for (let x = 0; x <= 170; x++) {
          const v = ((data[Math.floor(x * step)] - 128) / 128) * 3.2;
          const y = mid - Math.max(-1, Math.min(1, v)) * (mid - 6);
          if (x) g.lineTo((x / 170) * scope.width, y);
          else g.moveTo(0, y);
        }
      } else {
        g.moveTo(0, mid);
        g.lineTo(scope.width, mid);
      }
      g.stroke();
    };
    tick();
    const timer = setInterval(tick, 50);
    c.onLeave(() => clearInterval(timer));
    return root;
  },
};

// ---------- Senses ----------

const senses = {
  render(c) {
    const { t, cfg, host } = c;
    const s = t.senses;
    const win = isWindows(host);
    const root = el('div');
    root.append(toggle(s.vision, cfg.vision === true, (v) => c.set({ vision: v })));
    root.append(buttons(
      go(c, s.look, 'lookNow', {}, { disabled: cfg.vision !== true }),
      go(c, s.visionSetup, 'setupVision'),
    ));
    root.append(heading(s.visionAiTitle));
    const configured = new Set([cfg.provider, ...(cfg.keys || [])].filter((id) => PROVIDERS[id]));
    const visionProviders = [
      { id: '', label: s.visionSameAsChat },
      ...[...configured].map((id) => ({ id, label: PROVIDERS[id].name })),
    ];
    if (!configured.has('nvidia')) visionProviders.push({ id: 'nvidia', label: PROVIDERS.nvidia.name });
    const selectedVisionProvider = cfg.visionProvider || '';
    root.append(pick(visionProviders, selectedVisionProvider, (id) => c.set({
      visionProvider: id,
      visionModel: id === 'nvidia' ? 'nvidia/nemotron-3.5-super-vl-120b-a12b' : '',
    })));
    if (selectedVisionProvider === 'nvidia') {
      root.append(note(s.nvidiaVisionModels, true));
      root.append(pick([
        { id: 'nvidia/nemotron-3.5-super-vl-120b-a12b', label: s.nvidiaVisionNemotron },
      ], 'nvidia/nemotron-3.5-super-vl-120b-a12b', (id) => c.set({ visionModel: id })));
      if (!(cfg.keys || []).includes('nvidia')) root.append(note(s.nvidiaKeyHint, true));
    }
    root.append(toggle(s.rhythm, cfg.rhythm === true, (v) => c.set({ rhythm: v })));
    root.append(heading(''));
    root.append(toggle(s.hands, cfg.hands === true, (v) => c.set({ hands: v }), { disabled: !win, hint: win ? '' : s.winOnly }));
    root.append(toggle(s.handsType, cfg.handsType !== false, (v) => c.set({ handsType: v }), { disabled: !win || cfg.hands !== true }));
    root.append(note(s.privacy, true));
    return root;
  },
};

// ---------- Character ----------

const character = {
  render(c) {
    const { t, cfg, host } = c;
    const k = t.character;
    const j = t.journal || t.ring?.journal || {};
    const win = isWindows(host);
    const root = el('div');

    const mJournal = c.heart?.getJournal?.() || {
      mood: 'calm',
      level: 0,
      startedAt: Date.now(),
      origin: 'calm',
      reasonTag: 'calm',
      reasonDetail: '',
      canCancel: false,
    };

    const jJournal = c.jealousy?.getJournal?.() || {
      enabled: cfg.jealous !== false,
      active: false,
      paused: false,
      pauseRemainingMs: 0,
      rival: '',
      origin: 'watcher',
      startedAt: 0,
      reason: '',
      canCancel: false,
    };

    // Explicit emotional log heading
    if (j.title) root.append(heading(j.title));
    const journalWrap = el('div', 'ring__journal');

    // --- Mood Box ---
    const moodBox = el('div', 'ring__journal-box');
    const moodTitle = el('div', 'ring__journal-title', j.moodSection || 'Humeur');
    const moodGrid = el('div', 'ring__journal-grid');

    const moodName = lifeLines(c.lang).mood.label[mJournal.mood] || mJournal.mood.toUpperCase();
    const moodLevelStr = mJournal.level > 0 ? ` (${Math.round(mJournal.level * 100)}%)` : '';
    const moodStateText = cfg.emotions === false ? (j.status?.disabled || 'Désactivée') : `${moodName}${moodLevelStr}`;
    const moodOriginText = cfg.emotions === false ? '—' : formatOrigin(mJournal.origin, j);
    const moodDurationVal = el('span', 'ring__journal-value ring__journal-duration-mood');
    const updateMoodDuration = () => {
      const elapsed = Date.now() - (mJournal.startedAt || Date.now());
      moodDurationVal.textContent = cfg.emotions === false ? '—' : formatDuration(elapsed, j.durations || {});
    };
    updateMoodDuration();
    const moodReasonText = cfg.emotions === false ? '—' : formatReason(mJournal.reasonTag, mJournal.reasonDetail, j);

    moodGrid.append(
      el('span', 'ring__journal-label', j.stateLabel || 'État'),
      el('span', 'ring__journal-value', moodStateText),
      el('span', 'ring__journal-label', j.originLabel || 'Provenance'),
      el('span', 'ring__journal-value', moodOriginText),
      el('span', 'ring__journal-label', j.durationLabel || 'Durée'),
      moodDurationVal,
      el('span', 'ring__journal-label', j.reasonLabel || 'Raison'),
      el('span', 'ring__journal-value', moodReasonText),
    );

    const moodActions = el('div', 'ring__journal-actions');
    const cancelMoodBtn = button(j.cancelMood || 'Apaiser l’humeur', () => {
      c.heart?.calm?.();
      c.actions.run?.('calmMood');
      c.refresh();
    }, { disabled: !mJournal.canCancel || cfg.emotions === false });
    moodActions.append(cancelMoodBtn);

    moodBox.append(moodTitle, moodGrid, moodActions);
    moodBox.append(toggle(j.emotionsToggle || k.emotions, cfg.emotions !== false, (v) => c.set({ emotions: v })));
    journalWrap.append(moodBox);

    // --- Jealousy Box ---
    const jealBox = el('div', 'ring__journal-box');
    const jealTitle = el('div', 'ring__journal-title', j.jealousySection || 'Réaction de jalousie');
    const jealGrid = el('div', 'ring__journal-grid');

    let jealStateText = j.status?.noJealousy || 'Aucune réaction active';
    if (cfg.jealous === false) jealStateText = j.status?.disabled || 'Désactivée';
    else if (jJournal.active) jealStateText = (j.status?.activeRival || 'Active ({name})').replace('{name}', jJournal.rival || 'IA');
    else if (jJournal.paused) jealStateText = (j.status?.pausedRival || 'En pause ({time})').replace('{time}', formatDuration(jJournal.pauseRemainingMs, j.durations || {}));

    const jealOriginKey = jJournal.active || jJournal.paused ? jJournal.origin : 'watcher';
    const jealOriginText = cfg.jealous === false ? '—' : (j.origins?.[jealOriginKey] || j.origins?.page || jealOriginKey);

    const jealDurationVal = el('span', 'ring__journal-value ring__journal-duration-jealousy');
    c.state.openedAt ??= Date.now();
    const updateJealDuration = () => {
      if (cfg.jealous === false) {
        jealDurationVal.textContent = '—';
      } else if (jJournal.active && jJournal.startedAt) {
        jealDurationVal.textContent = formatDuration(Date.now() - jJournal.startedAt, j.durations || {});
      } else if (jJournal.paused) {
        const rem = Math.max(0, jJournal.pauseRemainingMs - (Date.now() - c.state.openedAt));
        jealDurationVal.textContent = (j.durations?.pausedRemaining || 'Pause : {time}').replace('{time}', formatDuration(rem, j.durations || {}));
      } else {
        jealDurationVal.textContent = j.durations?.none || '—';
      }
    };
    updateJealDuration();

    let jealReasonText = j.reasons?.none || 'Aucune';
    if (cfg.jealous === false) jealReasonText = '—';
    else if (jJournal.reason) jealReasonText = jJournal.reason;

    jealGrid.append(
      el('span', 'ring__journal-label', j.stateLabel || 'État'),
      el('span', 'ring__journal-value', jealStateText),
      el('span', 'ring__journal-label', j.originLabel || 'Provenance'),
      el('span', 'ring__journal-value', jealOriginText),
      el('span', 'ring__journal-label', j.durationLabel || 'Durée'),
      jealDurationVal,
      el('span', 'ring__journal-label', j.reasonLabel || 'Raison'),
      el('span', 'ring__journal-value', jealReasonText),
    );

    const jealActions = el('div', 'ring__journal-actions');
    const cancelJealBtn = button(j.cancelJealousy || 'Annuler la jalousie', () => {
      c.jealousy?.clear?.();
      c.actions.run?.('clearJealousy');
      c.refresh();
    }, { disabled: !jJournal.canCancel || cfg.jealous === false });
    jealActions.append(cancelJealBtn);

    jealBox.append(jealTitle, jealGrid, jealActions);
    jealBox.append(toggle(j.jealousyToggle || k.jealous, cfg.jealous !== false, (v) => c.set({ jealous: v })));
    jealBox.append(toggle(j.closePagesToggle || k.closePages, win && cfg.jealous !== false && cfg.closePages !== false, (v) => c.set({ closePages: v }), { disabled: cfg.jealous === false || !win }));
    journalWrap.append(jealBox);

    root.append(journalWrap);

    // Live timer while card is open
    const liveTimer = setInterval(() => {
      updateMoodDuration();
      updateJealDuration();
    }, 1000);
    c.onLeave(() => clearInterval(liveTimer));

    // Other character settings
    root.append(heading(''));
    root.append(toggle(k.life, cfg.life !== false, (v) => c.set({ life: v })));
    root.append(toggle(k.musicAware, cfg.musicAware !== false, (v) => c.set({ musicAware: v }), { disabled: !win }));
    root.append(toggle(k.dj, cfg.dj !== false, (v) => c.set({ dj: v }), { disabled: !win || cfg.musicAware === false }));
    root.append(toggle(k.learn, cfg.learn !== false, (v) => c.set({ learn: v })));
    root.append(heading(''));
    root.append(toggle(k.wander, cfg.wander === true, (v) => c.set({ wander: v })));
    root.append(toggle(k.possess, cfg.possess === true, (v) => c.set({ possess: v })));
    root.append(toggle(k.possessMove, cfg.possess === true && cfg.possessMove !== false, (v) => c.set({ possessMove: v }), { disabled: cfg.possess !== true || !win }));
    root.append(buttons(go(c, k.custom, 'customize'), cfg.claude ? go(c, k.report, 'report') : null));
    return root;
  },
};

// ---------- Colours ----------

const colours = {
  render(c) {
    const { t, cfg } = c;
    const k = t.colours;
    const root = el('div');
    root.append(note(k.hint, true));
    const grid = el('div', 'ring__swatches');
    const current = cfg.dataMod?.id ? '' : (cfg.colourTheme || 'classic');
    for (const id of THEME_IDS) {
      const b = el('button', `ring__swatch${id === current ? ' is-on' : ''}`);
      b.type = 'button';
      b.dataset.theme = id;
      const fx = { ...THEMES.classic.fx, ...(THEMES[id]?.fx || {}) };
      b.style.setProperty('--a', fx.red);
      b.style.setProperty('--b', fx.violet);
      b.append(el('span', 'ring__swatch-chip'), document.createTextNode(k.themes[id] || id));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (id !== current) {
          (async () => {
            if (cfg.dataMod?.id) {
              const result = await c.host.modsSetEnabled?.(cfg.dataMod.id, false);
              if (!result?.ok) throw new Error(result?.error || 'The active mod could not be disabled.');
            }
            c.set({ colourTheme: id, activeDataMod: '' });
          })().catch((error) => {
            c.state.coloursError = error?.message || String(error);
            c.refresh();
          });
        }
      });
      grid.append(b);
    }
    root.append(grid);
    if (c.state.coloursError) {
      root.append(note(c.state.coloursError, true));
      c.state.coloursError = '';
    }
    return root;
  },
};

// ---------- Mods ----------

function modAccessoryEditor(c, draft, labels) {
  const mod = draft.appearance;
  const root = el('section', 'ring__mod-editor');
  const inputs = new Map();
  // Work in the sprite's unscaled coordinate space: x/y and accessory dimensions
  // are CSS pixels on Capri's 352×532 canvas, before the pet window scales it.
  const ratio = Math.min(0.46, 172 / 352, 244 / 532);
  const preview = el('div', 'ring__accessory-preview');
  preview.style.width = `${352 * ratio}px`;
  preview.style.height = `${532 * ratio}px`;
  const base = el('img', 'ring__accessory-base');
  base.src = '../../assets/capri/capri-full.png';
  base.alt = '';
  base.draggable = false;
  base.style.width = `${240 * ratio}px`;
  base.style.height = `${420 * ratio}px`;
  base.style.left = `${56 * ratio}px`;
  base.style.top = `${56 * ratio}px`;
  const accessory = el('img', 'ring__accessory-item');
  accessory.src = mod.data || mod.src || '';
  accessory.alt = labels.accessoryPosition;
  accessory.draggable = false;
  const paint = () => {
    const layout = accessoryLayout(mod, ratio);
    accessory.style.width = `${layout.width}px`;
    accessory.style.height = `${layout.height}px`;
    accessory.style.left = `${layout.left}px`;
    accessory.style.top = `${layout.top}px`;
  };
  const addRange = (key, min, max, step) => {
    const control = slider({
      left: labels[key], min, max, step, value: Number.isFinite(mod[key]) ? mod[key] : ({ x: 118, y: 20, width: 120, height: 70 })[key],
      show: (value) => Number(value).toFixed(step < 1 ? 1 : 0),
      onInput: (value) => { mod[key] = value; paint(); },
    });
    inputs.set(key, control.querySelector('input'));
    root.append(control);
  };
  const addCoordinate = (key, min, max) => {
    const row = el('label', 'ring__coordinate');
    row.append(el('span', '', labels[key]));
    const input = el('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(Math.round(Number.isFinite(mod[key]) ? mod[key] : (key === 'x' ? 118 : 20)));
    input.setAttribute('aria-label', labels[key]);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      mod[key] = Math.max(min, Math.min(max, Math.round(value)));
      input.value = String(mod[key]);
      paint();
    });
    inputs.set(key, input);
    row.append(input);
    root.append(row);
  };
  preview.append(base, accessory);
  const hint = note(labels.dragHint, true);
  root.append(heading(labels.accessoryPosition), hint, preview);
  let drag = null;
  accessory.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, modX: mod.x ?? 118, modY: mod.y ?? 20 };
    accessory.setPointerCapture(event.pointerId);
    accessory.classList.add('is-dragging');
  });
  accessory.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    mod.x = Math.max(-200, Math.min(400, Math.round(drag.modX + (event.clientX - drag.x) / ratio)));
    mod.y = Math.max(-200, Math.min(384, Math.round(drag.modY + (event.clientY - drag.y) / ratio)));
    for (const key of ['x', 'y']) if (inputs.has(key)) inputs.get(key).value = String(mod[key]);
    paint();
  });
  const stopDrag = () => { drag = null; accessory.classList.remove('is-dragging'); };
  accessory.addEventListener('pointerup', stopDrag);
  accessory.addEventListener('pointercancel', stopDrag);
  addCoordinate('x', -200, 400);
  addCoordinate('y', -200, 384);
  addRange('width', 8, 320, 1);
  addRange('height', 8, 320, 1);
  paint();
  return root;
}

const mods = {
  render(c) {
    const { t } = c;
    const k = t.mods;
    c.card?.querySelector('.ring__mode-dialog-backdrop')?.remove();
    const root = el('div');
    const modError = el('p', 'ring__note ring__mod-error');
    modError.setAttribute('role', 'alert');
    modError.hidden = !c.state.modsError;
    modError.textContent = c.state.modsError || '';
    const showModError = (error) => {
      c.state.modsError = error?.message || String(error);
      modError.textContent = c.state.modsError;
      modError.hidden = false;
    };
    const runModAction = async (action) => {
      c.state.modsError = '';
      modError.hidden = true;
      try {
        const result = await action();
        if (!result?.ok) throw new Error(result?.error || 'The mod action could not be completed.');
        c.state.modsError = '';
        c.refresh();
        return result;
      } catch (error) {
        showModError(error);
        return null;
      }
    };
    root.append(heading(k.mods || 'Mods'));
    root.append(button(k.importMod || 'Import .capri-mod', async () => {
      try {
        const result = await c.host.modsImport?.();
        if (result?.canceled) return;
        if (result?.needsConfirmation) {
          c.hide();
          c.actions.run?.('modsDuplicatePrompt', {
            confirmationToken: result.confirmationToken,
            duplicate: result.duplicate,
          });
          return;
        }
        if (!result?.ok) throw new Error(result?.error || 'The mod could not be imported.');
        c.state.modsError = '';
        modError.hidden = true;
        await refreshMods();
      } catch (error) {
        showModError(error);
      } finally {
        c.host.setInteractive?.(true);
      }
    }, { primary: true }));
    root.append(buttons(
      button(k.createPaletteMode || 'Create colour mode', () => {
        c.state.createModeType = 'palette';
        c.state.createModeError = '';
        c.refresh();
      }, { primary: true }),
      button(k.createAccessoryMode || 'Create accessory mode…', () => {
        c.state.createModeType = 'appearance';
        c.state.createModeError = '';
        c.state.accessorySelection = null;
        c.refresh();
      }),
      button(k.createMusicMode || 'Create music mode…', () => {
        c.state.createModeType = 'music';
        c.state.createModeError = '';
        c.state.musicSelection = null;
        c.refresh();
      }),
    ));
    if (c.state.createModeType) {
      const type = c.state.createModeType;
      const backdrop = el('div', 'ring__mode-dialog-backdrop');
      const dialog = el('section', 'ring__mode-dialog');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const dialogTitle = type === 'palette' ? (k.createPaletteMode || 'Create colour mode')
        : type === 'appearance' ? (k.createAccessoryMode || 'Create accessory mode')
          : (k.createMusicMode || 'Create music mode');
      dialog.setAttribute('aria-label', dialogTitle);
      const closeDialog = () => {
        c.state.createModeType = '';
        c.state.activeColorField = '';
        c.state.createModeError = '';
        c.state.createModeDraftName = '';
        c.state.createModeColors = null;
        c.state.accessorySelection = null;
        c.state.createAccessoryLayout = null;
        c.state.accessoryUrl = '';
        c.state.musicSelection = null;
        c.state.musicUrl = '';
        c.state.musicTitle = '';
        c.state.musicArtist = '';
        c.refresh();
      };
      const dialogHeader = el('header', 'ring__mode-dialog-header');
      dialogHeader.append(heading(dialogTitle));
      const closeButton = el('button', 'ring__mode-close', '×');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', k.closeMode || 'Close mode creator');
      closeButton.title = k.closeMode || 'Close';
      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        closeDialog();
      });
      dialogHeader.append(closeButton);
      dialog.append(dialogHeader);
      let colors = { primary: '#ff2152', secondary: '#7b3dff' };
      if (type === 'palette') {
        const colorFields = el('div', 'ring__mod-colors');
        for (const [key, label, value] of [['primary', k.primaryColor || 'Primary colour', colors.primary], ['secondary', k.secondaryColor || 'Secondary colour', colors.secondary]]) {
          const row = el('label', 'ring__mod-color');
          row.append(el('span', '', label));
          const color = el('button', 'ring__color-choice');
          color.type = 'button';
          color.setAttribute('aria-label', `${label}: ${c.state.createModeColors?.[key] || value}`);
          color.title = c.state.createModeColors?.[key] || value;
          color.style.setProperty('--chosen-color', c.state.createModeColors?.[key] || value);
          color.addEventListener('click', (event) => {
            event.stopPropagation();
            c.state.activeColorField = key;
            c.refresh();
          });
          row.append(color);
          colorFields.append(row);
        }
        dialog.append(colorFields);
      } else if (type === 'appearance') {
        const sourceType = c.state.accessorySourceType || 'file';
        dialog.append(seg([
          { id: 'file', label: k.accessoryFile || 'PNG file' },
          { id: 'url', label: k.accessoryUrl || 'HTTPS URL' },
        ], sourceType, (id) => { c.state.accessorySourceType = id; c.refresh(); }));
        if (sourceType === 'url') {
          const url = el('input', 'ring__input ring__mode-source');
          url.type = 'url';
          url.maxLength = 2048;
          url.autocomplete = 'off';
          url.spellcheck = false;
          url.placeholder = k.accessoryUrlPlaceholder || 'https://…/accessory.png';
          url.value = c.state.accessoryUrl || '';
          url.setAttribute('aria-label', k.accessoryUrl || 'Accessory image URL');
          url.addEventListener('input', () => { c.state.accessoryUrl = url.value; });
          url.addEventListener('pointerdown', (event) => { event.stopPropagation(); c.host.setInteractive?.(true); c.host.focusOverlay?.(true); });
          url.addEventListener('click', (event) => event.stopPropagation());
          dialog.append(url, note(k.accessoryUrlHint || 'Use a direct HTTPS image URL.', true));
        } else {
          dialog.append(button(k.chooseAccessory || 'Choose a PNG accessory…', async () => {
            try {
              const selected = await c.host.modsChooseAccessory?.();
              if (selected?.canceled) return;
              if (!selected?.ok || !selected.token) {
                c.state.createModeError = selected?.error || (k.accessoryChooseFailed || 'The image could not be selected.');
              } else {
                c.state.accessorySelection = { token: selected.token, name: selected.name || '' };
                c.state.createModeError = '';
              }
            } catch (error) { c.state.createModeError = error?.message || (k.accessoryChooseFailed || 'The image could not be selected.'); }
            c.refresh();
          }));
          if (c.state.accessorySelection?.name) dialog.append(note(c.state.accessorySelection.name, true));
        }
        const layout = c.state.createAccessoryLayout || { x: 118, y: 20, width: 120, height: 70 };
        const fields = el('div', 'ring__accessory-fields');
        for (const [key, min, max] of [['x', -200, 400], ['y', -200, 384], ['width', 8, 320], ['height', 8, 320]]) {
          const coordinate = el('label', 'ring__coordinate');
          coordinate.append(el('span', '', k[key] || key));
          const input = el('input');
          input.type = 'number';
          input.min = String(min);
          input.max = String(max);
          input.step = '1';
          input.value = String(layout[key] ?? ({ x: 118, y: 20, width: 120, height: 70 })[key]);
          input.setAttribute('aria-label', k[key] || key);
          input.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
            c.host.setInteractive?.(true);
          });
          input.addEventListener('click', (event) => event.stopPropagation());
          input.addEventListener('input', () => {
            const value = Number(input.value);
            if (!Number.isFinite(value)) return;
            const clamped = Math.max(min, Math.min(max, Math.round(value)));
            c.state.createAccessoryLayout = {
              ...(c.state.createAccessoryLayout || layout),
              [key]: clamped,
            };
            input.value = String(clamped);
          });
          coordinate.append(input);
          fields.append(coordinate);
        }
        dialog.append(heading(k.accessoryPosition || 'Accessory position'), fields);
      } else {
        const sourceType = c.state.musicSourceType || 'folder';
        dialog.append(seg([
          { id: 'folder', label: k.musicFolder || 'Folder' },
          { id: 'url', label: k.musicUrl || 'HTTPS URL' },
        ], sourceType, (id) => { c.state.musicSourceType = id; c.refresh(); }));
        if (sourceType === 'url') {
          const url = el('input', 'ring__input ring__mode-source');
          url.type = 'url';
          url.maxLength = 2048;
          url.autocomplete = 'off';
          url.spellcheck = false;
          url.placeholder = k.musicUrlPlaceholder || 'https://…/track.mp3';
          url.value = c.state.musicUrl || '';
          url.setAttribute('aria-label', k.musicUrl || 'Music URL');
          url.addEventListener('input', () => { c.state.musicUrl = url.value; });
          url.addEventListener('pointerdown', (event) => { event.stopPropagation(); c.host.setInteractive?.(true); c.host.focusOverlay?.(true); });
          url.addEventListener('click', (event) => event.stopPropagation());
          dialog.append(url, note(k.musicUrlHint || 'Use a direct HTTPS audio URL, not a web page link.', true));
          for (const [key, label, placeholder, maxLength] of [
            ['musicTitle', k.trackTitle || 'Track title', k.trackTitlePlaceholder || 'Track title', 160],
            ['musicArtist', k.artist || 'Artist (optional)', k.artistPlaceholder || 'Artist (optional)', 160],
          ]) {
            const input = el('input', 'ring__input ring__mode-source');
            input.type = 'text';
            input.maxLength = maxLength;
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.placeholder = placeholder;
            input.value = c.state[key] || '';
            input.setAttribute('aria-label', label);
            input.addEventListener('input', () => { c.state[key] = input.value; });
            input.addEventListener('pointerdown', (event) => { event.stopPropagation(); c.host.setInteractive?.(true); c.host.focusOverlay?.(true); });
            input.addEventListener('click', (event) => event.stopPropagation());
            dialog.append(input);
          }
        } else {
          dialog.append(button(k.chooseMusicFolder || 'Choose a music folder…', async () => {
            try {
              const selected = await c.host.modsChooseMusicFolder?.();
              if (selected?.canceled) return;
              if (!selected?.ok || !selected.token) {
                c.state.createModeError = selected?.error || (k.musicFolderChooseFailed || 'The music folder could not be selected.');
              } else {
                c.state.musicSelection = { token: selected.token, name: selected.name || '' };
                c.state.createModeError = '';
              }
            } catch (error) { c.state.createModeError = error?.message || (k.musicFolderChooseFailed || 'The music folder could not be selected.'); }
            c.refresh();
          }));
          if (c.state.musicSelection?.name) dialog.append(note(c.state.musicSelection.name, true));
          dialog.append(note(k.musicFolderHint || 'Audio files in the selected folder will be added to Capri’s music library.', true));
        }
      }
      const nameInput = el('input', 'ring__input');
      nameInput.classList.add('ring__mode-name');
      nameInput.type = 'text';
      nameInput.maxLength = 80;
      nameInput.autocomplete = 'off';
      nameInput.spellcheck = false;
      nameInput.placeholder = k.newModeName || 'Name of the new mode';
      nameInput.setAttribute('aria-label', nameInput.placeholder);
      nameInput.value = c.state.createModeDraftName || '';
      nameInput.addEventListener('input', () => { c.state.createModeDraftName = nameInput.value; });
      nameInput.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        c.host.setInteractive?.(true);
      });
      nameInput.addEventListener('click', (event) => event.stopPropagation());
      dialog.append(nameInput);
      // Take keyboard focus; the desktop overlay normally ignores mouse input and is not focusable.
      c.focus?.(nameInput);
      if (c.state.createModeError) {
        const error = note(c.state.createModeError);
        error.classList.add('ring__mode-dialog-error');
        error.setAttribute('role', 'alert');
        dialog.append(error);
      }
      dialog.append(buttons(
        button(k.createMode || 'Create mode', async () => {
          c.state.createModeError = '';
          let result;
          try {
            result = type === 'palette'
              ? await c.host.modsCreatePalette?.(nameInput.value, c.state.createModeColors || colors)
              : type === 'appearance'
                ? (c.state.accessorySourceType || 'file') === 'url'
                  ? await c.host.modsCreateAccessoryUrl?.(c.state.accessoryUrl || '', nameInput.value, c.state.createAccessoryLayout || { x: 118, y: 20, width: 120, height: 70 })
                  : c.state.accessorySelection?.token
                    ? await c.host.modsCreateAccessory?.(c.state.accessorySelection.token, nameInput.value, c.state.createAccessoryLayout || { x: 118, y: 20, width: 120, height: 70 })
                    : { ok: false, error: k.chooseAccessoryFirst || 'Choose an accessory image first.' }
                : (c.state.musicSourceType || 'folder') === 'url'
                  ? await c.host.modsCreateMusicUrl?.({
                    name: nameInput.value, title: c.state.musicTitle || '', artist: c.state.musicArtist || '', url: c.state.musicUrl || '',
                  })
                  : c.state.musicSelection?.token
                    ? await c.host.modsCreateMusic?.(c.state.musicSelection.token, nameInput.value)
                    : { ok: false, error: k.chooseMusicFolderFirst || 'Choose a music folder first.' };
          } catch (error) { result = { ok: false, error: error?.message || String(error) }; }
          if (!result?.ok) {
            c.state.createModeError = result?.code === 'MOD_NAME_TAKEN'
              ? (k.nameTaken || 'That mode name is already taken.')
              : String(result?.error || k.modeCreateFailed || 'The mode could not be created.');
            c.refresh();
            return;
          }
          c.state.createModeType = '';
          c.state.activeColorField = '';
          c.state.createModeError = '';
          c.state.createModeDraftName = '';
          c.state.createModeColors = null;
          c.state.accessorySelection = null;
          c.state.createAccessoryLayout = null;
          c.state.musicSelection = null;
          c.state.accessoryUrl = '';
          c.state.musicUrl = '';
          c.state.musicTitle = '';
          c.state.musicArtist = '';
          c.refresh();
        }, { primary: true }),
        button(k.cancelEdit || 'Cancel', closeDialog),
      ));
      if (type === 'palette' && c.state.activeColorField) {
        const field = c.state.activeColorField;
        const fieldLabel = field === 'primary' ? (k.primaryColor || 'Primary colour') : (k.secondaryColor || 'Secondary colour');
        const palette = el('section', 'ring__color-palette');
        palette.setAttribute('role', 'dialog');
        palette.setAttribute('aria-label', `${fieldLabel} ${k.paletteColors || 'palette'}`);
        const header = el('header', 'ring__color-palette-header');
        header.append(el('b', '', fieldLabel));
        const close = el('button', 'ring__mode-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', k.closePalette || 'Close colour palette');
        close.addEventListener('click', (event) => {
          event.stopPropagation();
          c.state.activeColorField = '';
          c.refresh();
        });
        header.append(close);
        palette.append(header);
        palette.append(colorControls({
          label: fieldLabel,
          value: c.state.createModeColors?.[field] || colors[field],
          k,
          onChange: (color) => {
            c.state.createModeColors = { ...(c.state.createModeColors || colors), [field]: color };
          },
        }));
        const swatches = el('div', 'ring__color-swatches');
        const choices = [
          '#ff2152', '#ff4f87', '#ff8fc4', '#ffb347', '#ffc531', '#f4f2ff',
          '#b6ff2e', '#62e6a7', '#22e4ff', '#1fd6ff', '#559dff', '#7b3dff',
          '#a45bff', '#d4134a', '#ffffff', '#22283a',
        ];
        for (const hex of choices) {
          const swatch = el('button', 'ring__color-swatch');
          swatch.type = 'button';
          swatch.style.setProperty('--swatch-color', hex);
          swatch.setAttribute('aria-label', `${fieldLabel} ${hex}`);
          swatch.title = hex;
          swatch.addEventListener('click', (event) => {
            event.stopPropagation();
            c.state.createModeColors = { ...(c.state.createModeColors || colors), [field]: hex };
            c.state.activeColorField = '';
            c.refresh();
          });
          swatches.append(swatch);
        }
        palette.append(swatches);
        backdrop.append(palette);
      }
      backdrop.append(dialog);
      (c.card || root).append(backdrop);
    }
    root.append(button(k.addMusicFolder || 'Add music folder…', async () => {
      try {
        const result = await c.host.modsImportMusicFolder?.();
        if (result?.canceled) return;
        if (!result?.ok) throw new Error(result?.error || 'The music folder could not be added.');
        c.state.modsError = '';
        await refreshMods();
      } catch (error) {
        showModError(error);
      } finally {
        c.host.setInteractive?.(true);
      }
    }));
    root.append(note(k.importHint || 'Import palette or accessory mods here.', true));
    root.append(modError);
    const modsRoot = el('div', 'ring__mods');
    root.append(modsRoot);
    const refreshMods = async () => {
      modsRoot.replaceChildren();
      let mods;
      try {
        const result = await c.host.modsList?.();
        if (!result?.ok) throw new Error(result?.error || 'Installed mods could not be loaded.');
        mods = result.mods || [];
      } catch (error) {
        showModError(error);
        modsRoot.append(note(k.noMods || 'No mods installed', true));
        c.fit?.();
        return;
      }
      const paletteMods = mods.filter((mod) => !mod.problem && mod.kind === 'palette');
      const appearanceMods = mods.filter((mod) => !mod.problem && mod.kind === 'appearance');
      const musicMods = mods.filter((mod) => !mod.problem && mod.kind === 'music');
      const renderEditor = (mod) => {
        const draft = c.state.modDraft?.id === mod.id ? c.state.modDraft : null;
        if (!draft) return note(k.loadingEdit || 'Loading mode…', true);
        const editor = el('section', 'ring__mod-editor');
        editor.append(heading(`${k.edit || 'Edit'} · ${mod.name}`));
        if (draft.palette) {
          const defaults = { hue: 0.968, mix: 0.6, sat: 1, val: 1 };
          const paletteColors = el('div', 'ring__mod-colors');
          for (const [key, label, fallback] of [
            ['red', k.primaryColor || 'Primary colour', '#ff2152'],
            ['violet', k.secondaryColor || 'Secondary colour', '#7b3dff'],
          ]) {
            const row = el('label', 'ring__mod-color');
            row.append(el('span', '', label));
            const selected = normalizedColor(draft.palette.fx?.[key]) || fallback;
            row.append(colorControls({
              label, value: selected, k,
              onChange: (color) => {
                draft.palette.fx = { ...(draft.palette.fx || {}), [key]: color };
                if (key === 'red') applyPrimaryToPalette(draft.palette, color);
              },
            }));
            paletteColors.append(row);
          }
          editor.append(heading(k.paletteColors || 'Palette colours'), paletteColors);
          for (const [field, min, max, step] of [['hue', 0, 1, 0.01], ['mix', 0, 1, 0.01], ['saturation', 0, 1.5, 0.01], ['brightness', 0, 1.5, 0.01]]) {
            const key = field === 'saturation' ? 'sat' : field === 'brightness' ? 'val' : field;
            editor.append(slider({ left: k[field] || field, min, max, step, value: draft.palette[key] ?? defaults[key], show: (value) => Number(value).toFixed(2), onInput: (value) => { draft.palette[key] = value; } }));
          }
        } else if (draft.appearance) {
          editor.append(modAccessoryEditor(c, draft, k));
        }
        editor.append(buttons(
          button(k.saveChanges || 'Save changes', async () => {
            const changes = draft.palette ? { palette: draft.palette } : { appearance: draft.appearance };
            c.state.modDraft = null;
            c.state.editModId = '';
            await runModAction(() => c.host.modsUpdate?.(mod.id, changes));
          }, { primary: true }),
          button(k.cancelEdit || 'Cancel', () => { c.state.modDraft = null; c.state.editModId = ''; c.refresh(); }),
        ));
        const versions = el('div', 'ring__mod-history');
        versions.append(heading(k.restoreVersion?.split('{')[0].trim() || 'Saved versions'));
        Promise.resolve(c.host.modsHistory?.(mod.id)).then((result) => {
          if (!result) return;
          if (!result?.ok || !result.versions?.length) { versions.append(note(k.noHistory || 'No earlier versions saved.', true)); c.fit?.(); return; }
          for (const version of result.versions) {
            const date = new Intl.DateTimeFormat(c.lang, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(version.savedAt));
            const label = fmt(k.restoreVersion || 'Restore {date}', { date: `${date}${version.version ? ` · ${version.version}` : ''}` });
            versions.append(button(label, async () => {
              c.state.modDraft = null;
              c.state.editModId = '';
              await runModAction(() => c.host.modsRestore?.(mod.id, version.id));
            }));
          }
          c.fit?.();
        }).catch((error) => showModError(error));
        editor.append(versions);
        return editor;
      };
      const beginEdit = async (mod) => {
        c.state.editModId = mod.id;
        c.state.modDraft = null;
        c.refresh();
        try {
          const result = await c.host.modsGet?.(mod.id);
          if (!result?.ok || !result.mod) throw new Error(result?.error || 'This mode could not be loaded for editing.');
          c.state.modDraft = {
            id: mod.id,
            palette: result.mod.palette ? JSON.parse(JSON.stringify(result.mod.palette)) : null,
            appearance: result.mod.appearance ? JSON.parse(JSON.stringify(result.mod.appearance)) : null,
          };
        } catch (error) {
          c.state.editModId = '';
          showModError(error);
        }
        if (c.open) c.refresh();
      };
      if (paletteMods.length) {
        modsRoot.append(heading(k.paletteMods || 'Palette mods'));
        for (const mod of paletteMods) {
          modsRoot.append(toggle(mod.name + (mod.version ? ` · ${mod.version}` : ''), mod.enabled, async (on) => {
            await runModAction(() => c.host.modsSetEnabled?.(mod.id, on));
          }));
          modsRoot.append(button(k.edit || 'Edit', () => beginEdit(mod)));
          if (c.state.editModId === mod.id) modsRoot.append(renderEditor(mod));
          modsRoot.append(button(k.removeMod || 'Remove', async () => {
            await runModAction(() => c.host.modsUninstall?.(mod.id));
          }, { danger: true }));
        }
      }
      if (appearanceMods.length) {
        modsRoot.append(heading(k.appearanceMods || 'Appearance mods'));
        for (const mod of appearanceMods) {
          if (mod.remoteImageHost) {
            modsRoot.append(note(fmt(k.remoteImage || 'Remote image from {host}; loaded while this mod is enabled.', { host: mod.remoteImageHost }), true));
          }
          modsRoot.append(toggle(mod.name + (mod.version ? ` · ${mod.version}` : ''), mod.enabled, async (on) => {
            await runModAction(() => c.host.modsSetEnabled?.(mod.id, on));
          }));
          modsRoot.append(button(k.edit || 'Edit', () => beginEdit(mod)));
          if (c.state.editModId === mod.id) modsRoot.append(renderEditor(mod));
          modsRoot.append(button(k.removeMod || 'Remove', async () => {
            await runModAction(() => c.host.modsUninstall?.(mod.id));
          }, { danger: true }));
        }
      }
      if (musicMods.length) {
        modsRoot.append(heading(k.musicModes || 'Music modes'));
        for (const mod of musicMods) {
          modsRoot.append(toggle(`${mod.name} · ${fmt(k.trackCount || '{count} tracks', { count: mod.trackCount || 0 })}`, mod.enabled, async (on) => {
            await runModAction(() => c.host.modsSetEnabled?.(mod.id, on));
          }));
          modsRoot.append(button(k.removeMod || 'Remove', async () => {
            await runModAction(() => c.host.modsUninstall?.(mod.id));
          }, { danger: true }));
        }
      }
      const brokenMods = mods.filter((mod) => mod.problem);
      for (const mod of brokenMods) {
        modsRoot.append(note(`${mod.name}: ${mod.problem}`, true));
        modsRoot.append(button(k.removeMod || 'Remove', async () => {
          await runModAction(() => c.host.modsUninstall?.(mod.fileName || mod.id));
        }, { danger: true }));
      }
      if (!paletteMods.length && !appearanceMods.length && !musicMods.length && !brokenMods.length) {
        modsRoot.append(note(k.noMods || 'No mods installed', true));
      }
      c.fit?.();
    };
    refreshMods();
    return root;
  },
};

// ---------- Voice ----------

const voice = {
  render(c) {
    const { t, cfg } = c;
    const v = t.voice;
    const root = el('div');
    root.append(pick(['off', 'chat', 'all'].map((id) => ({ id, label: v[id] })), cfg.voiceMode || 'chat', (id) => c.set({ voiceMode: id })));
    root.append(heading(''));
    root.append(toggle(v.mute, cfg.muted === true, (on) => c.set({ muted: on })));
    root.append(slider({
      left: v.volume,
      min: 0,
      max: 1,
      step: 0.05,
      value: cfg.volume ?? 0.7,
      show: (x) => `${Math.round(x * 100)}%`,
      onInput: (x) => {
        c.drag({ volume: x });
        c.voice?.configure({ volume: x });
      },
      onChange: () => c.drop(),
    }));
    root.append(heading(v.engine));
    root.append(pick(['system', 'piper', 'chatterbox', 'openai', 'elevenlabs', 'custom'].map((id) => ({ id, label: v.engines[id] })), cfg.ttsEngine || 'system', (id) => c.set({ ttsEngine: id })));
    // Chatterbox, on this PC: whether it is up, which folder, and a button to start it again
    if (cfg.ttsEngine === 'chatterbox' && c.host.chatterboxStatus) {
      const box = el('div');
      root.append(box);
      const paint = (st) => {
        const text = st.phase === 'ready' ? v.cbReady
          : st.phase === 'starting' ? v.cbStarting
          : st.phase === 'failed' ? v.cbFailed.replace('{error}', String(st.error || '').slice(0, 160))
          : v.cbOff;
        box.replaceChildren(
          note(text, st.phase !== 'failed'),
          note(st.dir ? v.cbDir.replace('{dir}', st.dir) : v.cbNoDir, true),
          ...(st.phase === 'starting' && st.log?.length ? [note(st.log[st.log.length - 1].slice(0, 120), true)] : []),
          buttons(
            button(v.cbFolder, () => { c.host.chatterboxChoose().then(() => c.refresh()); }),
            button(v.cbRestart, () => { c.host.chatterboxRestart().then(paint); }),
            button(v.cbPrepare, () => c.host.prepareShow?.()),
          ),
        );
      };
      c.host.chatterboxStatus().then(paint).catch(() => {});
      c.onLeave(c.host.onChatterbox(paint));
    }
    // Piper, on this PC: whether it works, which voice, and the preparation window
    if (cfg.ttsEngine === 'piper' && c.host.piperStatus) {
      const box = el('div');
      root.append(box);
      const paint = (st) => {
        const text = st.phase === 'ready' ? v.ppReady.replace('{voice}', st.voice || '')
          : st.phase === 'starting' ? v.ppStarting
          : st.phase === 'failed' ? v.ppFailed.replace('{error}', String(st.error || '').slice(0, 160))
          : v.ppOff;
        box.replaceChildren(note(text, st.phase !== 'failed'), buttons(button(v.cbPrepare, () => c.host.prepareShow?.())));
      };
      c.host.piperStatus().then(paint).catch(() => {});
      c.onLeave(c.host.onPiper(paint));
    }
    // Chatterbox: the recording she was given as her voice (she speaks like it), and its length and faults
    if (cfg.ttsEngine === 'chatterbox' && c.host.voiceSample) {
      const box = el('div');
      root.append(heading(v.sampleH), box);
      let alive = true;
      c.onLeave(() => { alive = false; });
      const paint = (st, said = '', bad = false) => {
        if (!alive) return;
        const length = st.seconds != null ? fmt(v.sampleSeconds, { n: st.seconds }) : '';
        box.replaceChildren(
          note(st.has ? fmt(v.sampleHave, { file: `${st.name}${st.ext}`, length }) : v.sampleNone, !st.has || bad),
          ...(said ? [note(said, !bad)] : []),
          ...(st.has ? (st.warn || []).map((w) => note(v.sampleWarn[w] || '', true)) : []),
          note(v.sampleNote, true),
          buttons(
            button(v.sampleChoose, async () => {
              const res = await c.host.voiceSampleChoose().catch(() => null);
              if (!res || res.error === 'canceled') return;
              paint(res, res.ok ? v.sampleOk : v.sampleErr[res.error] || v.sampleErr.copy, !res.ok);
            }),
            ...(st.has ? [button(v.sampleRemove, async () => paint(await c.host.voiceSampleRemove()))] : []),
          ),
        );
      };
      c.host.voiceSample().then((st) => paint(st)).catch(() => {});
    }
    // Piper: which of its voices (in her language) she speaks with
    if (cfg.ttsEngine === 'piper' && c.host.piperVoices) {
      const box = el('div');
      root.append(box);
      let alive = true;
      c.onLeave(() => { alive = false; });
      c.host.piperVoices().then(({ voices = [], current = '' }) => {
        if (!alive || !voices.length) return;
        box.replaceChildren(
          heading(v.ppVoiceH),
          ...(voices.length > 1 ? [pick(voices.map((id) => ({ id, label: id })), cfg.ttsVoice && voices.includes(cfg.ttsVoice) ? cfg.ttsVoice : current, (id) => c.set({ ttsVoice: id }))] : []),
          note(v.ppVoiceNote, true),
        );
      }).catch(() => {});
    }
    root.append(buttons(go(c, v.setup, 'setupVoice'), go(c, v.test, 'testVoice')));

    // where it comes out: speakers, headphones... (and your own mic there, to check)
    const { voice: sound, ears, state } = c;
    root.append(heading(v.outH));
    root.append(note(sound?.canPickOutput === false ? v.outNone : `${v.outNote}${cfg.ttsEngine === 'system' || !cfg.ttsEngine ? ` ${v.outSystem}` : ''}`, true));
    if (sound?.canPickOutput !== false) {
      const list = el('div');
      root.append(list);
      let alive = true;
      c.onLeave(() => { alive = false; });
      sound?.outputs().then((outs) => {
        if (!alive) return;
        const items = outs.map((d) => ({ id: d.id, label: d.id ? d.label : v.outDefault }));
        list.replaceChildren(pick(items, cfg.audioOut || '', (id) => {
          c.set({ audioOut: id });
          setTimeout(() => sound.test(), 350); // a sound on it, to hear it's the right one
        }));
      }).catch(() => {});
      if (sound?.sinkError) root.append(note(v.outFailed));
    }
    root.append(buttons(button(v.outTest, () => sound?.test())));
    root.append(toggle(v.monitor, state.monitor === true && cfg.ears === true, (on) => {
      state.monitor = on;
      state.monitorFailed = false;
      if (on) {
        c.hold('monitor', () => ears.monitor(true).then((ok) => {
          if (!ok) {
            state.monitor = false;
            state.monitorFailed = true;
            c.unhold('monitor');
            c.refresh();
          }
          return ok;
        }), () => ears.monitor(false));
      } else c.unhold('monitor');
      c.refresh();
    }, { disabled: !cfg.ears, hint: cfg.ears ? '' : v.monitorNeeds }));
    root.append(note(state.monitorFailed ? v.monitorFailed : v.monitorHint, !state.monitorFailed));
    return root;
  },
};

// ---------- More ----------

const LANGS = [['auto', null], ['ru', 'Русский'], ['en', 'English'], ['fr', 'Français']];
const SIZES = [['small', 0.45], ['medium', 0.6], ['large', 0.8]];

function dateTimeInputValue(at, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const more = {
  render(c) {
    const { t, cfg, host } = c;
    const m = t.more;
    const root = el('div');
    const size = SIZES.reduce((best, [id, scale]) => (Math.abs(scale - (cfg.scale ?? 0.8)) < Math.abs(best[1] - (cfg.scale ?? 0.8)) ? [id, scale] : best), SIZES[2])[0];
    root.append(row(m.size, seg(SIZES.map(([id, scale]) => ({ id, label: m[id], scale })), size, (id) => c.set({ scale: SIZES.find(([s]) => s === id)[1] }))));
    root.append(toggle(m.capriCursor, cfg.capriCursor === true, (on) => c.set({ capriCursor: on })));
    const gamingLabel = c.lang === 'en' ? 'Gaming Mode (quiet presence)' : c.lang === 'ru' ? 'Игровой режим (тихое присутствие)' : 'Gaming Mode (présence discrète)';
    root.append(toggle(gamingLabel, cfg.gamingMode === true, (on) => c.set({ gamingMode: on })));
    root.append(row(m.rest, seg([{ id: 'corner', label: m.corner }, { id: 'taskbar', label: m.taskbar }], cfg.rest || 'corner', (id) => c.set({ rest: id }))));
    root.append(row(m.lang, null));
    root.append(seg(LANGS.map(([id, name]) => ({ id, label: name || m.auto })), cfg.langSetting ?? cfg.lang ?? 'auto', (id) => c.set({ lang: id })));
    root.append(row(m.theme, seg(WINDOW_THEME_IDS.map((id) => ({
      id,
      label: m[`theme${id === 'nightcity' ? 'NightCity' : 'Classic'}`],
    })), cfg.theme || 'classic', (id) => c.set({ theme: id }))));
    root.append(heading(''));
    root.append(buttons(
      go(c, m.teleport, 'teleport'),
      go(c, m.satellite, 'satellite'),
      go(c, m.help, 'welcome'),
      go(c, m.model, 'setupChat'),
      ...(host.platform === 'darwin' && host.openMacPermissions ? [button(m.macPermissions || 'Autorisations macOS…', () => host.openMacPermissions())] : []),
    ));
    root.append(heading(c.lang === 'en' ? 'Local games and tools' : c.lang === 'ru' ? 'Локальные игры и инструменты' : 'Jeux locaux et outils'));
    root.append(buttons(
      button(c.lang === 'en' ? 'Chess' : c.lang === 'ru' ? 'Шахматы' : 'Échecs', () => { c.hide(); c.host.chessStart?.(); }),
      button(c.lang === 'en' ? 'Tic-tac-toe' : c.lang === 'ru' ? 'Крестики-нолики' : 'Morpion', () => { c.hide(); c.host.openLocalGame?.('tic-tac-toe'); }),
      button('2048', () => { c.hide(); c.host.openLocalGame?.('2048'); }),
    ));
    root.append(buttons(
      button(c.lang === 'en' ? 'Drawing board' : c.lang === 'ru' ? 'Рисование' : 'Tableau de dessin', () => { c.hide(); c.host.openDrawing?.(); }),
      button(c.lang === 'en' ? 'Data & Obsidian' : c.lang === 'ru' ? 'Данные и Obsidian' : 'Données et Obsidian', () => { c.hide(); c.host.openDataTools?.(); }),
    ));
    // her main menu: change what she thinks and talks with at any moment, and take off what you do not need
    root.append(buttons(
      button(m.hub, () => {
        c.hide();
        host.hubShow?.();
      }),
      button(m.manage, () => {
        c.hide();
        host.hubShow?.('manage');
      }),
    ));
    if (c.reminders) {
      root.append(heading(m.reminders));
      const list = el('div', 'ring__reminders');
      for (const reminder of c.reminders.upcoming) {
        const rowEl = el('div', 'ring__reminder-item');
        const time = new Intl.DateTimeFormat(c.lang, {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: reminder.timeZone || undefined,
        }).format(new Date(reminder.at));
        const repeat = reminder.recurrence
          ? ` · ${reminder.recurrence.interval > 1 ? `${reminder.recurrence.interval} ` : ''}${m[`repeat${reminder.recurrence.unit}`]}`
          : '';
        const label = el('span', 'ring__label-text',
          `${reminder.enabled === false ? '○ ' : ''}${reminder.text} · ${time}${repeat} · ${reminder.timeZone || m.localTimeZone}`);
        label.title = label.textContent;
        rowEl.append(label);
        rowEl.append(buttons(
          button(m.editReminder, () => {
            c.state.reminderDraft = { ...reminder, recurrence: reminder.recurrence ? { ...reminder.recurrence } : null };
            c.refresh();
          }),
          button(reminder.enabled === false ? m.enableReminder : m.disableReminder, () => {
            c.reminders.setEnabled(reminder.id, reminder.enabled === false);
            c.refresh();
          }),
          button(m.deleteReminder, () => {
            c.reminders.remove(reminder.id);
            c.refresh();
          }, { danger: true }),
        ));
        list.append(rowEl);
      }
      if (!c.reminders.list.length) list.append(note(m.noReminders, true));
      root.append(list);

      const draft = c.state.reminderDraft || {
        text: '',
        at: Date.now() + 60 * 60 * 1000,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        recurrence: null,
      };
      const form = el('form', 'ring__reminder-editor');
      const textInput = el('input', 'ring__input');
      textInput.type = 'text';
      textInput.maxLength = 140;
      textInput.required = true;
      textInput.placeholder = m.reminderText;
      textInput.value = draft.text || '';
      const timeInput = el('input', 'ring__input');
      timeInput.type = 'datetime-local';
      timeInput.required = true;
      timeInput.value = dateTimeInputValue(draft.at, draft.timeZone);
      const zoneInput = el('input', 'ring__input');
      zoneInput.type = 'text';
      zoneInput.placeholder = 'Europe/Paris';
      zoneInput.value = draft.timeZone || '';
      const recurrence = el('select', 'ring__input');
      for (const value of ['none', 'day', 'week', 'month']) {
        const option = el('option', '', value === 'none' ? m.noRepeat : m[`repeat${value}`]);
        option.value = value;
        recurrence.append(option);
      }
      recurrence.value = draft.recurrence?.unit || 'none';
      const interval = el('input', 'ring__input');
      interval.type = 'number';
      interval.min = '1';
      interval.max = '365';
      interval.value = String(draft.recurrence?.interval || 1);
      interval.disabled = recurrence.value === 'none';
      recurrence.addEventListener('change', () => { interval.disabled = recurrence.value === 'none'; });
      const error = el('p', 'ring__note is-dim');
      error.setAttribute('role', 'alert');
      const save = button(draft.id ? m.saveReminder : m.addReminder, () => form.requestSubmit(), { primary: true });
      const cancel = draft.id ? button(m.cancelEdit, () => {
        delete c.state.reminderDraft;
        c.refresh();
      }) : null;
      form.append(textInput, timeInput, zoneInput, recurrence, interval, buttons(save, cancel));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        try {
          const timeZone = zoneInput.value.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const patch = {
            text: textInput.value,
            at: zonedTimeToEpoch(timeInput.value, timeZone),
            timeZone,
            recurrence: recurrence.value === 'none' ? null : { unit: recurrence.value, interval: Number(interval.value) },
          };
          if (draft.id) c.reminders.edit(draft.id, patch);
          else c.reminders.add(patch.at, patch.text, { timeZone, recurrence: patch.recurrence });
          delete c.state.reminderDraft;
          c.refresh();
        } catch (cause) {
          error.textContent = cause.message;
        }
      });
      root.append(form, error);
      c.focus(textInput);
    }
    root.append(buttons(
      button(m.hide, () => {
        c.hide();
        host.setConfig({ visible: false });
        c.actions.run?.('stow', { on: true });
      }),
      button(m.system, () => {
        c.hide();
        host.openMenu();
      }),
    ));
    root.append(buttons(
      button(m.goodbye, () => {
        c.hide();
        host.farewellStart?.();
      }),
      button(m.quit, () => {
        c.hide();
        host.quit?.();
      }, { danger: true }),
    ));
    return root;
  },
};

export const TABS = { bond, brain, mic, senses, character, colours, mods, voice, more, chat: { render: () => el('div') } };

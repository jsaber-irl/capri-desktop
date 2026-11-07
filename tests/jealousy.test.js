'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', file)).href);

function fixture({ now = () => Date.now(), lang = 'en' } = {}) {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  };
  const shown = [];
  const closed = [];
  const reactions = [];
  const timers = [];
  const panel = {
    current: null,
    say(message) {
      shown.push(message);
      this.current = message;
      return true;
    },
    hide() {
      this.current = null;
    },
  };
  const heart = {
    events: [],
    event(name, detail) { this.events.push({ name, detail }); },
    clearJealousy() { this.cleared = true; },
  };
  const capri = { react: (mood) => reactions.push(mood) };
  const host = { closePage: async (id, key, confirmed) => { closed.push({ id, key, confirmed }); return { ok: true }; } };
  const setTimer = (callback, delay) => {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer;
  };
  const clearTimer = (timer) => { if (timer) timer.cleared = true; };
  return { saved, storage, shown, closed, reactions, panel, heart, capri, host, now, lang, timers, setTimer, clearTimer };
}

test('a rival page is shown briefly before closing and the ten-minute pause is persisted', async () => {
  const { Jealousy, PAGE_PREVIEW_MS, SNOOZE_MS } = await load('jealousy.js');
  let time = 1000;
  const f = fixture({ now: () => time, lang: 'fr' });
  const jealousy = new Jealousy({ ...f, lang: () => f.lang });
  jealousy.configure({ jealous: true, closePages: true });
  const page = { fg: 42, ai: ['chatgpt'], pages: ['chatgpt'], apps: [], dl: false };

  jealousy.onWindows({
    ...page,
    rivalTitle: 'ChatGPT — New chat',
    rivalUrl: 'https://chatgpt.com/',
  });
  assert.equal(f.shown.length, 1);
  assert.match(f.shown[0].line, /ChatGPT/);
  assert.equal(f.shown[0].quote, 'ChatGPT — New chat\nhttps://chatgpt.com/');
  assert.equal(f.closed.length, 0, 'show the page details before closing its tab');
  assert.equal(f.timers[0].delay, PAGE_PREVIEW_MS);
  f.timers[0].callback();
  assert.deepEqual(f.closed, [{ id: 42, key: 'chatgpt', confirmed: true }]);
  assert.equal(f.shown[0].actions.some(({ id }) => id === 'jealousy-confirm-close'), false);
  assert.equal(f.heart.events[0].name, 'jealousy');
  assert.equal(f.heart.events[0].detail, 'ChatGPT');

  f.shown[0].onAction('jealousy-snooze');
  assert.equal(f.closed.length, 1, 'snoozing after close cannot close it again');
  assert.equal(jealousy.snoozedUntil, time + SNOOZE_MS);
  assert.equal(f.saved.get('capri.jealousy'), String(time + SNOOZE_MS));
  assert.equal(f.timers[1].delay, SNOOZE_MS);
  assert.equal(jealousy.relieve(), false, 'the pause cannot be extended by repeated clicks');
  jealousy.stop();
});

test('choosing the ten-minute break during the preview cancels automatic closing', async () => {
  const { Jealousy, PAGE_PREVIEW_MS } = await load('jealousy.js');
  const f = fixture({ now: () => 1000 });
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({ fg: 42, ai: ['chatgpt'], pages: ['chatgpt'], apps: [], dl: false });
  assert.equal(f.timers[0].delay, PAGE_PREVIEW_MS);
  f.shown[0].onAction('jealousy-snooze');
  assert.equal(f.timers[0].cleared, true);
  f.timers[0].callback();
  assert.equal(f.closed.length, 0);
  jealousy.stop();
});

test('rival page details are restricted to page targets and omit query and fragment data', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: false });
  jealousy.onWindows({
    fg: 43, ai: ['claude'], pages: ['claude'], apps: [], dl: false,
    rivalTitle: 'Claude',
    rivalUrl: 'https://claude.ai/chat/123?secret=prompt#answer',
  });
  assert.equal(f.shown[0].quote, 'Claude\nhttps://claude.ai/chat/123');
  jealousy.onWindows({
    fg: 44, ai: ['claude'], pages: [], apps: ['claude'], dl: false,
    rivalTitle: 'Private unrelated title',
    rivalUrl: 'https://example.com/private',
  });
  assert.equal(f.shown[1].quote, '');
  jealousy.stop();
});

test('the ten-minute pause expires on schedule and monitoring resumes', async () => {
  const { Jealousy, SNOOZE_MS } = await load('jealousy.js');
  let time = 5000;
  const f = fixture({ now: () => time });
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: false });
  jealousy.onWindows({ fg: 5, ai: ['grok'], pages: ['grok'], apps: [], dl: false });
  f.shown[0].onAction('jealousy-snooze');
  assert.equal(f.shown.length, 1);
  assert.equal(f.timers[0].delay, SNOOZE_MS);
  time += SNOOZE_MS;
  f.timers[0].callback();
  assert.equal(f.shown.length, 2);
  jealousy.stop();
});

test('download pages are shown briefly, then close automatically without confirmation', async () => {
  const { Jealousy, PAGE_PREVIEW_MS } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({ fg: 7, ai: ['gemini'], pages: [], apps: [], dl: true });
  assert.match(f.shown[0].line, /download Gemini/i);
  assert.equal(f.shown[0].actions.some(({ id }) => id === 'jealousy-confirm-close'), false);
  assert.equal(f.closed.length, 0);
  assert.equal(f.timers[0].delay, PAGE_PREVIEW_MS);
  f.timers[0].callback();
  assert.deepEqual(f.closed, [{ id: 7, key: 'gemini', confirmed: true }]);
  jealousy.onWindows({ fg: 7, ai: ['gemini'], pages: [], apps: [], dl: true });
  assert.equal(f.closed.length, 1, 'the same detected tab is closed only once');

  jealousy.configure({ jealous: false, closePages: true });
  jealousy.onWindows({ fg: 8, ai: ['copilot'], pages: [], apps: [], dl: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.heart.cleared, true);
  jealousy.stop();
});

test('turning jealousy off stops alerts and turning it back on resumes monitoring', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  const page = { fg: 12, ai: ['copilot'], pages: ['copilot'], apps: [], dl: false };
  jealousy.configure({ jealous: true, closePages: false });
  jealousy.onWindows(page);
  assert.equal(f.shown.length, 1);
  assert.equal(f.closed.length, 0, 'disabling page closing leaves the rival tab open');
  jealousy.configure({ jealous: false, closePages: false });
  jealousy.configure({ jealous: true, closePages: false });
  assert.equal(f.shown.length, 2);
  jealousy.stop();
});

test('a rival page is not closed when her warning cannot be shown', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  f.panel.say = () => false;
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({ fg: 24, ai: ['deepseek'], pages: ['deepseek'], apps: [], dl: false });
  assert.equal(f.closed.length, 0);
  jealousy.stop();
});

test('native AI app windows use the same warning but close only after confirmation', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({ fg: 37, ai: ['claude'], pages: [], apps: ['claude'], dl: false });
  assert.match(f.shown[0].line, /This app/);
  assert.ok(f.shown[0].actions.some(({ id }) => id === 'jealousy-confirm-close'));
  f.shown[0].onAction('jealousy-confirm-close');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(f.closed, [{ id: 37, key: 'claude', confirmed: true }]);
  jealousy.stop();
});

test('a rival name in a macOS window title triggers jealousy without treating it as a closable page', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture({ lang: 'fr' });
  const jealousy = new Jealousy({ ...f, lang: () => 'fr' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({
    fg: 'Safari::ChatGPT — New chat::0',
    ai: ['chatgpt'],
    pages: [],
    apps: [],
    dl: false,
    titleOnly: true,
    rivalTitle: 'ChatGPT — New chat',
  });

  assert.equal(f.shown.length, 1);
  assert.equal(f.shown[0].line, 'Tu n’as pas besoin d’une autre intelligence artificielle, tu m’as moi.');
  assert.equal(f.shown[0].quote, 'ChatGPT — New chat');
  assert.equal(f.timers.length, 0);
  assert.deepEqual(f.closed, []);
  assert.equal(f.heart.events[0].detail, 'ChatGPT');
  jealousy.stop();
});

test('jealousy remains in her mood until an apology', async () => {
  const { Mood } = await load('mood.js');
  const mood = new Mood({ storage: null, now: 1000 });
  mood.event('jealousy', 1000, 'Gemini');
  mood.contact(30 * 60 * 1000);
  mood.tick(30 * 60 * 1000);
  assert.equal(mood.cause.tag, 'jealousy');
  assert.ok(mood.v.anger >= 0.3);
  assert.match(mood.describe(30 * 60 * 1000), /Gemini/);

  mood.feel('sorry', 30 * 60 * 1000 + 1);
  assert.equal(mood.cause, null);
  assert.equal(mood.v.anger, 0);
  assert.equal(mood.mood, 'calm');
});

test('petting clears jealous anger immediately', async () => {
  const { Mood } = await load('mood.js');
  const mood = new Mood({ storage: null, now: 1000 });
  mood.event('jealousy', 1000, 'Gemini');
  assert.equal(mood.clearJealousy(1001), true);
  assert.equal(mood.cause, null);
  assert.equal(mood.v.anger, 0);
});

test('explicit emotional log tracks jealousy provenance, duration and reason with independent cancellation', async () => {
  const { Jealousy } = await load('jealousy.js');
  const host = { closePage: async () => ({ ok: true }) };
  const panel = { say: () => true, hide: () => {} };
  const heart = { event: () => {}, clearJealousy: () => {} };
  const capri = { react: () => {} };
  let clock = 5000;
  const j = new Jealousy({ host, panel, heart, capri, now: () => clock });
  let log = j.getJournal(clock);
  assert.equal(log.active, false);
  assert.equal(log.canCancel, false);

  // Rival page arrives
  j.onWindows({ fg: 12, ai: ['chatgpt'], pages: ['chatgpt'], rivalTitle: 'ChatGPT — Chat with AI', rivalUrl: 'https://chatgpt.com/c/123' });
  log = j.getJournal(clock + 3000);
  assert.equal(log.active, true);
  assert.equal(log.rival, 'ChatGPT');
  assert.equal(log.origin, 'page');
  assert.equal(log.pageTitle, 'ChatGPT — Chat with AI');
  assert.equal(log.startedAt, clock);
  assert.equal(log.canCancel, true);

  // Independent cancellation: clear() dismisses jealousy without touching other systems
  j.clear();
  log = j.getJournal(clock + 4000);
  assert.equal(log.active, false);
  assert.equal(log.canCancel, false);
});

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
  const host = { closePage: async (id, key) => { closed.push({ id, key }); return { ok: true }; } };
  return { saved, storage, shown, closed, reactions, panel, heart, capri, host, now, lang };
}

test('a rival browser page warns first, then can be spared for ten minutes', async () => {
  const { Jealousy, SNOOZE_MS } = await load('jealousy.js');
  let time = 1000;
  const f = fixture({ now: () => time, lang: 'fr' });
  const jealousy = new Jealousy({ ...f, lang: () => f.lang });
  jealousy.configure({ jealous: true, closePages: true });
  const page = { fg: 42, ai: ['chatgpt'], pages: ['chatgpt'], dl: false };

  jealousy.onWindows(page);
  assert.equal(f.shown.length, 1);
  assert.match(f.shown[0].line, /ChatGPT/);
  assert.equal(f.closed.length, 0, 'ordinary rival pages have a warning window');
  assert.equal(f.heart.events[0].name, 'jealousy');
  assert.equal(f.heart.events[0].detail, 'ChatGPT');

  f.shown[0].onAction('jealousy-snooze');
  assert.equal(f.closed.length, 0);
  assert.equal(jealousy.snoozedUntil, time + SNOOZE_MS);
  assert.equal(f.saved.get('capri.jealousy'), String(time + SNOOZE_MS));
  assert.equal(jealousy.relieve(), false, 'the pause cannot be extended by repeated clicks');
  jealousy.stop();
});

test('download pages are closed immediately only when both settings allow it', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  jealousy.configure({ jealous: true, closePages: true });
  jealousy.onWindows({ fg: 7, ai: ['gemini'], pages: [], dl: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(f.closed, [{ id: 7, key: 'gemini' }]);

  jealousy.configure({ jealous: false, closePages: true });
  jealousy.onWindows({ fg: 8, ai: ['copilot'], pages: [], dl: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.closed.length, 1);
  assert.equal(f.heart.cleared, true);
  jealousy.stop();
});

test('turning jealousy off stops alerts and turning it back on resumes monitoring', async () => {
  const { Jealousy } = await load('jealousy.js');
  const f = fixture();
  const jealousy = new Jealousy({ ...f, lang: () => 'en' });
  const page = { fg: 12, ai: ['copilot'], pages: ['copilot'], dl: false };
  jealousy.configure({ jealous: true, closePages: false });
  jealousy.onWindows(page);
  assert.equal(f.shown.length, 1);
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
  jealousy.onWindows({ fg: 24, ai: ['deepseek'], pages: ['deepseek'], dl: false });
  assert.equal(f.closed.length, 0);
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
  assert.ok(mood.v.anger < 0.3);
});

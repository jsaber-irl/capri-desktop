'use strict';

// Smoke/contract tests for the implemented Capri capabilities.
// Safe by design: no real Discord, microphone, browser, cursor or system action is used.
// Run with: node --test tests/crapi.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDiscordPresence } = require('../src/main/discord-presence');
const { normalizeSession, serviceName, createMusicController } = require('../src/main/music-control');
const { createStructuredMemory } = require('../src/main/structured-memory');
const chess = require('../src/main/chess-game');

globalThis.matchMedia ??= () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', file)).href);

test('Discord Rich Presence connects, publishes activity and disconnects cleanly', async () => {
  const calls = [];
  const handlers = {};
  class FakeClient {
    on(name, fn) { handlers[name] = fn; }
    async login(args) { calls.push(['login', args]); await handlers.ready(); }
    async setActivity(activity) { calls.push(['activity', activity]); }
    async clearActivity() { calls.push(['clear']); }
    async destroy() { calls.push(['destroy']); }
  }
  const presence = createDiscordPresence({
    RPC: { Client: FakeClient },
    clientId: 'test-client-id',
    logger: { log() {}, error() {} },
  });
  await presence.startDiscordPresence({ details: 'Testing Capri', state: 'Smoke test' });
  assert.equal(presence.isConnected(), true);
  assert.deepEqual(calls[0], ['login', { clientId: 'test-client-id' }]);
  assert.equal(calls[1][0], 'activity');
  assert.equal(calls[1][1].details, 'Testing Capri');
  assert.equal(calls[1][1].state, 'Smoke test');
  assert.equal(calls[1][1].buttons[0].url, 'https://github.com/jsaber-irl/capri-desktop');
  await presence.stopDiscordPresence();
  assert.deepEqual(calls.slice(-2), [['clear'], ['destroy']]);
  assert.equal(presence.isConnected(), false);
});

test('configuration exposes safe defaults for voice, emotions and jealous behaviour', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'config.js'), 'utf8');
  for (const key of ['emotions', 'jealous', 'closePages', 'wakeWord', 'converse', 'discordPresence']) {
    assert.match(source, new RegExp(`\\b${key}\\s*:`), `${key} default is missing`);
  }
});

test('bond rules recognize rivals and explicit forgiveness', async () => {
  const bond = await load('bond.js');
  assert.equal(bond.RIVALS.chatgpt, 'ChatGPT');
  assert.equal(bond.RIVALS.deepseek, 'DeepSeek');
  assert.equal(typeof bond.levelOf, 'function');
  assert.equal(bond.levelOf({ talks: 0, days: 0 }), 0);
  assert.ok(bond.FORGET_ME.test('забудь всё обо мне'));
});

test('mood rules cover jealousy, anger, joy and boredom states', async () => {
  const mood = await load('mood.js');
  assert.ok(mood.classify('ChatGPT est meilleur').tags.includes('wrongName'));
  assert.ok(mood.classify('haha, parfait').tags.includes('laughing'));
  assert.ok(mood.MOODS.includes('bored'));
});

test('memory supports provenance-safe add, export and selective deletion', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-crapi-memory-'));
  try {
    const memory = createStructuredMemory({ file: path.join(dir, 'memory.json') });
    const added = memory.add({ category: 'preference', content: 'Synthwave', source: 'user' });
    assert.equal(added.ok, true);
    assert.equal(added.entry.source, 'user');
    assert.equal(memory.exportMarkdown(path.join(dir, 'memory.md')).count, 1);
    assert.equal(memory.remove(added.entry.id).ok, true);
    assert.equal(memory.list().length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('reminders parse, persist and fire once', async () => {
  const reminders = await load('reminders.mjs');
  const now = Date.parse('2026-11-05T12:00:00Z');
  const parsed = reminders.parseReminder('rappelle-moi dans 10 minutes de tester Capri', now);
  assert.equal(parsed.text, 'tester Capri');
  assert.equal(parsed.at - now, 10 * 60000);
  const host = { setConfig() {} };
  const service = new reminders.Reminders({ host, list: [] });
  let fired = 0;
  service.onDue = () => { fired++; };
  service.add(Date.now() - 1, 'une fois');
  service.check();
  service.check();
  assert.equal(fired, 1);
});

test('chess engine starts from a legal position and rejects illegal moves', () => {
  const game = new chess.ChessGame();
  assert.equal(game.state().turn, 'w');
  assert.equal(game.play('e2e5').ok, false);
  assert.equal(game.play('e2e4').ok, true);
});

test('media sessions normalize browser metadata and service capabilities', () => {
  assert.equal(serviceName('Chrome https://open.spotify.com/track/1'), 'spotify');
  const session = normalizeSession({
    id: 'chrome-1',
    app: 'Chrome',
    mode: 'web',
    url: 'https://open.spotify.com/track/1',
    title: 'Track',
    duration: 180,
    position: 12,
    artwork: 'https://example.test/art.jpg',
    playing: true,
  }, 'mpris');
  assert.equal(session.browser, true);
  assert.equal(session.canNavigate, true);
  assert.equal(session.duration, 180);
  assert.equal(session.position, 12);
  assert.equal(session.service, 'spotify');
});

test('media controller reports unavailable adapters explicitly', async () => {
  const controller = createMusicController({
    platform: 'test',
    adapters: [{ name: 'empty', list: async () => [], control: async () => ({ ok: true }) }],
  });
  const result = await controller.command({ action: 'play' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'not_found');
});

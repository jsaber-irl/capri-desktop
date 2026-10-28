'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMusicController, createPlatformAdapters } = require('../src/main/music-control');

const session = (id, service, playing, extra = {}) => ({ id, service, app: id, mode: id.includes('browser') ? 'web' : 'native', playing, title: 'Night Drive', artist: 'Capri', album: 'After Dark', ...extra });

test('selects a single active player and dispatches playback actions to that adapter', async () => {
  const calls = [];
  const controller = createMusicController({ adapters: [{
    name: 'mock', list: async () => [session('spotify', 'spotify', true), session('deezer', 'deezer', false)],
    control: async (s, action) => { calls.push([s.id, action]); return { ok: true }; },
  }] });
  const result = await controller.command({ action: 'pause' });
  assert.equal(result.ok, true);
  await controller.command({ action: 'next', service: 'spotify' });
  await controller.command({ action: 'previous', service: 'spotify' });
  await controller.command({ action: 'toggle', service: 'spotify' });
  assert.deepEqual(calls, [['spotify', 'pause'], ['spotify', 'next'], ['spotify', 'previous'], ['spotify', 'pause']]);
});

test('honors an explicit service and refuses ambiguous active readers', async () => {
  let selected;
  const controller = createMusicController({ adapters: [{
    name: 'mock', list: async () => [session('spotify-native', 'spotify', true), session('deezer-web', 'deezer', true)],
    control: async (s, action) => { selected = [s.id, action]; return { ok: true }; },
  }] });
  assert.equal((await controller.command({ action: 'next' })).status, 'ambiguous');
  const targeted = await controller.command({ action: 'pause', service: 'deezer' });
  assert.equal(targeted.ok, true);
  assert.deepEqual(selected, ['deezer-web', 'pause']);
});

test('reports no player, unsupported volume, and adapter communication failures accurately', async () => {
  const absent = createMusicController({ adapters: [{ name: 'empty', list: async () => [], control: async () => ({ ok: true }) }] });
  assert.equal((await absent.command({ action: 'play' })).status, 'not_found');
  const noVolume = createMusicController({ adapters: [{ name: 'mock', list: async () => [session('browser', 'unknown', true)], control: async () => ({ ok: true }) }] });
  assert.equal((await noVolume.command({ action: 'volup' })).status, 'unsupported');
  const broken = createMusicController({ adapters: [{ name: 'mock', list: async () => [session('spotify', 'spotify', true)], control: async () => { throw new Error('device disconnected'); } }] });
  assert.equal((await broken.command({ action: 'next' })).status, 'error');
  let volumeSet;
  const withVolume = createMusicController({ adapters: [{ name: 'volume', list: async () => [session('spotify', 'spotify', true, { canVolume: true })], control: async (_s, action, value) => { volumeSet = [action, value]; return { ok: true }; } }] });
  assert.equal((await withVolume.command({ action: 'volume', volume: 65 })).ok, true);
  assert.deepEqual(volumeSet, ['volume', 65]);
});

test('does not infer Spotify or Deezer from a browser name alone', async () => {
  const controller = createMusicController({ adapters: [{
    name: 'mock', list: async () => [session('chrome.instance-1', 'unknown', true, { app: 'Chrome', mode: 'web' })],
    control: async () => ({ ok: true }),
  }] });
  const result = await controller.command({ action: 'pause', service: 'spotify' });
  assert.equal(result.status, 'service_unknown');
  assert.match(result.error, /ne révèle pas/i);
});

test('classifies denied macOS Apple Events as a permission error rather than a successful action', async () => {
  const controller = createMusicController({ adapters: [{
    name: 'mock', list: async () => [session('Spotify', 'spotify', true)],
    control: async () => { throw new Error('execution error: Not authorized to send Apple events (-1743)'); },
  }] });
  const result = await controller.command({ action: 'pause', service: 'spotify' });
  assert.equal(result.status, 'permission_required');
  assert.match(result.error, /Automatisation/);
});

test('uses the most recently active paused session when no reader is playing', async () => {
  let rows = [session('spotify', 'spotify', true), session('deezer', 'deezer', false)];
  let clock = 1;
  const picked = [];
  const controller = createMusicController({ now: () => clock++, adapters: [{
    name: 'mock', list: async () => rows, control: async (s, a) => { picked.push([s.id, a]); return { ok: true }; },
  }] });
  await controller.list();
  rows = [session('spotify', 'spotify', false), session('deezer', 'deezer', false)];
  await controller.command({ action: 'play' });
  assert.deepEqual(picked, [['spotify', 'play']]);
});

test('macOS Spotify adapter uses explicit AppleScript commands and reports its metadata', async () => {
  const calls = [];
  const execFile = (file, args, _options, callback) => {
    calls.push([file, args]);
    if (file === 'pgrep') return callback(null, '42', '');
    if (file === 'osascript' && args.includes('tell application "Spotify" to (player state as text) & "¦" & (name of current track) & "¦" & (artist of current track) & "¦" & (album of current track) & "¦" & (sound volume as text)')) {
      return callback(null, 'playing¦Track A¦Artist B¦Album C¦55', '');
    }
    callback(null, '', '');
  };
  const controller = createMusicController({ platform: 'darwin', adapters: createPlatformAdapters('darwin', { execFile }) });
  const current = await controller.command({ action: 'current', service: 'spotify' });
  assert.equal(current.session.title, 'Track A');
  assert.equal(current.session.album, 'Album C');
  assert.equal(current.session.volume, 55);
  assert.equal((await controller.command({ action: 'next', service: 'spotify' })).ok, true);
  assert.ok(calls.some(([file, args]) => file === 'osascript' && args.includes('tell application "Spotify" to next track')));
});

test('Linux MPRIS adapter discovers a web session, classifies its service from its URL, and controls it by player id', async () => {
  const calls = [];
  const execFile = (file, args, _options, callback) => {
    calls.push([file, args]);
    if (args[0] === '--list-all') return callback(null, 'chrome.instance-4\n', '');
    if (args.includes('metadata')) return callback(null, 'Playing|Track A|Artist B|Album C|https://open.spotify.com/track/1|0.6', '');
    callback(null, '', '');
  };
  const controller = createMusicController({ platform: 'linux', adapters: createPlatformAdapters('linux', { execFile }) });
  const result = await controller.command({ action: 'pause', service: 'spotify' });
  assert.equal(result.ok, true);
  assert.equal(result.session.mode, 'web');
  assert.equal(result.session.service, 'spotify');
  assert.ok(calls.some(([file, args]) => file === 'playerctl' && args.includes('pause')));
});

test('Windows GSMTC adapter scopes commands to the selected system session id', async () => {
  const calls = [];
  const execFile = (file, args, _options, callback) => {
    calls.push([file, args]);
    const isList = args.includes('list');
    callback(null, JSON.stringify(isList
      ? { ok: true, sessions: [{ id: 'Spotify.exe', app: 'Spotify.exe', title: 'Track A', artist: 'Artist B', album: 'Album C', status: 'Playing' }] }
      : { ok: true }), '');
  };
  const controller = createMusicController({ platform: 'win32', adapters: createPlatformAdapters('win32', { execFile }) });
  const result = await controller.command({ action: 'pause', service: 'spotify' });
  assert.equal(result.ok, true);
  const actionCall = calls.find(([, args]) => args.includes('pause'));
  assert.ok(actionCall[1].includes('Spotify.exe'));
});

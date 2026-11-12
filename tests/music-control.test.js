'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMusicController, createPlatformAdapters, normalizeSession, serviceName } = require('../src/main/music-control');

const session = (id, service, playing, extra = {}) => ({ id, service, app: id, mode: id.includes('browser') ? 'web' : 'native', playing, title: 'Night Drive', artist: 'Capri', album: 'After Dark', ...extra });

test('normalization preserves unavailable metadata as null and distinguishes stopped from paused', () => {
  const stopped = normalizeSession({ id: 'native', status: 'Stopped', duration: null, position: '', artwork: 'javascript:alert(1)' }, 'adapter', 'darwin');
  assert.equal(stopped.status, 'stopped');
  assert.equal(stopped.playing, false);
  assert.equal(stopped.duration, null);
  assert.equal(stopped.position, null);
  assert.equal(stopped.artwork, null);
  assert.equal(stopped.artist, null);
});

test('identifies YouTube Music from an explicit service URL and derives per-platform browser close capability', () => {
  assert.equal(serviceName('https://music.youtube.com/watch?v=1'), 'youtube');
  const win = normalizeSession({ id: 'chrome', app: 'Google Chrome', mode: 'web', url: 'https://music.youtube.com/watch?v=1' }, 'mock', 'win32');
  const macFirefox = normalizeSession({ id: 'Firefox', app: 'Firefox', mode: 'web', url: 'https://example.com' }, 'mock', 'darwin');
  const linux = normalizeSession({ id: 'chromium.instance-1', app: 'Chromium', mode: 'web', url: 'https://example.com' }, 'mock', 'linux');
  assert.equal(win.canClose, true);
  assert.equal(win.browserName, 'chrome');
  assert.equal(macFirefox.canClose, false);
  assert.equal(linux.canClose, false);
});

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

test('macOS Deezer adapter detects track and playlist metadata', async () => {
  const execFile = (file, args, _options, callback) => {
    if (file === 'pgrep') return callback(null, '42', '');
    if (file === 'osascript') return callback(null, 'playing¦Track D¦Artist D¦Album D¦My Playlist', '');
    callback(null, '', '');
  };
  const controller = createMusicController({ platform: 'darwin', adapters: createPlatformAdapters('darwin', { execFile }) });
  const current = await controller.command({ action: 'current', service: 'deezer' });
  assert.equal(current.session.title, 'Track D');
  assert.equal(current.session.playlist, 'My Playlist');
  assert.equal((await controller.command({ action: 'next', service: 'deezer' })).ok, true);
});

test('Linux MPRIS adapter discovers a web session, classifies its service from its URL, and controls it by player id', async () => {
  const calls = [];
  const execFile = (file, args, _options, callback) => {
    calls.push([file, args]);
    if (args[0] === '--list-all') return callback(null, 'chrome.instance-4\n', '');
    if (args.includes('metadata')) return callback(null, 'Playing|Track A|Artist B|Album C|https://open.spotify.com/track/1|180000000|https://cdn.example/art.jpg|track-1|0.25|42000000', '');
    callback(null, '', '');
  };
  const controller = createMusicController({ platform: 'linux', adapters: createPlatformAdapters('linux', { execFile }) });
  const result = await controller.command({ action: 'pause', service: 'spotify' });
  assert.equal(result.ok, true);
  assert.equal(result.session.mode, 'web');
  assert.equal(result.session.service, 'spotify');
  assert.equal(result.session.duration, 180);
  assert.equal(result.session.position, 42);
  assert.equal(result.session.artwork, 'https://cdn.example/art.jpg');
  assert.ok(calls.some(([file, args]) => file === 'playerctl' && args.includes('pause')));
});

test('Linux YouTube Music metadata refreshes after track and playback-state changes', async () => {
  let raw = 'Playing|First Track|First Artist|First Album|https://music.youtube.com/watch?v=1|180000000|https://img.example/1.jpg|track-1|0.25|42000000';
  const execFile = (_file, args, _options, callback) => {
    if (args[0] === '--list-all') return callback(null, 'chromium.instance-1\n', '');
    if (args.includes('metadata')) return callback(null, raw, '');
    callback(null, '', '');
  };
  const controller = createMusicController({ platform: 'linux', adapters: createPlatformAdapters('linux', { execFile }) });
  const first = (await controller.list()).sessions[0];
  assert.equal(first.service, 'youtube');
  assert.equal(first.title, 'First Track');
  assert.equal(first.artist, 'First Artist');
  assert.equal(first.album, 'First Album');
  assert.equal(first.duration, 180);
  assert.equal(first.position, 42);
  assert.equal(first.artwork, 'https://img.example/1.jpg');
  assert.equal(first.playing, true);

  raw = 'Paused|Second Track|Second Artist|Second Album|https://music.youtube.com/watch?v=2|200000000||track-2|0.25|12000000';
  const second = (await controller.list()).sessions[0];
  assert.equal(second.title, 'Second Track');
  assert.equal(second.position, 12);
  assert.equal(second.artwork, null);
  assert.equal(second.status, 'paused');
  assert.equal(second.playing, false);
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

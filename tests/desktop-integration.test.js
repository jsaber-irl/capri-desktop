'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const hardware = require('../src/main/hardware');
const { createPlatformAdapters } = require('../src/main/music-control');

const execFileAsync = promisify(execFile);
const enabled = process.env.CAPRI_DESKTOP_INTEGRATION === '1';
const appleEventsEnabled = process.env.CAPRI_ALLOW_APPLE_EVENTS === '1';

test('real desktop hardware can be queried without changing the system', {
  skip: !enabled && 'Set CAPRI_DESKTOP_INTEGRATION=1 to enable real desktop tests.',
}, async () => {
  const pc = await hardware.scan({ dir: process.cwd() });
  assert.equal(pc.os.platform, process.platform);
  assert.ok(pc.ram > 0);
  assert.ok(pc.cpu.threads > 0);
  assert.ok(Array.isArray(pc.gpus));
  assert.ok(Number.isFinite(pc.disk.free) || pc.disk.free === Infinity);
});

test('Windows GSMTC sessions can be queried read-only', {
  skip: !enabled || process.platform !== 'win32',
}, async (t) => {
  const [adapter] = createPlatformAdapters('win32');
  const sessions = await adapter.list();
  assert.ok(Array.isArray(sessions));
  if (!sessions.length) return t.skip('No active Windows media session is available.');
  for (const session of sessions) {
    assert.ok(session.id);
    assert.match(session.status, /^(Playing|Paused)$/i);
  }
});

test('macOS Spotify metadata can be queried with explicit Apple Events opt-in', {
  skip: !enabled || process.platform !== 'darwin' || !appleEventsEnabled,
}, async (t) => {
  try {
    await execFileAsync('pgrep', ['-x', 'Spotify']);
  } catch (error) {
    if (error.code === 1) return t.skip('Spotify is not running.');
    throw error;
  }

  const [spotify] = createPlatformAdapters('darwin');
  let sessions;
  try {
    sessions = await spotify.list();
  } catch (error) {
    if (/(-1743|not authorized to send apple events|not permitted to send apple events)/i.test(error.message)) {
      return t.skip('macOS Automation permission for Spotify has not been granted.');
    }
    throw error;
  }
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.length > 0, 'Spotify is running but did not expose a readable media session.');
  assert.ok(sessions.every((session) => session.id === 'spotify-native' && session.title));
});

test('Linux MPRIS sessions can be queried read-only when playerctl and a session bus are available', {
  skip: !enabled || process.platform !== 'linux',
}, async (t) => {
  if (!process.env.DBUS_SESSION_BUS_ADDRESS) return t.skip('No D-Bus session is available.');

  try {
    await execFileAsync('playerctl', ['--version']);
  } catch (error) {
    if (error.code === 'ENOENT') return t.skip('playerctl is not installed.');
    throw error;
  }

  const [adapter] = createPlatformAdapters('linux');
  const sessions = await adapter.list();
  assert.ok(Array.isArray(sessions));
  if (!sessions.length) return t.skip('No active MPRIS media session is available.');
  for (const session of sessions) {
    assert.ok(session.id);
    assert.ok(session.title);
    assert.match(session.status, /^(Playing|Paused)$/i);
  }
});

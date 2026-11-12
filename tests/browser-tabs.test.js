'use strict';

// These are unit tests with fake operating-system responses, not real browser-close tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const { browserKey, browserCloseCapability, createBrowserTabCloser, safeHttpUrl } = require('../src/main/browser-tabs');

test('detects supported browser identities without claiming a Linux close adapter', () => {
  assert.equal(browserKey('Google Chrome'), 'chrome');
  assert.equal(browserKey('msedge'), 'edge');
  assert.equal(browserKey('Firefox'), 'firefox');
  assert.equal(browserKey('Safari'), 'safari');
  assert.equal(browserKey('Brave'), null);
  assert.equal(browserCloseCapability('darwin', 'Safari').available, true);
  assert.equal(browserCloseCapability('darwin', 'Firefox').available, false);
  assert.equal(browserCloseCapability('win32', 'Firefox').available, true);
  assert.equal(browserCloseCapability('linux', 'Google Chrome').available, false);
});

test('only accepts an HTTP(S) tab address as a close target', () => {
  assert.equal(safeHttpUrl('https://music.youtube.com/watch?v=1'), 'https://music.youtube.com/watch?v=1');
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
  assert.equal(safeHttpUrl('javascript:close()'), null);
});

test('a Windows adapter success is returned only when the helper says it verified closure', async () => {
  const calls = [];
  const closer = createBrowserTabCloser({ platform: 'win32', execFile: (file, args, _options, callback) => {
    calls.push({ file, args });
    callback(null, JSON.stringify({ status: 'closed' }), '');
  } });
  const result = await closer.close({ browser: 'Google Chrome', url: 'https://music.youtube.com/watch?v=1' });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'closed');
  assert.ok(calls[0].args.includes('-File'));
  assert.ok(calls[0].args.some((arg) => arg.endsWith('browser-tab-close.ps1')));
});

test('a helper response without post-close verification is never reported as success', async () => {
  const closer = createBrowserTabCloser({ platform: 'win32', execFile: (_file, _args, _options, callback) => {
    callback(null, JSON.stringify({ status: 'not-verified' }), '');
  } });
  const result = await closer.close({ browser: 'Edge', url: 'https://example.com/' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'not_closed');
});

test('Safari uses its current-tab AppleScript target and refuses an unverified result', async () => {
  let script = '';
  const closer = createBrowserTabCloser({ platform: 'darwin', execFile: (_file, args, _options, callback) => {
    script = args.find((arg) => arg.includes('bundle identifier')) || '';
    callback(null, 'not-verified', '');
  } });
  const result = await closer.close({ browser: 'Safari', url: 'https://example.com/' });
  assert.match(script, /current tab of front window/);
  assert.equal(result.ok, false);
});

test('a denied Apple Events request reports permission required without claiming closure', async () => {
  const closer = createBrowserTabCloser({ platform: 'darwin', execFile: (_file, _args, _options, callback) => {
    callback(Object.assign(new Error('Not authorized to send Apple events (-1743)'), { code: 1 }), '', '');
  } });
  const result = await closer.close({ browser: 'Safari', url: 'https://example.com/' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'permission_required');
});

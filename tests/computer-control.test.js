'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validPoint, clickAt, createComputerControl } = require('../src/main/computer-control');

const bounds = { x: 0, y: 0, width: 1920, height: 1080 };

test('virtual cursor coordinates must be finite integers within the primary display', () => {
  assert.equal(validPoint({ x: 0, y: 0 }, bounds), true);
  assert.equal(validPoint({ x: 1919, y: 1079 }, bounds), true);
  assert.equal(validPoint({ x: 1920, y: 20 }, bounds), false);
  assert.equal(validPoint({ x: 1.2, y: 20 }, bounds), false);
  assert.equal(validPoint({ x: NaN, y: 20 }, bounds), false);
});

test('macOS pointer action stays gated by Accessibility permission', async () => {
  const result = await clickAt({ x: 12, y: 24 }, {
    platform: 'darwin', bounds, systemPreferences: { isTrustedAccessibilityClient: () => false },
    exec: async () => { throw new Error('must not execute'); },
  });
  assert.deepEqual(result, { ok: false, reason: 'accessibility-required' });
});

test('platform adapters receive only validated screen coordinates and fixed commands', async () => {
  const calls = [];
  const exec = async (...args) => { calls.push(args); return { stdout: '', stderr: '' }; };
  assert.deepEqual(await clickAt({ x: 45, y: 89 }, { platform: 'darwin', bounds, systemPreferences: { isTrustedAccessibilityClient: () => true }, exec }), { ok: true });
  assert.equal(calls[0][0], '/usr/bin/osascript');
  assert.deepEqual(calls[0][1], ['-e', 'tell application "System Events" to click at {45, 89}']);
  calls.length = 0;
  assert.deepEqual(await clickAt({ x: 1920, y: 0 }, { platform: 'darwin', bounds, systemPreferences: { isTrustedAccessibilityClient: () => true }, exec }), { ok: false, reason: 'invalid-point' });
  assert.equal(calls.length, 0);
});

test('Windows adapter creates only a bounded pointer-click script', async () => {
  const calls = [];
  const exec = async (...args) => { calls.push(args); return { stdout: '', stderr: '' }; };
  assert.deepEqual(await clickAt({ x: 420, y: 108 }, { platform: 'win32', bounds, exec }), { ok: true });
  assert.equal(calls[0][0], 'powershell.exe');
  const encoded = calls[0][1].at(-1);
  const script = Buffer.from(encoded, 'base64').toString('utf16le');
  assert.match(script, /SetCursorPos\(420,108\)/);
  assert.match(script, /mouse_event\(2/);
  assert.match(script, /mouse_event\(4/);
  assert.doesNotMatch(script, /Start-Process|Invoke-Expression|DownloadString/);
});

test('desktop control remains unavailable until the saved opt-in is enabled', async () => {
  const handlers = new Map();
  const frame = {};
  const webContents = { mainFrame: frame };
  class FakeWindow {
    constructor() { this.webContents = webContents; }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() {}
  }
  const service = createComputerControl({
    BrowserWindow: FakeWindow, ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    desktopCapturer: { getSources: async () => { throw new Error('must not capture'); } },
    screen: { getPrimaryDisplay: () => ({ id: 1, size: { width: 100, height: 100 }, bounds }) },
    systemPreferences: {}, config: { load: () => ({ computerControl: false }) }, platform: 'win32', preload: '',
  });
  service.show();
  const event = { sender: webContents, senderFrame: frame };
  assert.deepEqual(await handlers.get('computer-control:status')(event), { enabled: false, reason: 'opt-in-required' });
  assert.deepEqual(await handlers.get('computer-control:snapshot')(event), { ok: false, reason: 'opt-in-required' });
});

test('Capri proposes a bounded screenshot click but executes it only after a matching confirmation', async () => {
  const handlers = new Map();
  const frame = {};
  const webContents = { mainFrame: frame };
  const bounds = { x: 0, y: 0, width: 1000, height: 500 };
  const clicked = [];
  class FakeWindow {
    constructor() { this.webContents = webContents; }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() {}
    hide() {}
  }
  const service = createComputerControl({
    BrowserWindow: FakeWindow, ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    desktopCapturer: { getSources: async () => [{ display_id: '1', thumbnail: { isEmpty: () => false, toJPEG: () => Buffer.from('image'), toDataURL: () => 'data:image/png;base64,c2NyZWVu' } }] },
    screen: { getPrimaryDisplay: () => ({ id: 1, size: { width: 1000, height: 500 }, bounds }) },
    systemPreferences: {}, config: { load: () => ({ computerControl: true, provider: 'openai', visionModel: 'vision' }) },
    llm: { see: async (_provider, _cfg, request) => { assert.match(request.prompt, /JSON strict/); return '{"x":500,"y":300,"confidence":0.92,"target":"Enregistrer"}'; } },
    performClick: async (point) => { clicked.push(point); return { ok: true }; },
    platform: 'win32', preload: '',
  });
  service.show();
  const event = { sender: webContents, senderFrame: frame };
  const proposed = await handlers.get('computer-control:propose-click')(event, 'le bouton Enregistrer');
  assert.equal(proposed.ok, true);
  assert.deepEqual(proposed.plan.point, { x: 500, y: 150 });
  assert.equal(clicked.length, 0, 'analysis alone never sends a desktop action');
  assert.deepEqual(await handlers.get('computer-control:confirm-click')(event, 'wrong-token'), { ok: false, reason: 'plan-expired' });
  assert.equal(clicked.length, 0);
  const second = await handlers.get('computer-control:propose-click')(event, 'le bouton Enregistrer');
  assert.equal((await handlers.get('computer-control:confirm-click')(event, second.plan.id)).ok, true);
  assert.deepEqual(clicked, [{ x: 500, y: 150 }]);
});

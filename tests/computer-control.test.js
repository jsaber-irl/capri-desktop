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
    constructor() { this.webContents = { ...webContents, mainFrame: frame, once() {}, send() {} }; FakeWindow.instances.push(this); }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() {}
    close() {}
    setSize() {}
    setPosition() {}
    setIgnoreMouseEvents() {}
    showInactive() {}
  }
  FakeWindow.instances = [];
  const service = createComputerControl({
    BrowserWindow: FakeWindow, ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    desktopCapturer: { getSources: async () => { throw new Error('must not capture'); } },
    screen: { getPrimaryDisplay: () => ({ id: 1, size: { width: 100, height: 100 }, bounds }) },
    systemPreferences: {}, config: { load: () => ({ computerControl: false }) }, platform: 'win32', preload: '',
  });
  service.show();
  const event = { sender: FakeWindow.instances[0].webContents, senderFrame: frame };
  assert.deepEqual(await handlers.get('computer-control:status')(event), { enabled: false, reason: 'opt-in-required' });
  assert.deepEqual(await handlers.get('computer-control:snapshot')(event), { ok: false, reason: 'opt-in-required' });
});

test('the compact preview can be shown or hidden without closing the control panel', () => {
  const frame = {};
  class FakeWindow {
    constructor() { this.webContents = { mainFrame: frame, send() {} }; this.visible = false; FakeWindow.instances.push(this); }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() { this.visible = true; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
    setSize() {}
    setPosition() {}
  }
  FakeWindow.instances = [];
  const service = createComputerControl({
    BrowserWindow: FakeWindow, ipcMain: { handle() {} }, desktopCapturer: {}, screen: { getPrimaryDisplay: () => ({ workArea: bounds, bounds }) },
    systemPreferences: {}, config: { load: () => ({ computerControl: true, computerControlPreview: true }) }, platform: 'win32', preload: '',
  });
  service.show();
  const panel = FakeWindow.instances[0];
  service.setCompactVisible(false);
  assert.equal(panel.visible, false);
  service.setCompactVisible(true);
  assert.equal(panel.visible, true);
});

test('Capri proposes a bounded screenshot click but executes it only after a matching confirmation', async () => {
  const handlers = new Map();
  const frame = {};
  const webContents = { mainFrame: frame };
  const bounds = { x: 0, y: 0, width: 1000, height: 500 };
  const clicked = [];
  class FakeWindow {
    constructor() { this.webContents = { ...webContents, mainFrame: frame, once() {}, send() {} }; FakeWindow.instances.push(this); }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() {}
    close() {}
    hide() {}
    setSize() {}
    setPosition() {}
    setIgnoreMouseEvents() {}
    showInactive() {}
  }
  FakeWindow.instances = [];
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
  const event = { sender: FakeWindow.instances[0].webContents, senderFrame: frame };
  const proposed = await handlers.get('computer-control:propose-click')(event, 'le bouton Enregistrer');
  assert.equal(proposed.ok, true);
  assert.deepEqual(proposed.plan.point, { x: 500, y: 150 });
  assert.equal(clicked.length, 0, 'analysis alone never sends a desktop action');
  assert.deepEqual(await handlers.get('computer-control:confirm-click')(event, 'wrong-token'), { ok: false, reason: 'plan-expired' });
  assert.equal(clicked.length, 0);
  const second = await handlers.get('computer-control:propose-click')(event, 'le bouton Enregistrer');
  const moving = handlers.get('computer-control:confirm-click')(event, second.plan.id);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(await handlers.get('computer-control:cancel')(event), { ok: true });
  assert.deepEqual(await moving, { ok: false, reason: 'cancelled' });
  assert.equal(clicked.length, 0, 'stopping the virtual cursor before the endpoint prevents the real click');
  const third = await handlers.get('computer-control:propose-click')(event, 'le bouton Enregistrer');
  assert.equal((await handlers.get('computer-control:confirm-click')(event, third.plan.id)).ok, true);
  assert.deepEqual(clicked, [{ x: 500, y: 150 }]);
});

test('a proposed action appears in a lower-right confirmation window with real allow and refuse handlers', async () => {
  const handlers = new Map();
  const frame = {};
  const clicked = [];
  class FakeWindow {
    constructor(options = {}) {
      this.options = options;
      this.webContents = { mainFrame: frame, once() {}, send() {} };
      FakeWindow.instances.push(this);
    }
    loadURL() {}
    once() {}
    on() {}
    isDestroyed() { return false; }
    show() {}
    showInactive() {}
    hide() {}
    close() {}
    setSize() {}
    setPosition(x, y) { this.position = { x, y }; }
    setIgnoreMouseEvents() {}
  }
  FakeWindow.instances = [];
  const display = { id: 1, size: { width: 1000, height: 600 }, bounds: { x: 0, y: 0, width: 1000, height: 600 }, workArea: { x: 0, y: 24, width: 1000, height: 576 } };
  createComputerControl({
    BrowserWindow: FakeWindow,
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    desktopCapturer: { getSources: async () => [{ display_id: '1', thumbnail: { isEmpty: () => false, toJPEG: () => Buffer.from('image'), toDataURL: () => 'data:image/png;base64,c2NyZWVu' } }] },
    screen: { getPrimaryDisplay: () => display },
    systemPreferences: {}, config: { load: () => ({ computerControl: true, provider: 'openai' }) },
    llm: { see: async () => '{"x":300,"y":400,"confidence":0.9,"target":"Enregistrer"}' },
    performClick: async (point) => { clicked.push(point); return { ok: true }; },
    platform: 'win32', preload: 'control-preload.js', confirmPreload: 'confirm-preload.js',
  }).show();
  const control = FakeWindow.instances[0];
  const controlEvent = { sender: control.webContents, senderFrame: frame };
  const proposal = await handlers.get('computer-control:propose-click')(controlEvent, 'le bouton Enregistrer');
  assert.equal(proposal.ok, true);
  const notice = FakeWindow.instances.find((item) => item.options.title === 'Capri // Autorisation requise');
  assert.ok(notice, 'a dedicated confirmation notification window is created');
  assert.deepEqual(notice.position, { x: 608, y: 430 }, 'the notice is anchored to the bottom-right work area');
  assert.equal(notice.options.webPreferences.preload, 'confirm-preload.js');
  assert.equal(clicked.length, 0, 'a visible prompt does not itself execute the click');
  const noticeEvent = { sender: notice.webContents, senderFrame: frame };
  assert.deepEqual(await handlers.get('computer-control:reject-click')(noticeEvent, proposal.plan.id), { ok: true });
  assert.equal(clicked.length, 0, 'refusing the notification never clicks');
  const nextProposal = await handlers.get('computer-control:propose-click')(controlEvent, 'le bouton Enregistrer');
  const nextNotice = FakeWindow.instances.filter((item) => item.options.title === 'Capri // Autorisation requise').at(-1);
  const nextNoticeEvent = { sender: nextNotice.webContents, senderFrame: frame };
  const result = await handlers.get('computer-control:confirm-click')(nextNoticeEvent, nextProposal.plan.id);
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(clicked, [{ x: 300, y: 240 }]);
});

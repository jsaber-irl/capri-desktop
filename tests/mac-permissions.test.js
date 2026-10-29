'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SETTINGS_URLS,
  PERMISSIONS_META,
  macPermissionsMenuItem,
  checkAccessibility,
  checkMicrophone,
  checkScreenRecording,
  checkAutomation,
  checkAllPermissions,
  openMacSettings,
  requestPermission,
  requestAutomationTarget,
  listMacWindows,
  moveMacWindow,
  focusMacWindow,
  closeMacApp,
  createMacPermissionsWindow,
} = require('../src/main/mac-permissions');
const { TRAY } = require('../src/main/labels');

test('SETTINGS_URLS maps to official macOS Privacy sections', () => {
  assert.equal(SETTINGS_URLS.accessibility, 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  assert.equal(SETTINGS_URLS.microphone, 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
  assert.equal(SETTINGS_URLS.screen, 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  assert.equal(SETTINGS_URLS.automation, 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation');
});

test('shows macPermissions menu item only on macOS and hides it on Windows/Linux', () => {
  const item = macPermissionsMenuItem('darwin', TRAY.fr.macPermissions, () => {});
  assert.equal(item.label, TRAY.fr.macPermissions);
  assert.equal(typeof item.click, 'function');
  assert.equal(macPermissionsMenuItem('win32', TRAY.fr.macPermissions, () => {}), null);
  assert.equal(macPermissionsMenuItem('linux', TRAY.fr.macPermissions, () => {}), null);
});

test('detects accessibility permission states without claiming to distinguish denial from not requested', () => {
  // Granted
  const mockGranted = { isTrustedAccessibilityClient: (prompt) => !prompt || true };
  assert.deepEqual(checkAccessibility({ systemPreferences: mockGranted, platform: 'darwin' }), {
    id: 'accessibility',
    status: 'granted',
    granted: true,
  });

  // The Electron API cannot distinguish a denial from an unrequested permission.
  const mockDenied = { isTrustedAccessibilityClient: () => false };
  assert.deepEqual(checkAccessibility({ systemPreferences: mockDenied, prompt: false, platform: 'darwin' }), {
    id: 'accessibility',
    status: 'action_required',
    granted: false,
  });

  // Action required (with prompt request)
  assert.deepEqual(checkAccessibility({ systemPreferences: mockDenied, prompt: true, platform: 'darwin' }), {
    id: 'accessibility',
    status: 'action_required',
    granted: false,
  });

  // Unknown (API missing)
  assert.deepEqual(checkAccessibility({ systemPreferences: {}, platform: 'darwin' }), {
    id: 'accessibility',
    status: 'unknown',
    granted: false,
  });

  // Unsupported (Windows/Linux)
  assert.deepEqual(checkAccessibility({ systemPreferences: mockGranted, platform: 'win32' }), {
    id: 'accessibility',
    status: 'unsupported',
    granted: false,
  });
});

test('detects microphone and screen recording permissions', () => {
  // Microphone granted
  const mockSys = {
    getMediaAccessStatus: (type) => (type === 'microphone' ? 'granted' : 'not-determined'),
  };
  assert.equal(checkMicrophone({ systemPreferences: mockSys, platform: 'darwin' }).status, 'granted');
  assert.equal(checkMicrophone({ systemPreferences: mockSys, platform: 'darwin' }).granted, true);

  // Screen recording not-determined (action required)
  assert.equal(checkScreenRecording({ systemPreferences: mockSys, platform: 'darwin' }).status, 'action_required');
  assert.equal(checkScreenRecording({ systemPreferences: mockSys, platform: 'darwin' }).granted, false);

  // Unsupported platform
  assert.equal(checkMicrophone({ systemPreferences: mockSys, platform: 'linux' }).status, 'unsupported');
  assert.equal(checkScreenRecording({ systemPreferences: mockSys, platform: 'win32' }).status, 'unsupported');
});

test('Automation remains unknown until an explicit Apple Events probe', async () => {
  let called = false;
  const mockExecSuccess = (_cmd, _args, _opts, cb) => { called = true; cb(null, 'Finder\n'); };
  const passive = await checkAutomation({ exec: mockExecSuccess, platform: 'darwin' });
  assert.equal(passive.status, 'unknown');
  assert.equal(called, false);

  // Success
  const resSuccess = await checkAutomation({ exec: mockExecSuccess, platform: 'darwin', probe: true });
  assert.equal(resSuccess.status, 'granted');
  assert.equal(resSuccess.granted, true);

  // TCC Error -1743 (not permitted)
  const mockExecDenied = (_cmd, _args, _opts, cb) => cb(new Error('execution error: -1743 (Not authorized to send Apple events)'));
  const resDenied = await checkAutomation({ exec: mockExecDenied, platform: 'darwin', probe: true });
  assert.equal(resDenied.status, 'denied');
  assert.equal(resDenied.granted, false);

  // Non-darwin platform
  const resWin = await checkAutomation({ platform: 'win32' });
  assert.equal(resWin.status, 'unsupported');
});

test('automation requests send a read-only Apple Event to an allowlisted target and report the actual result', async () => {
  const calls = [];
  const success = (command, args, _opts, cb) => {
    calls.push({ command, args });
    if (command === 'pgrep') return cb(null, '123');
    cb(null, 'playing');
  };
  const systemEvents = await requestAutomationTarget('systemEvents', { exec: success, platform: 'darwin' });
  assert.equal(systemEvents.status, 'granted');
  assert.equal(systemEvents.requestSent, true);
  assert.deepEqual(calls[0].args, ['-e', 'tell application "System Events" to get name of first process whose visible is true']);

  calls.length = 0;
  const spotify = await requestAutomationTarget('spotify', { exec: success, platform: 'darwin' });
  assert.equal(spotify.status, 'granted');
  assert.equal(calls[1].command, 'osascript');
  assert.match(calls[1].args[1], /get player state/);

  let sent = false;
  const notRunning = await requestAutomationTarget('spotify', {
    exec: (command, _args, _opts, cb) => { sent ||= command === 'osascript'; cb(new Error('not running')); },
    platform: 'darwin',
  });
  assert.equal(notRunning.status, 'unknown');
  assert.equal(notRunning.requestSent, false);
  assert.equal(sent, false);

  const denied = await requestAutomationTarget('systemEvents', {
    exec: (_command, _args, _opts, cb) => cb(new Error('execution error: -1743 not authorized to send Apple Events')),
    platform: 'darwin',
  });
  assert.equal(denied.status, 'denied');
  assert.equal(denied.granted, false);
  assert.equal(denied.requestSent, true);
  assert.equal((await requestAutomationTarget('anything', { platform: 'darwin' })).ok, false);
});

test('Section 13 exposes per-target request, settings, verification, and macOS instructions controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/mac-permissions.html'), 'utf8');
  assert.match(html, /data-target="systemEvents"/);
  assert.match(html, /data-target="spotify"/);
  assert.equal((html.match(/data-target-request/g) || []).length, 2);
  assert.equal((html.match(/data-target-settings/g) || []).length, 2);
  assert.equal((html.match(/data-target-verify/g) || []).length, 2);
  assert.match(html, /<summary class="inst-label">Instructions macOS<\/summary>/);
  assert.match(PERMISSIONS_META.automation.instructionsFr, /Réglages Système → Confidentialité et sécurité → Automatisation/);
});

test('checkAllPermissions aggregates global status and counts', async () => {
  const mockSys = {
    isTrustedAccessibilityClient: () => true,
    getMediaAccessStatus: (type) => (type === 'microphone' ? 'granted' : 'denied'),
  };
  const mockExec = (_cmd, _args, _opts, cb) => cb(null, 'System Events');

  const res = await checkAllPermissions({
    systemPreferences: mockSys,
    exec: mockExec,
    platform: 'darwin',
  });

  assert.equal(res.isMac, true);
  assert.equal(res.total, 4);
  // Accessibility and microphone granted; screen denied; Automation is passively unknown.
  assert.equal(res.grantedCount, 2);
  assert.equal(res.allGranted, false);
  assert.ok(res.permissions.accessibility.granted);
  assert.ok(res.permissions.microphone.granted);
  assert.ok(!res.permissions.screen.granted);
  assert.equal(res.permissions.automation.status, 'unknown');
});

test('openMacSettings dispatches correct deep link to shell', async () => {
  let openedUrl = '';
  const mockShell = {
    openExternal: async (url) => { openedUrl = url; return true; },
  };

  assert.equal(await openMacSettings('accessibility', { shell: mockShell, platform: 'darwin' }), true);
  assert.equal(openedUrl, SETTINGS_URLS.accessibility);

  assert.equal(await openMacSettings('microphone', { shell: mockShell, platform: 'darwin' }), true);
  assert.equal(openedUrl, SETTINGS_URLS.microphone);

  assert.equal(await openMacSettings('screen', { shell: mockShell, platform: 'darwin' }), true);
  assert.equal(openedUrl, SETTINGS_URLS.screen);

  assert.equal(await openMacSettings('automation', { shell: mockShell, platform: 'darwin' }), true);
  assert.equal(openedUrl, SETTINGS_URLS.automation);

  // Windows/Linux ignores call
  assert.equal(await openMacSettings('accessibility', { shell: mockShell, platform: 'win32' }), false);
});

test('requestPermission prompts or opens settings per permission type', async () => {
  let accessibilityPrompted = false;
  let micAsked = false;
  let openedSettings = '';

  const mockSys = {
    isTrustedAccessibilityClient: (prompt) => { if (prompt) accessibilityPrompted = true; return false; },
    getMediaAccessStatus: () => 'granted',
    askForMediaAccess: async () => { micAsked = true; return true; },
  };
  const mockShell = {
    openExternal: async (url) => { openedSettings = url; return true; },
  };

  // Accessibility
  await requestPermission('accessibility', { systemPreferences: mockSys, shell: mockShell, platform: 'darwin' });
  assert.equal(accessibilityPrompted, true);
  assert.equal(openedSettings, SETTINGS_URLS.accessibility);

  // Microphone
  await requestPermission('microphone', { systemPreferences: mockSys, shell: mockShell, platform: 'darwin' });
  assert.equal(micAsked, true);

  // Screen
  await requestPermission('screen', { systemPreferences: mockSys, shell: mockShell, platform: 'darwin' });
  assert.equal(openedSettings, SETTINGS_URLS.screen);
});

test('permissions IPC rejects renderer callers outside its dedicated window', async () => {
  const handlers = new Map();
  const listeners = new Map();
  let denied = false;
  let appleEventsSent = 0;
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    on: (channel, handler) => listeners.set(channel, handler),
  };
  class FakeWindow {
    constructor() {
      this.destroyed = false;
      this.webContents = { mainFrame: {}, send() {} };
    }
    isDestroyed() { return this.destroyed; }
    isMinimized() { return false; }
    show() {}
    focus() {}
    removeMenu() {}
    loadURL() {}
    once() {}
    on() {}
    close() { this.destroyed = true; }
  }
  const api = createMacPermissionsWindow({
    BrowserWindow: FakeWindow,
    ipcMain,
    shell: { openExternal: async () => true },
    systemPreferences: { isTrustedAccessibilityClient: () => true, getMediaAccessStatus: () => 'granted' },
    platform: 'darwin',
    exec: (_command, _args, _opts, cb) => {
      appleEventsSent += 1;
      cb(denied ? new Error('execution error: -1743 not authorized to send Apple Events') : null, 'Safari');
    },
  });
  api.show();
  const authorized = { sender: api.show().webContents, senderFrame: api.show().webContents.mainFrame };
  const unauthorized = { sender: {}, senderFrame: {} };
  await assert.rejects(handlers.get('macPermissions:getStatus')(unauthorized), /Unauthorized/);
  const state = await handlers.get('macPermissions:getStatus')(authorized);
  assert.equal(state.isMac, true);
  assert.equal(state.permissions.automation.status, 'unknown');
  assert.equal(state.automationTargets.length, 2);
  assert.equal(state.automationTargets[0].status, 'unknown');
  assert.equal(await handlers.get('macPermissions:openSettings')(authorized, 'arbitrary'), false);
  const probeResult = await handlers.get('macPermissions:automationProbe')(authorized, { targetId: 'systemEvents', verify: false });
  assert.equal(probeResult.status, 'granted');
  assert.equal(probeResult.requestSent, true);
  assert.equal(probeResult.automationTargets[0].status, 'granted');
  denied = true;
  const deniedResult = await handlers.get('macPermissions:automationProbe')(authorized, { targetId: 'systemEvents', verify: false });
  assert.equal(deniedResult.status, 'denied');
  const afterDenied = appleEventsSent;
  const noRepeat = await handlers.get('macPermissions:automationProbe')(authorized, { targetId: 'systemEvents', verify: false });
  assert.equal(noRepeat.requestSent, false);
  assert.equal(appleEventsSent, afterDenied);
  const explicitVerify = await handlers.get('macPermissions:automationProbe')(authorized, { targetId: 'systemEvents', verify: true });
  assert.equal(explicitVerify.status, 'denied');
  assert.equal(appleEventsSent, afterDenied + 1);
  await assert.rejects(handlers.get('macPermissions:automationProbe')(unauthorized, { targetId: 'systemEvents', verify: false }), /Unauthorized/);
  assert.equal((await handlers.get('macPermissions:automationProbe')(authorized, { targetId: 'arbitrary', verify: false })).ok, false);
  listeners.get('macPermissions:close')({ ...unauthorized });
  assert.equal(api.isOpen(), true);
});

test('listMacWindows parses window output or reports a blocked System Events request', async () => {
  // Successful parse
  const mockStdout = 'Finder:::Desktop:::0:::0:::1920:::1080\nTerminal:::zsh:::100:::120:::800:::500\n';
  const mockExecOk = (_cmd, _args, _opts, cb) => cb(null, mockStdout);

  const resOk = await listMacWindows({ exec: mockExecOk, platform: 'darwin' });
  assert.equal(resOk.ok, true);
  assert.equal(resOk.windows.length, 2);
  assert.equal(resOk.windows[0].app, 'Finder');
  assert.equal(resOk.windows[0].w, 1920);
  assert.equal(resOk.windows[1].app, 'Terminal');
  assert.equal(resOk.windows[1].title, 'zsh');

  // Permission error (-1743)
  const mockExecDenied = (_cmd, _args, _opts, cb) => cb(new Error('execution error: -1743: Not permitted'));
  const resDenied = await listMacWindows({ exec: mockExecDenied, platform: 'darwin' });
  assert.equal(resDenied.ok, false);
  assert.equal(resDenied.permissionNeeded, 'automation');

  // Unsupported platform
  const resWin = await listMacWindows({ platform: 'win32' });
  assert.equal(resWin.ok, false);
  assert.equal(resWin.reason, 'unsupported');
});

test('moveMacWindow and focusMacWindow safely handle window operations', async () => {
  let executedScript = '';
  const mockExec = (_cmd, args, _opts, cb) => {
    executedScript = args[1];
    cb(null, '');
  };

  const moveRes = await moveMacWindow({ appName: 'Notes', windowIndex: 1, x: 250, y: 300, exec: mockExec, platform: 'darwin' });
  assert.equal(moveRes.ok, true);
  assert.ok(executedScript.includes('set position of window 1 to {250, 300}'));

  const focusRes = await focusMacWindow({ appName: 'Notes', exec: mockExec, platform: 'darwin' });
  assert.equal(focusRes.ok, true);
  assert.ok(executedScript.includes('tell application "Notes" to activate'));

  // Error when missing appName
  assert.equal((await moveMacWindow({ platform: 'darwin' })).ok, false);
});


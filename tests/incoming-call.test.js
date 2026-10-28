'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createIncomingCall } = require('../src/main/incoming-call');
const { TRAY } = require('../src/main/labels');

function fixture() {
  const handlers = new Map();
  const listeners = new Map();
  const commands = [];
  const windows = [];
  class FakeWindow {
    constructor(options) {
      this.options = options;
      this.events = new Map();
      this.isDead = false;
      this.webContents = { sent: [], send: (...args) => this.webContents.sent.push(args) };
      windows.push(this);
    }
    once(name, fn) { this.events.set(name, fn); }
    on(name, fn) { this.events.set(name, fn); }
    loadURL(url) { this.url = url; }
    show() { this.shown = true; }
    focus() { this.focused = true; }
    isDestroyed() { return this.isDead; }
    close() { this.isDead = true; this.events.get('closed')?.(); }
  }
  const ipcMain = {
    handle(name, fn) { handlers.set(name, fn); },
    on(name, fn) { listeners.set(name, fn); },
  };
  const call = createIncomingCall({ BrowserWindow: FakeWindow, ipcMain, preload: '/safe/preload.js', protocolUrl: 'capri://app/src/renderer/call.html', sendCommand: (...args) => commands.push(args) });
  return { call, handlers, listeners, commands, windows };
}

test('the menu label exists in French and sits immediately above Talk to her', () => {
  assert.equal(TRAY.fr.incomingCall, 'Recevoir un appel de Capri');
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
  assert.match(main, /label: t\.incomingCall, click: \(\) => incomingCall\.show\(\) \},\s*\{ label: t\.talk/);
});

test('the incoming screen references both required assets and supports a ringtone activation fallback', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/call.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../src/renderer/call-ui.js'), 'utf8');
  assert.ok(fs.existsSync(path.join(__dirname, '../assets/capri-calling-image.png')));
  assert.ok(fs.existsSync(path.join(__dirname, '../assets/songs/phone-call.mp3')));
  assert.match(html, /capri:\/\/app\/assets\/capri-calling-image\.png/);
  assert.match(html, /capri:\/\/app\/assets\/songs\/phone-call\.mp3/);
  assert.match(html, /loop preload="auto"/);
  assert.match(ui, /\$\('enable-sound'\)/);
  assert.match(ui, /ringtone\.pause\(\)/);
});

test('only one incoming call can exist, and accept then hang-up uses the explicit call lifecycle', async () => {
  const f = fixture();
  assert.equal(f.call.show(), true);
  assert.equal(f.call.show(), false);
  assert.equal(f.windows.length, 1);
  const event = { sender: f.windows[0].webContents };
  assert.equal(await f.handlers.get('call:accept')(event), true);
  assert.equal(f.call.accepted, true);
  assert.deepEqual(f.commands[0][0], 'callAccepted');
  f.listeners.get('call:state')(event, { state: 'listening', message: '' });
  assert.deepEqual(f.windows[0].webContents.sent.at(-1), ['call:uiState', { state: 'listening', message: '' }]);
  assert.equal(await f.handlers.get('call:end')(event), true);
  assert.equal(f.call.active, false);
  assert.deepEqual(f.commands[1][0], 'callEnded');
});

test('refusing or closing an unanswered call never accepts it or starts a conversation', async () => {
  const refused = fixture();
  refused.call.show();
  const event = { sender: refused.windows[0].webContents };
  assert.equal(await refused.handlers.get('call:refuse')(event), true);
  assert.equal(refused.call.accepted, false);
  assert.deepEqual(refused.commands.map(([name]) => name), ['callCancelled']);

  const closed = fixture();
  closed.call.show();
  closed.windows[0].close();
  assert.deepEqual(closed.commands.map(([name]) => name), ['callCancelled']);
});

test('call IPC rejects a different renderer and duplicate accept attempts', async () => {
  const f = fixture();
  f.call.show();
  const wrong = { sender: {} };
  assert.equal(await f.handlers.get('call:accept')(wrong), false);
  const event = { sender: f.windows[0].webContents };
  assert.equal(await f.handlers.get('call:accept')(event), true);
  assert.equal(await f.handlers.get('call:accept')(event), false);
  assert.equal(f.commands.filter(([name]) => name === 'callAccepted').length, 1);
});

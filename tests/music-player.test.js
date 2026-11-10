'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createMusicPlayer } = require('../src/main/music-player');

test('closing the mini-player IPC closes its owned window without stopping playback', () => {
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) };
  class FakeWindow extends EventEmitter {
    constructor() {
      super(); this.dead = false; this.webContents = { mainFrame: {}, send() {}, on() {}, once() {} };
      FakeWindow.last = this;
    }
    isDestroyed() { return this.dead; }
    removeMenu() {}
    loadURL() {}
    close() { this.dead = true; this.emit('closed'); }
  }
  let stopped = false;
  const player = createMusicPlayer({ BrowserWindow: FakeWindow, ipcMain, preload: '', protocolUrl: 'capri://music', lang: () => 'fr', playTrack: () => {}, media: ({ action }) => { if (action === 'stop') stopped = true; }, listMedia: () => [] });
  player.show();
  const window = player.isOpen();
  assert.equal(window, true);
  const close = handlers.get('music-player:close');
  assert.deepEqual(close({ sender: {} }), { ok: false, error: 'Accès refusé.' });
  assert.equal(player.isOpen(), true, 'another WebContents cannot close the mini-player');
  const result = close({ sender: FakeWindow.last.webContents, senderFrame: {} });
  assert.deepEqual(result, { ok: true });
  assert.equal(player.isOpen(), false);
  assert.equal(stopped, false);
});

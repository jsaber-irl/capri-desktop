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

test('chat playback waits for the renderer audio-play acknowledgement and dispatches a catalog ID as a user gesture', async () => {
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) };
  class FakeWindow extends EventEmitter {
    constructor() {
      super();
      this.dead = false;
      this.webContents = {
        id: 12,
        mainFrame: {},
        // Electron may still report a transient loading state after the renderer
        // itself has signalled that its audio and IPC listeners are ready.
        isLoading: () => true,
        send() {},
        on() {},
        once: (event, callback) => { this.webContentsHandlers ||= {}; this.webContentsHandlers[event] = callback; },
        executeJavaScript: async (script, userGesture) => {
          this.dispatchCount = (this.dispatchCount || 0) + 1;
          this.dispatch = { script, userGesture };
        },
      };
      FakeWindow.last = this;
    }
    isDestroyed() { return this.dead; }
    removeMenu() {}
    loadURL() {}
    show() {}
    focus() {}
    close() { this.dead = true; this.emit('closed'); }
  }
  const player = createMusicPlayer({ BrowserWindow: FakeWindow, ipcMain, preload: '', protocolUrl: 'capri://app/src/renderer/music-player.html', lang: () => 'fr', playTrack: () => {}, media: async () => ({ ok: true }), listMedia: async () => [] });
  const playback = player.playLocal('this-fffire');
  const window = FakeWindow.last;
  const ownedEvent = { sender: window.webContents, senderFrame: window.webContents.mainFrame };

  assert.deepEqual(await handlers.get('music-player:ready')(ownedEvent, { ok: true }), { ok: true });
  await new Promise((resolve) => setImmediate(resolve));
  window.webContentsHandlers['did-finish-load']();
  assert.equal(window.dispatchCount, 1, 'ready and did-finish-load must not dispatch the same song twice');
  assert.ok(window.dispatch?.script.includes('"id":"this-fffire"'));
  assert.equal(window.dispatch.userGesture, true);

  const detail = JSON.parse(window.dispatch.script.match(/detail: (\{.*\}) \}\)\);/u)[1]);
  assert.deepEqual(await handlers.get('music-player:play-local-result')(ownedEvent, {
    id: detail.id, requestId: detail.requestId, ok: true,
  }), { ok: true });
  assert.deepEqual(await playback, { ok: true, title: 'This Fffire' });
});

test('a failed renderer playback acknowledgement is never reported as success', async () => {
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) };
  class FakeWindow extends EventEmitter {
    constructor() {
      super(); this.dead = false;
      this.webContents = {
        mainFrame: {}, isLoading: () => true, send() {}, on() {}, once() {},
        executeJavaScript: async (script) => { this.script = script; },
      };
      FakeWindow.last = this;
    }
    isDestroyed() { return this.dead; }
    removeMenu() {}
    loadURL() {}
    show() {}
    focus() {}
    close() { this.dead = true; this.emit('closed'); }
  }
  const player = createMusicPlayer({ BrowserWindow: FakeWindow, ipcMain, preload: '', protocolUrl: 'capri://app/src/renderer/music-player.html', lang: () => 'fr', playTrack: () => {}, media: async () => ({ ok: true }), listMedia: async () => [] });
  const playback = player.playLocal('this-fffire');
  const window = FakeWindow.last;
  const ownedEvent = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
  await handlers.get('music-player:ready')(ownedEvent, { ok: true });
  await new Promise((resolve) => setImmediate(resolve));
  const detail = JSON.parse(window.script.match(/detail: (\{.*\}) \}\)\);/u)[1]);
  assert.deepEqual(await handlers.get('music-player:play-local-result')(ownedEvent, {
    id: detail.id, requestId: detail.requestId, ok: false, error: 'Lecture impossible : NotSupportedError',
  }), { ok: true });
  assert.deepEqual(await playback, { ok: false, error: 'Lecture impossible : NotSupportedError' });
});

test('an active music mode is included in the player catalog and can receive a real play acknowledgement', async () => {
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => handlers.set(name, fn) };
  class FakeWindow extends EventEmitter {
    constructor() {
      super(); this.dead = false;
      this.webContents = {
        mainFrame: {}, send() {}, on() {}, once() {},
        executeJavaScript: async (script) => { this.script = script; },
      };
      FakeWindow.last = this;
    }
    isDestroyed() { return this.dead; }
    removeMenu() {}
    loadURL() {}
    show() {}
    focus() {}
    close() { this.dead = true; this.emit('closed'); }
  }
  const custom = { id: 'music-jazz__track-one', title: 'Side Street', src: 'capri://music/music-jazz__track-one', mode: 'Jazz' };
  const player = createMusicPlayer({
    BrowserWindow: FakeWindow, ipcMain, preload: '', protocolUrl: 'capri://app/src/renderer/music-player.html',
    playTrack: () => {}, media: async () => ({ ok: true }), listMedia: () => [], getLibrary: () => [custom],
  });
  player.show();
  const owner = () => ({ sender: FakeWindow.last.webContents, senderFrame: FakeWindow.last.webContents.mainFrame });
  const listed = handlers.get('music-player:library')(owner());
  assert.ok(listed.tracks.some((item) => item.id === custom.id && item.src === custom.src));
  const playback = player.playLocal(custom.id);
  await handlers.get('music-player:ready')(owner(), { ok: true });
  await new Promise((resolve) => setImmediate(resolve));
  const detail = JSON.parse(FakeWindow.last.script.match(/detail: (\{.*\}) \}\)\);/u)[1]);
  assert.equal(detail.id, custom.id);
  await handlers.get('music-player:play-local-result')(owner(), { ...detail, ok: true });
  assert.deepEqual(await playback, { ok: true, title: custom.title });
});

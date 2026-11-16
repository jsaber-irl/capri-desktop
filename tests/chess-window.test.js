'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createChessWindow } = require('../src/main/chess-window');

test('chess window uses a larger size bounded by the display work area', () => {
  const handlers = new Map();
  const windows = [];
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn) };
  class FakeWindow extends EventEmitter {
    constructor(options) { super(); this.options = options; this.webContents = { mainFrame: {}, send() {} }; windows.push(this); }
    isDestroyed() { return false; }
    show() {}
    focus() {}
    removeMenu() {}
    loadURL(url) { this.url = url; }
    close() {}
  }
  const chess = createChessWindow({ BrowserWindow: FakeWindow, ipcMain, preload: '/chess-preload', screen: { getPrimaryDisplay: () => ({ workArea: { width: 1400, height: 1000 } }) } });
  chess.show();
  assert.deepEqual([windows[0].options.width, windows[0].options.height], [1200, 860]);

  chess.close();
});

test('chess window shrinks to fit a compact display work area', () => {
  const windows = [];
  class FakeWindow extends EventEmitter {
    constructor(options) { super(); this.options = options; this.webContents = { mainFrame: {}, send() {} }; windows.push(this); }
    isDestroyed() { return false; }
    show() {}
    focus() {}
    removeMenu() {}
    loadURL() {}
    close() {}
  }
  const chess = createChessWindow({ BrowserWindow: FakeWindow, ipcMain: { handle() {} }, preload: '/chess-preload', screen: { getPrimaryDisplay: () => ({ workArea: { width: 800, height: 600 } }) } });
  chess.show();
  assert.deepEqual([windows[0].options.width, windows[0].options.height], [768, 568]);
  chess.close();
});

test('new game accepts Black and lets Capri make the opening move', async () => {
  const windows=[];
  class FakeWindow extends EventEmitter {
    constructor(options) { super(); this.options=options; this.webContents={mainFrame:{},send(){}}; windows.push(this); }
    isDestroyed(){return false;} show(){} focus(){} removeMenu(){} loadURL(){} close(){}
  }
  const chess=createChessWindow({BrowserWindow:FakeWindow,ipcMain:{handle(){}},preload:'/chess-preload',screen:{getPrimaryDisplay:()=>({workArea:{width:1200,height:900}})}});
  const result=await chess.command({action:'new',playerColor:'b'});
  assert.equal(result.ok,true);
  assert.equal(result.state.playerColor,'b');
  assert.equal(result.state.turn,'b');
  assert.equal(result.state.moveHistory.length,1,'Capri makes the opening White move');
  assert.equal(windows.length,1);
});

'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const {createGamesWindow}=require('../src/main/games-window');
test('local games open in independent windows and only their own renderer can close them',()=>{
  const handlers=new Map();const ipcMain={handle:(name,fn)=>handlers.set(name,fn)};const windows=[];
  class FakeWindow extends EventEmitter{constructor(options){super();this.options=options;this.closed=false;this.webContents={mainFrame:{},send(){}};windows.push(this);}isDestroyed(){return this.closed;}show(){}focus(){}removeMenu(){}loadURL(url){this.url=url;}close(){this.closed=true;this.emit('closed');}}
  const games=createGamesWindow({BrowserWindow:FakeWindow,ipcMain,preload:'/game-preload'});
  assert.ok(games.open('tic-tac-toe').ok);assert.ok(games.open('2048').ok);assert.equal(windows.length,2);assert.notEqual(windows[0].url,windows[1].url);assert.equal(games.list().length,2);
  const close=handlers.get('games:close');const denied=close({sender:{},senderFrame:{}});assert.equal(denied.ok,false);
  const own=windows[0];assert.equal(close({sender:own.webContents,senderFrame:own.webContents.mainFrame}).ok,true);assert.equal(windows[0].closed,true);assert.equal(windows[1].closed,false);
});

'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const {createGamesWindow}=require('../src/main/games-window');
test('local games open in independent windows and only their own renderer can close them',()=>{
  const handlers=new Map();const ipcMain={handle:(name,fn)=>handlers.set(name,fn)};const windows=[];
  class FakeWindow extends EventEmitter{constructor(options){super();this.options=options;this.closed=false;this.webContents={mainFrame:{},send(){}};windows.push(this);}isDestroyed(){return this.closed;}show(){}focus(){}removeMenu(){}loadURL(url){this.url=url;}close(){this.closed=true;this.emit('closed');}}
  const reactions=[];
  const games=createGamesWindow({BrowserWindow:FakeWindow,ipcMain,preload:'/game-preload',onReaction:(event)=>reactions.push(event)});
  assert.ok(games.open('tic-tac-toe').ok);assert.ok(games.open('2048').ok);assert.equal(windows.length,2);assert.notEqual(windows[0].url,windows[1].url);assert.equal(games.list().length,2);
  const close=handlers.get('games:close');const denied=close({sender:{},senderFrame:{}});assert.equal(denied.ok,false);
  const own=windows[0];assert.equal(close({sender:own.webContents,senderFrame:own.webContents.mainFrame}).ok,true);assert.equal(windows[0].closed,true);assert.equal(windows[1].closed,false);
  const reaction=handlers.get('games:reaction');assert.equal(reaction({sender:windows[1].webContents,senderFrame:windows[1].webContents.mainFrame},'big-merge').ok,true);
  assert.deepEqual(reactions,[{game:'2048',reaction:'big-merge'}]);
  assert.equal(reaction({sender:{},senderFrame:{}},'capri-win').ok,false);
});

test('game windows grow while staying within the display work area',()=>{
  const windows=[];const ipcMain={handle(){}};
  class FakeWindow extends EventEmitter{constructor(options){super();this.options=options;this.closed=false;this.webContents={mainFrame:{},send(){}};windows.push(this);}isDestroyed(){return this.closed;}show(){}focus(){}removeMenu(){}loadURL(url){this.url=url;}}
  const games=createGamesWindow({BrowserWindow:FakeWindow,ipcMain,preload:'/game-preload',screen:{getPrimaryDisplay:()=>({workAreaSize:{width:900,height:900}})}});
  games.open('tic-tac-toe');games.open('2048');
  assert.deepEqual(windows.map(({options})=>[options.width,options.height]),[[560,800],[570,760]]);

  const constrained=[];
  class SmallWindow extends FakeWindow{constructor(options){super(options);constrained.push(options);}}
  const small=createGamesWindow({BrowserWindow:SmallWindow,ipcMain,preload:'/game-preload',screen:{getPrimaryDisplay:()=>({workAreaSize:{width:420,height:500}})}});
  small.open('tic-tac-toe');small.open('2048');
  for(const options of constrained){assert.ok(options.width<=388);assert.ok(options.height<=452);}
});

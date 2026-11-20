'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {validateDrawing,PNG_SIGNATURE}=require('../src/main/draw-window');
test('draw documents validate bounded normalized strokes and keep the versioned data shape',()=>{
  const result=validateDrawing({version:1,strokes:[{color:'#ff2e78',size:5,erase:false,points:[{x:0,y:0},{x:1,y:1}]}]});assert.equal(result.strokes.length,1);assert.ok(result.updatedAt);
  assert.deepEqual(validateDrawing({version:1,strokes:[{color:'#abcdef',size:4,points:[{x:.25,y:.75}],untrusted:'discard me'}]}).strokes[0],{color:'#abcdef',size:4,erase:false,points:[{x:.25,y:.75}]});
  assert.throws(()=>validateDrawing({version:1,strokes:[{color:'red',size:5,points:[]}]}),/Style/);
  assert.throws(()=>validateDrawing({version:1,strokes:[{color:'#ffffff',size:5,points:[{x:2,y:0}]}]}),/hors/);
});
test('PNG export validates the actual PNG signature',()=>assert.deepEqual([...PNG_SIGNATURE],[137,80,78,71,13,10,26,10]));

test('drawing recognition validates the sender and sends a reduced JPEG to the configured vision provider', async () => {
  const { createDrawWindow } = require('../src/main/draw-window');
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), on() {} };
  const frame = {};
  const wc = { mainFrame: frame, send() {} };
  class FakeWindow {
    constructor() { this.webContents = wc; }
    once() {}
    on() {}
    loadURL() {}
    show() {}
    focus() {}
    isDestroyed() { return false; }
  }
  let sent;
  let reportedFailure;
  let started = false;
  let resizeOptions;
  const windowApi = createDrawWindow({
    BrowserWindow: FakeWindow, ipcMain, dialog: {}, preload: '', userData: '/tmp/capri-test',
    config: { load: () => ({ provider: 'openai', visionModel: 'vision-test' }) },
    onStarted: () => { started = true; },
    onRecognized: ({ answer }) => answer === 'Un petit chat.',
    onFailed: (error) => { reportedFailure = error; return true; },
    llm: { see: async (provider, cfg, request) => { sent = { provider, cfg, request }; return 'Un petit chat.'; } },
    nativeImage: { createFromBuffer: (buffer) => ({ isEmpty: () => false, resize: (options) => { resizeOptions = options; return { toJPEG: () => Buffer.from('jpeg') }; } }) },
  });
  windowApi.show();
  const sender = { sender: wc, senderFrame: frame };
  const pngBuffer = Buffer.alloc(24);
  PNG_SIGNATURE.copy(pngBuffer);
  pngBuffer.writeUInt32BE(320, 16);
  pngBuffer.writeUInt32BE(240, 20);
  const png = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  assert.deepEqual(await handlers.get('drawing:start')(sender), { ok: true });
  assert.equal(started, true);
  const result = await handlers.get('drawing:identify')(sender, png);
  assert.deepEqual(result, { ok: true, answer: 'Un petit chat.', sentToChat: true });
  assert.equal(sent.provider, 'openai');
  assert.equal(sent.request.image, Buffer.from('jpeg').toString('base64'));
  assert.equal(sent.request.model, 'vision-test');
  assert.match(sent.request.prompt, /uniquement l’image du tableau blanc/);
  assert.deepEqual(resizeOptions, { width: 320, height: 240, quality: 'good' });
  assert.deepEqual(await handlers.get('drawing:identify')({ sender: {}, senderFrame: {} }, png), { ok: false, error: 'Accès refusé.' });
  const oversized = Buffer.from(pngBuffer);
  oversized.writeUInt32BE(9000, 16);
  assert.deepEqual(await handlers.get('drawing:identify')(sender, `data:image/png;base64,${oversized.toString('base64')}`), { ok: false, error: 'Analyse impossible : Les dimensions de l’image dépassent la limite autorisée.', handled: true });
  assert.equal(reportedFailure.message, 'Les dimensions de l’image dépassent la limite autorisée.');
});

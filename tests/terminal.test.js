'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createTerminal, tokenize, validUrl, safeOpenFile, HELP } = require('../src/main/terminal');

test('tokenizes quoted arguments and validates URLs', () => {
  assert.deepEqual(tokenize('/decrypt "red data"'), ['/decrypt', 'red data']);
  assert.deepEqual(tokenize('/open "file/my documents/test.txt"'), ['/open', 'file/my documents/test.txt']);
  assert.deepEqual(tokenize(''), []);
  assert.equal(validUrl('https://example.com/a').protocol, 'https:');
  assert.equal(validUrl('http://example.com/b').protocol, 'http:');
  assert.equal(validUrl('file:///etc/passwd'), null);
  assert.equal(validUrl('javascript:alert(1)'), null);
  assert.equal(validUrl('not a url'), null);
});

test('supports general and fictional commands without side effects', async () => {
  const terminal = createTerminal({ version: '0.5.1', status: () => ({ ok: true }), random: () => 0 });
  assert.match((await terminal.execute('/version')).lines[0], /Capri 0\.5\.1/);
  assert.equal((await terminal.execute('/status')).lines[0], '{\n  "ok": true\n}');
  const hack = await terminal.execute('/hack arasaka');
  assert.equal(hack.progress, true);
  assert.match(hack.lines.at(-1), /simulation/i);
  assert.match((await terminal.execute('/unknown')).lines[0], /Unknown command|Commande inconnue/);
});

test('validates real operation arguments and delegates allowed operations', async () => {
  let openedApp = '';
  let openedFile = '';
  let downloaded = '';
  const terminal = createTerminal({
    openApp: async (name) => { openedApp = name; return true; },
    openFile: async (file) => { openedFile = file; return true; },
    download: async (url) => { downloaded = url.toString(); return '/tmp/example.txt'; },
  });
  assert.equal((await terminal.execute('/open app/Calculator')).kind, 'response');
  assert.equal(openedApp, 'Calculator');
  assert.equal((await terminal.execute('/open file/docs/read me.txt')).kind, 'response');
  assert.equal(openedFile, 'docs/read me.txt');
  assert.equal((await terminal.execute('/download https://example.com/a.txt')).kind, 'response');
  assert.equal(downloaded, 'https://example.com/a.txt');
  assert.equal((await terminal.execute('/download file:///etc/passwd')).kind, 'error');
  assert.equal((await terminal.execute('/open nope')).kind, 'error');
});

test('keeps command history and clears visible output', async () => {
  const terminal = createTerminal();
  await terminal.execute('/version');
  await terminal.execute('/history');
  assert.deepEqual(terminal.history(), ['/version', '/history']);
  assert.equal((await terminal.execute('/clear')).kind, 'clear');
});

test('provides help command in French and English', async () => {
  const terminalFr = createTerminal({ lang: 'fr' });
  const helpFr = await terminalFr.execute('/help');
  assert.equal(helpFr.kind, 'response');
  assert.match(helpFr.lines[0], /COMMANDES DISPONIBLES/);
  assert.ok(helpFr.lines.some((l) => l.includes('/hack arasaka')));

  const terminalEn = createTerminal({ lang: 'en' });
  const helpEn = await terminalEn.execute('/help');
  assert.equal(helpEn.kind, 'response');
  assert.match(helpEn.lines[0], /AVAILABLE COMMANDS/);
  assert.ok(helpEn.lines.some((l) => l.includes('/hack arasaka')));
  assert.ok(helpFr.lines.some((l) => l.includes('/test demoSatellite')));
});

test('the satellite test command launches the shared demo and reports it in terminal history', async () => {
  const actions = [];
  const terminal = createTerminal({ mascot: (action) => actions.push(action) });
  const result = await terminal.execute('/test demoSatellite');
  assert.equal(result.kind, 'response');
  assert.match(result.lines[0], /CapriSatelliteTest/);
  assert.deepEqual(actions, ['demoSatellite']);
  assert.deepEqual(terminal.history(), ['/test demoSatellite']);
  assert.equal((await terminal.execute('/test other')).kind, 'error');
});

test('executes system info and network status commands with result kind', async () => {
  const terminal = createTerminal({
    network: async () => 'ping: 12ms | net: online',
  });
  const sysInfo = await terminal.execute('/system info');
  assert.equal(sysInfo.kind, 'result');
  assert.ok(sysInfo.lines.some((l) => l.includes(`platform: ${process.platform}`)));
  assert.ok(sysInfo.lines.some((l) => l.includes(`node: ${process.versions.node}`)));

  const netStatus = await terminal.execute('/network status');
  assert.equal(netStatus.kind, 'result');
  assert.equal(netStatus.lines[0], 'ping: 12ms | net: online');

  const terminalLocalNet = createTerminal();
  const netLocal = await terminalLocalNet.execute('/network status');
  assert.equal(netLocal.kind, 'result');
  assert.match(netLocal.lines[0], /simulation locale/);
});

test('executes all Cyberpunk 2077 simulated commands', async () => {
  let glitchTriggered = false;
  const terminal = createTerminal({
    random: () => 0.5,
    mascot: (action) => {
      if (action === 'glitch') glitchTriggered = true;
    },
  });

  // /get arasaka data
  const arasakaData = await terminal.execute('/get arasaka data');
  assert.equal(arasakaData.kind, 'response');
  assert.ok(arasakaData.lines.some((l) => l.includes('Cyberpunk 2077')));
  assert.ok(arasakaData.lines.some((l) => l.includes('Arasaka')));

  // /hack arasaka
  const hack = await terminal.execute('/hack arasaka');
  assert.equal(hack.kind, 'response');
  assert.equal(hack.progress, true);
  assert.equal(glitchTriggered, true);
  assert.match(hack.lines.at(-1), /simulation/i);

  // /network scan
  const netScan = await terminal.execute('/network scan');
  assert.equal(netScan.kind, 'response');
  assert.ok(netScan.lines.some((l) => l.includes('ARASAKA')));
  assert.match(netScan.lines.at(-1), /simulation/i);

  // /netrunner status
  const runnerStatus = await terminal.execute('/netrunner status');
  assert.equal(runnerStatus.kind, 'response');
  assert.ok(runnerStatus.lines.some((l) => l.includes('Militech')));
  assert.ok(runnerStatus.lines.some((l) => l.includes('NETRUNNER STATUS')));

  // /ice status
  const iceStatus = await terminal.execute('/ice status');
  assert.equal(iceStatus.kind, 'response');
  assert.ok(iceStatus.lines.some((l) => l.includes('ICE DEFENSE')));
  assert.ok(iceStatus.lines.some((l) => l.includes('Blackwall')));

  // /trace origin
  const trace = await terminal.execute('/trace origin');
  assert.equal(trace.kind, 'response');
  assert.equal(trace.progress, true);
  assert.ok(trace.lines.some((l) => l.includes('Kabuki')));

  // /decrypt
  const decryptMissing = await terminal.execute('/decrypt');
  assert.equal(decryptMissing.kind, 'error');
  const decryptOk = await terminal.execute('/decrypt "CYBER-DATA-01"');
  assert.equal(decryptOk.kind, 'response');
  assert.ok(decryptOk.lines.some((l) => l.includes('CYBER-DATA-01')));

  // /connect and /disconnect
  const connectMissing = await terminal.execute('/connect');
  assert.equal(connectMissing.kind, 'error');
  const connectOk = await terminal.execute('/connect NC-NIGHT-CORP');
  assert.equal(connectOk.kind, 'response');
  assert.equal(terminal.getConnectedNode(), 'NC-NIGHT-CORP');

  const disconnectOk = await terminal.execute('/disconnect');
  assert.equal(disconnectOk.kind, 'response');
  assert.equal(terminal.getConnectedNode(), null);

  const disconnectAgain = await terminal.execute('/disconnect');
  assert.equal(disconnectAgain.kind, 'response');
  assert.match(disconnectAgain.lines[0], /Aucune connexion active|No active connection/);

  // /inventory
  const inv = await terminal.execute('/inventory');
  assert.equal(inv.kind, 'response');
  assert.ok(inv.lines.some((l) => l.includes('Arasaka Datashard')));
});

test('music commands share the central controller and report status, ambiguity, and missing readers', async () => {
  const calls = [];
  const terminal = createTerminal({ musicControl: async (request) => {
    calls.push(request);
    if (request.action === 'status') return { ok: true, status: 'playing', session: { service: 'spotify', app: 'Spotify', title: 'Night Drive', artist: 'Capri' } };
    if (request.service === 'deezer') return { ok: false, status: 'not_found', error: 'Deezer is not active.' };
    if (request.action === 'pause') return { ok: false, status: 'ambiguous', sessions: [{ service: 'spotify', app: 'Spotify' }, { service: 'deezer', app: 'Browser' }] };
    return { ok: true, status: 'controlled', session: { service: 'spotify', app: 'Spotify', title: 'Night Drive' } };
  } });
  assert.match((await terminal.execute('/music status')).lines.join(' '), /spotify.*playing.*Night Drive/i);
  assert.match((await terminal.execute('/music pause')).kind, /error/);
  assert.match((await terminal.execute('/music deezer play')).lines[0], /Deezer is not active/);
  assert.equal((await terminal.execute('/music spotify next')).kind, 'result');
  assert.deepEqual(calls[2], { action: 'play', service: 'deezer', volume: undefined });
  assert.deepEqual(calls[3], { action: 'next', service: 'spotify', volume: undefined });
  assert.equal((await terminal.execute('/music volume 101')).kind, 'error');
});

test('chess and document commands call their real shared services', async () => {
  const chessCalls = [];
  const documents = [];
  const terminal = createTerminal({
    chess: (request) => { chessCalls.push(request); return { ok: true, lines: ['Échiquier ouvert.'] }; },
    createTextDocument: async (filename, content) => { documents.push({ filename, content }); return { ok: true, file: `/Documents/${filename}` }; },
  });
  assert.equal((await terminal.execute('/chess')).kind, 'response');
  assert.deepEqual(chessCalls[0], { action: 'start' });
  assert.equal((await terminal.execute('/chess help')).kind, 'response');
  assert.deepEqual(chessCalls[1], { action: 'help' });
  assert.equal((await terminal.execute('/chess move e2e4')).kind, 'response');
  assert.deepEqual(chessCalls[2], { action: 'move', move: 'e2e4' });
  const created = await terminal.execute('/document create test.txt "Hello World!"');
  assert.equal(created.kind, 'response');
  assert.deepEqual(documents[0], { filename: 'test.txt', content: 'Hello World!' });
});

test('video search terminal command calls the shared search service', async () => {
  const calls = [];
  const terminal = createTerminal({ videoSearch: async (request) => { calls.push(request); return { ok: true }; } });
  const result = await terminal.execute('/search videos MrBeast in Safari');
  assert.equal(result.kind, 'response');
  assert.deepEqual(calls, [{ creator: 'MrBeast', browser: 'Safari' }]);
  assert.match(result.lines.join(' '), /triée par date/i);
  assert.equal((await createTerminal().execute('/search videos MrBeast')).kind, 'error');
});

test('handles mascot control commands', async () => {
  const actions = [];
  const terminal = createTerminal({
    mascot: (action) => actions.push(action),
  });

  const res1 = await terminal.execute('/capri teleport');
  assert.equal(res1.kind, 'response');
  assert.deepEqual(actions, ['teleport']);

  const res2 = await terminal.execute('/satellite');
  assert.equal(res2.kind, 'response');
  assert.deepEqual(actions, ['teleport', 'satellite']);

  const res3 = await terminal.execute('/chat');
  assert.equal(res3.kind, 'response');
  assert.deepEqual(actions, ['teleport', 'satellite', 'chat']);

  const res4 = await terminal.execute('/demo');
  assert.equal(res4.kind, 'response');
  assert.deepEqual(actions, ['teleport', 'satellite', 'chat', 'demo']);

  const res5 = await terminal.execute('/stow');
  assert.equal(res5.kind, 'response');
  assert.deepEqual(actions, ['teleport', 'satellite', 'chat', 'demo', 'stow']);

  const invalidCapri = await terminal.execute('/capri unknown');
  assert.equal(invalidCapri.kind, 'error');
});

test('handles validation and edge cases', async () => {
  const terminal = createTerminal();
  assert.equal((await terminal.execute('')).kind, 'error');
  assert.equal((await terminal.execute('   ')).kind, 'error');
  assert.equal((await terminal.execute('hello')).kind, 'error');
  assert.equal((await terminal.execute('/unknown_cmd')).kind, 'error');
});

test('safeOpenFile validates files and prevents unsafe traversal', async () => {
  let openedTarget = null;
  const mockShell = {
    openPath: async (p) => {
      openedTarget = p;
      return ''; // empty string means success in Electron shell.openPath
    },
  };

  // Null byte injection attempt
  assert.equal(await safeOpenFile('test\0.txt', mockShell), false);

  // Empty string
  assert.equal(await safeOpenFile('', mockShell), false);

  // Directory attempt (this package.json parent dir is a directory)
  assert.equal(await safeOpenFile(__dirname, mockShell), false);

  // Real existing file (package.json)
  const pkgPath = path.resolve(__dirname, '../package.json');
  assert.equal(await safeOpenFile(pkgPath, mockShell), true);
  assert.equal(openedTarget, pkgPath);
});

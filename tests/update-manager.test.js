'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { compareVersions, targetFor, verifyManifest, trustedUrl, createUpdateManager } = require('../src/main/update-manager');
const { makeManifest, signedFiles } = require('../scripts/create-update-manifest');

test('semantic version comparisons correctly order stable and prerelease releases', () => {
  assert.equal(compareVersions('2.10.0', '2.9.9'), 1);
  assert.equal(compareVersions('v2.3.0', '2.3.0'), 0);
  assert.equal(compareVersions('2.3.0', '2.3.1'), -1);
  assert.equal(compareVersions('2.3.0', '2.3.0-rc.1'), 1);
  assert.equal(compareVersions('2.3.0-rc.2', '2.3.0-rc.10'), -1);
  assert.throws(() => compareVersions('latest', '2.0.0'), /Invalid semantic version/);
});

test('update targets are limited to macOS Intel/Apple Silicon and Windows x64', () => {
  assert.equal(targetFor('darwin', 'arm64').file('2.4.0'), 'Capri-2.4.0-arm64-mac.zip');
  assert.equal(targetFor('darwin', 'x64').file('2.4.0'), 'Capri-2.4.0-x64-mac.zip');
  assert.equal(targetFor('win32', 'x64').file('2.4.0'), 'Capri-Setup-2.4.0-x64.exe');
  assert.equal(targetFor('win32', 'arm64'), null);
  assert.equal(targetFor('linux', 'x64'), null);
});

test('manifest verification authenticates signature, release, package path, size and digest', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const version = '2.4.0';
  const name = `Capri-${version}-arm64-mac.zip`;
  const item = { file: name, format: 'zip', size: 123, sha512: 'a'.repeat(128), url: `https://github.com/jsaber-irl/capri-desktop/releases/download/v${version}/${name}` };
  const manifest = { schemaVersion: 1, version, releaseTag: `v${version}`, publishedAt: new Date().toISOString(), releaseNotes: '', platforms: { darwin: { arm64: item } } };
  const raw = Buffer.from(`${JSON.stringify(manifest)}\n`);
  const signature = crypto.sign(null, raw, privateKey).toString('base64');
  const release = { tag_name: `v${version}`, assets: [{ name: 'update-manifest.json', browser_download_url: 'https://github.com/jsaber-irl/capri-desktop/releases/download/v2.4.0/update-manifest.json' }, { name: 'update-manifest.sig', browser_download_url: 'https://github.com/jsaber-irl/capri-desktop/releases/download/v2.4.0/update-manifest.sig' }, { name, browser_download_url: item.url }] };
  assert.equal(verifyManifest(raw, signature, release, 'darwin', 'arm64', publicKey).asset.file, name);
  assert.throws(() => verifyManifest(raw, `${signature.slice(0, -4)}AAAA`, release, 'darwin', 'arm64', publicKey), /signature is invalid/);
  assert.throws(() => verifyManifest(raw, signature, release, 'darwin', 'x64', publicKey), /compatible update package/);
  assert.throws(() => trustedUrl('http://github.com/file'), /approved HTTPS/);
  assert.throws(() => trustedUrl('https://example.com/file'), /approved HTTPS/);
});

function fakeHttps(routes) {
  return { get(url, _options, callback) {
    const request = new EventEmitter();
    request.destroy = (error) => { if (error) process.nextTick(() => request.emit('error', error)); };
    process.nextTick(() => {
      const route = routes.get(String(url));
      if (!route) return request.emit('error', new Error(`Unexpected test URL: ${url}`));
      const body = Buffer.from(route.body);
      const response = Readable.from([body]); response.statusCode = 200; response.headers = route.headers || {};
      callback(response);
    });
    return request;
  } };
}

test('signed release downloads stream to disk and reject corrupt or interrupted package bytes', async (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-update-download-'));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const version = '2.4.0'; const file = `Capri-Setup-${version}-x64.exe`;
  const assetBytes = Buffer.from('authentic installer bytes');
  const item = { file, format: 'exe', size: assetBytes.length, sha512: crypto.createHash('sha512').update(assetBytes).digest('hex'), url: `https://github.com/jsaber-irl/capri-desktop/releases/download/v${version}/${file}` };
  const manifest = { schemaVersion: 1, version, releaseTag: `v${version}`, publishedAt: new Date().toISOString(), releaseNotes: 'Test notes', platforms: { win32: { x64: item } } };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`);
  const signature = crypto.sign(null, manifestBytes, privateKey).toString('base64');
  const asset = (name) => `https://github.com/jsaber-irl/capri-desktop/releases/download/v${version}/${name}`;
  const release = { tag_name: `v${version}`, published_at: manifest.publishedAt, body: 'untrusted body ignored', assets: [
    { name: 'update-manifest.json', browser_download_url: asset('update-manifest.json') },
    { name: 'update-manifest.sig', browser_download_url: asset('update-manifest.sig') },
    { name: file, browser_download_url: item.url },
  ] };
  const routes = new Map([
    ['https://api.github.com/repos/jsaber-irl/capri-desktop/releases/latest', { body: JSON.stringify(release) }],
    [asset('update-manifest.json'), { body: manifestBytes }],
    [asset('update-manifest.sig'), { body: signature }],
    [item.url, { body: assetBytes, headers: { 'content-length': String(assetBytes.length) } }],
  ]);
  let configValue = { updateMode: 'manual' };
  const config = { load: () => configValue, save: (patch) => { configValue = { ...configValue, ...patch }; }, flush() {} };
  const manager = createUpdateManager({ app: { getPath: () => userData, isPackaged: true }, config, packageInfo: { version: '2.3.3' }, publicKey, platform: 'win32', arch: 'x64', httpsModule: fakeHttps(routes) });
  assert.equal((await manager.check()).status, 'available');
  const downloaded = await manager.download();
  assert.equal(downloaded.status, 'ready');
  assert.deepEqual(fs.readFileSync(downloaded.file), assetBytes);

  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-update-corrupt-'));
  t.after(() => fs.rmSync(corruptDir, { recursive: true, force: true }));
  routes.set(item.url, { body: Buffer.from('x'.repeat(assetBytes.length)), headers: { 'content-length': String(assetBytes.length) } });
  const corruptConfig = { load: () => ({ updateMode: 'manual' }), save() {}, flush() {} };
  const corrupt = createUpdateManager({ app: { getPath: () => corruptDir, isPackaged: true }, config: corruptConfig, packageInfo: { version: '2.3.3' }, publicKey, platform: 'win32', arch: 'x64', httpsModule: fakeHttps(routes) });
  await corrupt.check();
  const rejected = await corrupt.download();
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /SHA-512/);
  assert.equal(fs.existsSync(path.join(corruptDir, 'updates', version, `${file}.part`)), false);

  routes.set(item.url, { body: assetBytes.subarray(0, assetBytes.length - 2), headers: { 'content-length': String(assetBytes.length) } });
  const interruptedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-update-interrupted-'));
  t.after(() => fs.rmSync(interruptedDir, { recursive: true, force: true }));
  const interrupted = createUpdateManager({ app: { getPath: () => interruptedDir, isPackaged: true }, config: corruptConfig, packageInfo: { version: '2.3.3' }, publicKey, platform: 'win32', arch: 'x64', httpsModule: fakeHttps(routes) });
  await interrupted.check();
  const interruptedResult = await interrupted.download();
  assert.equal(interruptedResult.ok, false);
  assert.match(interruptedResult.error, /incomplete/);
  assert.equal(fs.existsSync(path.join(interruptedDir, 'updates', version, `${file}.part`)), false);
  manager.dispose(); corrupt.dispose();
  interrupted.dispose();
});

test('release manifest generator requires all target artifacts and signs them with Ed25519', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-update-manifest-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const version = '2.4.0';
  for (const name of [`Capri-${version}-arm64-mac.zip`, `Capri-${version}-x64-mac.zip`, `Capri-Setup-${version}-x64.exe`]) fs.writeFileSync(path.join(dir, name), `asset:${name}`);
  const manifest = await makeManifest({ dir, version, publishedAt: '2026-11-14T00:00:00.000Z' });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const files = signedFiles({ manifest, privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) });
  assert.equal(crypto.verify(null, Buffer.from(files.raw), publicKey, Buffer.from(files.signature.trim(), 'base64')), true);
  assert.equal(manifest.platforms.darwin.arm64.size, Buffer.byteLength(`asset:Capri-${version}-arm64-mac.zip`));
  await assert.rejects(makeManifest({ dir: path.join(dir, 'missing'), version }), /Required update asset is missing/);
  assert.throws(() => signedFiles({ manifest, privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKeyPem: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) }), /does not match/);
});

test('disabled update mode makes no GitHub request and update preferences persist', async (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-updater-'));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  let value = { updateMode: 'disabled' }; const saved = [];
  const config = { load: () => value, save: (patch) => { saved.push(patch); value = { ...value, ...patch }; }, flush() {} };
  const manager = createUpdateManager({ app: { getPath: () => userData, isPackaged: true, quit() {} }, config, packageInfo: { version: '2.3.3' }, httpsModule: { get() { throw new Error('network must not be used while disabled'); } } });
  assert.equal((await manager.check()).status, 'disabled');
  assert.equal(manager.getState().mode, 'disabled');
  assert.deepEqual(manager.setMode('manual'), { ok: true, mode: 'manual' });
  assert.equal(value.updateMode, 'manual');
  assert.equal(manager.setMode('free').ok, false);
  assert.deepEqual(saved, [{ updateMode: 'manual' }]);
  manager.dispose();
});

test('switching to disabled aborts an in-flight GitHub check without reporting a failure', async (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-updater-abort-'));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  let request; const httpsModule = { get(_url, _options, _callback) {
    request = new EventEmitter();
    request.destroy = (error) => { if (error) process.nextTick(() => request.emit('error', error)); };
    return request;
  } };
  let configValue = { updateMode: 'manual' };
  const config = { load: () => configValue, save: (patch) => { configValue = { ...configValue, ...patch }; }, flush() {} };
  const manager = createUpdateManager({ app: { getPath: () => userData, isPackaged: true }, config, packageInfo: { version: '2.3.3' }, platform: 'win32', arch: 'x64', httpsModule });
  const checking = manager.check();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(request);
  assert.deepEqual(manager.setMode('disabled'), { ok: true, mode: 'disabled' });
  assert.deepEqual(await checking, { ok: true, canceled: true, status: 'disabled' });
  assert.equal(manager.getState().status, 'disabled');
  manager.dispose();
});

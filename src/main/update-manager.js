'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');

const REPOSITORY = 'https://github.com/jsaber-irl/capri-desktop';
const API_LATEST = 'https://api.github.com/repos/jsaber-irl/capri-desktop/releases/latest';
const ALLOWED_HOSTS = new Set(['api.github.com', 'github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com']);
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_INSTALLER_BYTES = 2 * 1024 * 1024 * 1024;
const MODES = new Set(['automatic', 'manual', 'disabled']);

function normalizeVersion(value) { return String(value || '').trim().replace(/^v/i, ''); }
function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(normalizeVersion(value));
  if (!match) return null;
  return { core: match.slice(1, 4).map(Number), pre: match[4] ? match[4].split('.') : null };
}
function compareVersions(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  if (!a || !b) throw new Error('Invalid semantic version.');
  for (let i = 0; i < 3; i += 1) if (a.core[i] !== b.core[i]) return Math.sign(a.core[i] - b.core[i]);
  if (!a.pre && !b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const an = /^(0|[1-9]\d*)$/.test(a.pre[i]); const bn = /^(0|[1-9]\d*)$/.test(b.pre[i]);
    if (an && bn && Number(a.pre[i]) !== Number(b.pre[i])) return Math.sign(Number(a.pre[i]) - Number(b.pre[i]));
    if (an !== bn) return an ? -1 : 1;
    if (a.pre[i] !== b.pre[i]) return an ? 0 : (a.pre[i] < b.pre[i] ? -1 : 1);
  }
  return 0;
}
function targetFor(platform = process.platform, arch = process.arch) {
  if (platform === 'darwin' && ['arm64', 'x64'].includes(arch)) return { platform: 'darwin', arch, extension: 'zip', file: (version) => `Capri-${version}-${arch}-mac.zip` };
  if (platform === 'win32' && arch === 'x64') return { platform: 'win32', arch, extension: 'exe', file: (version) => `Capri-Setup-${version}-x64.exe` };
  return null;
}
function trustedUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid update URL.'); }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password || url.port) throw new Error('Update URL is not an approved HTTPS GitHub resource.');
  return url;
}
function officialReleaseAssetUrl(value, tag, name) {
  const url = trustedUrl(value);
  const expected = `/jsaber-irl/capri-desktop/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
  return url.hostname === 'github.com' && url.pathname === expected;
}
function verifyManifest(raw, signatureText, release, platform, arch, publicKey) {
  if (!Buffer.isBuffer(raw) || raw.length > MAX_MANIFEST_BYTES) throw new Error('Update manifest is too large.');
  const signature = Buffer.from(String(signatureText || '').trim(), 'base64');
  if (!signature.length || signature.toString('base64') !== String(signatureText || '').trim()) throw new Error('Update signature encoding is invalid.');
  if (!crypto.verify(null, raw, publicKey, signature)) throw new Error('Update manifest signature is invalid.');
  let manifest;
  try { manifest = JSON.parse(raw.toString('utf8')); } catch { throw new Error('Update manifest is invalid JSON.'); }
  const parsed = parseVersion(manifest.version);
  if (manifest.schemaVersion !== 1 || !parsed || manifest.releaseTag !== release.tag_name || manifest.releaseTag !== `v${normalizeVersion(manifest.version)}`) throw new Error('Update manifest version does not match the GitHub release.');
  const releaseAsset = (release.assets || []).find((asset) => asset.name === 'update-manifest.json');
  const signatureAsset = (release.assets || []).find((asset) => asset.name === 'update-manifest.sig');
  if (!releaseAsset || !signatureAsset) throw new Error('The signed update manifest is missing from the release.');
  if (!officialReleaseAssetUrl(releaseAsset.browser_download_url, manifest.releaseTag, 'update-manifest.json') || !officialReleaseAssetUrl(signatureAsset.browser_download_url, manifest.releaseTag, 'update-manifest.sig')) throw new Error('Signed manifest files are not from the expected GitHub release.');
  if (typeof manifest.releaseNotes !== 'string' || manifest.releaseNotes.length > 12000 || typeof manifest.publishedAt !== 'string' || !Number.isFinite(Date.parse(manifest.publishedAt))) throw new Error('Release notes or publication date are invalid.');
  const platformAssets = manifest.platforms?.[platform];
  const item = platformAssets?.[arch];
  const target = targetFor(platform, arch);
  if (!target || !item || item.file !== target.file(manifest.version) || item.format !== target.extension) throw new Error('No compatible update package is published for this platform and architecture.');
  if (!Number.isSafeInteger(item.size) || item.size < 1 || item.size > MAX_INSTALLER_BYTES || !/^[a-f0-9]{128}$/i.test(item.sha512 || '')) throw new Error('Update package metadata is invalid.');
  const assetUrl = trustedUrl(item.url);
  const expectedPath = `/jsaber-irl/capri-desktop/releases/download/${encodeURIComponent(manifest.releaseTag)}/${encodeURIComponent(item.file)}`;
  if (assetUrl.hostname !== 'github.com' || assetUrl.pathname !== expectedPath) throw new Error('Update package is not the expected official GitHub release asset.');
  const listed = (release.assets || []).find((asset) => asset.name === item.file);
  if (!listed || listed.browser_download_url !== item.url) throw new Error('Update package does not match the release asset list.');
  return { manifest, asset: item, releaseNotes: manifest.releaseNotes, publishedAt: manifest.publishedAt };
}

function requestResponse(url, httpsModule = https, redirects = 0, signal) {
  const parsed = trustedUrl(url);
  if (redirects > 5) return Promise.reject(new Error('Too many redirects from GitHub.'));
  if (signal?.aborted) return Promise.reject(new Error('GitHub request cancelled.'));
  return new Promise((resolve, reject) => {
    const req = httpsModule.get(parsed, { headers: { 'User-Agent': 'Capri-Desktop-Updater', Accept: 'application/vnd.github+json, application/octet-stream' }, timeout: 20000 }, (res) => {
      signal?.removeEventListener('abort', onRequestAbort);
      const onResponseAbort = () => res.destroy(new Error('GitHub request cancelled.'));
      signal?.addEventListener('abort', onResponseAbort, { once: true });
      res.once('close', () => signal?.removeEventListener('abort', onResponseAbort));
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const destination = res.headers.location;
        res.resume();
        if (!destination) return reject(new Error('GitHub redirect is missing a destination.'));
        let next;
        try { next = new URL(destination, parsed).toString(); trustedUrl(next); } catch (error) { return reject(error); }
        return resolve(requestResponse(next, httpsModule, redirects + 1, signal));
      }
      resolve(res);
    });
    const onRequestAbort = () => req.destroy(new Error('GitHub request cancelled.'));
    signal?.addEventListener('abort', onRequestAbort, { once: true });
    req.on('timeout', () => req.destroy(new Error('GitHub request timed out.')));
    req.on('error', (error) => { signal?.removeEventListener('abort', onRequestAbort); reject(error); });
  });
}
async function readResponse(url, maxBytes, httpsModule = https, signal) {
  const response = await requestResponse(url, httpsModule, 0, signal);
  if (response.statusCode !== 200) { response.resume(); throw new Error(response.statusCode === 403 ? 'GitHub rate limit or access restriction.' : `GitHub returned HTTP ${response.statusCode}.`); }
  const chunks = []; let total = 0;
  for await (const chunk of response) { total += chunk.length; if (total > maxBytes) { response.destroy(); throw new Error('GitHub response exceeded its size limit.'); } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function sha512(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    fs.createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

function createUpdateManager({ app, config, packageInfo, publicKey, onState = () => {}, onReady = () => {}, platform = process.platform, arch = process.arch, httpsModule = https, fsx = fs, spawn = require('node:child_process').spawn, timers = globalThis }) {
  const root = path.join(app.getPath('userData'), 'updates');
  const target = targetFor(platform, arch);
  const key = publicKey || fsx.readFileSync(path.join(__dirname, 'update-public-key.pem'), 'utf8');
  let timer = null; let initialTimer = null; let current = null; let listeners = new Set();
  const activeRequests = new Set();
  let priorFailure = '';
  try { priorFailure = String(JSON.parse(fsx.readFileSync(path.join(root, 'install-failed.json'), 'utf8')).error || ''); } catch { /* no saved install failure */ }
  const initialStatus = config.load().lastUpdateInstalled === packageInfo.version ? 'success' : (priorFailure ? 'error' : 'idle');
  let state = { status: initialStatus, installed: packageInfo.version, latest: '', progress: 0, error: priorFailure, releaseNotes: '', publishedAt: '', checkedAt: config.load().lastUpdateCheckAt || '', mode: config.load().updateMode || 'automatic' };
  const publicState = () => { const { file: _privatePath, ...visible } = state; return { ...visible, mode: mode(), supported: Boolean(target), packaged: Boolean(app.isPackaged), installable: installable() }; };
  const emit = (next) => { state = { ...state, ...next, installed: packageInfo.version }; const visible = publicState(); onState(visible); for (const fn of listeners) fn(visible); };
  const mode = () => MODES.has(config.load().updateMode) ? config.load().updateMode : 'automatic';
  function installable() {
    if (!app.isPackaged || !target) return false;
    if (platform === 'win32') return fsx.existsSync(path.join(path.dirname(process.execPath), 'Uninstall Capri.exe'));
    return platform === 'darwin' && typeof process.resourcesPath === 'string' && path.resolve(process.resourcesPath, '..', '..').endsWith('.app');
  }
  function ensureUpdateRoot() {
    const userData = app.getPath('userData');
    fsx.mkdirSync(userData, { recursive: true, mode: 0o700 });
    fsx.mkdirSync(root, { recursive: true, mode: 0o700 });
    if (fsx.lstatSync(root).isSymbolicLink()) throw new Error('Update cache folder cannot be a symbolic link.');
    const realUserData = fsx.realpathSync(userData); const realRoot = fsx.realpathSync(root);
    const relative = path.relative(realUserData, realRoot);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Update cache is outside Capri’s data folder.');
    return realRoot;
  }

  async function fetchVerifiedRelease(signal) {
    const response = await readResponse(API_LATEST, 4 * 1024 * 1024, httpsModule, signal);
    let release;
    try { release = JSON.parse(response.toString('utf8')); } catch { throw new Error('GitHub release response is invalid.'); }
    if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(release.tag_name || '')) throw new Error('Latest GitHub release metadata is invalid.');
    const manifestAsset = (release.assets || []).find((item) => item.name === 'update-manifest.json');
    const signatureAsset = (release.assets || []).find((item) => item.name === 'update-manifest.sig');
    if (!manifestAsset || !signatureAsset) throw new Error('This release does not contain a signed update manifest.');
    const [raw, signature] = await Promise.all([
      readResponse(manifestAsset.browser_download_url, MAX_MANIFEST_BYTES, httpsModule, signal),
      readResponse(signatureAsset.browser_download_url, 256, httpsModule, signal),
    ]);
    const verified = verifyManifest(raw, signature.toString('ascii'), release, platform, arch, key);
    return { ...verified, rawManifest: raw, signature: signature.toString('ascii').trim(), tag: release.tag_name, release };
  }

  async function check({ automatic = false } = {}) {
    if (mode() === 'disabled') { emit({ status: 'disabled', error: '', progress: 0 }); return { ok: true, status: 'disabled' }; }
    if (!target) { const error = `Updates are not available for ${platform}/${arch}.`; emit({ status: 'error', error }); return { ok: false, status: 'error', error, installed: packageInfo.version }; }
    const controller = new AbortController();
    const request = { controller, automatic };
    activeRequests.add(request);
    try {
      emit({ status: 'checking', error: '', progress: 0 });
      const result = await fetchVerifiedRelease(controller.signal);
      if (mode() === 'disabled') { emit({ status: 'disabled', error: '' }); return { ok: true, status: 'disabled' }; }
      current = result;
      const checkedAt = new Date().toISOString(); config.save({ lastUpdateCheckAt: checkedAt }); config.flush();
      fsx.rmSync(path.join(root, 'install-failed.json'), { force: true });
      const comparison = compareVersions(result.manifest.version, packageInfo.version);
      if (comparison <= 0) { const status = comparison === 0 ? 'up-to-date' : 'ahead'; emit({ status, latest: result.manifest.version, releaseNotes: result.releaseNotes, publishedAt: result.publishedAt, checkedAt, asset: null }); return { ok: true, status, installed: packageInfo.version, latest: result.manifest.version }; }
      emit({ status: 'available', latest: result.manifest.version, releaseNotes: result.releaseNotes, publishedAt: result.publishedAt, checkedAt, asset: result.asset.file });
      if (automatic && mode() === 'automatic') return download({ automatic: true });
      return { ok: true, status: 'available', installed: packageInfo.version, latest: result.manifest.version };
    } catch (error) {
      if (controller.signal.aborted || mode() === 'disabled') {
        return { ok: mode() === 'disabled', canceled: true, status: mode() === 'disabled' ? 'disabled' : 'idle' };
      }
      const checkedAt = new Date().toISOString(); config.save({ lastUpdateCheckAt: checkedAt }); config.flush(); emit({ status: 'error', checkedAt, error: String(error?.message || error).slice(0, 400), progress: 0 }); return { ok: false, status: 'error', error: state.error, installed: packageInfo.version };
    } finally { activeRequests.delete(request); }
  }

  async function download({ automatic = false } = {}) {
    if (mode() === 'disabled') return { ok: false, error: 'Updates are disabled.' };
    if (!current) { const checked = await check(); if (!checked.ok || !current) return checked; }
    if (compareVersions(current.manifest.version, packageInfo.version) <= 0) return { ok: false, error: 'There is no newer compatible release.' };
    const controller = new AbortController();
    const request = { controller, automatic };
    activeRequests.add(request);
    const { asset } = current; const dir = path.join(root, current.manifest.version); const destination = path.join(dir, asset.file); const partial = `${destination}.part`;
    try {
      ensureUpdateRoot();
      if (typeof fsx.statfsSync === 'function') {
        const disk = fsx.statfsSync(root);
        if (disk.bavail * disk.bsize < asset.size * 2) throw new Error('Not enough free disk space to download and stage the update.');
      }
      fsx.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const relativeDir = path.relative(fsx.realpathSync(root), fsx.realpathSync(dir));
      if (fsx.lstatSync(dir).isSymbolicLink() || !relativeDir || relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) throw new Error('Update version folder is outside Capri’s update cache.');
      if (fsx.existsSync(destination)) {
        const stat = fsx.statSync(destination);
        if (stat.isFile() && stat.size === asset.size && (await sha512(destination)).toLowerCase() === asset.sha512.toLowerCase()) {
          emit({ status: 'ready', progress: 1, file: destination, error: '' }); onReady({ file: destination, version: current.manifest.version });
          return { ok: true, status: 'ready', file: destination, version: current.manifest.version };
        }
        fsx.rmSync(destination, { force: true });
      }
      fsx.rmSync(partial, { force: true });
      emit({ status: 'downloading', progress: 0, downloaded: 0, total: asset.size, error: '' });
      const response = await requestResponse(asset.url, httpsModule, 0, controller.signal);
      if (response.statusCode !== 200) { response.resume(); throw new Error(`GitHub download returned HTTP ${response.statusCode}.`); }
      const length = Number(response.headers['content-length']);
      if (Number.isFinite(length) && length !== asset.size) { response.destroy(); throw new Error('Downloaded package size does not match its signed manifest.'); }
      let downloaded = 0;
      const progress = new Transform({ transform(chunk, _encoding, callback) { downloaded += chunk.length; if (downloaded > asset.size || downloaded > MAX_INSTALLER_BYTES) return callback(new Error('Downloaded package exceeds its signed size.')); emit({ status: 'downloading', progress: Math.min(1, downloaded / asset.size), downloaded, total: asset.size }); callback(null, chunk); } });
      await pipeline(response, progress, fsx.createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
      if (downloaded !== asset.size) throw new Error('Downloaded package is incomplete.');
      emit({ status: 'verifying', progress: 1 });
      const digest = await sha512(partial);
      if (!crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(asset.sha512, 'hex'))) throw new Error('Downloaded package SHA-512 verification failed.');
      fsx.renameSync(partial, destination);
      emit({ status: 'ready', progress: 1, file: destination, error: '' });
      onReady({ file: destination, version: current.manifest.version });
      return { ok: true, status: 'ready', file: destination, version: current.manifest.version };
    } catch (error) {
      fsx.rmSync(partial, { force: true });
      if (controller.signal.aborted || mode() === 'disabled') return { ok: false, canceled: true, status: mode() === 'disabled' ? 'disabled' : state.status };
      emit({ status: 'error', error: String(error?.message || error).slice(0, 400), progress: 0 }); return { ok: false, error: state.error };
    } finally { activeRequests.delete(request); }
  }

  function install() {
    if (state.status !== 'ready' || !state.file || !current) return { ok: false, error: 'No verified update is ready to install.' };
    if (!installable()) return { ok: false, error: 'Integrated installation requires the official Capri app bundle or per-user Windows installer installation.' };
    const expected = current.asset.file;
    if (path.resolve(state.file) !== path.join(root, current.manifest.version, expected)) return { ok: false, error: 'Update file path is invalid.' };
    let realRoot;
    try { realRoot = ensureUpdateRoot(); } catch (error) { return { ok: false, error: error.message }; }
    const handoff = path.join(realRoot, 'pending-install.json');
    fsx.rmSync(path.join(root, 'install-failed.json'), { force: true });
    fsx.writeFileSync(handoff, JSON.stringify({ version: current.manifest.version, platform, arch, file: state.file, manifest: current.rawManifest.toString('base64'), signature: current.signature, releaseTag: current.tag, release: { tag_name: current.release.tag_name, assets: current.release.assets.map(({ name, browser_download_url }) => ({ name, browser_download_url })) }, parentPid: process.pid }, null, 2), { mode: 0o600 });
    const child = spawn(process.execPath, ['--capri-update-helper', handoff], { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', (error) => emit({ status: 'error', error: `Could not start the update helper: ${error.message}`.slice(0, 400) }));
    child.unref();
    emit({ status: 'installing', error: '' });
    setTimeout(() => app.quit(), 150);
    return { ok: true, status: 'installing' };
  }

  function getState() { return publicState(); }
  function setMode(value) {
    if (!MODES.has(value)) return { ok: false, error: 'Invalid update mode.' };
    config.save({ updateMode: value }); config.flush();
    if (timer) { timers.clearInterval(timer); timer = null; }
    if (initialTimer) { timers.clearTimeout(initialTimer); initialTimer = null; }
    for (const request of activeRequests) {
      if (value === 'disabled' || (value === 'manual' && request.automatic)) request.controller.abort();
    }
    emit({ mode: value, status: value === 'disabled' ? 'disabled' : 'idle', error: '', progress: 0 });
    if (value === 'automatic' && app.isPackaged) start();
    return { ok: true, mode: value };
  }
  function start() {
    if (!app.isPackaged || !target || mode() !== 'automatic' || timer) return;
    initialTimer = timers.setTimeout(() => { initialTimer = null; if (mode() === 'automatic') check({ automatic: true }).catch(() => {}); }, 8000);
    initialTimer.unref?.();
    timer = timers.setInterval(() => { if (mode() === 'automatic') check({ automatic: true }).catch(() => {}); }, 24 * 60 * 60 * 1000);
    timer.unref?.();
  }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function confirmInstalled() {
    const handoff = path.join(root, 'pending-install.json');
    try {
      if (fsx.lstatSync(root).isSymbolicLink() || fsx.lstatSync(handoff).isSymbolicLink() || fsx.statSync(handoff).size > 2 * 1024 * 1024) return false;
      const pending = JSON.parse(fsx.readFileSync(handoff, 'utf8'));
      if (pending.version !== packageInfo.version) return false;
      const raw = Buffer.from(pending.manifest, 'base64');
      const verified = verifyManifest(raw, pending.signature, pending.release, pending.platform, pending.arch, key);
      if (verified.manifest.version !== packageInfo.version || pending.platform !== platform || pending.arch !== arch) return false;
      config.save({ lastUpdateInstalled: packageInfo.version }); config.flush();
      if (platform === 'win32') {
        const expected = targetFor(platform, arch);
        const file = path.join(root, packageInfo.version, expected.file(packageInfo.version));
        if (path.resolve(pending.file) === file) fsx.rmSync(file, { force: true });
        fsx.rmSync(handoff, { force: true });
      } else fsx.writeFileSync(path.join(root, `install-started-ok-${packageInfo.version}`), packageInfo.version, { mode: 0o600 });
      emit({ status: 'success', latest: packageInfo.version, error: '', progress: 1 });
      return true;
    } catch { return false; }
  }
  function dispose() { if (timer) timers.clearInterval(timer); if (initialTimer) timers.clearTimeout(initialTimer); timer = null; initialTimer = null; for (const request of activeRequests) request.controller.abort(); activeRequests.clear(); listeners.clear(); }

  return { check, download, install, getState, setMode, start, subscribe, confirmInstalled, dispose, fetchVerifiedRelease };
}

module.exports = { API_LATEST, REPOSITORY, MODES: [...MODES], normalizeVersion, parseVersion, compareVersions, targetFor, trustedUrl, officialReleaseAssetUrl, verifyManifest, requestResponse, readResponse, sha512, createUpdateManager };

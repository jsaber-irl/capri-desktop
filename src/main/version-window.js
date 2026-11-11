'use strict';

const https = require('node:https');

const REPOSITORY = 'https://github.com/jsaber-irl/capri-desktop';
const PROJECT_PACKAGE_URL = 'https://raw.githubusercontent.com/jsaber-irl/capri-desktop/v2/package.json';

const normalizeVersion = (version) => String(version || '').trim().replace(/^v/i, '');
function compareVersions(left, right) {
  const a = normalizeVersion(left).split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const b = normalizeVersion(right).split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const delta = (a[i] || 0) - (b[i] || 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

function fetchProjectVersion() {
  return new Promise((resolve, reject) => {
    const request = https.get(PROJECT_PACKAGE_URL, {
      headers: { 'User-Agent': 'Capri-Desktop-Version-Check', Accept: 'application/json' },
      timeout: 12000,
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const redirected = https.get(response.headers.location, {
          headers: { 'User-Agent': 'Capri-Desktop-Version-Check', Accept: 'application/json' },
          timeout: 12000,
        }, (redirectResponse) => readPackageResponse(redirectResponse, resolve, reject));
        redirected.on('timeout', () => redirected.destroy(new Error('GitHub request timed out')));
        redirected.on('error', reject);
        return;
      }
      readPackageResponse(response, resolve, reject);
    });
    request.on('timeout', () => request.destroy(new Error('GitHub request timed out')));
    request.on('error', reject);
  });
}

function readPackageResponse(response, resolve, reject) {
  let body = '';
  response.setEncoding('utf8');
  response.on('data', (chunk) => {
    body += chunk;
    if (body.length > 256 * 1024) response.destroy(new Error('GitHub package.json is unexpectedly large'));
  });
  response.on('end', () => {
    if (response.statusCode !== 200) return reject(new Error(`GitHub returned HTTP ${response.statusCode}`));
    try {
      const version = normalizeVersion(JSON.parse(body).version);
      if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid project version');
      resolve(version);
    } catch (error) { reject(error); }
  });
  response.on('error', reject);
}

function createVersionWindow({ BrowserWindow, ipcMain, shell, preload, protocolUrl, packageInfo, lang }) {
  let win = null;
  const fromWindow = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents);
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => fromWindow(event)
    ? callback(...args)
    : { ok: false, error: 'unauthorized' });

  handle('version:check', async () => {
    try {
      const latest = await fetchProjectVersion();
      return { ok: true, installed: packageInfo.version, latest, updateAvailable: compareVersions(latest, packageInfo.version) > 0 };
    } catch (error) {
      return { ok: false, installed: packageInfo.version, error: String(error?.message || error).slice(0, 300) };
    }
  });
  handle('version:openRepository', async () => {
    await shell.openExternal(REPOSITORY);
    return { ok: true };
  });
  handle('version:close', () => {
    if (win && !win.isDestroyed()) win.hide();
    return { ok: true };
  });

  function show() {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); return; }
    win = new BrowserWindow({
      width: 620, height: 460, minWidth: 500, minHeight: 400,
      show: false, frame: false, resizable: true, title: 'Capri · Mise à jour',
      backgroundColor: '#17121f',
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    win.removeMenu();
    win.once('ready-to-show', () => { if (win && !win.isDestroyed()) win.show(); });
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  }

  return { show, lang };
}

module.exports = { createVersionWindow, compareVersions, normalizeVersion, fetchProjectVersion, REPOSITORY };

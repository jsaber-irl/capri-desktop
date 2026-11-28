'use strict';

// Which page is the user looking at? Reading the active tab's address is a
// read-only Apple Event query. When macOS has not authorised Capri to control
// that browser, the translation window points to the exact browser entry in the
// macOS Permissions window instead of guessing or silently failing.

const path = require('node:path');
const cp = require('node:child_process');
const { devLog } = require('./logger');

const DELIMITER = String.fromCharCode(31);
const WINDOWS_SCRIPT = path.join(__dirname, 'active-page.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

const MAC_BROWSERS = [
  { key: 'chrome', id: 'chrome', app: 'Google Chrome', bundle: 'com.google.Chrome', running: 'Google Chrome', tab: 'active tab' },
  { key: 'brave', id: 'brave', app: 'Brave Browser', bundle: 'com.brave.Browser', running: 'Brave Browser', tab: 'active tab' },
  { key: 'edge', id: 'edge', app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', running: 'Microsoft Edge', tab: 'active tab' },
  { key: 'vivaldi', id: 'vivaldi', app: 'Vivaldi', bundle: 'com.vivaldi.Vivaldi', running: 'Vivaldi', tab: 'active tab' },
  { key: 'opera', id: 'opera', app: 'Opera', bundle: 'com.operasoftware.Opera', running: 'Opera', tab: 'active tab' },
  { key: 'safari', id: 'safari', app: 'Safari', bundle: 'com.apple.Safari', running: 'Safari', tab: 'current tab', titleProp: 'name' },
];

const WINDOWS_BROWSERS = { chrome: 'chrome', brave: 'brave', edge: 'msedge', vivaldi: 'vivaldi', opera: 'opera', firefox: 'firefox' };

function execFileAsync(execFile, file, args, options = {}) {
  return new Promise((resolve, reject) => execFile(file, args, {
    timeout: 6000, maxBuffer: 64 * 1024, windowsHide: true, ...options,
  }, (error, stdout, stderr) => {
    if (error) { error.stderr = String(stderr || ''); reject(error); }
    else resolve(String(stdout || '').trim());
  }));
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function browserForBundle(bundle) {
  return MAC_BROWSERS.find((browser) => browser.bundle === bundle) || null;
}

/**
 * Returns the frontmost application bundle without sending any Apple Event.
 * `lsappinfo` is part of macOS and only reads Launch Services state, so this
 * works even when Capri has no Automation permission yet.
 */
async function frontmostApp({ execFile = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return '';
  try {
    const front = await execFileAsync(execFile, 'lsappinfo', ['front']);
    const asn = String(front || '').split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith('ASN:'));
    if (!asn) return '';
    const info = await execFileAsync(execFile, 'lsappinfo', ['info', '-only', 'bundleid', asn]);
    return /bundleID="([^"]+)"/.exec(info)?.[1] || '';
  } catch (error) {
    devLog('[translation:active-page] lsappinfo échoué', String(error?.message || error));
    return '';
  }
}

// Synchronous variant used just before Capri's translation window takes focus:
// the snapshot must be taken while the user's browser is still frontmost.
function frontmostAppSync({ execFileSync = cp.execFileSync, platform = process.platform } = {}) {
  if (platform !== 'darwin') return '';
  try {
    const front = String(execFileSync('lsappinfo', ['front'], { timeout: 4000, encoding: 'utf8' }) || '').trim();
    const asn = front.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith('ASN:'));
    if (!asn) return '';
    const info = String(execFileSync('lsappinfo', ['info', '-only', 'bundleid', asn], { timeout: 4000, encoding: 'utf8' }) || '');
    return /bundleID="([^"]+)"/.exec(info)?.[1] || '';
  } catch (error) {
    devLog('[translation:active-page] capture synchrone échouée', String(error?.message || error));
    return '';
  }
}

function macScript(browser = MAC_BROWSERS[0]) {
  // Safari tabs expose `name`, not `title` (asking for `title` fails with
  // AppleScript error -1700 even when Automation is authorised).
  const titleProperty = browser.titleProp || 'title';
  return `on run
  tell application "${browser.app}"
    if (count of windows) is 0 then return "no-window"
    set pageURL to URL of ${browser.tab} of front window
    set pageTitle to ${titleProperty} of ${browser.tab} of front window
    return pageURL & "${DELIMITER}" & pageTitle
  end tell
end run`;
}

function parseMacResult(output) {
  const lines = String(output || '').trim().split(/\r?\n/);
  const value = lines[lines.length - 1] || '';
  if (value === 'unsupported') {
    return { ok: false, code: 'unsupported', reason: 'This browser does not expose its active tab.' };
  }
  if (value === 'no-window') {
    return { ok: false, code: 'no-window', reason: 'The browser has no open window.' };
  }
  const [rawUrl, ...titleParts] = value.split(DELIMITER);
  const url = safeHttpUrl(rawUrl);
  if (!url) return { ok: false, code: 'no-url', reason: 'The active tab has no web address.' };
  return { ok: true, url, title: String(titleParts.join(DELIMITER) || '').trim().slice(0, 300) };
}

function isProcessRunning(execFile, name) {
  return new Promise((resolve) => {
    execFile('pgrep', ['-x', name], { timeout: 3000 }, (error) => resolve(!error));
  });
}

async function runningBrowsers(execFile) {
  try {
    const list = await execFileAsync(execFile, 'lsappinfo', ['list'], { timeout: 4000, maxBuffer: 1024 * 1024 });
    return MAC_BROWSERS.filter((browser) => list.includes(`bundleID="${browser.bundle}"`));
  } catch (error) {
    devLog('[translation:active-page] liste des navigateurs échouée', String(error?.message || error));
    return [];
  }
}

function permissionResult(browser) {
  return {
    ok: false,
    code: 'permission',
    reason: 'macOS Automation permission is required to read the active tab.',
    browser: browser?.key || '',
    targetId: browser?.id || '',
    targetApp: browser?.app || '',
  };
}

function createActivePageReader({ platform = process.platform, execFile = cp.execFile } = {}) {
  async function read({ bundle = '' } = {}) {
    if (platform === 'darwin') {
      const hintedBundle = String(bundle || '');
      const frontBundle = hintedBundle || await frontmostApp({ execFile, platform });
      let browser = browserForBundle(frontBundle);
      // First run (or Capri was focused before the tracker sampled): if exactly
      // one supported browser is running, it is the page the user means.
      if (!browser && !hintedBundle) {
        const running = await runningBrowsers(execFile);
        if (running.length === 1) browser = running[0];
        devLog('[translation:active-page] repli navigateurs', { count: running.length, chosen: browser?.key || '-' });
      }
      devLog('[translation:active-page] bundle', { hinted: hintedBundle || '-', front: frontBundle || '-', browser: browser?.key || '-' });
      if (!browser) {
        return {
          ok: false,
          code: 'no-browser',
          reason: frontBundle
            ? 'The frontmost application is not a supported browser.'
            : 'The frontmost browser could not be identified.',
        };
      }
      const running = await isProcessRunning(execFile, browser.running);
      devLog('[translation:active-page] processus', { app: browser.app, running });
      if (!running) {
        return {
          ok: false,
          code: 'no-window',
          reason: `${browser.app} is not running.`,
          browser: browser.key,
          targetId: browser.id,
          targetApp: browser.app,
        };
      }
      try {
        // Leave time for the native macOS Automation dialog on the first request.
        const script = macScript(browser);
        devLog('[translation:active-page] osascript', { app: browser.app, command: `osascript -e ${JSON.stringify(script)}` });
        const output = await execFileAsync(execFile, 'osascript', ['-e', script], { timeout: 120000 });
        const parsed = parseMacResult(output);
        let host = '';
        try { host = parsed.url ? new URL(parsed.url).hostname : ''; } catch { host = ''; }
        devLog('[translation:active-page] réponse', { ok: parsed.ok, code: parsed.code || 'ok', host });
        return { ...parsed, browser: browser.key, targetId: browser.id };
      } catch (error) {
        const denied = /(-1743|-25211|not authorized|not permitted|access denied|permission)/i.test(`${error.message} ${error.stderr || ''}`);
        devLog('[translation:active-page] échec AppleScript', {
          app: browser.app,
          denied,
          message: String(error.message || error).slice(0, 300),
          stderr: String(error.stderr || '').slice(0, 500),
        });
        return denied
          ? permissionResult(browser)
          : {
            ok: false,
            code: 'error',
            reason: String(error.message || error).slice(0, 300),
            browser: browser.key,
            targetId: browser.id,
          };
      }
    }
    if (platform === 'win32') {
      try {
        const output = await execFileAsync(execFile, 'powershell.exe', [
          '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WINDOWS_SCRIPT,
        ], { timeout: 8000 });
        let result;
        try { result = JSON.parse(output); } catch { return { ok: false, code: 'error', reason: 'Invalid Windows response.' }; }
        if (result.status === 'no-window') return { ok: false, code: 'no-window', reason: result.reason || 'No browser window.' };
        if (result.status === 'unsupported') return { ok: false, code: 'unsupported', reason: result.reason || 'This application is not a browser.' };
        if (result.status === 'error') {
          return { ok: false, code: result.permission ? 'permission' : 'error', reason: result.reason || 'The active tab could not be read.' };
        }
        const url = safeHttpUrl(result.url);
        if (!url) {
          return {
            ok: false,
            code: result.permission ? 'permission' : 'unsupported',
            reason: result.reason || 'The active tab could not be identified.',
          };
        }
        return { ok: true, url, title: String(result.title || '').slice(0, 300), browser: WINDOWS_BROWSERS[result.browser] || result.browser || '' };
      } catch (error) {
        const denied = /access denied|permission|UI Automation|Automation/i.test(`${error.message} ${error.stderr || ''}`);
        return { ok: false, code: denied ? 'permission' : 'error', reason: String(error.message || error).slice(0, 300) };
      }
    }
    return { ok: false, code: 'unsupported', reason: 'Active-tab detection is not available on this platform.' };
  }
  return { read };
}

/**
 * Remembers the last browser seen in front. The translation window itself takes
 * focus when it opens, so this must be sampled just before it is shown (and
 * while it stays open) for "the page I am on" to mean the user's browser.
 */
function createBrowserTracker({ execFile = cp.execFile, execFileSync = cp.execFileSync, platform = process.platform, intervalMs = 2000 } = {}) {
  let lastBundle = '';
  let timer = null;
  let sampling = null;

  const sample = () => {
    if (sampling) return sampling;
    sampling = frontmostApp({ execFile, platform })
      .then((bundle) => {
        if (browserForBundle(bundle) && bundle !== lastBundle) {
          lastBundle = bundle;
          devLog('[translation:active-page] navigateur mémorisé', bundle);
        }
        return lastBundle;
      })
      .catch(() => lastBundle)
      .finally(() => { sampling = null; });
    return sampling;
  };

  return {
    sample,
    capture: () => {
      const bundle = frontmostAppSync({ execFileSync, platform });
      if (browserForBundle(bundle)) {
        if (bundle !== lastBundle) devLog('[translation:active-page] navigateur capturé', bundle);
        lastBundle = bundle;
      }
      return lastBundle;
    },
    current: () => lastBundle,
    start: () => {
      if (timer || platform !== 'darwin') return;
      sample();
      timer = setInterval(sample, intervalMs);
      timer.unref?.();
    },
    stop: () => {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

const defaultReader = createActivePageReader();
function readActivePage(options) { return defaultReader.read(options); }

module.exports = {
  MAC_BROWSERS,
  WINDOWS_BROWSERS,
  browserForBundle,
  createActivePageReader,
  createBrowserTracker,
  frontmostApp,
  frontmostAppSync,
  macScript,
  parseMacResult,
  readActivePage,
  safeHttpUrl,
};

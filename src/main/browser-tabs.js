'use strict';

// Browser-tab actions are deliberately separate from window/process closing. Each platform
// adapter must identify the frontmost browser and verify the active URL both before and after.
const path = require('node:path');
const cp = require('node:child_process');

const WINDOWS_SCRIPT = path.join(__dirname, 'browser-tab-close.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const MAC_BROWSERS = {
  safari: { app: 'Safari', bundle: 'com.apple.Safari', tab: 'current tab' },
  chrome: { app: 'Google Chrome', bundle: 'com.google.Chrome', tab: 'active tab' },
  edge: { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', tab: 'active tab' },
};
const WINDOWS_BROWSERS = { chrome: 'chrome', edge: 'msedge', firefox: 'firefox' };
const AI_HOSTS = Object.freeze({
  chatgpt: ['chatgpt.com', 'chat.openai.com'], claude: ['claude.ai'], codex: ['chatgpt.com', 'platform.openai.com'],
  gemini: ['gemini.google.com'], copilot: ['copilot.microsoft.com', 'bing.com'], perplexity: ['perplexity.ai'],
  deepseek: ['deepseek.com'], grok: ['grok.com', 'x.com'], lechat: ['mistral.ai'],
  characterai: ['character.ai'], metaai: ['meta.ai'],
});

function browserKey(value) {
  const app = String(value || '').toLowerCase();
  if (/safari/.test(app)) return 'safari';
  if (/msedge|microsoft edge|edge/.test(app)) return 'edge';
  if (/firefox|mozilla/.test(app)) return 'firefox';
  if (/google chrome|chrome/.test(app)) return 'chrome';
  return null;
}

function browserCloseCapability(platform, app) {
  const key = browserKey(app);
  if (platform === 'darwin' && key && MAC_BROWSERS[key]) {
    return { available: true, browser: key, mechanism: 'AppleScript+Automation permission', reason: null };
  }
  if (platform === 'win32' && key && WINDOWS_BROWSERS[key]) {
    return { available: true, browser: key, mechanism: 'Windows UI Automation + verified Ctrl+W', reason: null };
  }
  return {
    available: false,
    browser: key,
    mechanism: null,
    reason: platform === 'linux'
      ? 'Linux: aucun adaptateur sûr ne peut vérifier l’URL active sans interface de débogage du navigateur.'
      : key === 'firefox' && platform === 'darwin'
        ? 'Firefox macOS ne fournit pas ici d’interface officielle de contrôle des onglets.'
        : `La fermeture vérifiée des onglets n’est pas prise en charge pour ${key || 'ce navigateur'} sur ${platform}.`,
  };
}

function execFileAsync(execFile, file, args, options = {}) {
  return new Promise((resolve, reject) => execFile(file, args, {
    timeout: 7000, maxBuffer: 128 * 1024, windowsHide: true, ...options,
  }, (error, stdout, stderr) => {
    if (error) { error.stderr = String(stderr || ''); reject(error); }
    else resolve(String(stdout || '').trim());
  }));
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function aiHostsFor(key) { return [...(AI_HOSTS[key] || [])]; }

function createBrowserTabCloser({ platform = process.platform, execFile = cp.execFile } = {}) {
  async function close({ browser, app, url, hosts = [] } = {}) {
    const capability = browserCloseCapability(platform, browser || app);
    if (!capability.available) return { ok: false, status: 'unsupported', reason: capability.reason, capability };
    const expectedUrl = url ? safeHttpUrl(url) : null;
    const expectedHosts = Array.isArray(hosts) ? hosts.filter((host) => /^[a-z0-9.-]+$/i.test(host)) : [];
    if (!expectedUrl && !expectedHosts.length) return { ok: false, status: 'invalid_target', reason: 'Adresse ou domaine HTTP(S) cible manquant ou invalide.', capability };

    try {
      let output;
      if (platform === 'darwin') output = await closeMac({ execFile, browser: capability.browser, expectedUrl, expectedHosts });
      else output = await closeWindows({ execFile, browser: capability.browser, expectedUrl });
      if (output === 'closed') return { ok: true, status: 'closed', browser: capability.browser, url: expectedUrl || null, capability };
      const reasons = {
        'wrong-browser': 'Le navigateur ciblé n’est pas au premier plan.',
        'target-mismatch': 'L’onglet actif ne correspond plus à l’adresse demandée.',
        'not-verified': 'Le navigateur n’a pas confirmé que l’onglet ciblé a disparu.',
        'no-window': 'Aucune fenêtre de navigateur active.',
        'permission': 'Autorisation Automation/Accessibilité refusée ou requise.',
      };
      return { ok: false, status: output === 'permission' ? 'permission_required' : 'not_closed', reason: reasons[output] || 'La fermeture de l’onglet n’a pas pu être vérifiée.', capability };
    } catch (error) {
      const permission = /(-1743|-25211|not authorized|not permitted|access denied|permission)/i.test(`${error.message} ${error.stderr || ''}`);
      return { ok: false, status: permission ? 'permission_required' : 'error', reason: permission ? 'Autorisation Automation/Accessibilité requise pour contrôler le navigateur.' : String(error.message || error).slice(0, 300), capability };
    }
  }
  return { close, capability: (app) => browserCloseCapability(platform, app) };
}

async function closeMac({ execFile, browser, expectedUrl, expectedHosts = [] }) {
  const target = MAC_BROWSERS[browser];
  const script = `on run argv\n` +
    `set expectedURL to item 1 of argv\n` +
    `set expectedHosts to {}\nif (count of argv) > 1 then set expectedHosts to items 2 thru -1 of argv\n` +
    `tell application "System Events" to set frontBundle to bundle identifier of first application process whose frontmost is true\n` +
    `if frontBundle is not "${target.bundle}" then return "wrong-browser"\n` +
    `tell application "${target.app}"\n` +
    `if (count of windows) is 0 then return "no-window"\n` +
    `set beforeURL to URL of ${target.tab} of front window\n` +
    `set beforeWindowCount to count of windows\nset beforeTabCount to count of tabs of front window\n` +
    `if expectedURL is not "" then\nif beforeURL is not expectedURL then return "target-mismatch"\n` +
    `else\nset hostMatch to false\nrepeat with targetHost in expectedHosts\nset h to contents of targetHost\nif beforeURL is "https://" & h or beforeURL is "http://" & h or beforeURL starts with "https://" & h & "/" or beforeURL starts with "http://" & h & "/" or beforeURL starts with "https://" & h & "?" or beforeURL starts with "http://" & h & "?" then set hostMatch to true\nend repeat\nif hostMatch is false then return "target-mismatch"\nend if\n` +
    `close ${target.tab} of front window\n` +
    `delay 0.35\n` +
    `try\nif (count of windows) < beforeWindowCount then return "closed"\n` +
    `if (count of windows) is 0 then return "closed"\n` +
    `if (count of tabs of front window) < beforeTabCount then return "closed"\n` +
    `end try\nreturn "not-verified"\nend tell\nend run`;
  const output = await execFileAsync(execFile, 'osascript', ['-e', script, '--', expectedUrl || '', ...expectedHosts], { timeout: 10000 });
  return output.split(/\r?\n/).at(-1).trim();
}

async function closeWindows({ execFile, browser, expectedUrl }) {
  const output = await execFileAsync(execFile, 'powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WINDOWS_SCRIPT,
    '-Browser', WINDOWS_BROWSERS[browser], '-Url', expectedUrl,
  ], { timeout: 8000 });
  let result;
  try { result = JSON.parse(output); } catch { throw new Error('Réponse invalide de l’adaptateur Windows.'); }
  if (result.permission) return 'permission';
  return result.status || 'not-verified';
}

module.exports = { browserKey, browserCloseCapability, createBrowserTabCloser, safeHttpUrl, aiHostsFor };

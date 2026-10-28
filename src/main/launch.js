'use strict';

// Discovering and opening installed applications on Windows, macOS and Linux, plus Windows games,
// media keys, music search and websites. Chat, voice and the Capri terminal share this resolver.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { shell } = require('electron');
const { powershell } = require('./apps');
const { APP_ALIASES } = require('./app-aliases');

const WIN = process.platform === 'win32';
// not things to open from a chat: uninstallers, help pages and the like
const SKIP = /uninstall|désinstaller|desinstalar|deinstall|readme|documentation|release notes|support center|website|manual/i;
const STEAM_SKIP = /redistributable|dedicated server|steamworks/i;
// Words that do not distinguish apps in a user's short request (e.g. "Roblox Player").
const FILLER = new Set(['player', 'launcher', 'app', 'application', 'the', 'for', 'windows', 'desktop', 'client', 'x64', 'x86', 'beta']);
const CACHE_MS = 10 * 60 * 1000; // installed apps hardly change

let cache = null; // { at, items }

const plain = (text) => String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const words = (text) => plain(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);
const execFileAsync = (file, args, options = {}) => new Promise((resolve, reject) => {
  execFile(file, args, { ...options, maxBuffer: options.maxBuffer || 16 * 1024 * 1024 }, (err, stdout) => err ? reject(err) : resolve(String(stdout || '')));
});

function normalizeRequest(text) {
  let value = plain(text).trim();
  value = value.replace(/^(?:(?:s'il\s+)?te\s+plait|please)\s+/u, '');
  value = value.replace(/^(?:(?:please|s'il\s+te\s+plait)\s+)?(?:open|launch|start|run|ouvre|ouvrir|lance|lancer|demarre|demarrer)\b\s*/u, '');
  value = value.replace(/^(?:the\s+)?(?:application|app)\b\s*/u, '');
  value = value.replace(/^(?:l['’]|le\s+|la\s+|les\s+|un\s+|une\s+|the\s+|a\s+|an\s+)/u, '');
  value = value.replace(/^(?:application|appli|app)\b\s*/u, '');
  value = value.replace(/\s+(?:application|appli|app)$/u, '');
  value = value.replace(/\s+(?:please|s'il\s+te\s+plait|stp)$/u, '');
  return value.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

const aliasNorm = (text) => normalizeRequest(text);
const canonicalFor = (item) => {
  const bundleId = String(item.bundleId || '').toLowerCase();
  const pathName = path.basename(String(item.path || ''), '.app');
  const identifier = `${item.id || ''} ${bundleId} ${item.path || ''}`.toLowerCase();
  for (const [canonical, entry] of Object.entries(APP_ALIASES)) {
    if (entry.bundleIds.some((id) => id.toLowerCase() === bundleId)
      || (entry.identifiers || []).some((id) => identifier.includes(id.toLowerCase()))
      || normalizeRequest(canonical) === normalizeRequest(item.name)
      || normalizeRequest(canonical) === normalizeRequest(pathName)) return canonical;
  }
  return null;
};

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = row;
  }
  return previous[b.length];
}

function resolveInCatalog(text, items) {
  const query = normalizeRequest(text);
  if (!query) return { status: 'not_found', suggestions: [] };
  const catalog = (items || []).filter((item) => item && item.name);
  const appItems = catalog.filter((item) => item.kind === 'app');
  const unique = (rows) => [...new Map(rows.map((item) => [item.path || `${item.kind}:${item.id}`, item])).values()];
  const exactNames = catalog.filter((item) => [item.name, ...(item.localizedNames || [])].some((name) => normalizeRequest(name) === query));
  if (unique(exactNames).length) return resolution(unique(exactNames));

  const aliasMatches = [];
  for (const [canonical, entry] of Object.entries(APP_ALIASES)) {
    if (!entry.aliases.some((alias) => aliasNorm(alias) === query) && aliasNorm(canonical) !== query) continue;
    if (canonical === 'Browser') {
      const browsers = appItems.filter((item) => item.isDefaultBrowser || /(?:safari|chrome|chromium|firefox|edge|brave|opera|vivaldi)/i.test(`${item.name} ${item.bundleId || ''}`));
      const defaults = browsers.filter((item) => item.isDefaultBrowser);
      aliasMatches.push(...(defaults.length ? defaults : browsers.length === 1 ? browsers : []));
    } else {
      aliasMatches.push(...appItems.filter((item) => canonicalFor(item) === canonical));
    }
  }
  const aliases = unique(aliasMatches);
  if (aliases.length) return resolution(aliases);

  // Localized labels, bundle identifiers, and names without accents/punctuation.
  const normalized = catalog.filter((item) => [item.name, ...(item.localizedNames || []), item.bundleId || '']
    .some((name) => normalizeRequest(name) === query));
  if (unique(normalized).length) return resolution(unique(normalized));

  // Preserve useful short names for multi-word Start menu entries and game launchers.
  const queryWords = words(query).filter((word) => !FILLER.has(word));
  const partial = catalog.map((item) => {
    const names = [item.name, ...(item.localizedNames || [])].map((name) => words(name).filter((word) => !FILLER.has(word)));
    const matches = names.some((nameWords) => queryWords.length > 0 && queryWords.every((word) => nameWords.includes(word)));
    const denominator = Math.min(...names.map((nameWords) => nameWords.length).filter(Boolean));
    return { item, matches, score: denominator ? queryWords.length / denominator : 0 };
  }).filter((row) => row.matches).sort((a, b) => b.score - a.score);
  if (partial.length) {
    const best = partial.filter((row) => row.score === partial[0].score).map((row) => row.item);
    return resolution(unique(best));
  }

  // Short ASR/transcription mistakes: accept only a close single match; never guess between ties.
  const ranked = [];
  for (const item of catalog) {
    const candidates = [item.name, ...(item.localizedNames || [])];
    const canonical = canonicalFor(item);
    if (canonical) candidates.push(...(APP_ALIASES[canonical]?.aliases || []), canonical);
    const distance = Math.min(...candidates.map((candidate) => editDistance(query.replace(/ /g, ''), normalizeRequest(candidate).replace(/ /g, ''))));
    const maxLength = Math.max(query.replace(/ /g, '').length, ...candidates.map((candidate) => normalizeRequest(candidate).replace(/ /g, '').length));
    const allowed = Math.max(1, Math.floor(maxLength * 0.2));
    if (maxLength >= 4 && distance <= allowed) ranked.push({ item, distance, score: 1 - distance / maxLength });
  }
  ranked.sort((a, b) => a.distance - b.distance);
  if (ranked.length && (ranked.length === 1 || ranked[0].distance < ranked[1].distance)) return resolution([ranked[0].item]);
  if (ranked.length) return { status: 'ambiguous', candidates: unique(ranked.filter((row) => row.distance === ranked[0].distance).map((row) => row.item)) };

  const suggestions = catalog.map((item) => ({ item, distance: editDistance(query.replace(/ /g, ''), normalizeRequest(item.name).replace(/ /g, '')) }))
    .filter((row) => row.distance <= Math.max(2, Math.floor(query.length * 0.4)))
    .sort((a, b) => a.distance - b.distance).slice(0, 4).map((row) => row.item);
  return { status: 'not_found', suggestions };
}

function resolution(matches) {
  if (matches.length === 1) return { status: 'found', item: matches[0] };
  return { status: 'ambiguous', candidates: matches };
}

// Everything she can open: [{ name, kind: 'app' | 'steam' | 'epic', id }]
async function launchables({ platform = process.platform } = {}) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  if (platform === 'darwin') {
    const items = await macApplications();
    cache = { at: Date.now(), items };
    return items;
  }
  if (platform === 'linux') {
    const items = await linuxApplications();
    cache = { at: Date.now(), items };
    return items;
  }
  if (platform !== 'win32') return [];
  const items = [];
  const seen = new Set();
  const add = (item) => {
    const key = words(item.name).join(' ');
    if (!key || seen.has(key) || SKIP.test(item.name)) return;
    seen.add(key);
    items.push(item);
  };
  // games first: a game's own entry wins over a shortcut to it
  for (const game of [...steamGames(await steamRoot()), ...epicGames()]) add(game);
  // the Start menu's list is slow the first time (PowerShell starting cold): main.js asks for it early
  const out = await powershell('Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress', 45000).catch(() => null);
  for (const { Name, AppID } of [].concat(out ? JSON.parse(out) : [])) {
    if (Name && AppID && !/^https?:/i.test(AppID)) add({ name: Name, kind: 'app', id: AppID });
  }
  const defaultBrowserProgId = await powershell("(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice' -ErrorAction SilentlyContinue).ProgId", 3000).catch(() => '');
  const browserName = /chrome/i.test(defaultBrowserProgId) ? /chrome/i
    : /firefox/i.test(defaultBrowserProgId) ? /firefox/i
      : /edge|mse/i.test(defaultBrowserProgId) ? /edge/i
        : /brave/i.test(defaultBrowserProgId) ? /brave/i : null;
  if (browserName) {
    const selected = items.find((item) => browserName.test(`${item.name} ${item.id}`));
    if (selected) selected.isDefaultBrowser = true;
  }
  if (out !== null) cache = { at: Date.now(), items }; // a list that failed isn't kept: next time, again
  return items;
}

async function macApplications() {
  let output;
  try {
    output = await execFileAsync('/usr/bin/mdfind', ['-0', 'kMDItemContentType == "com.apple.application-bundle"'], { timeout: 20000 });
  } catch {
    // Spotlight can be disabled or not yet indexed. Fall back to the conventional app folders.
    output = '';
  }
  const locations = new Set(output.split('\0').filter((p) => p.endsWith('.app')));
  const scan = (root, depth = 2) => {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const target = path.join(root, entry.name);
      if (entry.name.endsWith('.app')) locations.add(target);
      else if (depth > 0) scan(target, depth - 1);
    }
  };
  for (const root of ['/Applications', '/System/Applications', '/System/Cryptexes/App/System/Applications', path.join(os.homedir(), 'Applications')]) {
    scan(root);
  }
  const defaultBrowser = await macDefaultBrowserId();
  const apps = [];
  const paths = [...locations];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(8, paths.length) }, async () => {
    while (cursor < paths.length) {
      const appPath = paths[cursor++];
      const plistPath = path.join(appPath, 'Contents', 'Info.plist');
      let plist = {};
      try { plist = JSON.parse(await execFileAsync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath], { timeout: 3000 })); } catch { continue; }
      const bundleId = plist.CFBundleIdentifier || '';
      const fallbackName = plist.CFBundleDisplayName || plist.CFBundleName || path.basename(appPath, '.app');
      let localizedName = '';
      try {
        localizedName = (await execFileAsync('/usr/bin/mdls', ['-raw', '-name', 'kMDItemDisplayName', appPath], { timeout: 3000 })).trim();
        if (localizedName === '(null)') localizedName = '';
      } catch { /* Spotlight metadata is optional */ }
      const item = {
        name: localizedName || fallbackName,
        localizedNames: [...new Set([fallbackName, path.basename(appPath, '.app')].filter(Boolean))],
        kind: 'app', id: bundleId || appPath, bundleId, path: appPath,
        isDefaultBrowser: Boolean(defaultBrowser && bundleId.toLowerCase() === defaultBrowser.toLowerCase()),
      };
      if (!SKIP.test(item.name)) apps.push(item);
    }
  });
  await Promise.all(workers);
  // Safari is the macOS default when Launch Services has no per-user HTTP handler override.
  if (!defaultBrowser) {
    const safari = apps.find((item) => item.bundleId.toLowerCase() === 'com.apple.safari');
    if (safari) safari.isDefaultBrowser = true;
  }
  return apps;
}

async function macDefaultBrowserId() {
  try {
    const plist = await execFileAsync('/usr/bin/defaults', ['read', 'com.apple.LaunchServices/com.apple.launchservices.secure', 'LSHandlers'], { timeout: 3000 });
    const blocks = plist.match(/\{[^{}]*\}/g) || [];
    for (const block of blocks) {
      if (/LSHandlerURLScheme\s*=\s*https?\s*;/i.test(block)) {
        const id = /LSHandlerRole(?:All|Viewer)\s*=\s*"([^"]+)"/i.exec(block)?.[1];
        if (id) return id;
      }
    }
  } catch { /* use an installed browser match if defaults cannot be read */ }
  return null;
}

async function linuxApplications() {
  const roots = [
    path.join(os.homedir(), '.local/share/applications'), '/usr/local/share/applications', '/usr/share/applications',
    '/var/lib/flatpak/exports/share/applications', path.join(os.homedir(), '.local/share/flatpak/exports/share/applications'),
    '/var/lib/snapd/desktop/applications',
  ];
  const locale = (process.env.LANG || '').split(/[._@]/)[0].toLowerCase();
  const items = [];
  for (const root of roots) {
    let files = [];
    try { files = fs.readdirSync(root).filter((file) => file.endsWith('.desktop')); } catch { continue; }
    for (const file of files) {
      let source;
      try { source = fs.readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
      if (!/^\[Desktop Entry\]\s*$/m.test(source) || /^(?:NoDisplay|Hidden)=true\s*$/mi.test(source)) continue;
      const field = (key) => new RegExp(`^${key}=([^\\r\\n]*)$`, 'm').exec(source)?.[1]?.trim();
      const localizedNames = [...source.matchAll(/^Name\[([^\]]+)\]=([^\r\n]*)$/gm)].map((m) => m[2].trim());
      const escapedLocale = locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const localeName = new RegExp(`^Name\\[${escapedLocale}\\]=([^\\r\\n]*)$`, 'm').exec(source)?.[1]?.trim();
      const name = localeName || field('Name') || field('X-GNOME-FullName');
      if (!name) continue;
      items.push({
        name, localizedNames: [...new Set([...localizedNames, field('X-GNOME-FullName')].filter(Boolean))],
        kind: 'app', id: file, desktopId: file, path: path.join(root, file),
        bundleId: field('X-Flatpak') || '', isDefaultBrowser: false,
      });
    }
  }
  // Respect the user's configured handler when it is discoverable from the desktop environment.
  try {
    const handler = (await execFileAsync('xdg-settings', ['get', 'default-web-browser'], { timeout: 2500 })).trim()
      || process.env.BROWSER || '';
    const base = path.basename(handler).toLowerCase();
    const selected = items.find((item) => item.id.toLowerCase() === base || item.name.toLowerCase().includes(base));
    if (selected) selected.isDefaultBrowser = true;
  } catch { /* optional */ }
  return items;
}

function steamRoot() {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { windowsHide: true, timeout: 5000 }, (err, out) => {
      const found = !err && /SteamPath\s+REG_SZ\s+(.+)/.exec(String(out))?.[1].trim();
      resolve(found ? path.normalize(found) : null);
    });
  });
}

// Steam's games, from the manifests in each of its libraries
function steamGames(root) {
  if (!root) return [];
  const libraries = new Set([root]);
  try {
    const vdf = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libraries.add(path.normalize(m[1].replace(/\\\\/g, '\\')));
  } catch {
    // one library, the main one
  }
  const games = [];
  for (const library of libraries) {
    let files = [];
    try {
      files = fs.readdirSync(path.join(library, 'steamapps')).filter((f) => /^appmanifest_\d+\.acf$/.test(f));
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const acf = fs.readFileSync(path.join(library, 'steamapps', file), 'utf8');
        const id = /"appid"\s+"(\d+)"/.exec(acf)?.[1];
        const name = /"name"\s+"([^"]+)"/.exec(acf)?.[1];
        if (id && name && !STEAM_SKIP.test(name)) games.push({ name, kind: 'steam', id });
      } catch {
        // a manifest being written: skip it
      }
    }
  }
  return games;
}

// Epic's games, from its launcher's manifests (not the Unreal Engine plugins it also keeps there)
function epicGames() {
  const dir = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.item'));
  } catch {
    return [];
  }
  const games = [];
  for (const file of files) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (m.bIsIncompleteInstall || m.CatalogNamespace === 'ue' || !m.DisplayName || !m.AppName) continue;
      games.push({ name: m.DisplayName, kind: 'epic', id: `${m.CatalogNamespace}:${m.CatalogItemId}:${m.AppName}` });
    } catch {
      // not one of its manifests
    }
  }
  return games;
}

// The one of `items` named in `text` (your message, or the name in her tag): all the words of its
// name in it, else at least half of them; the closest wins. null if nothing fits well enough.
function match(items, text) {
  const result = resolveInCatalog(text, items);
  return result.status === 'found' ? result.item : null;
}

async function resolve(text) {
  return resolveInCatalog(text, await launchables());
}

async function find(text) {
  const result = await resolve(text);
  return result.status === 'found' ? result.item : null;
}

// Opens one of them (only something she listed herself): a Start menu app through its AppsFolder
// entry (desktop and Store apps alike), a game through its launcher's link.
async function launch({ kind, id } = {}) {
  const item = (await launchables()).find((i) => i.kind === kind && i.id === id);
  if (!item) throw new Error('not found');
  if (kind === 'steam') return shell.openExternal(`steam://rungameid/${id}`);
  if (kind === 'epic') return shell.openExternal(`com.epicgames.launcher://apps/${encodeURIComponent(id)}?action=launch&silent=true`);
  return openApplicationItem(item);
}

async function openApplicationItem(item, {
  platform = process.platform,
  openPath = (target) => shell.openPath(target),
  run = execFileAsync,
  spawnProcess = spawn,
} = {}) {
  if (!item || item.kind !== 'app') throw new Error('Invalid application entry');
  if (platform === 'darwin') {
    if (!item.path) throw new Error('Application path is unavailable');
    const error = await openPath(item.path);
    if (error) throw new Error(error);
    return { ok: true };
  }
  if (platform === 'linux') {
    if (!item.path) throw new Error('Application path is unavailable');
    if (item.path.endsWith('.desktop')) {
      try { await run('gio', ['launch', item.path], { timeout: 10000 }); }
      catch (err) {
        try { await run('xdg-open', [item.path], { timeout: 10000 }); }
        catch { throw new Error(err.message || 'Could not launch application'); }
      }
      return { ok: true };
    }
    const error = await openPath(item.path);
    if (error) throw new Error(error);
    return { ok: true };
  }
  if (platform === 'win32') {
    await new Promise((resolveSpawn, rejectSpawn) => {
      const child = spawnProcess('explorer.exe', [`shell:AppsFolder\\${item.id}`], { detached: true, stdio: 'ignore' });
      child.once('error', rejectSpawn);
      child.once('spawn', () => { child.unref(); resolveSpawn(); });
    });
    return { ok: true };
  }
  throw new Error('Opening applications is unsupported on this platform');
}

// The media keys, as if pressed on the keyboard: whatever plays music (Spotify, a browser…) reacts.
// Play and pause are the same key; the volume moves a few steps at a time.
const MEDIA = { pause: [179, 1], play: [179, 1], next: [176, 1], previous: [177, 1], volup: [175, 5], voldown: [174, 5], mute: [173, 1] };

async function media(action) {
  if (!WIN || !MEDIA[action]) return false;
  const [key, times] = MEDIA[action];
  return powershell(`$w = New-Object -ComObject WScript.Shell; 1..${times} | ForEach-Object { $w.SendKeys([string][char]${key}) }`)
    .then(() => true, () => false);
}

// A Spotify search for it: in the app if it's installed, else on the web.
async function music(query) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) return false;
  try {
    await shell.openExternal(`spotify:search:${encodeURIComponent(q)}`);
  } catch {
    await shell.openExternal(`https://open.spotify.com/search/${encodeURIComponent(q)}`);
  }
  return true;
}

// A website: http or https, with a real host name.
function siteUrl(address) {
  try {
    const url = new URL(/^https?:\/\//i.test(address) ? address : `https://${address}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? url : null;
  } catch {
    return null;
  }
}

async function site(address) {
  const url = siteUrl(String(address || '').trim());
  if (!url) return false;
  await shell.openExternal(url.toString());
  return true;
}

module.exports = { launchables, match, find, resolve, normalizeRequest, resolveInCatalog, macApplications, linuxApplications, openApplicationItem, launch, media, music, site, siteUrl };

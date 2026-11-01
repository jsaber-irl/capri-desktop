'use strict';

// Discovering and opening installed applications on Windows, macOS and Linux, plus Windows games,
// media keys, music search and websites. Chat, voice and the Capri terminal share this resolver.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { app, shell } = require('electron');
const { powershell } = require('./apps');
const { APP_ALIASES } = require('./app-aliases');
const { randomUUID } = require('node:crypto');

const WIN = process.platform === 'win32';
// not things to open from a chat: uninstallers, help pages and the like
const SKIP = /uninstall|désinstaller|desinstalar|deinstall|readme|documentation|release notes|support center|website|manual/i;
const STEAM_SKIP = /redistributable|dedicated server|steamworks/i;
// Words that do not distinguish apps in a user's short request (e.g. "Roblox Player").
const FILLER = new Set(['player', 'launcher', 'app', 'the', 'for', 'windows', 'desktop', 'client', 'x64', 'x86', 'beta', 'music', 'musique', 'media', 'audio', 'video', 'videos']);
const CACHE_MS = 10 * 60 * 1000; // installed apps hardly change
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
let cache = null; // { at, items }

const plain = (text) => String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const words = (text) => plain(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);
const execFileAsync = (file, args, options = {}) => new Promise((resolve, reject) => {
  execFile(file, args, { ...options, maxBuffer: options.maxBuffer || 16 * 1024 * 1024 }, (err, stdout) => err ? reject(err) : resolve(String(stdout || '')));
});

/** Normalise une demande d’application sans accents ni mots de commande superflus. */
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

/** Résout les noms, alias et libellés localisés; les correspondances ex æquo restent ambiguës. */
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

// Recherche un jeu Roblox et le lance directement.
async function roblox(query) {
  const q = String(query || '').trim().slice(0, 100);
  if (!q) return null;

  let game = null;

  try {
    const url =
      `https://apis.roblox.com/search-api/omni-search` +
      `?searchQuery=${encodeURIComponent(q)}` +
      `&pageType=all&sessionId=${randomUUID()}`;

    const res = await fetch(url, {
      headers: {
        'user-agent': UA,
        accept: 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return null;

    const body = await res.json();

    game = (body.searchResults || [])
      .filter(r => r.contentGroupType === 'Game')
      .flatMap(r => r.contents || [])[0] || null;

  } catch (error) {
    console.error('[Roblox] Search error:', error);
    return null;
  }

  if (!game?.rootPlaceId) {
    return { name: null };
  }

  const installed = Boolean(
    app.getApplicationNameForProtocol('roblox://')
  );

  const url = installed
    ? `roblox://experiences/start?placeId=${game.rootPlaceId}`
    : `https://www.roblox.com/games/${game.rootPlaceId}`;

  await shell.openExternal(url);

  const name = String(game.name || '')
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/[\p{Extended_Pictographic}️]/gu, '')
    .trim();

  return {
    name: name || game.name,
    app: installed
  };
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

// Fichiers, dossiers et raccourcis présents sur le bureau.
function desktopItems() {
  const dirs = [
    app.getPath('desktop'),
  ];

  // Bureau partagé Windows.
  if (process.platform === 'win32') {
    dirs.push(
      path.join(
        process.env.PUBLIC || 'C:\\Users\\Public',
        'Desktop'
      )
    );
  }

  const items = [];
  const seen = new Set();

  for (const dir of dirs) {
    let entries = [];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (
        entry.name.startsWith('.') ||
        /^desktop\.ini$/i.test(entry.name)
      ) continue;

      const fullPath = path.join(dir, entry.name);

      // Évite les doublons entre les bureaux.
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      const folder = entry.isDirectory();

      items.push({
        name: folder
          ? entry.name
          : entry.name.replace(/\.[^.]+$/, ''),

        kind: folder ? 'folder' : 'file',
        id: fullPath,
        path: fullPath,
      });
    }
  }

  return items;
}

// Extensions pouvant exécuter du code.
// Elles ne doivent jamais être ouvertes automatiquement par Capri.
const RUNS = /\.(exe|bat|cmd|ps1|vbs|vbe|wsf|wsh|js|jse|msi|msp|reg|scr|com|jar|hta|cpl|pif|sh|command|app)$/i;

const risky = (item) =>
  item?.kind === 'file' && RUNS.test(item.id || item.path || '');

// Dossiers système accessibles depuis Capri.
const FOLDERS = [
  ['explorer', /explorateur|file explorer|\bexplorer\b|ce pc|this pc/i],
  ['recycle', /corbeille|recycle bin|\btrash\b/i],
  ['downloads', /t[ée]l[ée]chargements?|downloads?/i],
  ['desktop', /\bbureau\b|\bdesktop\b/i],
  ['documents', /\bdocuments?\b/i],
  ['pictures', /\bimages\b|\bphotos\b|\bpictures\b/i],
  ['music', /dossier (de )?musique|music folder/i],
  ['videos', /\bvid[ée]os\b/i],
];

function knownFolder(text) {
  const normalized = normalizeRequest(text);

  const hit = FOLDERS.find(([, regex]) => regex.test(normalized));

  return hit
    ? { name: hit[0], kind: 'known', id: hit[0] }
    : null;
}

// Ouvre un dossier système.
async function openKnown(id) {
  const allowed = FOLDERS.some(([key]) => key === id);

  if (!allowed) {
    throw new Error('Unknown system folder');
  }

  // Explorateur de fichiers.
  if (id === 'explorer') {
    if (process.platform === 'win32') {
      spawn('explorer.exe', [], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      return true;
    }

    if (process.platform === 'darwin') {
      await execFileAsync('open', [app.getPath('home')]);
      return true;
    }

    if (process.platform === 'linux') {
      await execFileAsync('xdg-open', [app.getPath('home')]);
      return true;
    }
  }

  // Corbeille : Windows.
  if (id === 'recycle') {
    if (process.platform === 'win32') {
      spawn('explorer.exe', ['shell:RecycleBinFolder'], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      return true;
    }

    if (process.platform === 'darwin') {
      await execFileAsync('open', ['-a', 'Finder', path.join(os.homedir(), '.Trash')]);
      return true;
    }

    if (process.platform === 'linux') {
      await shell.openExternal('trash:///');
      return true;
    }
  }

  const folders = {
    downloads: 'downloads',
    desktop: 'desktop',
    documents: 'documents',
    pictures: 'pictures',
    music: 'music',
    videos: 'videos',
  };

  const folder = folders[id];

  if (!folder) {
    throw new Error('Unknown system folder');
  }

  const target = app.getPath(folder);
  const error = await shell.openPath(target);

  if (error) {
    throw new Error(error);
  }

  return true;
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
  const items = [
    ...desktopItems(),
    ...(await launchables()),
  ];

  const result = resolveInCatalog(text, items);

  if (result.status === 'found') {
    return result.item;
  }

  if (result.status === 'ambiguous') {
    return result;
  }

  return knownFolder(text);
}

// Opens one of them (only something she listed herself): a Start menu app through its AppsFolder
// entry (desktop and Store apps alike), a game through its launcher's link.
/** Lance une entrée résolue du catalogue, jamais une commande construite depuis le texte brut. */
/** Ouvre une application, un jeu, un fichier ou un dossier. */
async function launch({ kind, id } = {}) {

  // Dossiers système.
  if (kind === 'known') {
    return openKnown(id);
  }

  // Fichiers et dossiers du bureau.
  if (kind === 'file' || kind === 'folder') {
    const item = desktopItems().find(
      (entry) => entry.id === id && entry.kind === kind
    );

    if (!item) {
      throw new Error('Desktop item not found');
    }

    // Ne jamais exécuter directement un script ou programme.
    if (risky(item)) {
      throw new Error('Opening executable files is not allowed');
    }

    const error = await shell.openPath(item.id);

    if (error) {
      throw new Error(error);
    }

    return { ok: true };
  }

  // Applications et jeux.
  const item = (await launchables()).find(
    (entry) => entry.kind === kind && entry.id === id
  );

  if (!item) {
    throw new Error('Application not found');
  }

  if (kind === 'steam') {
    await shell.openExternal(`steam://rungameid/${id}`);
    return { ok: true };
  }

  if (kind === 'epic') {
    await shell.openExternal(
      `com.epicgames.launcher://apps/${encodeURIComponent(id)}?action=launch&silent=true`
    );
    return { ok: true };
  }

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
// Contrôle multimédia multiplateforme.
// Windows : véritables touches multimédias via user32.dll.
// macOS : AppleScript.
// Linux : playerctl et wpctl/pactl.

const MEDIA = {
  pause: 'playpause',
  play: 'playpause',
  next: 'next',
  previous: 'previous',
  volup: 'volup',
  voldown: 'voldown',
  mute: 'mute',
};

async function media(action) {
  const command = MEDIA[String(action || '').toLowerCase()];
  if (!command) return false;

  // Windows
  if (process.platform === 'win32') {
    const keys = {
      playpause: 0xb3,
      next: 0xb0,
      previous: 0xb1,
      volup: 0xaf,
      voldown: 0xae,
      mute: 0xad,
    };

    const times = command === 'volup' || command === 'voldown' ? 5 : 1;
    const key = keys[command];

    const script = `
      Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class CapriMediaKeys {
          [DllImport("user32.dll")]
          public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
        }
      ' -ErrorAction SilentlyContinue;

      1..${times} | ForEach-Object {
        [CapriMediaKeys]::keybd_event(${key}, 0, 1, [UIntPtr]::Zero);
        [CapriMediaKeys]::keybd_event(${key}, 0, 3, [UIntPtr]::Zero);
      }
    `;

    return powershell(script).then(() => true, () => false);
  }

  // macOS
  if (process.platform === 'darwin') {
    const scripts = {
      playpause: 'tell application "System Events" to key code 16 using {command down}',
      next: 'tell application "Music" to next track',
      previous: 'tell application "Music" to previous track',
      volup: 'set volume output volume (output volume of (get volume settings) + 5)',
      voldown: 'set volume output volume (output volume of (get volume settings) - 5)',
      mute: 'set volume output muted not (output muted of (get volume settings))',
    };

    try {
      await execFileAsync('/usr/bin/osascript', ['-e', scripts[command]], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Linux
  if (process.platform === 'linux') {
    const commands = {
      playpause: ['playerctl', ['play-pause']],
      next: ['playerctl', ['next']],
      previous: ['playerctl', ['previous']],
      volup: ['wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', '5%+']],
      voldown: ['wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', '5%-']],
      mute: ['wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle']],
    };

    const [executable, args] = commands[command];

    try {
      await execFileAsync(executable, args, { timeout: 5000 });
      return true;
    } catch {
      // Fallback for Linux systems using PulseAudio.
      if (command === 'volup' || command === 'voldown') {
        try {
          await execFileAsync('pactl', [
            'set-sink-volume',
            '@DEFAULT_SINK@',
            command === 'volup' ? '+5%' : '-5%',
          ], { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      }

      if (command === 'mute') {
        try {
          await execFileAsync('pactl', [
            'set-sink-mute',
            '@DEFAULT_SINK@',
            'toggle',
          ], { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      }

      return false;
    }
  }

  return false;
}

// A service search for a track: in the app when its URI handler is available, else on the web.
async function music(query, service = 'spotify') {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) return false;
  const provider = String(service || 'spotify').toLowerCase();
  const urls = {
    spotify: [`spotify:search:${encodeURIComponent(q)}`, `https://open.spotify.com/search/${encodeURIComponent(q)}`],
    deezer: [`deezer://www.deezer.com/search/${encodeURIComponent(q)}`, `https://www.deezer.com/search/${encodeURIComponent(q)}`],
  };
  const [appUrl, webUrl] = urls[provider] || urls.spotify;
  try {
    await shell.openExternal(appUrl);
  } catch {
    await shell.openExternal(webUrl);
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

module.exports = {
  // Applications
  launchables,
  match,
  find,
  resolve,
  normalizeRequest,
  resolveInCatalog,
  macApplications,
  linuxApplications,
  openApplicationItem,
  launch,

  // Bureau et dossiers système
  desktopItems,
  knownFolder,
  openKnown,
  risky,

  // Multimédia
  media,

  // Musique et navigation
  music,
  site,
  siteUrl,
  roblox,
};
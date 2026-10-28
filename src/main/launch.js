'use strict';

// Opening things when you ask her to (chat.js): installed apps, games, music controls, a Spotify
// search, or a website. App discovery uses native stores on Windows and desktop bundles/files on
// macOS and Linux.

const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { shell } = require('electron');
const { powershell } = require('./apps');

const WIN = process.platform === 'win32';
const MAC = process.platform === 'darwin';
// not things to open from a chat: uninstallers, help pages and the like
const SKIP = /uninstall|désinstaller|desinstalar|deinstall|readme|documentation|release notes|support center|website|manual/i;
const STEAM_SKIP = /redistributable|dedicated server|steamworks/i;
// words that don't tell apps apart ("Roblox Player" is "roblox")
const FILLER = new Set(['player', 'launcher', 'app', 'the', 'for', 'windows', 'desktop', 'client', 'x64', 'x86', 'beta']);
const CACHE_MS = 10 * 60 * 1000; // installed apps hardly change

let cache = null; // { at, items }

const plain = (text) => String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const words = (text) => plain(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);

function desktopApps() {
  const dirs = process.platform === 'linux'
    ? [path.join(process.env.HOME || '', '.local/share/applications'), '/usr/share/applications']
    : MAC ? [
      '/Applications',
      '/System/Applications',
      path.join(process.env.HOME || '', 'Applications'),
      path.join(process.env.HOME || '', 'Aplication'),
    ] : [];
  const items = [];
  const visited = new Set();
  const addMacApps = (dir, depth = 0) => {
    let files;
    try { files = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const file of files) {
      if (file.name.startsWith('.')) continue;
      const full = path.join(dir, file.name);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory() && file.name.endsWith('.app')) {
        let real;
        try { real = fs.realpathSync.native(full); } catch { continue; }
        if (visited.has(real)) continue;
        visited.add(real);
        let name = file.name.replace(/\.app$/i, '');
        try {
          const plist = fs.readFileSync(path.join(full, 'Contents/Info.plist'), 'utf8');
          name = /<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/i.exec(plist)?.[1]
            || /<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/i.exec(plist)?.[1]
            || name;
        } catch {
          // The bundle name is a suitable fallback when its Info.plist is unreadable.
        }
        items.push({ name, kind: 'app', id: full });
      } else if (stat.isDirectory() && depth < 3) {
        addMacApps(full, depth + 1);
      }
    }
  };
  for (const dir of dirs) {
    if (MAC) {
      addMacApps(dir);
      continue;
    }
    let files;
    try { files = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const file of files) {
      if (MAC && !file.name.endsWith('.app')) continue;
      if (process.platform === 'linux' && !file.name.endsWith('.desktop')) continue;
      const full = path.join(dir, file.name);
      if (MAC) items.push({ name: file.name.replace(/\.app$/i, ''), kind: 'app', id: full });
      else {
        let text;
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        if (/NoDisplay\s*=\s*true/i.test(text)) continue;
        const name = /^Name=(.+)$/mi.exec(text)?.[1]?.trim();
        const command = /^Exec=(.+)$/mi.exec(text)?.[1]?.replace(/\s+%[fFuUdDnNickvm]$/, '').trim();
        if (name && command) items.push({ name, kind: 'app', id: command });
      }
    }
  }
  return items;
}

// Everything she can open: [{ name, kind: 'app' | 'steam' | 'epic', id }]
async function launchables(refresh = false) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const items = [];
  const seen = new Set();
  const add = (item) => {
    const key = words(item.name).join(' ');
    if (!key || seen.has(key) || SKIP.test(item.name)) return;
    seen.add(key);
    items.push(item);
  };
  if (WIN) {
    // games first: a game's own entry wins over a shortcut to it
    for (const game of [...steamGames(await steamRoot()), ...epicGames()]) add(game);
    const out = await powershell('Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress', 45000).catch(() => null);
    for (const { Name, AppID } of [].concat(out ? JSON.parse(out) : [])) {
      if (Name && AppID && !/^https?:/i.test(AppID)) add({ name: Name, kind: 'app', id: AppID });
    }
  } else {
    for (const item of desktopApps()) add(item);
  }
  cache = { at: Date.now(), items };
  return items;
}

function steamRoot() {
  if (!WIN) {
    const candidates = MAC
      ? [path.join(process.env.HOME || '', 'Library/Application Support/Steam')]
      : [
        path.join(process.env.HOME || '', '.steam/steam'),
        path.join(process.env.HOME || '', '.local/share/Steam'),
      ];
    return Promise.resolve(candidates.find((candidate) => fs.existsSync(path.join(candidate, 'steamapps'))));
  }
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
  const dir = WIN
    ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
    : MAC
      ? path.join(process.env.HOME || '', 'Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests')
      : path.join(process.env.HOME || '', '.config/epic/UnrealEngineLauncher/LauncherInstalled.dat');
  if (!WIN && !MAC) {
    try {
      const installed = JSON.parse(fs.readFileSync(dir, 'utf8'));
      return (installed.InstallationList || [])
        .filter((game) => game.AppName && game.DisplayName && !STEAM_SKIP.test(game.DisplayName))
        .map((game) => ({
          name: game.DisplayName,
          kind: 'epic',
          id: `${game.CatalogNamespace || ''}:${game.CatalogItemId || ''}:${game.AppName}`,
        }));
    } catch {
      return [];
    }
  }
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
  const said = new Set(words(text));
  const joined = words(text).join('');
  let best = null;
  for (const item of items) {
    const key = words(item.name).filter((w) => !FILLER.has(w));
    if (!key.length) continue;
    const hits = key.filter((w) => said.has(w) || (w.length >= 5 && joined.includes(w)));
    if (!hits.some((w) => w.length >= 3) || hits.length / key.length < 0.5) continue;
    const rank = (hits.length / key.length) * 10 + hits.join('').length / 10;
    if (!best || rank > best.rank) best = { item, rank };
  }
  return best?.item || null;
}

async function find(text) {
  const found = match(await launchables(), text);
  return found || match(await launchables(true), text);
}

// Opens one of the entries she listed herself.
async function launch({ kind, id } = {}) {
  const item = (await launchables()).find((i) => i.kind === kind && i.id === id);
  if (!item) throw new Error('not found');
  if (kind === 'steam') return shell.openExternal(`steam://rungameid/${id}`);
  if (kind === 'epic') return shell.openExternal(`com.epicgames.launcher://apps/${encodeURIComponent(id)}?action=launch&silent=true`);
  if (WIN) {
    spawn('explorer.exe', [`shell:AppsFolder\\${id}`], { detached: true, stdio: 'ignore' }).unref();
  } else if (MAC) {
    spawn('open', [id], { detached: true, stdio: 'ignore' }).unref();
  } else {
    const [command, ...args] = id.split(/\s+/);
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  }
  return undefined;
}

// The media keys, as if pressed on the keyboard: whatever plays music (Spotify, a browser…) reacts.
// Play and pause are the same key; the volume moves a few steps at a time. Sent as keys (their virtual
// key codes), not typed: typed, they come out as "³" or "°" on a German keyboard.
const MEDIA = { pause: [0xb3, 1], play: [0xb3, 1], next: [0xb0, 1], previous: [0xb1, 1], volup: [0xaf, 5], voldown: [0xae, 5], mute: [0xad, 1] };
const KEY_DOWN = 1; // KEYEVENTF_EXTENDEDKEY
const KEY_UP = 3;   // ...and KEYEVENTF_KEYUP

async function media(action) {
  if (WIN && MEDIA[action]) {
    const [key, times] = MEDIA[action];
    return powershell(
    'Add-Type -Namespace Capri -Name Keys -MemberDefinition \'[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);\'; '
    + `1..${times} | ForEach-Object { [Capri.Keys]::keybd_event(${key}, 0, ${KEY_DOWN}, [UIntPtr]::Zero); [Capri.Keys]::keybd_event(${key}, 0, ${KEY_UP}, [UIntPtr]::Zero) }`,
    ).then(() => true, () => false);
  }
  if (MAC && ['play', 'pause'].includes(action)) {
    return new Promise((resolve) => execFile('osascript', ['-e', 'tell application "System Events" to key code 16'], (err) => resolve(!err)));
  }
  if (MAC && ['next', 'previous'].includes(action)) {
    const key = action === 'next' ? 17 : 18;
    return new Promise((resolve) => execFile('osascript', ['-e', `tell application "System Events" to key code ${key}`], (err) => resolve(!err)));
  }
  if (MAC && ['volup', 'voldown', 'mute'].includes(action)) {
    const key = action === 'volup' ? 0 : action === 'voldown' ? 1 : 7;
    if (action === 'mute') {
      return new Promise((resolve) => execFile('osascript', ['-e', `tell application "System Events" to key code ${key}`], (err) => resolve(!err)));
    }
    return new Promise((resolve) => execFile('osascript', ['-e', `tell application "System Events" to key code ${key}`], (err) => resolve(!err)));
  }
  if (process.platform === 'linux' && ['play', 'pause', 'next', 'previous'].includes(action)) {
    return new Promise((resolve) => execFile('playerctl', [action === 'previous' ? 'previous' : action], (err) => resolve(!err)));
  }
  if (process.platform === 'linux' && ['volup', 'voldown', 'mute'].includes(action)) {
    const args = action === 'mute'
      ? ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']
      : ['set-sink-volume', '@DEFAULT_SINK@', `${action === 'volup' ? '+' : '-'}5%`];
    return new Promise((resolve) => execFile('pactl', args, (err) => resolve(!err)));
  }
  return false;
}

async function closeTab() {
  if (WIN) {
    return powershell(
      'Add-Type -Namespace Capri -Name Keys -MemberDefinition \'[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);\'; '
      + '[Capri.Keys]::keybd_event(0x11, 0, 1, [UIntPtr]::Zero); [Capri.Keys]::keybd_event(0x57, 0, 1, [UIntPtr]::Zero); '
      + '[Capri.Keys]::keybd_event(0x57, 0, 3, [UIntPtr]::Zero); [Capri.Keys]::keybd_event(0x11, 0, 3, [UIntPtr]::Zero)',
    ).then(() => true, () => false);
  }
  if (MAC) {
    return new Promise((resolve) => execFile('osascript', [
      '-e', 'tell application "System Events" to keystroke "w" using {command down}',
    ], (err) => resolve(!err)));
  }
  return new Promise((resolve) => execFile('xdotool', ['key', 'ctrl+w'], (err) => resolve(!err)));
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

module.exports = { launchables, match, find, launch, media, closeTab, music, site, siteUrl };

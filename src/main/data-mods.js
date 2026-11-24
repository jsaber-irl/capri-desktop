'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const FORMAT = 1;
const MAX_MOD_SIZE = 512 * 1024;
const MAX_ACCESSORY_SIZE = 320 * 1024;
const MAX_ACCESSORY_DIMENSION = 2048;
const MAX_HISTORY_VERSIONS = 50;
const MAX_MUSIC_TRACKS = 100;
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.wav', '.webm']);
const GOOD_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const SAFE_MOD_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}\.capri-mod$/;
const HEX = /^#[0-9a-f]{6}$/i;
const ALLOWED_KEYS = new Set([
  'format', 'id', 'name', 'version', 'author', 'description', 'platforms',
  'kind', 'permissions', 'palette', 'appearance', 'music',
]);
const ALLOWED_PALETTE_KEYS = new Set([
  'hue', 'mix', 'sat', 'val', 'rim', 'css', 'fx',
]);
const ALLOWED_APPEARANCE_KEYS = new Set([
  'type', 'data', 'src', 'x', 'y', 'width', 'height', 'anchor',
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hsvFromHex(hex) {
  const value = HEX.test(String(hex || '')) ? String(hex).slice(1) : 'ff2152';
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return { hue: ((hue * 60 + 360) % 360) / 360, sat: max ? delta / max : 0, val: max };
}

// Certains éditeurs ajoutent une virgule finale après le dernier élément. On
// tolère uniquement cette variante JSON, sans toucher aux virgules dans les chaînes.
function parseModJson(text) {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; output += char; continue; }
    if (char === ',') {
      let next = i + 1;
      while (next < text.length && /\s/.test(text[next])) next++;
      if (text[next] === '}' || text[next] === ']') continue;
    }
    output += char;
  }
  return JSON.parse(output);
}

function validPlatform(value) {
  return ['win32', 'darwin', 'linux'].includes(value);
}

function validatePng(bytes) {
  if (bytes.length < 33 || bytes.length > MAX_ACCESSORY_SIZE
    || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
    throw new Error('The accessory image must be a PNG no larger than 320 KB.');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > MAX_ACCESSORY_DIMENSION || height > MAX_ACCESSORY_DIMENSION) {
    throw new Error(`Accessory PNG dimensions must be from 1 to ${MAX_ACCESSORY_DIMENSION} pixels.`);
  }
}

function validateImageSource(source) {
  if (typeof source !== 'string' || source.length > 2048) {
    throw new Error('The accessory image source is invalid.');
  }
  if (source.startsWith('.') || source.startsWith('/') || source.includes('\\')) {
    if (!source.startsWith('./')) {
      throw new Error('A relative accessory source must start with ./ and stay inside the mod folder.');
    }
    const parts = source.slice(2).split('/');
    if (parts.some((part) => !part || part === '.' || part === '..' || !/^[\p{L}\p{N} _.-]+$/u.test(part))
      || !/\.png$/i.test(parts.at(-1))) {
      throw new Error('A relative accessory source must point to a PNG inside the mod folder.');
    }
    return;
  }
  let url;
  try { url = new URL(source); } catch { throw new Error('The accessory URL is invalid.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('Accessory URLs must use HTTPS and cannot contain credentials.');
  }
}

function validateAppearance(appearance) {
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    throw new Error('An appearance mod must contain an accessory object.');
  }
  for (const key of Object.keys(appearance)) {
    if (!ALLOWED_APPEARANCE_KEYS.has(key)) throw new Error(`The accessory contains an unsupported field: ${key}`);
  }
  if (appearance.type !== 'accessory') throw new Error('Only accessory appearance mods are supported.');
  if ((appearance.data === undefined) === (appearance.src === undefined)) {
    throw new Error('An accessory must define exactly one image source: data or src.');
  }
  if (appearance.data !== undefined) {
    if (typeof appearance.data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(appearance.data)) {
      throw new Error('The accessory image must be an embedded PNG data URL.');
    }
    let bytes;
    try { bytes = Buffer.from(appearance.data.slice(appearance.data.indexOf(',') + 1), 'base64'); }
    catch { throw new Error('The accessory PNG is invalid.'); }
    validatePng(bytes);
  } else {
    validateImageSource(appearance.src);
  }
  for (const key of ['x', 'y', 'width', 'height']) {
    if (appearance[key] !== undefined && (typeof appearance[key] !== 'number' || !Number.isFinite(appearance[key]))) {
      throw new Error(`Accessory ${key} must be a number.`);
    }
  }
  if (appearance.width !== undefined && (appearance.width < 8 || appearance.width > 320)) throw new Error('Accessory width must be from 8 to 320 pixels.');
  if (appearance.height !== undefined && (appearance.height < 8 || appearance.height > 320)) throw new Error('Accessory height must be from 8 to 320 pixels.');
  if (appearance.x !== undefined && (appearance.x < -200 || appearance.x > 400)) throw new Error('Accessory x position is outside the supported range.');
  if (appearance.y !== undefined && (appearance.y < -200 || appearance.y > 384)) throw new Error('Accessory y position is outside the supported range.');
  if (appearance.anchor !== undefined && !['center', 'top-left'].includes(appearance.anchor)) throw new Error('Accessory anchor must be center or top-left.');
  return clone(appearance);
}

function validateMusic(music) {
  if (!music || typeof music !== 'object' || Array.isArray(music)
    || Object.keys(music).some((key) => key !== 'tracks')
    || !Array.isArray(music.tracks) || music.tracks.length < 1 || music.tracks.length > MAX_MUSIC_TRACKS) {
    throw new Error(`A music mode must contain 1-${MAX_MUSIC_TRACKS} tracks.`);
  }
  const ids = new Set();
  const titles = new Set();
  const tracks = music.tracks.map((track) => {
    if (!track || typeof track !== 'object' || Array.isArray(track)
      || Object.keys(track).some((key) => !['id', 'title', 'artist', 'album', 'artwork', 'src'].includes(key))) {
      throw new Error('A music track contains unsupported fields.');
    }
    if (typeof track.id !== 'string' || !GOOD_ID.test(track.id) || ids.has(track.id)) throw new Error('Music track IDs must be unique and valid.');
    if (typeof track.title !== 'string' || !track.title.trim() || track.title.length > 160) throw new Error('Music track titles must contain 1-160 characters.');
    const titleKey = track.title.trim().toLocaleLowerCase();
    if (titles.has(titleKey)) throw new Error('Music track titles must be unique within a mode.');
    if (track.artist !== undefined && (typeof track.artist !== 'string' || track.artist.length > 160)) throw new Error('Music artist metadata is invalid.');
    if (track.album !== undefined && (typeof track.album !== 'string' || track.album.length > 160)) throw new Error('Music album metadata is invalid.');
    if (track.artwork !== undefined) {
      let artwork;
      try { artwork = new URL(track.artwork); } catch { throw new Error('Music artwork must use an HTTPS URL.'); }
      if (artwork.protocol !== 'https:' || !artwork.hostname || artwork.username || artwork.password) throw new Error('Music artwork must use an HTTPS URL.');
    }
    if (typeof track.src !== 'string' || track.src.length > 2048) throw new Error('Music source is invalid.');
    if (track.src.startsWith('./')) {
      const parts = track.src.slice(2).split('/');
      if (parts.some((part) => !part || part === '.' || part === '..' || !/^[\p{L}\p{N} _().-]+$/u.test(part))
        || !AUDIO_EXTENSIONS.has(path.extname(parts.at(-1)).toLowerCase())) {
        throw new Error('A local music source must be a relative audio path such as ./Desktop/Music/song.mp3.');
      }
    } else {
      let source;
      try { source = new URL(track.src); } catch { throw new Error('Online music sources must be HTTPS URLs.'); }
      if (source.protocol !== 'https:' || !source.hostname || source.username || source.password) throw new Error('Online music sources must be HTTPS URLs without credentials.');
    }
    ids.add(track.id);
    titles.add(titleKey);
    return { ...track, title: track.title.trim() };
  });
  return { tracks };
}

function validateMod(raw, platform) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The mod must be a JSON object.');
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`The data mod contains an unsupported field: ${key}`);
  }
  if (raw.format !== FORMAT) throw new Error('Unsupported data mod format.');
  if (typeof raw.id !== 'string' || !GOOD_ID.test(raw.id)) throw new Error('The mod id must contain 1-48 lowercase letters, numbers, or dashes.');
  if (typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 80) throw new Error('The mod name must contain 1-80 characters.');
  if (raw.version !== undefined && (typeof raw.version !== 'string' || raw.version.length > 40)) throw new Error('The mod version is invalid.');
  if (raw.author !== undefined && (typeof raw.author !== 'string' || raw.author.length > 80)) throw new Error('The mod author is invalid.');
  if (raw.description !== undefined && (typeof raw.description !== 'string' || raw.description.length > 500)) throw new Error('The mod description is invalid.');
  if (raw.platforms !== undefined) {
    if (!Array.isArray(raw.platforms) || raw.platforms.length > 3 || raw.platforms.some((item) => !validPlatform(item))) {
      throw new Error('The mod platforms must be a list containing win32, darwin, or linux.');
    }
  }
  if (raw.permissions !== undefined) {
    if (!Array.isArray(raw.permissions) || raw.permissions.some((item) => item !== 'appearance')) {
      throw new Error('Data mods may request only the appearance permission.');
    }
  }
  const kind = raw.kind === 'song' ? 'music' : (raw.kind || (raw.appearance ? 'appearance' : raw.music ? 'music' : 'palette'));
  if (!['palette', 'appearance', 'music'].includes(kind)) throw new Error('The mod kind must be palette, appearance, or music.');
  raw.kind = kind;
  if (kind === 'palette' && (raw.palette === undefined || typeof raw.palette !== 'object' || Array.isArray(raw.palette))) {
    throw new Error('A palette mod must contain a palette object.');
  }
  if (kind === 'appearance' && raw.appearance !== undefined) validateAppearance(raw.appearance);
  if (kind === 'appearance' && raw.appearance === undefined) throw new Error('An appearance mod must contain an accessory object.');
  if (kind === 'music') raw.music = validateMusic(raw.music);
  if (raw.palette !== undefined && typeof raw.palette !== 'object') throw new Error('The palette must be an object.');
  if (kind === 'palette' && raw.appearance !== undefined) throw new Error('A palette mod cannot contain an appearance accessory.');
  if (kind === 'appearance' && raw.palette !== undefined) throw new Error('An appearance mod cannot contain a palette.');
  if (kind !== 'music' && raw.music !== undefined) throw new Error('Only a music mode can contain music tracks.');
  if (kind === 'music' && (raw.palette !== undefined || raw.appearance !== undefined)) throw new Error('A music mode cannot also contain a palette or accessory.');
  if (raw.palette === undefined && raw.appearance === undefined && raw.music === undefined) throw new Error('A data mod must contain a palette, appearance, or music object.');
  for (const key of Object.keys(raw.palette || {})) {
    if (!ALLOWED_PALETTE_KEYS.has(key)) throw new Error(`The palette contains an unsupported field: ${key}`);
  }
  const palette = raw.palette || {};
  for (const key of ['hue', 'mix', 'sat', 'val']) {
    if (palette[key] !== undefined && (typeof palette[key] !== 'number' || !Number.isFinite(palette[key]) || palette[key] < 0 || palette[key] > 1.5)) {
      throw new Error(`The palette field ${key} must be a number from 0 to 1.5.`);
    }
  }
  if (palette.rim !== undefined) {
    if (!Array.isArray(palette.rim) || palette.rim.length !== 3 || palette.rim.some((value) => typeof value !== 'number' || value < 0 || value > 1.5)) {
      throw new Error('The palette rim must contain three numbers from 0 to 1.5.');
    }
  }
  for (const group of ['css', 'fx']) {
    if (palette[group] !== undefined) {
      if (!palette[group] || typeof palette[group] !== 'object' || Array.isArray(palette[group])) {
        throw new Error(`The palette ${group} field must be an object.`);
      }
      for (const [key, value] of Object.entries(palette[group])) {
        if (!/^(--[a-z0-9-]+|[a-z]+)$/.test(key) || typeof value !== 'string' || value.length > 80) {
          throw new Error(`The palette ${group} field contains an invalid value.`);
        }
        if (group === 'fx' && !HEX.test(value)) throw new Error('FX colors must use six-digit hexadecimal values.');
        if (group === 'css' && (/url\s*\(|@import|expression\s*\(|;|<|>/i.test(value))) {
          throw new Error('CSS palette values cannot contain imports, URLs, expressions, or markup.');
        }
      }
    }
  }
  if (raw.platforms && !raw.platforms.includes(platform)) {
    throw new Error(`This mod does not support ${platform}.`);
  }
  return clone(raw);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function resolveRelativeAccessory(sourceFile, source, fsx) {
  const parts = source.slice(2).split('/');
  const sourceDirectory = path.dirname(path.resolve(sourceFile));
  const sourceRoot = fsx.realpathSync(sourceDirectory);
  const file = path.resolve(sourceDirectory, ...parts);
  const realFile = fsx.realpathSync(file);
  const relative = path.relative(sourceRoot, realFile);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('The relative accessory image must remain inside the mod folder.');
  }
  const stat = fsx.statSync(realFile);
  if (!stat.isFile() || stat.size > MAX_ACCESSORY_SIZE) {
    throw new Error('The accessory PNG must be a file no larger than 320 KB.');
  }
  const bytes = fsx.readFileSync(realFile);
  validatePng(bytes);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function createDataMods({ userData, platform = process.platform, fsx = fs, homeDir = os.homedir(), projectModsDir = null } = {}) {
  if (!userData) throw new Error('A user-data directory is required.');
  const dir = path.join(userData, 'mods');
  const manifestFile = path.join(dir, 'manifest.json');
  const audioRoot = fsx.realpathSync(path.resolve(homeDir));

  function resolveMusicPath(source) {
    if (typeof source !== 'string' || !source.startsWith('./')) throw new Error('The music source is not a local relative path.');
    const parts = source.slice(2).split('/');
    const candidate = path.resolve(audioRoot, ...parts);
    const real = fsx.realpathSync(candidate);
    const relative = path.relative(audioRoot, real);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Local music paths must stay inside your home folder.');
    const stat = fsx.statSync(real);
    if (!stat.isFile() || !AUDIO_EXTENSIONS.has(path.extname(real).toLowerCase())) throw new Error('The local music source is not a supported audio file.');
    return real;
  }

  function readManifest() {
    try {
      const value = JSON.parse(fsx.readFileSync(manifestFile, 'utf8'));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function writeManifest(value) {
    fsx.mkdirSync(dir, { recursive: true });
    const tmp = `${manifestFile}.tmp`;
    fsx.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fsx.renameSync(tmp, manifestFile);
  }

  function modFile(id) {
    if (!GOOD_ID.test(String(id || ''))) throw new Error('Invalid mod id.');
    return path.join(dir, `${id}.capri-mod`);
  }

  function historyDir(id) {
    return path.join(dir, '.history', id);
  }

  function saveVersion(id, bytes) {
    const folder = historyDir(id);
    fsx.mkdirSync(folder, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.capri-mod`;
    fsx.writeFileSync(path.join(folder, name), bytes, { flag: 'wx', mode: 0o600 });
    const old = fsx.readdirSync(folder)
      .filter((file) => /^\d{13}-[a-f0-9]{8}\.capri-mod$/.test(file))
      .sort((a, b) => b.localeCompare(a));
    for (const stale of old.slice(MAX_HISTORY_VERSIONS)) fsx.unlinkSync(path.join(folder, stale));
    return name;
  }

  function syncProjectSource(id, bytes) {
    if (!projectModsDir) return;
    const source = readManifest()[id]?.source;
    const expected = path.resolve(projectModsDir, `${id}.capri-mod`);
    if (typeof source !== 'string' || path.resolve(source) !== expected || !fsx.existsSync(expected)) return;
    fsx.writeFileSync(expected, bytes, { mode: 0o600 });
  }

  function history(id) {
    const folder = historyDir(String(id || ''));
    if (!GOOD_ID.test(String(id || '')) || !fsx.existsSync(folder)) return [];
    return fsx.readdirSync(folder)
      .filter((file) => /^\d{13}-[a-f0-9]{8}\.capri-mod$/.test(file))
      .sort((a, b) => b.localeCompare(a))
      .flatMap((file) => {
        try {
          const mod = validateMod(parseModJson(fsx.readFileSync(path.join(folder, file), 'utf8')), platform);
          return [{ id: file, savedAt: Number(file.slice(0, 13)), version: mod.version || '', name: mod.name }];
        } catch { return []; }
      });
  }

  function inspect(file) {
    const stat = fsx.statSync(file);
    if (!stat.isFile() || stat.size > MAX_MOD_SIZE) throw new Error(`The mod is too large or is not a file. The limit is ${MAX_MOD_SIZE} bytes.`);
    const raw = parseModJson(fsx.readFileSync(file, 'utf8'));
    return validateMod(raw, platform);
  }

  function list() {
    const manifest = readManifest();
    if (!fsx.existsSync(dir)) return [];
    const mods = [];
    for (const name of fsx.readdirSync(dir).filter((item) => item.endsWith('.capri-mod'))) {
      const file = path.join(dir, name);
      try {
        const mod = inspect(file);
        if (name !== `${mod.id}.capri-mod`) {
          mods.push({
            id: path.basename(name, '.capri-mod'),
            name,
            fileName: name,
            enabled: false,
            problem: `Rename this file to ${mod.id}.capri-mod to manage it.`,
          });
          continue;
        }
        const state = manifest[mod.id] || {};
        mods.push({
          id: mod.id,
          fileName: name,
          kind: mod.kind,
          name: mod.name,
          version: mod.version || '',
          author: mod.author || '',
          description: mod.description || '',
          platforms: mod.platforms || ['win32', 'darwin', 'linux'],
          permissions: mod.permissions || (mod.kind === 'appearance' ? ['appearance'] : []),
          source: state.source || 'local',
          enabled: state.enabled === true,
          hash: sha256(file),
          music: mod.music,
          trackCount: mod.music?.tracks?.length || 0,
          palette: mod.palette,
          appearance: mod.appearance,
        });
      } catch (error) {
        mods.push({
          id: path.basename(name, '.capri-mod'),
          name: path.basename(name),
          fileName: name,
          enabled: false,
          problem: error.message,
        });
      }
    }
    return mods.sort((a, b) => a.name.localeCompare(b.name));
  }

  function duplicateIdentity(mod) {
    const installed = list().filter((item) => !item.problem);
    const usedIds = new Set(installed.map((item) => item.id));
    for (let number = 2; number < 10000; number++) {
      const suffix = `-${number}`;
      const id = `${mod.id.slice(0, 48 - suffix.length)}${suffix}`;
      const nameSuffix = ` (${number})`;
      const name = `${mod.name.slice(0, 80 - nameSuffix.length).trimEnd()}${nameSuffix}`;
      if (!usedIds.has(id) && !fsx.existsSync(path.join(dir, `${id}.capri-mod`))
        && !installed.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        return { id, name };
      }
    }
    throw new Error('No unique name is available for this duplicate mod.');
  }

  function findDuplicateMod(incoming) {
    const existing = list().find((item) => !item.problem
      && item.name.trim().toLocaleLowerCase() === incoming.name.trim().toLocaleLowerCase()
      && item.version === (incoming.version || ''));
    if (!existing) return null;
    const copy = duplicateIdentity(incoming);
    return {
      id: existing.id,
      name: existing.name,
      version: existing.version,
      copyId: copy.id,
      copyName: copy.name,
    };
  }

  function findDuplicate(file) {
    return findDuplicateMod(inspect(file));
  }

  function importMod(file, { allowDuplicate = false } = {}) {
    const sourceMod = inspect(file);
    if (sourceMod.kind === 'music') {
      for (const track of sourceMod.music.tracks) if (track.src.startsWith('./')) resolveMusicPath(track.src);
    }
    const mod = clone(sourceMod);
    const duplicate = findDuplicateMod(sourceMod);
    if (duplicate) {
      if (!allowDuplicate) {
        const error = new Error('A mod with the same name and version is already installed.');
        error.code = 'MOD_DUPLICATE';
        error.duplicate = duplicate;
        throw error;
      }
      mod.id = duplicate.copyId;
      mod.name = duplicate.copyName;
    }
    validateMod(mod, platform);
    const relativeSource = mod.appearance?.src;
    if (relativeSource?.startsWith('./')) {
      mod.appearance.data = resolveRelativeAccessory(file, relativeSource, fsx);
      delete mod.appearance.src;
    }
    fsx.mkdirSync(dir, { recursive: true });
    const destination = path.join(dir, `${mod.id}.capri-mod`);
    const packaged = duplicate || relativeSource?.startsWith('./')
      ? Buffer.from(JSON.stringify(mod, null, 2))
      : null;
    if (path.resolve(file) === path.resolve(destination)) {
      if (packaged && !fsx.readFileSync(destination).equals(packaged)) {
        const before = fsx.readFileSync(destination);
        fsx.copyFileSync(destination, `${destination}.backup-${Date.now()}`);
        saveVersion(mod.id, before);
        fsx.writeFileSync(destination, packaged);
      }
      const manifest = readManifest();
      manifest[mod.id] = {
        enabled: manifest[mod.id]?.enabled === true,
        source: path.resolve(file),
        installedAt: manifest[mod.id]?.installedAt || Date.now(),
        hash: sha256(destination),
      };
      writeManifest(manifest);
      return list().find((item) => item.id === mod.id);
    }
    if (fsx.existsSync(destination)) {
      const before = fsx.readFileSync(destination);
      const next = packaged || fsx.readFileSync(file);
      if (!before.equals(next)) {
        fsx.copyFileSync(destination, `${destination}.backup-${Date.now()}`);
        saveVersion(mod.id, before);
      }
    }
    if (packaged) fsx.writeFileSync(destination, packaged);
    else fsx.copyFileSync(file, destination);
    const manifest = readManifest();
    manifest[mod.id] = {
      enabled: manifest[mod.id]?.enabled === true,
      source: path.resolve(file),
      installedAt: Date.now(),
      hash: sha256(destination),
    };
    writeManifest(manifest);
    return list().find((item) => item.id === mod.id);
  }

  function createModeFile(raw) {
    const mod = validateMod(raw, platform);
    const destinationDir = projectModsDir || dir;
    fsx.mkdirSync(destinationDir, { recursive: true });
    const file = path.join(destinationDir, `${mod.id}.capri-mod`);
    fsx.writeFileSync(file, JSON.stringify(mod, null, 2), { flag: 'wx', mode: 0o600 });
    try {
      if (path.resolve(file) !== path.resolve(modFile(mod.id))) importMod(file);
      const enabled = setEnabled(mod.id, true);
      return { ...enabled, createdFile: file };
    } catch (error) {
      if (destinationDir !== dir) {
        try { fsx.unlinkSync(file); } catch {}
      }
      throw error;
    }
  }

  function ensureModeNameAvailable(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length > 80) throw new Error('Mode names must contain 1-80 characters.');
    const key = cleanName.toLocaleLowerCase();
    const inInstalled = list().some((item) => !item.problem && item.name.trim().toLocaleLowerCase() === key);
    let inProject = false;
    if (projectModsDir && fsx.existsSync(projectModsDir)) {
      for (const fileName of fsx.readdirSync(projectModsDir).filter((name) => name.endsWith('.capri-mod'))) {
        try {
          if (inspect(path.join(projectModsDir, fileName)).name.trim().toLocaleLowerCase() === key) {
            inProject = true;
            break;
          }
        } catch {}
      }
    }
    if (inInstalled || inProject) {
      const error = new Error('A mode with this name already exists.');
      error.code = 'MOD_NAME_TAKEN';
      throw error;
    }
    return cleanName;
  }

  function newModeIdentity(name, prefix) {
    const safeName = String(name || '').trim().slice(0, 80);
    if (!safeName) throw new Error('Enter a name for the new mode.');
    const slug = safeName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 30) || 'mode';
    return { id: `${prefix}-${slug}-${crypto.randomBytes(3).toString('hex')}`.slice(0, 48), name: safeName };
  }

  function createPaletteMode(name, colors = {}) {
    const uniqueName = ensureModeNameAvailable(name);
    const identity = newModeIdentity(uniqueName, 'palette');
    const primary = HEX.test(String(colors?.primary || '')) ? colors.primary : '#ff2152';
    const secondary = HEX.test(String(colors?.secondary || '')) ? colors.secondary : '#7b3dff';
    return createModeFile({
      format: FORMAT, ...identity, version: '1.0', kind: 'palette',
      description: 'A Capri colour palette.',
      palette: {
        ...hsvFromHex(primary), mix: 0.6, rim: [0.48, 0.24, 1],
        fx: { red: primary, violet: secondary },
      },
    });
  }

  function createAccessoryMode(imagePath, name, layout = {}) {
    const real = fsx.realpathSync(String(imagePath || ''));
    if (path.extname(real).toLowerCase() !== '.png') throw new Error('Choose a PNG image for the accessory.');
    const bytes = fsx.readFileSync(real);
    validatePng(bytes);
    const cleanName = ensureModeNameAvailable(name || path.basename(real, path.extname(real)));
    const identity = newModeIdentity(cleanName, 'accessory');
    const safeLayout = {};
    for (const key of ['x', 'y', 'width', 'height']) {
      if (layout && Object.hasOwn(layout, key) && Number.isFinite(layout[key])) safeLayout[key] = layout[key];
    }
    return createModeFile({
      format: FORMAT, ...identity, version: '1.0', kind: 'appearance', permissions: ['appearance'],
      description: 'A Capri accessory.',
      appearance: { type: 'accessory', data: `data:image/png;base64,${bytes.toString('base64')}`, x: 118, y: 20, width: 120, height: 70, anchor: 'center', ...safeLayout },
    });
  }

  function createAccessoryUrlMode(imageUrl, name, layout = {}) {
    validateImageSource(imageUrl);
    const cleanName = ensureModeNameAvailable(name);
    const identity = newModeIdentity(cleanName, 'accessory');
    const safeLayout = {};
    for (const key of ['x', 'y', 'width', 'height']) {
      if (layout && Object.hasOwn(layout, key) && Number.isFinite(layout[key])) safeLayout[key] = layout[key];
    }
    return createModeFile({
      format: FORMAT, ...identity, version: '1.0', kind: 'appearance', permissions: ['appearance'],
      description: 'A Capri accessory loaded from an HTTPS image URL.',
      appearance: { type: 'accessory', src: imageUrl, x: 118, y: 20, width: 120, height: 70, anchor: 'center', ...safeLayout },
    });
  }

  function createMusicUrlMode(name, title, source, artist = '') {
    const cleanName = ensureModeNameAvailable(name);
    const trackTitle = String(title || '').trim();
    if (!trackTitle || trackTitle.length > 160) throw new Error('Track titles must contain 1-160 characters.');
    const identity = newModeIdentity(cleanName, 'music');
    const track = {
      id: 'online-track',
      title: trackTitle,
      src: String(source || '').trim(),
    };
    const cleanArtist = String(artist || '').trim();
    if (cleanArtist) track.artist = cleanArtist.slice(0, 160);
    const mod = validateMod({
      format: FORMAT, ...identity, version: '1.0', kind: 'music',
      description: 'A music mode with an online track.',
      music: { tracks: [track] },
    }, platform);
    return createModeFile(mod);
  }

  function setEnabled(id, enabled) {
    if (!GOOD_ID.test(String(id || ''))) throw new Error('Invalid mod id.');
    const manifest = readManifest();
    const file = path.join(dir, `${id}.capri-mod`);
    if (!fsx.existsSync(file)) throw new Error('The mod is not installed.');
    inspect(file);
    if (enabled) {
      const target = inspect(file);
      for (const other of Object.keys(manifest)) {
        if (other === id) continue;
        const otherFile = path.join(dir, `${other}.capri-mod`);
        if (fsx.existsSync(otherFile)) {
          try {
            if (inspect(otherFile).kind === target.kind) manifest[other] = { ...manifest[other], enabled: false };
          } catch {}
        }
      }
    }
    manifest[id] = { ...manifest[id], enabled: enabled === true };
    writeManifest(manifest);
    return list().find((item) => item.id === id);
  }

  function importMusicFolder(folderPath, modeName = '') {
    const selected = fsx.realpathSync(String(folderPath || ''));
    const homeReal = fsx.realpathSync(audioRoot);
    const insideHome = path.relative(homeReal, selected);
    if (insideHome === '..' || insideHome.startsWith(`..${path.sep}`) || path.isAbsolute(insideHome)) {
      throw new Error('Choose a music folder inside your home folder so Capri can save portable relative paths.');
    }
    if (!fsx.statSync(selected).isDirectory()) throw new Error('Choose a folder containing music files.');
    const found = [];
    let tooMany = false;
    const walk = (folder, depth = 0) => {
      if (depth > 4 || tooMany) return;
      for (const item of fsx.readdirSync(folder, { withFileTypes: true })) {
        if (item.name.startsWith('.')) continue;
        const absolute = path.join(folder, item.name);
        if (item.isDirectory()) walk(absolute, depth + 1);
        else if (item.isFile() && AUDIO_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
          if (found.length >= MAX_MUSIC_TRACKS) { tooMany = true; return; }
          const real = fsx.realpathSync(absolute);
          const rel = path.relative(homeReal, real);
          if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) continue;
          found.push({ real, relative: rel.split(path.sep).join('/') });
          if (found.length >= MAX_MUSIC_TRACKS) break;
        }
      }
    };
    walk(selected);
    if (tooMany) throw new Error(`A music mode can contain at most ${MAX_MUSIC_TRACKS} tracks; choose a smaller folder.`);
    if (!found.length) throw new Error('No supported audio files were found in that folder.');
    const baseName = path.basename(selected).slice(0, 50) || 'Music';
    const slug = baseName.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 28) || 'library';
    const id = `music-${slug}-${crypto.randomBytes(3).toString('hex')}`;
    const seenTitles = new Map();
    const tracks = found.map(({ relative }) => {
      const filename = path.basename(relative, path.extname(relative));
      const count = (seenTitles.get(filename.toLowerCase()) || 0) + 1;
      seenTitles.set(filename.toLowerCase(), count);
      const title = count === 1 ? filename.slice(0, 150) : `${filename.slice(0, 145)} (${count})`;
      const trackId = `track-${crypto.createHash('sha1').update(relative).digest('hex').slice(0, 12)}`;
      return { id: trackId, title, src: `./${relative}` };
    });
    const name = modeName ? ensureModeNameAvailable(modeName) : `Music — ${baseName}`;
    const mod = validateMod({ format: FORMAT, id, name, version: '1.0', kind: 'music', music: { tracks } }, platform);
    for (const track of tracks) resolveMusicPath(track.src);
    const created = createModeFile(mod);
    const manifest = readManifest();
    manifest[id] = { ...manifest[id], enabled: true, source: selected };
    writeManifest(manifest);
    return list().find((item) => item.id === id) || created;
  }

  function update(id, changes) {
    const file = modFile(id);
    if (!fsx.existsSync(file)) throw new Error('The mod is not installed.');
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Mod changes must be an object.');
    const allowed = new Set(['name', 'version', 'description', 'palette', 'appearance']);
    if (Object.keys(changes).some((key) => !allowed.has(key))) throw new Error('The update contains a field that cannot be changed.');
    const current = inspect(file);
    const next = {
      ...current,
      ...changes,
      ...(changes.palette ? { palette: { ...(current.palette || {}), ...changes.palette } } : {}),
      ...(changes.appearance ? { appearance: { ...(current.appearance || {}), ...changes.appearance } } : {}),
    };
    const safe = validateMod(next, platform);
    const oldBytes = fsx.readFileSync(file);
    const nextBytes = Buffer.from(JSON.stringify(safe, null, 2));
    if (!oldBytes.equals(nextBytes)) {
      saveVersion(id, oldBytes);
      fsx.writeFileSync(file, nextBytes, { mode: 0o600 });
      syncProjectSource(id, nextBytes);
      const manifest = readManifest();
      manifest[id] = { ...manifest[id], hash: sha256(file), modifiedAt: Date.now() };
      writeManifest(manifest);
    }
    return list().find((item) => item.id === id);
  }

  function restore(id, versionId) {
    const file = modFile(id);
    const name = String(versionId || '');
    if (!/^\d{13}-[a-f0-9]{8}\.capri-mod$/.test(name)) throw new Error('Invalid saved version.');
    const source = path.join(historyDir(id), name);
    if (!fsx.existsSync(file) || !fsx.existsSync(source)) throw new Error('The selected saved version is unavailable.');
    const previous = fsx.readFileSync(file);
    const restored = validateMod(JSON.parse(fsx.readFileSync(source, 'utf8')), platform);
    if (restored.id !== id) throw new Error('The saved version does not match this mod.');
    const bytes = Buffer.from(JSON.stringify(restored, null, 2));
    saveVersion(id, previous);
    fsx.writeFileSync(file, bytes, { mode: 0o600 });
    syncProjectSource(id, bytes);
    const manifest = readManifest();
    manifest[id] = { ...manifest[id], hash: sha256(file), modifiedAt: Date.now() };
    writeManifest(manifest);
    return list().find((item) => item.id === id);
  }

  function active() {
    const palette = list().find((item) => item.enabled && item.kind === 'palette' && !item.problem);
    const appearance = list().find((item) => item.enabled && item.kind === 'appearance' && !item.problem);
    if (!palette && !appearance) return null;
    return {
      id: palette?.id || appearance?.id || '',
      paletteId: palette?.id || '',
      appearanceId: appearance?.id || '',
      palette: palette?.palette || null,
      appearance: appearance?.appearance || null,
    };
  }

  function musicLibrary() {
    const catalog = [];
    for (const mod of list().filter((item) => item.enabled && item.kind === 'music' && !item.problem)) {
      for (const track of mod.music?.tracks || []) {
        const id = `${mod.id}__${track.id}`;
        if (track.src.startsWith('./')) {
          try { resolveMusicPath(track.src); } catch { continue; }
        }
        catalog.push({
          id,
          title: track.title,
          artist: track.artist || '',
          album: track.album || '',
          artwork: track.artwork || null,
          src: track.src.startsWith('./') ? `capri://music/${id}` : track.src,
          mode: mod.name,
        });
      }
    }
    return catalog;
  }

  function musicSourceForId(rawId) {
    const id = String(rawId || '');
    if (!/^[a-z0-9-]{1,48}__[a-z0-9-]{1,48}$/.test(id)) return null;
    const [modId, trackId] = id.split('__');
    const mod = list().find((item) => item.id === modId && item.enabled && item.kind === 'music' && !item.problem);
    const track = mod?.music?.tracks?.find((item) => item.id === trackId);
    if (!track?.src.startsWith('./')) return null;
    try { return resolveMusicPath(track.src); } catch { return null; }
  }

  function uninstall(id) {
    const value = String(id || '');
    const fileName = GOOD_ID.test(value) ? `${value}.capri-mod` : SAFE_MOD_FILENAME.test(value) ? value : '';
    if (!fileName) throw new Error('Invalid mod id.');
    const file = path.join(dir, fileName);
    const manifestIds = new Set([path.basename(fileName, '.capri-mod')]);
    if (fsx.existsSync(file)) {
      // Keep invalid or misnamed files removable even when their embedded ID cannot be read.
      try { manifestIds.add(inspect(file).id); } catch {}
    }
    const manifest = readManifest();
    if (!fsx.existsSync(file) && ![...manifestIds].some((manifestId) => Object.hasOwn(manifest, manifestId))) {
      return { ok: true, removed: false };
    }
    if (fsx.existsSync(file)) fsx.unlinkSync(file);
    for (const manifestId of manifestIds) delete manifest[manifestId];
    writeManifest(manifest);
    return { ok: true, removed: true };
  }

  return { dir, list, findDuplicate, import: importMod, importMusicFolder, createPaletteMode, createAccessoryMode, createAccessoryUrlMode, createMusicUrlMode, setEnabled, update, history, restore, active, musicLibrary, musicSourceForId, uninstall, validate: validateMod };
}

module.exports = { FORMAT, createDataMods, validateMod, parseModJson };

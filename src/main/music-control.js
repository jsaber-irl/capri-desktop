'use strict';

// Central selection and dispatch for system media sessions. Adapters expose only sessions that
// the operating system reports; browser tabs are never inspected through private page APIs.
const path = require('node:path');
const cp = require('node:child_process');

const ACTIONS = new Set(['status', 'current', 'play', 'pause', 'toggle', 'next', 'previous', 'volume', 'volup', 'voldown']);
const SCRIPT = path.join(__dirname, 'media-control.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

function execFileAsync(execFile, file, args, options = {}) {
  return new Promise((resolve, reject) => execFile(file, args, { timeout: 6000, maxBuffer: 1024 * 1024, ...options }, (err, stdout, stderr) => {
    if (err) { err.stderr = String(stderr || ''); reject(err); }
    else resolve(String(stdout || '').trim());
  }));
}

function serviceName(value) {
  const s = String(value || '').toLowerCase();
  if (/spotify/.test(s)) return 'spotify';
  if (/deezer/.test(s)) return 'deezer';
  return 'unknown';
}

function normalizeSession(raw, adapter) {
  const service = raw.service || serviceName(`${raw.id || ''} ${raw.app || ''} ${raw.url || ''}`);
  const app = String(raw.app || raw.id || adapter);
  return {
    id: String(raw.id || ''), adapter, service,
    app, mode: raw.mode || (/browser|chrome|chromium|firefox|msedge|edge|brave|vivaldi|opera/i.test(app) ? 'web' : 'native'),
    title: String(raw.title || ''), artist: String(raw.artist || ''), album: String(raw.album || ''),
    playing: raw.playing === true || /^playing$/i.test(String(raw.status || '')), status: raw.playing === true || /^playing$/i.test(String(raw.status || '')) ? 'playing' : 'paused',
    volume: Number.isFinite(raw.volume) ? raw.volume : null,
    canVolume: raw.canVolume === true,
  };
}

function createMusicController({ platform = process.platform, adapters = createPlatformAdapters(platform), now = Date.now } = {}) {
  const lastPlaying = new Map();
  let lastStatus = [];

  async function list() {
    const results = await Promise.all(adapters.map(async (adapter) => {
      try { return (await adapter.list()).map((row) => normalizeSession(row, adapter.name)); }
      catch (error) { return { adapter: adapter.name, error: error.message }; }
    }));
    const sessions = results.flat().filter((s) => s && s.id && !s.error);
    for (const session of sessions) if (session.playing) lastPlaying.set(`${session.adapter}:${session.id}`, now());
    lastStatus = sessions;
    return { ok: true, platform, sessions: sessions.map((s) => ({ ...s })), errors: results.flat().filter((s) => s?.error) };
  }

  async function command({ action = 'status', service = null, volume = null } = {}) {
    action = String(action).toLowerCase();
    service = service ? serviceName(service) : null;
    if (!ACTIONS.has(action)) return { ok: false, status: 'unsupported', error: `Action musicale inconnue : ${action}` };
    if (action === 'volume' && (!Number.isFinite(Number(volume)) || Number(volume) < 0 || Number(volume) > 100)) {
      return { ok: false, status: 'invalid_value', error: 'Le volume doit être compris entre 0 et 100.' };
    }

    const snapshot = await list();
    let candidates = snapshot.sessions;
    if (service) candidates = candidates.filter((s) => s.service === service);
    if (!candidates.length) {
      const unclassifiedWeb = service ? snapshot.sessions.filter((s) => s.mode === 'web' && s.service === 'unknown') : [];
      if (unclassifiedWeb.length) return { ok: false, status: 'service_unknown', service, sessions: unclassifiedWeb,
        error: `Le lecteur du navigateur est actif, mais le système ne révèle pas si l’onglet lit ${service === 'spotify' ? 'Spotify' : 'Deezer'}. Capri ne peut pas le cibler sûrement.` };
      const reason = snapshot.errors.length ? 'unavailable' : 'not_found';
      return { ok: false, status: reason, service, sessions: [], errors: snapshot.errors,
        error: reason === 'unavailable' ? snapshot.errors.map((e) => e.error).join('; ') : `Aucun lecteur${service ? ` ${service}` : ''} compatible n’est actif.` };
    }

    let target;
    const playing = candidates.filter((s) => s.playing);
    if (playing.length === 1) target = playing[0];
    else if (playing.length > 1) return { ok: false, status: 'ambiguous', sessions: playing };
    else {
      candidates.sort((a, b) => (lastPlaying.get(`${b.adapter}:${b.id}`) || 0) - (lastPlaying.get(`${a.adapter}:${a.id}`) || 0));
      if (candidates.length > 1 && (lastPlaying.get(`${candidates[0].adapter}:${candidates[0].id}`) || 0) === (lastPlaying.get(`${candidates[1].adapter}:${candidates[1].id}`) || 0)) {
        return { ok: false, status: 'ambiguous', sessions: candidates };
      }
      target = candidates[0];
    }
    if (action === 'status' || action === 'current') return { ok: true, status: target.status, session: target };
    if (action === 'toggle') action = target.playing ? 'pause' : 'play';
    if (['volume', 'volup', 'voldown'].includes(action) && !target.canVolume) return { ok: false, status: 'unsupported', session: target, error: `Le réglage du volume n’est pas disponible via ${target.app}.` };
    const adapter = adapters.find((item) => item.name === target.adapter);
    try {
      const result = await adapter.control(target, action, action === 'volume' ? Number(volume) : undefined);
      if (result?.ok === false) return { ...result, session: target };
      if (action === 'play') target.playing = true;
      if (action === 'pause') target.playing = false;
      return { ok: true, status: action === 'play' ? 'playing' : action === 'pause' ? 'paused' : 'controlled', action, session: target };
    } catch (error) {
      const permission = /(-1743|not authorized|not permitted|permission|access denied)/i.test(`${error.message} ${error.stderr || ''}`);
      return { ok: false, status: permission ? 'permission_required' : 'error', session: target, error: permission ? 'macOS doit autoriser Capri à contrôler Spotify dans Réglages Système > Confidentialité et sécurité > Automatisation.' : error.message };
    }
  }

  return { list, command, getLastStatus: () => lastStatus.map((s) => ({ ...s })) };
}

function createPlatformAdapters(platform, { execFile = cp.execFile } = {}) {
  if (platform === 'win32') {
    const invoke = async (action, target = '', volume = '') => {
      const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-Action', action];
      if (target) args.push('-Target', target);
      if (volume !== '') args.push('-Value', String(volume));
      const output = await execFileAsync(execFile, 'powershell.exe', args, { windowsHide: true });
      const result = JSON.parse(output || '{}');
      if (!result.ok) throw new Error(result.error || 'Le contrôle multimédia Windows a échoué.');
      return result;
    };
    return [{ name: 'windows-media', list: async () => (await invoke('list')).sessions || [], control: (s, a, v) => invoke(a, s.id, v) }];
  }

  if (platform === 'darwin') {
    const spotify = {
      name: 'spotify-macos',
      async list() {
        try { await execFileAsync(execFile, 'pgrep', ['-x', 'Spotify']); }
        catch (error) {
          if (error.code === 1) return [];
          throw new Error(`Impossible de vérifier si Spotify est ouvert : ${error.message}`);
        }
        const script = 'tell application "Spotify" to (player state as text) & "¦" & (name of current track) & "¦" & (artist of current track) & "¦" & (album of current track) & "¦" & (sound volume as text)';
        const [state, title, artist, album, volume] = (await execFileAsync(execFile, 'osascript', ['-e', script])).split('¦');
        return /^(playing|paused)$/i.test(state) ? [{ id: 'spotify-native', service: 'spotify', app: 'Spotify', mode: 'native', status: state, title, artist, album, volume: Number(volume), canVolume: true }] : [];
      },
      async control(_session, action, value) {
        const verbs = { play: 'play', pause: 'pause', next: 'next track', previous: 'previous track', volume: `set sound volume to ${Math.round(value)}` };
        if (action === 'toggle') action = 'playpause';
        if (action === 'volup' || action === 'voldown') {
          const current = await spotify.list();
          const amount = action === 'volup' ? 5 : -5;
          action = 'volume';
          value = Math.max(0, Math.min(100, Number(current[0]?.volume || 0) + amount));
        }
        const verb = action === 'playpause' ? 'playpause' : verbs[action];
        if (!verb) throw new Error(`Action indisponible : ${action}`);
        await execFileAsync(execFile, 'osascript', ['-e', `tell application "Spotify" to ${verb}`]);
        return { ok: true };
      },
    };
    return [spotify];
  }

  if (platform === 'linux') {
    const call = async (args) => execFileAsync(execFile, 'playerctl', args);
    return [{
      name: 'mpris',
      async list() {
        let names;
        try { names = (await call(['--list-all'])).split(/\r?\n/).filter(Boolean); }
        catch (error) { if (error.code === 'ENOENT') throw new Error('playerctl est requis pour lire les sessions multimédias MPRIS sous Linux.'); throw error; }
        const rows = await Promise.all(names.map(async (id) => {
          const raw = await call([`--player=${id}`, 'metadata', '--format', '{{status}}|{{xesam:title}}|{{xesam:artist}}|{{xesam:album}}|{{xesam:url}}|{{volume}}']).catch(() => '');
          const [status, title, artist, album, url, volume] = raw.split('|');
          const service = serviceName(`${id} ${url}`);
          const volumeValue = volume?.trim() ? Number(volume) : null;
          return { id, app: id.split('.')[0], service, mode: /browser|chrome|chromium|firefox|edge/i.test(id) ? 'web' : 'native', status, title, artist, album, url, volume: Number.isFinite(volumeValue) ? Math.round(volumeValue * 100) : null, canVolume: Number.isFinite(volumeValue) };
        }));
        return rows.filter((row) => row.title && /^(playing|paused)$/i.test(row.status || ''));
      },
      async control(session, action, value) {
        const command = { play: 'play', pause: 'pause', next: 'next', previous: 'previous', volume: 'volume', volup: 'volume', voldown: 'volume' }[action];
        if (!command) throw new Error(`Action indisponible : ${action}`);
        const relative = action === 'volup' ? '0.05+' : action === 'voldown' ? '0.05-' : null;
        await call([`--player=${session.id}`, command, ...(action === 'volume' ? [`${Number(value) / 100}`] : relative ? [relative] : [])]);
        return { ok: true };
      },
    }];
  }
  return [];
}

module.exports = { ACTIONS, createMusicController, createPlatformAdapters, normalizeSession, serviceName };

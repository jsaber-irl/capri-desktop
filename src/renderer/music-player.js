(function initializeCapriMusicPlayer() {
'use strict';

// A frameless player can be initialized again by Electron during a reload. Keep
// its lexical state scoped and install listeners only once for this document.
if (window.__capriMusicPlayerInitialized) return;
window.__capriMusicPlayerInitialized = true;

const bundledLibrary = Array.isArray(window.CapriMusicLibrary) ? window.CapriMusicLibrary : [];
let library = [];
let songs = [];
let availableSongs = [];
const host = window.host;
const devLog = (...args) => { if (host?.isDev) console.log(...args); };
const track = document.getElementById('track');
const localTrackGroup = document.getElementById('local-tracks');
const modeTrackGroup = document.getElementById('mode-tracks');
const detectedTrackGroup = document.getElementById('detected-tracks');
const service = document.getElementById('service');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const art = document.querySelector('.player__art');
const progress = document.getElementById('progress');
const current = document.getElementById('current');
const duration = document.getElementById('duration');
const playbackState = document.getElementById('playback-state');
const mediaTabs = document.getElementById('media-tabs');
const audio = document.getElementById('library-audio');
audio.referrerPolicy = 'no-referrer';
let index = 0;
let playing = false;
let localPlayback = false;
let localTrackActive = false;
let activeSession = null;
let progressTimer = 0;
let playbackRequest = 0;
const DEFAULT_ART = '../../assets/capri/capri-face.png';

function installLibrary(items) {
  const validSource = (src) => typeof src === 'string' && (
    /^capri:\/\/app\/assets\/songs\/[^/]+\.mp3$/iu.test(src)
    || /^capri:\/\/music\/[a-z0-9-]{1,48}__[a-z0-9-]{1,48}$/iu.test(src)
    || /^https:\/\//iu.test(src)
  );
  const safeItems = Array.isArray(items) ? items.filter((song) => song
    && typeof song.id === 'string' && typeof song.title === 'string'
    && validSource(song.src)) : [];
  if (!safeItems.length) return false;
  const previousSelection = track.value;
  const currentSource = audio.currentSrc || audio.src;
  if (currentSource && library.some((song) => song.src === currentSource)
    && !safeItems.some((song) => song.src === currentSource)) {
    playbackRequest += 1;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    playing = false;
    localPlayback = false;
    localTrackActive = false;
  }
  library = safeItems;
  songs = library.map((song) => `local:${song.id}`);
  availableSongs = [...songs, ...[...(detectedTrackGroup?.options || [])].map((option) => option.value)];
  localTrackGroup?.replaceChildren();
  modeTrackGroup?.replaceChildren();
  for (const song of library) {
    const option = document.createElement('option');
    option.value = `local:${song.id}`;
    option.textContent = song.title;
    if (song.mode) {
      option.label = `${song.title} — ${song.mode}`;
      modeTrackGroup?.append(option);
    } else localTrackGroup?.append(option);
  }
  if (availableSongs.includes(previousSelection)) {
    track.value = previousSelection;
    index = availableSongs.indexOf(previousSelection);
  } else {
    index = 0;
    track.value = songs[0] || '';
  }
  devLog(`[music-player] catalogue local chargé (${songs.length} titres)`);
  return true;
}
installLibrary(bundledLibrary);

async function initializeLibrary() {
  devLog('[music-player] initialisation du catalogue', { bundled: bundledLibrary.length, hostAvailable: Boolean(host), groupAvailable: Boolean(localTrackGroup) });
  const catalogResult = await host?.musicPlayerLibrary?.();
  devLog('[music-player] résultat du catalogue Main', { ok: catalogResult?.ok, count: catalogResult?.tracks?.length, error: catalogResult?.error });
  if (catalogResult?.ok) installLibrary(catalogResult.tracks);
  const result = await host?.musicPlayerReady?.({ ok: library.length > 0, error: 'La bibliothèque des morceaux intégrés est indisponible.' });
  devLog('[music-player] accusé prêt', { count: library.length, ok: result?.ok });
  if (!library.length || !result?.ok) {
    artist.textContent = 'La bibliothèque des morceaux intégrés est indisponible.';
    devLog('[music-player] catalogue local indisponible');
  }
}

function addTrack(song) {
  const value = `session:${song}`;
  if (availableSongs.includes(value)) return;
  availableSongs.push(value);
  const option = document.createElement('option');
  option.value = value;
  option.textContent = song;
  detectedTrackGroup.append(option);
}
async function detectSessions() {
  const result = await host.musicPlayerSessions?.();
  if (!result?.ok) { if (!isLocalPlayback()) renderSession(null); return; }
  const detected = (result.sessions || [])
    .filter((session) => session.title)
    .map((session) => session.playlist ? `${session.title} — ${session.playlist}` : session.title);
  for (const song of detected) if (![...track.options].some((option) => option.value === `session:${song}`)) addTrack(song);
  renderTabs(result.sessions || []);
  if (isLocalPlayback()) return;
  const active = result.sessions?.find((session) => session.playing) || result.sessions?.[0];
  if (!active) { renderSession(null); return; }
  const detectedTitle = active.playlist ? `${active.title} — ${active.playlist}` : active.title;
  const detectedValue = `session:${detectedTitle}`;
  const detectedIndex = availableSongs.indexOf(detectedValue);
  if (detectedIndex >= 0) index = detectedIndex;
  track.value = detectedValue;
  title.textContent = active.title;
  artist.textContent = [active.artist, active.album, active.playlist].filter(Boolean).join(' · ') || active.service;
  service.value = ['deezer', 'spotify', 'youtube'].includes(active.service) ? active.service : 'auto';
  playing = active.playing;
  activeSession = active;
  renderSession(active);
}

function selected() {
  return availableSongs[index];
}
function localForValue(value) {
  if (!String(value || '').startsWith('local:')) return null;
  return library.find((song) => `local:${song.id}` === value) || null;
}
function selectedTitle() {
  const local = localForValue(selected());
  return local?.title || String(selected() || '').replace(/^session:/, '');
}
function hasBundledAudioSource() {
  const source = audio.currentSrc || audio.src;
  return Boolean(source && library.some((song) => song.src === source));
}
function isLocalPlayback() {
  return localPlayback || hasBundledAudioSource();
}
function render() {
  const toggle = document.getElementById('toggle');
  const launchStop = document.getElementById('play-selected');
  toggle.hidden = false;
  toggle.textContent = playing ? 'Ⅱ' : '▶';
  toggle.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
  launchStop.textContent = localTrackActive ? 'ARRÊTER' : 'LANCER';
  launchStop.setAttribute('aria-label', localTrackActive ? 'Arrêter le morceau intégré' : 'Lancer le morceau sélectionné');
}
function time(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '--:--';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function renderSession(session) {
  if (isLocalPlayback() && session) return;
  activeSession = session || null;
  if (!session) {
    playing = false;
    if (!isLocalPlayback()) localTrackActive = false;
    title.textContent = 'Aucune session média active';
    artist.textContent = 'Les métadonnées indisponibles restent vides.';
    art.src = DEFAULT_ART;
    progress.max = '100';
    progress.value = '0';
    current.textContent = '--:--';
    duration.textContent = '--:--';
    playbackState.textContent = 'ARRÊTÉ';
    render();
    return;
  }
  const total = session.duration == null ? null : Number(session.duration);
  const position = session.position == null ? null : Number(session.position);
  title.textContent = session.title || 'Titre indisponible';
  artist.textContent = [session.artist, session.album, session.playlist].filter(Boolean).join(' · ') || 'Informations de l’artiste indisponibles';
  progress.max = Number.isFinite(total) && total > 0 ? String(total) : '100';
  progress.value = Number.isFinite(position) && total > 0 ? String(Math.min(total, position)) : '0';
  current.textContent = time(position);
  duration.textContent = time(total);
  art.src = session.artwork || DEFAULT_ART;
  playing = session.status === 'playing' || session.playing === true;
  playbackState.textContent = playing ? 'LECTURE' : (session.status === 'paused' ? 'PAUSE' : 'ARRÊTÉ');
  if (['spotify', 'deezer', 'youtube'].includes(session.service)) service.value = session.service;
  render();
}
function renderTabs(sessions) {
  mediaTabs.replaceChildren();
  const tabs = sessions.filter((session) => session.browser && session.title);
  if (!tabs.length) {
    mediaTabs.append(Object.assign(document.createElement('p'), { className: 'player__empty', textContent: 'Aucun onglet média exposé par le système.' }));
    return;
  }
  for (const session of tabs) {
    const row = document.createElement('div');
    row.className = 'player__tab';
    const label = document.createElement('strong');
    label.textContent = `${session.service !== 'unknown' ? session.service.toUpperCase() : session.app}: ${session.title}`;
    const navigate = document.createElement('button');
    navigate.type = 'button';
    navigate.textContent = 'Naviguer';
    navigate.disabled = !session.canNavigate;
    navigate.addEventListener('click', async () => {
      const result = await host.musicPlayerTab({ action: 'navigate', session });
      if (!result?.ok) console.warn(result?.error || 'Navigation refusée');
    });
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Fermer';
    close.disabled = !session.canClose;
    close.title = session.canClose ? 'Fermer après confirmation' : 'Le système ne permet pas de fermer cet onglet';
    close.addEventListener('click', async () => {
      const result = await host.musicPlayerTab({ action: 'close', session });
      if (!result?.ok) console.warn(result?.error || 'Fermeture refusée');
      await detectSessions();
    });
    row.append(label, navigate, close);
    mediaTabs.append(row);
  }
}
function startProgressPolling() {
  clearInterval(progressTimer);
  progressTimer = setInterval(async () => {
    const result = await host.musicPlayerSessions?.();
    if (!result?.ok) { if (!isLocalPlayback()) renderSession(null); return; }
    renderTabs(result.sessions || []);
    if (isLocalPlayback()) return;
    const currentSession = result?.sessions?.find((session) => activeSession && session.id === activeSession.id) || result?.sessions?.find((session) => session.playing);
    if (currentSession) {
      renderSession(currentSession);
    } else {
      renderSession(null);
    }
  }, 2000);
}
async function openSelected() {
  const local = localForValue(selected());
  if (local) {
    const request = ++playbackRequest;
    const pauseExternal = !isLocalPlayback() && activeSession?.playing && typeof host.musicPlayerMedia === 'function';
    localPlayback = true;
    localTrackActive = true;
    activeSession = null;
    audio.src = local.src;
    audio.load();
    title.textContent = local.title;
    artist.textContent = [local.artist, local.album].filter(Boolean).join(' · ') || 'Artiste et album indisponibles dans les fichiers audio';
    art.src = local.artwork || DEFAULT_ART;
    playbackState.textContent = 'CHARGEMENT';
    current.textContent = '--:--';
    duration.textContent = '--:--';
    try {
      // Start synchronously in the current user-activation task. A chat request
      // arrives through an Electron userGesture dispatch, which is lost by awaiting
      // an unrelated IPC before calling HTMLMediaElement.play().
      const playback = audio.play();
      if (pauseExternal) await host.musicPlayerMedia('pause').catch(() => {});
      await playback;
      if (request !== playbackRequest) return false;
      devLog('[music-player] lecture locale démarrée', { title: local.title, currentSrc: audio.currentSrc });
      playing = true;
      playbackState.textContent = 'LECTURE';
      render();
      return true;
    } catch (error) {
      if (request !== playbackRequest) return false;
      devLog('[music-player] échec de lecture locale', { title: local.title, src: audio.src, name: error?.name, error: error?.message });
      playing = false;
      localTrackActive = false;
      playbackState.textContent = 'PRÊT';
      artist.textContent = `Lecture impossible : ${error.message}`;
      render();
      return false;
    }
    return;
  }
  playbackRequest += 1;
  localPlayback = false;
  localTrackActive = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  const result = await host.musicPlayerPlay({ title: selectedTitle(), service: service.value });
  if (result?.ok) {
    title.textContent = selectedTitle();
    artist.textContent = `Recherche ouverte sur ${String(result.service || service.value).toUpperCase()} · lance le morceau dans le navigateur ou l’application.`;
  }
  else artist.textContent = result?.error || 'La recherche musicale n’a pas pu être ouverte.';
  return Boolean(result?.ok);
}
track.addEventListener('change', () => { index = availableSongs.indexOf(track.value); render(); openSelected(); });
document.getElementById('play-selected').addEventListener('click', () => {
  index = availableSongs.indexOf(track.value);
  if (index < 0) return;
  if (isLocalPlayback() && localTrackActive) {
    playbackRequest += 1;
    audio.pause();
    audio.currentTime = 0;
    playing = false;
    localTrackActive = false;
    progress.value = '0';
    current.textContent = '0:00';
    playbackState.textContent = 'ARRÊTÉ';
    render();
    return;
  }
  void openSelected();
});
window.addEventListener('capri:music-local-play', async (event) => {
  const { id, requestId } = event.detail || {};
  const local = library.find((song) => song.id === id);
  devLog('[music-player] demande locale reçue', { id, requestId, found: Boolean(local), source: local?.src });
  if (!local) {
    await host.musicPlayerLocalResult?.({ id, requestId, ok: false, error: 'Morceau Capri introuvable.' });
    return;
  }
  track.value = `local:${local.id}`;
  index = songs.indexOf(track.value);
  const ok = await openSelected();
  await host.musicPlayerLocalResult?.({ id, requestId, ok, error: ok ? '' : 'Le navigateur n’a pas pu démarrer la lecture audio.' });
});
service.addEventListener('change', render);
document.getElementById('toggle').addEventListener('click', async () => {
  if (isLocalPlayback()) {
    localPlayback = true;
    if (audio.paused) await audio.play().catch((error) => { artist.textContent = `Lecture impossible : ${error.message}`; });
    else audio.pause();
    return;
  }
  const selectedLocal = localForValue(track.value);
  if (selectedLocal) {
    index = songs.indexOf(`local:${selectedLocal.id}`);
    void openSelected();
    return;
  }
  const result = await host.musicPlayerMedia(playing ? 'pause' : 'play');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut exécuter cette commande.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('previous').addEventListener('click', async () => {
  if (isLocalPlayback()) { localPlayback = true; index = (index - 1 + songs.length) % songs.length; track.value = songs[index]; openSelected(); return; }
  const result = await host.musicPlayerMedia('previous');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut passer au titre précédent.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('next').addEventListener('click', async () => {
  if (isLocalPlayback()) { localPlayback = true; index = (index + 1) % songs.length; track.value = songs[index]; openSelected(); return; }
  const result = await host.musicPlayerMedia('next');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut passer au titre suivant.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('heart').addEventListener('click', (event) => { event.currentTarget.classList.toggle('is-liked'); });
audio.addEventListener('loadedmetadata', () => {
  if (!isLocalPlayback()) return;
  const total = Number.isFinite(audio.duration) ? audio.duration : null;
  progress.max = total > 0 ? String(total) : '100';
  duration.textContent = time(total);
  current.textContent = time(audio.currentTime);
});
audio.addEventListener('timeupdate', () => {
  if (!isLocalPlayback()) return;
  progress.value = String(audio.currentTime || 0);
  current.textContent = time(audio.currentTime);
});
audio.addEventListener('play', () => { if (isLocalPlayback()) { localPlayback = true; playing = true; localTrackActive = true; playbackState.textContent = 'LECTURE'; render(); } });
audio.addEventListener('pause', () => {
  if (!isLocalPlayback()) return;
  playing = false;
  playbackState.textContent = audio.ended ? 'TERMINÉ' : (localTrackActive ? 'PAUSE' : 'ARRÊTÉ');
  render();
});
audio.addEventListener('ended', () => {
  if (!isLocalPlayback()) return;
  index = (index + 1) % songs.length;
  track.value = songs[index];
  openSelected();
});
audio.addEventListener('error', () => {
  if (!isLocalPlayback()) return;
  playing = false;
  localTrackActive = false;
  playbackState.textContent = 'ERREUR';
  const mediaError = audio.error;
  artist.textContent = mediaError
    ? `Fichier audio illisible (code ${mediaError.code}).`
    : 'Le fichier audio n’a pas pu être lu.';
  render();
});
progress.addEventListener('input', () => {
  if (!isLocalPlayback() || !Number.isFinite(audio.duration)) return;
  current.textContent = time(Number(progress.value));
});
progress.addEventListener('change', () => {
  if (isLocalPlayback() && Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value);
});
let closeRequested = false;
async function closePlayer(event) {
  devLog('[music-player:close] renderer: événement reçu', event.type, {
    target: event.target?.id || event.target?.className || event.target?.tagName,
    defaultPrevented: event.defaultPrevented,
  });
  event.preventDefault();
  event.stopPropagation();
  if (closeRequested) {
    devLog('[music-player:close] renderer: demande déjà en cours');
    return;
  }
  closeRequested = true;
  try {
    devLog('[music-player:close] renderer: appel host.musicPlayerClose');
    const result = await host.musicPlayerClose();
    devLog('[music-player:close] renderer: résultat', result);
    if (!result?.ok) {
      closeRequested = false;
      console.error('Unable to close music player:', result?.error || 'IPC request failed');
    }
  } catch (error) {
    closeRequested = false;
    console.error('[music-player:close] renderer: exception', error);
  }
}
const closeButton = document.getElementById('close');
// Pointerdown remains reliable if Electron suppresses click on a frameless drag-region edge.
// Keep click for keyboard activation; closeRequested prevents the pointer click firing twice.
closeButton.addEventListener('click', closePlayer);
render();
host.onMusicLibraryChanged?.(() => initializeLibrary().catch((error) => devLog('[music-player] actualisation catalogue échouée', error)));
initializeLibrary().catch((error) => {
  devLog('[music-player] initialisation de la bibliothèque échouée', error);
  host.musicPlayerReady?.({ ok: false, error: 'La bibliothèque des morceaux intégrés n’a pas pu être chargée.' });
});
detectSessions().catch((error) => console.error('Unable to detect music sessions:', error));
startProgressPolling();
})();

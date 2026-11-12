'use strict';

const library = window.CapriMusicLibrary || [];
const songs = library.map((song) => song.title);
const host = window.host;
const devLog = (...args) => { if (host?.isDev) console.log(...args); };
const track = document.getElementById('track');
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
let index = 0;
let playing = false;
let localPlayback = false;
let activeSession = null;
let progressTimer = 0;
const availableSongs = [...songs];
const DEFAULT_ART = '../../assets/capri/capri-face.png';

function addTrack(song) {
  if (availableSongs.includes(song)) return;
  availableSongs.push(song);
  const option = document.createElement('option');
  option.value = song;
  option.textContent = song;
  track.append(option);
}
for (const song of songs) {
  const option = document.createElement('option');
  option.value = song;
  option.textContent = song;
  track.append(option);
}

async function detectSessions() {
  const result = await host.musicPlayerSessions?.();
  if (!result?.ok) { if (!localPlayback) renderSession(null); return; }
  const detected = (result.sessions || [])
    .filter((session) => session.title)
    .map((session) => session.playlist ? `${session.title} — ${session.playlist}` : session.title);
  for (const song of detected) if (![...track.options].some((option) => option.value === song)) addTrack(song);
  renderTabs(result.sessions || []);
  if (localPlayback) return;
  const active = result.sessions?.find((session) => session.playing) || result.sessions?.[0];
  if (!active) { renderSession(null); return; }
  const detectedTitle = active.playlist ? `${active.title} — ${active.playlist}` : active.title;
  const detectedIndex = availableSongs.indexOf(detectedTitle);
  if (detectedIndex >= 0) index = detectedIndex;
  track.value = detectedTitle;
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
function render() {
  document.getElementById('toggle').textContent = playing ? 'Ⅱ' : '▶';
}
function time(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '--:--';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function renderSession(session) {
  if (localPlayback && session) return;
  activeSession = session || null;
  if (!session) {
    playing = false;
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
    if (!result?.ok) { if (!localPlayback) renderSession(null); return; }
    renderTabs(result.sessions || []);
    if (localPlayback) return;
    const currentSession = result?.sessions?.find((session) => activeSession && session.id === activeSession.id) || result?.sessions?.find((session) => session.playing);
    if (currentSession) {
      renderSession(currentSession);
    } else {
      renderSession(null);
    }
  }, 2000);
}
async function openSelected() {
  const local = library.find((song) => song.title === selected());
  if (local) {
    if (!localPlayback && activeSession?.playing && typeof host.musicPlayerMedia === 'function') {
      await host.musicPlayerMedia('pause').catch(() => {});
    }
    localPlayback = true;
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
      await audio.play();
      playing = true;
      playbackState.textContent = 'LECTURE';
      render();
    } catch (error) {
      playing = false;
      playbackState.textContent = 'PRÊT';
      artist.textContent = `Lecture impossible : ${error.message}`;
      render();
    }
    return;
  }
  localPlayback = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  const result = await host.musicPlayerPlay({ title: selected(), service: service.value });
  if (result?.ok) {
    title.textContent = selected();
    artist.textContent = `Recherche ouverte sur ${String(result.service || service.value).toUpperCase()} · lance le morceau dans le navigateur ou l’application.`;
  }
  else artist.textContent = result?.error || 'La recherche musicale n’a pas pu être ouverte.';
}
track.addEventListener('change', () => { index = availableSongs.indexOf(track.value); render(); openSelected(); });
service.addEventListener('change', render);
document.getElementById('toggle').addEventListener('click', async () => {
  if (localPlayback) {
    if (audio.paused) await audio.play().catch((error) => { artist.textContent = `Lecture impossible : ${error.message}`; });
    else audio.pause();
    return;
  }
  const result = await host.musicPlayerMedia(playing ? 'pause' : 'play');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut exécuter cette commande.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('previous').addEventListener('click', async () => {
  if (localPlayback) { index = (index - 1 + songs.length) % songs.length; track.value = songs[index]; openSelected(); return; }
  const result = await host.musicPlayerMedia('previous');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut passer au titre précédent.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('next').addEventListener('click', async () => {
  if (localPlayback) { index = (index + 1) % songs.length; track.value = songs[index]; openSelected(); return; }
  const result = await host.musicPlayerMedia('next');
  if (!result?.ok) artist.textContent = result?.error || 'Aucun lecteur actif ne peut passer au titre suivant.';
  setTimeout(() => detectSessions().catch(() => {}), 350);
});
document.getElementById('heart').addEventListener('click', (event) => { event.currentTarget.classList.toggle('is-liked'); });
audio.addEventListener('loadedmetadata', () => {
  if (!localPlayback) return;
  const total = Number.isFinite(audio.duration) ? audio.duration : null;
  progress.max = total > 0 ? String(total) : '100';
  duration.textContent = time(total);
  current.textContent = time(audio.currentTime);
});
audio.addEventListener('timeupdate', () => {
  if (!localPlayback) return;
  progress.value = String(audio.currentTime || 0);
  current.textContent = time(audio.currentTime);
});
audio.addEventListener('play', () => { if (localPlayback) { playing = true; playbackState.textContent = 'LECTURE'; render(); } });
audio.addEventListener('pause', () => { if (localPlayback) { playing = false; playbackState.textContent = audio.ended ? 'TERMINÉ' : 'PAUSE'; render(); } });
audio.addEventListener('ended', () => {
  if (!localPlayback) return;
  index = (index + 1) % songs.length;
  track.value = songs[index];
  openSelected();
});
progress.addEventListener('input', () => {
  if (!localPlayback || !Number.isFinite(audio.duration)) return;
  current.textContent = time(Number(progress.value));
});
progress.addEventListener('change', () => {
  if (localPlayback && Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value);
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
detectSessions().catch((error) => console.error('Unable to detect music sessions:', error));
startProgressPolling();

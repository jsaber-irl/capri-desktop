'use strict';

const songs = [
  'I really want to stay at your house',
  'Who’s ready for tomorrow',
  'This fffire',
  'In love with myself',
  'High Forever',
];
const host = window.host;
const track = document.getElementById('track');
const service = document.getElementById('service');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const art = document.querySelector('.player__art');
const progress = document.getElementById('progress');
const current = document.getElementById('current');
const duration = document.getElementById('duration');
const mediaTabs = document.getElementById('media-tabs');
let index = 0;
let playing = false;
let activeSession = null;
let progressTimer = 0;
const availableSongs = [...songs];

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
  if (!result?.ok) return;
  const detected = (result.sessions || [])
    .filter((session) => session.title)
    .map((session) => session.playlist ? `${session.title} — ${session.playlist}` : session.title);
  for (const song of detected) if (![...track.options].some((option) => option.value === song)) addTrack(song);
  const active = result.sessions?.find((session) => session.playing) || result.sessions?.[0];
  renderTabs(result.sessions || []);
  if (!active) return;
  const detectedTitle = active.playlist ? `${active.title} — ${active.playlist}` : active.title;
  const detectedIndex = availableSongs.indexOf(detectedTitle);
  if (detectedIndex >= 0) index = detectedIndex;
  track.value = detectedTitle;
  title.textContent = active.title;
  artist.textContent = [active.artist, active.album, active.playlist].filter(Boolean).join(' · ') || active.service;
  service.value = active.service === 'deezer' || active.service === 'spotify' ? active.service : 'auto';
  playing = active.playing;
  activeSession = active;
  renderSession(active);
}

function selected() {
  return availableSongs[index];
}
function render() {
  title.textContent = selected();
  artist.textContent = service.value === 'youtube' ? 'YouTube' : service.value === 'spotify' ? 'Spotify' : service.value === 'deezer' ? 'Deezer' : 'AUTO · YouTube si aucun service actif';
  document.getElementById('toggle').textContent = playing ? 'Ⅱ' : '▶';
}
function time(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function renderSession(session) {
  activeSession = session || null;
  const total = Number(session?.duration);
  const position = Number(session?.position);
  progress.max = Number.isFinite(total) && total > 0 ? String(total) : '100';
  progress.value = Number.isFinite(position) && total > 0 ? String(Math.min(total, position)) : '0';
  current.textContent = time(position);
  duration.textContent = time(total);
  if (session?.artwork) art.src = session.artwork;
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
    const currentSession = result?.sessions?.find((session) => activeSession && session.id === activeSession.id) || result?.sessions?.find((session) => session.playing);
    if (currentSession) {
      renderSession(currentSession);
      playing = currentSession.playing;
      render();
      renderTabs(result.sessions || []);
    }
  }, 1000);
}
async function openSelected() {
  const result = await host.musicPlayerPlay({ title: selected(), service: service.value });
  playing = Boolean(result?.ok);
  render();
}
track.addEventListener('change', () => { index = availableSongs.indexOf(track.value); render(); openSelected(); });
service.addEventListener('change', render);
document.getElementById('toggle').addEventListener('click', async () => {
  const result = await host.musicPlayerMedia(playing ? 'pause' : 'play');
  if (result?.ok) playing = !playing;
  else await openSelected();
  render();
});
document.getElementById('previous').addEventListener('click', async () => {
  index = (index + availableSongs.length - 1) % availableSongs.length;
  track.value = selected();
  await openSelected();
});
document.getElementById('next').addEventListener('click', async () => {
  index = (index + 1) % availableSongs.length;
  track.value = selected();
  await openSelected();
});
document.getElementById('heart').addEventListener('click', (event) => { event.currentTarget.classList.toggle('is-liked'); });
document.getElementById('close').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  host.musicPlayerClose();
});
render();
detectSessions().catch((error) => console.error('Unable to detect music sessions:', error));
startProgressPolling();

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
let index = 0;
let playing = false;
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
  const active = result.sessions?.find((session) => session.playing);
  if (!active) return;
  const detectedTitle = active.playlist ? `${active.title} — ${active.playlist}` : active.title;
  const detectedIndex = availableSongs.indexOf(detectedTitle);
  if (detectedIndex >= 0) index = detectedIndex;
  track.value = detectedTitle;
  title.textContent = active.title;
  artist.textContent = [active.artist, active.album, active.playlist].filter(Boolean).join(' · ') || active.service;
  service.value = active.service === 'deezer' || active.service === 'spotify' ? active.service : 'auto';
  playing = true;
}

function selected() {
  return availableSongs[index];
}
function render() {
  title.textContent = selected();
  artist.textContent = service.value === 'youtube' ? 'YouTube' : service.value === 'spotify' ? 'Spotify' : service.value === 'deezer' ? 'Deezer' : 'AUTO · YouTube si aucun service actif';
  document.getElementById('toggle').textContent = playing ? 'Ⅱ' : '▶';
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

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

for (const song of songs) {
  const option = document.createElement('option');
  option.value = song;
  option.textContent = song;
  track.append(option);
}

function selected() {
  return songs[index];
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
track.addEventListener('change', () => { index = songs.indexOf(track.value); render(); openSelected(); });
service.addEventListener('change', render);
document.getElementById('toggle').addEventListener('click', async () => {
  const result = await host.musicPlayerMedia(playing ? 'pause' : 'play');
  if (result?.ok) playing = !playing;
  else await openSelected();
  render();
});
document.getElementById('previous').addEventListener('click', async () => {
  index = (index + songs.length - 1) % songs.length;
  track.value = selected();
  await openSelected();
});
document.getElementById('next').addEventListener('click', async () => {
  index = (index + 1) % songs.length;
  track.value = selected();
  await openSelected();
});
document.getElementById('heart').addEventListener('click', (event) => { event.currentTarget.classList.toggle('is-liked'); });
document.getElementById('close').addEventListener('click', () => host.musicPlayerClose());
render();

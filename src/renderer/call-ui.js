'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const card = $('call-card');
  const status = $('status');
  const detail = $('detail');
  const ringtone = $('ringtone');
  const incoming = $('incoming-buttons');
  const active = $('active-buttons');
  const soundButton = $('enable-sound');
  let finished = false;
  let accepting = false;

  const stopRingtone = () => {
    ringtone.pause();
    ringtone.currentTime = 0;
    ringtone.removeAttribute('src');
    ringtone.load();
  };
  const close = async () => {
    if (finished) return;
    finished = true;
    stopRingtone();
    window.close();
  };
  const ring = () => ringtone.play().then(() => { soundButton.hidden = true; }).catch(() => { soundButton.hidden = false; });

  $('portrait').addEventListener('error', () => $('portrait').parentElement.classList.add('failed'));
  $('accept').addEventListener('click', async () => {
    if (accepting || finished) return;
    accepting = true;
    stopRingtone();
    status.textContent = 'Connexion…';
    incoming.hidden = true;
    active.hidden = false;
    card.dataset.state = 'connecting';
    try {
      if (!(await window.host.callAccept())) await close();
    } catch (error) {
      status.textContent = 'Impossible de démarrer l’appel.';
      detail.hidden = false;
      detail.textContent = String(error.message || error);
      active.hidden = false;
    }
  });
  $('decline').addEventListener('click', async () => { stopRingtone(); await window.host.callRefuse().catch(() => {}); await close(); });
  $('hangup').addEventListener('click', async () => { stopRingtone(); await window.host.callEnd().catch(() => {}); await close(); });
  soundButton.addEventListener('click', ring);
  window.host.onCallUiState(({ state, message }) => {
    card.dataset.state = state;
    if (state === 'listening') status.textContent = 'À l’écoute';
    else if (state === 'processing') status.textContent = 'Transcription en cours';
    else if (state === 'speaking') status.textContent = 'Capri parle';
    else if (state === 'connecting') status.textContent = 'Connexion…';
    else if (state === 'error') status.textContent = 'Erreur pendant l’appel';
    detail.hidden = !message;
    detail.textContent = message || '';
    if (state === 'error') active.hidden = false;
  });
  window.addEventListener('beforeunload', () => {
    stopRingtone();
    if (!finished) window.host.callRefuse().catch(() => {});
  });
  ring();
})();

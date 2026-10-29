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
  const conversation = $('conversation');
  const transcript = $('transcript');
  let finished = false;
  let accepting = false;
  let lang = 'fr';
  let userName = '';
  let currentState = 'incoming';
  const liveMessages = new Map();
  const TEXT = {
    fr: { incoming: 'Appel entrant…', connecting: 'Connexion au microphone…', listening: 'À l’écoute', processing: 'Traitement de votre demande…', speaking: 'Capri parle', error: 'Erreur pendant l’appel', accept: 'Accepter', refuse: 'Refuser', hangup: 'Raccrocher', you: 'Vous', enableSound: 'Activer la sonnerie' },
    en: { incoming: 'Incoming call…', connecting: 'Connecting microphone…', listening: 'Listening', processing: 'Processing your request…', speaking: 'Capri is speaking', error: 'Call error', accept: 'Accept', refuse: 'Decline', hangup: 'Hang up', you: 'You', enableSound: 'Enable ringtone' },
    ru: { incoming: 'Входящий вызов…', connecting: 'Подключение микрофона…', listening: 'Слушаю', processing: 'Обрабатываю запрос…', speaking: 'Capri говорит', error: 'Ошибка вызова', accept: 'Принять', refuse: 'Отклонить', hangup: 'Завершить', you: 'Вы', enableSound: 'Включить звонок' },
  };
  const text = (key) => (TEXT[lang] || TEXT.fr)[key];

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
  const applyState = (state, message = '') => {
    currentState = state;
    card.dataset.state = state;
    const labels = { incoming: text('incoming'), connecting: text('connecting'), listening: text('listening'), processing: text('processing'), speaking: text('speaking'), error: text('error') };
    status.textContent = labels[state] || labels.incoming;
    detail.hidden = !message;
    detail.textContent = message || '';
    if (state !== 'incoming') conversation.hidden = false;
    if (state === 'error') active.hidden = false;
  };
  const addTranscript = ({ speaker, text: line, final = true } = {}) => {
    if (!['capri', 'user'].includes(speaker) || !String(line || '').trim()) return;
    let item = !final ? liveMessages.get(speaker) : liveMessages.get(speaker);
    if (!item) {
      item = document.createElement('li');
      item.className = `message message--${speaker}`;
      const name = document.createElement('span');
      name.className = 'message__name';
      name.textContent = speaker === 'capri' ? 'Capri' : (userName || text('you'));
      const marker = document.createElement('span');
      marker.className = 'message__marker';
      marker.setAttribute('aria-hidden', 'true');
      const body = document.createElement('span');
      body.className = 'message__text';
      item.append(name, marker, body);
      transcript.append(item);
    }
    item.dataset.final = String(final);
    item.querySelector('.message__text').textContent = String(line).trim();
    if (final) liveMessages.delete(speaker);
    else liveMessages.set(speaker, item);
    transcript.scrollTop = transcript.scrollHeight;
  };

  const applyConfig = (config) => {
    lang = ['fr', 'en', 'ru'].includes(config.lang) ? config.lang : 'fr';
    const configuredName = typeof config.userName === 'string' ? config.userName.trim() : '';
    userName = configuredName && !/^(?:null|undefined|unknown|user|utilisateur|your name)$/i.test(configuredName) ? configuredName.slice(0, 24) : '';
    $('accept').setAttribute('aria-label', text('accept'));
    $('decline').setAttribute('aria-label', text('refuse'));
    $('hangup').setAttribute('aria-label', text('hangup'));
    const buttonLabels = $('incoming-buttons').querySelectorAll('small span');
    if (buttonLabels[0]) buttonLabels[0].textContent = text('refuse');
    if (buttonLabels[1]) buttonLabels[1].textContent = text('accept');
    const hangupLabel = $('active-buttons').querySelector('small span');
    if (hangupLabel) hangupLabel.textContent = text('hangup');
    soundButton.textContent = text('enableSound');
    applyState(currentState);
  };
  window.host.getConfig().then(applyConfig).catch(() => {});
  window.host.onConfig?.(applyConfig);

  $('portrait').addEventListener('error', () => $('portrait').parentElement.classList.add('failed'));
  $('accept').addEventListener('click', async () => {
    if (accepting || finished) return;
    accepting = true;
    stopRingtone();
    applyState('connecting');
    incoming.hidden = true;
    active.hidden = false;
    card.dataset.state = 'connecting';
    try {
      if (!(await window.host.callAccept())) await close();
    } catch (error) {
      applyState('error', error.message || '');
      detail.hidden = false;
      detail.textContent = String(error.message || error);
      active.hidden = false;
    }
  });
  $('decline').addEventListener('click', async () => { stopRingtone(); await window.host.callRefuse().catch(() => {}); await close(); });
  $('hangup').addEventListener('click', async () => { stopRingtone(); await window.host.callEnd().catch(() => {}); await close(); });
  soundButton.addEventListener('click', ring);
  window.host.onCallUiState(({ state, message }) => applyState(state, message));
  window.host.onCallTranscript(addTranscript);
  window.addEventListener('beforeunload', () => {
    stopRingtone();
    if (!finished) window.host.callRefuse().catch(() => {});
  });
  ring();
})();

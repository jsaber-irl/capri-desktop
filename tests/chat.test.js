'use strict';

// The parts of her chat (src/renderer/js/chat.js) that read what you and her model write: what you ask
// for plainly (the music keys), how her answer is cleaned for the bubble, and her chat opening once.
//   node --test tests/chat.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', file)).href);

test('her answer is cleaned of markdown, and of nothing else', async () => {
  const { clean } = await load('chat.js');
  assert.equal(clean('**Привет**, *чумба*! Это `код` и _акцент_.'), 'Привет, чумба! Это код и акцент.');
  assert.equal(clean('# Заголовок\n* пункт\n- не трогаем'), 'Заголовок\nпункт\n- не трогаем');
  // what is only text stays text
  assert.equal(clean('Пиши на C# и F#, my_var_name, 2*3 и 2 * 3 * 4, snake_case'), 'Пиши на C# и F#, my_var_name, 2*3 и 2 * 3 * 4, snake_case');
  // her tags and her thoughts never show; half a bold while the answer comes in doesn't either
  assert.equal(clean('[[mood: smug]] Ну привет. [[open: Spotify]]'), 'Ну привет.');
  assert.equal(clean('<think>хм</think>Ладно'), 'Ладно');
  assert.equal(clean('Это **жирн'), 'Это жирн');
  assert.equal(clean('[[mood: ha'), '');
});

test('"next", "pause" and "go on" in talk are not the music keys; asking for the music is', async () => {
  const { Chat } = await load('chat.js');
  const ask = (text, playing = false) => Chat.prototype.asked.call({
    hands: null,
    askedToClose: () => null,
    mediaAsked: Chat.prototype.mediaAsked,
    life: { media: { playing } },
  }, text);
  // said in talk
  assert.equal(ask('продолжай'), null, '"go on" is not the play key');
  assert.equal(ask('давай следующий вопрос про код'), null);
  assert.equal(ask('what is next for me'), null, 'nothing playing: just talk');
  // said to her about the music
  assert.deepEqual(ask('следующий'), { kind: 'media', action: 'next' });
  assert.deepEqual(ask('пауза'), { kind: 'media', action: 'pause' });
  assert.deepEqual(ask('what is next for me', true), { kind: 'media', action: 'next' }, 'with music playing, in a few words');
  assert.deepEqual(ask('включи следующую песню'), { kind: 'media', action: 'next' });
  assert.deepEqual(ask('продолжи музыку'), { kind: 'media', action: 'play' });
  // the volume doesn't need the music
  assert.deepEqual(ask('сделай громче'), { kind: 'media', action: 'volup' });
});

test('plain French app-opening commands from text or voice enter the shared app resolver path', async () => {
  const { Chat } = await load('chat.js');
  const ask = (text) => Chat.prototype.asked.call({
    hands: null,
    askedToClose: () => null,
    mediaAsked: Chat.prototype.mediaAsked,
    life: { media: { playing: false } },
  }, text);
  for (const phrase of ["Ouvre l'application météo", 'Lance l’application météo', 'Démarre Weather', 'Ouvre Weather']) {
    assert.deepEqual(ask(phrase), { kind: 'open', text: phrase });
  }

  let voiceRequest;
  const voiceChat = Object.create(Chat.prototype);
  Object.assign(voiceChat, { later: '', turn: 0, send: (text) => { voiceRequest = ask(text); } });
  voiceChat.say('Ouvre l’application météo'); // the voice recognizer forwards its transcript through say()
  assert.deepEqual(voiceRequest, { kind: 'open', text: 'Ouvre l’application météo' });
});

test('natural TextEdit document requests preserve the quoted text for the verified document action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre TextEdit, crée un nouveau fichier et écris "Hello World!"'), { kind: 'createText', filename: 'Note.txt', content: 'Hello World!', openIn: 'TextEdit' });
  assert.deepEqual(chat.asked('Crée un fichier nommé test.txt et écris "Hello World!" dedans.'), { kind: 'createText', filename: 'test.txt', content: 'Hello World!', openIn: '' });
});

test('chess requests from French and English chat are routed to the shared game action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Capri, jouons aux échecs.'), { kind: 'chess' });
  assert.deepEqual(chat.asked('Let’s play chess.'), { kind: 'chess' });
});

test('latest YouTube video requests open a date-sorted search instead of choosing an arbitrary video', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre la dernière vidéo de Mister Beast sur YouTube depuis Safari.'), { kind: 'videoSearch', creator: 'MrBeast', browser: 'Safari' });
  assert.deepEqual(chat.asked('Ouvre YouTube.'), { kind: 'open', text: 'Ouvre YouTube.' });
});

test('French text and voice music requests identify actions, current-track requests, and explicit services', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), {
    hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } },
  });
  assert.deepEqual(chat.asked('Mets la musique en pause.'), { kind: 'media', action: 'pause' });
  assert.deepEqual(chat.asked('Reprends la musique.'), { kind: 'media', action: 'play' });
  assert.deepEqual(chat.asked('Passe au morceau suivant.'), { kind: 'media', action: 'next' });
  assert.deepEqual(chat.asked('Remets la chanson précédente.'), { kind: 'media', action: 'previous' });
  assert.deepEqual(chat.asked('Qu’est-ce que j’écoute ?'), { kind: 'media', action: 'current', service: null });
  assert.deepEqual(chat.asked('Arrête Deezer.'), { kind: 'media', action: 'pause', service: 'deezer' });
  assert.deepEqual(chat.asked('Mets Spotify en pause.'), { kind: 'media', action: 'pause', service: 'spotify' });
});

test('her chat opens once however many times it is asked', async () => {
  const { Chat } = await load('chat.js');
  let begun = 0;
  let release;
  const chat = Object.create(Chat.prototype);
  chat.begin = () => { begun += 1; return new Promise((r) => { release = r; }); };
  const a = chat.start();
  const b = chat.start();
  assert.equal(a, b, 'the same opening');
  assert.equal(begun, 1);
  release();
  await a;
  chat.start(); // once it is done, a new one is a new one
  assert.equal(begun, 2);
  release();
});

test('what you say with your voice while she is still answering is sent once she is done', async () => {
  const { Chat } = await load('chat.js');
  const sent = [];
  const chat = Object.create(Chat.prototype);
  Object.assign(chat, { later: '', open: true, turn: 0, send: (t) => sent.push(t) });
  chat.say('раз');
  assert.deepEqual(sent, ['раз'], 'she is free: said at once');
  chat.turn = 123; // she is answering
  chat.say('два');
  chat.say('три');
  assert.deepEqual(sent, ['раз'], 'not thrown at her mid-answer');
  assert.equal(chat.later, 'два три');
  chat.turn = 0;
  chat.sayLater();
  assert.equal(chat.later, '');
  await new Promise((r) => setTimeout(r, 760));
  assert.deepEqual(sent, ['раз', 'два три']);
  // her chat was shut meanwhile: nothing is said into the void
  chat.later = 'поздно';
  chat.open = false;
  chat.sayLater();
  await new Promise((r) => setTimeout(r, 760));
  assert.deepEqual(sent, ['раз', 'два три']);
});

test('the first real chat stream chunk informs the satellite wait manager immediately', async () => {
  const { Chat } = await load('chat.js');
  const events = [];
  const chat = Object.create(Chat.prototype);
  Object.assign(chat, {
    turn: 77, answer: '', panel: { stream: (text) => events.push(['stream', text]) },
    voice: { play: () => {} }, satelliteWait: { response: (id) => events.push(['response', id]) },
  });
  chat.onDelta(77, 'Voici');
  assert.deepEqual(events, [['response', 77], ['stream', 'Voici']]);
  chat.onDelta(76, 'ancienne réponse');
  assert.equal(events.length, 2, 'late chunks from a stopped turn are ignored');
});

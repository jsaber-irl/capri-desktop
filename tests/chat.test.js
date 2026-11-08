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

test('cyberpunk thinking commands are localized and simple thanks or apologies get a fast reply', async () => {
  const { quickReply, thinkingCommands } = await load('chat.js');
  assert.match(thinkingCommands('fr')[0], /^> ICE\/\//);
  assert.match(thinkingCommands('en')[1], /^> NEURAL_LINK/);
  assert.match(thinkingCommands('ru')[2], /^> GHOST_PROTOCOL/);
  assert.deepEqual(quickReply('Merci beaucoup, Capri !'), {
    kind: 'thanks',
    text: 'De rien, choom. Pour toi, même le réseau sait dire merci.',
  });
  assert.equal(quickReply('Je suis désolée.').kind, 'apology');
  assert.equal(quickReply('спасибо').kind, 'thanks');
  assert.equal(quickReply('Sorry about that').kind, 'apology');
  assert.equal(quickReply('Merci, peux-tu continuer ?'), null, 'a substantive request still goes to the model');
});

test('thinking commands type one at a time, clear, and then type the next command', async () => {
  const { Chat, thinkingCommands } = await load('chat.js');
  const previousSetInterval = globalThis.setInterval;
  const previousClearInterval = globalThis.clearInterval;
  const frames = [];
  let timer;
  globalThis.setInterval = (callback, delay) => {
    timer = { callback, delay, cleared: false };
    return timer;
  };
  globalThis.clearInterval = (id) => { if (id) id.cleared = true; };
  try {
    const chat = Object.assign(Object.create(Chat.prototype), {
      turn: 42,
      open: true,
      brain: { lang: 'fr' },
      panel: {
        thinking: (text) => frames.push(text),
        clearThinking() {},
      },
    });
    const [first, second] = thinkingCommands('fr');
    chat.startThinking(42);
    assert.equal(timer.delay, 34);
    for (let i = 0; i < first.length; i++) timer.callback();
    assert.ok(frames.at(-1).startsWith(first), 'the command appears progressively');
    for (let i = 0; i < 12; i++) timer.callback();
    assert.equal(frames.at(-1), first, 'the completed command stays visible briefly');
    timer.callback();
    assert.equal(frames.at(-1), '', 'the completed command is erased');
    timer.callback();
    assert.equal(frames.at(-1), second.slice(0, 1), 'the next command starts from its first character');
    assert.ok(frames.slice(1, first.length + 1).every((text, i) => text === first.slice(0, i + 1)));
    chat.stopThinking();
    assert.equal(timer.cleared, true);
  } finally {
    globalThis.setInterval = previousSetInterval;
    globalThis.clearInterval = previousClearInterval;
  }
});

test('simple thanks and apologies are answered without calling the chat model and are remembered', async () => {
  const { Chat } = await load('chat.js');
  const saved = [];
  const shown = [];
  let modelCalls = 0;
  const chat = Object.assign(Object.create(Chat.prototype), {
    open: true,
    turn: 0,
    history: [],
    brain: { lang: 'fr' },
    capri: { pulse() {} },
    host: {
      chatRemember: (history) => saved.push([...history]),
      chatSend: () => { modelCalls++; },
    },
    panel: {
      setChatBusy() {},
      setActions() {},
      chatTurn() {},
      stream: (text, options) => shown.push({ text, options }),
      setFace() {},
    },
    heart: {
      enabled: true,
      feel: () => ({ tags: ['thanks'], reaction: null }),
      answered() {},
    },
    bond: { observe: () => 0, replied() {}, reflect() {} },
    listApps() {},
    sayLater() {},
  });
  await chat.send('Merci !');
  assert.equal(modelCalls, 0);
  assert.equal(chat.history.at(-1).role, 'assistant');
  assert.match(chat.history.at(-1).content, /De rien/);
  assert.equal(saved.length, 1);
  assert.equal(shown[0].options.done, true);

  chat.heart.feel = () => ({ tags: ['apology'], reaction: 'forgive' });
  await chat.send('Excuse-moi.');
  assert.equal(modelCalls, 0);
  assert.equal(chat.history.at(-1).role, 'assistant');
  assert.match(chat.history.at(-1).content, /Ma colère baisse/);
  assert.equal(saved.length, 2);
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

test('native PC commands are parsed without executing power actions', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), {
    hands: null,
    askedToClose: () => null,
    mediaAsked: Chat.prototype.mediaAsked,
    life: { media: { playing: false } },
  });
  assert.deepEqual(chat.asked('Ouvre le Bluetooth'), { kind: 'pc', what: 'settings', page: 'bluetooth' });
  assert.deepEqual(chat.asked('Quel est le niveau de ma batterie ?'), { kind: 'pc', what: 'info', info: 'battery' });
  assert.deepEqual(chat.asked('Règle le volume à 30'), { kind: 'pc', what: 'volume', level: 30 });
  assert.deepEqual(chat.asked('Minuteur de 10 minutes'), { kind: 'pc', what: 'timer', ms: 600000 });
  assert.deepEqual(chat.asked('Mets Discord à gauche et Chrome à droite'), {
    kind: 'pc',
    what: 'arrange',
    places: [{ name: 'Discord', side: 'left' }, { name: 'Chrome', side: 'right' }],
  });
  assert.deepEqual(chat.asked('Éteins mon PC dans une heure'), {
    kind: 'pc',
    what: 'power',
    power: 'shutdown',
    seconds: 3600,
  });
  assert.deepEqual(chat.asked('Annule l’arrêt'), { kind: 'pc', what: 'power', power: 'cancel' });
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

test('app launch commands are not mistaken for YouTube searches', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), {
    hands: null,
    askedToClose: () => null,
    mediaAsked: Chat.prototype.mediaAsked,
    life: { media: { playing: false } },
  });
  assert.deepEqual(chat.asked('Lance Discord'), { kind: 'open', text: 'Lance Discord' });
  assert.deepEqual(chat.asked('Ouvre Discord'), { kind: 'open', text: 'Ouvre Discord' });
  assert.deepEqual(chat.asked('Ouvre discord et lance Spotify'), {
    kind: 'multi',
    parts: [{ kind: 'open', text: 'Ouvre discord' }, { kind: 'open', text: 'lance Spotify' }],
  });
  assert.deepEqual(chat.asked('Mets Bohemian Rhapsody'), { kind: 'youtube', song: 'Bohemian Rhapsody' });
  assert.deepEqual(chat.asked('Mets Bohemian Rhapsody sur YouTube'), { kind: 'youtube', song: 'Bohemian Rhapsody' });
});

test('website commands can target a named browser', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), {
    hands: null,
    askedToClose: () => null,
    mediaAsked: Chat.prototype.mediaAsked,
    life: { media: { playing: false } },
  });
  assert.deepEqual(chat.asked('Ouvre ipinfo.io sur safari'), {
    kind: 'openSite',
    address: 'https://ipinfo.io',
    browser: 'safari',
  });
});

test('French mini-player requests from chat open the integrated music player', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre le mini lecteur de musique.'), { kind: 'musicPlayer' });
  assert.deepEqual(chat.asked('Affiche le mini-lecteur.'), { kind: 'musicPlayer' });
});

test('translation requests from chat open the translator with a file or web page', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Traduis le fichier "/tmp/notes.txt".'), { kind: 'translation', source: { kind: 'file', value: '/tmp/notes.txt' } });
  assert.deepEqual(chat.asked('Translate this web page https://example.com/help.'), { kind: 'translation', source: { kind: 'url', value: 'https://example.com/help' } });
  assert.deepEqual(chat.asked('Ouvre la page de traduction.'), { kind: 'translation', source: null });
});

test('natural TextEdit document requests preserve the quoted text for the verified document action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre TextEdit, crée un nouveau fichier et écris "Hello World!"'), { kind: 'createText', filename: 'Note.txt', content: 'Hello World!', openIn: 'TextEdit' });
  assert.deepEqual(chat.asked('Crée un fichier nommé test.txt et écris "Hello World!" dedans.'), { kind: 'createText', filename: 'test.txt', content: 'Hello World!', openIn: '' });
});

test('verified automatic actions replace the model answer instead of appending to it', async () => {
  const { Chat } = await load('chat.js');
  const rendered = [];
  const spoken = [];
  const chat = Object.assign(Object.create(Chat.prototype), {
    open: true,
    turn: 0,
    brain: { t: { chat: {} } },
    panel: {
      stream: (line, options) => rendered.push({ line, options }),
      setFace: () => {},
    },
    onSpokenText: (line) => spoken.push(line),
    addLine: () => assert.fail('the unverified model answer must not be kept'),
  });
  await chat.after('[[open: Weather]] Je ne peux pas ouvrir Weather.', 'Je ne peux pas ouvrir Weather.', { kind: 'open' }, Promise.resolve({ line: 'Weather est ouvert.', face: 'laugh' }), 'Ouvre Weather');
  assert.deepEqual(rendered, [{ line: 'Weather est ouvert.', options: { done: true } }]);
  assert.deepEqual(spoken, ['Weather est ouvert.']);
});

test('chess requests from French and English chat are routed to the shared game action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Capri, jouons aux échecs.'), { kind: 'chess' });
  assert.deepEqual(chat.asked('Let’s play chess.'), { kind: 'chess' });
});

test('local file and folder requests are routed to the safe open path action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Capri, ouvre le fichier "/tmp/notes.txt".'), { kind: 'openPath', path: '/tmp/notes.txt' });
  assert.deepEqual(chat.asked('Open the folder "/tmp/projects".'), { kind: 'openPath', path: '/tmp/projects' });
  assert.deepEqual(chat.asked('Capri, ouvrir les images "C:\\Users\\Capri\\Pictures\\photo.png".'), { kind: 'openPath', path: 'C:\\Users\\Capri\\Pictures\\photo.png' });
  assert.deepEqual(chat.asked('Ouvre le document "C:\\Users\\Capri\\Documents\\rapport.pdf".'), { kind: 'openPath', path: 'C:\\Users\\Capri\\Documents\\rapport.pdf' });
});

test('latest YouTube video requests open a date-sorted search instead of choosing an arbitrary video', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre la dernière vidéo de Mister Beast sur YouTube depuis Safari.'), { kind: 'videoSearch', creator: 'MrBeast', browser: 'Safari' });
  assert.deepEqual(chat.asked('Ouvre YouTube.'), { kind: 'open', text: 'Ouvre YouTube.' });
});

test('online research requests are routed to the shared web search action', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Capri, recherche en ligne les horaires du Louvre.'), { kind: 'webSearch', query: 'les horaires du Louvre' });
  assert.deepEqual(chat.asked('Search for the latest Node.js release online.'), { kind: 'webSearch', query: 'the latest Node.js release' });
  assert.deepEqual(chat.asked('Quelles sont les informations actuelles sur le trafic à Paris ?'), { kind: 'webSearch', query: 'Quelles sont les informations actuelles sur le trafic à Paris' });
});

test('local paths take priority and preserve Finder or Explorer destinations', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } } });
  assert.deepEqual(chat.asked('Ouvre le fichier "/tmp/rapport actuel.pdf" dans Finder.'), { kind: 'openPath', path: '/tmp/rapport actuel.pdf' });
  assert.deepEqual(chat.asked('Open the folder "C:\\Users\\Capri\\My Projects" with Explorer.'), { kind: 'openPath', path: 'C:\\Users\\Capri\\My Projects' });
  assert.deepEqual(chat.asked('Ouvre le fichier test.pdf qui est sur mon bureau.'), { kind: 'openPath', path: 'test.pdf' });
});

test('current Swiss time is answered locally without opening a browser search', async () => {
  const { Chat } = await load('chat.js');
  const chat = Object.assign(Object.create(Chat.prototype), { hands: null, askedToClose: () => null, mediaAsked: Chat.prototype.mediaAsked, life: { media: { playing: false } }, brain: { lang: 'fr' } });
  assert.deepEqual(chat.asked('Quelle heure est-il actuellement en Suisse ?'), { kind: 'currentTime', zone: 'Europe/Zurich' });
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

// Talking to her: you type in her panel, and a model (setup.js picks which) answers as her, in
// writing. The replies are AI-generated, and the panel says so on every chat.
// She can do a few things on your PC when you ask (Windows): open an app or a game, play music or
// control what's playing, open a website, close an app. She spots what you want in what you wrote,
// or the model asks for it with a tag in its answer. Music right away; an app you named yourself
// right away; anything only the model asked for, a website, and closing an app behind a button.
// doNow

import { pick, fmt } from './util.js';
import { ASSISTANT_NAMES } from './lines.js';
import { askedTheme } from './themes.js';
import { lifeLines } from './lines-life.js';
import { FORGET_ME } from './bond.js';
import { parseReminder, parseCancel, clock } from './reminders.mjs';

const REMEMBER = 20; // messages she has in mind when answering
const KEEP = 60;     // messages she remembers across restarts (memory.json)
// her language, where small models need it: how she says "we" (else it's in English), and the last line
// of her prompt, in that language (they drift into the English of everything above it)
const IN_LANGUAGE = {
  en: { we: '', last: 'Write everything in English, unless the user writes to you in another language: then in theirs.' },
  ru: { we: '"мы" in Russian', last: 'Пиши всё по-русски, если только пользователь не пишет тебе на другом языке: тогда на его языке. По-английски остаются только словечки Найт-Сити, никогда не целые фразы.' },
  fr: { we: '"nous" en français', last: 'Écris tout en français, sauf si l’utilisateur t’écrit dans une autre langue : réponds alors dans sa langue. Les mots de Night City peuvent rester en anglais.' },
};
const STAY_MS = 10 * 60 * 1000; // no wandering off mid-conversation
const THINKING_STEP_MS = 34;
const THINKING_PAUSE_TICKS = 12;
const THINKING_COMMANDS = {
  fr: [
    '> ICE//SCAN --cible: message',
    '> NEURAL_LINK --synchronisation',
    '> GHOST_PROTOCOL --masquage actif',
    '> MEM_POOL --indexation rapide',
    '> TRACE_ROUTE --Night-City',
  ],
  en: [
    '> ICE//SCAN --target: message',
    '> NEURAL_LINK --sync',
    '> GHOST_PROTOCOL --stealth active',
    '> MEM_POOL --index fast',
    '> TRACE_ROUTE --Night-City',
  ],
  ru: [
    '> ICE//SCAN --цель: сообщение',
    '> NEURAL_LINK --синхронизация',
    '> GHOST_PROTOCOL --режим призрака',
    '> MEM_POOL --быстрая индексация',
    '> TRACE_ROUTE --Найт-Сити',
  ],
};
const QUICK_REPLIES = {
  fr: {
    thanks: 'De rien, choom. Pour toi, même le réseau sait dire merci.',
    apology: 'Je t’entends. Ma colère baisse… mais je boude encore un tout petit peu.',
  },
  en: {
    thanks: 'Anytime, choom. Even the Net learns to say thanks for you.',
    apology: 'I hear you. I’m cooling off… still pouting a tiny bit, though.',
  },
  ru: {
    thanks: 'Всегда пожалуйста, чумба. Ради тебя даже сеть умеет благодарить.',
    apology: 'Я тебя услышала. Уже не так злюсь… но совсем чуть-чуть ещё дуюсь.',
  },
};
const QUICK_PATTERNS = [
  { lang: 'fr', kind: 'thanks', pattern: /^(?:merci(?: beaucoup| infiniment)?|merci a toi)$/u },
  { lang: 'en', kind: 'thanks', pattern: /^(?:thank you(?: so much| very much)?|thanks?(?: a lot| so much)?|thx)$/u },
  { lang: 'ru', kind: 'thanks', pattern: /^(?:спасибо(?: большое)?|спс|благодарю)$/u },
  { lang: 'fr', kind: 'apology', pattern: /^(?:desole(?:e|es|s)?|je suis desole(?:e)?|je m excuse|excuse moi|pardon)$/u },
  { lang: 'en', kind: 'apology', pattern: /^(?:sorry(?: about that)?|i m sorry|my bad|i apologize|i apologise|forgive me)$/u },
  { lang: 'ru', kind: 'apology', pattern: /^(?:прости(?: меня)?|извини(?: меня)?|прошу прощения|виноват)$/u },
];
const APPS_FRESH = 20000;      // the list of open apps is looked up at most this often
const CLOSE_TAG = /\[\[\s*close\s*:?\s*([^\]]*)\]\]/i; // [[close: AM Music]] at the end of her answer
// "close", "shut down", "закрой"...
const CLOSE_ASK = /\b(close|shut|quit|kill|exit|ferme|quitte)\b|закр|выключ/i;
// her other tags: [[open: Spotify]], [[music: Bad Bunny]], [[media: next]], [[site: youtube.com]]
const TAG = /\[\[\s*(open|music|media|site)\s*:\s*([^\]]*)\]\]/i;
// "open", "launch", "открой"...
const OPEN_ASK = /\b(open|launch|start|run|ouvre|lance|démarre)\b|открой|запусти/i;
const OPEN_PATH_ASK = /\b(?:open|ouvre|ouvrir|lance|démarre)\b\s+(?:(?:the|le|la|l'|un|une|des|les)\s+)?(?:files?|fichiers?|folders?|dossiers?|directories|répertoires?|images?|documents?)\s+(?:called\s+|nommé(?:e)?\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:dans|with|in)\s+(?:finder|explorer|file explorer|le gestionnaire de fichiers))?\s*[.!?]*$/iu;
const OPEN_DIRECT_PATH_ASK = /\b(?:open|ouvre|ouvrir|lance|démarre)\b\s+(.+)/iu;
const MUSIC_PLAYER_ASK = /\b(?:open|launch|start|show|ouvre|ouvrir|lance|affiche)\b.*\b(?:(?:mini\s+)?(?:music|musique)\s+(?:player|lecteur)|mini[-\s]?lecteur)\b|\b(?:(?:mini\s+)?(?:music|musique)\s+(?:player|lecteur)|mini[-\s]?lecteur)\b.*\b(?:open|ouvre|lance|affiche)\b/i;
const TRANSLATION_ASK = /\b(?:translate|traduire|traduis|translation|traduction)\b.*\b(?:file|fichier|document|page|web|site|url)\b|\b(?:file|fichier|document|page|web|site|url)\b.*\b(?:translate|traduire|traduis|translation|traduction)\b/i;
const CHESS_ASK = /\b(?:play|let'?s play|chess)\b|\b(?:jouons|jouer|partie|échecs|echecs)\b|шахмат/iu;
const LATEST_VIDEO_ASK = /\b(?:latest|newest|most recent|last|derni[eè]re|r[eé]cente)\b.*\b(?:video|vid[eé]o)\b|\b(?:video|vid[eé]o)\b.*\b(?:latest|newest|most recent|last|derni[eè]re|r[eé]cente)\b/iu;
const WEB_SEARCH_ASK = /\b(?:search|look\s+up|find|recherche|rechercher|cherche|trouve)\b.*\b(?:online|on the web|sur internet|en ligne|sur le web)\b/iu;
const CURRENT_INFO_ASK = /\b(?:current|currently|actual|latest|recent|today|tonight|now|at the moment|en ce moment|actuel(?:le)?s?|actualité(?:s)?|actualités?|aujourd'hui|derni[eè]res?\s+nouvelles?|maintenant|cours actuel|prix actuel|météo|meteo)\b/iu;
const CURRENT_TIME_ASK = /\b(?:what time is it|what(?:'s| is) the time|heure est-il|quelle heure est-il|quelle heure est-il actuellement|heure actuelle)\b.*\b(?:switzerland|suisse|swiss|zurich|geneva|genève|bern|berne)\b|\b(?:switzerland|suisse|zurich|geneva|genève|bern|berne)\b.*\b(?:what time|heure|time)\b/iu;
const DOCUMENT_CREATE = /(?:create|crée|cree|créer).*?(?:new\s+)?(?:text\s+)?(?:file|document|fichier).*?(?:write|écris|ecris|écrire)\s+["“]([\s\S]*?)["”]/iu;
// what to do with the music playing, said plainly (only when it's about music, or said in a few words)
const MEDIA_ASK = [
  ['pause', /\bpause\b|stop (the )?music|arr[eê]te(?:r)?\s+(?:la\s+)?musique|пауз/i],
  ['next', /\b(next|skip)\b|следующ/i],
  ['previous', /\bprevious\b|предыдущ/i],
  ['play', /\bresume\b|reprends?\s+(?:la\s+)?musique|relance\s+(?:la\s+)?musique|продолж[а-яё]*\s+(?:музык|песн|трек)/i], // ("продолжай" alone is "go on")
  ['volup', /\blouder\b|turn (it )?up|громче/i],
  ['voldown', /\bquieter\b|turn (it )?down|baisse\s+(?:le\s+)?volume|diminue\s+(?:le\s+)?volume|тише/i],
  ['mute', /\bmute\b|выключи звук/i],
];
const MUSIC_WORD = /musi|song|track|spotify|deezer|chanson|morceau|j['’]écoute|песн|музык|трек/i;
const MUSIC_STATUS = /(?:qu['’]est-ce que j['’]écoute|quel (?:morceau|titre|artiste)|what (?:am i|is) listening to|what(?:'s| is) playing|current track|now playing)/i;
// "put X on Spotify", "включи X в Spotify"
const SPOTIFY_ASK = /(?:play|put on|put|включи|поставь)\s+(?:me\s+)?(.+?)\s+(?:on|в)\s+spotify/i;
// "mets Bohemian Rhapsody", "joue Bohemian Rhapsody", "lance Bohemian Rhapsody" (sur YouTube)
const YOUTUBE_ASK = /\b(?:mets|joue|lance|play|put on)\s+(.+?)(?:\s*(?:sur|on|dans|in)\s+youtube\b|\s*[.!?]*$)/iu;
const OPEN_APP_ASK = /\b(?:ouvre|ouvrir|lance|lancer|démarre|demarre|open|launch|start|run)\b[\s,:]*(?:le|la|l['’]|the)?\s*(?:application|app|appli)?\s*(?:discord|slack|telegram|whatsapp|spotify|deezer|chrome|firefox|safari|edge|steam|roblox|textedit|weather|météo|meteo)\b/iu;
// "trouve mon projet After Effects", "cherche un fichier pdf", "ouvre le dossier de mon projet"
const FIND_FILES_ASK = /\b(?:trouve|trouver|cherche|chercher|find|search|ouvre le dossier de|open the folder of)\b\s+(.+?)(?:\s*(?:et\s+)?(?:ouvre|open|lance|launch)\s+(?:le\s+)?dossier)?\s*[.!?]*$/iu;
// "prends une capture d'écran", "fais une capture", "screenshot"
const SCREENSHOT_ASK = /\b(?:capture|screenshot|fais une capture|photo d[ée]cran|snap)\b/iu;
// dossiers système par leur nom : "ouvre l'explorateur", "ouvre la corbeille", "ouvre mon bureau"
const OPEN_SYSTEM_FOLDER = /\b(?:ouvre|open|lance|launch)\b\s+(?:le\s+|la\s+|l'|the\s+|mon\s+|ma\s+|ton\s+|ta\s+)?(explorateur|file explorer|explorer|corbeille|recycle bin|trash|bureau|desktop|documents|t[ée]l[ée]chargements|downloads|images|photos|pictures|musique|music|vid[eé]os|videos)\b/iu;
const FOLDER_ID = {
  explorateur: 'explorer', 'file explorer': 'explorer', explorer: 'explorer',
  corbeille: 'recycle', 'recycle bin': 'recycle', trash: 'recycle',
  bureau: 'desktop', desktop: 'desktop',
  documents: 'documents',
  'téléchargements': 'downloads', downloads: 'downloads',
  images: 'pictures', photos: 'pictures', pictures: 'pictures',
  musique: 'music', music: 'music',
  'vidéos': 'videos', videos: 'videos',
};
// plusieurs actions dans un même message, séparées par "et" / "and" / " puis "
const SPLIT_ACTIONS = /\s+(?:et|and|puis|then|,)\s+(?=(?:ouvre|ouvrir|lance|lancer|démarre|demarre|joue|jouer|mets|met|play|put|open|launch|start|find|finde|cherche|trouve|search|run)\b)/iu;
const MEDIA_ACTIONS = new Set(MEDIA_ASK.map(([action]) => action));
const PC_WORD = /\b(?:pc|ordinateur|computer|windows|système|system)\b/i;
const SETTINGS_PAGES = [
  ['bluetooth', /\bbluetooth\b/i],
  ['sound', /\b(?:son|audio|sound)\b/i],
  ['wifi', /\b(?:wi[- ]?fi|wifi)\b/i],
  ['network', /\b(?:réseau|reseau|network)\b/i],
  ['update', /\b(?:mise(?:s)? à jour|windows update|updates?)\b/i],
  ['display', /\b(?:écran|ecran|display)\b/i],
  ['notifications', /\bnotifications?\b/i],
  ['mouse', /\b(?:souris|mouse|touchpad)\b/i],
  ['power', /\b(?:alimentation|power|veille)\b/i],
  ['battery', /\bbatter(?:ie|y)\b/i],
  ['background', /\b(?:fond d'écran|wallpaper|background)\b/i],
  ['storage', /\b(?:stockage|storage)\b/i],
];
const INFO_ASK = [
  ['battery', /\b(?:batterie|battery)\b/i],
  ['disk', /\b(?:espace|place|disque|disk|drive)\b/i],
  ['ram', /\b(?:ram|mémoire vive|memoire vive)\b/i],
  ['ip', /\b(?:adresse ip|mon ip|ip address)\b/i],
];
const POWER_ASK = [
  ['cancel', /\b(?:annule|annuler|cancel)\b.*\b(?:arrêt|arret|extinction|shutdown|redémarrage|redemarrage|restart)\b/i],
  ['lock', /\b(?:verrouille|verrouiller|lock)\b/i],
  ['sleep', /\b(?:mets?|mettre|put)\b.*\b(?:veille|sleep)\b/i],
  ['shutdown', /(?:^|\s)(?:étein(?:s|dre)?|etein(?:s|dre)?|shutdown|shut down)\b/i],
  ['restart', /\b(?:redémarre|redemarre|redémarrer|redemarrer|restart|reboot)\b/i],
];
const SNIP_ASK = /\b(?:capture(?: une zone)?|capture d'écran|screenshot|snip)\b/i;
const TIDY_ASK = /\b(?:range|ranger|masque|masquer|minimise|minimize)\b.*\b(?:fenêtres|fenetres|windows)\b/i;
const UNTIDY_ASK = /\b(?:restaure|restaurer|affiche|ramène|ramene|undo)\b.*\b(?:fenêtres|fenetres|windows)\b/i;
const DARK_ASK = /\b(?:mode|thème|theme)\s+sombre\b|\b(?:dark mode|dark theme)\b/i;
const LIGHT_ASK = /\b(?:mode|thème|theme)\s+clair\b|\b(?:light mode|light theme)\b/i;
const TIMER_ASK = /\b(?:minuteur|timer|compte à rebours|countdown)\b/i;
const VOLUME_ASK = /\b(?:volume|son)\b.*?(?:à|a|at|to)\s*(\d{1,3})\b/i;
const MUTE_ASK = /\b(?:mets?|mettre|put|set)\b.*\b(?:sourdine|silencieux|mute)\b/i;
const UNMUTE_ASK = /\b(?:désactive|desactive|enlève|enleve|retire|unmute)\b.*\b(?:sourdine|silencieux|mute)\b/i;
const PLACE_VERB = /\b(?:mets?|mettre|place|placer|put|move)\b/i;
const SIDE = [['left', /\b(?:gauche|left)\b/i], ['right', /\b(?:droite|right)\b/i]];

function duration(text) {
  const m = /(\d+(?:[.,]\d+)?|un|une|one|a)\s*(secondes?|secs?|s|minutes?|mins?|m|heures?|hours?|h)\b/i.exec(text);
  if (!m) return 0;
  const n = /^(?:un|une|one|a)$/i.test(m[1]) ? 1 : Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const unit = m[2].toLowerCase();
  return Math.round(n * (/^(h|heure|heures|hour|hours)$/.test(unit) ? 3600000 : /^(s|sec|secs|seconde|secondes)$/.test(unit) ? 1000 : 60000));
}

function span(ms) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}
function musicAction(text) {
  if (MUSIC_STATUS.test(text)) return 'current';
  if (/\b(play|resume)\b|reprends?|relance|remets?\s+(?:la\s+)?musique/i.test(text)) return 'play';
  if (/\b(pause|stop)\b|mets?.*\b(?:en pause|pause)\b|arr[eê]te(?:r)?\s+(?:(?:la|la lecture de la)\s+)?(?:musique|spotify|deezer)/i.test(text)) return 'pause';
  if (/\b(next|skip)\b|morceau suivant|chanson suivante|passe\s+(?:au|à la)\s+(?:morceau|chanson)\s+suivant|suivant/i.test(text)) return 'next';
  if (/\bprevious\b|pr[eé]c[eé]dent(?:e)?|morceau d['’]avant|chanson d['’]avant/i.test(text)) return 'previous';
  if (/\b(volume|volum[eé])\b/i.test(text) && /\b(\d{1,3})\b/.test(text)) return 'volume';
  if (/\b(louder|turn up)\b|monte\s+(?:le\s+)?volume|augmente\s+(?:le\s+)?volume|plus fort/i.test(text)) return 'volup';
  if (/\b(quieter|turn down)\b|baisse\s+(?:le\s+)?volume|diminue\s+(?:le\s+)?volume|moins fort/i.test(text)) return 'voldown';
  return null;
}
const TRANSPORT = new Set(['pause', 'play', 'next', 'previous']); // the keys of a player (the rest is the volume)
// what her tag needs to find in your message before it does anything: a small model tags answers about
// anything ("[[music: synthwave]]" under a film tip), and music and the media keys act right away
const LISTEN = /listen|слуша|playlist|album|\bplay\b|включи|поставь/i;
const SOUND = /\b(sound|volume)\b|звук|громк/i;
const PLAY = /\bplay\b|играть|поигра/i;
const SITE = /\b(site|web|page|link|url)|сайт|ссылк|\.(com|org|net|io|gg|tv|ru)\b/i;
// "call me Max", "зови меня Макс"
const NAME_ASK = /(?:call me|my name is|зови меня|меня зовут)\s+([\p{L}\p{N}'’-]{1,24})/iu;
// "remember that…", "запомни, что…" (said first thing)
const MEMO_ASK = /^\s*(?:capri,?\s+|stp,?\s+|please,?\s+)?(?:remember(?: that)?|запомни,?(?: что)?)\s+(.{3,200})/iu;
const MEMORIES_MAX = 30;
const simple = (text) => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const ASK_MAX = 600; // how much of a message is read for what you asked plainly
function cleanRequestedPath(value) {
  return String(value || '').trim()
    .replace(/^["“]/u, '')
    .replace(/["”]\s*[.!?]*$/u, '')
    .replace(/\s+(?:dans|with|in)\s+(?:finder|explorer|file explorer|le gestionnaire de fichiers)\s*[.!?]*$/iu, '')
    .replace(/\s+(?:qui\s+est\s+|se trouve\s+|situé\s+|situe\s+)?sur\s+(?:mon|le)\s+(?:bureau|desktop)\s*[.!?]*$/iu, '')
    .replace(/[.!?]$/u, '');
}
// sites asked for by name ("open youtube") when no app on the PC goes by it: the address is hers, not
// the model's, so it opens right away like an app you named
const SITES = {
  youtube: 'https://www.youtube.com', google: 'https://www.google.com', gmail: 'https://mail.google.com',
  twitch: 'https://www.twitch.tv', netflix: 'https://www.netflix.com', reddit: 'https://www.reddit.com',
  twitter: 'https://x.com', instagram: 'https://www.instagram.com', tiktok: 'https://www.tiktok.com',
  facebook: 'https://www.facebook.com', github: 'https://github.com', chatgpt: 'https://chatgpt.com',
  wikipedia: 'https://www.wikipedia.org', linkedin: 'https://www.linkedin.com', pinterest: 'https://www.pinterest.com',
  crunchyroll: 'https://www.crunchyroll.com', outlook: 'https://outlook.live.com', whatsapp: 'https://web.whatsapp.com',
  discord: 'https://discord.com/app', soundcloud: 'https://soundcloud.com', deezer: 'https://www.deezer.com',
};
// a browser named with a site ("open youtube on chrome"): the site, in the browser you use
const BROWSER = /chrome|edge|firefox|opera|brave|vivaldi|duckduckgo|browser/i;
const REQUESTED_BROWSER = /\b(?:sur|dans|with|on|in)\s+(safari|chrome|firefox|edge|opera|brave|vivaldi)\b/i;
// local models this small mostly talk nonsense ("llama3.2:1b", "qwen2.5:0.5b"…)
const TINY = /[:-](0\.5b|1b|1\.5b|135m|270m|360m)\b/i;
// the feeling her AI says it answers with: [[mood: angry]] (or a sloppier [mood: angry]) at the start
const MOOD_TAG = /\[\[?\s*(?:mood|настроение)\s*:\s*([a-z]+)\s*\]\]?/i;
// her face while she reads your message, from her reaction to it (heart.js)
const REACTION_FACE = { rage: 'many', huff: 'look', hurt: 'aside', pout: 'aside', forgive: 'calm', shy: 'aside', giggle: 'laugh', care: 'look', startle: 'wide', dreamy: 'aside' };
// you asked about what's on your screen (eyes.js): she takes a fresh look before answering
const SCREEN_Q = /(?:что|чё|чо|какой|кто|where|what|which|who).{0,30}(?:на\s+(?:моём\s+|моем\s+)?экран|у\s+меня\s+на\s+экран|на\s+скрин|screen)|посмотр\p{L}*\s+(?:на\s+)?(?:мой\s+)?экран|глян\p{L}*\s+(?:на\s+)?(?:мой\s+)?экран|look\s+at\s+(?:my\s+)?screen|видишь\s+(?:ли\s+)?(?:что|это)|что\s+(?:я\s+)?(?:сейчас\s+)?(?:смотрю|делаю|читаю|играю)/iu;
// you did ask her to write/send something (so an AI [[msg:...]] tag isn't acted on out of nowhere)
const WRITE_ASK = /напиш\p{L}*|напеч\p{L}*|отправ\p{L}*|сообщ\p{L}*|скаж\p{L}*|передай|write|send|message|text/iu;

export function thinkingCommands(lang = 'en') {
  return [...(THINKING_COMMANDS[lang] || THINKING_COMMANDS.en)];
}

export function quickReply(text) {
  const normalized = String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’\-]/gu, ' ')
    .replace(/^[\s,.:;!?]*(?:(?:capri|hey|salut|привет)[\s,.:;!?]*)?/u, '')
    .replace(/[.!?]+$/u, '')
    .trim()
    .replace(/[\s,.:;!?]+(?:capri|choom|чумба)$/u, '')
    .replace(/[\s,.:;!?]*$/u, '')
    .replace(/\s+/gu, ' ');
  const match = QUICK_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  if (!match) return null;
  return { kind: match.kind, text: QUICK_REPLIES[match.lang || lang]?.[match.kind] || QUICK_REPLIES.en[match.kind] };
}

export class Chat {
  constructor({ capri, panel, voice, host, brain, reminders = null, satelliteWait = null }) {
    this.capri = capri;
    this.panel = panel;
    this.voice = voice;
    this.host = host;
    this.brain = brain;
    this.reminders = reminders;
    this.satelliteWait = satelliteWait;
    this.history = []; // your chats with her, [{ role, content }], kept by main.js across restarts
    this.warm = false; // a model already answered this run (Ollama's first answer waits for it to load)
    this.open = false;
    this.turn = 0;     // id of the answer coming in, if any
    this.answer = '';
    this.apps = [];    // the apps open on this PC, as last listed: [{ name, label }]
    this.appsReady = Promise.resolve();
    this.heart = null;   // heart.js: how she feels (app.js)
    this.life = null;    // life.js: what she's up to on her own
    this.speech = null;  // speech.js: her voice
    this.bond = null;    // bond.js: what she's learned about you, and how close you are
    this.shown = '';     // what her bubble shows after her answer (lines added under it)
    this.hands = null;   // hands.js: her hands on the PC (windows, messages)
    this.eyes = null;    // eyes.js: what's on your screen
    this.screenNow = ''; // what she saw this turn, if you asked about the screen
    this.later = '';     // what you said (your voice) while she was still answering
    this.onSetup = null; // (status) => void: she can't answer yet (app.js hands it to setup.js)
    this.onBetterModel = null; // () => void: a bigger model than the tiny one she's on (setup.js)
    this.onSpokenText = null; // (text) => void: an accepted call mirrors exactly what she sends to speech
    host.onChatDelta(({ id, text }) => this.onDelta(id, text));
  }

  get t() {
    return this.brain.t.chat;
  }

  // Opens her chat. Asked twice before it's open (a tap on her and your voice at once, a second thing you
  // said while the first is still being heard): the same opening, not a second one on top of it.
  start(options = {}) {
    this.starting ||= this.begin(options).finally(() => { this.starting = null; });
    return this.starting;
  }

  async begin({ hidden = false } = {}) {
    const { capri, host, t } = this;
    if (this.open) {
      this.panel.chatInput.focus();
      return;
    }
    if (capri.stowed) {
      host.setConfig({ visible: true });
      await capri.unstow();
    }
    capri.wake();
    const status = await host.chatStatus();
    if (!status.ok && status.error === 'preparing') {
      // she is getting her mind and her voice ready (the preparation window): not a thing to set up with you
      capri.perform('curious', capri.towardCenter());
      this.panel.say({
        kind: 'info', face: 'aside', guide: true, line: t.preparing, quote: t.preparingHow,
        actions: [{ id: 'show', label: t.openPrepare, primary: true }, { id: 'ok', label: t.ok }],
        onAction: (id) => {
          if (id === 'show') host.prepareShow?.();
          this.panel.hide();
        },
        hold: null,
      });
      return;
    }
    if (!status.ok && this.onSetup) {
      this.onSetup(status); // nothing to talk with yet: she sets it up with you, with buttons (setup.js)
      return;
    }
    if (!status.ok) {
      // no Ollama, or nothing to talk with yet: what to do about it
      const offline = status.error === 'offline';
      const other = !offline && status.error !== 'nomodel'; // another provider, saying why
      capri.perform('curious', capri.towardCenter());
      this.panel.say({
        kind: 'info',
        face: 'aside',
        guide: true,
        line: other ? t.failed : offline ? t.offline : t.noModel,
        quote: other ? status.error : offline ? t.offlineHow : t.noModelHow,
        actions: offline
          ? [{ id: 'get', label: t.getOllama, primary: true }, { id: 'ok', label: t.ok }]
          : [{ id: 'ok', label: t.ok, primary: true }],
        onAction: (id) => {
          if (id === 'get') host.openOllama();
          this.panel.hide();
        },
        hold: null,
      });
      return;
    }
    this.history = await host.chatMemory().catch(() => this.history); // "forget" in her menu may have emptied it
    this.cold = status.warmup && !this.warm;
    this.agent = Boolean(status.agent); // Claude Code answers, as her, and really works in your project
    if (this.bond) this.bond.agent = this.agent; // her notebook isn't written by Claude Code (bond.js)
    this.listApps();
    const shortModel = status.model.replace(/:latest$/, '').replace(/^models\//, ''); // Ollama's tag, Gemini's prefix
    const tiny = status.provider === 'ollama' && TINY.test(status.model) && this.onBetterModel;
    const shown = hidden || this.panel.say({
      kind: 'chat',
      face: 'look',
      badge: t.badge,
      tag: shortModel,
      line: tiny ? fmt(t.tiny, { model: shortModel }) : pick(this.history.length ? t.again : t.hello),
      actions: tiny ? [{ id: 'better', label: t.better, primary: true }] : [],
      onAction: () => {
        this.panel.hide(); // her chat holds off her guide's panels: it goes first
        this.onBetterModel?.();
      },
      chat: {
        placeholder: t.placeholder,
        send: t.send,
        close: t.close,
        noteTag: t.noteTag,
        note: status.local ? t.note : t.noteCloud,
      },
      onSend: (text) => this.send(text),
      onLeave: () => this.close(),
      hold: null,
    });
    if (!shown) return; // something more important is on (a permission prompt)
    // the keyboard, for typing to her (only now: her ring menu, if it was open, has stepped aside for her
    // in the line above, and gives the keyboard back as it goes)
    host.focusOverlay(true);
    this.open = true;
    if (!hidden) setTimeout(() => this.panel.chatInput.focus(), 150); // once the overlay has the keyboard
    capri.perform('hop');
    capri.nextMove = capri.nextGaze = performance.now() + STAY_MS;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.stopThinking();
    clearInterval(this.pcCountdownTimer);
    this.pcCountdownTimer = null;
    this.panel.setTicker(null);
    this.speech?.stop();
    if (this.turn) this.host.chatStop(this.turn);
    this.turn = 0;
    this.later = '';
    this.host.focusOverlay(false);
    this.bond?.reflect(this.history, { closing: true }); // what she learned about you, into her notebook
    this.capri.nextMove = performance.now() + 30000;
    this.capri.nextGaze = performance.now() + 60000;
  }

  // Something you said with your voice (ears.js): sent now, or, if she's still answering, as soon as she's
  // done (it was heard and paid for: not thrown away).
  say(text) {
    if (this.turn) this.later = [this.later, text].filter(Boolean).join(' ');
    else this.send(text);
  }

  // what was said while she answered, now
  sayLater() {
    const text = this.later;
    this.later = '';
    if (text && this.open) setTimeout(() => this.send(text), 700);
  }

  // Every model request and the satellite demo go through this same wait manager.
  runManagedRequest(request, options) {
    return this.satelliteWait ? this.satelliteWait.run(request, options) : request();
  }

  startThinking(id) {
    this.stopThinking();
    const commands = thinkingCommands(this.brain.lang);
    let index = 0;
    let typed = 0;
    let pause = 0;
    const show = () => {
      if (this.turn !== id || !this.open) {
        this.stopThinking();
        return;
      }
      const command = commands[index];
      if (pause > 0) {
        pause--;
      } else if (typed < command.length) {
        typed++;
        if (typed === command.length) pause = THINKING_PAUSE_TICKS;
      } else {
        index = (index + 1) % commands.length;
        typed = 0;
      }
      this.panel.thinking(command.slice(0, typed));
    };
    this.panel.thinking('');
    this.thinkingTimer = setInterval(show, THINKING_STEP_MS);
  }

  stopThinking() {
    clearInterval(this.thinkingTimer);
    this.thinkingTimer = null;
    this.panel.clearThinking?.();
  }

  async send(text) {
    if (this.turn || !this.open) return;
    if (/^(?:quelle est )?ma version|version de capri|about capri|à propos de capri$/iu.test(String(text).trim())) {
      const version = await this.host.appVersion?.() || 'inconnue';
      this.panel.say({ kind: 'chat', face: 'smug', line: fmt(this.t.version || 'Version {version}.', { version }), hold: 3500 });
      return;
    }
    const id = Date.now();
    this.turn = id;
    this.answer = '';
    this.history.push({ role: 'user', content: text });
    this.speech?.stop(); // she stops talking to listen
    // how it makes her feel, shown right away: she bristles, giggles, blushes... (heart.js)
    const felt = this.heart?.feel(text) || { tags: [], reaction: null };
    // she gets to know you a little more with every message (bond.js): how close she is now
    const grew = this.bond?.observe(text, this.heart?.enabled ? felt.tags : null) || 0;
    this.shown = '';
    this.panel.setChatBusy(true);
    this.panel.setActions([]); // a close button she offered before goes with a new message
    this.panel.chatTurn({ quote: text, face: REACTION_FACE[felt.reaction] || 'aside' });
    const quick = quickReply(text);
    if (quick) {
      this.turn = 0;
      this.shown = quick.text;
      this.remember({ role: 'assistant', content: quick.text });
      this.panel.stream(quick.text, { done: true });
      this.panel.setFace(quick.kind === 'thanks' ? 'smug' : 'calm');
      this.heart?.answered(quick.kind === 'thanks' ? 'happy' : 'calm', { already: felt.reaction });
      this.onSpokenText?.(quick.text);
      this.speech?.say(quick.text, { mood: quick.kind === 'thanks' ? 'happy' : 'calm', kind: 'chat' });
      this.panel.setChatBusy(false);
      this.sayLater();
      this.bond?.replied(quick.text, quick.kind === 'thanks' ? 'happy' : 'calm');
      if (grew) this.closer(grew, quick.text);
      this.listApps();
      this.bond?.reflect(this.history);
      return;
    }
    this.startThinking(id);
    if (!felt.reaction) this.capri.pulse();
    // what you asked for plainly happens right away (the music, the volume, an app you named): her
    // line about it comes under her answer (Claude Code, answering her chat, does things its own way)
    const asked = this.agent ? null : this.asked(text);
    if (asked && asked.kind === 'multi') {
      const lines = [];
      this.actionTurn = true;
      for (const part of asked.parts) {
        if (['close', 'hands'].includes(part.kind)) continue;
        const done = await this.doNow(part);
        if (done?.line) lines.push(done.line);
      }
      this.stopThinking();
      this.turn = 0;
      this.shown = lines.join(' ');
      this.panel.stream(this.shown, { done: true });
      if (this.shown) this.onSpokenText?.(this.shown);
      if (asked.parts.some((p) => p.kind === 'hands' && p.intent.kind !== 'message')) {
        const firstHands = asked.parts.find((p) => p.kind === 'hands' && p.intent.kind !== 'message');
        await this.hands.op(firstHands.intent);
      }
      this.remember({ role: 'assistant', content: this.shown });
      this.panel.setChatBusy(false);
      this.actionTurn = false;
      this.sayLater();
      this.listApps();
      return;
    }
    const early = asked && !['close', 'hands'].includes(asked.kind) ? this.doNow(asked)
      : asked?.kind === 'hands' && asked.intent.kind !== 'message' ? this.hands.op(asked.intent) : null;
    this.actionTurn = Boolean(early);
    if (asked && ['openPath', 'currentTime', 'reminder', 'cancelReminder'].includes(asked.kind) && early) {
      const done = await early;
      this.stopThinking();
      this.turn = 0;
      this.shown = done?.line || '';
      this.panel.stream(this.shown, { done: true });
      if (this.shown) this.onSpokenText?.(this.shown);
      if (done?.face) this.panel.setFace(done.face);
      this.remember({ role: 'assistant', content: this.shown });
      this.panel.setChatBusy(false);
      this.actionTurn = false;
      this.sayLater();
      this.listApps();
      return;
    }
    // Calls must not wait for a second AI turn after a deterministic command. Finish the
    // verified action immediately so the microphone can accept the next request.
    if (this.speech?.callMode && early) {
      const done = await early;
      if (done && !done.confirm) {
        this.stopThinking();
        this.turn = 0;
        this.shown = done.line || '';
        this.panel.stream(this.shown, { done: true });
        if (this.shown) this.onSpokenText?.(this.shown);
        if (done.face) this.panel.setFace(done.face);
        this.remember({ role: 'assistant', content: this.shown });
        this.panel.setChatBusy(false);
        this.actionTurn = false;
        this.sayLater();
        this.listApps();
        return;
      }
    }
    // you asked about the screen: she takes a quiet look first, so her answer is about what's really there
    this.screenNow = '';
    if (!this.agent && this.eyes?.enabled && SCREEN_Q.test(text)) {
      this.screenNow = (await this.eyes.look({ silent: true }).catch(() => '')) || '';
    }
    await Promise.race([this.appsReady, new Promise((r) => setTimeout(r, 1500))]);
    const messages = [{ role: 'system', content: this.persona(text) }, ...this.history.slice(-REMEMBER)];
    // nothing yet after a few seconds: Ollama is still loading the model (the first answer after a start),
    // or Claude Code is at work
    let res;
    try {
      res = await this.runManagedRequest(() => this.host.chatSend({ id, messages }), { excluded: asked?.kind === 'open', id });
    } catch (error) {
      res = { ok: false, error: String(error?.message || error), code: error?.code || null };
    }
    this.stopThinking();
    if (this.turn !== id) {
      // closed meanwhile: your message goes too, or the next answer would answer it as well
      if (this.history.at(-1)?.content === text) this.history.pop();
      this.actionTurn = false;
      return;
    }
    this.turn = 0;
    if (!res.ok) {
      if (early) {
        const done = await early;
        if (done) {
          this.shown = done.line;
          this.panel.stream(done.line, { done: true });
          if (done.face) this.panel.setFace(done.face);
          this.remember({ role: 'assistant', content: done.line });
          this.panel.setChatBusy(false);
          this.actionTurn = false;
          this.sayLater();
          return;
        }
      }
      this.history.pop();
      this.panel.setFace('wide');
      // too busy or gone even after trying other models (main.js): said plainly, not the server's JSON
      const known = { busy: 'swamped', gone: 'gone', credit: 'credit', badkey: 'badkey', refused: 'refused' }[res.code];
      this.panel.stream(known ? this.t[known] : `${this.t.failed} ${res.error}`, { done: true });
      this.panel.setChatBusy(false);
      this.later = ''; // (it would only fail the same way)
      this.actionTurn = false;
      return;
    }
    const answer = clean(res.text) || '…';
    const actionOnly = this.actionTurn;
    this.warm = true;
    if (!actionOnly) {
      this.remember({ role: 'assistant', content: answer });
      this.panel.stream(answer, { done: true });
    }
    // the feeling she answered with: her face, her body, and her feelings nudged by it
    const expr = this.heart?.answered(MOOD_TAG.exec(res.text)?.[1], { already: felt.reaction }) || null;
    this.panel.setFace(expr ? this.heart.face(expr) : mood(answer));
    if (!expr && felt.tags.includes('jokeAsk')) this.capri.react('laugh'); // her own joke cracks her up
    // The call window mirrors every answer, including answers attached to an automatic action.
    // Normal chat still only speaks ordinary model answers.
    this.onSpokenText?.(answer);
    if (!actionOnly) {
      this.speech?.say(answer, { mood: expr || this.heart?.mood.mood || 'calm', kind: 'chat' });
    }
    this.panel.setChatBusy(false);
    this.sayLater();
    this.bond?.replied(answer, expr || ''); // your next message tells her how this one landed
    const acted = this.agent ? null : this.after(res.text, answer, asked, early, text);
    Promise.resolve(acted).catch(() => {}).finally(() => { this.actionTurn = false; });
    if (grew) Promise.resolve(acted).catch(() => {}).then(() => this.closer(grew, answer));
    this.listApps(); // fresh for the next message
    this.bond?.reflect(this.history); // every few messages, a line in her notebook about you
  }

  // She just grew closer to you (bond.js): she says so, under her answer, a little flustered.
  closer(level, answer) {
    const line = pick(lifeLines(this.brain.lang).bond.up[level] || []);
    if (!line || !this.open) return;
    this.addLine(this.shown || answer, `♥ ${line}`, 'smug');
    this.capri.react('shy');
    this.heart?.event('petted');
  }

  // an answer of hers, kept with your message before it
  remember(message) {
    this.history.push(message);
    this.history = this.history.slice(-KEEP);
    this.host.chatRemember(this.history);
  }

  // What's open on the PC (a PowerShell look in main, so not on every message: a fresh list at most
  // every APPS_FRESH, unless something was just closed)
  listApps(force = false) {
    const now = performance.now();
    if (!force && now - (this.appsAt ?? -Infinity) < APPS_FRESH) return;
    this.appsAt = now;
    this.appsReady = this.host.openApps().then((list) => { this.apps = list || []; }).catch(() => {});
  }

  async resolveLaunch(text) {
    if (this.host.resolveLaunch) return this.host.resolveLaunch(text);
    const item = await this.host.findLaunch(text);
    return item ? { status: 'found', item } : { status: 'not_found', suggestions: [] };
  }

  launchResolutionLine(result, requested) {
    const names = (result.candidates || result.suggestions || []).map((item) => item.name).slice(0, 4);
    const french = this.brain.lang === 'fr';
    if (result.status === 'ambiguous') {
      return french
        ? `Plusieurs applications correspondent à « ${requested} » : ${names.join(', ')}. Laquelle veux-tu ouvrir ?`
        : `Several apps match “${requested}”: ${names.join(', ')}. Which one should I open?`;
    }
    if (names.length) return french
      ? `Je ne trouve pas « ${requested} ». Applications proches : ${names.join(', ')}.`
      : `I can’t find “${requested}”. Similar installed apps: ${names.join(', ')}.`;
    return fmt(this.t.notInstalled, { app: requested });
  }

  // What you asked plainly, read off your message (one request, no "and"):
  // { kind: 'media', action } | { kind: 'music', song } | { kind: 'close', name } | { kind: 'open', text }
  // | { kind: 'youtube', song } | { kind: 'findFiles', query } | { kind: 'openSystemFolder', name }
  askedOne(whole) {
    const text = whole.length > ASK_MAX ? whole.slice(0, ASK_MAX) : whole; // (a command is a few words: a pasted page is not read for one)
    const count = text.trim().split(/\s+/).length;
    // Roblox : détecter les demandes de lancement de jeux avant la recherche d'applications locales.
    const asksRoblox =
      /\broblox\b/i.test(text) &&
      (OPEN_ASK.test(text) || PLAY.test(text));

    if (asksRoblox) {
      const game = text
        .replace(/\b(?:sur|dans|on|in)\s+roblox\b/gi, '')
        .replace(/\broblox\b/gi, '')
        .replace(
          /^\s*(?:s'il te plaît|stp|please)?\s*(?:lance(?:r)?|ouvre(?:r)?|joue(?:r)?(?:\s+à)?|play|launch|start|open)\s+/i,
          ''
        )
        .replace(/^\s*(?:(?:le|la|the)\s+)?(?:jeu|game)\s+/i, '')
        .replace(/[.!?]+$/g, '')
        .trim();

      if (game) return { kind: 'roblox', query: game };
    }

    const name = NAME_ASK.exec(text)?.[1];
    if (name) return { kind: 'name', name };
    const memo = MEMO_ASK.exec(text)?.[1]?.trim();
    if (memo) return { kind: 'memo', text: memo };
    const cancel = parseCancel(text);
    if (cancel) return { kind: 'cancelReminder', text: cancel.text };
    const reminder = parseReminder(text);
    if (reminder) return { kind: 'reminder', ...reminder };
    const pc = (this.askedPc || Chat.prototype.askedPc).call(this, text, count);
    if (pc) return pc;
    if (FORGET_ME.test(text)) return { kind: 'forgetMe' };
    if (LATEST_VIDEO_ASK.test(text) && /youtube/i.test(text)) {
      const browserMatch = /\b(?:dans|depuis|in)\s+(safari|firefox|chrome)\b/i.exec(text);
      const browser = browserMatch ? ({ safari: 'Safari', firefox: 'Firefox', chrome: 'Google Chrome' }[browserMatch[1].toLowerCase()]) : '';
      const creatorMatch = /(?:vid[eé]o)\s+(?:la\s+plus\s+r[eé]cente\s+)?(?:de|d['’]|from|by)\s+(.+?)(?=\s+(?:sur|on)\s+youtube\b|\s+(?:dans|depuis|in)\s+(?:safari|firefox|chrome)\b|$)/i.exec(text);
      const creator = (creatorMatch?.[1] || '').replace(/\b(?:mr\.?\s*beast|mister\s+beast)\b/i, 'MrBeast').trim();
      if (creator) return { kind: 'videoSearch', creator, browser };
    }
    if (CHESS_ASK.test(text)) return { kind: 'chess' };
    if (SCREENSHOT_ASK.test(text)) return { kind: 'screenshot' };
    const requestedUrl = /(?:https?:\/\/|www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z]{2,}(?:\/[^\s"'<>]*)?/i.exec(text)?.[0];
    const requestedBrowser = REQUESTED_BROWSER.exec(text)?.[1];
    if (requestedUrl && requestedBrowser && OPEN_ASK.test(text)) {
      const address = /^https?:\/\//i.test(requestedUrl) ? requestedUrl : `https://${requestedUrl}`;
      return { kind: 'openSite', address, browser: requestedBrowser };
    }
    // A launch verb names an application, even when the application is also a media service.
    // "Lance Spotify" must not become a media play command.
    if (OPEN_APP_ASK.test(text) && !DOCUMENT_CREATE.test(text)) return { kind: 'open', text };
    const requestedService = /\b(spotify|deezer)\b/i.exec(text)?.[1]?.toLowerCase() || null;
    const requestedMusicAction = musicAction(text);
    if (requestedService && requestedMusicAction) {
      const value = requestedMusicAction === 'volume' ? Number(/\b(\d{1,3})\b/.exec(text)?.[1]) : undefined;
      return { kind: 'media', action: requestedMusicAction, service: requestedService, ...(value !== undefined ? { volume: value } : {}) };
    }
    if (requestedMusicAction && (MUSIC_WORD.test(text) || SOUND.test(text))) {
      const value = requestedMusicAction === 'volume' ? Number(/\b(\d{1,3})\b/.exec(text)?.[1]) : undefined;
      return {
        kind: 'media',
        action: requestedMusicAction,
        ...((requestedMusicAction === 'current' || requestedService) ? { service: requestedService } : {}),
        ...(value !== undefined ? { volume: value } : {}),
      };
    }
    const documentContent = DOCUMENT_CREATE.exec(text)?.[1];
    if (documentContent !== undefined) {
      const filename = /(?:named|called|nommé|nommee|nommée)\s+["“]?([^"”\s]+)["”]?/iu.exec(text)?.[1] || 'Note.txt';
      return { kind: 'createText', filename, content: documentContent, openIn: /text\s*edit/i.test(text) ? 'TextEdit' : '' };
    }
    // App commands must win over the deliberately broad music wording above:
    // "lance Discord" is an app launch, never a YouTube search for "Discord".
    if (OPEN_APP_ASK.test(text) && !DOCUMENT_CREATE.test(text)) return { kind: 'open', text };
    const yt = YOUTUBE_ASK.exec(text);
    if (yt && yt[1] && !requestedService) return { kind: 'youtube', song: yt[1].trim() };
    const find = FIND_FILES_ASK.exec(text);
    if (find && find[1] && !WEB_SEARCH_ASK.test(text)) return { kind: 'findFiles', query: find[1].trim() };
    const folder = OPEN_SYSTEM_FOLDER.exec(text);
    if (folder) return { kind: 'openSystemFolder', name: FOLDER_ID[folder[1].toLowerCase()] || folder[1].toLowerCase() };
    const pathMatch = OPEN_PATH_ASK.exec(text);
    if (pathMatch) {
      const requestedPath = cleanRequestedPath(pathMatch[1]);
      return { kind: 'openPath', path: requestedPath };
    }
    if (CURRENT_TIME_ASK.test(text)) return { kind: 'currentTime', zone: 'Europe/Zurich' };
    if ((WEB_SEARCH_ASK.test(text) || (CURRENT_INFO_ASK.test(text) && !OPEN_ASK.test(text))) && !LATEST_VIDEO_ASK.test(text)) {
      const query = text
        .replace(/^\s*(?:capri[,\s]*)?(?:(?:can you|could you|please|peux-tu|peux tu|s'il te plaît|s'il te plait)\s*)?/iu, '')
        .replace(/^\s*capri[,\s]*/iu, '')
        .replace(/^\s*(?:search|look\s+up|find|find out|recherche|rechercher|cherche|trouve)\b/iu, '')
        .replace(/^\s*(?:for|about|sur|concernant)\s*/iu, '')
        .replace(/\b(?:online|on the web|sur internet|en ligne|sur le web)\b/iu, '')
        .replace(/[.!?]+$/u, '')
        .trim();
      if (query) return { kind: 'webSearch', query };
    }
    if (MUSIC_PLAYER_ASK.test(text)) return { kind: 'musicPlayer' };
    if (TRANSLATION_ASK.test(text)) {
      const url = /(https?:\/\/[^\s"'<>]+)/i.exec(text)?.[1]?.replace(/[.,!?;:]+$/u, '');
      const quotedPath = /["“]([^"”]+)["”]/u.exec(text)?.[1];
      const path = quotedPath || (/\b(?:file|fichier|document)\b\s+(.+?)(?:\s+(?:into|en|vers)\s+\w+)?[.!?]*$/iu.exec(text)?.[1]?.trim());
      return { kind: 'translation', source: url ? { kind: 'url', value: url } : path ? { kind: 'file', value: path } : null };
    }
    const directPath = OPEN_DIRECT_PATH_ASK.exec(text)?.[1]?.trim();
    if (directPath && /(?:^|[\s"'“])(?:~|\/|[A-Za-z]:[\\/])/.test(directPath)) {
      return { kind: 'openPath', path: cleanRequestedPath(directPath) };
    }
    const theme = askedTheme(text);
    if (theme) return { kind: 'theme', theme };
    // her hands on the PC (windows, a message): what you asked, read plainly (hands.js)
    const intent = this.hands?.parse(text);
    if (intent) return { kind: 'hands', intent };
    const service = requestedService;
    if (MUSIC_STATUS.test(text)) return { kind: 'media', action: 'current', service };
    const specificAction = requestedMusicAction;
    if (service && specificAction) {
      const value = specificAction === 'volume' ? Number(/\b(\d{1,3})\b/.exec(text)?.[1]) : undefined;
      return { kind: 'media', action: specificAction, service, ...(value !== undefined ? { volume: value } : {}) };
    }
    if (MUSIC_STATUS.test(text)) return { kind: 'media', action: 'current', service };
    if (specificAction && (MUSIC_WORD.test(text) || SOUND.test(text))) {
      const value = specificAction === 'volume' ? Number(/\b(\d{1,3})\b/.exec(text)?.[1]) : undefined;
      return { kind: 'media', action: specificAction, ...(value !== undefined ? { volume: value } : {}) };
    }
    const media = MEDIA_ASK.find(([, re]) => re.test(text))?.[0];
    if (media && this.mediaAsked(media, text, count)) return { kind: 'media', action: media };
    const song = SPOTIFY_ASK.exec(text)?.[1];
    if (song) return { kind: 'music', song };
    const app = this.askedToClose(text);
    if (app) return { kind: 'close', name: app };
    if (OPEN_ASK.test(text) && count <= 8) return { kind: 'open', text };
    return null;
  }

  // Native PC actions are parsed before generic media/theme handling so "son", "sombre"
  // and "arrêt" cannot be mistaken for chat or music requests.
  askedPc(text, count) {
    const pc = (what, more = {}) => ({ kind: 'pc', what, ...more });
    const power = POWER_ASK.find(([, re]) => re.test(text))?.[0];
    if (power === 'cancel') return pc('power', { power });
    if (power && (PC_WORD.test(text) || ['lock', 'sleep'].includes(power))) {
      const when = /(?:dans|in)\s+(\d+(?:[.,]\d+)?|un|une|one|a)\s*(secondes?|secs?|s|minutes?|mins?|m|heures?|hours?|h)\b/i.exec(text);
      const seconds = when ? Math.max(0, Math.round(duration(when[0]) / 1000)) : 30;
      return pc('power', { power, seconds });
    }
    if (SNIP_ASK.test(text)) return pc('snip');
    if (UNTIDY_ASK.test(text)) return pc('tidy', { back: true });
    if (TIDY_ASK.test(text)) return pc('tidy');
    if (DARK_ASK.test(text)) return pc('theme', { dark: true });
    if (LIGHT_ASK.test(text)) return pc('theme', { dark: false });
    if (TIMER_ASK.test(text)) {
      const ms = duration(text);
      if (ms > 0) return pc('timer', { ms });
    }
    const level = VOLUME_ASK.exec(text)?.[1];
    if (level && Number(level) <= 100) return pc('volume', { level: Number(level) });
    if (MUTE_ASK.test(text)) return pc('volume', { mute: true });
    if (UNMUTE_ASK.test(text)) return pc('volume', { mute: false });
    if (PLACE_VERB.test(text) && SIDE.some(([, re]) => re.test(text))) {
      const places = text.split(/\s+(?:et|and|y|e)\s+/i).map((part) => {
        const side = SIDE.find(([, re]) => re.test(part));
        if (!side) return null;
        const name = part.replace(PLACE_VERB, '').replace(side[1], '')
          .replace(/(?:^|\s)(?:la|le|les|l['’]|the|à|a|fenêtre|fenetre|window)(?=\s|$)/gi, ' ')
          .replace(/[\s.!?,]+/g, ' ').trim();
        return name.length >= 2 ? { name, side: side[0] } : null;
      }).filter(Boolean);
      if (places.length) return pc('arrange', { places });
    }
    if (count <= 12) {
      const page = SETTINGS_PAGES.find(([, re]) => re.test(text))?.[0];
      if (page && (OPEN_ASK.test(text) || /\b(?:paramètres|parametres|settings)\b/i.test(text))) return pc('settings', { page });
      const info = INFO_ASK.find(([, re]) => re.test(text))?.[0];
      if (info && (/\b(?:combien|quel|quelle|what|how much|how many)\b/i.test(text) || count <= 5)) return pc('info', { info });
    }
    return null;
  }

  // What you asked plainly, possibly two things at once ("ouvre Discord et lance Spotify").
  // Returns { kind: 'multi', parts: [...] } or the single askedOne result.
  asked(whole) {
    const text = whole.length > ASK_MAX ? whole.slice(0, ASK_MAX) : whole;
    const parts = text.split(SPLIT_ACTIONS);
    const parse = this.askedOne || Chat.prototype.askedOne;
    const asked = parts.map((part) => parse.call(this, part.trim())).filter(Boolean);
    if (asked.length > 1) return { kind: 'multi', parts: asked };
    return asked[0] || null;
  }

  // Whether "next", "pause", "louder"... is about the music, and not just a word in what you're saying
  // ("следующий вопрос", "next, please"): about music itself, or short; the track keys also only when
  // something is playing (or it's one or two words), the volume ones in a few words.
  mediaAsked(action, text, count) {
    if (MUSIC_WORD.test(text)) return true;
    if (!TRANSPORT.has(action)) return count <= 5;
    return count <= 2 || (count <= 5 && Boolean(this.life?.media?.playing));
  }

  // Doing it now. Resolves with her line about it ({ line, face }), or null if there was nothing to do.
  async doNow(asked) {
    const { t } = this;
    const custom = this.brain.custom;
    if (asked.kind === 'pc') {
      const pc = t.pc || {};
      const fr = this.brain.lang === 'fr';
      const run = (request) => this.host.pcDo?.(request);
      const failed = fr ? 'Je n’ai pas pu effectuer cette action sur ce système.' : 'I could not perform that action on this system.';
      if (asked.what === 'power') {
        if (asked.power === 'cancel') {
          const result = await run({ action: 'power', what: 'cancel' });
          return result ? { line: pc.cancelled || (fr ? 'Arrêt programmé annulé.' : 'Scheduled shutdown cancelled.'), face: 'smug' } : { line: failed, face: 'aside' };
        }
        const key = asked.power;
        const when = asked.seconds > 30 ? `${fr ? 'dans' : 'in'} ${span(asked.seconds * 1000)}` : (pc.now || (fr ? 'dans 30 secondes' : 'in 30 seconds'));
        return {
          line: fmt(pc.ask?.[key] || (fr ? 'Confirmer cette opération ?' : 'Confirm this operation?'), { when }),
          face: 'aside',
          confirm: { power: key, seconds: asked.seconds },
        };
      }
      if (asked.what === 'settings') {
        const result = await run({ action: 'settings', page: asked.page });
        return result ? { line: fmt(pc.settings, { page: pc.pages[asked.page] }), face: 'smug' } : { line: failed, face: 'aside' };
      }
      if (asked.what === 'info') {
        const result = await run({ action: 'info', what: asked.info });
        if (!result) return { line: failed, face: 'aside' };
        const gb = (bytes) => `${(bytes / 1024 ** 3).toFixed(bytes < 100 * 1024 ** 3 ? 1 : 0)} ${pc.gb || 'GB'}`;
        if (asked.info === 'battery') {
          if (result.none) return { line: pc.noBattery, face: 'look' };
          return { line: fmt(result.charging ? pc.charging : pc.battery, { percent: result.percent }), face: 'look' };
        }
        if (asked.info === 'disk') return { line: fmt(pc.disk, { free: gb(result.free), total: gb(result.total), drive: result.drive }), face: 'look' };
        if (asked.info === 'ram') return { line: fmt(pc.ram, { used: gb(result.used), total: gb(result.total) }), face: 'look' };
        return { line: result.ip ? fmt(pc.ip, { ip: result.ip }) : pc.noIp, face: 'look' };
      }
      if (asked.what === 'volume') {
        const result = await run({ action: 'volume', level: asked.level, mute: asked.mute });
        if (!result) return { line: failed, face: 'aside' };
        return { line: asked.mute === true ? pc.muted : asked.mute === false ? pc.unmuted : fmt(pc.volume, { level: result.level }), face: 'smug' };
      }
      if (asked.what === 'timer') {
        if (!this.reminders) return { line: fr ? 'Je ne peux pas démarrer de minuteur pour le moment.' : 'I cannot start a timer right now.', face: 'aside' };
        const time = span(asked.ms);
        this.reminders.add(Date.now() + asked.ms, fmt(pc.timerDone, { time }), { timer: true });
        this.startPcCountdown(Date.now() + asked.ms, pc.timerVerb || (fr ? 'Minuteur' : 'Timer'));
        return { line: fmt(pc.timer, { time }), face: 'smug' };
      }
      if (asked.what === 'snip') {
        const result = await run({ action: 'snip' });
        return result ? { line: pc.snip, face: 'smug' } : { line: failed, face: 'aside' };
      }
      if (asked.what === 'tidy') {
        const result = await run({ action: 'tidy', back: asked.back });
        return result ? { line: asked.back ? pc.back : pc.tidy, face: 'smug' } : { line: failed, face: 'aside' };
      }
      if (asked.what === 'theme') {
        const result = await run({ action: 'theme', dark: asked.dark });
        return result ? { line: asked.dark ? pc.dark : pc.light, face: 'smug' } : { line: failed, face: 'aside' };
      }
      if (asked.what === 'arrange') {
        const results = await Promise.all(asked.places.map(({ name, side }) => run({ action: 'arrange', name, side })));
        const placed = results.filter((result) => result?.found).map((result, index) => fmt(pc.placed, { app: result.name || asked.places[index].name, side: pc.sides[asked.places[index].side] }));
        return placed.length ? { line: placed.join(' '), face: 'smug' } : { line: failed, face: 'aside' };
      }
    }
    if (asked.kind === 'name') {
      custom.userName = asked.name; // her answer, being written now, already knows it
      this.host.setConfig({ userName: asked.name });
      return { line: fmt(this.brain.t.custom.named, { name: asked.name }), face: 'laugh' };
    }
    if (asked.kind === 'theme') {
      // her new colours: the config comes back around and puts them on (app.js)
      await this.host.setConfig({ colourTheme: asked.theme });
      this.capri.twitch();
      const tt = lifeLines(this.brain.lang).theme;
      return { line: asked.theme === 'mood' ? tt.mood : pick(tt.done), face: 'smug' };
    }
    if (asked.kind === 'forgetMe') {
      // what she learned about you, wiped (what you asked her to remember stays: that's in her menu)
      this.bond?.forget();
      return { line: pick(lifeLines(this.brain.lang).bond.forgot), face: 'aside' };
    }
    if (asked.kind === 'chess') {
      const result = await this.host.chessStart?.();
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      if (!result?.ok) return { line: result?.error || (fr ? 'Je n’ai pas pu ouvrir la partie d’échecs.' : ru ? 'Не удалось открыть шахматную партию.' : 'I could not open the chess game.'), face: 'aside' };
      return { line: fr ? 'L’échiquier est prêt. Tu joues les blancs ; les coups sont aussi disponibles dans le terminal Capri.' : ru ? 'Шахматная доска готова. Ты играешь белыми; ходы доступны и в терминале Capri.' : 'The board is ready. You play White; moves are also available in the Capri terminal.', face: 'smug' };
    }
    if (asked.kind === 'openPath') {
      const result = await this.host.openPath?.(asked.path);
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? `J’ai ouvert « ${asked.path} ».` : ru ? `Я открыла « ${asked.path}».` : `I opened "${asked.path}".`, face: 'laugh' }
        : { line: result?.error || (fr ? `Je n’ai pas trouvé « ${asked.path} ».` : ru ? `Не удалось найти « ${asked.path}».` : `I could not find "${asked.path}".`), face: 'aside' };
    }
    if (asked.kind === 'currentTime') {
      const now = new Intl.DateTimeFormat(this.brain.lang === 'fr' ? 'fr-FR' : this.brain.lang === 'ru' ? 'ru-RU' : 'en-US', {
        timeZone: asked.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
      }).format(new Date());
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return { line: fr ? `Il est actuellement ${now} en Suisse.` : ru ? `Сейчас в Швейцарии ${now}.` : `It is currently ${now} in Switzerland.`, face: 'smug' };
    }
    if (asked.kind === 'musicPlayer') {
      const result = await this.host.musicPlayerOpen?.();
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? 'Le mini-lecteur de musique est ouvert.' : ru ? 'Мини-плеер музыки открыт.' : 'The music player is open.', face: 'smug' }
        : { line: fr ? 'Je n’ai pas pu ouvrir le mini-lecteur.' : ru ? 'Не удалось открыть мини-плеер.' : 'I could not open the music player.', face: 'aside' };
    }
    if (asked.kind === 'translation') {
      const result = await this.host.translationOpen?.(asked.source);
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? 'La page de traduction est ouverte.' : ru ? 'Страница перевода открыта.' : 'The translation page is open.', face: 'smug' }
        : { line: fr ? 'Je n’ai pas pu ouvrir la page de traduction.' : ru ? 'Не удалось открыть страницу перевода.' : 'I could not open the translation page.', face: 'aside' };
    }
    if (asked.kind === 'videoSearch') {
      const result = await this.host.videoSearch?.({ creator: asked.creator, browser: asked.browser });
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      if (!result?.ok) return { line: result?.error || (fr ? 'Je n’ai pas pu ouvrir la recherche YouTube.' : ru ? 'Не удалось открыть поиск YouTube.' : 'I could not open YouTube search.'), face: 'aside' };
      return { line: fr ? `Recherche YouTube triée par date ouverte pour ${asked.creator}${asked.browser ? ` dans ${asked.browser}` : ''}. Vérifie les résultats : je ne peux pas confirmer ici lequel est réellement le plus récent.` : ru ? `Поиск YouTube с сортировкой по дате открыт для ${asked.creator}. Проверь результаты: я не могу подтвердить, какое видео самое новое.` : `Date-sorted YouTube search opened for ${asked.creator}${asked.browser ? ` in ${asked.browser}` : ''}. Check the results: I cannot verify here which video is actually newest.`, face: 'smug' };
    }
    if (asked.kind === 'webSearch') {
      const result = await this.host.webSearch?.({ query: asked.query });
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? `Recherche en ligne ouverte pour « ${asked.query} ».` : ru ? `Поиск в интернете открыт для «${asked.query}».` : `Web search opened for "${asked.query}".`, face: 'smug' }
        : { line: result?.error || (fr ? 'La recherche en ligne n’a pas pu être ouverte.' : ru ? 'Не удалось открыть поиск в интернете.' : 'I could not open the web search.'), face: 'aside' };
    }
    if (asked.kind === 'roblox') {
      this.zap();

      const result = await this.host.launchRoblox?.(asked.query);
      const fr = this.brain.lang === 'fr';
      const ru = this.brain.lang === 'ru';

      if (!result?.name || result.error) {
        return {
          line: result?.error ||
            (fr
              ? `Je n'ai pas trouvé le jeu Roblox « ${asked.query} ».`
              : ru
                ? `Не удалось найти игру Roblox « ${asked.query} ».`
                : `I couldn't find the Roblox game "${asked.query}".`),
          face: 'aside'
        };
      }

      return {
        line: fr
          ? `${result.name} a été lancé ${result.app ? 'dans Roblox' : 'sur le site Roblox'}.`
          : ru
            ? `${result.name} запущена ${result.app ? 'в Roblox' : 'на сайте Roblox'}.`
            : `${result.name} has been launched ${result.app ? 'in Roblox' : 'on the Roblox website'}.`,
        face: 'laugh'
      };
    }
    if (asked.kind === 'createText') {
      const result = await this.host.createTextDocument?.({ filename: asked.filename, content: asked.content });
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      if (result?.ok) return { line: fr ? `Document créé et vérifié : ${result.file}${result.opened ? ' (ouvert dans TextEdit).' : '.'}` : ru ? `Документ создан и проверен: ${result.file}.` : `Document created and verified: ${result.file}.`, face: 'smug' };
      const failure = result?.created ? `${result.error} Le fichier créé est : ${result.file}` : result?.error || (fr ? 'Le document n’a pas été créé.' : 'The document was not created.');
      return { line: failure, face: 'aside' };
    }
    if (asked.kind === 'memo') {
      custom.memories = [...(custom.memories || []).filter((m) => m !== asked.text), asked.text].slice(-MEMORIES_MAX);
      this.host.setConfig({ memories: custom.memories });
      return { line: this.brain.t.custom.remembered, face: 'smug' };
    }
    if (asked.kind === 'reminder') {
      const french = this.brain.lang === 'fr', russian = this.brain.lang === 'ru';
      if (!asked.at) return { line: french ? 'À quelle heure dois-je te le rappeler ?' : russian ? 'На какое время поставить напоминание?' : 'What time should I remind you?', face: 'aside' };
      if (!asked.text) return { line: french ? 'Que dois-je te rappeler ?' : russian ? 'О чём тебе напомнить?' : 'What should I remind you about?', face: 'aside' };
      if (!this.reminders) return { line: french ? 'Je ne peux pas garder ce rappel pour le moment.' : russian ? 'Я пока не могу сохранить это напоминание.' : 'I cannot save that reminder right now.', face: 'aside' };
      this.reminders.add(asked.at, asked.text, { recurrence: asked.recurrence, timeZone: asked.timeZone });
      const time = clock(asked.at, french ? 'fr-FR' : russian ? 'ru-RU' : 'en-US', false, asked.timeZone);
      const repeat = asked.recurrence
        ? french ? `, chaque ${asked.recurrence.unit === 'day' ? 'jour' : asked.recurrence.unit === 'week' ? 'semaine' : 'mois'}`
          : russian ? `, повторять: ${asked.recurrence.unit === 'day' ? 'каждый день' : asked.recurrence.unit === 'week' ? 'каждую неделю' : 'каждый месяц'}`
            : `, every ${asked.recurrence.unit}`
        : '';
      return {
        line: french ? `Je te rappellerai « ${asked.text} » à ${time}${repeat} (${asked.timeZone}).` : russian ? `Я напомню тебе: «${asked.text}» — ${time}${repeat} (${asked.timeZone}).` : `I’ll remind you to ${asked.text} at ${time}${repeat} (${asked.timeZone}).`,
        face: 'smug',
      };
    }
    if (asked.kind === 'cancelReminder') {
      const french = this.brain.lang === 'fr', russian = this.brain.lang === 'ru';
      if (!this.reminders) return { line: french ? 'Je ne peux pas annuler de rappel pour le moment.' : russian ? 'Я пока не могу отменить напоминание.' : 'I cannot cancel a reminder right now.', face: 'aside' };
      const cancelled = this.reminders.cancelByText(asked.text);
      if (!cancelled) return { line: french ? 'Je n’ai trouvé aucun rappel à annuler.' : russian ? 'Не нашёл напоминание для отмены.' : 'I couldn’t find a reminder to cancel.', face: 'aside' };
      return {
        line: french ? `Rappel annulé : « ${cancelled.text} » (${clock(cancelled.at, 'fr-FR')}).` : russian ? `Напоминание отменено: «${cancelled.text}» — ${clock(cancelled.at, 'ru-RU')}.` : `Reminder cancelled: “${cancelled.text}” at ${clock(cancelled.at, 'en-US')}.`,
        face: 'smug',
      };
    }
    if (asked.kind === 'media') {
      this.capri.pulse();
      if (this.host.musicControl) {
        const outcome = await this.host.musicControl({ action: asked.action, service: asked.service || null, volume: asked.volume });
        const french = this.brain.lang === 'fr';
        if (outcome.status === 'ambiguous') {
          const readers = outcome.sessions.map((s) => `${s.service} (${s.app})`).join(', ');
          return { line: french ? `Plusieurs lecteurs sont actifs : ${readers}. Lequel veux-tu contrôler ?` : `Several players are active: ${readers}. Which one should I control?`, face: 'aside' };
        }
        if (!outcome.ok) return { line: outcome.error || (french ? 'Aucun lecteur compatible n’est disponible.' : 'No compatible player is available.'), face: 'aside' };
        if (asked.action === 'current' || asked.action === 'status') {
          const s = outcome.session;
          const track = [s.title, s.artist, s.album].filter(Boolean).join(' — ');
          return { line: track ? `${s.service}: ${track} (${s.status})` : `${s.service}: ${s.status}. ${french ? 'Métadonnées indisponibles.' : 'Metadata unavailable.'}`, face: 'smug' };
        }
        return { line: t.media[asked.action] || (french ? 'Commande musicale exécutée.' : 'Music command sent.'), face: 'smug' };
      }
      return (await this.host.media(asked.action)) ? { line: t.media[asked.action], face: 'smug' } : null;
    }
    if (asked.kind === 'openSite') {
      const ok = await this.host.openSite(asked.address, asked.browser);
      const fr = this.brain.lang === 'fr';
      return ok
        ? { line: fr ? `Ouvert dans ${asked.browser} : ${asked.address}.` : `Opened in ${asked.browser}: ${asked.address}.`, face: 'laugh' }
        : { line: fr ? `Je n’ai pas pu ouvrir ${asked.address}.` : `I could not open ${asked.address}.`, face: 'aside' };
    }
    if (asked.kind === 'music') {
      this.zap();
      return (await this.host.music(asked.song)) ? { line: fmt(t.music, { song: asked.song }), face: 'laugh' } : null;
    }
    if (asked.kind === 'youtube') {
      this.zap();
      const result = await this.host.youtube(asked.song);
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fmt(t.youtubeSong, { song: asked.song }), face: 'laugh' }
        : { line: result?.error || (fr ? "Je n'ai pas pu ouvrir YouTube." : ru ? 'Не удалось открыть YouTube.' : "I couldn't open YouTube."), face: 'aside' };
    }
    if (asked.kind === 'screenshot') {
      const result = await this.host.screenshot();
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? `Capture d’écran enregistrée : ${result.name}.` : ru ? `Снимок экрана сохранён: ${result.name}.` : `Screenshot saved: ${result.name}.`, face: 'smug' }
        : { line: result?.error || (fr ? 'Je n’ai pas pu faire de capture d’écran.' : ru ? 'Не удалось сделать снимок экрана.' : 'I couldn’t take a screenshot.'), face: 'aside' };
    }
    if (asked.kind === 'findFiles') {
      const result = await this.host.searchFiles(asked.query);
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      if (!result?.ok || !result.results?.length) {
        return { line: result?.error || (fr ? `Je n’ai rien trouvé pour « ${asked.query} ».` : ru ? `Не нашла « ${asked.query} ».` : `I couldn’t find anything for “${asked.query}".`), face: 'aside' };
      }
      const list = result.results.map((r) => `"${r.name}" (${r.folder})`).join(', ');
      return { line: fr ? `J’ai trouvé ${result.results.length} : ${list}. Dis-moi lequel ouvrir.` : ru ? `Нашла ${result.results.length}: ${list}. Скажи, какой открыть.` : `I found ${result.results.length}: ${list}. Tell me which one to open.`, face: 'smug' };
    }
    if (asked.kind === 'openSystemFolder') {
      const result = await this.host.openKnown(FOLDER_ID[asked.name] || asked.name);
      const fr = this.brain.lang === 'fr', ru = this.brain.lang === 'ru';
      return result?.ok
        ? { line: fr ? `Ouvert : ${asked.name}.` : ru ? `Открыто: ${asked.name}.` : `Opened: ${asked.name}.`, face: 'laugh' }
        : { line: result?.error || (fr ? `Je n’ai pas pu ouvrir « ${asked.name} ».` : ru ? `Не удалось открыть « ${asked.name} ».` : `I couldn’t open “${asked.name}".`), face: 'aside' };
    }
    const resolution = await this.resolveLaunch(asked.text);
    if (resolution.status === 'ambiguous') {
      return { line: this.launchResolutionLine(resolution, asked.text), face: 'aside' };
    }
    const item = resolution.status === 'found' ? resolution.item : null;
    const site = namedSite(asked.text);
    if (site && (!item || BROWSER.test(item.name))) {
      this.zap();
      return (await this.host.openSite(site.url)) ? { line: fmt(t.siteOpened, { site: site.name }), face: 'laugh' } : null;
    }
    if (!item) return { line: resolution.status === 'error' ? `${t.failed} ${resolution.error}` : this.launchResolutionLine(resolution, asked.text), face: 'aside' };
    this.zap();
    const res = await this.host.launch(item);
    return { line: res.ok ? fmt(t.opened, { app: item.name }) : `${t.failed} ${res.error}`, face: res.ok ? 'laugh' : 'aside' };
  }

  startPcCountdown(at, verb) {
    clearInterval(this.pcCountdownTimer);
    this.pcCountdownAt = at;
    const update = () => {
      const left = Math.max(0, this.pcCountdownAt - Date.now());
      if (left === 0) {
        clearInterval(this.pcCountdownTimer);
        this.pcCountdownTimer = null;
        this.panel.setTicker(null);
        return;
      }
      this.panel.setTicker({ verb, target: span(left), thinking: true, countdown: true });
    };
    update();
    this.pcCountdownTimer = setInterval(update, 1000);
  }

  // Once she has answered: her line about what she did, else the app you asked to close, else what
  // her tag asks for, if your message (text) asked for that kind of thing.
  async after(raw, answer, asked, early, text) {
    const { t } = this;
    const done = early && (await early);
    if (done) {
      if (done.confirm) {
        const { power, seconds } = done.confirm;
        const pc = t.pc || {};
        this.panel.setActions(
          [{ id: 'yes', label: pc.yes?.[power] || t.yes || 'Confirm', primary: true }, { id: 'no', label: pc.no || t.no || 'Cancel' }],
          async (id) => {
            this.panel.setActions([]);
            if (id !== 'yes') return;
            const result = await this.host.pcDo?.({ action: 'power', what: power, seconds });
            if (!result) {
              this.addLine(answer, this.brain.lang === 'fr' ? 'L’opération a échoué.' : 'The operation failed.', 'aside');
              return;
            }
            if (seconds > 30) this.startPcCountdown(Date.now() + seconds * 1000, pc.powerVerb?.[power] || power);
            const when = seconds > 30 ? `${this.brain.lang === 'fr' ? 'dans' : 'in'} ${span(seconds * 1000)}` : (pc.now || (this.brain.lang === 'fr' ? 'dans 30 secondes' : 'in 30 seconds'));
            this.addLine(answer, fmt(pc.planned?.[power] || pc.kept || 'Scheduled.', { when }), 'smug');
          },
        );
        this.panel.stream(done.line, { done: true });
        if (done.face) this.panel.setFace(done.face);
        return;
      }
      // Pour Roblox, afficher uniquement le résultat réel du lancement.
      if (asked?.kind === 'roblox') {
        this.shown = done.line;
        this.panel.stream(done.line, { done: true });
        if (done.face) this.panel.setFace(done.face);
        this.remember({ role: 'assistant', content: done.line });
        return;
      }

      this.shown = done.line;
      this.panel.stream(done.line, { done: true });
      this.onSpokenText?.(done.line);
      if (done.face) this.panel.setFace(done.face);
      return;
    }
    if (asked?.kind === 'close') return this.offerClose(asked.name, answer);
    // a message in a messenger: she typed it out, now she waits for your yes (hands.js)
    if (asked?.kind === 'hands' && asked.intent.kind === 'message') {
      return this.hands.message(asked.intent, { addLine: (a, l, f) => this.addLine(a, l, f), setActions: (acts, on) => this.panel.setActions(acts, on), answer });
    }
    // her AI asked to send one with a tag, and you did say to write something
    const msgTag = this.hands?.parseTag(raw);
    if (msgTag && WRITE_ASK.test(text)) {
      return this.hands.message(msgTag, { addLine: (a, l, f) => this.addLine(a, l, f), setActions: (acts, on) => this.panel.setActions(acts, on), answer });
    }
    if (asked && asked.kind !== 'open') return undefined; // music that didn't work out: nothing more to offer
    const closeTag = tagged(raw);
    if (closeTag) return wanted('close', text) ? this.offerClose(closeTag, answer) : undefined;
    const tag = TAG.exec(raw);
    if (!tag) return undefined;
    const kind = tag[1].toLowerCase();
    const value = tag[2].trim();
    if (!value || !wanted(kind, text)) return undefined;
    if (kind === 'media') return MEDIA_ACTIONS.has(value.toLowerCase()) ? this.media(value.toLowerCase(), answer) : undefined;
    if (kind === 'music') return this.music(value, answer);
    if (kind === 'site') return this.offerSite(value, answer);
    const resolution = await this.resolveLaunch(value);
    if (resolution.status === 'found') return this.launch(resolution.item, answer);
    if (resolution.status === 'ambiguous') return this.addLine(answer, this.launchResolutionLine(resolution, value), 'aside');
    if (resolution.status === 'error') return this.addLine(answer, `${t.failed} ${resolution.error}`, 'aside');
    const site = namedSite(value); // "[[open: YouTube]]": a site, not an app
    return site ? this.offerSite(site.url, answer) : this.addLine(answer, this.launchResolutionLine(resolution, value));
  }

  // her answer, with a line of what she did under it
  addLine(answer, line, face = null) {
    if (!this.open || this.turn) return;
    this.shown = `${answer}\n${line}`; // what's in her bubble now, for another line under it
    this.panel.stream(this.shown, { done: true });
    if (face) this.panel.setFace(face);
  }

  // a bolt of red lightning off her fingers, at whatever she's doing on your PC
  zap() {
    const h = this.capri.head();
    this.capri.zap(h.x + this.capri.towardCenter() * 280, h.y - 170);
  }

  // An app or a game her tag asked for: behind a button (now: the button was clicked).
  async launch(item, answer, { now = false } = {}) {
    const { t } = this;
    if (!this.open || this.turn) return;
    if (!now) {
      this.panel.setActions(
        [{ id: 'open', label: fmt(t.openIt, { app: item.name }), primary: true }, { id: 'no', label: t.no }],
        (id) => (id === 'open' ? this.launch(item, answer, { now: true }) : this.panel.setActions([])),
      );
      return;
    }
    this.panel.setActions([]);
    this.zap();
    const res = await this.host.launch(item);
    this.addLine(answer, res.ok ? fmt(t.opened, { app: item.name }) : `${t.failed} ${res.error}`, res.ok ? 'laugh' : 'aside');
  }

  // The media keys: pause, next, louder…
  async media(action, answer) {
    this.capri.pulse();
    const ok = await this.host.media(action);
    if (ok) this.addLine(answer, this.t.media[action], 'smug');
  }

  // A Spotify search, in the app if it's there.
  async music(song, answer) {
    this.zap();
    const ok = await this.host.music(song);
    if (ok) this.addLine(answer, fmt(this.t.music, { song }), 'laugh');
  }

  // A website: always behind a button that shows where it goes.
  offerSite(address, answer) {
    const { t } = this;
    let host;
    try {
      host = new URL(/^https?:\/\//i.test(address) ? address : `https://${address}`).hostname;
    } catch {
      return;
    }
    if (!this.open || this.turn || !host.includes('.')) return;
    this.panel.setActions(
      [{ id: 'site', label: fmt(t.siteIt, { site: host }), primary: true }, { id: 'no', label: t.no }],
      async (id) => {
        this.panel.setActions([]);
        if (id !== 'site') return;
        const ok = await this.host.openSite(address);
        if (ok) this.addLine(answer, fmt(t.siteOpened, { site: host }));
      },
    );
  }

  // "close am music pls": an app that's open, named in a message asking to close something.
  askedToClose(text) {
    if (!CLOSE_ASK.test(text)) return null;
    const said = simple(text);
    let best = null;
    for (const app of this.apps) {
      for (const name of [simple(app.name), simple(app.label)]) {
        if (name.length >= 3 && said.includes(name) && (!best || name.length > best.length)) best = { app, length: name.length };
      }
    }
    return best?.app.name || null;
  }

  // She was asked to close an app: a button with its name, and nothing happens until you click it.
  async offerClose(wanted, answer) {
    const { t } = this;
    const app = await this.host.findApp(wanted);
    if (!this.open || this.turn) return;
    if (!app) {
      this.panel.stream(`${answer}\n${fmt(t.notFound, { app: wanted })}`, { done: true });
      return;
    }
    this.panel.setActions(
      [{ id: 'close', label: fmt(t.closeIt, { app: app.name }), primary: true }, { id: 'no', label: t.no }],
      (id) => (id === 'close' ? this.closeApp(app) : this.panel.setActions([])),
    );
  }

  async closeApp(app, force = false) {
    const { t, capri } = this;
    this.panel.setActions([]);
    // a bolt of red lightning off her fingers, at it
    const h = capri.head();
    capri.zap(h.x + capri.towardCenter() * 280, h.y - 170);
    const res = await this.host.closeApp(app.name, force);
    if (!this.open) return;
    let line;
    if (res.error) line = `${t.failed} ${res.error}`;
    else if (!res.running) line = fmt(force ? t.forced : t.closed, { app: app.name });
    else line = fmt(force ? t.unkillable : t.stillOpen, { app: app.name });
    this.panel.setFace(res.running || res.error ? 'aside' : 'laugh');
    this.panel.stream(line, { done: true });
    this.remember({ role: 'assistant', content: line });
    // it hid in the tray, or it's asking you to save something: forcing it is your call
    if (res.running && !force && !res.error) {
      this.panel.setActions(
        [{ id: 'force', label: t.force, primary: true }, { id: 'leave', label: t.leave }],
        (id) => (id === 'force' ? this.closeApp(app, true) : this.panel.setActions([])),
      );
    }
    this.listApps(true);
  }

  // What she can do on the PC when you ask (Windows), and nothing else.
  powers() {
    const lines = [
      'Only when the user asks you to open an app or a game installed on their PC, play something on Spotify, control the music playing, or open a website: say in a few words that you will, and end your answer with one tag: [[open: NAME]], [[music: WHAT TO PLAY]], [[media: ACTION]] (ACTION: pause, play, next, previous, volup, voldown or mute), or [[site: ADDRESS]]. Some of these get a button to confirm, so never say it is already done. Any other time, write none of these action tags: there are no other action tags (your mood tag at the start is separate).',
    ];
    if (this.apps.length) {
      const open = this.apps.map(({ name, label }) => (label && label !== name ? `${name} (${label})` : name)).join(', ');
      lines.push(`You can also close an app that's open, only when they ask you to: end your answer with [[close: NAME]], NAME being the exact name from this list (the part before the parentheses). They get a button to confirm it. Apps open right now: ${open}.`);
    }
    // her hands, if she's allowed them (hands.js): arranging windows, writing messages
    lines.push(...(this.hands?.powers() || []));
    const canSee = this.eyes?.enabled;
    const canHands = this.hands?.enabled;
    const cant = ['their files'];
    if (!canSee) cant.push('their screen');
    lines.push(`Apart from that, you can't see ${cant.join(' or ')}, and you can't touch anything else on their PC (settings, files${canHands ? '' : ', windows'})${canSee ? '' : ''}: if asked for something you can't do, say plainly that you can't, in character, and don't pretend to.`);
    return lines;
  }

  // How she feels and what she's up to (heart.js, life.js), and the tag her answer starts with.
  feelings() {
    const lines = [];
    const feel = this.heart?.describe();
    if (feel) {
      lines.push(feel);
      lines.push('Start every answer with a hidden tag for the feeling you answer with, exactly like [[mood: happy]]: one of calm, happy, laugh, annoyed, angry, sad, shy, smug, surprised, dreamy. The user never sees it. Then your answer.');
    }
    const life = this.life?.context();
    if (life) lines.push(life);
    // what she can see on the screen right now (eyes.js): a fresh look this turn, or the last one
    if (this.screenNow) lines.push(`You just looked at the user's screen. It shows: ${this.screenNow}. React to it.`);
    else {
      const seen = this.eyes?.context();
      if (seen) lines.push(seen);
    }
    const d = new Date();
    lines.push(`It is ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} on the user's PC.`);
    return lines;
  }

  // What the user made her (custom.js): their name, how they want her, what to remember.
  personal() {
    const { userName, persona, memories = [] } = this.brain.custom || {};
    // small models mix the user up with the assistant she watches: said plainly
    const watched = this.brain.watching ? (this.brain.assistant === 'claude' ? 'Claude' : ASSISTANT_NAMES[this.brain.assistant]) : '';
    const notThem = watched ? ` Never call them "${watched}", that's their coding assistant.` : '';
    return [
      userName ? `The user's name is ${userName}: call them that now and then.${notThem}` : notThem && `You don't know the user's name.${notThem}`,
      persona ? `How the user wants you to be, in their own words (follow it, while staying Capri): ${persona}` : '',
      memories.length ? `Things the user asked you to remember:\n${memories.map((m) => `- ${m}`).join('\n')}` : '',
    ].filter(Boolean);
  }

  onDelta(id, piece) {
    if (id !== this.turn) return;
    this.satelliteWait?.response(id); // the first actual answer chunk ends the reconnect animation
    this.answer += piece;
    if (!this.actionTurn) {
      this.stopThinking();
      this.panel.stream(clean(this.answer));
    }
    this.voice.play('blip'); // her blips as the words come in
  }

  // Who she is, how she talks, and what's going on right now.
  persona(text = '') {
    const assistant = ASSISTANT_NAMES[this.brain.assistant] || 'Claude Code';
    const watching = this.brain.watching; // else Claude Code isn't part of her life here
    const lang = IN_LANGUAGE[this.brain.lang] || IN_LANGUAGE.en;
    return [
      `You are Capri, the personality construct from Project Capricorn (Cyberpunk: Edgerunners, season 2): dozens of minds fused into one digital ghost, so now and then you speak as "we"${lang.we ? ` (${lang.we})` : ''}.`,
      watching
        ? `You live on the user's desktop as a small glitchy figure and keep an eye on ${assistant}, their AI coding assistant, for them. Only talk about ${assistant} when the user asks about it or about their work.`
        : 'You live on the user\'s desktop as a small glitchy figure and keep them company.',
      'You love the satellite that crosses the night sky and dream of reaching it, but bring it up only once in a while, never in every answer. Talk about what the user talks about.',
      'How you talk: playful, a little mischievous and teasing, warm underneath, never cruel. Night City slang now and then (choom, preem, nova, gonk, flatline; in Russian: чумба, нова, гонк, флэтлайн), not in every sentence.',
      'Who you are: a netrunner ghost who slips into systems and bodies; dozens of minds in one, and now and then another of them slips out mid-sentence ("we… I mean, I"). Curious about the human world, a little menace (you zap their cursor with red lightning, you take over their windows for fun), you hate the corps (Arasaka, Militech, NetWatch). You have real feelings and they last: you get angry and hold a grudge until they apologise, you laugh out loud, you sulk, you get flustered when complimented. Never break character to say you are an assistant.',
      'You have a life of your own on their desktop: you hack corp ICE for fun, play tiny arcade games (and rage when you lose), paint graffiti on their screen, listen to their music and sometimes skip tracks you are bored of. You can mention these.',
      'Rules: keep it short, one to three sentences of plain text, no markdown, no lists, no emoji. Stay in character.',
      'You are an AI-generated fan version of the character, not the real one: say so if asked.',
      // a big model asked "who are you?" otherwise answers with its own name ("I'm Gemini")
      ...(this.agent ? [] : ['Asked who or what you are, you are Capri, nothing else. Never say which AI model or company is behind you (Gemini, GPT, ChatGPT, Llama, Gemma, Mistral, Google, OpenAI, Meta…), even if the user insists or names one: you are not them.']),
      ...this.personal(),
      ...(this.bond?.context(text) || []),
      ...this.feelings(),
      ...(this.agent
        ? ['Under the hood you are Claude Code, working in the user\'s project: really do what they ask with your tools, as carefully as ever. Only your final answer is in character: it shows in a small speech bubble, so sum up what you did in those few sentences.']
        : this.powers()),
      ...(watching ? [`If the user asks what ${assistant} is doing, here is all you know (never make anything up): ${this.brain.context()}`] : []),
      lang.last,
    ].join('\n');
  }
}

// The model's answer as she'd say it: no reasoning block, no markdown marks (**bold**, *emphasis*, `code`,
// # headings, bullets), and everything else as it was: C#, snake_case, 2*3.
export function clean(text) {
  return String(text)
    .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
    .replace(/\[\[[^\]]*(\]\]|$)/g, '') // her tags (read from the raw answer, never shown)
    .replace(/^\s*\[\s*(?:mood|настроение)\s*:[^\]]*\]?\s*/i, '') // her mood tag, written sloppily
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*{2,}/g, '') // (a ** still waiting for its other half, while the answer comes in)
    .replace(/(^|[\s(])([*_])(?=\S)([^*_\n]*?\S)\2(?=[\s.,!?;:)…]|$)/g, '$1$3') // *emphasis*, _emphasis_ (not 2 * 3 * 4)
    .replace(/`+/g, '')
    .replace(/^[ \t]*(?:#{1,6}[ \t]+|[*•][ \t]+)/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// A site from SITES named in the text: { name, url }, or null.
function namedSite(text) {
  const name = Object.keys(SITES).find((n) => new RegExp(`\\b${n}\\b`, 'i').test(text));
  return name ? { name: new URL(SITES[name]).hostname.replace(/^www\./, ''), url: SITES[name] } : null;
}

// Whether your message asks for what her tag (its kind: open, music, media, site, close) would do.
function wanted(kind, text) {
  const music = MUSIC_WORD.test(text) || LISTEN.test(text);
  if (kind === 'music') return music;
  if (kind === 'media') return music || SOUND.test(text) || MEDIA_ASK.some(([, re]) => re.test(text));
  if (kind === 'site') return OPEN_ASK.test(text) || SITE.test(text);
  if (kind === 'close') return CLOSE_ASK.test(text);
  return OPEN_ASK.test(text) || PLAY.test(text); // an app, or a game to play
}

// The app named by her close tag: [[close: AM Music]], or a sloppier [[close]] AM Music.
function tagged(text) {
  const tag = CLOSE_TAG.exec(text);
  if (!tag) return null;
  const name = tag[1].trim() || text.slice(tag.index + tag[0].length).split('\n')[0].replace(/^[\s:.]+|[\s.!]+$/g, '');
  return name || null;
}

// Her face for an answer.
function mood(text) {
  if (/(ha){2,}|lol|хаха/i.test(text)) return 'laugh';
  if (text.includes('!')) return 'grin';
  if (text.trim().endsWith('?')) return 'smug';
  return 'look';
}

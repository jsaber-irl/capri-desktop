'use strict';

// The tray menu (and the one she opens when you right-click her), in the languages she speaks.

const TRAY = {
  en: {
    name: 'English',
    mood: (m) => `Mood: ${m}`, moods: { calm: 'calm', happy: 'in a good mood', angry: 'angry', annoyed: 'annoyed', sad: 'sad', shy: 'flustered', bored: 'bored' },
    character: 'Character', emotions: 'Emotions (anger, laughs, sulking)', life: 'Her own activities', dj: 'DJ mode (she skips tracks)', musicAware: 'Know what’s playing', learn: 'Learns about me (adapts to me)', bond: 'What she knows about me…',
    colors: 'Colours', themes: { classic: 'Red (like the anime)', netrunner: 'Netrunner (cyan)', toxic: 'Toxic (acid green)', violet: 'Violet', gold: 'Gold', sakura: 'Sakura (pink)', ghost: 'Ghost (white)', mood: 'Follow her mood' },
    voice: 'Voice', voiceOff: 'Silent (blips only)', voiceChat: 'Reads her chat answers', voiceAll: 'Reads everything she says', voiceEngine: 'Engine', engines: { piper: 'Piper (light, on this PC, run by her)', system: 'System voice (offline, free)', chatterbox: 'Chatterbox (on this PC, started by her)', openai: 'OpenAI (key)', elevenlabs: 'ElevenLabs (key)', custom: 'OpenAI-compatible server (local)' }, voiceFx: '“Many minds” effect', voiceSetup: 'Key, address or voice…', voiceTest: 'Test her voice', voiceKeyPage: 'Where do I get a key?',
    senses: 'Senses', vision: 'Let her see my screen', lookNow: 'Look at my screen', rhythm: 'Move to my music', ears: 'Listen to me (mic)', converse: 'Conversation mode', pushToTalk: 'Press to talk', visionSetup: 'Vision model…', earsSetup: 'Speech-to-text…', hands: 'Hands', handsOn: 'Let her work my windows', handsType: 'Let her type messages',
    online: (port) => `Capri — listening on ${port}`,
    teleport: 'Teleport', satellite: 'Look at the satellite', demo: 'Play demo', handstand: 'Do a handstand', stopHandstand: 'Stop handstand', handstandNone: 'No detectable windows', handstandPermission: 'Allow window access…', handstandExplain: 'Capri needs macOS permission to list windows (Automation / Accessibility).', handstandUnsupported: 'Window detection unavailable', terminal: 'Capri terminal', help: 'How does it work?', prepare: 'Setup (Ollama and Chatterbox)…', hub: 'Main menu (AI and set-up)…',
    report: 'Mission report', incomingCall: 'Receive a call from Capri', talk: 'Talk to her', ring: 'Circular menu', custom: 'Make her yours…', chatModel: 'AI model', aiSetup: 'Set it up with her…', apiKey: 'API key or address…', noOllama: 'Ollama not found',
    rest: 'When she rests', restCorner: 'In her corner', restTaskbar: 'Sitting on the taskbar', watch: 'Watch', watchNone: 'Nothing, just keep me company',
    motion: 'Animations', motionAuto: 'Like Windows', motionFull: 'Full', motionReduced: 'Reduced',
    display: 'Display', displayAuto: 'Normal', displayGl: 'OpenGL (if her background is black)', displaySoftware: 'Without the graphics card (if still black)',
    show: 'Bring her back', hide: 'Put her away',
    size: 'Size', small: 'Small', medium: 'Medium', large: 'Large', sound: 'Sound', mute: 'Mute',
    soundsDir: 'Open custom sounds folder', screen: 'Display Capri uses', screenDescription: 'Choose Capri’s display. “Look at my screen” captures this display; choosing it does not take a screenshot.', wander: 'Wander around when idle',
    possess: 'Possess my windows', possessMove: 'Move them while she has them', lang: 'Language', auto: 'Automatic (system)', startup: 'Start with Windows',
    hooksOn: 'Claude Code hooks: installed', hooksOff: 'Install Claude Code hooks',
    hooksRemove: 'Remove Claude Code hooks', forget: 'Forget our conversations', quit: 'Quit',
    version: 'About Capri', macPermissions: 'macOS permissions…',
  },
  ru: {
    name: 'Русский',
    mood: (m) => `Настроение: ${m}`, moods: { calm: 'спокойна', happy: 'в духе', angry: 'злится', annoyed: 'не в духе', sad: 'грустит', shy: 'смущена', bored: 'скучает' },
    character: 'Характер', emotions: 'Эмоции (злость, смех, обиды)', life: 'Свои занятия на экране', dj: 'Режим DJ (сама переключает треки)', musicAware: 'Знать, что играет', learn: 'Узнаёт меня (саморазвитие)', bond: 'Что она обо мне знает…',
    colors: 'Цвет', themes: { classic: 'Красный (как в аниме)', netrunner: 'Нетраннер (циан)', toxic: 'Токсичный (кислотно-зелёный)', violet: 'Фиолетовый', gold: 'Золото', sakura: 'Сакура (розовый)', ghost: 'Призрак (белый)', mood: 'По настроению' },
    voice: 'Голос', voiceOff: 'Молчит (только писк)', voiceChat: 'Озвучивает ответы в чате', voiceAll: 'Озвучивает всё, что говорит', voiceEngine: 'Движок', engines: { piper: 'Piper (лёгкий, на этом ПК, запускает она)', system: 'Системный голос (офлайн, бесплатно)', chatterbox: 'Chatterbox (на этом ПК, запускает она)', openai: 'OpenAI (ключ)', elevenlabs: 'ElevenLabs (ключ)', custom: 'Свой сервер, совместимый с OpenAI' }, voiceFx: 'Эффект «множества разумов»', voiceSetup: 'Ключ, адрес или голос…', voiceTest: 'Проверить голос', voiceKeyPage: 'Где взять ключ?',
    senses: 'Чувства', vision: 'Разрешить видеть мой экран', lookNow: 'Посмотри на экран', rhythm: 'Двигаться под мою музыку', ears: 'Слушать меня (микрофон)', converse: 'Режим разговора', pushToTalk: 'Чтобы говорить', visionSetup: 'Модель зрения…', earsSetup: 'Распознавание речи…', hands: 'Руки', handsOn: 'Разрешить управлять окнами', handsType: 'Разрешить писать сообщения',
    online: (port) => `Capri — слушаю порт ${port}`,
    teleport: 'Телепортироваться', satellite: 'Посмотреть на спутник', demo: 'Запустить демо', handstand: 'Встать на руки', stopHandstand: 'Перестать стоять на руках', handstandNone: 'Окна не обнаружены', handstandPermission: 'Разрешить доступ к окнам…', handstandExplain: 'Capri нужно разрешение macOS для списка окон (Автоматизация / Универсальный доступ).', handstandUnsupported: 'Обнаружение окон недоступно', terminal: 'Терминал Capri', help: 'Как это работает?', prepare: 'Подготовка (Ollama и Chatterbox)…', hub: 'Главное меню (нейросети и установка)…',
    report: 'Отчёт о миссиях', incomingCall: 'Принять звонок от Капри', talk: 'Поговорить с ней', ring: 'Круговое меню', custom: 'Настроить её…', chatModel: 'ИИ-модель', aiSetup: 'Выбрать вместе с ней…', apiKey: 'API-ключ или адрес…', noOllama: 'Ollama не найдена',
    rest: 'Когда она отдыхает', restCorner: 'В своём углу', restTaskbar: 'Сидит на панели задач', watch: 'Что отслеживать', watchNone: 'Ничего, просто будь рядом',
    motion: 'Анимации', motionAuto: 'Как в Windows', motionFull: 'Все', motionReduced: 'Минимум',
    display: 'Отображение', displayAuto: 'Обычное', displayGl: 'OpenGL (если её фон чёрный)', displaySoftware: 'Без видеокарты (если всё ещё чёрный)',
    show: 'Вернуть её', hide: 'Спрятать',
    size: 'Размер', small: 'Маленькая', medium: 'Средняя', large: 'Большая', sound: 'Звук', mute: 'Без звука',
    soundsDir: 'Открыть папку своих звуков', screen: 'Экран, где находится Capri', screenDescription: 'Выберите экран для Capri. «Посмотри на экран» использует его для снимка; выбор сам снимок не делает.', wander: 'Гулять, когда ничего не происходит',
    possess: 'Вселяться в мои окна', possessMove: 'Двигать окна, в которые вселилась', lang: 'Язык', auto: 'Автоматически (системный)', startup: 'Запускать вместе с Windows',
    hooksOn: 'Хуки Claude Code: установлены', hooksOff: 'Установить хуки Claude Code',
    hooksRemove: 'Удалить хуки Claude Code', forget: 'Забыть наши разговоры', quit: 'Выйти',
    version: 'О Capri', macPermissions: 'Разрешения macOS…',
  },
  fr: {
    name: 'Français',
    mood: (m) => `Humeur : ${m}`, moods: { calm: 'calme', happy: 'de bonne humeur', angry: 'en colère', annoyed: 'agacée', sad: 'triste', shy: 'embarrassée', bored: 'ennuyée' },
    character: 'Caractère', emotions: 'Émotions (colère, rires, bouderie)', life: 'Ses activités', dj: 'Mode DJ (elle change les morceaux)', musicAware: 'Savoir ce qui joue', learn: 'Apprendre à me connaître', bond: 'Ce qu’elle sait de moi…',
    colors: 'Couleurs', themes: { classic: 'Rouge (comme dans l’anime)', netrunner: 'Netrunner (cyan)', toxic: 'Toxique (vert acide)', violet: 'Violet', gold: 'Or', sakura: 'Sakura (rose)', ghost: 'Fantôme (blanc)', mood: 'Suivre son humeur' },
    voice: 'Voix', voiceOff: 'Silencieuse (bips uniquement)', voiceChat: 'Lire ses réponses du chat', voiceAll: 'Tout lire à voix haute', voiceEngine: 'Moteur', engines: { piper: 'Piper (léger, sur ce PC)', system: 'Voix système (hors ligne, gratuite)', chatterbox: 'Chatterbox (sur ce PC)', openai: 'OpenAI (clé)', elevenlabs: 'ElevenLabs (clé)', custom: 'Serveur compatible OpenAI (local)' }, voiceFx: 'Effet « plusieurs esprits »', voiceSetup: 'Clé, adresse ou voix…', voiceTest: 'Tester sa voix', voiceKeyPage: 'Où obtenir une clé ?',
    senses: 'Sens', vision: 'L’autoriser à voir mon écran', lookNow: 'Regarder mon écran', rhythm: 'Bouger avec ma musique', ears: 'M’écouter (micro)', converse: 'Mode conversation', pushToTalk: 'Appuyer pour parler', visionSetup: 'Modèle de vision…', earsSetup: 'Reconnaissance vocale…', hands: 'Mains', handsOn: 'L’autoriser à gérer mes fenêtres', handsType: 'L’autoriser à écrire des messages',
    online: (port) => `Capri — écoute sur le port ${port}`,
    teleport: 'Téléportation', satellite: 'Regarder le satellite', demo: 'Lancer la démo', handstand: 'Faire le poirier', stopHandstand: 'Arrêter de faire le poirier', handstandNone: 'Aucune fenêtre détectée', handstandPermission: 'Autoriser l’accès aux fenêtres…', handstandExplain: 'Capri a besoin d’autorisations macOS pour lister les fenêtres (Automatisation / Accessibilité).', handstandUnsupported: 'Détection des fenêtres indisponible', terminal: 'Terminal Capri', help: 'Comment ça marche ?', prepare: 'Configuration (Ollama et Chatterbox)…', hub: 'Menu principal (IA et installation)…',
    report: 'Rapport de mission', incomingCall: 'Recevoir un appel de Capri', talk: 'Lui parler', ring: 'Menu circulaire', custom: 'La personnaliser…', chatModel: 'Modèle IA', aiSetup: 'Configurer avec elle…', apiKey: 'Clé ou adresse API…', noOllama: 'Ollama introuvable',
    rest: 'Quand elle se repose', restCorner: 'Dans son coin', restTaskbar: 'Sur la barre des tâches', watch: 'Surveiller', watchNone: 'Rien, juste me tenir compagnie',
    motion: 'Animations', motionAuto: 'Comme Windows', motionFull: 'Toutes', motionReduced: 'Réduites',
    display: 'Affichage', displayAuto: 'Normal', displayGl: 'OpenGL (si son fond est noir)', displaySoftware: 'Sans carte graphique (si le fond reste noir)',
    show: 'La faire revenir', hide: 'La cacher',
    size: 'Taille', small: 'Petite', medium: 'Moyenne', large: 'Grande', sound: 'Son', mute: 'Muet',
    soundsDir: 'Ouvrir le dossier des sons personnalisés', screen: 'Écran utilisé par Capri', screenDescription: 'Choisissez l’écran de Capri. « Regarder mon écran » capture cet écran ; le sélectionner ne déclenche aucune capture.', wander: 'Se promener au repos',
    possess: 'Posséder mes fenêtres', possessMove: 'Les déplacer pendant qu’elle les possède', lang: 'Langue', auto: 'Automatique (système)', startup: 'Démarrer avec Windows',
    version: 'À propos de Capri', macPermissions: 'Autorisations macOS…',
    hooksOn: 'Hooks Claude Code : installés', hooksOff: 'Installer les hooks Claude Code',
    hooksRemove: 'Supprimer les hooks Claude Code', forget: 'Oublier nos conversations', quit: 'Quitter',
  },
};

// (the order of the Language submenu)
const LANGS = ['ru', 'en', 'fr'];

module.exports = { TRAY, LANGS };

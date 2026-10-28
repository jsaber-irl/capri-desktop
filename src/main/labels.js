'use strict';

// The tray menu (and the one she opens when you right-click her), in the two languages she speaks.

const TRAY = {
  en: {
    name: 'English',
    mood: (m) => `Mood: ${m}`, moods: { calm: 'calm', happy: 'in a good mood', angry: 'angry', annoyed: 'annoyed', sad: 'sad', shy: 'flustered', bored: 'bored' },
    character: 'Character', emotions: 'Emotions (anger, laughs, sulking)', life: 'Her own activities', dj: 'DJ mode (she skips tracks)', musicAware: 'Know what’s playing', learn: 'Learns about me (adapts to me)', bond: 'What she knows about me…',
    colors: 'Colours', themes: { classic: 'Red (like the anime)', netrunner: 'Netrunner (cyan)', toxic: 'Toxic (acid green)', violet: 'Violet', gold: 'Gold', sakura: 'Sakura (pink)', ghost: 'Ghost (white)', mood: 'Follow her mood' },
    voice: 'Voice', voiceOff: 'Silent (blips only)', voiceChat: 'Reads her chat answers', voiceAll: 'Reads everything she says', voiceEngine: 'Engine', engines: { piper: 'Piper (light, on this PC, run by her)', system: 'System voice (offline, free)', chatterbox: 'Chatterbox (on this PC, started by her)', openai: 'OpenAI (key)', elevenlabs: 'ElevenLabs (key)', custom: 'OpenAI-compatible server (local)' }, voiceFx: '“Many minds” effect', voiceSetup: 'Key, address or voice…', voiceTest: 'Test her voice', voiceKeyPage: 'Where do I get a key?',
    senses: 'Senses', vision: 'Let her see my screen', lookNow: 'Look at my screen', rhythm: 'Move to my music', ears: 'Listen to me (mic)', converse: 'Conversation mode', pushToTalk: 'Press to talk', visionSetup: 'Vision model…', earsSetup: 'Speech-to-text…', hands: 'Hands', handsOn: 'Let her work my windows', handsType: 'Let her type messages',
    online: (port) => `Capri — listening on ${port}`,
    teleport: 'Teleport', satellite: 'Look at the satellite', demo: 'Play demo', help: 'How does it work?', prepare: 'Setup (Ollama and Chatterbox)…', hub: 'Main menu (AI and set-up)…',
    report: 'Mission report', talk: 'Talk to her', ring: 'Circular menu', custom: 'Make her yours…', chatModel: 'AI model', aiSetup: 'Set it up with her…', apiKey: 'API key or address…', noOllama: 'Ollama not found',
    rest: 'When she rests', restCorner: 'In her corner', restTaskbar: 'Sitting on the taskbar', watch: 'Watch', watchNone: 'Nothing, just keep me company',
    motion: 'Animations', motionAuto: 'Like Windows', motionFull: 'Full', motionReduced: 'Reduced',
    display: 'Display', displayAuto: 'Normal', displayGl: 'OpenGL (if her background is black)', displaySoftware: 'Without the graphics card (if still black)',
    show: 'Bring her back', hide: 'Put her away',
    size: 'Size', small: 'Small', medium: 'Medium', large: 'Large', sound: 'Sound', mute: 'Mute',
    soundsDir: 'Open custom sounds folder', screen: 'Screen', wander: 'Wander around when idle',
    possess: 'Possess my windows', possessMove: 'Move them while she has them', lang: 'Language', auto: 'Automatic (system)', startup: 'Start with Windows',
    hooksOn: 'Claude Code hooks: installed', hooksOff: 'Install Claude Code hooks',
    hooksRemove: 'Remove Claude Code hooks', forget: 'Forget our conversations', quit: 'Quit',
  },
  fr: {
    name: 'Français',
    mood: (m) => `Humeur : ${m}`, moods: { calm: 'calme', happy: 'de bonne humeur', angry: 'en colère', annoyed: 'agacée', sad: 'triste', shy: 'troublée', bored: 'ennuyée' },
    character: 'Caractère', emotions: 'Émotions (colère, rires, bouderie)', life: 'Ses activités', dj: 'Mode DJ (elle change les morceaux)', musicAware: 'Savoir ce qui joue', learn: 'Apprendre à me connaître', bond: 'Ce qu’elle sait de moi…',
    colors: 'Couleurs', themes: { classic: 'Rouge (comme l’anime)', netrunner: 'Netrunner (cyan)', toxic: 'Toxique (vert acide)', violet: 'Violet', gold: 'Or', sakura: 'Sakura (rose)', ghost: 'Fantôme (blanc)', mood: 'Suivre son humeur' },
    voice: 'Voix', voiceOff: 'Silencieuse (bips uniquement)', voiceChat: 'Lire ses réponses', voiceAll: 'Lire tout ce qu’elle dit', voiceEngine: 'Moteur', engines: { piper: 'Piper (léger, sur ce PC)', system: 'Voix système (hors ligne, gratuite)', chatterbox: 'Chatterbox (sur ce PC)', openai: 'OpenAI (clé)', elevenlabs: 'ElevenLabs (clé)', custom: 'Serveur compatible OpenAI' }, voiceFx: 'Effet « plusieurs esprits »', voiceSetup: 'Clé, adresse ou voix…', voiceTest: 'Tester sa voix', voiceKeyPage: 'Où obtenir une clé ?',
    senses: 'Sens', vision: 'L’autoriser à voir mon écran', lookNow: 'Regarder mon écran', rhythm: 'Bouger avec ma musique', ears: 'M’écouter (micro)', converse: 'Mode conversation', pushToTalk: 'Appuyer pour parler', visionSetup: 'Modèle de vision…', earsSetup: 'Reconnaissance vocale…', hands: 'Mains', handsOn: 'L’autoriser à gérer mes fenêtres', handsType: 'L’autoriser à saisir du texte',
    online: (port) => `Capri — écoute sur le port ${port}`,
    teleport: 'Téléporter', satellite: 'Regarder le satellite', demo: 'Lancer la démo', help: 'Comment ça marche ?', prepare: 'Configuration (Ollama et Chatterbox)…', hub: 'Menu principal (IA et installation)…',
    report: 'Rapport de mission', talk: 'Lui parler', ring: 'Menu circulaire', custom: 'La personnaliser…', chatModel: 'Modèle d’IA', aiSetup: 'Configurer avec elle…', apiKey: 'Clé API ou adresse…', noOllama: 'Ollama introuvable',
    rest: 'Quand elle se repose', restCorner: 'Dans son coin', restTaskbar: 'Sur la barre des tâches', watch: 'Surveiller', watchNone: 'Rien, juste rester avec moi',
    motion: 'Animations', motionAuto: 'Comme Windows', motionFull: 'Toutes', motionReduced: 'Réduites',
    display: 'Affichage', displayAuto: 'Normal', displayGl: 'OpenGL (si le fond est noir)', displaySoftware: 'Sans carte graphique (si le fond reste noir)',
    show: 'La faire revenir', hide: 'La ranger',
    size: 'Taille', small: 'Petite', medium: 'Moyenne', large: 'Grande', sound: 'Son', mute: 'Muet',
    soundsDir: 'Ouvrir le dossier des sons', screen: 'Écran', wander: 'Se déplacer quand elle est inactive',
    possess: 'Posséder mes fenêtres', possessMove: 'Déplacer les fenêtres possédées', lang: 'Langue', auto: 'Automatique (système)', startup: 'Démarrer avec Windows',
    hooksOn: 'Hooks Claude Code : installés', hooksOff: 'Installer les hooks Claude Code',
    hooksRemove: 'Supprimer les hooks Claude Code', forget: 'Oublier nos conversations', quit: 'Quitter',
  },
};

// (the order of the Language submenu)
const LANGS = ['en', 'fr'];

module.exports = { TRAY, LANGS };

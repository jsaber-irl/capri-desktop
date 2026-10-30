# Structure du projet Capri

## Architecture

Capri est une application Electron. Le processus Main contrôle les fenêtres, les services système, la configuration et les connexions externes. Les pages Renderer dessinent l’overlay, les menus et les fenêtres dédiées. Les preloads exposent des fonctions ciblées par contextBridge; les Renderers n’obtiennent pas directement Node.js. Les processus échangent par IPC.

Flux courant : événement de hook ou action utilisateur → Main/IPC → service métier (IA, système, fichiers ou audio) → résultat → Renderer. Les appels IA, la transcription cloud et la vision peuvent transmettre les données nécessaires au fournisseur choisi.

## Arborescence versionnée complète

Arbre construit à partir des 244 chemins suivis par Git au début de l’audit. Quatre fichiers créés pour cet audit ou sa correction sont également listés dans l’index : STRUCTURE.md, SECURITY_AUDIT.md, src/main/electron-security.js et tests/electron-security.test.js. node_modules et fichiers locaux ignorés sont exclus.

~~~text
capri-desktop-main-main/
├── .github/
│   ├── workflows/
│   │   └── release.yml
│   └── RELEASE_NEWS.md
├── assets/
│   ├── capri/
│   │   ├── capri-cutout.png
│   │   ├── capri-face.png
│   │   ├── capri-full.png
│   │   ├── cutin-eyes.png
│   │   ├── cutin-grin.png
│   │   ├── cutin-laugh.png
│   │   ├── cutin-look.png
│   │   ├── cutin-many.png
│   │   ├── face-aside.png
│   │   ├── face-calm.png
│   │   ├── face-laugh.png
│   │   ├── face-look.png
│   │   ├── face-many.png
│   │   ├── face-smug.png
│   │   ├── face-wide.png
│   │   ├── intro-grab.webp
│   │   ├── intro-happy.webp
│   │   ├── intro-mouth1.webp
│   │   ├── intro-mouth2.webp
│   │   ├── intro-mouth3.webp
│   │   ├── intro-smear.webp
│   │   ├── intro-wave1.webp
│   │   ├── intro-wave2.webp
│   │   └── intro-wave3.webp
│   ├── fonts/
│   │   ├── chakra-petch-latin-600-normal.woff2
│   │   ├── chakra-petch-latin-700-normal.woff2
│   │   ├── jetbrains-mono-cyrillic-400-normal.woff2
│   │   ├── jetbrains-mono-cyrillic-600-normal.woff2
│   │   ├── jetbrains-mono-latin-400-normal.woff2
│   │   ├── jetbrains-mono-latin-600-normal.woff2
│   │   ├── LICENSE-chakra-petch.txt
│   │   └── LICENSE-jetbrains-mono.txt
│   ├── icons/
│   │   ├── capri.ico
│   │   ├── capri.png
│   │   └── tray.png
│   ├── songs/
│   │   └── phone-call.mp3
│   ├── voice-default/
│   │   └── README.md
│   └── capri-calling-image.png
├── build/
│   └── installer.nsh
├── docs/
│   ├── ai.png
│   ├── bond.png
│   ├── dance.png
│   ├── done.png
│   ├── faces.png
│   ├── guide.png
│   ├── intro.png
│   ├── life.png
│   ├── moods.png
│   ├── peek.png
│   ├── point.png
│   ├── possess.png
│   ├── ring.png
│   ├── senses.png
│   ├── sit.png
│   ├── sleep.png
│   ├── star.png
│   ├── teleport.png
│   ├── themes.png
│   └── victory.png
├── hooks/
│   ├── capri-agy-hook.js
│   ├── capri-codex-hook.js
│   └── capri-hook.js
├── scripts/
│   ├── check-llm.js
│   ├── demo-sequence.js
│   ├── demo.js
│   ├── install-codex-hooks.js
│   ├── install-hooks-agy.js
│   ├── install-hooks.js
│   ├── install-node.ps1
│   ├── release-notes.js
│   └── voice-demo.js
├── src/
│   ├── main/
│   │   ├── anthropic.js
│   │   ├── app-aliases.js
│   │   ├── apps.js
│   │   ├── assistants.js
│   │   ├── bridge.js
│   │   ├── chatterbox-server.py
│   │   ├── chatterbox-setup.js
│   │   ├── chatterbox.js
│   │   ├── chess-game.js
│   │   ├── chess-window.js
│   │   ├── cleanup.js
│   │   ├── config.js
│   │   ├── control.js
│   │   ├── documents.js
│   │   ├── electron-security.js
│   │   ├── farewell.js
│   │   ├── fetch-files.js
│   │   ├── hardware.js
│   │   ├── hub-lines.js
│   │   ├── hub.js
│   │   ├── incoming-call.js
│   │   ├── installed.js
│   │   ├── labels.js
│   │   ├── launch.js
│   │   ├── llm.js
│   │   ├── mac-permissions.js
│   │   ├── main.js
│   │   ├── media-control.ps1
│   │   ├── media.js
│   │   ├── media.ps1
│   │   ├── mover.js
│   │   ├── mover.ps1
│   │   ├── music-control.js
│   │   ├── node-check.js
│   │   ├── ollama-host.js
│   │   ├── ollama.js
│   │   ├── piper.js
│   │   ├── prepare-lines.js
│   │   ├── prepare.js
│   │   ├── proc.js
│   │   ├── profiles.js
│   │   ├── provision.js
│   │   ├── screen.js
│   │   ├── setup.js
│   │   ├── stacking.js
│   │   ├── stt.js
│   │   ├── terminal.js
│   │   ├── tts.js
│   │   ├── tune.js
│   │   ├── video-search.js
│   │   ├── voice-sample.js
│   │   ├── windows.js
│   │   └── windows.ps1
│   ├── renderer/
│   │   ├── js/
│   │   │   ├── acting.js
│   │   │   ├── app.js
│   │   │   ├── bond.js
│   │   │   ├── brain-providers.js
│   │   │   ├── brain.js
│   │   │   ├── capri-satellite-test.js
│   │   │   ├── capri.js
│   │   │   ├── chat.js
│   │   │   ├── chip.js
│   │   │   ├── custom.js
│   │   │   ├── ears.js
│   │   │   ├── eyes.js
│   │   │   ├── fx-life.js
│   │   │   ├── fx.js
│   │   │   ├── guide.js
│   │   │   ├── hands.js
│   │   │   ├── heart.js
│   │   │   ├── hub.js
│   │   │   ├── ledges.js
│   │   │   ├── life.js
│   │   │   ├── lines-life.js
│   │   │   ├── lines.js
│   │   │   ├── mac-permissions.js
│   │   │   ├── mission.js
│   │   │   ├── mood.js
│   │   │   ├── panel.js
│   │   │   ├── pointer-life.js
│   │   │   ├── possession.js
│   │   │   ├── prepare.js
│   │   │   ├── rhythm.js
│   │   │   ├── ring-tabs.js
│   │   │   ├── ring-ui.js
│   │   │   ├── ring.js
│   │   │   ├── satellite-wait.js
│   │   │   ├── setup.js
│   │   │   ├── speech.js
│   │   │   ├── sprite.js
│   │   │   ├── steps-view.js
│   │   │   ├── terminal.js
│   │   │   ├── themes.js
│   │   │   ├── util.js
│   │   │   └── voice.js
│   │   ├── styles/
│   │   │   ├── capri.css
│   │   │   ├── hub.css
│   │   │   ├── mac-permissions.css
│   │   │   ├── prepare.css
│   │   │   ├── ring.css
│   │   │   └── terminal.css
│   │   ├── call-ui.js
│   │   ├── call.css
│   │   ├── call.html
│   │   ├── chess-ui.js
│   │   ├── chess.css
│   │   ├── chess.html
│   │   ├── hub.html
│   │   ├── index.html
│   │   ├── mac-permissions.html
│   │   ├── prepare.html
│   │   └── terminal.html
│   ├── hub-preload.js
│   ├── mac-permissions-preload.js
│   ├── preload.js
│   ├── prepare-preload.js
│   └── terminal-preload.js
├── tests/
│   ├── fixtures/
│   │   ├── build-stub-wheel.py
│   │   ├── fake-ollama.js
│   │   └── fake-piper.js
│   ├── acting.test.js
│   ├── anthropic.test.js
│   ├── bond.test.js
│   ├── character.test.js
│   ├── chat.test.js
│   ├── chatterbox.test.js
│   ├── chess-game.test.js
│   ├── claudecode.test.js
│   ├── cleanup.test.js
│   ├── config.test.js
│   ├── documents.test.js
│   ├── electron-security.test.js
│   ├── farewell.test.js
│   ├── hardware.test.js
│   ├── heart.test.js
│   ├── hooks.test.js
│   ├── hub.test.js
│   ├── incoming-call.test.js
│   ├── labels.test.js
│   ├── launch-resolver.test.js
│   ├── ledges.test.js
│   ├── mac-permissions.test.js
│   ├── mover.test.js
│   ├── music-control.test.js
│   ├── node-check.test.js
│   ├── ollama-host.test.js
│   ├── openai.test.js
│   ├── piper.test.js
│   ├── possession.test.js
│   ├── prepare.e2e.test.js
│   ├── profiles.test.js
│   ├── provision.test.js
│   ├── release.test.js
│   ├── ring.test.js
│   ├── satellite-wait.test.js
│   ├── screen-capture.test.js
│   ├── senses.test.js
│   ├── stacking.test.js
│   ├── terminal.test.js
│   ├── tune.test.js
│   ├── video-search.test.js
│   ├── voice-demo.test.js
│   └── voice-sample.test.js
├── tools/
│   ├── build-cutins.py
│   ├── build-intro.py
│   └── build-sprite.py
├── .gitattributes
├── .gitignore
├── INFO.md
├── LICENSE
├── SECURITY_AUDIT.md
├── STRUCTURE.md
├── package-lock.json
├── package.json
└── README.md
~~~

## Processus Electron

- src/main/main.js démarre l’application, le protocole capri://app, l’overlay, le menu et les handlers IPC.
- src/preload.js expose l’API Renderer principale; les autres preloads sont isolés par page.
- Les fenêtres activent contextIsolation et sandbox, désactivent nodeIntegration.
- src/main/electron-security.js bloque les popups et les navigations hors de capri://app/.
- Le protocole local sert aussi les sons utilisateur.
- Tous les handlers IPC principaux ne valident pas encore uniformément l’identité de la fenêtre appelante. Une compromission d’un Renderer local aurait donc une surface de capacités importante; voir le rapport.

### Fonctions Main importantes

| Fonction | Rôle et échanges |
|---|---|
| main() | Verrouille l’instance puis installe les garde-fous, protocole, IPC et fenêtres. |
| registerIpc() | Enregistre les commandes de chat, configuration, apps, permissions, fichiers, voix et automatisation. |
| rendererConfig() / updateConfig(patch) | Exclut les clés secrètes de la configuration Renderer et diffuse les changements. |
| serveProtocol() | Sert les ressources locales et refuse les chemins sortant de la racine résolue. |
| createIncomingCall(...) | Gère l’appel entrant et n’accepte les transcriptions qu’après acceptation. |
| createChessWindow(...) | Maintient une partie et limite les IPC au renderer concerné. |
| createTextDocument({filename, content, directory}) | Crée exclusivement un document puis relit son contenu. |
| openVideoSearch({creator, browser}) | Construit une recherche YouTube triée par date. |
| createBridge({port, onEvent, onDebug}) | Reçoit des hooks en boucle locale, limite la taille et refuse les requêtes Origin. |
| checkAllPermissions(...) / requestAutomationTarget(...) | Retourne les seuls états macOS vérifiables; l’automatisation nécessite une action explicite. |
| createMusicController(...) | Sélectionne un adaptateur de lecteur et retourne succès, erreur ou ambiguïté. |

## Interface et logique métier

- src/renderer/js/app.js relie événements Main, composants, chat et voix.
- capri.js, acting.js, sprite.js, fx.js et fx-life.js portent la mascotte, ses sprites et effets Canvas.
- panel.js, ring.js, ring-tabs.js, ring-ui.js et themes.js composent conversation, menu radial et réglages.
- chat.js route les demandes explicites vers les actions disponibles et laisse les autres au fournisseur IA.
- hands.js prépare les contrôles de fenêtres et les messages; les actions sensibles suivent un flux de confirmation.
- brain.js, mood.js, heart.js, bond.js, life.js et mission.js composent personnalité, humeur et comportements autonomes.
- ears.js, speech.js, voice.js et rhythm.js relient microphone, reconnaissance, synthèse et audio.

## Services

- IA : llm.js sélectionne le fournisseur; anthropic.js et ollama.js portent des clients dédiés; les autres fournisseurs peuvent être compatibles OpenAI.
- Applications : launch.js découvre/résout les applications; apps.js interroge et ferme les applications actives.
- Fenêtres : windows.js, mover.js, control.js et mac-permissions.js assurent les actions selon l’OS.
- Audio : stt.js, tts.js, piper.js, chatterbox.js et music-control.js relient interfaces et moteurs.
- Fichiers : documents.js crée sans écrasement; cleanup.js ne retire que les éléments recensés comme appartenant à Capri.
- Configuration : config.js utilise Electron userData. setup.js chiffre les nouvelles clés avec safeStorage; les anciennes valeurs non chiffrées restent lisibles par compatibilité.

## Terminal, appel et échecs

Le parseur est src/main/terminal.js; la page et son historique sont src/renderer/terminal.html et src/renderer/js/terminal.js. HELP_COMMANDS liste les commandes. Les services partagés comprennent musique, échecs, documents, recherche vidéo et démonstrations.

L’appel utilise incoming-call.js, call.html, call-ui.js et call.css. Accepter démarre les services microphone existants; la conversation reprend les textes réellement transcrits et envoyés à la synthèse. Les échecs utilisent chess-game.js pour les règles et chess-window.js pour l’état/IPC. Le bot n’a pas de classement Elo calibré.

## Ressources, traductions, tests et scripts

- assets/ contient sprites, illustrations, icônes, sons, polices et licences; docs/ contient des images de guide.
- Les chaînes principales sont dans labels.js, hub-lines.js, prepare-lines.js, renderer/js/lines.js et lines-life.js; certaines fenêtres ont leurs tables locales.
- tests/ contient les tests Node; tests/fixtures/ contient faux exécutables et données.
- scripts/ contient les outils npm de démonstration, installation et diagnostic; tools/ reconstruit des ressources hors démarrage normal.
- .github/workflows/release.yml publie; build/installer.nsh personnalise l’installeur Windows.

## Index individuel des fichiers suivis

Les 244 fichiers suivis sont répertoriés individuellement. Les binaires sont décrits comme ressources; node_modules est externe et exclu.

| Chemin | Rôle |
|---|---|
| **STRUCTURE.md** | Ce document : architecture, arborescence et index des fichiers. |
| **SECURITY_AUDIT.md** | Méthode, constats de sécurité, correction et risques restants. |
| **src/main/electron-security.js** | Garde-fous globaux contre navigation externe et fenêtres enfants Electron. |
| **tests/electron-security.test.js** | Teste le refus des popups et navigations non Capri. |
| **.gitattributes** | Attributs Git. |
| **.github/RELEASE_NEWS.md** | Notes de publication. |
| **.github/workflows/release.yml** | Configuration GitHub. |
| **.gitignore** | Exclusions Git. |
| **INFO.md** | Attributions et dépôts de référence. |
| **LICENSE** | Licence MIT du code; les ressources gardent leurs licences. |
| **README.md** | Présentation, installation, configuration et fonctionnalités. |
| **assets/capri-calling-image.png** | Ressource binaire de l’interface ou du paquet. |
| **assets/capri/capri-cutout.png** | Image ou frame de la mascotte. |
| **assets/capri/capri-face.png** | Image ou frame de la mascotte. |
| **assets/capri/capri-full.png** | Image ou frame de la mascotte. |
| **assets/capri/cutin-eyes.png** | Image ou frame de la mascotte. |
| **assets/capri/cutin-grin.png** | Image ou frame de la mascotte. |
| **assets/capri/cutin-laugh.png** | Image ou frame de la mascotte. |
| **assets/capri/cutin-look.png** | Image ou frame de la mascotte. |
| **assets/capri/cutin-many.png** | Image ou frame de la mascotte. |
| **assets/capri/face-aside.png** | Image ou frame de la mascotte. |
| **assets/capri/face-calm.png** | Image ou frame de la mascotte. |
| **assets/capri/face-laugh.png** | Image ou frame de la mascotte. |
| **assets/capri/face-look.png** | Image ou frame de la mascotte. |
| **assets/capri/face-many.png** | Image ou frame de la mascotte. |
| **assets/capri/face-smug.png** | Image ou frame de la mascotte. |
| **assets/capri/face-wide.png** | Image ou frame de la mascotte. |
| **assets/capri/intro-grab.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-happy.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-mouth1.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-mouth2.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-mouth3.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-smear.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-wave1.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-wave2.webp** | Image ou frame de la mascotte. |
| **assets/capri/intro-wave3.webp** | Image ou frame de la mascotte. |
| **assets/fonts/LICENSE-chakra-petch.txt** | Police embarquée ou licence. |
| **assets/fonts/LICENSE-jetbrains-mono.txt** | Police embarquée ou licence. |
| **assets/fonts/chakra-petch-latin-600-normal.woff2** | Police embarquée ou licence. |
| **assets/fonts/chakra-petch-latin-700-normal.woff2** | Police embarquée ou licence. |
| **assets/fonts/jetbrains-mono-cyrillic-400-normal.woff2** | Police embarquée ou licence. |
| **assets/fonts/jetbrains-mono-cyrillic-600-normal.woff2** | Police embarquée ou licence. |
| **assets/fonts/jetbrains-mono-latin-400-normal.woff2** | Police embarquée ou licence. |
| **assets/fonts/jetbrains-mono-latin-600-normal.woff2** | Police embarquée ou licence. |
| **assets/icons/capri.ico** | Icône d’application ou de zone de notification. |
| **assets/icons/capri.png** | Icône d’application ou de zone de notification. |
| **assets/icons/tray.png** | Icône d’application ou de zone de notification. |
| **assets/songs/phone-call.mp3** | Ressource audio. |
| **assets/voice-default/README.md** | Présentation, installation, configuration et fonctionnalités. |
| **build/installer.nsh** | Personnalisation NSIS Windows. |
| **docs/ai.png** | Capture ou illustration du guide. |
| **docs/bond.png** | Capture ou illustration du guide. |
| **docs/dance.png** | Capture ou illustration du guide. |
| **docs/done.png** | Capture ou illustration du guide. |
| **docs/faces.png** | Capture ou illustration du guide. |
| **docs/guide.png** | Capture ou illustration du guide. |
| **docs/intro.png** | Capture ou illustration du guide. |
| **docs/life.png** | Capture ou illustration du guide. |
| **docs/moods.png** | Capture ou illustration du guide. |
| **docs/peek.png** | Capture ou illustration du guide. |
| **docs/point.png** | Capture ou illustration du guide. |
| **docs/possess.png** | Capture ou illustration du guide. |
| **docs/ring.png** | Capture ou illustration du guide. |
| **docs/senses.png** | Capture ou illustration du guide. |
| **docs/sit.png** | Capture ou illustration du guide. |
| **docs/sleep.png** | Capture ou illustration du guide. |
| **docs/star.png** | Capture ou illustration du guide. |
| **docs/teleport.png** | Capture ou illustration du guide. |
| **docs/themes.png** | Capture ou illustration du guide. |
| **docs/victory.png** | Capture ou illustration du guide. |
| **hooks/capri-agy-hook.js** | Hook d’assistant qui transmet un événement au service local Capri. |
| **hooks/capri-codex-hook.js** | Hook d’assistant qui transmet un événement au service local Capri. |
| **hooks/capri-hook.js** | Hook d’assistant qui transmet un événement au service local Capri. |
| **package-lock.json** | Versions exactes des paquets résolus. |
| **package.json** | Métadonnées, scripts npm, dépendances et Electron Builder. |
| **scripts/check-llm.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/demo-sequence.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/demo.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/install-codex-hooks.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/install-hooks-agy.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/install-hooks.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/install-node.ps1** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/release-notes.js** | Script de développement, installation, diagnostic ou démonstration. |
| **scripts/voice-demo.js** | Script de développement, installation, diagnostic ou démonstration. |
| **src/hub-preload.js** | Code JavaScript du composant désigné par le chemin. |
| **src/mac-permissions-preload.js** | Code JavaScript du composant désigné par le chemin. |
| **src/main/anthropic.js** | Client API Anthropic pour conversation et vision. |
| **src/main/app-aliases.js** | Dictionnaire centralisé d’alias multilingues d’applications. |
| **src/main/apps.js** | Énumère, recherche et ferme les applications actives. |
| **src/main/assistants.js** | Catalogue des assistants de code. |
| **src/main/bridge.js** | Serveur HTTP local des événements de hooks. |
| **src/main/chatterbox-server.py** | Serveur local de synthèse vocale compatible OpenAI. |
| **src/main/chatterbox-setup.js** | Détecte Python et prépare l’environnement Chatterbox. |
| **src/main/chatterbox.js** | Supervise Chatterbox local. |
| **src/main/chess-game.js** | Règles locales et stratégie de bot d’échecs approximative. |
| **src/main/chess-window.js** | Fenêtre d’échecs, état de partie et IPC limité. |
| **src/main/cleanup.js** | Nettoie les composants recensés comme appartenant à Capri. |
| **src/main/config.js** | Charge, met en cache et écrit la configuration utilisateur. |
| **src/main/control.js** | Opérations et saisie sur Windows. |
| **src/main/documents.js** | Validation, création exclusive et vérification de fichiers texte. |
| **src/main/farewell.js** | Séquence d’au revoir et fermeture. |
| **src/main/fetch-files.js** | Téléchargement et extraction d’archives avec garde contre traversée de chemins. |
| **src/main/hardware.js** | Collecte matérielle pour les recommandations. |
| **src/main/hub-lines.js** | Textes localisés de configuration. |
| **src/main/hub.js** | Fenêtre principale de configuration. |
| **src/main/incoming-call.js** | Cycle de vie d’appel et validation IPC/transcriptions. |
| **src/main/installed.js** | Inventaire des composants installés par Capri. |
| **src/main/labels.js** | Libellés et langues du menu. |
| **src/main/launch.js** | Découvre les applications, résout noms et alias, puis ouvre les applications/sites. |
| **src/main/llm.js** | Catalogue des fournisseurs et routage IA. |
| **src/main/mac-permissions.js** | États macOS, demandes Apple Events, réglages et fenêtres. |
| **src/main/main.js** | Point d’entrée Electron Main : fenêtres, menu, configuration, services, cycle de vie et IPC. |
| **src/main/media-control.ps1** | Contrôle multimédia Windows. |
| **src/main/media.js** | Surveille les métadonnées multimédias. |
| **src/main/media.ps1** | Métadonnées multimédias Windows. |
| **src/main/mover.js** | Coordonne le déplacement d’une fenêtre. |
| **src/main/mover.ps1** | Aide PowerShell au déplacement de fenêtres. |
| **src/main/music-control.js** | Sélection du lecteur et adaptateurs système. |
| **src/main/node-check.js** | Détecte et installe Node.js avec validation d’empreinte. |
| **src/main/ollama-host.js** | Localise et supervise le processus Ollama. |
| **src/main/ollama.js** | Client du serveur local Ollama. |
| **src/main/piper.js** | Moteur vocal local Piper. |
| **src/main/prepare-lines.js** | Textes localisés de préparation. |
| **src/main/prepare.js** | Fenêtre de préparation et progression. |
| **src/main/proc.js** | Utilitaires de processus et découverte de Python. |
| **src/main/profiles.js** | Profils de ressources et recommandations de modèles/voix. |
| **src/main/provision.js** | Orchestre la préparation des dépendances locales. |
| **src/main/screen.js** | Capture d’écran pour le service de vision. |
| **src/main/setup.js** | Prépare Ollama et chiffre les nouvelles clés via safeStorage. |
| **src/main/stacking.js** | Rétablissement de l’overlay au premier plan. |
| **src/main/stt.js** | Transcription par moteur cloud ou serveur compatible. |
| **src/main/terminal.js** | Interprète les commandes du terminal et délègue aux services Main. |
| **src/main/tts.js** | Route la synthèse vocale. |
| **src/main/tune.js** | Adaptation des requêtes selon modèle et mesures locales. |
| **src/main/video-search.js** | Recherche YouTube triée par date. |
| **src/main/voice-sample.js** | Validation et gestion d’échantillon vocal. |
| **src/main/windows.js** | Observe les fenêtres système. |
| **src/main/windows.ps1** | Collecte des fenêtres Windows. |
| **src/preload.js** | Code JavaScript du composant désigné par le chemin. |
| **src/prepare-preload.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/call-ui.js** | États, contrôles et transcriptions d’appel. |
| **src/renderer/call.css** | Styles de l’interface correspondante. |
| **src/renderer/call.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/chess-ui.js** | Échiquier, coups et promotion. |
| **src/renderer/chess.css** | Styles de l’interface correspondante. |
| **src/renderer/chess.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/hub.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/index.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/js/acting.js** | Poses et lecture d’animations. |
| **src/renderer/js/app.js** | Assemble événements, chat, voix et état de Capri. |
| **src/renderer/js/bond.js** | Préférences mémorisées. |
| **src/renderer/js/brain-providers.js** | Catalogue des fournisseurs IA. |
| **src/renderer/js/brain.js** | Réactions aux assistants et conversation. |
| **src/renderer/js/capri-satellite-test.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/capri.js** | Mascotte : géométrie, posture, déplacements et réactions. |
| **src/renderer/js/chat.js** | Interprétation des demandes explicites et orchestration du chat. |
| **src/renderer/js/chip.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/custom.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/ears.js** | Microphone et transcription. |
| **src/renderer/js/eyes.js** | Requêtes visuelles. |
| **src/renderer/js/fx-life.js** | Effets des comportements autonomes. |
| **src/renderer/js/fx.js** | Effets Canvas, salutation et texte animé. |
| **src/renderer/js/guide.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/hands.js** | Interprétation du contrôle et préparation des actions. |
| **src/renderer/js/heart.js** | Expression émotionnelle. |
| **src/renderer/js/hub.js** | Fenêtre principale de configuration. |
| **src/renderer/js/ledges.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/life.js** | Planification autonome. |
| **src/renderer/js/lines-life.js** | Répliques autonomes localisées. |
| **src/renderer/js/lines.js** | Répliques localisées. |
| **src/renderer/js/mac-permissions.js** | États macOS, demandes Apple Events, réglages et fenêtres. |
| **src/renderer/js/mission.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/mood.js** | Humeur et classification émotionnelle. |
| **src/renderer/js/panel.js** | Bulle de conversation et actions. |
| **src/renderer/js/pointer-life.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/possession.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/prepare.js** | Fenêtre de préparation et progression. |
| **src/renderer/js/rhythm.js** | Analyse rythmique et animation. |
| **src/renderer/js/ring-tabs.js** | Sections et réglages du menu. |
| **src/renderer/js/ring-ui.js** | Composants DOM communs. |
| **src/renderer/js/ring.js** | Géométrie du menu radial. |
| **src/renderer/js/satellite-wait.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/setup.js** | Prépare Ollama et chiffre les nouvelles clés via safeStorage. |
| **src/renderer/js/speech.js** | Synthèse vocale Renderer. |
| **src/renderer/js/sprite.js** | Chargement et dessin des images. |
| **src/renderer/js/steps-view.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/terminal.js** | Interprète les commandes du terminal et délègue aux services Main. |
| **src/renderer/js/themes.js** | Palettes de thèmes. |
| **src/renderer/js/util.js** | Code JavaScript du composant désigné par le chemin. |
| **src/renderer/js/voice.js** | Choix des voix et périphériques. |
| **src/renderer/mac-permissions.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/prepare.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/renderer/styles/capri.css** | Styles de l’interface correspondante. |
| **src/renderer/styles/hub.css** | Styles de l’interface correspondante. |
| **src/renderer/styles/mac-permissions.css** | Styles de l’interface correspondante. |
| **src/renderer/styles/prepare.css** | Styles de l’interface correspondante. |
| **src/renderer/styles/ring.css** | Styles de l’interface correspondante. |
| **src/renderer/styles/terminal.css** | Styles de l’interface correspondante. |
| **src/renderer/terminal.html** | Structure d’une page Electron avec scripts et styles locaux. |
| **src/terminal-preload.js** | Code JavaScript du composant désigné par le chemin. |
| **tests/acting.test.js** | Tests du domaine acting; services système simulés si nécessaire. |
| **tests/anthropic.test.js** | Tests du domaine anthropic; services système simulés si nécessaire. |
| **tests/bond.test.js** | Tests du domaine bond; services système simulés si nécessaire. |
| **tests/character.test.js** | Tests du domaine character; services système simulés si nécessaire. |
| **tests/chat.test.js** | Tests du domaine chat; services système simulés si nécessaire. |
| **tests/chatterbox.test.js** | Tests du domaine chatterbox; services système simulés si nécessaire. |
| **tests/chess-game.test.js** | Tests du domaine chess game; services système simulés si nécessaire. |
| **tests/claudecode.test.js** | Tests du domaine claudecode; services système simulés si nécessaire. |
| **tests/cleanup.test.js** | Tests du domaine cleanup; services système simulés si nécessaire. |
| **tests/config.test.js** | Tests du domaine config; services système simulés si nécessaire. |
| **tests/documents.test.js** | Tests du domaine documents; services système simulés si nécessaire. |
| **tests/farewell.test.js** | Tests du domaine farewell; services système simulés si nécessaire. |
| **tests/fixtures/build-stub-wheel.py** | Faux programme ou donnée isolée de test. |
| **tests/fixtures/fake-ollama.js** | Faux programme ou donnée isolée de test. |
| **tests/fixtures/fake-piper.js** | Faux programme ou donnée isolée de test. |
| **tests/hardware.test.js** | Tests du domaine hardware; services système simulés si nécessaire. |
| **tests/heart.test.js** | Tests du domaine heart; services système simulés si nécessaire. |
| **tests/hooks.test.js** | Tests du domaine hooks; services système simulés si nécessaire. |
| **tests/hub.test.js** | Tests du domaine hub; services système simulés si nécessaire. |
| **tests/incoming-call.test.js** | Tests du domaine incoming call; services système simulés si nécessaire. |
| **tests/labels.test.js** | Tests du domaine labels; services système simulés si nécessaire. |
| **tests/launch-resolver.test.js** | Tests du domaine launch resolver; services système simulés si nécessaire. |
| **tests/ledges.test.js** | Tests du domaine ledges; services système simulés si nécessaire. |
| **tests/mac-permissions.test.js** | Tests du domaine mac permissions; services système simulés si nécessaire. |
| **tests/mover.test.js** | Tests du domaine mover; services système simulés si nécessaire. |
| **tests/music-control.test.js** | Tests du domaine music control; services système simulés si nécessaire. |
| **tests/node-check.test.js** | Tests du domaine node check; services système simulés si nécessaire. |
| **tests/ollama-host.test.js** | Tests du domaine ollama host; services système simulés si nécessaire. |
| **tests/openai.test.js** | Tests du domaine openai; services système simulés si nécessaire. |
| **tests/piper.test.js** | Tests du domaine piper; services système simulés si nécessaire. |
| **tests/possession.test.js** | Tests du domaine possession; services système simulés si nécessaire. |
| **tests/prepare.e2e.test.js** | Tests du domaine prepare.e2e; services système simulés si nécessaire. |
| **tests/profiles.test.js** | Tests du domaine profiles; services système simulés si nécessaire. |
| **tests/provision.test.js** | Tests du domaine provision; services système simulés si nécessaire. |
| **tests/release.test.js** | Tests du domaine release; services système simulés si nécessaire. |
| **tests/ring.test.js** | Tests du domaine ring; services système simulés si nécessaire. |
| **tests/satellite-wait.test.js** | Tests du domaine satellite wait; services système simulés si nécessaire. |
| **tests/screen-capture.test.js** | Tests du domaine screen capture; services système simulés si nécessaire. |
| **tests/senses.test.js** | Tests du domaine senses; services système simulés si nécessaire. |
| **tests/stacking.test.js** | Tests du domaine stacking; services système simulés si nécessaire. |
| **tests/terminal.test.js** | Tests du domaine terminal; services système simulés si nécessaire. |
| **tests/tune.test.js** | Tests du domaine tune; services système simulés si nécessaire. |
| **tests/video-search.test.js** | Tests du domaine video search; services système simulés si nécessaire. |
| **tests/voice-demo.test.js** | Tests du domaine voice demo; services système simulés si nécessaire. |
| **tests/voice-sample.test.js** | Tests du domaine voice sample; services système simulés si nécessaire. |
| **tools/build-cutins.py** | Constructeur de ressource utilisé pendant le développement. |
| **tools/build-intro.py** | Constructeur de ressource utilisé pendant le développement. |
| **tools/build-sprite.py** | Constructeur de ressource utilisé pendant le développement. |

## Éléments locaux et fichiers non exécutés au démarrage

- node_modules/ est installé par npm depuis package-lock.json; dépendances externes non détaillées.
- .env, .private/, .DS_Store, modèles et configuration sont locaux/ignorés dans cette copie; ils ne font pas partie des 244 chemins suivis.
- FEATURES.md et FEATURES.fr.md sont dans .private/ ignoré, pas dans le corpus public versionné.
- Les scripts de tools/ reconstruisent les images et ne sont pas nécessaires au démarrage utilisateur.

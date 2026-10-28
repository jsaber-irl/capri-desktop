# État d'implémentation

> **Mise à jour :** cette liste distingue désormais les fonctionnalités déjà présentes dans le code des fonctionnalités
> encore à développer. Les cases cochées doivent être vérifiées par les tests ou par une implémentation identifiable ;
> une fonctionnalité partielle reste décochée et est signalée dans la section correspondante.

Une case **[x]** signifie que la fonctionnalité est implémentée et disponible sur Windows, macOS et Linux.
Les fonctionnalités dépendant d'une API native ou limitées à un système restent décochées plutôt que simulées.

1. Mascotte et animations
- [x] Apparition animée au démarrage avec présentation de Capri.
- [x] Personnage flottant qui se déplace entre les coins de l'écran.
- [x] Clignements des yeux, mouvements de tête et expressions faciales.
- [x] Huit expressions faciales différentes dans les messages.
- [x] Téléportation animée d'un endroit à un autre.
- [x] Effets de glitch, décalage RGB et distorsions visuelles.
- [x] Éclairs rouges, fragments et particules lumineuses.
- [x] Animations de rotation, de saut et de chute.
- [x] Réactions amusantes à la proximité du curseur.
- [x] Possibilité de faire apparaître des copies rouge et verte du personnage.
- [x] Animation spéciale avec un satellite.
- [x] Animation de victoire lorsque l'assistant termine son travail.
- [x] Animation d'erreur lorsqu'une commande échoue.
- [x] Animation de sommeil après 10 minutes d'inactivité.
- [x] Réveil automatique lorsque la souris s'approche ou que Claude reprend son activité.
- [x] Réduction de la mascotte à son masque dans le coin inférieur gauche.
- [x] Mode démonstration pour tester les animations sans assistant de programmation.
- [x] Mascotte virtuelle toujours présente sur le bureau.
- [x] Animation d'attente et clignement des yeux.
- [x] Animation lorsqu'elle parle.
- [x] Animation lorsqu'on la déplace ou la secoue.
- [x] Effets visuels de glitch.
- [x] Animation de sommeil et de redémarrage.
- [x] Déplacement de la mascotte à la souris.
- [ ] Positionnement sur les fenêtres et le bas de l'écran.
- [ ] Déplacement entre les fenêtres ouvertes.
- [x] Accrochage à une position précise ou à la souris.
- [x] Menu « MacOS Permissions » pour autoriser l'accès nécessaire aux interactions avec les fenêtres sur macOS.

2. Intégration avec les assistants de programmation
- [x] Intégration avec Claude Code.
- [x] Intégration avec OpenAI Codex.
- [x] Intégration avec Google Antigravity.
- [x] Installation des hooks depuis le menu de Capri.
- [x] Installation et désinstallation des hooks en ligne de commande.
- [x] Détection des actions réalisées par l'assistant.
- [x] Affichage de l'outil utilisé, du fichier concerné et de la commande exécutée.
- [x] Affichage des recherches de code et des opérations de lecture ou d'écriture.
- [x] Affichage des commandes lancées et des tests exécutés.
- [x] Indicateur de progression au-dessus de la mascotte.
- [x] Affichage du temps passé en réflexion après 15 secondes d'attente.
- [x] Commentaires sur les longues périodes de réflexion.
- [x] Alerte lorsque l'assistant attend une autorisation ou une réponse.
- [x] Téléportation vers le curseur ou la fenêtre de l'assistant lorsqu'une intervention est nécessaire.
- [x] Affichage des erreurs importantes en cas d'échec.
- [x] Séquence de victoire lorsque la tâche est terminée.
- [x] Affichage du résumé de la tâche : nombre d'actions, fichiers modifiés et durée.
- [x] Affichage de la dernière réponse de l'assistant.
- [ ] Panneau permettant de lire la réponse complète lorsque tu travailles dans une autre fenêtre.
- [x] Possibilité de désactiver la surveillance des assistants pour utiliser Capri uniquement comme mascotte.

3. Intelligence artificielle et conversations
- [x] Discussion par messages écrits.
- [x] Réponses générées par une IA.
- [x] Configuration du modèle d'IA depuis le Mainframe.
- [x] Utilisation d'une IA locale sur l'ordinateur.
- [x] Utilisation d'une IA distante via une clé API.
- [ ] Possibilité d'utiliser une clé NVIDIA gratuite, selon les quotas disponibles.
- [ ] Ajout la possibilité d’”appel” avec Capri dans le style Cyberpunk 2077 avec la sonnerie, la transcription et la réponse directement (API vocale du navigateur).

4. Fonctionnalités vocales
- [x] Synthèse vocale pour faire parler la mascotte.
- [x] Conversation vocale interactive.
- [ ] Reconnaissance vocale via NVIDIA Parakeet.
- [ ] Voix locale gratuite avec Kokoro.
- [x] Voix ElevenLabs avec une clé API.
- [x] Activation et arrêt de la conversation vocale par raccourci clavier.
- [x] Coupure et réactivation du microphone.
- [x] Demande d'autorisation du microphone depuis le menu « MacOS Permissions » sur macOS.

5. Positionnement et interactions avec les fenêtres
- [x] Mascotte flottante au premier plan.
- [ ] Déplacement par glisser-déposer.
- [ ] Possibilité de s'asseoir sur le bord supérieur d'une fenêtre.
- [ ] Déplacement avec la fenêtre lorsque celle-ci est déplacée.
- [ ] Chute lorsque la fenêtre disparaît, est minimisée ou recouverte.
- [ ] Possibilité de tomber sur le rebord d'une autre fenêtre.
- [x] Apparition partielle sur les bords de l'écran.
- [x] Déplacement lorsqu'on approche la souris d'elle.
- [ ] Effet de possession d'une fenêtre avec des yeux et un sourire animés.
- [x] Désactivation de la possession des fenêtres depuis le menu.
- [x] Suivi des fenêtres ouvertes sous Windows et macOS (avec l'autorisation Accessibilité sur macOS).
- [x] Accès aux réglages macOS d'accessibilité et d'enregistrement de l'écran pour les interactions avec les fenêtres.
- [x] Mise en retrait dans le biochip avec Ctrl + Alt + C.
- [x] Réapparition par clic sur le masque ou avec le même raccourci.

6. Interface et paramètres
- [x] Mainframe central de configuration.
- [x] Configuration du modèle d'IA.
- [x] Configuration de la voix.
- [x] Activation de l'observation de l'écran.
- [x] Accès à l'aide.
- [x] Menu contextuel par clic droit sur la mascotte.
- [x] Accès aux paramètres depuis l'icône de la zone de notification.
- [ ] Personnalisation des raccourcis clavier depuis le menu Capri (profils afficher/masquer, chat ou désactivation).

7. Conversation avec Capri
- [x] Ouvrir un panneau de discussion depuis le menu.
- [x] Envoyer des messages en appuyant sur Entrée.
- [x] Fermer le panneau avec Échap.
- [x] Recevoir des réponses formulées dans le personnage de Capri.
- [x] Utiliser les informations sur l'activité de Claude et les tâches réalisées pendant la journée.
- [x] Personnaliser la façon dont Capri s'exprime.
- [x] Définir des phrases personnalisées qu'elle peut prononcer.
- [x] Lui faire mémoriser certaines informations personnelles.
- [x] Choisir le nom qu'elle utilise pour s'adresser à toi.
- [x] Effacer les conversations mémorisées.
- [x] Choisir la langue de l'interface et des dialogues.
Modèles et fournisseurs d'IA compatibles avec le chat
- [x] Ollama avec un modèle local.
- [x] Pollinations pour une utilisation en ligne sans compte.
- [x] Groq.
- [x] Google Gemini.
- [x] OpenRouter.
- [x] OpenAI.
- [x] Mistral.
- [x] DeepSeek.
- [x] LM Studio.
- [x] llama.cpp.
- [x] vLLM.
- [x] Tout serveur compatible avec l'API OpenAI.
- [x] Claude Code en mode ligne de commande, dans un dossier choisi.

8. Actions sur l'ordinateur
- [ ] Ouvrir des applications.
- [ ] Reconnaître des noms traduits d'applications système, comme « météo » pour l'application Weather.
- [ ] Fermer des applications.
- [ ] Rechercher une musique et ouvrir sa recherche dans l'application Spotify ou Deezer, ou dans leur version web.
- [ ] Lire et mettre en pause la musique dans Spotify, Deezer ou un onglet de navigateur actif.
- [ ] Demander quelle musique est en cours de lecture (macOS, Windows et Linux avec un lecteur compatible).
- [ ] Fermer un onglet après confirmation.
- [ ] Observer l'écran pendant les jeux.
- [ ] Commenter ce qui se passe pendant une partie.
- [ ] Ouvrir les applications du menu Démarrer.
- [ ] Lancer des applications du Microsoft Store, comme Spotify.
- [ ] Lancer des jeux installés via Steam et Epic Games.
- [ ] Contrôler la lecture multimédia : lecture, pause, piste suivante, volume et silence, dans une application ou un onglet compatible.
- [ ] Rechercher un artiste ou un morceau sur Spotify et Deezer.
- [ ] Ouvrir un site web après confirmation via un bouton.
- [ ] Fermer une application après confirmation.
- [ ] Proposer une fermeture forcée si l'application reste dans la zone de notification.
- [ ] Conserver la possibilité pour l'application de demander d'enregistrer les modifications avant de se fermer.
- [x] Menu macOS pour autoriser les fonctions système nécessaires à l'ouverture et à la fermeture des applications.

9. Guide interactif
- [x] Expliquer le fonctionnement de Capri directement depuis son menu.
- [x] Indiquer où se trouve son icône dans la zone de notification.
- [x] Montrer où se trouve la fenêtre de Claude Code.
- [x] Ouvrir le dossier ~/.claude.
- [x] Sélectionner settings.json pour expliquer la configuration des hooks.
- [x] Installer les hooks de Claude Code en un clic.
- [x] Proposer le lancement de Claude Code ou Codex avec Ollama.
- [x] Pointer visuellement les éléments de l'interface.
- [x] Afficher un réticule, des éclairs et un effet de zoom pendant les explications.

10. Rapport quotidien de mission
- [x] Générer une carte récapitulative du travail de la journée.
- [x] Afficher le nombre de tâches terminées.
- [x] Afficher le nombre d'actions réalisées.
- [x] Afficher les fichiers modifiés.
- [x] Afficher les erreurs rencontrées.
- [x] Indiquer la mission la plus longue et le projet concerné.
- [x] Récapituler les prompts, autorisations et projets.
- [x] Animer les compteurs du rapport.
- [x] Copier l'image du rapport dans le presse-papiers.
- [x] Afficher automatiquement le rapport le soir après au moins trois tâches réalisées.
- [x] Conserver le journal des missions localement, avec un historique journalier.

11. Sons et personnalisation
- [ ] Génération des effets sonores en temps réel.
- [x] Son de téléportation.
- [x] Son de fin de tâche.
- [x] Son d'alerte lorsqu'une autorisation est nécessaire.
- [x] Son d'erreur.
- [x] Son de démarrage de session.
- [x] Son de chute et de montée.
- [x] Son des éclairs et de la possession des fenêtres.
- [x] Sons de parole et rappels discrets.
- [x] Remplacement des sons par des fichiers personnels .mp3, .wav, .ogg ou .m4a.
- [x] Réglage du son, de la taille et des animations.
- [x] Démarrage automatique avec le système.
- [ ] Choix de la langue : français, anglais, espagnol, portugais brésilien ou russe.
- [x] Personnalisation du comportement et des phrases de Capri.

12. Sécurité et fonctionnement technique
- [x] Fonctionnement de la mascotte sans Claude Code.
- [x] Communication locale avec Claude Code via 127.0.0.1.
- [x] Hooks asynchrones qui ne bloquent pas les opérations de Claude.
- [x] Sauvegarde de la configuration avant modification des hooks.
- [x] Désinstallation des hooks sans supprimer les autres hooks existants.
- [x] Stockage local du journal des missions et des paramètres.
- [x] Chiffrement de la clé API avec le stockage sécurisé du système.
- [ ] Possibilité de désinstaller l'application depuis les paramètres Windows (entrée générée par l'installateur NSIS).
- [x] Mode développement avec outils de débogage et fenêtres de test.

13. Fonctionnalités supplémentaires
- [x] Ajouter un terminal Capri au style cyberpunk, déplaçable et redimensionnable librement lorsqu'il est développé, réductible à sa ligne de commande puis extensible, permettant de commander Capri avec des commandes (`/help`, `/clear`, `/history`, `/version`, `/status`, `/open`, `/download`, `/system info`, `/network status`, `/get arasaka data`, etc.), avec l'historique des commandes et des résultats.
- [ ] Ouvrir les fichiers sélectionnés.
- [ ] Lire et modifier des fichiers.
- [ ] Contrôler YouTube.
- [ ] Passer à la vidéo suivante.
- [ ] Activer le plein écran.
- [ ] Cliquer sur des éléments de l'interface.
- [ ] Saisir du texte et faire défiler des pages.
- [ ] Développer une voix locale gratuite.
- [x] Mémoriser des informations sur l'utilisateur.
- [ ] Effectuer des recherches sur Internet.
- [ ] Disposer d'un curseur autonome.
- [ ] Ajouter des interactions comme les caresses sur la tête.
- [ ] Ajouter un mode espiègle avec des glitches et des effets de faux piratage.
- [ ] Étendre les commandes d'applications et le mode vocal navigateur à macOS et Linux.
- [x] Ajouter le menu « MacOS Permissions », disponible uniquement sur macOS, pour le microphone, l'accessibilité et l'enregistrement de l'écran.

14. Informations sur l'application
- [x] Afficher la version actuelle de Capri depuis le menu et le chat.

## Capri Terminal — Cyberpunk Interface

The interactive cyberpunk terminal is accessible from the system tray menu and Capri's mascot context menu under **"Capri terminal"**.

### 1. Cyberpunk Interface & Design

- **Immersive Cyberpunk Aesthetic:** Rectangular window built on a deep dark canvas (`#07090e`), luminous neon borders with cyan (`#00f0ff`) and magenta (`#ff2a85`) reflections, subtle CRT scanlines, and monospace typography (`JetBrains Mono`, `Consolas`).
- **Active Terminal Visual Indicators:** Glowing `SYS:ONLINE` status badge and an animated pulsing green status LED indicating that the netrunner console is live and ready for input.
- **Command Input Zone:** Input bar positioned at the top of the body area featuring the `capri@night-city:~$` prompt, an active terminal pulse indicator, and cyan neon glow on focus.
- **Scrollable Output History (Below Input):** Output log container placed beneath the command input bar, featuring smooth vertical scrolling, a custom cyberpunk scrollbar, and visual differentiation across output categories:
  - **Executed Commands (`line--command`):** Neon cyan text with a luminous left border highlight.
  - **Capri Responses (`line--response`):** Soft matrix-green text for narrative replies and dialogue echoes.
  - **System Results (`line--result`):** Light cyan data blocks formatted in tabular/grid structure.
  - **Information Messages (`line--info`):** Muted slate/purple text for welcome and status notifications.
  - **Errors (`line--error`):** Glowing neon red text with warning background and explicit troubleshooting guidance.

### 2. Window Management: Moving, Minimizing, and Resizing

- **Free Desktop Movement:**
  - In expanded mode: draggable by the top title bar (`#dragbar`).
  - In compact mode: dedicated drag handle (`::`) on the left side of the bar with `-webkit-app-region: drag`, allowing the compact bar to be moved freely across the desktop without interfering with text selection or typing inside the input field (`-webkit-app-region: no-drag`).
- **Compact Mode (Minimized to Single Bar):**
  - Reduces the window to an ultra-compact 48 px high bar containing only the command input field, the drag handle, and control buttons.
  - The title bar and history container are hidden without losing any session data or drafted text.
  - Triggered via the `_` button on the title bar, double-clicking the title bar, or via the `Ctrl+M` / `Cmd+M` shortcut.
- **Expanded Mode (Restoring Window):**
  - Restores the terminal to its previous dimensions (e.g. 720x460 px or any custom user-resized geometry).
  - All output history and current input values are strictly preserved without reinitializing the interface.
  - Triggered via the `▲` button in the compact bar, double-clicking the compact handle, or `Ctrl+M` / `Cmd+M`.
- **Free Resizing:**
  - When expanded, width and height can be resized freely and independently using window borders and corners.
  - Safe dimension bounds: minimum width 420 px, minimum height 180 px in expanded mode (48 px in compact mode), maximum width 1400 px, maximum height 1000 px.
  - Automatic work-area clamping ensures that the expanded window never gets placed outside the visible display area when restored.

### 3. Keyboard Navigation & Controls

- **`Enter`:** Validates and executes the entered command, clears the input field, and auto-scrolls the output container to show the response.
- **`ArrowUp` / `ArrowDown`:** Cycles chronologically through previously executed commands. Automatically preserves in-progress input as a draft when moving away from the bottom of the history.
- **`Tab`:** Autocompletes recognized command names.
- **`Ctrl+M` / `Cmd+M`:** Toggles between compact mode and expanded mode.
- **`Escape`:** Clears the current input text.

### 4. Available Command Reference

#### General Commands

| Command | Description | Return Type |
|---|---|---|
| `/help` | Displays the list of available commands and their descriptions in French or English according to the active language setting. | Response / Info |
| `/clear` | Clears the visible history in the terminal window. | View Reset |
| `/history` | Displays a numbered chronological list of all executed commands in the session. | Response |
| `/version` | Displays Capri's current version (`Capri 0.5.1`). | Response |
| `/status` | Displays Capri's overall status formatted as JSON (visibility, assistant watch mode, platform). | Response |

#### System & File Commands (Controlled Real Operations)

| Command | Description | Return Type |
|---|---|---|
| `/open app/<name>` | Searches for and launches a recognized application on the system using Capri's secure launcher (`launch.find`). | Response / Error |
| `/open file/<path>` | Opens an existing local file with the default OS handler using Electron's secure `shell.openPath` API. | Response / Error |
| `/download <url>` | Downloads a file from a valid HTTP or HTTPS URL into the user's Downloads directory (maximum file size: 50 MiB). | Response / Error |
| `/system info` | Displays verified hardware and platform metrics (OS, architecture, CPU, memory, Node.js version). | Result |
| `/network status` | Displays active network interfaces or simulated local offline-safe environment status. | Result |

#### Fictional Cyberpunk 2077 Commands

All commands below are simulated narrative experiences operating locally inside the sandbox:

| Command | Narrative Description | Immersive Behavior |
|---|---|---|
| `/get arasaka data` | Simulates accessing a confidential Arasaka Corporation database. | Returns varied encrypted fragments (Relic 2.0 biochip telemetry, orbital transport manifests, Mikoshi archives) with security clearance levels and warnings. |
| `/hack arasaka` | Launches a multi-stage netrunner intrusion sequence against Arasaka subnet ICE. | Plays 5 sequential animated progress steps in real time (ICE perimeter scan, daemon payload upload, Black ICE bypass, neural lock) accompanied by mascot glitch reaction. |
| `/network scan` | Simulates scanning Night City subnet nodes. | Generates a grid of fictional nodes (NC Gateway, Arasaka Subnet, Trauma Team Net, Night Corp) with latency, active daemons, and ICE defense levels. |
| `/netrunner status` | Displays the cyberdeck operator status dashboard. | Displays virtual RAM telemetry, neural link synchronization, buffer status, and Night City clearance levels. |
| `/ice status` | Displays the status of ICE (Intrusion Countermeasure Electronics) defenses. | Reports on all 4 defense layers, Blackwall simulation integrity, and confirms 100% local sandbox protection. |
| `/trace origin` | Initiates a multi-hop geolocation packet trace attempt. | Displays progress across Night City districts (Kabuki, Heywood, Pacifica) with neural proxy deflection. |
| `/decrypt <data>` | Simulates decrypting an input data string. | Validates arguments, simulates a brute-force quantum key computation (Neural-7 cipher), and outputs the decoded fragment. |
| `/connect <node>` | Simulates establishing an uplink with a target network node. | Validates node parameter and establishes a virtual connected session. |
| `/disconnect` | Terminates the active virtual node connection. | Safely severs the simulated uplink and returns the terminal to local mode. |
| `/inventory` | Displays Capri's fictional netrunner inventory. | Lists virtual tools, datashards, daemons, and neural interface hardware. |

#### Capri Mascot Control Commands

| Command | Description | Executed Action |
|---|---|---|
| `/capri teleport` (or `/teleport`) | Triggers Capri's teleportation animation across the screen. | Moves Capri to another screen corner. |
| `/capri satellite` (or `/satellite`) | Prompts Capri to look at the satellite. | Plays the special satellite animation. |
| `/capri chat` (or `/chat`) | Opens Capri's interactive AI chat panel. | Deploys the desktop conversation interface. |
| `/capri demo` (or `/demo`) | Starts Capri's full animation sequence demo. | Plays the demonstration sequence. |
| `/capri stow` (or `/stow`) | Stows Capri away into her biochip or restores her on the desktop. | Toggles mascot visibility. |

### 5. Security & Distinction Between Real and Simulated Actions

- **Controlled Real Operations:**
  - `/open app/<name>` strictly uses Capri's curated application registry without invoking shell execution.
  - `/open file/<path>` uses `safeOpenFile` to reject null bytes (`\0`), verify that the path references an actual file (not a folder or device), and uses Electron's native `shell.openPath`.
  - `/download <url>` strictly validates protocols (`http:` and `https:` only, rejecting `file:`, `javascript:`, etc.), prevents directory traversal, limits download destinations strictly to the user's `Downloads` folder, and enforces a strict 50 MiB file size ceiling.
  - No direct or arbitrary shell commands (`sh`, `bash`, `cmd.exe`, `powershell`) are executed.
- **Hermetic Fictional Operations:**
  - All Cyberpunk 2077 commands are local simulations. They perform no unprompted external network requests and make no actual system modifications.
  - Every fictional command explicitly identifies itself with a simulation notice (`[SIMULATION]`) preserving immersion while maintaining technical transparency.

## MacOS Permissions — System Configuration & Diagnostics

The **"macOS permissions…"** (or *"MacOS Permissions"*) option is available **strictly on macOS** (`process.platform === 'darwin'`) from Capri's mascot context menu (right-click), the status bar / tray menu, and the circular ring menu.

On Windows and Linux, this item is automatically hidden from the menus, and any system API calls return an unsupported status (`unsupported`) without impacting normal application execution.

### 1. Permissions Interface & Dashboard

The dedicated window is styled in Capri's cyberpunk aesthetic (dark background, glowing cyan and magenta accents, monospace typography) and offers:
- **Global Summary:** Active permission counter (e.g. `3 / 4 permissions granted`), dynamic status LED, and overall status indicator (`ALL PERMISSIONS GRANTED` or `MANUAL ACTION REQUIRED`).
- **Global Re-scan Button:** "Check All Permissions" to poll all native macOS TCC APIs on demand.
- **Restart Notice:** Highlights when an application restart is required for macOS to apply changes made in System Settings (particularly for Accessibility and Screen Recording).
- **Visual Status Badges:**
  - `GRANTED` (neon green): permission authorized and active.
  - `DENIED` (neon red): permission explicitly blocked in macOS TCC.
  - `ACTION REQUIRED` (neon amber): permission not yet granted or requiring manual setup in System Settings.
  - `UNKNOWN` (slate gray): state undetermined by OS APIs.

### 2. Supported Permission Sections

#### Section 1 — Accessibility
- **Purpose:** Enables Capri to interact with the macOS UI, inspect coordinates and titles of open windows, and perform necessary window manipulation actions.
- **Affected Capri Features:** Window possession (`possess`), window dragging (`possessMove`), window tracking, and non-intrusive mascot positioning.
- **Detection & Actions:** Checked via `systemPreferences.isTrustedAccessibilityClient(false)`. Offers a "Request Permission" button (triggers native macOS prompt if unprompted) and a direct link to `x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility`.

#### Section 5 — Microphone
- **Purpose:** Allows Capri voice features to capture microphone audio for spoken interactions.
- **Affected Capri Features:** Interactive voice chat, Speech-to-Text transcription (`ears`), microphone audio meter in circular menu, Push-to-Talk shortcut (`Ctrl+Alt+Space`).
- **Detection & Actions:** Checked via `systemPreferences.getMediaAccessStatus('microphone')`. Offers a "Request Permission" button (`systemPreferences.askForMediaAccess('microphone')`) or direct access to `Privacy_Microphone`.

#### Section 8 — Screen Recording
- **Purpose:** Allows visual screen capture for multimodal AI vision analysis and window context awareness.
- **Affected Capri Features:** Visual senses ("See my screen" / `vision`), contextual development assistance, and workspace layout awareness.
- **Detection & Actions:** Checked via `systemPreferences.getMediaAccessStatus('screen')`. Because macOS requires manual user activation for screen recording, explicit instructions and a direct link to `Privacy_ScreenCapture` are provided.

#### Section 13 — Automation & Apple Events
- **Purpose:** Allows Capri to send Apple Events to other applications (such as `System Events` and media players) to open, close, or focus programs on demand.
- **Affected Capri Features:** Graceful application closing, system window orchestration, and media player controls.
- **Detection & Actions:** Probed via AppleScript `osascript` calls. Includes a button to test access or open `Privacy_Automation`.

### 3. Window Management & Navigation (macOS)

An interactive diagnostics panel, **"Window Management & Navigation (macOS)"**, is integrated into the window:
- **List Open Windows:** Queries `System Events` and lists all visible desktop windows with application names, window titles, coordinates (X, Y), and dimensions (W, H).
- **Focus / Activate:** Brings the selected application into focus in the foreground without losing context.
- **Move (+20px):** Repositions the target window when Accessibility is granted.
- **Graceful Error Handling:** If Accessibility or Automation is denied, a clear notification explains that the action was blocked by macOS security policies, without causing application errors.

### 4. Technical Architecture & Security

- Complete renderer process isolation (`contextIsolation: true`, `sandbox: true`, no direct exposure of Node.js or `ipcRenderer`).
- Explicit, typed IPC contract exposed through `mac-permissions-preload.js` via `contextBridge.exposeInMainWorld('macPermissions', ...)`.
- Full respect for macOS Transparency, Consent, and Control (TCC) mechanisms without bypassing sandbox boundaries.

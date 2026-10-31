# Capri Project Structure

## Architecture

Capri is an Electron application. The Main process controls windows, system services, configuration, and external connections. Renderer pages display the overlay, menus, and dedicated windows. Preloads expose targeted functions through `contextBridge`; Renderers do not have direct access to Node.js. Processes communicate through IPC.

Typical flow: hook event or user action → Main/IPC → business service (AI, system, files, or audio) → result → Renderer. AI requests, cloud transcription, and vision features may transmit the required data to the selected provider.

## Complete Version-Controlled Directory Tree

Tree generated from the 244 paths tracked by Git at the beginning of the audit. Four files created for this audit or its security fixes are also listed in the index: `STRUCTURE.md`, `SECURITY_AUDIT.md`, `src/main/electron-security.js`, and `tests/electron-security.test.js`. `node_modules` and ignored local files are excluded.

```text
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
│   │   ├── chess-window\.js
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
│   │   │   ├── steps-view\.js
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
```

## Electron Process

- `src/main/main.js` starts the application, the `capri://app` protocol, the overlay, the menu, and the IPC handlers.
- `src/preload.js` exposes the main Renderer API; the other preloads are isolated by page.
- Windows enable `contextIsolation` and `sandbox`, while disabling `nodeIntegration`.
- `src/main/electron-security.js` blocks popups and navigations outside `capri://app/`.
- The local protocol also serves user-provided sounds.
- Not all main IPC handlers consistently validate the identity of the calling window yet. A compromised local Renderer would therefore have access to a significant range of capabilities; see the security audit.

### Important Main Functions

| Function | Role and Interactions |
|---|---|
| `main()` | Locks the application instance, then installs security guards, the protocol, IPC, and windows. |
| `registerIpc()` | Registers commands for chat, configuration, applications, permissions, files, voice, and automation. |
| `rendererConfig()` / `updateConfig(patch)` | Excludes secret keys from Renderer configuration and broadcasts changes. |
| `serveProtocol()` | Serves local resources and rejects paths outside the resolved root directory. |
| `createIncomingCall(...)` | Handles incoming calls and only accepts transcriptions after the call has been accepted. |
| `createChessWindow(...)` | Maintains a chess game and restricts IPC to the relevant Renderer. |
| `createTextDocument({filename, content, directory})` | Creates a document exclusively and then reads its content back. |
| `openVideoSearch({creator, browser})` | Builds a YouTube search sorted by date. |
| `createBridge({port, onEvent, onDebug})` | Receives hooks through the local loopback interface, limits request size, and rejects requests containing an Origin header. |
| `checkAllPermissions(...)` / `requestAutomationTarget(...)` | Returns only verifiable macOS permission states; automation requires explicit user action. |
| `createMusicController(...)` | Selects a media player adapter and returns success, an error, or an ambiguity result. |

## Interface and Business Logic

- `src/renderer/js/app.js` connects Main events, components, chat, and voice.
- `capri.js`, `acting.js`, `sprite.js`, `fx.js`, and `fx-life.js` handle the mascot, its sprites, and Canvas effects.
- `panel.js`, `ring.js`, `ring-tabs.js`, `ring-ui.js`, and `themes.js` compose the conversation interface, radial menu, and settings.
- `chat.js` routes explicit requests to available actions and delegates other requests to the AI provider.
- `hands.js` prepares window controls and messages; sensitive actions follow a confirmation flow.
- `brain.js`, `mood.js`, `heart.js`, `bond.js`, `life.js`, and `mission.js` compose personality, mood, and autonomous behaviors.
- `ears.js`, `speech.js`, `voice.js`, and `rhythm.js` connect the microphone, recognition, synthesis, and audio systems.

## Services

- **AI:** `llm.js` selects the provider; `anthropic.js` and `ollama.js` provide dedicated clients; other providers may be OpenAI-compatible.
- **Applications:** `launch.js` discovers and resolves applications; `apps.js` queries and closes active applications.
- **Windows:** `windows.js`, `mover.js`, `control.js`, and `mac-permissions.js` handle OS-dependent operations.
- **Audio:** `stt.js`, `tts.js`, `piper.js`, `chatterbox.js`, and `music-control.js` connect interfaces to audio engines.
- **Files:** `documents.js` creates files without overwriting existing ones; `cleanup.js` only removes items identified as belonging to Capri.
- **Configuration:** `config.js` uses Electron's `userData` directory. `setup.js` encrypts new keys using `safeStorage`; legacy unencrypted values remain readable for compatibility.

## Terminal, Calls, and Chess

The terminal parser is `src/main/terminal.js`; its page and history are handled by `src/renderer/terminal.html` and `src/renderer/js/terminal.js`. `HELP_COMMANDS` lists the available commands. Shared services include music, chess, documents, video search, and demonstrations.

The calling feature uses `incoming-call.js`, `call.html`, `call-ui.js`, and `call.css`. Accepting a call starts the existing microphone services; the conversation uses the text that was actually transcribed and sent to speech synthesis.

Chess uses `chess-game.js` for the rules and `chess-window\.js` for game state and IPC. The bot does not have a calibrated Elo rating.

## Assets, Translations, Tests, and Scripts

- `assets/` contains sprites, illustrations, icons, sounds, fonts, and licenses; `docs/` contains guide images.
- The main strings are located in `labels.js`, `hub-lines.js`, `prepare-lines.js`, `renderer/js/lines.js`, and `lines-life.js`; some windows have their own local string tables.
- `tests/` contains Node.js tests; `tests/fixtures/` contains mock executables and test data.
- `scripts/` contains npm tools for demonstrations, installation, and diagnostics; `tools/` rebuilds resources outside normal application startup.
- `.github/workflows/release.yml` handles releases; `build/installer.nsh` customizes the Windows installer.

## Individual Index of Tracked Files

All 244 tracked files are listed individually. Binary files are described as resources; `node_modules` is external and excluded.

| Path | Purpose |
|---|---|
| **`STRUCTURE.md`** | This document: architecture, directory tree, and file index. |
| **`SECURITY_AUDIT.md`** | Security methodology, findings, fixes, and remaining risks. |
| **`src/main/electron-security.js`** | Global security guards against external navigation and Electron child windows. |
| **`tests/electron-security.test.js`** | Tests the rejection of popups and non-Capri navigations. |
| **`.gitattributes`** | Git attributes. |
| **`.github/RELEASE_NEWS.md`** | Release notes. |
| **`.github/workflows/release.yml`** | GitHub workflow configuration. |
| **`.gitignore`** | Git exclusions. |
| **`INFO.md`** | Attributions and reference repositories. |
| **`LICENSE`** | MIT license for the code; assets retain their own licenses. |
| **`README.md`** | Overview, installation, configuration, and features. |
| **`assets/capri-calling-image.png`** | Binary resource for the interface or package. |
| **`assets/capri/capri-cutout.png`** | Mascot image or animation frame. |
| **`assets/capri/capri-face.png`** | Mascot image or animation frame. |
| **`assets/capri/capri-full.png`** | Mascot image or animation frame. |
| **`assets/capri/cutin-eyes.png`** | Mascot image or animation frame. |
| **`assets/capri/cutin-grin.png`** | Mascot image or animation frame. |
| **`assets/capri/cutin-laugh.png`** | Mascot image or animation frame. |
| **`assets/capri/cutin-look.png`** | Mascot image or animation frame. |
| **`assets/capri/cutin-many.png`** | Mascot image or animation frame. |
| **`assets/capri/face-aside.png`** | Mascot image or animation frame. |
| **`assets/capri/face-calm.png`** | Mascot image or animation frame. |
| **`assets/capri/face-laugh.png`** | Mascot image or animation frame. |
| **`assets/capri/face-look.png`** | Mascot image or animation frame. |
| **`assets/capri/face-many.png`** | Mascot image or animation frame. |
| **`assets/capri/face-smug.png`** | Mascot image or animation frame. |
| **`assets/capri/face-wide.png`** | Mascot image or animation frame. |
| **`assets/capri/intro-grab.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-happy.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-mouth1.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-mouth2.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-mouth3.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-smear.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-wave1.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-wave2.webp`** | Mascot image or animation frame. |
| **`assets/capri/intro-wave3.webp`** | Mascot image or animation frame. |
| **`assets/fonts/LICENSE-chakra-petch.txt`** | Embedded font or license. |
| **`assets/fonts/LICENSE-jetbrains-mono.txt`** | Embedded font or license. |
| **`assets/fonts/chakra-petch-latin-600-normal.woff2`** | Embedded font or license. |
| **`assets/fonts/chakra-petch-latin-700-normal.woff2`** | Embedded font or license. |
| **`assets/fonts/jetbrains-mono-cyrillic-400-normal.woff2`** | Embedded font or license. |
| **`assets/fonts/jetbrains-mono-cyrillic-600-normal.woff2`** | Embedded font or license. |
| **`assets/fonts/jetbrains-mono-latin-400-normal.woff2`** | Embedded font or license. |
| **`assets/fonts/jetbrains-mono-latin-600-normal.woff2`** | Embedded font or license. |
| **`assets/icons/capri.ico`** | Application or system tray icon. |
| **`assets/icons/capri.png`** | Application or system tray icon. |
| **`assets/icons/tray.png`** | Application or system tray icon. |
| **`assets/songs/phone-call.mp3`** | Audio resource. |
| **`assets/voice-default/README.md`** | Overview, installation, configuration, and features. |
| **`build/installer.nsh`** | Windows NSIS installer customization. |
| **`docs/ai.png`** | Guide screenshot or illustration. |
| **`docs/bond.png`** | Guide screenshot or illustration. |
| **`docs/dance.png`** | Guide screenshot or illustration. |
| **`docs/done.png`** | Guide screenshot or illustration. |
| **`docs/faces.png`** | Guide screenshot or illustration. |
| **`docs/guide.png`** | Guide screenshot or illustration. |
| **`docs/intro.png`** | Guide screenshot or illustration. |
| **`docs/life.png`** | Guide screenshot or illustration. |
| **`docs/moods.png`** | Guide screenshot or illustration. |
| **`docs/peek.png`** | Guide screenshot or illustration. |
| **`docs/point.png`** | Guide screenshot or illustration. |
| **`docs/possess.png`** | Guide screenshot or illustration. |
| **`docs/ring.png`** | Guide screenshot or illustration. |
| **`docs/senses.png`** | Guide screenshot or illustration. |
| **`docs/sit.png`** | Guide screenshot or illustration. |
| **`docs/sleep.png`** | Guide screenshot or illustration. |
| **`docs/star.png`** | Guide screenshot or illustration. |
| **`docs/teleport.png`** | Guide screenshot or illustration. |
| **`docs/themes.png`** | Guide screenshot or illustration. |
| **`docs/victory.png`** | Guide screenshot or illustration. |
| **`hooks/capri-agy-hook.js`** | Assistant hook that sends an event to the local Capri service. |
| **`hooks/capri-codex-hook.js`** | Assistant hook that sends an event to the local Capri service. |
| **`hooks/capri-hook.js`** | Assistant hook that sends an event to the local Capri service. |
| **`package-lock.json`** | Exact versions of resolved packages. |
| **`package.json`** | Metadata, npm scripts, dependencies, and Electron Builder configuration. |
| **`scripts/check-llm.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/demo-sequence.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/demo.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/install-codex-hooks.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/install-hooks-agy.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/install-hooks.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/install-node.ps1`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/release-notes.js`** | Development, installation, diagnostic, or demonstration script. |
| **`scripts/voice-demo.js`** | Development, installation, diagnostic, or demonstration script. |
| **`src/hub-preload.js`** | JavaScript code for the component identified by the path. |
| **`src/mac-permissions-preload.js`** | JavaScript code for the component identified by the path. |
| **`src/main/anthropic.js`** | Anthropic API client for conversation and vision. |
| **`src/main/app-aliases.js`** | Centralized multilingual application alias dictionary. |
| **`src/main/apps.js`** | Lists, searches, and closes active applications. |
| **`src/main/assistants.js`** | Catalog of coding assistants. |
| **`src/main/bridge.js`** | Local HTTP server for hook events. |
| **`src/main/chatterbox-server.py`** | OpenAI-compatible local text-to-speech server. |
| **`src/main/chatterbox-setup.js`** | Detects Python and prepares the Chatterbox environment. |
| **`src/main/chatterbox.js`** | Manages the local Chatterbox process. |
| **`src/main/chess-game.js`** | Local chess rules and approximate bot strategy. |
| **`src/main/chess-window\.js`** | Chess window, game state, and restricted IPC. |
| **`src/main/cleanup.js`** | Cleans up components identified as belonging to Capri. |
| **`src/main/config.js`** | Loads, caches, and writes user configuration. |
| **`src/main/control.js`** | Windows operations and input handling. |
| **`src/main/documents.js`** | Validation, exclusive file creation, and text file verification. |
| **`src/main/farewell.js`** | Goodbye sequence and application shutdown. |
| **`src/main/fetch-files.js`** | Downloads and extracts archives with path traversal protection. |
| **`src/main/hardware.js`** | Collects hardware information for recommendations. |
| **`src/main/hub-lines.js`** | Localized configuration text. |
| **`src/main/hub.js`** | Main configuration window. |
| **`src/main/incoming-call.js`** | Call lifecycle and IPC/transcription validation. |
| **`src/main/installed.js`** | Inventory of components installed by Capri. |
| **`src/main/labels.js`** | Menu labels and languages. |
| **`src/main/launch.js`** | Discovers applications, resolves names and aliases, then opens applications or websites. |
| **`src/main/llm.js`** | AI provider catalog and routing. |
| **`src/main/mac-permissions.js`** | macOS permission states, Apple Events requests, settings, and windows. |
| **`src/main/main.js`** | Electron Main entry point: windows, menu, configuration, services, lifecycle, and IPC. |
| **`src/main/media-control.ps1`** | Windows media control. |
| **`src/main/media.js`** | Monitors media metadata. |
| **`src/main/media.ps1`** | Windows media metadata. |
| **`src/main/mover.js`** | Coordinates window movement. |
| **`src/main/mover.ps1`** | PowerShell helper for moving windows. |
| **`src/main/music-control.js`** | Media player selection and system adapters. |
| **`src/main/node-check.js`** | Detects and installs Node.js with checksum verification. |
| **`src/main/ollama-host.js`** | Locates and manages the Ollama process. |
| **`src/main/ollama.js`** | Client for the local Ollama server. |
| **`src/main/piper.js`** | Local Piper speech engine. |
| **`src/main/prepare-lines.js`** | Localized preparation text. |
| **`src/main/prepare.js`** | Preparation window and progress tracking. |
| **`src/main/proc.js`** | Process utilities and Python discovery. |
| **`src/main/profiles.js`** | Resource profiles and model/voice recommendations. |
| **`src/main/provision.js`** | Orchestrates the setup of local dependencies. |
| **`src/main/screen.js`** | Screen capture for the vision service. |
| **`src/main/setup.js`** | Prepares Ollama and encrypts new keys using `safeStorage`. |
| **`src/main/stacking.js`** | Restores the overlay to the foreground. |
| **`src/main/stt.js`** | Transcription through a cloud engine or compatible server. |
| **`src/main/terminal.js`** | Parses terminal commands and delegates them to Main services. |
| **`src/main/tts.js`** | Routes speech synthesis. |
| **`src/main/tune.js`** | Adapts requests according to the model and local measurements. |
| **`src/main/video-search.js`** | YouTube search sorted by date. |
| **`src/main/voice-sample.js`** | Voice sample validation and management. |
| **`src/main/windows.js`** | Observes system windows. |
| **`src/main/windows.ps1`** | Collects Windows window information. |
| **`src/preload.js`** | JavaScript code for the component identified by the path. |
| **`src/prepare-preload.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/call-ui.js`** | Call states, controls, and transcriptions. |
| **`src/renderer/call.css`** | Styles for the corresponding interface. |
| **`src/renderer/call.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/chess-ui.js`** | Chessboard, moves, and promotion. |
| **`src/renderer/chess.css`** | Styles for the corresponding interface. |
| **`src/renderer/chess.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/hub.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/index.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/js/acting.js`** | Poses and animation playback. |
| **`src/renderer/js/app.js`** | Combines events, chat, voice, and Capri's state. |
| **`src/renderer/js/bond.js`** | Stored preferences. |
| **`src/renderer/js/brain-providers.js`** | AI provider catalog. |
| **`src/renderer/js/brain.js`** | Reactions to assistants and conversation. |
| **`src/renderer/js/capri-satellite-test.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/capri.js`** | Mascot: geometry, posture, movement, and reactions. |
| **`src/renderer/js/chat.js`** | Interprets explicit requests and orchestrates chat. |
| **`src/renderer/js/chip.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/custom.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/ears.js`** | Microphone and transcription. |
| **`src/renderer/js/eyes.js`** | Visual queries. |
| **`src/renderer/js/fx-life.js`** | Effects for autonomous behaviors. |
| **`src/renderer/js/fx.js`** | Canvas effects, greetings, and animated text. |
| **`src/renderer/js/guide.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/hands.js`** | Interprets controls and prepares actions. |
| **`src/renderer/js/heart.js`** | Emotional expression. |
| **`src/renderer/js/hub.js`** | Main configuration window. |
| **`src/renderer/js/ledges.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/life.js`** | Autonomous planning. |
| **`src/renderer/js/lines-life.js`** | Localized autonomous dialogue. |
| **`src/renderer/js/lines.js`** | Localized dialogue. |
| **`src/renderer/js/mac-permissions.js`** | macOS permission states, Apple Events requests, settings, and windows. |
| **`src/renderer/js/mission.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/mood.js`** | Mood and emotional classification. |
| **`src/renderer/js/panel.js`** | Conversation bubble and actions. |
| **`src/renderer/js/pointer-life.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/possession.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/prepare.js`** | Preparation window and progress tracking. |
| **`src/renderer/js/rhythm.js`** | Rhythm analysis and animation. |
| **`src/renderer/js/ring-tabs.js`** | Menu sections and settings. |
| **`src/renderer/js/ring-ui.js`** | Shared DOM components. |
| **`src/renderer/js/ring.js`** | Radial menu geometry. |
| **`src/renderer/js/satellite-wait.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/setup.js`** | Prepares Ollama and encrypts new keys using `safeStorage`. |
| **`src/renderer/js/speech.js`** | Renderer speech synthesis. |
| **`src/renderer/js/sprite.js`** | Image loading and rendering. |
| **`src/renderer/js/steps-view\.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/terminal.js`** | Parses terminal commands and delegates them to Main services. |
| **`src/renderer/js/themes.js`** | Theme palettes. |
| **`src/renderer/js/util.js`** | JavaScript code for the component identified by the path. |
| **`src/renderer/js/voice.js`** | Voice and device selection. |
| **`src/renderer/mac-permissions.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/prepare.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/renderer/styles/capri.css`** | Styles for the corresponding interface. |
| **`src/renderer/styles/hub.css`** | Styles for the corresponding interface. |
| **`src/renderer/styles/mac-permissions.css`** | Styles for the corresponding interface. |
| **`src/renderer/styles/prepare.css`** | Styles for the corresponding interface. |
| **`src/renderer/styles/ring.css`** | Styles for the corresponding interface. |
| **`src/renderer/styles/terminal.css`** | Styles for the corresponding interface. |
| **`src/renderer/terminal.html`** | Structure of an Electron page with local scripts and styles. |
| **`src/terminal-preload.js`** | JavaScript code for the component identified by the path. |
| **`tests/acting.test.js`** | Tests for the acting domain; system services are mocked when necessary. |
| **`tests/anthropic.test.js`** | Tests for the anthropic domain; system services are mocked when necessary. |
| **`tests/bond.test.js`** | Tests for the bond domain; system services are mocked when necessary. |
| **`tests/character.test.js`** | Tests for the character domain; system services are mocked when necessary. |
| **`tests/chat.test.js`** | Tests for the chat domain; system services are mocked when necessary. |
| **`tests/chatterbox.test.js`** | Tests for the chatterbox domain; system services are mocked when necessary. |
| **`tests/chess-game.test.js`** | Tests for the chess game domain; system services are mocked when necessary. |
| **`tests/claudecode.test.js`** | Tests for the claudecode domain; system services are mocked when necessary. |
| **`tests/cleanup.test.js`** | Tests for the cleanup domain; system services are mocked when necessary. |
| **`tests/config.test.js`** | Tests for the config domain; system services are mocked when necessary. |
| **`tests/documents.test.js`** | Tests for the documents domain; system services are mocked when necessary. |
| **`tests/farewell.test.js`** | Tests for the farewell domain; system services are mocked when necessary. |
| **`tests/fixtures/build-stub-wheel.py`** | Mock program or isolated test data. |
| **`tests/fixtures/fake-ollama.js`** | Mock program or isolated test data. |
| **`tests/fixtures/fake-piper.js`** | Mock program or isolated test data. |
| **`tests/hardware.test.js`** | Tests for the hardware domain; system services are mocked when necessary. |
| **`tests/heart.test.js`** | Tests for the heart domain; system services are mocked when necessary. |
| **`tests/hooks.test.js`** | Tests for the hooks domain; system services are mocked when necessary. |
| **`tests/hub.test.js`** | Tests for the hub domain; system services are mocked when necessary. |
| **`tests/incoming-call.test.js`** | Tests for the incoming call domain; system services are mocked when necessary. |
| **`tests/labels.test.js`** | Tests for the labels domain; system services are mocked when necessary. |
| **`tests/launch-resolver.test.js`** | Tests for the launch resolver domain; system services are mocked when necessary. |
| **`tests/ledges.test.js`** | Tests for the ledges domain; system services are mocked when necessary. |
| **`tests/mac-permissions.test.js`** | Tests for the macOS permissions domain; system services are mocked when necessary. |
| **`tests/mover.test.js`** | Tests for the mover domain; system services are mocked when necessary. |
| **`tests/music-control.test.js`** | Tests for the music control domain; system services are mocked when necessary. |
| **`tests/node-check.test.js`** | Tests for the Node check domain; system services are mocked when necessary. |
| **`tests/ollama-host.test.js`** | Tests for the Ollama host domain; system services are mocked when necessary. |
| **`tests/openai.test.js`** | Tests for the OpenAI domain; system services are mocked when necessary. |
| **`tests/piper.test.js`** | Tests for the Piper domain; system services are mocked when necessary. |
| **`tests/possession.test.js`** | Tests for the possession domain; system services are mocked when necessary. |
| **`tests/prepare.e2e.test.js`** | Tests for the prepare.e2e domain; system services are mocked when necessary. |
| **`tests/profiles.test.js`** | Tests for the profiles domain; system services are mocked when necessary. |
| **`tests/provision.test.js`** | Tests for the provision domain; system services are mocked when necessary. |
| **`tests/release.test.js`** | Tests for the release domain; system services are mocked when necessary. |
| **`tests/ring.test.js`** | Tests for the ring domain; system services are mocked when necessary. |
| **`tests/satellite-wait.test.js`** | Tests for the satellite wait domain; system services are mocked when necessary. |
| **`tests/screen-capture.test.js`** | Tests for the screen capture domain; system services are mocked when necessary. |
| **`tests/senses.test.js`** | Tests for the senses domain; system services are mocked when necessary. |
| **`tests/stacking.test.js`** | Tests for the stacking domain; system services are mocked when necessary. |
| **`tests/terminal.test.js`** | Tests for the terminal domain; system services are mocked when necessary. |
| **`tests/tune.test.js`** | Tests for the tune domain; system services are mocked when necessary. |
| **`tests/video-search.test.js`** | Tests for the video search domain; system services are mocked when necessary. |
| **`tests/voice-demo.test.js`** | Tests for the voice demo domain; system services are mocked when necessary. |
| **`tests/voice-sample.test.js`** | Tests for the voice sample domain; system services are mocked when necessary. |
| **`tools/build-cutins.py`** | Resource builder used during development. |
| **`tools/build-intro.py`** | Resource builder used during development. |
| **`tools/build-sprite.py`** | Resource builder used during development. |

## Local Items and Files Not Executed at Startup

- `node_modules/` is installed by npm from `package-lock.json`; external dependencies are not detailed here.
- `.env`, `.private/`, `.DS_Store`, models, and configuration files are local or ignored in this copy; they are not part of the 244 tracked paths.
- `FEATURES.md` and `FEATURES.fr.md` are located in the ignored `.private/` directory and are not part of the public version-controlled corpus.
- Scripts in `tools/` rebuild images and are not required for normal application startup.
# Capri Project Structure

## Architecture

Capri is an Electron desktop application. The Main process owns windows, configuration, system
services, filesystem operations, and external connections. Renderer pages draw the desktop pet,
menus, chat, and dedicated windows. Preloads expose a small set of capabilities through
`contextBridge`; Renderer modules call those capabilities through IPC rather than importing Node.js
or Electron directly.

Typical flow:

```text
user action or hook
        ↓
Renderer component → preload capability → Main IPC handler
        ↑                                      ↓
UI update / result ← service module ← OS, filesystem, local service, or provider
```

Provider calls may transmit the prompt, conversation context, image, or audio required by the
selected feature. See [SECURITY.md](SECURITY.md) for the data boundaries and known limitations.

## Project map

```text
capri-desktop/
├── assets/                 Character art, fonts, icons, sounds, bundled voice assets
├── build/                  Installer customization
├── docs/                   Screenshots and feature illustrations
├── hooks/                  Claude Code, Codex, and Antigravity event hooks
├── scripts/                Development, setup, demo, release, and hook-install scripts
├── src/
│   ├── main/               Electron Main process and platform/service adapters
│   │   ├── main.js          Startup, windows, IPC registration, tray, lifecycle
│   │   ├── config.js        Persistent user configuration
│   │   ├── setup.js         AI provider/key setup and encrypted credential handling
│   │   ├── system.js        Allowlisted OS actions, including chat PC care
│   │   ├── devices.js       Windows audio/radio/USB/brightness/Game Bar adapters
│   │   ├── setups.js        Saved window and audio workspace layouts
│   │   ├── unkeep.js        PC-care inspection and cleanup operations
│   │   ├── apps.js          Application discovery and launching support
│   │   ├── files.js         Local file search and opening
│   │   ├── documents.js     Safe text-document creation
│   │   ├── llm.js           AI provider requests
│   │   ├── stt.js / tts.js  Speech recognition and synthesis
│   │   ├── screen.js        Screen capture and display support
│   │   └── bridge.js        Loopback coding-assistant hook bridge
│   ├── renderer/
│   │   ├── js/              Pet, chat, menus, and feature components
│   │   │   ├── app.js       Renderer composition and lifecycle
│   │   │   ├── chat.js      Chat, intent routing, replies, and action offers
│   │   │   ├── care.js      PC-care intent parsing and review flows
│   │   │   ├── breaks.js    Idle-aware health-break reminders
│   │   │   ├── brain*.js    Provider selection, prompts, and model behavior
│   │   │   ├── hands.js     Window and message actions
│   │   │   ├── eyes.js      Screen-vision flow
│   │   │   ├── ears.js      Voice input and conversation flow
│   │   │   ├── reminders.mjs Reminders and timer scheduling
│   │   │   ├── ring*.js     Circular menu and its UI
│   │   │   └── panel.js     Chat, status, and notification panel
│   │   ├── styles/          Overlay, menu, and dedicated-window styles
│   │   ├── index.html       Main overlay document
│   │   ├── hub.html         Main settings window
│   │   ├── terminal.html    Command terminal
│   │   └── call.html        Voice-call window
│   ├── preload.js           Narrow API for the main overlay
│   ├── hub-preload.js       Settings-window API
│   ├── terminal-preload.js  Terminal-window API
│   └── prepare-preload.js   Setup-window API
├── tests/                   Node built-in test-runner tests and fixtures
├── package.json             Scripts, dependencies, build targets, packaging
└── README.md                Installation, usage, features, and developer guide
```

Some platform helpers are JavaScript, PowerShell, or Python. Files are grouped by service and
feature rather than by UI screen alone.

## Main flows

### Startup and configuration

`src/main/main.js` acquires the single-instance lock, initializes configuration and services,
registers IPC, creates the transparent overlay and tray, and starts watchers. `config.js` persists
settings in Capri's user-data directory. Before configuration reaches a Renderer,
`rendererConfig()` removes API key values. `setup.js` seals new keys with Electron `safeStorage`.

### Renderer composition

`src/renderer/js/app.js` creates the shared objects (Capri, panel, brain, chat, reminders, voice,
PC controls, and menus), wires their callbacks, and applies configuration updates. Components such
as `care.js`, `breaks.js`, `eyes.js`, and `jealousy.js` keep feature-specific behavior out of the
composition root.

Chat parses explicit requests in `chat.js` and `care.js`. It performs low-risk actions through
preload capabilities and presents buttons for actions requiring review. `preload.js` forwards
those requests to named Main handlers, which delegate to service modules such as `system.js`,
`devices.js`, `setups.js`, and `unkeep.js`.

### Platform services

Keep operating-system behavior in Main-process service modules. `system.js` exposes named PC
operations and delegates platform-specific work to adapters. `apps.js` and `launch.js` resolve
applications; `files.js` handles local file search; `mover.js`, `windows.js`, and `screen.js` handle
window/display operations. Provider, media, voice, translation, and chess behavior also live in
separate service modules.

### Tests and scripts

Tests use Node's built-in `node:test` runner. Run all tests with `npm test`; focused scripts such as
`npm run test:chat` and `npm run test:desktop-integration` are listed in `package.json`. Desktop
integration tests may query real devices and sessions and have explicit opt-in environment flags.

Useful commands:

```bash
npm install
npm start
npm run dev
npm test
npm run demo
npm run check:llm
npm run voices:demo
npm run dist
npm run dist:mac
npm run dist:linux
```

## Supported languages

The application's supported UI and dialogue languages are French, English, and Russian. System
language detection selects among those languages and falls back to English. A configured AI model
may answer in another language, but that does not mean Capri's interface or local feature messages
support it.

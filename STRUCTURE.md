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
├── assets/                 Character art, fonts, icons, sounds, voices, and bundled music tracks
├── build/                  Installer customization
│   └── mac-update-helper.sh Fixed macOS bundle staging and rollback helper
├── docs/                   Screenshots and feature illustrations
├── hooks/                  Claude Code, Codex, and Antigravity event hooks
├── scripts/                Development, setup, demo, release, and hook-install scripts
│   ├── create-update-manifest.js  Asset hashing and Ed25519 manifest signing in CI
│   └── generate-update-key.js      Offline Ed25519 key-pair generator
├── src/
│   ├── main/               Electron Main process and platform/service adapters
│   │   ├── main.js          Startup, windows, IPC registration, tray, lifecycle
│   │   ├── data-mods.js     Validated local palette/accessory mods and saved-version history
│   │   ├── chess-game.js    Chess rules, SAN and in-memory position snapshots
│   │   ├── chess-window.js  Chess window, guarded commands and state publication
│   │   ├── music-player.js Mini-player window, local-track requests and playback IPC
│   │   ├── config.js        Persistent user configuration
│   │   ├── structured-memory.js  Structured local memory store
│   │   ├── privacy-tools.js Local Markdown import/export, inventory, retention and purge
│   │   ├── data-window.js  Data-management window, folder dialogs and guarded IPC
│   │   ├── draw-window.js  Drawing window, validated local files and autosave
│   │   ├── computer-control.js  Permission-gated primary-screen capture, cursor overlay, and click adapter
│   │   ├── games-window.js Allowlisted independent local-game windows
│   │   ├── version-window.js Update window and confirmed install IPC
│   │   ├── update-manager.js HTTPS release lookup, signature/hash validation and download
│   │   ├── update-helper.js Revalidates the handoff and starts platform installation
│   │   ├── update-public-key.pem Embedded Ed25519 release-verification key
│   │   ├── setup.js         AI provider/key setup and encrypted credential handling
│   │   ├── system.js        Allowlisted OS actions, including chat PC care
│   │   ├── devices.js       Windows audio/radio/USB/brightness/Game Bar adapters
│   │   ├── setups.js        Saved window and audio workspace layouts
│   │   ├── unkeep.js        PC-care inspection and cleanup operations
│   │   ├── apps.js          Application discovery and launching support
│   │   ├── files.js         Local file search and opening
│   │   ├── documents.js     Safe text-document creation
│   │   ├── llm.js           AI provider requests
│   │   ├── web-search.js    Browser searches and short Wikipedia answers
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
│   │   ├── games/           Standalone tic-tac-toe and 2048 game logic
│   │   ├── index.html       Main overlay document
│   │   ├── chess.html / chess-ui.js / chess.css  Chess board, history navigation and orientation
│   │   ├── game.html / game.js / game.css        Tic-tac-toe and 2048 game windows
│   │   ├── computer-control.html / .js / .css     Compact live preview, target proposal, and control panel
│   │   ├── computer-confirm.html / .js / .css     Lower-right allow/refuse prompt for a pending click
│   │   ├── computer-cursor.html / .css             Transparent click-through cursor overlay
│   │   ├── music-player.html / music-player.js / music-player.css  Local and system media controls
│   │   ├── music-library.js Shared bundled MP3 catalog and local asset URLs
│   │   ├── hub.html         Main settings window
│   │   ├── terminal.html    Command terminal
│   │   ├── call.html        Voice-call window
│   │   └── version.html     Signed update status and controls
│   ├── preload.js           Narrow API for the main overlay
│   ├── data-preload.js      Data/Markdown window API
│   ├── draw-preload.js      Drawing window API
│   ├── computer-control-preload.js  Narrow preview, proposal, cancellation, and pointer-action API
│   ├── computer-control-confirm-preload.js  Allow/refuse access to the one pending click plan
│   ├── games-preload.js     Local-game window API
│   ├── version-preload.js   Narrow update-window API
│   ├── hub-preload.js       Settings-window API
│   ├── terminal-preload.js  Terminal-window API
│   └── prepare-preload.js   Setup-window API
├── tests/                   Node built-in tests, including privacy, drawing and game logic/IPC
├── package.json             Scripts, dependencies, build targets, packaging
├── SECURITY_AUDIT.md        Update-channel threats, protections and limits
└── README.md                Installation, usage, features, and developer guide
```

Some platform helpers are JavaScript, PowerShell, or Python. Files are grouped by service and
feature rather than by UI screen alone.

### Data mods and mode editing

`data-mods.js` validates `.capri-mod` data, stores the active mod manifest, applies edits, and keeps
up to 50 previous file versions per mod under the user's `mods/.history/<id>/` directory. Its
history API validates a selected snapshot before restoring it and snapshots the replaced version as
well. Main exposes update/history/restore through sender-checked IPC and refreshes the overlay
configuration after a successful change. It also supports `kind: "music"` modes with local-home
relative paths or direct HTTPS media URLs. Main turns local track IDs into a guarded
`capri://music/<mode>__<track>` source; the circular Mods tab and system menu can create a music
mode from a user-selected folder beneath home. The mini-player catalog merges active music modes with its
bundled tracks and can refresh when a mode is enabled or removed. The circular menu's Mods tab contains the editor; the
system tray's **General settings → Mods → Edit modes…** opens that same tab. Palette values have
colour pickers for effect colours and numeric controls for hue, mix, saturation, and brightness.
Accessory editing includes a scaled Capri preview that can be dragged, pixel-exact X/Y inputs, and
size sliders. The card is wider than other circular-menu cards, stays vertically centered after
asynchronous content loads, and its body scrolls when the content exceeds the viewport.

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

### Music player and bundled tracks

`src/renderer/music-library.js` is the single allowlisted catalog for the five bundled songs in
`assets/songs/`. The mini-player loads these assets through Capri's local application protocol and
handles browser audio playback and its controls in `music-player.js`. Chat recognizes explicit
play requests by matching a bundled title, then calls a narrow preload capability; during a voice
call the existing transcript-to-chat flow uses the same route. Main validates the overlay sender
and catalog ID, opens the mini-player, and reports success only after its renderer confirms that
`audio.play()` started. This keeps arbitrary paths and remote URLs out of the playback request.
If the browser script has no catalog at startup, the mini-player requests the fixed catalog through
its sender-validated preload IPC, then signals readiness before Main dispatches queued playback.
The selector is populated from that catalog, and playback acknowledgements are returned only after
the audio element's `play()` promise resolves; asynchronous audio errors update the visible player
state without changing the catalog or accepting arbitrary file paths.

Factual questions recognized by `chat.js` use `webAnswer` through preload and a sender-validated
Main IPC handler. `web-search.js` queries the fixed Wikipedia Action API in the selected language,
returns a bounded plaintext extract with its article URL, and leaves explicit general web searches
on the existing browser-opening path.

### Platform services

Keep operating-system behavior in Main-process service modules. `system.js` exposes named PC
operations and delegates platform-specific work to adapters. `apps.js` and `launch.js` resolve
applications; `files.js` handles local file search; `mover.js`, `windows.js`, and `screen.js` handle
window/display operations. Provider, media, voice, translation, and chess behavior also live in
separate service modules.

### Data tools and Markdown

The More menu and system tray open `data-window.js`; the system Settings menu has a data/privacy
entry as well. `data-preload.js` exposes only data-tool operations. `privacy-tools.js` reads existing
configuration, conversation, bond, reminder, and structured-memory stores. It imports selected
Markdown files into structured memory without an AI call, exports selected categories to a new
folder without overwriting, supports individual/category deletion, applies retention to dated
structured memories, and verifies the scope of a full `userData` purge. Native directory and
confirmation dialogs are owned by the Main process.

### Drawing and local games

`draw-window.js` owns a dedicated drawing window and validates bounded normalized strokes before
autosave, save, or open. `draw-preload.js` exposes only drawing operations; `renderer/draw.js` handles
pointer input, Canvas rendering, undo/redo, and PNG export. Drawings autosave under Capri's
user-data directory. The explicit recognition action sends a bounded PNG through its dedicated
IPC handler, converts it to a resized JPEG in Main, and calls the currently configured `llm.see`
provider (the optional `visionProvider` config may differ from the chat provider). If a selected model
rejects image input, `llm.js` uses same-provider models advertising image input; for Pollinations it
reads the Gen model catalog and calls the Gen API, while regular text chat keeps the legacy keyless
endpoint. NVIDIA Build exposes curated free vision-model choices in the Senses tab. A successful description is routed through the Main command event to the
overlay's chat, where it is included as context for a natural-language answer. The drawing window
reports provider failures without silently retrying elsewhere.

`computer-control.js` owns the optional control window, primary-display capture, permission gate,
coordinate validation, and platform pointer adapters. Explicit click requests in `chat.js` route
through a validated overlay IPC handler to this window; voice-call transcripts share the chat path.
The dedicated preload exposes status, snapshot, click proposals, cancellation, resizing, and
confirmed click requests. A separate transparent BrowserWindow animates the bundled Capri cursor
GIF over the actual desktop with mouse input ignored. The compact panel shows a local screen preview.
Each proposed click also opens a lower-right allow/refuse window with a separate narrow preload;
Main verifies its sender and the pending plan ID before acting.
macOS requires Accessibility, Screen Recording, and a successful explicit System Events permission
probe. Windows uses user32 via a fixed PowerShell command; Linux uses `xdotool` when installed. The
current adapter targets the primary display and a single confirmed click per request. Both desktop
control and its compact preview default to off. A persistent `computerControlPreview` preference
independently shows or hides the compact preview panel; enabling desktop control opens that panel
when the preference is on.
System-tray configuration controls are grouped beneath General settings without changing their
underlying config keys.

`games-window.js` opens independent, work-area-bounded windows for allowlisted game IDs.
`renderer/games/` contains standalone logic for tic-tac-toe and 2048; `renderer/game.js` provides
their localized UI, delayed tic-tac-toe response, cancels its timer on reset/page close, and reports
2048's target and no-moves outcomes. `games-preload.js` exposes a close request and allowlisted
reaction requests that Main forwards to the overlay. The separate chess service records SAN and
position snapshots; it also supports either player color and a local opening move when Capri plays
White. `chess-ui.js` renders the move list, read-only position navigation, and visual board rotation
without changing the live game position. Chess reactions are derived from validated game results.

`renderer/js/app.js` loads the required main sprite and optional animation frames. `renderer/js/sprite.js`
fits the rendered character scale to unusually short work areas while retaining the configured
preferred scale. Optional close-up
assets fall back to available images; image-load errors include the failing asset path for diagnosis.

### Updates

`version-window.js` hosts the update interface and validates its IPC sender/frame. `version-preload.js`
exposes only state, check, download, mode, install, repository, and subscription operations.
`update-manager.js` calls the fixed GitHub Releases API, validates the signed manifest and
platform-specific asset, downloads to Capri's user-data folder, and verifies SHA-512. The embedded
public key is in `update-public-key.pem`; the private signing key is supplied to GitHub Actions as
`CAPRI_UPDATE_PRIVATE_KEY` and never enters the app package.

`update-helper.js` verifies the signed handoff and file a second time. Windows launches the
per-user NSIS installer after Capri exits. macOS validates archive paths, then starts the fixed
`build/mac-update-helper.sh` from application resources; the helper stages beside the app, preserves
Gatekeeper quarantine, swaps the bundle, and restores the previous bundle if startup cannot be
confirmed. Update modes are persisted in `config.js`: Automatic checks and downloads, Manual waits
for the user, and Disabled prevents updater requests.

`scripts/create-update-manifest.js` creates and signs release metadata after build artifacts exist.
`.github/workflows/release.yml` runs tests, builds platform packages, and signs/publishes only from
the `v2` branch. See [docs/UPDATES.md](docs/UPDATES.md) and [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
for key setup, release steps, and known limits.

### Gaming Mode

The `gamingMode` configuration value is toggled from the circular menu or system tray. The renderer
shows an active status badge and gates autonomous activity, health-break prompts, visual
observation, rhythm reactions, and PC reactions. It does not detect running processes or activate
automatically.

### Tests and scripts

Tests use Node's built-in `node:test` runner. Run all tests with `npm test`; focused scripts such as
`npm run test:chat` and `npm run test:desktop-integration` are listed in `package.json`. Desktop
integration tests may query real devices and sessions and have explicit opt-in environment flags.
The privacy, drawing, games, and update tests cover local data operations, validation, game logic,
Ed25519 manifests, SHA-512 downloads, and simulated Electron window/IPC lifecycles; they do not
substitute for interactive cross-platform Electron testing.

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

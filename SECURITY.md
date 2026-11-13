# Capri Security Overview

This document describes the security boundaries and sensitive behavior visible in the current
source tree. It is a maintenance reference, not a fresh penetration test, formal security audit,
or dependency vulnerability assessment. Platform behavior also depends on operating-system
permissions and installed tools.

## Process boundaries

Capri is an Electron application. The Main process owns privileged operations such as filesystem
access, process launching, system controls, configuration, screen capture, and network connections.
Renderer code runs with Node integration disabled and context isolation enabled; preload scripts
expose selected capabilities through `contextBridge` instead of exposing Node.js or `ipcRenderer`.
The chat and menus request those capabilities through IPC.

The local application protocol confines page assets to the application root, and Electron blocks
popups and navigation outside the local app. External URLs are opened through explicit Main-process
operations.

**Known limitation:** IPC sender and payload validation is not yet uniform across all handlers.
A script injection in a trusted local page could invoke capabilities exposed by its preload. Keep
sensitive handlers narrowly scoped, validate sender/frame and payload at the Main boundary, and
avoid adding general command execution or raw Electron objects to the preload API.

The data-management, drawing, and local-game windows use dedicated sandboxed preloads with
context isolation and Node integration disabled. Their Main handlers check the calling window and
main frame before accessing data. Data-folder access begins with an Electron directory picker;
Markdown import is limited to selected files, avoids symlinks and paths escaping the selected
folder, and enforces file-count and size limits. Import and export do not call an AI provider.
Exports write into a new folder and use exclusive file creation rather than overwriting existing
files.

Drawing operations are restricted to a versioned, bounded stroke format. File selection and PNG
export use native dialogs; autosaves stay in Capri's user-data directory. Local games use separate
windows and an allowlist of game identifiers. Their preload exposes only a close request.

## Sensitive actions

- Locking, sleeping, shutting down, and restarting require a confirmation action in chat. Delayed
  shutdown or restart can be cancelled through Capri's controlled operation.
- PC-care operations preview or describe the proposed change and use chat buttons for changes such
  as closing apps, deleting selected files, changing startup state, applying updates, ejecting a
  device, or restoring a saved setup. File cleanup sends selected user files to the Recycle Bin;
  temporary-file cleanup is performed by the dedicated cleanup operation.
- Prepared messages are not sent until the user confirms them. Document creation checks for an
  existing destination rather than overwriting it and verifies the created file.
- Application, website, music, and file opening can happen after a direct user request. These
  operations may launch applications or open user-selected content.
- Downloaded runtimes, models, voices, and packages run with the user's operating-system
  permissions. Only some downloads have a verified checksum or signature; review the source and
  release notes when installing them.

Capabilities vary by operating system. The extended PC-care controls, including startup/update
management, cleanup, USB, radio, brightness, Game Bar, and workspace restoration, are principally
Windows features. Unsupported operations should report that they are unavailable rather than
pretend to have succeeded.

## Credentials and local data

New provider keys are encrypted with Electron `safeStorage`. If encryption is unavailable, Capri
refuses to save a new key. Renderer configuration omits API key values. Older unencrypted key
entries remain readable for compatibility; remove and re-enter those keys after encrypted storage
is available.

Chat history, reminders, user memories, preferences, and saved work setups are stored locally in
Capri's data directory. They can contain personal information. Structured memory is not transmitted
unless the user explicitly includes it in a request. Normal chat requests send the prompt and
relevant conversation history to the selected AI provider. Screen vision sends the captured image to
the selected vision provider; cloud speech recognition and synthesis send the audio or text needed
for that service. Local Ollama, Piper, and Chatterbox can keep those requests on the device after
their components have been installed.

The **Data and privacy** window can inventory local categories, import/export Markdown, delete
individual entries or categories, configure retention for dated structured-memory entries, and
request a full purge. A purge removes and verifies files under Capri's Electron `userData` directory;
it does not inspect operating-system backups, external/synced copies, or locations outside that
directory. Capri reports failures rather than claiming a verified purge when files remain or cannot
be accessed. A successful purge restarts the application because its configuration and local state
have been removed. Preferences exported to Markdown omit credential-like keys and selected private
path fields; review exported files before sharing them.

Gaming Mode is a manual preference. It reduces Capri's autonomous activity without scanning running
processes, terminating applications, injecting code, or changing game settings. It does not provide
a performance guarantee for every game or desktop environment.

Desktop notifications can expose reminder text in the operating system's notification history or
lock-screen preview, depending on system settings. Window-title checks for AI jealousy are local;
macOS requires System Events Automation permission, and Linux uses `wmctrl` on X11 when available.
Page closing is Windows-only.

## Local services and hooks

The hook bridge listens on loopback and limits request sizes. It does not authenticate every local
process that can connect without an `Origin` header; an untrusted local process may be able to
inject hook events. Development routes are intended for development only. A random session token
and stricter debug-route controls would improve this boundary if untrusted local processes are in
scope.

Hook installers back up existing configuration before editing it and can remove the installed
hooks. Hooks are not required for the coding assistant to run.

## Permissions

Microphone, screen capture/vision, Accessibility, and Apple Events are separate capabilities and
require user action and applicable system permission. Screen vision and microphone features are
disabled until enabled. macOS permission states can remain unknown until a real operation is
attempted; permission status should not be interpreted as a successful operation until verified.

## Dependency and release limits

The npm dependency tree is locked by `package-lock.json`, but the project does not configure a
continuous dependency vulnerability scanner. Downloaded components are not all signed or checksum
verified. Release signing depends on CI secrets and is not guaranteed for every build. Do not treat
an unsigned artifact as a signed release.

## Reporting a security issue

Please avoid posting secrets, personal data, or an exploitable vulnerability in a public issue.
Use the repository host's private vulnerability reporting channel when available. Include the
affected version, operating system, reproduction steps, and impact without attaching real keys or
private user data.

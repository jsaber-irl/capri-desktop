# Capri Security Audit

## Executive Summary

This document describes the current static review baseline. The baseline was updated alongside
the native PC-control and multi-display documentation on 2026-11-04; the feature notes below were
added on 2026-11-07 and are not a new full security audit. It is not a replacement for a
penetration test or a dependency audit.

The static review covers the 244 paths tracked by Git at the beginning of the audit, including Electron, preloads, IPC calls, processes, downloads, network integrations, permissions, and configuration. No confirmed malicious behavior was identified in the reviewed version-controlled code. This does not prove the absence of threats.

A plaintext storage issue affecting newly entered API keys and the lack of a general navigation guard have been fixed. IPC sender validation remains inconsistent; previously stored plaintext keys are still read for compatibility.

## Methodology

- Recursive Git inventory and review of startup, build, and installation configurations.
- Static searches for processes, downloads, network domains, file access, permissions, secrets, obfuscation, and dynamic execution.
- Review of key functions related to API keys, the local protocol, hooks, application/window controls, screen captures, and downloads.
- Unit tests for the security modifications and existing permission tests.
- Attempted `npm audit` using the existing lockfile; the registry could not be resolved due to a DNS failure.

This review does not run antivirus software, analyze the contents of installed dependencies or remote binaries, and does not replace a dynamic security audit.

## Electron, Renderer, and IPC

The reviewed windows enable `contextIsolation` and `sandbox`, while disabling `nodeIntegration`. Preloads expose a targeted `contextBridge` API rather than Node.js or `ipcRenderer` directly. The local protocol resolves paths under a designated root directory and checks for lexical path traversal.

**Correction — External Navigation (Low to Medium).** A hijacked page must not retain the privileged preload when navigating. The new `src/main/electron-security.js` module blocks child windows and navigations outside `capri://app/`. External links must go through the dedicated Main-process functions.

**Remaining Risk — IPC (Medium).** Several handlers in `src/main/main.js` do not consistently verify that a call originates from an expected Capri window and its main frame. External navigation is blocked, but script injection into a local page could still invoke certain configuration, application-launching, file-handling, or automation functions exposed through the preload.

Recommendation: Apply a common validation mechanism for the window, main frame, and origin to every sensitive handler, then strictly validate parameter types, sizes, and values. Existing handlers were not refactored all at once in order to avoid changing their interfaces.

The renderer's newer interaction features do not add privileged access: caresses, reminder
notifications, animation state, and display transitions remain local UI behavior. Display
following changes the bounds of the existing transparent overlay; it does not create a second
window or grant access to the other monitor.

**Native PC control.** The chat's `pc:do` capability is exposed through the preload rather than
through Node.js in the Renderer. `src/main/system.js` restricts requests to named operations and
uses platform APIs or fixed executable names with argument arrays. Settings, volume, capture,
window arrangement, theme, and power operations are not implemented as arbitrary command
execution. Unsupported platform operations return failure.

Power operations are confirmation-gated in `src/renderer/js/chat.js`: parsing a request only
produces a confirmation prompt, and the Main operation is invoked after the user selects the
confirmation button. Delayed shutdown/restart uses the operating system scheduler and can be
cancelled through the same controlled operation. The security boundary still depends on the
broader IPC sender-validation limitation described above.

## Keys and Local Data

`rendererConfig()` removes `apiKeys` before sending the configuration to the Renderer. Keys entered through the interfaces use Electron's `safeStorage`.

**Correction — Plaintext Fallback (Medium).** Previously, `setup.sealKey()` returned the raw key when secure storage was unavailable. It now throws an explicit error; AI connections and speech synthesis therefore refuse to save the key.

**Remaining Limitation.** `openKey()` still accepts legacy entries without the `enc:` prefix for compatibility. These entries can therefore be read from an old configuration and are not migrated automatically. Once encrypted storage becomes available, users should delete and re-enter these keys.

The local copy contains a `.env` file ignored by Git. Only the variable names were checked; the values were neither read nor copied into this report. `git ls-files` confirms that the file is not version-controlled.

## Processes, Scripts, and Downloads

Most `execFile` and `spawn` calls use executables and argument arrays rather than shell commands constructed from user input. PowerShell scripts are helpers for Windows operations. The observed Apple Events commands correspond to intended operations, with dynamic names restricted or escaped by the relevant functions.

Capri intentionally downloads Node, Piper, Python/Chatterbox dependencies, models, and voices, then launches them with the user's permissions. The Node program verifies a SHA-256 hash; not all other downloads have a comparable signature or checksum verification mechanism. This is a supply-chain risk, not evidence of malicious code.

`src/main/bridge.js` listens on `127.0.0.1`, limits HTTP request body sizes, and rejects requests containing an `Origin` header. However, it does not authenticate local processes that omit `Origin`; these processes can inject hook events. Debug routes are available in development mode.

Recommendation: Use a random session token for hooks and restrict debug routes if the threat model includes untrusted local processes.

## Network and Privacy

Connections to Anthropic, Ollama, configured providers, voice engines, YouTube, and download sources are consistent with the documented features. Static searches did not identify any hidden data-exfiltration destination or third-party analytics.

Screen captures, prompts, and transcripts may be sent to the selected provider when the user enables a remote feature. Ollama, Piper, and Chatterbox can run locally but require initial downloads. Microphone, vision, and Apple Events features are associated with specific commands and system permissions.

## macOS Permissions

Unknown permission states remain unknown when Electron cannot distinguish between a denial and an undetermined state. Apple Events permissions are tested individually for each target application through a real, non-destructive operation, and only after explicit user action.

Accessibility, Screen Recording, Microphone, and Automation permissions are separate. Tests use mocks; no actual TCC permission dialog was verified during this review.

## Classified Findings

| Severity | File(s) | Finding | Action |
|---|---|---|---|
| Low to Medium — Fixed | `src/main/electron-security.js`, `src/main/main.js` | Navigation and child windows lacked a common security guard. | Blocked popups and navigation outside `capri://app/`; added a unit test. |
| Medium — Fixed for New Keys | `src/main/setup.js`, `src/main/main.js` | API keys could be stored in plaintext if `safeStorage` was unavailable. | Saving is now rejected with an explicit error message. |
| Medium — To Be Fixed | `src/main/main.js`, `src/preload.js` | Not all IPC handlers verify the identity of the `WebContents` and frame. | Common validation and strict parameter limits are recommended. |
| Medium — Partially Mitigated | `src/renderer/js/chat.js`, `src/preload.js`, `src/main/system.js` | Native PC control can change system state and move windows. | Power actions require explicit UI confirmation; requests are limited to named actions. Complete IPC sender validation remains recommended. |
| Low to Medium — To Be Reviewed Depending on the Threat Model | `src/main/bridge.js`, `scripts/demo.js` | The local bridge does not authenticate other local processes; debug routes are available in development mode. | A random token and debug restrictions are recommended. |
| Low — Supply Chain | `src/main/fetch-files.js`, `src/main/piper.js`, `src/main/chatterbox-setup.js`, installation scripts | Third-party binaries, models, and packages are downloaded; not all sources are verified through signatures or checksums. | Pin versions and hashes/signatures, and restrict the list of allowed hosts whenever possible. |
| No Confirmed Issues | Reviewed tracked source files | No use of `eval`/`Function`, intentional obfuscation, or hidden data exfiltration was established. | Maintain ongoing code and dependency reviews. |

## Dependencies

The direct dependencies are Electron and `@anthropic-ai/sdk`; `package-lock.json` locks the npm dependency tree. No dependency scanning tool is configured.

`npm audit` could not retrieve vulnerability advisories due to a DNS error when connecting to `registry.npmjs.org`; therefore, no claim that the dependencies are vulnerability-free is made. No third-party tools were installed.

## Verification and Limitations

The navigation guard test is located at `tests/electron-security.test.js`. The automated test suite must be run in a complete Node.js environment.

This review does not validate actual macOS permissions, cloud services, downloaded binaries, future dependency versions, or attacks requiring graphical interaction.

No files were deleted. `FEATURES.md` and `FEATURES.fr.md` are not tracked in this copy; local copies are stored in `.private/`, which is ignored by Git.

## Feature security notes

| Feature | Data or authority used | Security boundary |
|---|---|---|
| Reminder notification | Local reminder text and timer | Renderer panel, local audio, and an Electron desktop notification; no network request. Reminder text may be visible in OS notification history or on a lock screen, depending on system settings. |
| Rival-AI title detection | Window application names and titles; Linux X11 window list via `wmctrl`, macOS visible-window titles via System Events, or Windows window titles via the window watcher | Detection is local and limited to recognized browser titles and AI application names. macOS requires System Events Automation permission; Linux requires `wmctrl` and an X11 session. No page contents are read. |
| Rival-AI close action | The foreground Windows window ID and recognized AI key | Closing remains Windows-only. Rival browser tabs are revalidated by the helper before close; native app close requires confirmation. macOS/Linux title detection does not close windows. |
| Caressing Capri | Pointer coordinates and local mood/bond state | Renderer-only; the refusal lightning is visual/audio feedback. |
| Following the pointer across displays | Cursor position, display geometry, overlay bounds | Main process selects the display; renderer receives geometry through the preload callback. |
| Window possession and movement | Window metadata and platform automation APIs | Requires the configured feature and applicable OS permissions. |
| Native PC control | Named system requests, OS settings, audio, capture, window and power APIs | Renderer can request only exposed operations; power changes require confirmation; availability depends on the OS. |

When extending any of these features, preserve the rule that user-controlled coordinates are
validated at the Main boundary and that Renderer code receives capabilities, not raw Electron
objects.

## Feature notes added 2026-11-07

The jealousy setting is available on all platforms. Detection compares recognized AI names against
browser window-title segments or application identifiers; it does not inspect page contents or
send window metadata to a remote service. On macOS, the existing System Events window listing
requires the user to authorize Capri under Automation. On Linux, `wmctrl -lpGx` supplies X11
window IDs, application classes, and titles; the command is invoked with fixed arguments and a
timeout, and Wayland may not provide equivalent visibility. Windows continues to use its existing
window helper. The close-pages setting remains limited to Windows and is not enabled by these
title-only paths.

Due reminders now request a native Electron desktop notification in addition to the in-app panel
notice. The Main IPC handler accepts only requests from the overlay WebContents and validates the
notification object and text; Electron's notification API is local, but operating-system
notification history or lock-screen previews can expose reminder text according to the user's
notification settings.

These notes describe the feature boundaries, not a new test of macOS TCC prompts, Linux X11 or
Wayland behavior, Windows close races, or operating-system notification privacy settings.

### Chat feedback and shake reactions

The cyberpunk-style loading commands, their typewriter animation, and Capri's shake-triggered
anger are Renderer-side presentation and mood behavior. Detecting a shake uses local pointer
coordinates; the resulting emotion is stored in the application's existing local mood state.
Neither adds an IPC capability, executes a system command, nor sends pointer or emotion data to
an AI provider. The fast replies for simple thanks and apologies are generated locally; other
chat messages continue through the selected provider as before. These UI and behavior changes
do not alter the audit's existing IPC, provider, or local-data limitations.
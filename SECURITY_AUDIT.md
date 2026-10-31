# Capri Security Audit

## Executive Summary

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
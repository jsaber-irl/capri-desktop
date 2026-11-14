# Capri update security review

This is a source-level review of Capri's GitHub update path. It is not a penetration test, operating-system installer certification, code-signing statement, or guarantee that all platform UI behavior has been exercised on physical devices.

## Trust model

- The only update source is the fixed GitHub repository `jsaber-irl/capri-desktop` over HTTPS.
- GitHub's latest-release API identifies the current stable release. The release must include `update-manifest.json` and `update-manifest.sig`.
- Capri verifies the Ed25519 signature over the exact raw manifest bytes using the public key in `src/main/update-public-key.pem`. A hash alone is not accepted as publisher authentication.
- The signed manifest pins the release tag/version, release notes and publication time, the package for each supported OS/architecture, the exact official asset URL/name, expected byte size, and SHA-512 digest.
- Capri rejects invalid versions, mismatched tags, unsupported architectures, non-HTTPS or non-GitHub asset URLs, unexpected paths, signature failures, size mismatches, interrupted downloads, and hash mismatches. A download streams to a private temporary file and is renamed into place only after verification.
- Immediately before installation, the helper validates the signed handoff and re-hashes the package. No downloaded JavaScript, shell fragment, or installer argument is evaluated. The only executed Windows file is the expected NSIS installer; on macOS, a fixed bundled shell helper invokes system tools with separately quoted paths.

The updater has three persistent modes. **Automatic** checks periodically and downloads a verified update but still waits for user confirmation to install. **Manual** performs requests only after the user asks. **Disabled** makes no updater requests. Requests are not made on unsupported platforms/architectures.

## Electron and filesystem boundaries

The update window uses a dedicated preload, `contextIsolation: true`, `nodeIntegration: false`, and a sandbox. IPC handlers verify the version window's `webContents` and main frame. The renderer can request a check, download, mode change, or installation; it cannot choose a URL, local file path, target application path, or installer command. The Main process owns those values and restricts downloads to fixed GitHub release paths.

Download data is written below Electron's user-data directory with restrictive file permissions where supported. The updater rejects symlinked update roots and version folders, bounds manifest and package sizes, removes partial downloads on failure, and does not pass release notes to HTML parsing. The release notes are displayed as text.

The macOS helper first validates ZIP entry paths and the expected `.app` structure, checks space and app replacement paths, extracts beside the installed app, and sets a quarantine attribute so Gatekeeper continues to apply. It waits for Capri to exit, keeps the old bundle as a rollback copy, and restores it if the updated app does not start far enough to confirm initialization. It does not remove quarantine, change Gatekeeper settings, alter SIP, or request elevated privileges. Installing into a protected location such as `/Applications` may fail without write permission; failure is reported and the old app is retained where rollback succeeds.

Windows installation uses the official per-user NSIS installer after the running Capri process closes. It does not request administrator elevation, change Defender, or use a shell command built from remote input. Windows SmartScreen can still warn because the installer has no Authenticode signature. An interrupted NSIS installation is not covered by a custom whole-directory rollback; use the official installer again to repair/reinstall if necessary.

## Signing key and release pipeline

The private Ed25519 key is not stored in Git or the application. GitHub Actions reads it from the repository secret `CAPRI_UPDATE_PRIVATE_KEY` only in the signing step. The release workflow is restricted to the `v2` branch, requires `v<package.json version>`, and verifies the key corresponds to the checked-in public key before it uploads the manifest. A missing or mismatched secret stops release publication. The key fingerprint is:

```text
c18863bf10787b9b7af2768951df5ad571561ba0b6ba2a09e16027ac6b57274c
```

Treat the private key as a production signing credential: keep a protected offline backup, restrict Actions secret access, never print it, and rotate it after suspected exposure. The current client embeds one public key; rotation therefore requires a planned trust-transition release or manual installation. Simply replacing the repository secret would make older clients reject future manifests.

Project signature verification does not sign the macOS app bundle or the Windows executable in the operating system's trust system. The distributions remain unsigned/not notarized unless separately signed with platform certificates. No update code disables or bypasses Gatekeeper or SmartScreen.

## Known limitations and validation

- GitHub API availability and unauthenticated rate limits can prevent a check; Capri reports failure and does not install an unverified fallback.
- Releases from before signed manifests are ineligible for automatic updating. No package.json/raw-file fallback exists.
- The updater supports macOS ARM64, macOS Intel, and Windows x64 official installations. Linux, Windows IA32, portable Windows copies, and development builds do not receive integrated installation.
- macOS app replacement and quarantine behavior depends on filesystem permissions and Gatekeeper policy. An unsigned app may require the user to approve it through macOS's normal interface.
- Windows uses NSIS's installer flow; no custom atomic rollback is implemented for a failed/interrupted NSIS transaction.
- The automated updater tests use generated signing keys, temporary files, and a simulated HTTPS transport. They validate cryptographic and state logic, not live GitHub release operations or full installer execution on every OS/architecture.

See [docs/UPDATES.md](docs/UPDATES.md) for the secret setup and release procedure.

# Capri Desktop Capability Matrix

This matrix describes behavior verified in the local application. **Supported** means it is covered by an implementation and tests. **Partial** or **Experimental** must remain visible in both the interface and documentation.

| Feature | Windows | macOS | Linux | Dependencies / permissions | Status | Implementation | Tests |
|---|---|---|---|---|---|---|---|
| Claude Code / Codex / Antigravity / OpenCode | Yes | Yes | Yes | Node.js and provider hooks/plugins | Supported | [hooks/](../hooks/) | [tests/hooks.test.js](../tests/hooks.test.js), [tests/opencode.test.js](../tests/opencode.test.js) |
| Ollama AI chat | Yes | Yes | Yes | Ollama and a local model | Supported | [src/main/llm.js](../src/main/llm.js) | [tests/ollama-host.test.js](../tests/ollama-host.test.js) |
| Cloud AI providers | Yes | Yes | Yes | API key/network access and data-sharing consent | Supported | [src/main/setup.js](../src/main/setup.js) | [tests/config.test.js](../tests/config.test.js) |
| Voice input | Yes | Yes | Yes | Microphone and configured STT engine | Partial | [src/main/stt.js](../src/main/stt.js) | [tests/stt.test.js](../tests/stt.test.js) |
| Local speech synthesis | Yes | Yes | Yes | Piper or Chatterbox, depending on availability | Partial | [src/main/piper.js](../src/main/piper.js), [src/main/chatterbox.js](../src/main/chatterbox.js) | [tests/piper.test.js](../tests/piper.test.js), [tests/chatterbox.test.js](../tests/chatterbox.test.js) |
| Screen vision | Yes | Yes | Depends on Electron desktop support | Vision consent and screen capture | Partial | [src/main/screen.js](../src/main/screen.js) | [tests/screen-capture.test.js](../tests/screen-capture.test.js) |
| Confirmed desktop control | Yes | Yes | Partial | Operating-system permission, opt-in, and confirmation per action | Experimental | [src/main/computer-control.js](../src/main/computer-control.js) | [tests/computer-control.test.js](../tests/computer-control.test.js) |
| Window possession | Yes | Yes | No | macOS Accessibility or Windows API | Partial | [src/main/mover.js](../src/main/mover.js) | [tests/mover.test.js](../tests/mover.test.js) |
| MPRIS music | No | Limited support | Yes through playerctl | playerctl and desktop session | Partial | [src/main/music-control.js](../src/main/music-control.js) | [tests/music-control.test.js](../tests/music-control.test.js) |
| macOS permissions | No | Yes | No | Microphone, Screen Recording, Accessibility, and Automation | Supported | [src/main/mac-permissions.js](../src/main/mac-permissions.js) | [tests/mac-permissions.test.js](../tests/mac-permissions.test.js) |
| Local games | Yes | Yes | Yes | Electron | Supported | [src/main/games-window.js](../src/main/games-window.js) | [tests/games.test.js](../tests/games.test.js) |
| Signed updates | Windows x64 | macOS ARM64/Intel | No documented auto-update | Ed25519 manifest and SHA-512 | Supported for listed targets | [src/main/update-helper.js](../src/main/update-helper.js) | [tests/update-manager.test.js](../tests/update-manager.test.js) |
| Preparation diagnostics | Yes | Yes | Yes | No network access required | Supported | [src/main/diagnostics.js](../src/main/diagnostics.js) | [tests/diagnostics.test.js](../tests/diagnostics.test.js) |
| Data-only palette and accessory mods | Yes | Yes | Yes | Local JSON; embedded/relative PNG or optional HTTPS image; appearance permission | Supported | [src/main/data-mods.js](../src/main/data-mods.js) | [tests/data-mods.test.js](../tests/data-mods.test.js) |
| Capri Remote | No implementation | No implementation | No implementation | Study only; pairing, encryption, relay, and revocation acceptance required | Experimental/Deferred | [CAPRI_REMOTE_DESIGN.md](CAPRI_REMOTE_DESIGN.md) | Security/design review required |

## Diagnostic workflow

Open **Capri Menu > Setup (Ollama and Chatterbox)** to inspect hardware, local components, and preparation steps. The **Copy report** button creates a non-sensitive report containing the status of AI providers, speech synthesis, microphone, vision, desktop control, and macOS permissions.

To diagnose a capability limited to a specific system:

1. Check the matching row in this matrix.
2. Run Setup, or on macOS open **Capri Settings > macOS Permissions**.
3. Fix only the reported permission or dependency.
4. Retry the capability and copy the report if the error persists.

## P0 quality criteria

- Documented features remain verifiable against their implementation and tests.
- OS-specific capabilities are labeled Supported, Partial, or Experimental.
- Offline operation is preserved for local components when applicable.
- Sensitive desktop actions can be stopped immediately by the user.
- Visible errors identify the missing permission or dependency and a resolution action.
- No additional provider or network request is made beyond those enabled by the user.
- Diagnostic reports contain no API keys, tokens, or complete private URLs.
- Local data remains exportable, importable, and deletable with existing regression tests.

## New Features & Improvements

### OpenCode Assistant Integration
- Added OpenCode as a monitored coding assistant with a dedicated global-plugin installer and uninstaller.
- OpenCode prompts, tool activity, permission prompts, completion, failures, and session shutdown now map to existing Capri states.
- Installation preserves unrelated OpenCode plugins and refuses to replace an existing unrecognized plugin file.
- Reinstallation is idempotent, existing Capri plugin versions are backed up before upgrade, and uninstall removes only the Capri plugin.
- OpenCode 1.18.29 or later is recommended; the integration observes only and never approves permissions or blocks actions.

### Capability and Diagnostics Consolidation
- Added a maintained platform capability matrix covering support status, OS limits, dependencies, permissions, implementation links, and tests.
- Added the shared P0 quality criteria for offline behavior, immediate desktop-action stop, visible errors, unexpected-network safeguards, and local-data regression coverage.
- Preparation reports now include a non-sensitive diagnostics section for AI provider selection, voice, microphone, vision, desktop control, and macOS accessibility status.
- Diagnostic reports explicitly omit API keys and private provider URLs.
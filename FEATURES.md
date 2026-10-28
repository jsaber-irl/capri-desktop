# Implementation Status

Checked boxes indicate features currently present in the code. Features that depend on a native API unavailable in Electron remain unchecked rather than being simulated. Window tracking and window possession remain Windows-only; the overlay, animations, chat, assistants, sounds, and application actions are available on Windows, macOS, and Linux.

## 1. Mascot and Animations

- [x] Animated appearance at startup with an introduction to Capri.
- [x] Floating character that moves between the corners of the screen.
- [x] Eye blinking, head movements, and facial expressions.
- [x] Eight different facial expressions in messages.
- [x] Animated teleportation from one place to another.
- [x] Glitch effects, RGB shifting, and visual distortions.
- [x] Red lightning bolts, fragments, and glowing particles.
- [x] Spinning, jumping, and falling animations.
- [x] Playful reactions when the cursor gets close.
- [x] Ability to spawn red and green copies of the character.
- [x] Special animation featuring a satellite.
- [x] Victory animation when the assistant finishes its work.
- [x] Error animation when a command fails.
- [x] Sleep animation after 10 minutes of inactivity.
- [x] Automatic wake-up when the mouse approaches or Claude becomes active again.
- [x] Mascot can shrink down to its mask in the bottom-left corner.
- [x] Demo mode to test animations without a coding assistant.
- [x] Virtual mascot that stays on the desktop.
- [x] Idle animation and eye blinking.
- [x] Animation while speaking.
- [x] Animation when moved or shaken.
- [x] Visual glitch effects.
- [x] Sleep and reboot animations.
- [x] Move the mascot with the mouse.
- [ ] Position on windows, icons, or the bottom edge of the screen.
- [ ] Move between open windows.
- [x] Snap to a specific position or to the mouse.

## 2. Integration with Coding Assistants

- [x] Integration with Claude Code.
- [x] Integration with OpenAI Codex.
- [x] Integration with Google Antigravity.
- [x] Install hooks from the Capri menu.
- [x] Install and uninstall hooks from the command line.
- [x] Detect actions performed by the assistant.
- [x] Display the tool being used, the relevant file, and the command being run.
- [x] Display code searches and read/write operations.
- [x] Display commands launched and tests run.
- [x] Progress indicator above the mascot.
- [x] Display time spent thinking after 15 seconds of waiting.
- [x] Commentary during long periods of thinking.
- [x] Alert when the assistant is waiting for permission or a response.
- [x] Teleport to the cursor or the assistant's window when intervention is needed.
- [x] Display important errors when something fails.
- [x] Victory sequence when a task is completed.
- [x] Display a task summary: number of actions, files changed, and duration.
- [x] Display the assistant's latest response.
- [x] Panel for reading the full response while working in another window.
- [x] Option to disable assistant monitoring and use Capri only as a mascot.

## 3. Artificial Intelligence and Conversations

- [x] Text-based messaging.
- [x] AI-generated responses.
- [x] Configure the AI model from the Mainframe.
- [x] Use a local AI running on the computer.
- [x] Use a remote AI with an API key.
- [x] Option to use a free NVIDIA API key, subject to available quotas.
- [x] Add a Cyberpunk 2077-style “call” with Capri, including a ringtone, transcription, and direct response (using the browser's voice API).

## 4. Voice Features

- [ ] Text-to-speech to make the mascot speak (synthesized sounds are available, but speech is not).
- [ ] Interactive voice conversation.
- [ ] Speech recognition via NVIDIA Parakeet.
- [ ] Free local voice using Kokoro.
- [ ] ElevenLabs voice using an API key.
- [ ] Start and stop voice conversation with a keyboard shortcut.
- [ ] Mute and unmute the microphone.

## 5. Positioning and Window Interactions

- [x] Floating mascot that stays in the foreground.
- [x] Drag-and-drop movement.
- [ ] Ability to sit on the top edge of a window.
- [ ] Move along with a window when it is moved.
- [ ] Fall when a window disappears, is minimized, or is covered.
- [ ] Ability to land on the edge of another window.
- [x] Partially appear at the edges of the screen.
- [x] Move when the mouse approaches.
- [ ] Window-possession effect with animated eyes and a smile.
- [x] Disable window possession from the menu.
- [ ] Track open windows on Windows.
- [x] Retreat into the biochip with Ctrl + Alt + C.
- [x] Reappear by clicking the mask or using the same shortcut.

## 6. Interface and Settings

- [x] Central configuration Mainframe.
- [x] Configure the AI model.
- [x] Configure the voice.
- [x] Enable screen observation.
- [x] Access help.
- [x] Context menu opened by right-clicking the mascot.
- [x] Access settings from the system tray icon.
- [x] Customize keyboard shortcuts from the Capri menu (show/hide profiles, chat, or disable).

## 7. Chatting with Capri

- [x] Open a chat panel from the menu.
- [x] Send messages by pressing Enter.
- [x] Close the panel with Esc.
- [x] Receive responses written in Capri's character.
- [x] Use information about Claude's activity and tasks completed during the day.
- [x] Customize the way Capri speaks.
- [x] Define custom phrases for Capri to say.
- [x] Have Capri remember certain personal information.
- [x] Choose the name Capri uses to address you.
- [x] Clear remembered conversations.
- [x] Choose the language of the interface and dialogue.

### AI Models and Providers Compatible with Chat

- [x] Ollama with a local model.
- [x] Pollinations for online use without an account.
- [x] Groq.
- [x] Google Gemini.
- [x] OpenRouter.
- [x] OpenAI.
- [x] Mistral.
- [x] DeepSeek.
- [x] LM Studio.
- [x] llama.cpp.
- [x] vLLM.
- [x] Any server compatible with the OpenAI API.
- [x] Claude Code in command-line mode, in a selected directory.

## 8. Computer Actions

- [x] Open applications.
- [x] Close applications.
- [ ] Play music (Spotify search is available; direct playback has not been implemented).
- [x] Pause music.
- [ ] Ask which track is currently playing.
- [x] Close a browser tab after confirmation.
- [ ] Observe the screen while gaming.
- [ ] Comment on what is happening during gameplay.
- [ ] Open applications from the Start menu.
- [ ] Launch Microsoft Store apps, such as Spotify.
- [x] Launch games installed through Steam and Epic Games.
- [x] Control media playback: pause, next track, volume, and mute.
- [x] Search for an artist or track on Spotify.
- [x] Open a website after confirmation via a button.
- [x] Close an application after confirmation.
- [x] Offer to force-quit an application if it remains in the system tray.
- [ ] Preserve the application's ability to ask the user to save changes before closing.

## 9. Interactive Guide

- [x] Explain how Capri works directly from its menu.
- [x] Show where its icon is in the system tray.
- [x] Show where the Claude Code window is.
- [x] Open the `~/.claude` folder.
- [x] Select `settings.json` to explain hook configuration.
- [x] Install Claude Code hooks with one click.
- [x] Offer to launch Claude Code or Codex with Ollama.
- [x] Visually point out interface elements.
- [x] Display a crosshair, lightning effects, and a zoom effect during explanations.

## 10. Daily Mission Report

- [x] Generate a summary card of the day's work.
- [x] Display the number of completed tasks.
- [x] Display the number of actions performed.
- [x] Display modified files.
- [x] Display errors encountered.
- [x] Identify the longest mission and the project involved.
- [x] Summarize prompts, permissions, and projects.
- [x] Animate the report counters.
- [x] Copy the report image to the clipboard.
- [x] Automatically display the report in the evening after at least three tasks have been completed.
- [x] Store the mission log locally, with a daily history.

## 11. Sounds and Customization

- [x] Generate sound effects in real time.
- [x] Teleportation sound.
- [x] Task-completion sound.
- [x] Alert sound when permission is required.
- [x] Error sound.
- [x] Session startup sound.
- [x] Falling and rising sounds.
- [x] Lightning and window-possession sounds.
- [x] Speaking sounds and subtle reminders.
- [x] Replace sounds with personal `.mp3`, `.wav`, `.ogg`, or `.m4a` files.
- [x] Adjust sound, size, and animations.
- [x] Launch automatically at system startup.
- [x] Choose the language: French, English, Spanish, Brazilian Portuguese, or Russian.
- [x] Customize Capri's behavior and phrases.

## 12. Security and Technical Operation

- [x] Mascot works without Claude Code.
- [x] Local communication with Claude Code via `127.0.0.1`.
- [x] Asynchronous hooks that do not block Claude's operations.
- [x] Back up the configuration before modifying hooks.
- [x] Uninstall hooks without deleting other existing hooks.
- [x] Store the mission log and settings locally.
- [x] Encrypt the API key using the system's secure storage.
- [ ] Ability to uninstall the application from Windows Settings (depends on the installed package).
- [x] Development mode with debugging tools and test windows.

## 13. Additional Features

- [x] Add a movable, freely resizable cyberpunk-style Capri terminal while expanded, collapsible to its command line and expandable again, with fake commands (`/open`, `/download`, `/help`, `/network status`, `/get arasaka data`, etc.) and command/result history.
- [ ] Open selected files.
- [ ] Read and edit files.
- [ ] Control YouTube.
- [ ] Skip to the next video.
- [ ] Enable fullscreen.
- [ ] Click interface elements.
- [ ] Type text and scroll through pages.
- [ ] Develop a free local voice.
- [ ] Remember information about the user.
- [ ] Search the Internet.
- [ ] Have an autonomous cursor.
- [ ] Add interactions such as head pats.
- [x] Add a mischievous mode with glitches and fake hacking effects.
- [x] Extend application commands and browser voice mode to macOS and Linux.

## 14. Application Information

- [x] Display the current version of Capri from the menu and chat.
'use strict';

// Feeds the overlay with the position of the other windows (Windows only), so Capri can
// sit on them. A small PowerShell helper does the Win32 calls; we turn its physical pixels
// into the overlay's coordinates.

const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { execFile } = require('node:child_process');
const { screen } = require('electron');
const MAC = process.platform === 'darwin';

// in the installed app it sits next to the app archive (asarUnpack), where PowerShell can read it
const SCRIPT = path.join(__dirname, 'windows.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

function startWindowWatch({ overlay, onUpdate }) {
  if (MAC) return startMacWindowWatch({ overlay, onUpdate });
  if (process.platform !== 'win32') return { stop() {} };

  let child = null;
  let stopped = false;
  let restarts = 0;

  const handle = overlay.getNativeWindowHandle();
  const self = handle.length >= 8 ? handle.readBigUInt64LE(0) : BigInt(handle.readUInt32LE(0));

  const toOverlay = (win, bounds) => {
    const dip = screen.screenToDipRect(null, { x: win.x, y: win.y, width: win.w, height: win.h });
    return { id: win.id, x: dip.x - bounds.x, y: dip.y - bounds.y, w: dip.width, h: dip.height, max: win.max };
  };

  const start = () => {
    child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT, String(self), String(process.pid),
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let snap;
      try {
        snap = JSON.parse(line);
      } catch {
        return;
      }
      if (overlay.isDestroyed()) return;
      const bounds = overlay.getBounds();
      const wins = snap.wins
        .map((w) => toOverlay(w, bounds))
        // only what overlaps Capri's screen
        .filter((w) => w.x < bounds.width && w.x + w.w > 0 && w.y < bounds.height && w.y + w.h > 0);
      onUpdate({ fg: snap.fg, taskbar: Boolean(snap.taskbar), wins });
    });
    child.stderr.on('data', (d) => console.error('[capri] window watch:', String(d).trim()));
    child.on('exit', () => {
      child = null;
      if (!stopped && restarts++ < 3) setTimeout(start, 3000);
    });
  };

  start();
  return {
    stop() {
      stopped = true;
      child?.kill();
    },
  };
}

function startMacWindowWatch({ overlay, onUpdate }) {
  const script = `
    const se = Application("System Events");
    const result = { fg: "", wins: [] };
    se.processes().forEach((process) => {
      try {
        const name = process.name();
        if (name === "Capri" || !process.visible()) return;
        if (process.frontmost()) result.fg = name;
        process.windows().forEach((window, index) => {
          try {
            const position = window.position();
            const size = window.size();
            if (size[0] < 80 || size[1] < 50) return;
            result.wins.push({
              id: name + ":" + index,
              app: name,
              x: position[0],
              y: position[1],
              w: size[0],
              h: size[1],
              max: false
            });
          } catch {}
        });
      } catch {}
    });
    JSON.stringify(result);
  `;
  let stopped = false;
  let running = false;
  let timer = null;
  let warned = false;

  const poll = () => {
    if (stopped || running || overlay.isDestroyed()) return;
    running = true;
    execFile('osascript', ['-l', 'JavaScript', '-e', script], { timeout: 3000 }, (error, stdout) => {
      running = false;
      if (stopped || overlay.isDestroyed()) return;
      if (error) {
        if (!warned) {
          warned = true;
          console.error('[capri] macOS window watch requires Accessibility permission:', error.message);
        }
        return;
      }
      try {
        const snapshot = JSON.parse(stdout.trim());
        const bounds = overlay.getBounds();
        const wins = snapshot.wins
          .map((win) => ({ ...win, x: win.x - bounds.x, y: win.y - bounds.y }))
          .filter((win) => win.x < bounds.width && win.x + win.w > 0 && win.y < bounds.height && win.y + win.h > 0);
        onUpdate({ fg: snapshot.fg, taskbar: false, wins });
      } catch (parseError) {
        console.error('[capri] macOS window watch returned invalid data:', parseError.message);
      }
    });
  };

  timer = setInterval(poll, 1000);
  poll();
  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

module.exports = { startWindowWatch };

'use strict';

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomUUID } = require('node:crypto');
const execFileAsync = promisify(execFile);
const { checkAccessibility, checkScreenRecording } = require('./mac-permissions');

function validPoint(point, bounds) {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y)
    && Number.isInteger(point.x) && Number.isInteger(point.y)
    && point.x >= bounds.x && point.y >= bounds.y
    && point.x < bounds.x + bounds.width && point.y < bounds.y + bounds.height);
}

async function clickAt(point, { platform = process.platform, bounds, systemPreferences, exec = execFileAsync } = {}) {
  if (!validPoint(point, bounds)) return { ok: false, reason: 'invalid-point' };
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  try {
    if (platform === 'darwin') {
      if (!checkAccessibility({ systemPreferences, platform }).granted) return { ok: false, reason: 'accessibility-required' };
      const script = `tell application "System Events" to click at {${x}, ${y}}`;
      await exec('/usr/bin/osascript', ['-e', script], { timeout: 5000, windowsHide: true });
    } else if (platform === 'win32') {
      const source = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public static class CapriPointer { [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e); }'; if (-not [CapriPointer]::SetCursorPos(${x},${y})) { exit 2 }; [CapriPointer]::mouse_event(2,0,0,0,[UIntPtr]::Zero); [CapriPointer]::mouse_event(4,0,0,0,[UIntPtr]::Zero)`;
      const encoded = Buffer.from(source, 'utf16le').toString('base64');
      await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 8000, windowsHide: true });
    } else if (platform === 'linux') {
      await exec('xdotool', ['mousemove', '--sync', String(x), String(y), 'click', '1'], { timeout: 5000, windowsHide: true });
    } else return { ok: false, reason: 'unsupported-platform' };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: platform === 'linux' && error.code === 'ENOENT' ? 'xdotool-missing' : 'action-failed' };
  }
}

function createComputerControl({ BrowserWindow, ipcMain, desktopCapturer, screen, systemPreferences, config, llm, performClick = clickAt, macAutomationGranted = () => false, platform = process.platform, preload, confirmPreload, protocolUrl = 'capri://app/src/renderer/computer-control.html' }) {
  let win = null;
  let confirmWin = null;
  let busy = false;
  let pendingPlan = null;
  let queuedInstruction = '';
  let expanded = false;
  let cursorWin = null;
  let cursorMotion = 0;
  const ownsControl = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const ownsConfirm = (event) => Boolean(confirmWin && !confirmWin.isDestroyed() && event.sender === confirmWin.webContents && event.senderFrame === confirmWin.webContents.mainFrame);
  const owns = (event) => ownsControl(event) || ownsConfirm(event);
  function showCursor(point) {
    if (!cursorWin || cursorWin.isDestroyed()) {
      cursorWin = new BrowserWindow({ width: 32, height: 32, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, focusable: false, resizable: false, hasShadow: false, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
      cursorWin.setIgnoreMouseEvents(true, { forward: true });
      cursorWin.loadURL('capri://app/src/renderer/computer-cursor.html');
      cursorWin.on('closed', () => { cursorWin = null; });
    }
    cursorWin.setPosition(Math.round(point.x), Math.round(point.y));
    cursorWin.showInactive();
  }
  const hideCursor = () => { cursorMotion++; cursorWin?.hide(); };
  let confirmationTimer = null;
  function closeConfirmation() {
    clearTimeout(confirmationTimer);
    confirmationTimer = null;
    if (confirmWin && !confirmWin.isDestroyed()) confirmWin.close();
    confirmWin = null;
  }
  function showConfirmation(plan) {
    closeConfirmation();
    const display = screen.getPrimaryDisplay();
    const area = display.workArea || display.bounds;
    confirmWin = new BrowserWindow({
      width: 380, height: 158, minWidth: 380, minHeight: 158, maxWidth: 380, maxHeight: 158,
      title: 'Capri // Autorisation requise', frame: false, resizable: false, movable: false,
      alwaysOnTop: true, skipTaskbar: true, focusable: true, show: false, autoHideMenuBar: true,
      webPreferences: { preload: confirmPreload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    confirmWin.setPosition(area.x + area.width - 392, area.y + area.height - 170);
    confirmWin.loadURL('capri://app/src/renderer/computer-confirm.html');
    confirmWin.webContents.once('did-finish-load', () => {
      if (!confirmWin || confirmWin.isDestroyed()) return;
      confirmWin.webContents.send('computer-control:confirmation', {
        id: plan.id,
        action: plan.description,
        expiresAt: plan.expiresAt,
      });
    });
    confirmWin.once('ready-to-show', () => confirmWin?.showInactive());
    const notification = confirmWin;
    confirmWin.on('closed', () => {
      if (confirmWin === notification) confirmWin = null;
      if (pendingPlan?.id === plan.id) {
        pendingPlan = null;
        clearTimeout(confirmationTimer);
        confirmationTimer = null;
        hideCursor();
        if (win && !win.isDestroyed()) win.webContents.send('computer-control:decision', { id: plan.id, accepted: false, reason: 'refused' });
      }
    });
    confirmationTimer = setTimeout(() => {
      if (pendingPlan?.id === plan.id) pendingPlan = null;
      closeConfirmation();
      hideCursor();
      if (win && !win.isDestroyed()) win.webContents.send('computer-control:decision', { id: plan.id, accepted: false, reason: 'plan-expired' });
    }, Math.max(0, plan.expiresAt - Date.now()));
    confirmationTimer.unref?.();
  }
  async function animateCursor(point) {
    const motion = ++cursorMotion;
    const from = { x: point.x - 150, y: point.y - 95 };
    showCursor(from);
    const steps = 22;
    for (let step = 1; step <= steps; step++) {
      if (motion !== cursorMotion) return false;
      const t = step / steps;
      const eased = t * t * (3 - 2 * t);
      showCursor({ x: from.x + (point.x - from.x) * eased, y: from.y + (point.y - from.y) * eased });
      await new Promise((resolve) => setTimeout(resolve, 14));
    }
    return motion === cursorMotion;
  }
  const capability = () => {
    if (config.load().computerControl !== true) return { enabled: false, reason: 'opt-in-required' };
    if (platform === 'darwin') {
      const accessibility = checkAccessibility({ systemPreferences, platform }).granted;
      const screenPermission = checkScreenRecording({ systemPreferences, platform }).granted;
      const automation = macAutomationGranted();
      return { enabled: accessibility && screenPermission && automation, reason: !accessibility ? 'accessibility-required' : !screenPermission ? 'screen-recording-required' : !automation ? 'automation-required' : '' };
    }
    if (platform === 'win32') return { enabled: true, reason: '' };
    if (platform === 'linux') return { enabled: true, reason: '' };
    return { enabled: false, reason: 'unsupported-platform' };
  };
  async function snapshot() {
    const display = screen.getPrimaryDisplay();
    const size = display.size;
    const width = Math.max(1, Math.min(1600, size.width));
    const height = Math.max(1, Math.round(size.height * width / size.width));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height }, fetchWindowIcons: false });
    const source = sources.find((item) => String(item.display_id) === String(display.id)) || sources[0];
    if (!source || source.thumbnail.isEmpty()) throw new Error('Capture d’écran indisponible. Vérifiez les autorisations système.');
    return { image: source.thumbnail.toDataURL(), bounds: display.bounds, capability: capability() };
  }
  async function proposeClick(instruction) {
    if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 300) return { ok: false, error: 'Décrivez brièvement l’élément à cliquer (300 caractères maximum).' };
    if (!llm) return { ok: false, error: 'Le fournisseur de vision configuré est indisponible.' };
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 1280 }, fetchWindowIcons: false });
    const display = screen.getPrimaryDisplay();
    const source = sources.find((item) => String(item.display_id) === String(display.id)) || sources[0];
    if (!source || source.thumbnail.isEmpty()) return { ok: false, error: 'Capture d’écran indisponible.' };
    const image = source.thumbnail.toJPEG(80).toString('base64');
    const cfg = config.load();
    const prompt = `L’utilisateur veut cliquer sur cet élément : « ${instruction.trim()} ». Analyse uniquement l’image du bureau. Réponds par un objet JSON strict, sans Markdown : {"x":<coordonnée horizontale entre 0 et 1000>,"y":<coordonnée verticale entre 0 et 1000>,"confidence":<nombre entre 0 et 1>,"target":"description brève"}. Les coordonnées sont relatives à toute l’image, origine en haut à gauche. Si l’élément n’est pas clairement visible, renvoie {"x":-1,"y":-1,"confidence":0,"target":"introuvable"}. Ne demande pas d’autre action que le clic gauche.`;
    try {
      const answer = String(await llm.see(cfg.visionProvider || cfg.provider, cfg, { image, prompt, model: cfg.visionModel || null })).trim();
      const raw = answer.slice(answer.indexOf('{'), answer.lastIndexOf('}') + 1);
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y) || !Number.isFinite(parsed.confidence) || parsed.confidence < 0.55 || parsed.x < 0 || parsed.x > 1000 || parsed.y < 0 || parsed.y > 1000) {
        pendingPlan = null;
        return { ok: false, error: 'Capri n’a pas identifié une cible avec assez de certitude. Aucun clic n’a été effectué.' };
      }
      const bounds = display.bounds;
      const point = { x: Math.round(bounds.x + parsed.x / 1000 * bounds.width), y: Math.round(bounds.y + parsed.y / 1000 * bounds.height) };
      pendingPlan = { id: randomUUID(), point, description: String(parsed.target || instruction.trim()).slice(0, 120), expiresAt: Date.now() + 60_000 };
      showCursor(point); // repère visuellement la proposition sans déplacer la vraie souris ni cliquer
      showConfirmation(pendingPlan);
      return { ok: true, image: source.thumbnail.toDataURL(), plan: { id: pendingPlan.id, point, description: pendingPlan.description, expiresAt: pendingPlan.expiresAt } };
    } catch (error) {
      pendingPlan = null;
      return { ok: false, error: `Capri n’a pas pu analyser l’écran : ${String(error.message || error).slice(0, 250)}` };
    }
  }
  function show(instruction = '') {
    queuedInstruction = typeof instruction === 'string' ? instruction.trim().slice(0, 240) : '';
    expanded = Boolean(queuedInstruction);
    if (win && !win.isDestroyed()) {
      setSize(); win.show(); win.focus();
      if (queuedInstruction) win.webContents.send('computer-control:task', queuedInstruction);
      return win;
    }
    win = new BrowserWindow({ width: 460, height: 220, minWidth: 400, minHeight: 180, title: 'Capri // Contrôle du bureau', show: false, autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    setSize();
    if (queuedInstruction) win.webContents.once('did-finish-load', () => win?.webContents.send('computer-control:task', queuedInstruction));
    win.loadURL(protocolUrl);
    win.once('ready-to-show', () => win?.show());
    win.on('closed', () => { win = null; busy = false; });
    return win;
  }
  function setSize() {
    if (!win || win.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    const area = display.workArea || display.bounds;
    const width = expanded ? Math.min(920, area.width) : Math.min(460, area.width);
    const height = expanded ? Math.min(700, area.height) : Math.min(184, area.height);
    win.setSize(width, height);
    win.setPosition(area.x + area.width - width, area.y);
  }
  ipcMain.handle('computer-control:status', (event) => { if (!ownsControl(event)) return { enabled: false, reason: 'untrusted-sender' }; return capability(); });
  ipcMain.handle('computer-control:resize', (event, value) => { if (!ownsControl(event)) return { ok: false, reason: 'untrusted-sender' }; expanded = value === true; setSize(); return { ok: true }; });
  ipcMain.handle('computer-control:snapshot', async (event) => { if (!ownsControl(event)) return { ok: false, error: 'Accès refusé.' }; if (!capability().enabled) return { ok: false, reason: capability().reason }; try { return { ok: true, ...(await snapshot()) }; } catch (error) { return { ok: false, error: error.message }; } });
  ipcMain.handle('computer-control:propose-click', async (event, instruction) => {
    if (!ownsControl(event)) return { ok: false, error: 'Accès refusé.' };
    if (!capability().enabled) return { ok: false, reason: capability().reason };
    if (pendingPlan) return { ok: false, reason: 'confirmation-pending', error: 'Une action attend déjà votre décision.' };
    try { return await proposeClick(instruction); } catch (error) { pendingPlan = null; closeConfirmation(); hideCursor(); return { ok: false, error: `Analyse impossible : ${String(error.message || error).slice(0, 250)}` }; }
  });
  ipcMain.handle('computer-control:confirm-click', async (event, id) => {
    if (!owns(event)) return { ok: false, reason: 'untrusted-sender' };
    if (!capability().enabled) return { ok: false, reason: capability().reason };
    if (typeof id !== 'string' || !pendingPlan || id !== pendingPlan.id || Date.now() > pendingPlan.expiresAt) { pendingPlan = null; closeConfirmation(); hideCursor(); return { ok: false, reason: 'plan-expired' }; }
    if (busy) return { ok: false, reason: 'busy' };
    const plan = pendingPlan;
    pendingPlan = null;
    closeConfirmation();
    busy = true;
    win?.webContents.send('computer-control:decision', { id: plan.id, accepted: true, phase: 'running' });
    try {
      if (!await animateCursor(plan.point)) return { ok: false, reason: 'cancelled' };
      win.hide(); // keep Stop available while the cursor moves; hide the panel only for the atomic click
      return await performClick(plan.point, { platform, bounds: screen.getPrimaryDisplay().bounds, systemPreferences });
    } finally {
      hideCursor();
      if (win && !win.isDestroyed()) {
        expanded = false;
        setSize();
        if (config.load().computerControlPreview !== false) win.showInactive();
        else win.hide();
        win.webContents.send('computer-control:refresh');
      }
      busy = false;
    }
  });
  ipcMain.handle('computer-control:cancel', (event) => {
    if (!owns(event)) return { ok: false, reason: 'untrusted-sender' };
    const id = pendingPlan?.id;
    pendingPlan = null;
    closeConfirmation();
    hideCursor();
    if (id && win && !win.isDestroyed()) win.webContents.send('computer-control:decision', { id, accepted: false, reason: 'cancelled' });
    return { ok: true };
  });
  ipcMain.handle('computer-control:reject-click', (event, id) => {
    if (!owns(event)) return { ok: false, reason: 'untrusted-sender' };
    if (typeof id !== 'string' || !pendingPlan || id !== pendingPlan.id) return { ok: false, reason: 'plan-expired' };
    pendingPlan = null;
    closeConfirmation();
    hideCursor();
    if (win && !win.isDestroyed()) win.webContents.send('computer-control:decision', { id, accepted: false, reason: 'refused' });
    return { ok: true };
  });
  ipcMain.handle('computer-control:click', async (event, point) => {
    if (!ownsControl(event)) return { ok: false, reason: 'untrusted-sender' };
    const access = capability();
    if (!access.enabled) return { ok: false, reason: access.reason };
    if (busy) return { ok: false, reason: 'busy' };
    const bounds = screen.getPrimaryDisplay().bounds;
    if (!validPoint(point, bounds)) return { ok: false, reason: 'invalid-point' };
    busy = true;
    try {
      if (!await animateCursor(point)) return { ok: false, reason: 'cancelled' };
      win.hide();
      return await performClick(point, { platform, bounds, systemPreferences });
    } finally {
      hideCursor();
      if (win && !win.isDestroyed()) {
        expanded = false;
        setSize();
        if (config.load().computerControlPreview !== false) win.showInactive();
        else win.hide();
      }
      busy = false;
    }
  });
  function setCompactVisible(visible) {
    if (!win || win.isDestroyed() || expanded) return;
    if (visible) {
      setSize();
      win.showInactive();
      win.webContents.send('computer-control:refresh');
    } else win.hide();
  }
  return { show, close: () => win?.close(), capability, setCompactVisible };
}

module.exports = { validPoint, clickAt, createComputerControl };

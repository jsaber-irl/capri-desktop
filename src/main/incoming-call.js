'use strict';

// Owns the simulated incoming/active call window. Only this window can answer its call controls.
function createIncomingCall({ BrowserWindow, ipcMain, preload, protocolUrl, sendCommand, screen = null, getOverlayWebContents = () => null }) {
  let win = null;
  let accepted = false;
  let serial = 0;
  let terminalSent = false;
  let ready = false;
  const pending = [];

  const close = () => {
    const current = win;
    win = null;
    if (current && !current.isDestroyed()) current.close();
  };
  const tell = (state, message = '') => {
    if (!win || win.isDestroyed()) return;
    const event = ['call:uiState', { state, message }];
    if (!ready) pending.push(event);
    else win.webContents.send(...event);
  };
  const flush = () => {
    if (!win || win.isDestroyed()) return;
    ready = true;
    for (const [channel, payload] of pending.splice(0)) win.webContents.send(channel, payload);
  };
  const fromWindow = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents);
  const place = (position) => {
    if (!win || win.isDestroyed() || !screen?.getPrimaryDisplay) return;
    const area = screen.getPrimaryDisplay().workArea;
    const bounds = win.getBounds?.() || { width: 390, height: 610 };
    const x = position === 'top-right' ? area.x + area.width - bounds.width - 20 : area.x + Math.round((area.width - bounds.width) / 2);
    const y = position === 'top-right' ? area.y + 20 : area.y + Math.round((area.height - bounds.height) / 2);
    win.setPosition(x, y);
  };

  ipcMain.handle('call:accept', (event) => {
    if (!fromWindow(event) || accepted) return false;
    accepted = true;
    place('top-right');
    tell('connecting');
    sendCommand('callAccepted', { id: serial });
    return true;
  });
  ipcMain.handle('call:refuse', (event) => {
    if (!fromWindow(event) || accepted) return false;
    terminalSent = true;
    sendCommand('callCancelled', { id: serial });
    close();
    return true;
  });
  ipcMain.handle('call:end', (event) => {
    if (!fromWindow(event) || !accepted) return false;
    terminalSent = true;
    sendCommand('callEnded', { id: serial });
    close();
    return true;
  });
  ipcMain.on('call:state', (event, status) => {
    if (!fromWindow(event) || !accepted) return;
    const allowed = new Set(['connecting', 'listening', 'processing', 'speaking', 'error']);
    if (status && allowed.has(status.state)) tell(status.state, String(status.message || '').slice(0, 240));
  });
  ipcMain.on('call:transcript', (event, message) => {
    if (!accepted || event.sender !== getOverlayWebContents() || !message || !['capri', 'user'].includes(message.speaker)) return;
    const text = String(message.text || '').trim().slice(0, 2000);
    if (text) {
      const event = ['call:transcript', { speaker: message.speaker, text, final: message.final !== false }];
      if (!ready) pending.push(event);
      else win?.webContents.send(...event);
    }
  });

  return {
    show() {
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
        return false;
      }
      accepted = false;
      terminalSent = false;
      pending.length = 0;
      serial += 1;
      const ownSerial = serial;
      win = new BrowserWindow({
        width: 390, height: 610,
        minWidth: 340, minHeight: 450,
        title: 'Capri', frame: false, resizable: false, show: false,
        transparent: true, backgroundColor: '#00000000', hasShadow: false, autoHideMenuBar: true,
        webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy: 'no-user-gesture-required' },
      });
      if (typeof win.webContents.once === 'function') {
        ready = false;
        win.webContents.once('did-finish-load', flush);
      } else {
        ready = true;
      }
      place('center');
      win.once('ready-to-show', () => { if (serial === ownSerial) win?.show(); });
      win.on('closed', () => {
        if (serial !== ownSerial) return;
        const hadAccepted = accepted;
        win = null;
        ready = false;
        pending.length = 0;
        accepted = false;
        if (!terminalSent) sendCommand(hadAccepted ? 'callEnded' : 'callCancelled', { id: ownSerial });
        terminalSent = false;
      });
      win.loadURL(protocolUrl);
      return true;
    },
    state(state, message) { tell(state, message); },
    get active() { return Boolean(win && !win.isDestroyed()); },
    get accepted() { return accepted; },
    close,
  };
}

module.exports = { createIncomingCall };

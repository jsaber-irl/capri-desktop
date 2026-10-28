'use strict';

// Owns the simulated incoming/active call window. Only this window can answer its call controls.
function createIncomingCall({ BrowserWindow, ipcMain, preload, protocolUrl, sendCommand }) {
  let win = null;
  let accepted = false;
  let serial = 0;
  let terminalSent = false;

  const close = () => {
    const current = win;
    win = null;
    if (current && !current.isDestroyed()) current.close();
  };
  const tell = (state, message = '') => {
    if (win && !win.isDestroyed()) win.webContents.send('call:uiState', { state, message });
  };
  const fromWindow = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents);

  ipcMain.handle('call:accept', (event) => {
    if (!fromWindow(event) || accepted) return false;
    accepted = true;
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

  return {
    show() {
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
        return false;
      }
      accepted = false;
      terminalSent = false;
      serial += 1;
      const ownSerial = serial;
      win = new BrowserWindow({
        width: 390, height: 610, minWidth: 340, minHeight: 450,
        title: 'Capri', frame: false, resizable: false, show: false,
        backgroundColor: '#11131b', autoHideMenuBar: true,
        webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy: 'no-user-gesture-required' },
      });
      win.once('ready-to-show', () => { if (serial === ownSerial) win?.show(); });
      win.on('closed', () => {
        if (serial !== ownSerial) return;
        const hadAccepted = accepted;
        win = null;
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

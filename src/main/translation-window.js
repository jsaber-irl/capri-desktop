'use strict';

function createTranslationWindow({ BrowserWindow, ipcMain, dialog, preload, protocolUrl, translateSource, getSettings, getTranslationOptions, setSettings }) {
  let win = null;
  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents
    && (!event.senderFrame || event.senderFrame === win.webContents.mainFrame));
  const show = (source = null) => {
    if (win && !win.isDestroyed()) {
      if (source) win.webContents.send('translation:source', source);
      win.show(); win.focus(); return;
    }
    win = new BrowserWindow({
      width: 900, height: 700, minWidth: 620, minHeight: 480, title: 'Capri // Translator',
      backgroundColor: '#0d0a14', frame: false, show: false, autoHideMenuBar: true,
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    win.removeMenu?.();
    win.once('ready-to-show', () => win?.show());
    win.webContents.once('did-finish-load', () => { if (source) win?.webContents.send('translation:source', source); });
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  };
  ipcMain.handle('translation:settings', (event) => owns(event) ? getSettings() : null);
  ipcMain.handle('translation:setSettings', (event, settings) => owns(event) ? setSettings(settings) : { ok: false, error: 'Access denied.' });
  ipcMain.handle('translation:chooseFile', async (event) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a file to translate',
      properties: ['openFile'],
      filters: [{ name: 'Text, web and document files', extensions: ['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm', 'xhtml', 'css', 'js', 'pdf', 'rtf'] }],
    });
    return result.canceled || !result.filePaths[0] ? { ok: false, canceled: true } : { ok: true, path: result.filePaths[0] };
  });
  ipcMain.handle('translation:translate', async (event, request) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    try {
      const saved = getTranslationOptions();
      const text = await translateSource(request?.source, {
        ...saved,
        ...(request?.options || {}),
        apiKey: saved.apiKey,
        apiUrl: request?.options?.apiUrl || saved.apiUrl,
      });
      return { ok: true, text };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  ipcMain.handle('translation:close', (event) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    win.destroy();
    return { ok: true };
  });
  ipcMain.on('translation:close-window', (event) => {
    if (win && !win.isDestroyed() && event.sender === win.webContents) win.destroy();
  });
  return { show, close: () => win?.close() };
}

module.exports = { createTranslationWindow };

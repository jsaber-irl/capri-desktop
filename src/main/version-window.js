'use strict';

const { REPOSITORY, compareVersions, normalizeVersion } = require('./update-manager');

function createVersionWindow({ BrowserWindow, ipcMain, shell, dialog, preload, protocolUrl, packageInfo, updateManager, config }) {
  let win = null;
  const fromWindow = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => fromWindow(event)
    ? callback(...args)
    : { ok: false, error: 'unauthorized' });

  handle('version:state', () => updateManager.getState());
  handle('version:check', () => updateManager.check({ automatic: updateManager.getState().mode === 'automatic' }));
  handle('version:download', () => updateManager.download());
  handle('version:setMode', (mode) => updateManager.setMode(mode));
  handle('version:install', async () => {
    const lang = String(config.load().lang || 'fr').toLowerCase().split('-')[0];
    const copy = {
      fr: { message: 'Fermer Capri et lancer l’installation du paquet vérifié ?', detail: 'Sur macOS, Capri reste non signée et non notarisée. Gatekeeper peut afficher son avertissement habituel. Capri ne désactive ni ne contourne ces protections.', yes: 'Installer et redémarrer', no: 'Annuler' },
      en: { message: 'Quit Capri and start installing the verified package?', detail: 'On macOS, Capri remains unsigned and not notarized. Gatekeeper may show its usual warning. Capri does not disable or bypass these protections.', yes: 'Install and restart', no: 'Cancel' },
      ru: { message: 'Закрыть Capri и запустить установку проверенного пакета?', detail: 'В macOS Capri остаётся неподписанной и ненотаризованной. Gatekeeper может показать обычное предупреждение. Capri не отключает и не обходит эти средства защиты.', yes: 'Установить и перезапустить', no: 'Отмена' },
    }[lang] || null;
    const text = copy || { message: 'Quit Capri and install the verified update?', detail: 'The package was authenticated by Capri’s signed manifest and SHA-512 digest.', yes: 'Install and restart', no: 'Cancel' };
    const answer = await dialog.showMessageBox(win, { type: 'warning', buttons: [text.no, text.yes], defaultId: 0, cancelId: 0, message: text.message, detail: text.detail });
    if (answer.response !== 1) return { ok: false, canceled: true };
    return updateManager.install();
  });
  handle('version:openRepository', async () => { await shell.openExternal(REPOSITORY); return { ok: true }; });
  handle('version:close', () => { if (win && !win.isDestroyed()) win.hide(); return { ok: true }; });

  function show() {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); win.webContents.send('version:state', updateManager.getState()); return; }
    win = new BrowserWindow({
      width: 720, height: 690, minWidth: 540, minHeight: 580,
      show: false, frame: false, resizable: true, title: 'Capri · Updates',
      backgroundColor: '#17121f',
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    win.removeMenu();
    win.once('ready-to-show', () => { if (win && !win.isDestroyed()) win.show(); });
    win.webContents.on('did-finish-load', () => win?.webContents.send('version:state', updateManager.getState()));
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  }
  const unsubscribe = updateManager.subscribe((state) => { if (win && !win.isDestroyed()) win.webContents.send('version:state', state); });
  return { show, close: () => win?.hide(), isOpen: () => Boolean(win && !win.isDestroyed()), dispose: unsubscribe, lang: config.load().lang, installed: packageInfo.version };
}

module.exports = { createVersionWindow, compareVersions, normalizeVersion, REPOSITORY };

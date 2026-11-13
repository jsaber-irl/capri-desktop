'use strict';

function createDataWindow({ BrowserWindow, ipcMain, dialog, preload, protocolUrl = 'capri://app/src/renderer/data.html', tools, app }) {
  let win = null;
  let selectedVault = null;
  let selectedFiles = [];
  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const authorized = (event, action) => owns(event) ? action() : { ok: false, error: 'Accès refusé.' };
  const show = () => {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); return; }
    win = new BrowserWindow({ width: 820, height: 720, minWidth: 620, minHeight: 520, title: 'Capri // Données et outils', frame: true, show: false, autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.once('ready-to-show', () => win?.show());
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  };
  ipcMain.handle('data-tools:inventory', (event) => authorized(event, () => ({ ok: true, categories: tools.inventory(), userData: app.getPath('userData') })));
  ipcMain.handle('data-tools:choose-vault', async (event) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const result = await dialog.showOpenDialog(win, { title: 'Choisir un coffre Obsidian ou dossier Markdown', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    try { selectedVault = result.filePaths[0]; const preview = tools.previewMarkdown(selectedVault); selectedFiles = preview.files; return preview; } catch (error) { selectedVault = null; selectedFiles = []; return { ok: false, error: error.message }; }
  });
  ipcMain.handle('data-tools:import', (event, request = {}) => authorized(event, () => {
    if (!selectedVault) return { ok: false, error: 'Choisissez d’abord un dossier Markdown.' };
    try { const names = Array.isArray(request.names) ? request.names.filter((name) => selectedFiles.some((item) => item.name === name)) : []; return tools.importMarkdown({ folder: selectedVault, names, expectedFiles: selectedFiles }); }
    catch (error) { return { ok: false, error: error.message }; }
  }));
  ipcMain.handle('data-tools:export', async (event, selected = []) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const result = await dialog.showOpenDialog(win, { title: 'Choisir le coffre Obsidian ou dossier de destination', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    try { return tools.exportToFolder(result.filePaths[0], Array.isArray(selected) ? selected : []); }
    catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.handle('data-tools:clear-category', async (event, category) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const allowed = ['conversations', 'structured-memory', 'bond', 'reminders', 'preferences'];
    if (!allowed.includes(String(category))) return { ok: false, error: 'Catégorie inconnue.' };
    const answer = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Annuler', 'Supprimer'], defaultId: 0, cancelId: 0, message: `Supprimer les données « ${category} » ?`, detail: 'La suppression sera vérifiée sur le stockage local de Capri.' });
    if (answer.response !== 1) return { ok: false, canceled: true };
    return tools.clearCategory(String(category));
  });
  ipcMain.handle('data-tools:delete-entry', (event, category, id) => {
    if(!owns(event))return {ok:false,error:'Accès refusé.'};
    if(!['conversations','structured-memory','bond','reminders'].includes(String(category)))return {ok:false,error:'Catégorie inconnue.'};
    return tools.deleteEntry(String(category),String(id).slice(0,100));
  });
  ipcMain.handle('data-tools:set-retention', (event, days) => owns(event) ? tools.setRetention(days) : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('data-tools:purge-all', async (event) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const answer = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Annuler', 'Purger et redémarrer'], defaultId: 0, cancelId: 0, message: 'Purger toutes les données locales de Capri ?', detail: `Cette action supprime tout le contenu de ${app.getPath('userData')}, y compris réglages, rappels, mémoires, sons utilisateur et composants téléchargés. Les sauvegardes externes et données hors de ce dossier ne sont pas incluses.` });
    if (answer.response !== 1) return { ok: false, canceled: true };
    const result = tools.purgeAll();
    if (result.ok && result.verified) setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
    return result;
  });
  return { show, close: () => win?.close(), isOpen: () => Boolean(win && !win.isDestroyed()) };
}

module.exports = { createDataWindow };

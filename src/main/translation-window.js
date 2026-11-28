'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { translateBatch } = require('./translator');
const { createBrowserTracker } = require('./active-page');
const { resolveDocumentPath } = require('./document-extract');
const { devLog } = require('./logger');

const DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'docm', 'dotx', 'odt', 'ods', 'odp', 'epub',
  'ppt', 'pptx', 'pptm', 'xls', 'xlsx', 'xlsm',
  'html', 'htm', 'xhtml', 'md', 'markdown', 'txt', 'csv', 'tsv', 'json', 'xml',
  'yaml', 'yml', 'toml', 'rtf', 'css', 'js', 'mjs', 'ts', 'log', 'srt', 'vtt', 'tex',
];

function sanitiseName(value, fallback = 'traduction') {
  const name = String(value || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^\.+/, '').trim();
  return name.slice(0, 120) || fallback;
}

function createTranslationWindow({
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  app,
  preload,
  protocolUrl,
  translatePage,
  translateDocument,
  readActivePage,
  openMacPermissions,
  getSettings,
  getTranslationOptions,
  setSettings,
  onTranslationActivity,
}) {
  let win = null;
  let pendingSource = null;
  let lastTranslation = null;
  let lastExportPath = '';
  let lastActivityPhase = '';
  const browserTracker = createBrowserTracker();

  // Take the frontmost browser synchronously before this window takes focus, then
  // keep watching while it is open so the user can switch tabs/browsers.
  const rememberBrowser = () => browserTracker.capture();

  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents
    && (!event.senderFrame || event.senderFrame === win.webContents.mainFrame));

  const sendSource = (source) => {
    if (!source || !win || win.isDestroyed()) return;
    win.webContents.send('translation:source', source);
  };

  const show = (source = null) => {
    rememberBrowser();
    const loggedSource = source && typeof source === 'object'
      ? {
        kind: source.kind || '',
        location: source.location || '',
        value: source.kind === 'url' || source.kind === 'page'
          ? (() => { try { return new URL(source.value).hostname; } catch { return '-'; } })()
          : (source.value || ''),
      }
      : null;
    devLog('[translation:window] ouverture', { source: loggedSource, browser: browserTracker.current() || '-' });
    if (win && !win.isDestroyed()) {
      if (source) sendSource(source);
      win.show(); win.focus(); return;
    }
    browserTracker.start();
    pendingSource = source || null;
    win = new BrowserWindow({
      width: 560,
      height: 640,
      minWidth: 460,
      minHeight: 520,
      title: 'Capri // Traduction',
      backgroundColor: '#0c0910',
      frame: false,
      resizable: true,
      maximizable: false,
      fullscreenable: false,
      show: false,
      autoHideMenuBar: true,
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    win.removeMenu?.();
    win.setMenuBarVisibility?.(false);
    win.once('ready-to-show', () => win?.show());
    win.webContents.once('did-finish-load', () => {
      if (pendingSource) sendSource(pendingSource);
      pendingSource = null;
    });
    win.on('closed', () => {
      win = null;
      pendingSource = null;
      // The tracker belongs to the app now (it keeps the last browser while
      // Capri is focused), so closing this window must not stop it. It also
      // stops a full-screen scan that would otherwise run without a window.
      try { onTranslationActivity?.({ phase: 'error' }); } catch { /* best effort */ }
    });
    win.loadURL(protocolUrl);
  };

  const report = (payload) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send('translation:progress', payload);
    // The overlay only needs the phase changes: progress ticks keep the same
    // phase and would restart nothing, but they would cross IPC once per batch.
    if (payload.phase !== lastActivityPhase) {
      lastActivityPhase = payload.phase;
      try { onTranslationActivity?.(payload); } catch (error) { devLog('[translation:window] activité', error.message); }
    }
  };

  ipcMain.handle('translation:settings', (event) => {
    if (!owns(event)) return null;
    const settings = getSettings() || {};
    return { ...settings, lang: settings.lang || 'fr' };
  });

  ipcMain.handle('translation:setSettings', (event, settings) => (
    owns(event) ? setSettings(settings) : { ok: false, error: 'Access denied.' }
  ));

  ipcMain.handle('translation:chooseFile', async (event) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    const result = await dialog.showOpenDialog(win, {
      title: 'Choisir un document à traduire',
      properties: ['openFile'],
      filters: [
        { name: 'Tous les documents', extensions: DOCUMENT_EXTENSIONS },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word / OpenDocument / EPUB', extensions: ['doc', 'docx', 'docm', 'dotx', 'odt', 'ods', 'odp', 'epub', 'rtf'] },
        { name: 'Bureautique', extensions: ['ppt', 'pptx', 'pptm', 'xls', 'xlsx', 'xlsm'] },
        { name: 'Pages web et texte', extensions: ['html', 'htm', 'xhtml', 'md', 'markdown', 'txt', 'csv'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const filePath = result.filePaths[0];
    const stat = await fs.stat(filePath).catch(() => null);
    return {
      ok: true,
      path: filePath,
      name: path.basename(filePath),
      ext: path.extname(filePath).replace(/^\./, '').toLowerCase(),
      size: stat?.isFile() ? stat.size : 0,
    };
  });

  ipcMain.handle('translation:activePage', async (event) => {
    if (!owns(event)) return { ok: false, code: 'denied' };
    try {
      // The sample is taken before the window takes focus; otherwise the
      // frontmost app is already Capri and the user's browser is lost.
      const bundle = browserTracker.current();
      devLog('[translation:window] page active demandée', { bundle: bundle || '-' });
      const result = await readActivePage(bundle ? { bundle } : undefined);
      devLog('[translation:window] page active', {
        bundle: bundle || '-',
        code: result?.code || (result?.ok ? 'ok' : '?'),
        browser: result?.browser || '-',
        reason: result?.reason || '',
      });
      return result;
    } catch (error) {
      devLog('[translation:window] page active: erreur', error?.message || String(error));
      return { ok: false, code: 'error', reason: String(error?.message || error).slice(0, 300) };
    }
  });

  ipcMain.handle('translation:openPermissions', (event, targetId) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    if (process.platform !== 'darwin' || typeof targetId !== 'string' || !/^[a-zA-Z]{2,24}$/.test(targetId)) {
      return { ok: false, error: 'Unsupported permission target.' };
    }
    const result = openMacPermissions?.({ targetId, request: true });
    return result === false || result == null
      ? { ok: false, error: 'The macOS permissions window is not available.' }
      : { ok: true, targetId };
  });

  ipcMain.handle('translation:translate', async (event, request) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    const requestId = String(request?.requestId || '').slice(0, 80);
    const kind = String(request?.source?.kind || '');
    const value = String(request?.source?.value || '');
    if (!['page', 'document', 'url', 'file', 'text'].includes(kind) || (kind !== 'text' && !value)) {
      return { ok: false, error: 'Nothing to translate.', code: 'invalid-source' };
    }
    try {
      const saved = getTranslationOptions();
      const requested = request?.options || {};
      const options = {
        provider: requested.provider || saved.provider,
        apiKey: saved.apiKey,
        apiUrl: String(requested.apiUrl || saved.apiUrl || ''),
        source: /^[a-z]{2,3}$/i.test(String(requested.source || '')) ? String(requested.source) : 'auto',
        target: String(requested.target || 'fr'),
      };
      const onProgress = (update) => report({ requestId, ...update });

      let result;
      if (kind === 'page' || kind === 'url') {
        result = await translatePage(value, options, onProgress);
      } else if (kind === 'document' || kind === 'file') {
        const filePath = await resolveDocumentPath(value, {
          cwd: process.cwd(),
          home: app.getPath('home'),
          desktop: app.getPath('desktop'),
          documents: app.getPath('documents'),
          downloads: app.getPath('downloads'),
          location: request?.source?.location,
        });
        devLog('[translation:window] document', { requested: value, resolved: filePath, location: request?.source?.location || '-' });
        result = await translateDocument(filePath, options, onProgress);
      } else {
        onProgress({ phase: 'translating', done: 0, total: 1 });
        const [translated] = await translateBatch([value], options, (progress) => {
          onProgress({ phase: 'translating', ...progress });
        });
        result = {
          ok: true,
          kind: 'text',
          title: 'Texte',
          outputText: translated,
          outputHtml: '',
          previewHtml: '',
          format: 'txt',
          suggestedName: `traduction.${options.target}.txt`,
          stats: { segments: 1 },
        };
      }

      if (result?.ok) {
        lastTranslation = {
          outputHtml: result.outputHtml || '',
          outputText: result.outputText || '',
          format: result.format || 'txt',
          suggestedName: sanitiseName(result.suggestedName || 'traduction'),
        };
        lastExportPath = '';
      }
      report({ requestId, phase: result?.ok ? 'done' : 'error', code: result?.code || '' });
      return result;
    } catch (error) {
      const loggedValue = kind === 'url' || kind === 'page'
        ? (() => { try { return new URL(value).hostname; } catch { return '-'; } })()
        : value;
      devLog('[translation:window] traduction échouée', { kind, value: loggedValue, code: error?.code, error: String(error?.message || error) });
      report({ requestId, phase: 'error', code: error?.code || 'error' });
      return { ok: false, error: String(error?.message || error), code: error?.code || 'error' };
    }
  });

  ipcMain.handle('translation:save', async (event, request = {}) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    if (!lastTranslation) return { ok: false, error: 'Nothing to save yet.' };
    const format = ['html', 'md', 'txt'].includes(String(request.format)) ? String(request.format) : lastTranslation.format;
    const content = format === 'html'
      ? (lastTranslation.outputHtml || lastTranslation.outputText)
      : (lastTranslation.outputText || '');
    if (!content) return { ok: false, error: 'Nothing to save yet.' };

    const extension = format === 'html' ? 'html' : format === 'md' ? 'md' : 'txt';
    const suggested = lastTranslation.suggestedName.replace(/\.[a-z0-9]+$/i, '') || 'traduction';
    const result = await dialog.showSaveDialog(win, {
      title: 'Enregistrer la traduction',
      defaultPath: path.join(app.getPath('documents'), `${suggested}.${extension}`),
      filters: [{ name: format === 'html' ? 'Page HTML' : format === 'md' ? 'Markdown' : 'Texte', extensions: [extension] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    let destination = result.filePath;
    if (!path.extname(destination)) destination += `.${extension}`;
    try {
      await fs.writeFile(destination, content, 'utf8');
      lastExportPath = destination;
      return { ok: true, path: destination, name: path.basename(destination) };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  });

  ipcMain.handle('translation:openResult', async (event) => {
    if (!owns(event)) return { ok: false, error: 'Access denied.' };
    if (!lastTranslation) return { ok: false, error: 'Nothing to open yet.' };
    try {
      let target = lastExportPath;
      if (!target) {
        const format = lastTranslation.format === 'html' ? 'html' : lastTranslation.format === 'md' ? 'md' : 'txt';
        const content = format === 'html' ? lastTranslation.outputHtml : lastTranslation.outputText;
        if (!content) return { ok: false, error: 'Nothing to open yet.' };
        const directory = path.join(app.getPath('temp'), 'capri-translations');
        await fs.mkdir(directory, { recursive: true });
        target = path.join(directory, lastTranslation.suggestedName.replace(/\.[a-z0-9]+$/i, '') + `.${format}`);
        await fs.writeFile(target, content, 'utf8');
      }
      const failure = await shell.openPath(target);
      if (failure) return { ok: false, error: failure };
      return { ok: true, path: target };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
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

  return {
    show,
    close: () => win?.close(),
    startTracking: () => browserTracker.start(),
    stopTracking: () => browserTracker.stop(),
    trackedBrowser: () => browserTracker.current(),
  };
}

module.exports = { createTranslationWindow, DOCUMENT_EXTENSIONS };

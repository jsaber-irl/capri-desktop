'use strict';

const path = require('node:path');
const cp = require('node:child_process');

const SETTINGS_URLS = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  automation: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
  security: 'x-apple.systempreferences:com.apple.preference.security',
};

const PERMISSIONS_META = {
  accessibility: {
    id: 'accessibility',
    section: 'Section 1',
    nameFr: 'Accessibilité (Accessibility)',
    nameEn: 'Accessibility',
    descFr: 'Permet à Capri d’interagir avec l’interface macOS, de détecter et manipuler les fenêtres, et d’exécuter des actions d’interface.',
    descEn: 'Allows Capri to interact with macOS UI, detect and manipulate desktop windows, and execute interface actions.',
    affectedFr: [
      'Déplacement et repositionnement des fenêtres (« Posséder mes fenêtres »)',
      'Détection du placement des fenêtres et évitement pour ne pas gêner l’utilisateur',
      'Navigation et basculement entre applications compatibles'
    ],
    affectedEn: [
      'Moving and repositioning desktop windows ("Possess my windows")',
      'Window layout detection and non-obtrusive mascot positioning',
      'Navigation and focus switching between compatible applications'
    ],
    instructionsFr: 'Ouvrez Réglages Système > Confidentialité et sécurité > Accessibilité > Activez « Capri » (ou « Electron » en développement). Un redémarrage de l’application est parfois requis.',
    instructionsEn: 'Open System Settings > Privacy & Security > Accessibility > Enable "Capri" (or "Electron" in dev mode). An application restart may be required.',
    canPromptDirectly: false,
  },
  microphone: {
    id: 'microphone',
    section: 'Section 5',
    nameFr: 'Microphone',
    nameEn: 'Microphone',
    descFr: 'Permet aux fonctionnalités vocales de Capri d’écouter votre voix lors des conversations et des requêtes audio.',
    descEn: 'Allows Capri voice features to capture microphone audio for voice conversations and audio commands.',
    affectedFr: [
      'Mode conversation vocale interactive',
      'Reconnaissance vocale Speech-to-Text',
      'Vu-mètre de sensibilité dans le menu circulaire',
      'Raccourci Push-to-Talk (Ctrl+Alt+Espace)'
    ],
    affectedEn: [
      'Interactive voice conversation mode',
      'Speech-to-Text transcription',
      'Volume level meter in circular menu',
      'Push-to-Talk shortcut (Ctrl+Alt+Space)'
    ],
    instructionsFr: 'Cliquez sur « Demander l’autorisation » pour déclencher le dialogue macOS, ou rendez-vous dans Réglages Système > Confidentialité et sécurité > Microphone pour autoriser « Capri ».',
    instructionsEn: 'Click "Request Permission" to trigger the macOS dialog, or navigate to System Settings > Privacy & Security > Microphone to enable "Capri".',
    canPromptDirectly: true,
  },
  screen: {
    id: 'screen',
    section: 'Section 8',
    nameFr: 'Enregistrement de l’écran (Screen Recording)',
    nameEn: 'Screen Recording',
    descFr: 'Autorise les captures réelles d’écran utilisées par « Voir mon écran ». La liste des fenêtres via System Events est une opération distincte et ne constitue pas une capture.',
    descEn: 'Allows real screen captures used by “See my screen”. Listing windows through System Events is a separate operation and is not a screen capture.',
    affectedFr: [
      'Fonctionnalité « Sens / Voir mon écran »',
      'Analyse visuelle par le modèle d’IA multimodal',
      'Compréhension du contexte de travail à l’écran',
      'Écoute audio système : autorisation distincte demandée uniquement si vous activez cette fonction (macOS 14.2+)'
    ],
    affectedEn: [
      '"Senses / See my screen" vision feature',
      'Contextual analysis by multimodal vision AI',
      'Visual awareness of current work context',
      'System audio listening: a separate permission requested only when you enable that feature (macOS 14.2+)'
    ],
    instructionsFr: 'macOS requiert une activation manuelle : ouvrez Réglages Système > Confidentialité et sécurité > Enregistrement de l’écran, activez « Capri » (ou « Electron »), puis quittez et relancez l’application. L’écoute audio système peut déclencher une demande distincte.',
    instructionsEn: 'macOS requires manual activation: open System Settings > Privacy & Security > Screen Recording, enable "Capri" (or "Electron"), then quit and relaunch Capri. System audio listening may trigger a separate request.',
    canPromptDirectly: false,
  },
  automation: {
    id: 'automation',
    section: 'Section 13',
    nameFr: 'Automatisation & Apple Events',
    nameEn: 'Automation & Apple Events',
    descFr: 'Autorise les Apple Events, application par application. Capri en a besoin pour interroger System Events et certaines commandes de fermeture ou de contrôle ; lancer une application ne donne pas un accès universel.',
    descEn: 'Allows Apple Events on an app-by-app basis. Capri uses them to query System Events and for some close or control commands; launching an app does not grant universal access.',
    affectedFr: [
      'Fermeture d’applications à la demande',
      'Pilotage des fenêtres système via System Events',
      'Contrôle de lecture multimédia dans les applications compatibles'
    ],
    affectedEn: [
      'Graceful application closing upon user confirmation',
      'System window orchestration via System Events',
      'Media playback control in compatible apps'
    ],
    instructionsFr: 'Ouvrez Réglages Système > Confidentialité et sécurité > Automatisation, et vérifiez que « Capri » est autorisé pour les applications cibles (notamment « Événements système »).',
    instructionsEn: 'Open System Settings > Privacy & Security > Automation, and verify that "Capri" is authorized for target applications (specifically "System Events").',
    canPromptDirectly: false,
  },
};

function permissionErrorKind(error) {
  const message = String(error?.message || error || '');
  if (!/(-1743|-54|-25211|not permitted|not allowed)/i.test(message)) return null;
  return message.includes('-25211') ? 'accessibility' : 'automation';
}

function macPermissionsMenuItem(platform, label, click) {
  return platform === 'darwin' ? { label, click } : null;
}

function checkAccessibility({ systemPreferences, prompt = false, platform = process.platform } = {}) {
  if (platform !== 'darwin') {
    return { id: 'accessibility', status: 'unsupported', granted: false };
  }
  if (!systemPreferences || typeof systemPreferences.isTrustedAccessibilityClient !== 'function') {
    return { id: 'accessibility', status: 'unknown', granted: false };
  }
  try {
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(Boolean(prompt));
    return {
      id: 'accessibility',
      // Electron exposes only a trusted/not-trusted result; it cannot distinguish an
      // explicit denial from a permission that has never been granted.
      status: isTrusted ? 'granted' : 'action_required',
      granted: Boolean(isTrusted),
    };
  } catch (err) {
    return { id: 'accessibility', status: 'unknown', granted: false, error: err.message };
  }
}

function checkMicrophone({ systemPreferences, platform = process.platform } = {}) {
  if (platform !== 'darwin') {
    return { id: 'microphone', status: 'unsupported', granted: false };
  }
  if (!systemPreferences || typeof systemPreferences.getMediaAccessStatus !== 'function') {
    return { id: 'microphone', status: 'unknown', granted: false };
  }
  try {
    const raw = systemPreferences.getMediaAccessStatus('microphone');
    return {
      id: 'microphone',
      status: mediaPermissionStatus(raw),
      rawStatus: raw,
      granted: raw === 'granted',
    };
  } catch (err) {
    return { id: 'microphone', status: 'unknown', granted: false, error: err.message };
  }
}

function mediaPermissionStatus(raw) {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied' || raw === 'restricted') return 'denied';
  if (raw === 'not-determined') return 'action_required';
  return 'unknown';
}

function checkScreenRecording({ systemPreferences, platform = process.platform } = {}) {
  if (platform !== 'darwin') {
    return { id: 'screen', status: 'unsupported', granted: false };
  }
  if (!systemPreferences || typeof systemPreferences.getMediaAccessStatus !== 'function') {
    return { id: 'screen', status: 'unknown', granted: false };
  }
  try {
    const raw = systemPreferences.getMediaAccessStatus('screen');
    return {
      id: 'screen',
      status: mediaPermissionStatus(raw),
      rawStatus: raw,
      granted: raw === 'granted',
    };
  } catch (err) {
    return { id: 'screen', status: 'unknown', granted: false, error: err.message };
  }
}

async function checkAutomation({ targetApp = 'System Events', exec = cp.execFile, platform = process.platform, probe = false } = {}) {
  if (platform !== 'darwin') {
    return { id: 'automation', status: 'unsupported', granted: false };
  }
  // There is no public, passive TCC query for Apple Events. A probe can display
  // macOS's Automation prompt, so only run it after an explicit user action.
  if (!probe) return { id: 'automation', status: 'unknown', granted: false, targetApp, error: 'macOS does not expose Automation status without sending an Apple Event.' };
  const script = `tell application "${targetApp}" to get name of first process whose visible is true`;
  return new Promise((resolve) => {
    exec('osascript', ['-e', script], { timeout: 4000 }, (err, stdout) => {
      if (!err) {
        return resolve({
          id: 'automation',
          status: 'granted',
          granted: true,
          targetApp,
          details: String(stdout || '').trim(),
        });
      }
      const msg = String(err.message || '');
      // Error -1743 = errAEEventNotPermitted (TCC denied)
      // Error -54 = permission error
      if (msg.includes('-1743') || msg.toLowerCase().includes('not permitted') || msg.toLowerCase().includes('not allowed')) {
        return resolve({
          id: 'automation',
          status: 'denied',
          granted: false,
          targetApp,
          error: msg,
        });
      }
      return resolve({
        id: 'automation',
        status: 'action_required',
        granted: false,
        targetApp,
        error: msg,
      });
    });
  });
}

async function checkAllPermissions({ systemPreferences, prompt = false, exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') {
    return {
      platform,
      isMac: false,
      allGranted: false,
      grantedCount: 0,
      total: 4,
      permissions: {},
    };
  }

  const [accessibility, microphone, screen, automation] = await Promise.all([
    checkAccessibility({ systemPreferences, prompt, platform }),
    checkMicrophone({ systemPreferences, platform }),
    checkScreenRecording({ systemPreferences, platform }),
    checkAutomation({ exec, platform }),
  ]);

  const permissions = {
    accessibility: { ...PERMISSIONS_META.accessibility, ...accessibility },
    microphone: { ...PERMISSIONS_META.microphone, ...microphone },
    screen: { ...PERMISSIONS_META.screen, ...screen },
    automation: { ...PERMISSIONS_META.automation, ...automation },
  };

  const list = Object.values(permissions);
  const grantedCount = list.filter((p) => p.granted).length;

  return {
    platform,
    isMac: true,
    allGranted: grantedCount === list.length,
    grantedCount,
    total: list.length,
    permissions,
  };
}

async function openMacSettings(section, { shell, platform = process.platform } = {}) {
  if (platform !== 'darwin' || !shell) return false;
  const targetUrl = SETTINGS_URLS[section] || SETTINGS_URLS.security;
  try {
    await shell.openExternal(targetUrl);
    return true;
  } catch (err) {
    console.error('[capri-mac] could not open system settings:', err.message);
    return false;
  }
}

async function requestPermission(id, { systemPreferences, shell, exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return { ok: false, reason: 'unsupported' };

  if (id === 'accessibility') {
    if (systemPreferences?.isTrustedAccessibilityClient) {
      systemPreferences.isTrustedAccessibilityClient(true);
    }
    await openMacSettings('accessibility', { shell, platform });
    const settingsOpened = await openMacSettings('accessibility', { shell, platform });
    return { ok: true, id, status: checkAccessibility({ systemPreferences, platform }).status, settingsOpened };
  }

  if (id === 'microphone') {
    if (systemPreferences?.askForMediaAccess) {
      try {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        if (!granted) {
          const settingsOpened = await openMacSettings('microphone', { shell, platform });
          return { ok: true, id, granted, status: 'denied', settingsOpened };
        }
        return { ok: true, id, granted, status: 'granted' };
      } catch {
        await openMacSettings('microphone', { shell, platform });
        return { ok: true, id, status: checkMicrophone({ systemPreferences, platform }).status };
      }
    }
    await openMacSettings('microphone', { shell, platform });
    return { ok: true, id, status: checkMicrophone({ systemPreferences, platform }).status };
  }

  if (id === 'screen') {
    await openMacSettings('screen', { shell, platform });
    return { ok: true, id, status: checkScreenRecording({ systemPreferences, platform }).status };
  }

  if (id === 'automation') {
    const result = await checkAutomation({ exec, platform, probe: true });
    const settingsOpened = await openMacSettings('automation', { shell, platform });
    return { ok: true, id, status: result.status, settingsOpened, error: result.error };
  }

  return { ok: false, error: 'unknown permission id' };
}

// Window management operations for macOS
function listMacWindows({ exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return Promise.resolve({ ok: false, windows: [], reason: 'unsupported' });

  const script = `
tell application "System Events"
  set output to ""
  set procList to (every process whose visible is true and background only is false)
  repeat with p in procList
    set pName to name of p
    try
      set wList to (every window of p)
      repeat with w in wList
        try
          set wName to name of w
          set wPos to position of w
          set wSize to size of w
          set output to output & pName & ":::" & wName & ":::" & (item 1 of wPos) & ":::" & (item 2 of wPos) & ":::" & (item 1 of wSize) & ":::" & (item 2 of wSize) & "\\n"
        end try
      end repeat
    end try
  end repeat
  return output
end tell
`;

  return new Promise((resolve) => {
    exec('osascript', ['-e', script], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        const msg = String(err.message || '');
        const permissionNeeded = permissionErrorKind(err);
        const isPerm = Boolean(permissionNeeded);
        return resolve({
          ok: false,
          windows: [],
          error: isPerm ? 'Autorisez Capri pour Événements système dans Confidentialité et sécurité > Automatisation. Accessibilité peut aussi être nécessaire pour certaines opérations sur les fenêtres.' : msg,
          permissionNeeded,
        });
      }

      const lines = String(stdout || '').split('\n').filter(Boolean);
      const seenIds = new Map();
      const windows = lines.map((line, idx) => {
        const [app, title, x, y, w, h] = line.split(':::');
        const key = `${(app || 'Unknown').trim()}::${(title || '').trim()}`;
        const occurrence = seenIds.get(key) || 0;
        seenIds.set(key, occurrence + 1);
        return {
          id: `${key}::${occurrence}`,
          app: (app || 'Unknown').trim(),
          title: (title || '').trim(),
          x: parseInt(x, 10) || 0,
          y: parseInt(y, 10) || 0,
          w: parseInt(w, 10) || 0,
          h: parseInt(h, 10) || 0,
        };
      });

      return resolve({ ok: true, windows });
    });
  });
}

function moveMacWindow({ appName, windowIndex = 1, x = 100, y = 100, exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return Promise.resolve({ ok: false, reason: 'unsupported' });
  if (!appName) return Promise.resolve({ ok: false, error: 'appName required' });

  const safeApp = escapeAppleScriptString(appName);
  const safeIdx = Math.max(1, parseInt(windowIndex, 10) || 1);
  const safeX = Math.round(Number(x) || 0);
  const safeY = Math.round(Number(y) || 0);

  const script = `
tell application "System Events"
  tell application process "${safeApp}"
    set position of window ${safeIdx} to {${safeX}, ${safeY}}
  end tell
end tell
`;

  return new Promise((resolve) => {
    exec('osascript', ['-e', script], { timeout: 4000 }, (err) => {
      if (err) {
        const permissionNeeded = permissionErrorKind(err);
        return resolve({
          ok: false,
          error: permissionNeeded
            ? 'macOS a bloqué le déplacement. Vérifiez Automatisation (Capri vers Événements système) et Accessibilité dans Réglages Système.'
            : err.message,
          permissionNeeded,
          details: err.message,
        });
      }
      return resolve({ ok: true });
    });
  });
}

function focusMacWindow({ appName, exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return Promise.resolve({ ok: false, reason: 'unsupported' });
  if (!appName) return Promise.resolve({ ok: false, error: 'appName required' });

  const safeApp = escapeAppleScriptString(appName);
  const script = `tell application "${safeApp}" to activate`;

  return new Promise((resolve) => {
    exec('osascript', ['-e', script], { timeout: 3000 }, (err) => {
      if (err) return resolve({ ok: false, error: err.message });
      return resolve({ ok: true });
    });
  });
}

function escapeAppleScriptString(value) {
  return String(value).replace(/[\r\n\0]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function closeMacApp({ appName, force = false, exec = cp.execFile, platform = process.platform } = {}) {
  if (platform !== 'darwin') return Promise.resolve({ ok: false, reason: 'unsupported' });
  if (!appName) return Promise.resolve({ ok: false, error: 'appName required' });

  const safeApp = String(appName).replace(/"/g, '\\"');

  if (force) {
    return new Promise((resolve) => {
      exec('pkill', ['-9', '-f', safeApp], { timeout: 3000 }, (err) => {
        if (err) return resolve({ ok: false, error: err.message });
        return resolve({ ok: true });
      });
    });
  }

  const script = `tell application "${safeApp}" to quit`;
  return new Promise((resolve) => {
    exec('osascript', ['-e', script], { timeout: 4000 }, (err) => {
      if (err) return resolve({ ok: false, error: err.message });
      return resolve({ ok: true });
    });
  });
}

// Window controller for the MacOS Permissions panel
function createMacPermissionsWindow({
  BrowserWindow,
  ipcMain,
  shell,
  systemPreferences,
  screen,
  lang = () => 'fr',
  protocolUrl = 'capri://app/src/renderer/mac-permissions.html',
}) {
  let win = null;

  function assertPanelSender(event) {
    if (!win || win.isDestroyed() || event.sender !== win.webContents || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Unauthorized macOS permissions IPC sender');
    }
  }

  async function getFullState() {
    const check = await checkAllPermissions({ systemPreferences });
    const currentLang = typeof lang === 'function' ? lang() : lang;
    return {
      ...check,
      lang: currentLang,
    };
  }

  function show() {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      return win;
    }

    win = new BrowserWindow({
      width: 720,
      height: 780,
      minWidth: 540,
      minHeight: 520,
      maxWidth: 1200,
      maxHeight: 1100,
      show: false,
      frame: false,
      title: 'Capri // MacOS Permissions',
      backgroundColor: '#090b12',
      resizable: true,
      movable: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'mac-permissions-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    win.removeMenu?.();
    win.loadURL(protocolUrl);
    win.once('ready-to-show', () => win?.show());
    win.on('focus', () => {
      // Returning from System Settings is a common way permissions change.
      if (win && !win.isDestroyed()) getFullState().then((state) => win?.webContents.send('macPermissions:statusChange', state));
    });
    win.on('closed', () => { win = null; });
    return win;
  }

  function registerIpc() {
    ipcMain.handle('macPermissions:getStatus', async (event) => {
      assertPanelSender(event);
      return getFullState();
    });

    ipcMain.handle('macPermissions:request', async (event, id) => {
      assertPanelSender(event);
      if (!Object.hasOwn(PERMISSIONS_META, id)) return { ok: false, error: 'unknown permission id' };
    const res = await requestPermission(id, { systemPreferences, shell });
      const state = await getFullState();
    if (id === 'automation' && res.status) {
      state.permissions.automation.status = res.status;
      state.permissions.automation.granted = res.status === 'granted';
      state.permissions.automation.probeTarget = 'System Events';
      state.permissions.automation.error = res.error || '';
    }
      win?.webContents.send('macPermissions:statusChange', state);
      return res;
    });

    ipcMain.handle('macPermissions:openSettings', async (event, section) => {
      assertPanelSender(event);
      if (!Object.hasOwn(SETTINGS_URLS, section)) return false;
      return openMacSettings(section, { shell });
    });

    ipcMain.handle('macPermissions:listWindows', async (event) => {
      assertPanelSender(event);
      return listMacWindows();
    });
    ipcMain.handle('macPermissions:focusWindow', async (event, appName) => {
      assertPanelSender(event);
      if (typeof appName !== 'string' || appName.length > 200) return { ok: false, error: 'invalid application name' };
      return focusMacWindow({ appName });
    });
    ipcMain.handle('macPermissions:moveWindow', async (event, params) => {
      assertPanelSender(event);
      if (!params || typeof params.appName !== 'string' || params.appName.length > 200) return { ok: false, error: 'invalid window request' };
      return moveMacWindow(params);
    });

    ipcMain.on('macPermissions:close', (event) => {
      if (!win || win.isDestroyed() || event.sender !== win.webContents || event.senderFrame !== event.sender.mainFrame) return;
      if (win && !win.isDestroyed()) win.close();
    });
  }

  registerIpc();

  return {
    show,
    isOpen: () => Boolean(win && !win.isDestroyed()),
    checkAll: () => checkAllPermissions({ systemPreferences }),
    close: () => { if (win && !win.isDestroyed()) win.close(); },
  };
}

module.exports = {
  SETTINGS_URLS,
  PERMISSIONS_META,
  macPermissionsMenuItem,
  checkAccessibility,
  checkMicrophone,
  checkScreenRecording,
  checkAutomation,
  checkAllPermissions,
  openMacSettings,
  requestPermission,
  listMacWindows,
  moveMacWindow,
  focusMacWindow,
  closeMacApp,
  createMacPermissionsWindow,
};


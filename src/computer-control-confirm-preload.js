'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('computerConfirm', Object.freeze({
  approve: (id) => ipcRenderer.invoke('computer-control:confirm-click', String(id || '')),
  refuse: (id) => ipcRenderer.invoke('computer-control:reject-click', String(id || '')),
  onPrompt: (callback) => {
    const listener = (_event, value) => callback({
      id: String(value?.id || ''),
      action: String(value?.action || '').slice(0, 120),
      expiresAt: Number(value?.expiresAt) || 0,
    });
    ipcRenderer.on('computer-control:confirmation', listener);
    return () => ipcRenderer.removeListener('computer-control:confirmation', listener);
  },
}));

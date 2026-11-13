'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dataTools', Object.freeze({
  inventory: () => ipcRenderer.invoke('data-tools:inventory'),
  chooseVault: () => ipcRenderer.invoke('data-tools:choose-vault'),
  importMarkdown: (names) => ipcRenderer.invoke('data-tools:import', { names: Array.isArray(names) ? names : [] }),
  exportMarkdown: (selected) => ipcRenderer.invoke('data-tools:export', Array.isArray(selected) ? selected : []),
  clearCategory: (category) => ipcRenderer.invoke('data-tools:clear-category', String(category || '')),
  deleteEntry: (category, id) => ipcRenderer.invoke('data-tools:delete-entry', String(category || ''), String(id || '')),
  setRetention: (days) => ipcRenderer.invoke('data-tools:set-retention', Number(days)),
  purgeAll: () => ipcRenderer.invoke('data-tools:purge-all'),
}));

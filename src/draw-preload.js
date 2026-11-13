'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('drawBoard', Object.freeze({
  load: () => ipcRenderer.invoke('drawing:load'), autosave: (drawing) => ipcRenderer.invoke('drawing:autosave', drawing),
  open: () => ipcRenderer.invoke('drawing:open'), save: (drawing) => ipcRenderer.invoke('drawing:save', drawing),
  exportPng: (data) => ipcRenderer.invoke('drawing:export-png', data),
  onFlush: (callback) => { const listener=()=>callback();ipcRenderer.on('drawing:flush',listener);return()=>ipcRenderer.removeListener('drawing:flush',listener); },
  flushComplete: () => ipcRenderer.send('drawing:flush-complete'),
}));

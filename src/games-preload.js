'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gameWindow', Object.freeze({
  close: () => ipcRenderer.invoke('games:close'),
  react: (reaction) => ipcRenderer.invoke('games:reaction', String(reaction || '')),
}));

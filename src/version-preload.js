'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versionPage', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  check: () => ipcRenderer.invoke('version:check'),
  openRepository: () => ipcRenderer.invoke('version:openRepository'),
  close: () => ipcRenderer.invoke('version:close'),
});

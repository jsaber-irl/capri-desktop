'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versionPage', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  state: () => ipcRenderer.invoke('version:state'),
  check: () => ipcRenderer.invoke('version:check'),
  download: () => ipcRenderer.invoke('version:download'),
  setMode: (mode) => ipcRenderer.invoke('version:setMode', mode),
  install: () => ipcRenderer.invoke('version:install'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('version:state', listener);
    return () => ipcRenderer.removeListener('version:state', listener);
  },
  openRepository: () => ipcRenderer.invoke('version:openRepository'),
  close: () => ipcRenderer.invoke('version:close'),
});

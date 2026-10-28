'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminal', {
  execute: (command) => ipcRenderer.invoke('terminal:execute', String(command || '')),
  version: () => ipcRenderer.invoke('app:version'),
  close: () => ipcRenderer.send('terminal:close'),
  toggleCompact: (target) => ipcRenderer.send('terminal:compact', target),
  isCompact: () => ipcRenderer.invoke('terminal:isCompact'),
  onState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('terminal:state', handler);
    return () => ipcRenderer.removeListener('terminal:state', handler);
  },
  bounds: (bounds) => ipcRenderer.send('terminal:bounds', bounds),
  onDemoLog: (callback) => {
    const handler = (_event, message) => callback(String(message || ''));
    ipcRenderer.on('terminal:demoLog', handler);
    return () => ipcRenderer.removeListener('terminal:demoLog', handler);
  },
});

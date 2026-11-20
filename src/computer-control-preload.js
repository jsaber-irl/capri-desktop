'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('computerControl', Object.freeze({
  status: () => ipcRenderer.invoke('computer-control:status'),
  snapshot: () => ipcRenderer.invoke('computer-control:snapshot'),
  proposeClick: (instruction) => ipcRenderer.invoke('computer-control:propose-click', String(instruction || '').slice(0, 300)),
  confirmClick: (id) => ipcRenderer.invoke('computer-control:confirm-click', String(id || '')),
  click: (point) => ipcRenderer.invoke('computer-control:click', point),
}));

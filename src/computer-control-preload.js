'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const on = (channel) => (callback) => { const listener = (_event, value) => callback(value); ipcRenderer.on(channel, listener); return () => ipcRenderer.removeListener(channel, listener); };
contextBridge.exposeInMainWorld('computerControl', Object.freeze({
  status: () => ipcRenderer.invoke('computer-control:status'),
  resize: (expanded) => ipcRenderer.invoke('computer-control:resize', Boolean(expanded)),
  snapshot: () => ipcRenderer.invoke('computer-control:snapshot'),
  proposeClick: (instruction) => ipcRenderer.invoke('computer-control:propose-click', String(instruction || '').slice(0, 300)),
  confirmClick: (id) => ipcRenderer.invoke('computer-control:confirm-click', String(id || '')),
  cancel: () => ipcRenderer.invoke('computer-control:cancel'),
  click: (point) => ipcRenderer.invoke('computer-control:click', point),
  onTask: on('computer-control:task'),
  onDecision: on('computer-control:decision'),
  onRefresh: on('computer-control:refresh'),
}));

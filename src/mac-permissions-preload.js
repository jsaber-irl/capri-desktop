'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macPermissions', {
  getStatus: () => ipcRenderer.invoke('macPermissions:getStatus'),
  request: (id) => ipcRenderer.invoke('macPermissions:request', id),
  openSettings: (section) => ipcRenderer.invoke('macPermissions:openSettings', section),
  listWindows: () => ipcRenderer.invoke('macPermissions:listWindows'),
  focusWindow: (appName) => ipcRenderer.invoke('macPermissions:focusWindow', appName),
  moveWindow: (params) => ipcRenderer.invoke('macPermissions:moveWindow', params),
  close: () => ipcRenderer.send('macPermissions:close'),
  onStatusChange: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('macPermissions:statusChange', handler);
    return () => ipcRenderer.removeListener('macPermissions:statusChange', handler);
  },
});


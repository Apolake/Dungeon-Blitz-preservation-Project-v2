// Brücke zwischen Updater-Seite (updater.html) und Hauptprozess (main.js), ohne Node im Renderer.
const { contextBridge, ipcRenderer } = require('electron');

let handler = null;
let last = null; // letztes Ereignis, falls die Seite sich erst danach anmeldet
ipcRenderer.on('updater:event', (_e, ev) => {
  last = ev;
  if (handler) handler(ev);
});

contextBridge.exposeInMainWorld('updater', {
  onEvent(cb) {
    handler = cb;
    if (last) cb(last);
  },
  retry: () => ipcRenderer.send('updater:retry'),
  playOffline: () => ipcRenderer.send('updater:offline'),
  quit: () => ipcRenderer.send('updater:quit'),
  repair: () => ipcRenderer.send('updater:repair'),
  openLog: () => ipcRenderer.send('updater:log'),
});

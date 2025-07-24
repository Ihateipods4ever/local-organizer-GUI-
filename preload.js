const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  organizeFolder: (folderPath) => ipcRenderer.invoke('organize-folder', folderPath),
  findDuplicates: (folderPath) => ipcRenderer.invoke('find-duplicates', folderPath),
  deleteEmptyFolders: (folderPath) => ipcRenderer.invoke('delete-empty', folderPath),
  undoAll: (moves) => ipcRenderer.invoke('undo-all', moves),
  // We can also expose listeners for events from the main process
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
});


const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { organize, findDuplicates, deleteEmptyFolders, undoMoves } = require('./organizer-logic');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // Uncomment to see developer tools
}

app.whenReady().then(() => {
  // Expose a function to select a folder
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) return null;
    return filePaths[0];
  });

  // Expose the core logic
  ipcMain.handle('organize-folder', (event, folderPath) => organize(folderPath));
  ipcMain.handle('find-duplicates', (event, folderPath) => findDuplicates(folderPath));
  ipcMain.handle('delete-empty', (event, folderPath) => deleteEmptyFolders(folderPath));
  ipcMain.handle('undo-all', (event, moves) => undoMoves(moves));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


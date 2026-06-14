import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { registerFileHandlers } from './ipc/file';
import { registerDialogHandlers } from './ipc/dialog';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: '面试准备工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC handlers
function registerIpcHandlers(): void {
  // App info
  ipcMain.handle('app:dataDir', () => {
    return path.join(app.getPath('userData'), 'data');
  });

  // File handlers
  registerFileHandlers();

  // Dialog handlers
  registerDialogHandlers();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

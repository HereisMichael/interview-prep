import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  readDir: (dirPath: string) => ipcRenderer.invoke('file:readdir', dirPath),
  mkdir: (dirPath: string) => ipcRenderer.invoke('file:mkdir', dirPath),
  exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),

  // Dialog
  showOpenDialog: (options: { filters?: { name: string; extensions: string[] }[]; properties?: string[] }) =>
    ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:save', options),

  // App
  getDataDir: () => ipcRenderer.invoke('app:dataDir'),

  // Environment detection
  isElectron: true,
});

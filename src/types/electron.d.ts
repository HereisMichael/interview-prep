/**
 * Electron API 类型声明
 *
 * 通过 preload 脚本暴露到渲染进程的 API
 */

interface ElectronDirEntry {
  name: string;
  isDirectory: boolean;
}

interface ElectronAPI {
  // File operations
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  readDir: (dirPath: string) => Promise<ElectronDirEntry[]>;
  mkdir: (dirPath: string) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<void>;

  // Dialog
  showOpenDialog: (options: {
    filters?: { name: string; extensions: string[] }[];
    properties?: string[];
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<{ canceled: boolean; filePath: string | undefined }>;

  // App
  getDataDir: () => Promise<string>;

  // Environment detection
  isElectron: true;
}

interface Window {
  electronAPI?: ElectronAPI;
}

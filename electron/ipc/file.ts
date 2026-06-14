import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export function registerFileHandlers(): void {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return data;
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  });

  ipcMain.handle('file:write', async (_event, filePath: string, data: string) => {
    try {
      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, data, 'utf-8');
    } catch (err: any) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  });

  ipcMain.handle('file:readdir', async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw new Error(`Failed to read directory: ${err.message}`);
    }
  });

  ipcMain.handle('file:mkdir', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err: any) {
      throw new Error(`Failed to create directory: ${err.message}`);
    }
  });

  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  });
}

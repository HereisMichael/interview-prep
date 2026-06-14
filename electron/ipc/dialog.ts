import { ipcMain, dialog } from 'electron';

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:open', async (_event, options: {
    filters?: { name: string; extensions: string[] }[];
    properties?: string[];
  }) => {
    const result = await dialog.showOpenDialog({
      filters: options.filters,
      properties: (options.properties as any[]) || ['openFile'],
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  });

  ipcMain.handle('dialog:save', async (_event, options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => {
    const result = await dialog.showSaveDialog({
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePath,
    };
  });
}

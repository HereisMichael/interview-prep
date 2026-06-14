import type { IStorageAdapter } from './IStorageAdapter';
import type { SearchQuery, SearchResult } from '../models/common';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { LocalFileAdapter } from './LocalFileAdapter';

export type StorageType = 'indexeddb' | 'localfile' | 'feishu';

class StorageManager {
  private adapter: IStorageAdapter | null = null;
  private storageType: StorageType = 'indexeddb';
  private dataDir: string = '';

  async initialize(type?: StorageType): Promise<void> {
    // Auto-detect environment if not specified
    if (!type) {
      if (window.electronAPI?.isElectron) {
        type = 'localfile';
        this.dataDir = await window.electronAPI.getDataDir();
      } else {
        type = 'indexeddb';
      }
    }

    this.storageType = type;
    switch (type) {
      case 'localfile':
        if (!this.dataDir && window.electronAPI) {
          this.dataDir = await window.electronAPI.getDataDir();
        }
        this.adapter = new LocalFileAdapter(this.dataDir);
        break;
      case 'indexeddb':
      default:
        this.adapter = new IndexedDBAdapter();
        break;
    }
    await this.adapter.initialize();
  }

  getAdapter(): IStorageAdapter {
    if (!this.adapter) throw new Error('Storage not initialized');
    return this.adapter;
  }

  getType(): StorageType {
    return this.storageType;
  }

  getDataDir(): string {
    return this.dataDir;
  }

  /** 切换存储类型 (保留供设置页使用) */
  async switchStorage(type: StorageType, dataDir?: string): Promise<void> {
    // Export current data
    const currentData = this.adapter ? await this.adapter.exportData() : null;

    // Destroy current adapter
    await this.destroy();

    // Initialize new adapter
    if (dataDir) this.dataDir = dataDir;
    await this.initialize(type);

    // Import data to new storage
    if (currentData && this.adapter) {
      await this.adapter.importData(currentData);
    }
  }

  async destroy(): Promise<void> {
    await this.adapter?.destroy();
    this.adapter = null;
  }
}

export const storageManager = new StorageManager();
export type { IStorageAdapter, SearchQuery, SearchResult };

import type { IStorageAdapter } from './IStorageAdapter';
import type { SearchQuery, SearchResult } from '../models/common';

const COLLECTIONS = ['questions', 'sessions', 'reviews', 'plans', 'settings'];

/**
 * 本地文件存储适配器
 *
 * 通过 Electron IPC 调用主进程的 fs 模块实现文件读写。
 * 数据目录结构:
 *   ~/InterviewPrep/data/
 *   ├── questions/
 *   │   ├── index.json       # [{id, title, category, updatedAt}]
 *   │   └── {id}.json
 *   ├── sessions/
 *   │   ├── index.json
 *   │   └── {id}.json
 *   ├── reviews/
 *   │   ├── index.json
 *   │   └── {id}.json
 *   ├── plans/
 *   │   ├── index.json
 *   │   └── {id}.json
 *   └── config.json
 */
export class LocalFileAdapter implements IStorageAdapter {
  private dataDir: string;
  private api: NonNullable<typeof window.electronAPI>;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!window.electronAPI) {
      throw new Error('LocalFileAdapter requires Electron environment');
    }
    this.api = window.electronAPI;
  }

  async initialize(): Promise<void> {
    // Ensure all collection directories exist
    for (const col of COLLECTIONS) {
      await this.api.mkdir(`${this.dataDir}/${col}`);
    }
  }

  async destroy(): Promise<void> {
    // No-op for file storage
  }

  private colDir(collection: string): string {
    return `${this.dataDir}/${collection}`;
  }

  private indexPath(collection: string): string {
    return `${this.colDir(collection)}/index.json`;
  }

  private itemPath(collection: string, id: string): string {
    return `${this.colDir(collection)}/${id}.json`;
  }

  private async readIndex<T>(collection: string): Promise<T[]> {
    const exists = await this.api.exists(this.indexPath(collection));
    if (!exists) return [];
    const raw = await this.api.readFile(this.indexPath(collection));
    return JSON.parse(raw);
  }

  private async writeIndex<T>(collection: string, index: T[]): Promise<void> {
    await this.api.writeFile(this.indexPath(collection), JSON.stringify(index, null, 2));
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const index = await this.readIndex<any>(collection);
    // For getAll, read full items
    const items: T[] = [];
    for (const entry of index) {
      const filePath = this.itemPath(collection, entry.id);
      const exists = await this.api.exists(filePath);
      if (exists) {
        const raw = await this.api.readFile(filePath);
        items.push(JSON.parse(raw));
      }
    }
    return items;
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const filePath = this.itemPath(collection, id);
    const exists = await this.api.exists(filePath);
    if (!exists) return null;
    const raw = await this.api.readFile(filePath);
    return JSON.parse(raw);
  }

  async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
    // Write full item
    await this.api.writeFile(this.itemPath(collection, item.id), JSON.stringify(item, null, 2));

    // Update index (add lightweight entry)
    const index = await this.readIndex<any>(collection);
    const indexEntry = this.toIndexEntry(collection, item);
    index.push(indexEntry);
    await this.writeIndex(collection, index);

    return item;
  }

  async update<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
    // Read existing item
    const existing = await this.getById<any>(collection, id);
    if (!existing) throw new Error(`Item not found: ${collection}/${id}`);

    const updated = { ...existing, ...patch };
    await this.api.writeFile(this.itemPath(collection, id), JSON.stringify(updated, null, 2));

    // Update index entry
    const index = await this.readIndex<any>(collection);
    const idx = index.findIndex((e: any) => e.id === id);
    if (idx >= 0) {
      index[idx] = { ...index[idx], ...this.toIndexEntry(collection, updated) };
      await this.writeIndex(collection, index);
    }

    return updated;
  }

  async delete(collection: string, id: string): Promise<void> {
    // Delete item file
    const filePath = this.itemPath(collection, id);
    const exists = await this.api.exists(filePath);
    if (exists) {
      await this.api.deleteFile(filePath);
    }

    // Remove from index
    const index = await this.readIndex<any>(collection);
    const filtered = index.filter((e: any) => e.id !== id);
    await this.writeIndex(collection, filtered);
  }

  async batchCreate<T extends { id: string }>(collection: string, items: T[]): Promise<T[]> {
    const index = await this.readIndex<any>(collection);

    for (const item of items) {
      await this.api.writeFile(this.itemPath(collection, item.id), JSON.stringify(item, null, 2));
      index.push(this.toIndexEntry(collection, item));
    }

    await this.writeIndex(collection, index);
    return items;
  }

  async search<T>(collection: string, query: SearchQuery): Promise<SearchResult<T>> {
    // Load full items for search
    const allItems = await this.getAll<T & { id: string; title?: string; content?: string; name?: string }>(collection);

    let filtered = allItems;

    // Keyword search
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter((item) => {
        const text = `${item.title || ''} ${item.content || ''} ${item.name || ''}`.toLowerCase();
        return text.includes(kw);
      });
    }

    // Filter by properties
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        filtered = filtered.filter((item: any) => {
          const itemValue = item[key];
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }
          return itemValue === value;
        });
      }
    }

    // Sort
    if (query.sort) {
      const { field, order } = query.sort;
      filtered.sort((a: any, b: any) => {
        const va = a[field];
        const vb = b[field];
        if (va < vb) return order === 'asc' ? -1 : 1;
        if (va > vb) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = filtered.length;
    const page = query.pagination?.page || 1;
    const pageSize = query.pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  async exportData(): Promise<string> {
    const data: Record<string, any[]> = {};
    for (const col of COLLECTIONS) {
      data[col] = await this.getAll(col);
    }
    return JSON.stringify(data, null, 2);
  }

  async importData(json: string): Promise<void> {
    const data = JSON.parse(json);
    for (const col of COLLECTIONS) {
      if (data[col] && Array.isArray(data[col])) {
        // Clear existing index
        await this.writeIndex(col, []);
        // Batch create all items
        await this.batchCreate(col, data[col]);
      }
    }
  }

  /** 生成轻量索引条目 */
  private toIndexEntry(collection: string, item: any): any {
    const base = { id: item.id, updatedAt: item.updatedAt || item.createdAt };
    switch (collection) {
      case 'questions':
        return { ...base, title: item.title, category: item.category, difficulty: item.difficulty };
      case 'sessions':
        return { ...base, status: item.status, startedAt: item.startedAt, type: item.type };
      case 'reviews':
        return { ...base, questionId: item.questionId, reviewStatus: item.reviewStatus };
      case 'plans':
        return { ...base, name: item.name, status: item.status, targetDate: item.targetDate };
      default:
        return base;
    }
  }
}

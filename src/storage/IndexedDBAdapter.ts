import { openDB, type IDBPDatabase } from 'idb';
import type { IStorageAdapter } from './IStorageAdapter';
import type { SearchQuery, SearchResult } from '../models/common';

const DB_NAME = 'interview-prep-db';
const DB_VERSION = 1;
const COLLECTIONS = ['questions', 'sessions', 'reviews', 'plans', 'settings'];

export class IndexedDBAdapter implements IStorageAdapter {
  private db: IDBPDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of COLLECTIONS) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      },
    });
  }

  async destroy(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private getDB(): IDBPDatabase {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    return this.db;
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const db = this.getDB();
    return db.getAll(collection) as Promise<T[]>;
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const db = this.getDB();
    const result = await db.get(collection, id);
    return (result as T) ?? null;
  }

  async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
    const db = this.getDB();
    await db.put(collection, item);
    return item;
  }

  async update<T>(collection: string, id: string, patch: Partial<T>): Promise<T> {
    const db = this.getDB();
    const existing = await db.get(collection, id);
    if (!existing) throw new Error(`Item ${id} not found in ${collection}`);
    const updated = { ...existing, ...patch };
    await db.put(collection, updated);
    return updated as T;
  }

  async delete(collection: string, id: string): Promise<void> {
    const db = this.getDB();
    await db.delete(collection, id);
  }

  async batchCreate<T extends { id: string }>(collection: string, items: T[]): Promise<T[]> {
    const db = this.getDB();
    const tx = db.transaction(collection, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
    return items;
  }

  async search<T>(collection: string, query: SearchQuery): Promise<SearchResult<T>> {
    const all = await this.getAll<T>(collection);
    let filtered = [...all];

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter((item: unknown) => {
        const obj = item as Record<string, unknown>;
        return (
          String(obj['title'] ?? '').toLowerCase().includes(kw) ||
          String(obj['content'] ?? '').toLowerCase().includes(kw) ||
          String(obj['name'] ?? '').toLowerCase().includes(kw)
        );
      });
    }

    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if (!value) continue;
        filtered = filtered.filter((item: unknown) => {
          const obj = item as Record<string, unknown>;
          if (Array.isArray(value)) {
            return value.some((v) => {
              const itemVal = obj[key];
              if (Array.isArray(itemVal)) {
                return itemVal.some((iv: unknown) =>
                  typeof iv === 'object' && iv !== null && 'value' in iv
                    ? (iv as { value: string }).value === v
                    : iv === v
                );
              }
              return String(itemVal) === v;
            });
          }
          return String(obj[key]) === value;
        });
      }
    }

    if (query.sort) {
      const { field, order } = query.sort;
      filtered.sort((a: unknown, b: unknown) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];
        const cmp = String(aVal).localeCompare(String(bVal));
        return order === 'desc' ? -cmp : cmp;
      });
    }

    const page = query.pagination?.page ?? 1;
    const pageSize = query.pagination?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total: filtered.length, page, pageSize };
  }

  async exportData(): Promise<string> {
    const data: Record<string, unknown[]> = {};
    for (const name of COLLECTIONS) {
      data[name] = await this.getAll(name);
    }
    return JSON.stringify(data, null, 2);
  }

  async importData(json: string): Promise<void> {
    const data = JSON.parse(json) as Record<string, unknown[]>;
    for (const name of COLLECTIONS) {
      if (data[name] && Array.isArray(data[name])) {
        const items = data[name] as { id: string }[];
        await this.batchCreate(name, items);
      }
    }
  }
}

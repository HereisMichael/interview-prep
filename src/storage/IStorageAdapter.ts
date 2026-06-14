import type { SearchQuery, SearchResult } from '../models/common';

export interface IStorageAdapter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  getAll<T>(collection: string): Promise<T[]>;
  getById<T>(collection: string, id: string): Promise<T | null>;
  create<T extends { id: string }>(collection: string, item: T): Promise<T>;
  update<T>(collection: string, id: string, patch: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
  batchCreate<T extends { id: string }>(collection: string, items: T[]): Promise<T[]>;

  search<T>(collection: string, query: SearchQuery): Promise<SearchResult<T>>;

  exportData(): Promise<string>;
  importData(json: string): Promise<void>;
}

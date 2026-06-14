export interface SearchQuery {
  keyword?: string;
  filters?: Record<string, string | string[]>;
  sort?: { field: string; order: 'asc' | 'desc' };
  pagination?: { page: number; pageSize: number };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AIConfig {
  provider: 'openai' | 'dashscope' | 'deepseek' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 30000,
};

export const AI_PRESETS: Record<string, Omit<AIConfig, 'apiKey'>> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 30000,
  },
  dashscope: {
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 30000,
  },
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 30000,
  },
};

import { create } from 'zustand';
import type { AIConfig } from '../models/common';
import { DEFAULT_AI_CONFIG, AI_PRESETS } from '../models/common';

interface SettingsState {
  aiConfig: AIConfig;
  dataDir: string;
  feishuConfig: {
    appId: string;
    appSecret: string;
    appToken: string;
    enabled: boolean;
  };
  setAIConfig: (config: Partial<AIConfig>) => void;
  applyPreset: (preset: string) => void;
  setDataDir: (dir: string) => void;
  setFeishuConfig: (config: Partial<SettingsState['feishuConfig']>) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const STORAGE_KEY = 'interview-prep-settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  aiConfig: DEFAULT_AI_CONFIG,
  dataDir: '',
  feishuConfig: {
    appId: '',
    appSecret: '',
    appToken: '',
    enabled: false,
  },

  setAIConfig: (config) => {
    set((state) => ({
      aiConfig: { ...state.aiConfig, ...config },
    }));
    get().saveSettings();
  },

  applyPreset: (preset) => {
    const presetConfig = AI_PRESETS[preset];
    if (presetConfig) {
      set((state) => ({
        aiConfig: { ...state.aiConfig, ...presetConfig },
      }));
      get().saveSettings();
    }
  },

  setDataDir: (dir) => {
    set({ dataDir: dir });
    get().saveSettings();
  },

  setFeishuConfig: (config) => {
    set((state) => ({
      feishuConfig: { ...state.feishuConfig, ...config },
    }));
    get().saveSettings();
  },

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          aiConfig: { ...DEFAULT_AI_CONFIG, ...parsed.aiConfig },
          dataDir: parsed.dataDir ?? '',
          feishuConfig: { ...get().feishuConfig, ...parsed.feishuConfig },
        });
      }
    } catch {
      // ignore
    }
  },

  saveSettings: () => {
    const { aiConfig, dataDir, feishuConfig } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ aiConfig, dataDir, feishuConfig }));
  },
}));

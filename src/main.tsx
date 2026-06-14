import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css';
import App from './App';
import { storageManager } from './storage/StorageManager';
import { getSeedQuestions } from './services/SeedDataService';
import { useQuestionStore } from './stores/useQuestionStore';
import { useSettingsStore } from './stores/useSettingsStore';

async function bootstrap() {
  // Initialize storage
  await storageManager.initialize('indexeddb');

  // Load settings
  useSettingsStore.getState().loadSettings();

  // Check if we need to seed the question bank
  const existingQuestions = await storageManager.getAdapter().getAll('questions');
  if (existingQuestions.length === 0) {
    const seeds = getSeedQuestions();
    const now = new Date().toISOString();
    const questions = seeds.map((s, i) => ({
      ...s,
      id: `seed-${i}-${Date.now()}`,
      stats: { timesAttempted: 0, timesCorrect: 0, averageScore: 0 },
      createdAt: now,
      updatedAt: now,
    }));
    await storageManager.getAdapter().batchCreate('questions', questions);
  }
}

bootstrap().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
        <App />
      </ConfigProvider>
    </StrictMode>
  );
});

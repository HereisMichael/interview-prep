import { create } from 'zustand';
import type { ReviewItem, ReviewStatus } from '../models/review';
import type { QuestionScore } from '../models/interview';
import { storageManager } from '../storage/StorageManager';
import { generateId } from '../utils/id';
import { PASS_SCORE } from '../constants/defaults';
import { calculateSM2, getInitialSM2State } from '../utils/sm2';
import { addDays } from '../utils/date';

interface ReviewState {
  items: ReviewItem[];
  loading: boolean;

  fetchReviews: () => Promise<void>;
  addReview: (questionId: string, sessionId: string, userAnswer: string, aiScore: QuestionScore, weaknessTags: string[]) => Promise<ReviewItem>;
  updateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  updateNote: (id: string, note: string) => Promise<void>;
  completeReview: (id: string, score: number) => Promise<void>;
  getTodayReviews: () => ReviewItem[];
  getWeaknessSummary: () => Record<string, { count: number; avgScore: number }>;
  deleteReview: (id: string) => Promise<void>;
}

/** 为旧数据补齐 SM-2 字段 (向后兼容) */
function migrateSM2Fields(item: ReviewItem): ReviewItem {
  if (item.ef == null) item.ef = 2.5;
  if (item.interval == null) item.interval = 1;
  if (item.repetitions == null) item.repetitions = item.reviewCount || 0;
  return item;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  items: [],
  loading: false,

  fetchReviews: async () => {
    set({ loading: true });
    try {
      const adapter = storageManager.getAdapter();
      const raw = await adapter.getAll<ReviewItem>('reviews');
      const items = raw.map(migrateSM2Fields);
      set({ items, loading: false });
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      set({ loading: false });
    }
  },

  addReview: async (questionId, sessionId, userAnswer, aiScore, weaknessTags) => {
    const adapter = storageManager.getAdapter();
    const existing = get().items.find(
      (item) => item.questionId === questionId && item.reviewStatus !== 'mastered'
    );

    if (existing) {
      const updated = {
        ...existing,
        userAnswer,
        aiScore,
        weaknessTags,
        reviewStatus: 'reviewing' as ReviewStatus,
      };
      await adapter.update('reviews', existing.id, updated);
      set((state) => ({
        items: state.items.map((i) => (i.id === existing.id ? updated : i)),
      }));
      return updated;
    }

    const sm2 = getInitialSM2State();
    const item: ReviewItem = {
      id: generateId(),
      questionId,
      sessionId,
      userAnswer,
      aiScore,
      reviewStatus: aiScore.totalScore < PASS_SCORE ? 'unreviewed' : 'mastered',
      reviewCount: 0,
      nextReviewAt: addDays(new Date(), 1), // 首次复习为明天
      weaknessTags,
      createdAt: new Date().toISOString(),
      ...sm2,
    };

    await adapter.create('reviews', item);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  updateReviewStatus: async (id, status) => {
    const adapter = storageManager.getAdapter();
    await adapter.update('reviews', id, { reviewStatus: status });
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, reviewStatus: status } : i)),
    }));
  },

  updateNote: async (id, note) => {
    const adapter = storageManager.getAdapter();
    await adapter.update('reviews', id, { userNote: note });
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, userNote: note } : i)),
    }));
  },

  completeReview: async (id, score) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    // 使用完整 SM-2 算法计算下一次复习时间
    const result = calculateSM2({
      ef: item.ef ?? 2.5,
      interval: item.interval ?? 1,
      repetitions: item.repetitions ?? 0,
      score,
      passingScore: PASS_SCORE,
    });

    const update: Partial<ReviewItem> = {
      reviewCount: item.reviewCount + 1,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: result.nextReviewAt,
      reviewStatus: result.status,
      ef: result.ef,
      interval: result.interval,
      repetitions: result.repetitions,
    };

    const adapter = storageManager.getAdapter();
    await adapter.update('reviews', id, update);
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...update } : i)),
    }));
  },

  getTodayReviews: () => {
    const now = new Date();
    return get().items.filter(
      (item) =>
        item.reviewStatus !== 'mastered' &&
        item.nextReviewAt &&
        new Date(item.nextReviewAt) <= now
    );
  },

  getWeaknessSummary: () => {
    const items = get().items.filter((i) => i.reviewStatus !== 'mastered');
    const summary: Record<string, { count: number; avgScore: number }> = {};

    for (const item of items) {
      for (const tag of item.weaknessTags) {
        if (!summary[tag]) summary[tag] = { count: 0, avgScore: 0 };
        summary[tag].count += 1;
        summary[tag].avgScore =
          (summary[tag].avgScore * (summary[tag].count - 1) + item.aiScore.totalScore) /
          summary[tag].count;
      }
    }

    return summary;
  },

  deleteReview: async (id) => {
    const adapter = storageManager.getAdapter();
    await adapter.delete('reviews', id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },
}));

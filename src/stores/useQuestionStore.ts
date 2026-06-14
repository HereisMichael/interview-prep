import { create } from 'zustand';
import type { Question, QuestionCategory, Difficulty } from '../models/question';
import type { SearchQuery } from '../models/common';
import { storageManager } from '../storage/StorageManager';
import { generateId } from '../utils/id';

interface QuestionState {
  questions: Question[];
  loading: boolean;
  searchKeyword: string;
  filters: {
    category?: QuestionCategory;
    difficulty?: Difficulty;
    tagValues?: string[];
  };

  fetchQuestions: () => Promise<void>;
  addQuestion: (q: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Promise<Question>;
  updateQuestion: (id: string, patch: Partial<Question>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  batchImport: (questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'stats'>[]) => Promise<void>;
  setSearchKeyword: (kw: string) => void;
  setFilters: (filters: QuestionState['filters']) => void;
  toggleStar: (id: string) => Promise<void>;
  getFilteredQuestions: () => Question[];
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  loading: false,
  searchKeyword: '',
  filters: {},

  fetchQuestions: async () => {
    set({ loading: true });
    try {
      const adapter = storageManager.getAdapter();
      const questions = await adapter.getAll<Question>('questions');
      set({ questions, loading: false });
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      set({ loading: false });
    }
  },

  addQuestion: async (q) => {
    const adapter = storageManager.getAdapter();
    const now = new Date().toISOString();
    const question: Question = {
      ...q,
      id: generateId(),
      stats: { timesAttempted: 0, timesCorrect: 0, averageScore: 0 },
      createdAt: now,
      updatedAt: now,
    };
    await adapter.create('questions', question);
    set((state) => ({ questions: [...state.questions, question] }));
    return question;
  },

  updateQuestion: async (id, patch) => {
    const adapter = storageManager.getAdapter();
    const updated = await adapter.update<Question>('questions', id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    set((state) => ({
      questions: state.questions.map((q) => (q.id === id ? updated : q)),
    }));
  },

  deleteQuestion: async (id) => {
    const adapter = storageManager.getAdapter();
    await adapter.delete('questions', id);
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== id),
    }));
  },

  batchImport: async (items) => {
    const adapter = storageManager.getAdapter();
    const now = new Date().toISOString();
    const questions: Question[] = items.map((q) => ({
      ...q,
      id: generateId(),
      stats: { timesAttempted: 0, timesCorrect: 0, averageScore: 0 },
      createdAt: now,
      updatedAt: now,
    }));
    await adapter.batchCreate('questions', questions);
    set((state) => ({ questions: [...state.questions, ...questions] }));
  },

  setSearchKeyword: (kw) => set({ searchKeyword: kw }),

  setFilters: (filters) => set({ filters }),

  toggleStar: async (id) => {
    const question = get().questions.find((q) => q.id === id);
    if (question) {
      await get().updateQuestion(id, { starred: !question.starred });
    }
  },

  getFilteredQuestions: () => {
    const { questions, searchKeyword, filters } = get();
    let filtered = [...questions];

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.content.toLowerCase().includes(kw)
      );
    }

    if (filters.category) {
      filtered = filtered.filter((q) => q.category === filters.category);
    }
    if (filters.difficulty) {
      filtered = filtered.filter((q) => q.difficulty === filters.difficulty);
    }
    if (filters.tagValues && filters.tagValues.length > 0) {
      filtered = filtered.filter((q) =>
        q.tags.some((t) => filters.tagValues!.includes(t.value))
      );
    }

    return filtered;
  },
}));

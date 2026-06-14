import { create } from 'zustand';
import type { InterviewSession, InterviewConfig, InterviewQuestion, ConversationMessage, QuestionScore, OverallScore } from '../models/interview';
import { storageManager } from '../storage/StorageManager';
import { generateId } from '../utils/id';

interface InterviewState {
  sessions: InterviewSession[];
  currentSession: InterviewSession | null;
  currentQuestionIndex: number;
  loading: boolean;

  fetchSessions: () => Promise<void>;
  startInterview: (config: InterviewConfig, questionIds: string[]) => Promise<InterviewSession>;
  addMessage: (questionIndex: number, message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void;
  setQuestionScore: (questionIndex: number, score: QuestionScore) => void;
  completeSession: (overallScore: OverallScore) => Promise<void>;
  abandonSession: () => Promise<void>;
  setCurrentSession: (session: InterviewSession | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  deleteSession: (id: string) => Promise<void>;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  sessions: [],
  currentSession: null,
  currentQuestionIndex: 0,
  loading: false,

  fetchSessions: async () => {
    set({ loading: true });
    try {
      const adapter = storageManager.getAdapter();
      const sessions = await adapter.getAll<InterviewSession>('sessions');
      sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      set({ sessions, loading: false });
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      set({ loading: false });
    }
  },

  startInterview: async (config, questionIds) => {
    const session: InterviewSession = {
      id: generateId(),
      type: 'mock',
      config,
      status: 'in_progress',
      questions: questionIds.map((qId, i) => ({
        questionId: qId,
        order: i,
        conversation: [],
      })),
      startedAt: new Date().toISOString(),
    };
    const adapter = storageManager.getAdapter();
    await adapter.create('sessions', session);
    set({ currentSession: session, currentQuestionIndex: 0 });
    return session;
  },

  addMessage: (questionIndex, message) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const msg: ConversationMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    const updatedQuestions = [...currentSession.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      conversation: [...updatedQuestions[questionIndex].conversation, msg],
    };

    const updatedSession = { ...currentSession, questions: updatedQuestions };
    set({ currentSession: updatedSession });
  },

  setQuestionScore: (questionIndex, score) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const updatedQuestions = [...currentSession.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      score,
    };

    set({ currentSession: { ...currentSession, questions: updatedQuestions } });
  },

  completeSession: async (overallScore) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const completed = {
      ...currentSession,
      status: 'completed' as const,
      overallScore,
      completedAt: new Date().toISOString(),
      duration: Math.floor((Date.now() - new Date(currentSession.startedAt).getTime()) / 1000),
    };

    const adapter = storageManager.getAdapter();
    await adapter.update('sessions', completed.id, completed);

    set((state) => ({
      currentSession: completed,
      sessions: [completed, ...state.sessions.filter((s) => s.id !== completed.id)],
    }));
  },

  abandonSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    const abandoned = { ...currentSession, status: 'abandoned' as const };
    const adapter = storageManager.getAdapter();
    await adapter.update('sessions', abandoned.id, abandoned);
    set({ currentSession: null, currentQuestionIndex: 0 });
  },

  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  deleteSession: async (id) => {
    const adapter = storageManager.getAdapter();
    await adapter.delete('sessions', id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },
}));

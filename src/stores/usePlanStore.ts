import { create } from 'zustand';
import type { StudyPlan, PlanTask, PlanStatus, DailyGoal } from '../models/plan';
import { storageManager } from '../storage/StorageManager';
import { generateId } from '../utils/id';

interface PlanState {
  plans: StudyPlan[];
  loading: boolean;

  fetchPlans: () => Promise<void>;
  createPlan: (name: string, targetDate: string, targetPosition: string, dailyGoal: DailyGoal, targetCompany?: string) => Promise<StudyPlan>;
  updatePlan: (id: string, patch: Partial<StudyPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addTask: (planId: string, task: Omit<PlanTask, 'id' | 'status'>) => Promise<void>;
  completeTask: (planId: string, taskId: string) => Promise<void>;
  skipTask: (planId: string, taskId: string) => Promise<void>;
  updatePlanStatus: (id: string, status: PlanStatus) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  loading: false,

  fetchPlans: async () => {
    set({ loading: true });
    try {
      const adapter = storageManager.getAdapter();
      const plans = await adapter.getAll<StudyPlan>('plans');
      plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({ plans, loading: false });
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      set({ loading: false });
    }
  },

  createPlan: async (name, targetDate, targetPosition, dailyGoal, targetCompany) => {
    const plan: StudyPlan = {
      id: generateId(),
      name,
      targetDate,
      targetPosition,
      targetCompany,
      status: 'active',
      dailyGoal,
      tasks: [],
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        totalQuestions: 0,
        masteredQuestions: 0,
        averageScore: 0,
        streakDays: 0,
        weeklyStats: [],
      },
      createdAt: new Date().toISOString(),
    };
    const adapter = storageManager.getAdapter();
    await adapter.create('plans', plan);
    set((state) => ({ plans: [plan, ...state.plans] }));
    return plan;
  },

  updatePlan: async (id, patch) => {
    const adapter = storageManager.getAdapter();
    await adapter.update('plans', id, patch);
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },

  deletePlan: async (id) => {
    const adapter = storageManager.getAdapter();
    await adapter.delete('plans', id);
    set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
  },

  addTask: async (planId, task) => {
    const plan = get().plans.find((p) => p.id === planId);
    if (!plan) return;

    const newTask: PlanTask = {
      ...task,
      id: generateId(),
      status: 'pending',
    };

    const updatedTasks = [...plan.tasks, newTask];
    const updatedProgress = {
      ...plan.progress,
      totalTasks: updatedTasks.length,
    };

    const adapter = storageManager.getAdapter();
    await adapter.update('plans', planId, { tasks: updatedTasks, progress: updatedProgress });
    set((state) => ({
      plans: state.plans.map((p) =>
        p.id === planId ? { ...p, tasks: updatedTasks, progress: updatedProgress } : p
      ),
    }));
  },

  completeTask: async (planId, taskId) => {
    const plan = get().plans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedTasks = plan.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t
    );
    const completedCount = updatedTasks.filter((t) => t.status === 'completed').length;
    const updatedProgress = {
      ...plan.progress,
      completedTasks: completedCount,
    };

    const adapter = storageManager.getAdapter();
    await adapter.update('plans', planId, { tasks: updatedTasks, progress: updatedProgress });
    set((state) => ({
      plans: state.plans.map((p) =>
        p.id === planId ? { ...p, tasks: updatedTasks, progress: updatedProgress } : p
      ),
    }));
  },

  skipTask: async (planId, taskId) => {
    const plan = get().plans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedTasks = plan.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'skipped' as const } : t
    );

    const adapter = storageManager.getAdapter();
    await adapter.update('plans', planId, { tasks: updatedTasks });
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? { ...p, tasks: updatedTasks } : p)),
    }));
  },

  updatePlanStatus: async (id, status) => {
    const adapter = storageManager.getAdapter();
    await adapter.update('plans', id, { status });
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  },
}));

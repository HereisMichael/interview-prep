export type PlanStatus = 'active' | 'completed' | 'paused';
export type TaskType = 'practice_questions' | 'mock_interview' | 'review' | 'read_material';
export type TaskStatus = 'pending' | 'completed' | 'skipped';

export interface DailyGoal {
  questionsPerDay: number;
  mockInterviewsPerWeek: number;
  reviewItemsPerDay: number;
}

export interface PlanTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  scheduledDate: string;
  completedAt?: string;
  status: TaskStatus;
  relatedQuestionIds?: string[];
  relatedSessionId?: string;
}

export interface WeeklyStat {
  weekStart: string;
  questionsDone: number;
  mocksDone: number;
  reviewsDone: number;
}

export interface PlanProgress {
  totalTasks: number;
  completedTasks: number;
  totalQuestions: number;
  masteredQuestions: number;
  averageScore: number;
  streakDays: number;
  weeklyStats: WeeklyStat[];
}

export interface StudyPlan {
  id: string;
  name: string;
  targetDate: string;
  targetPosition: string;
  targetCompany?: string;
  status: PlanStatus;
  dailyGoal: DailyGoal;
  tasks: PlanTask[];
  progress: PlanProgress;
  createdAt: string;
}

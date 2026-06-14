import type { QuestionScore } from './interview';

export type ReviewStatus = 'unreviewed' | 'reviewing' | 'mastered';

export interface ReviewItem {
  id: string;
  questionId: string;
  sessionId: string;
  userAnswer: string;
  aiScore: QuestionScore;
  reviewStatus: ReviewStatus;
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  userNote?: string;
  weaknessTags: string[];
  createdAt: string;
  // SM-2 算法字段
  ef: number;           // 难度因子 (Easiness Factor), 初始 2.5, 最低 1.3
  interval: number;     // 当前间隔 (天)
  repetitions: number;  // 连续正确次数
}

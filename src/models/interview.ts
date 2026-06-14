import type { QuestionCategory, Difficulty } from './question';

export type InterviewerStyle = 'strict' | 'friendly' | 'neutral';
export type InterviewMode = 'random' | 'sequential' | 'targeted';
export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned';

export interface InterviewConfig {
  mode: InterviewMode;
  questionCount: number;
  filters?: {
    categories?: QuestionCategory[];
    tags?: string[];
    difficulty?: Difficulty[];
  };
  questionIds?: string[];
  aiInterviewerStyle: InterviewerStyle;
  enableFollowUp: boolean;
  maxFollowUpRounds: number;
  timePerQuestion: number;
}

export interface ConversationMessage {
  id: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  timestamp: string;
  isFollowUp?: boolean;
}

export interface DimensionScore {
  name: string;
  score: number;
  comment: string;
}

export interface QuestionScore {
  totalScore: number;
  dimensions: DimensionScore[];
  overallComment: string;
  suggestedAnswer: string;
  isCorrect: boolean;
}

export interface InterviewQuestion {
  questionId: string;
  order: number;
  conversation: ConversationMessage[];
  score?: QuestionScore;
}

export interface OverallScore {
  totalScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface InterviewSession {
  id: string;
  type: 'mock' | 'practice';
  config: InterviewConfig;
  status: InterviewStatus;
  questions: InterviewQuestion[];
  overallScore?: OverallScore;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

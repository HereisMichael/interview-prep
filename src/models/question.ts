export type QuestionCategory =
  | 'architecture'
  | 'industry'
  | 'security'
  | 'presales'
  | 'teamwork'
  | 'hr'
  | 'product';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Tag {
  key: string;
  value: string;
  color?: string;
}

export interface ScoringDimension {
  name: string;
  weight: number;
  description: string;
}

export interface ScoringRubric {
  dimensions: ScoringDimension[];
}

export interface QuestionStats {
  timesAttempted: number;
  timesCorrect: number;
  averageScore: number;
  lastAttemptedAt?: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  category: QuestionCategory;
  tags: Tag[];
  difficulty: Difficulty;
  referenceAnswer?: string;
  scoringRubric?: ScoringRubric;
  followUpQuestions?: string[];
  source?: string;
  stats: QuestionStats;
  starred?: boolean;
  createdAt: string;
  updatedAt: string;
}

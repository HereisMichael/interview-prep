import type { InterviewConfig } from '../models/interview';

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  mode: 'random',
  questionCount: 5,
  aiInterviewerStyle: 'neutral',
  enableFollowUp: true,
  maxFollowUpRounds: 2,
  timePerQuestion: 180,
};

export const DEFAULT_SCORING_DIMENSIONS = [
  { name: '内容完整性', weight: 0.30, description: '是否覆盖题目考察的核心要点' },
  { name: '技术深度', weight: 0.25, description: '技术方案是否具体、可落地' },
  { name: '业务理解', weight: 0.20, description: '是否体现对行业/业务的深入理解' },
  { name: '逻辑表达', weight: 0.15, description: '回答是否结构化、条理清晰' },
  { name: '创新思维', weight: 0.10, description: '是否有独到见解或创新思路' },
];

export const PASS_SCORE = 60;

export const SM2_INTERVALS = [1, 3, 7, 14, 30];

export const SM2_DEFAULTS = {
  initialEF: 2.5,          // 初始难度因子
  minEF: 1.3,              // 难度因子下限
  maxInterval: 90,         // 最大间隔天数
  masteredRepetitions: 5,  // 连续正确多少次算掌握
  masteredMinScore: 80,    // 掌握所需的最低分数
};

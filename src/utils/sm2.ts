/**
 * SM-2 (SuperMemo 2) 间隔重复算法
 *
 * 根据每次复习的得分动态调整下一次复习的间隔时间。
 * - 高分题目间隔递增，复习频率逐渐降低
 * - 低分题目间隔重置，回到短期复习
 * - 难度因子 (EF) 反映题目本身难度，影响间隔增速
 */

import { SM2_DEFAULTS } from '../constants/defaults';
import { addDays } from '../utils/date';
import type { ReviewItem } from '../models/review';

export interface SM2Input {
  ef: number;            // 当前难度因子
  interval: number;      // 当前间隔 (天)
  repetitions: number;   // 连续正确次数
  score: number;         // 本次得分 (0-100)
  passingScore?: number; // 及格线 (默认 60)
}

export interface SM2Output {
  ef: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;  // ISO date string
  status: 'reviewing' | 'mastered';
}

/**
 * 将百分制得分映射为 SM-2 的 0-5 质量分
 *
 * 映射规则:
 * - score < passingScore * 0.3 → q=0 (完全不记得)
 * - score < passingScore * 0.5 → q=1 (有印象但答不上来)
 * - score < passingScore       → q=2 (部分记得, 有错误)
 * - score < passingScore*1.2   → q=3 (正确但费力)
 * - score < passingScore*1.4   → q=4 (正确, 较轻松)
 * - score >= passingScore*1.4  → q=5 (完美回答)
 */
function scoreToQuality(score: number, passingScore: number): number {
  const ratio = score / passingScore;
  if (ratio < 0.3) return 0;
  if (ratio < 0.5) return 1;
  if (ratio < 1.0) return 2;
  if (ratio < 1.2) return 3;
  if (ratio < 1.4) return 4;
  return 5;
}

/**
 * 执行一次 SM-2 计算，返回更新后的状态
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { ef, interval, repetitions, score } = input;
  const passingScore = input.passingScore ?? 60;
  const { minEF, maxInterval, masteredRepetitions, masteredMinScore } = SM2_DEFAULTS;

  const q = scoreToQuality(score, passingScore);

  // SM-2 核心公式: 更新难度因子
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEF = Math.max(
    minEF,
    ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let newInterval: number;
  let newRepetitions: number;

  if (q >= 3) {
    // 回答正确 (质量分 >= 3)
    newRepetitions = repetitions + 1;

    if (repetitions === 0) {
      // 第一次正确: 1 天
      newInterval = 1;
    } else if (repetitions === 1) {
      // 第二次正确: 6 天
      newInterval = 6;
    } else {
      // 后续: round(interval * EF)
      newInterval = Math.round(interval * newEF);
    }
  } else {
    // 回答不正确 (质量分 < 3): 重置间隔和连续次数
    newRepetitions = 0;
    newInterval = 1;
  }

  // 限制间隔上限
  newInterval = Math.min(newInterval, maxInterval);

  // 判断是否已掌握: 连续正确次数达标 且 本次得分较高
  const isMastered = newRepetitions >= masteredRepetitions && score >= masteredMinScore;

  const nextReviewAt = addDays(new Date(), newInterval);

  return {
    ef: Math.round(newEF * 100) / 100, // 保留两位小数
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewAt: nextReviewAt,
    status: isMastered ? 'mastered' : 'reviewing',
  };
}

/**
 * 生成初始 SM-2 状态 (新建 ReviewItem 时使用)
 */
export function getInitialSM2State(): Pick<ReviewItem, 'ef' | 'interval' | 'repetitions'> {
  return {
    ef: SM2_DEFAULTS.initialEF,
    interval: 1,
    repetitions: 0,
  };
}

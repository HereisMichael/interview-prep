import type { QuestionScore, DimensionScore } from '../models/interview';
import { DEFAULT_SCORING_DIMENSIONS, PASS_SCORE } from '../constants/defaults';

export function calculateTotalScore(dimensions: DimensionScore[]): number {
  const defaultDims = DEFAULT_SCORING_DIMENSIONS;
  let total = 0;
  for (const dim of dimensions) {
    const def = defaultDims.find((d) => d.name === dim.name);
    const weight = def?.weight ?? 0.2;
    total += dim.score * weight;
  }
  return Math.round(total);
}

export function isPassing(score: number): boolean {
  return score >= PASS_SCORE;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 60) return '及格';
  return '需加强';
}

import type { QuestionCategory } from '../models/question';

export const CATEGORIES: Record<QuestionCategory, string> = {
  architecture: '技术架构与方案设计',
  industry: '行业理解与业务洞察',
  security: '安全合规与成本优化',
  presales: 'POC与售前能力',
  teamwork: '团队协作与项目管理',
  hr: 'HR面问题',
  product: 'AI产品经理',
};

export const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  architecture: 'blue',
  industry: 'green',
  security: 'orange',
  presales: 'purple',
  teamwork: 'cyan',
  hr: 'gold',
  product: 'magenta',
};

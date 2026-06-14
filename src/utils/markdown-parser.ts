import type { Question, QuestionCategory, Difficulty } from '../models/question';
import { generateId } from './id';

interface ParsedQuestion {
  title: string;
  content: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  referenceAnswer?: string;
  followUpQuestions?: string[];
  tags: { key: string; value: string }[];
}

const CATEGORY_MAP: Record<string, QuestionCategory> = {
  '技术架构': 'architecture',
  '方案设计': 'architecture',
  '行业理解': 'industry',
  '业务洞察': 'industry',
  '安全合规': 'security',
  '成本优化': 'security',
  'POC': 'presales',
  '售前': 'presales',
  '团队协作': 'teamwork',
  '项目管理': 'teamwork',
  'HR': 'hr',
  '产品经理': 'product',
};

function detectCategory(text: string): QuestionCategory {
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return category;
  }
  return 'architecture';
}

function detectTags(text: string): { key: string; value: string }[] {
  const tags: { key: string; value: string }[] = [
    { key: 'position', value: 'SA' },
  ];
  const industryKeywords: Record<string, string> = {
    '医疗': '医疗', '医院': '医疗', 'HIS': '医疗', '互联网医院': '医疗',
    '教育': '教育', '学校': '教育', '在线教育': '教育', '直播课': '教育',
    '金融': '金融', '银行': '金融',
    '零售': '零售', '电商': '零售',
  };
  for (const [keyword, value] of Object.entries(industryKeywords)) {
    if (text.includes(keyword)) {
      tags.push({ key: 'industry', value });
      break;
    }
  }
  const companyKeywords: Record<string, string> = {
    '阿里云': '阿里云', '阿里巴巴': '阿里云',
    '华为云': '华为云', '华为': '华为云',
    '腾讯云': '腾讯云', '腾讯': '腾讯云',
  };
  for (const [keyword, value] of Object.entries(companyKeywords)) {
    if (text.includes(keyword)) {
      tags.push({ key: 'company', value });
      break;
    }
  }
  if (!tags.find(t => t.key === 'company')) {
    tags.push({ key: 'company', value: '通用' });
  }
  if (!tags.find(t => t.key === 'industry')) {
    tags.push({ key: 'industry', value: '通用' });
  }
  return tags;
}

function detectDifficulty(text: string): Difficulty {
  if (text.includes('设计一个') || text.includes('架构') || text.includes('方案')) return 'hard';
  if (text.includes('如何') || text.includes('为什么') || text.includes('谈谈')) return 'medium';
  return 'easy';
}

export function parseMarkdownQuestions(markdown: string, source?: string): Question[] {
  const questions: Question[] = [];
  const sections = markdown.split(/^###\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const sectionTitle = lines[0]?.trim() ?? '';
    const category = detectCategory(sectionTitle);

    const questionBlocks = section.split(/\*\*Q\d+[:：]/).filter(Boolean);

    for (const block of questionBlocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.length < 10) continue;

      const parts = trimmed.split(/\n-/);
      const titleMatch = trimmed.match(/^(.+?)(?:\n|$)/);
      const title = titleMatch ? titleMatch[1].trim().replace(/\*\*$/, '') : trimmed.slice(0, 50);

      const contentLines: string[] = [];
      const followUps: string[] = [];
      let referenceAnswer = '';
      let currentSection = 'content';

      for (const line of lines.slice(1)) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('考察点') || trimmedLine.startsWith('考察')) {
          currentSection = 'examPoint';
          contentLines.push(line);
        } else if (trimmedLine.startsWith('建议') || trimmedLine.startsWith('回答')) {
          currentSection = 'reference';
        } else if (trimmedLine.startsWith('延伸') || trimmedLine.startsWith('追问')) {
          currentSection = 'followUp';
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          if (currentSection === 'followUp') {
            followUps.push(trimmedLine.replace(/^[-*]\s*/, ''));
          } else if (currentSection === 'reference') {
            referenceAnswer += trimmedLine.replace(/^[-*]\s*/, '') + '\n';
          } else {
            contentLines.push(line);
          }
        } else if (currentSection === 'reference') {
          referenceAnswer += line + '\n';
        }
      }

      const fullText = title + ' ' + trimmed;

      questions.push({
        id: generateId(),
        title: title.replace(/\*\*/g, ''),
        content: trimmed.replace(/\*\*/g, ''),
        category,
        tags: detectTags(fullText),
        difficulty: detectDifficulty(fullText),
        referenceAnswer: referenceAnswer.trim() || undefined,
        followUpQuestions: followUps.length > 0 ? followUps : undefined,
        source: source || '面经导入',
        stats: {
          timesAttempted: 0,
          timesCorrect: 0,
          averageScore: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return questions;
}

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { InterviewSession, InterviewQuestion } from '../models/interview';
import type { ReviewItem, ReviewStatus } from '../models/review';
import type { StudyPlan, PlanTask, TaskType, TaskStatus } from '../models/plan';
import type { Question } from '../models/question';
import { storageManager } from '../storage/StorageManager';
import { formatDate } from '../utils/date';
import { getScoreColor, getScoreLabel } from '../utils/scoring';
import { CATEGORIES } from '../constants/categories';
import { PASS_SCORE } from '../constants/defaults';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const COLORS = {
  primary: '#1677ff',
  primaryLight: '#e6f4ff',
  success: '#52c41a',
  successLight: '#f6ffed',
  error: '#ff4d4f',
  errorLight: '#fff2f0',
  warning: '#faad14',
  warningLight: '#fffbe6',
  textPrimary: '#1f1f1f',
  textSecondary: '#595959',
  textTertiary: '#8c8c8c',
  border: '#d9d9d9',
  borderLight: '#f0f0f0',
  bgGray: '#fafafa',
  white: '#ffffff',
} as const;

// ---------------------------------------------------------------------------
// Shared inline-style fragments (used across report builders)
// ---------------------------------------------------------------------------
const FONT_FAMILY =
  'system-ui, -apple-system, "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

const baseContainerStyle: Partial<CSSStyleDeclaration> = {
  fontFamily: FONT_FAMILY,
  width: '760px',
  padding: '40px',
  backgroundColor: COLORS.white,
  color: COLORS.textPrimary,
  lineHeight: '1.6',
  fontSize: '14px',
};

// ---------------------------------------------------------------------------
// Status / type label maps
// ---------------------------------------------------------------------------
const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  in_progress: '进行中',
  completed: '已完成',
  abandoned: '已放弃',
};

const INTERVIEW_STATUS_COLOR: Record<string, string> = {
  in_progress: COLORS.primary,
  completed: COLORS.success,
  abandoned: COLORS.textTertiary,
};

const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  unreviewed: '未复习',
  reviewing: '复习中',
  mastered: '已掌握',
};

const REVIEW_STATUS_COLOR: Record<ReviewStatus, string> = {
  unreviewed: COLORS.textTertiary,
  reviewing: COLORS.warning,
  mastered: COLORS.success,
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  practice_questions: '练习题',
  mock_interview: '模拟面试',
  review: '错题复习',
  read_material: '阅读材料',
};

const TASK_TYPE_COLOR: Record<TaskType, string> = {
  practice_questions: COLORS.primary,
  mock_interview: '#722ed1',
  review: COLORS.warning,
  read_material: COLORS.success,
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待完成',
  completed: '已完成',
  skipped: '已跳过',
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  pending: COLORS.textTertiary,
  completed: COLORS.success,
  skipped: COLORS.warning,
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

// ---------------------------------------------------------------------------
// Helper: small HTML builders
// ---------------------------------------------------------------------------

function el(tag: string, styles: string, innerHTML: string): string {
  return `<${tag} style="${styles}">${innerHTML}</${tag}>`;
}

function badge(text: string, color: string): string {
  return `<span style="
    display:inline-block;
    padding:2px 10px;
    border-radius:10px;
    font-size:12px;
    font-weight:600;
    color:#fff;
    background:${color};
  ">${text}</span>`;
}

function scoreBadge(score: number): string {
  const color = getScoreColor(score);
  return `<span style="
    display:inline-block;
    padding:4px 14px;
    border-radius:12px;
    font-size:16px;
    font-weight:700;
    color:#fff;
    background:${color};
  ">${score}分</span>`;
}

function sectionTitle(text: string): string {
  return `
    <div style="
      margin:28px 0 12px 0;
      padding-bottom:8px;
      border-bottom:2px solid ${COLORS.primary};
      font-size:18px;
      font-weight:700;
      color:${COLORS.primary};
    ">${text}</div>`;
}

function keyValue(label: string, value: string): string {
  return `<div style="margin:4px 0;">
    <span style="color:${COLORS.textTertiary};font-size:13px;">${label}：</span>
    <span style="font-weight:600;">${value}</span>
  </div>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${COLORS.borderLight};margin:16px 0;" />`;
}

function tableHeader(columns: string[]): string {
  const cells = columns
    .map(
      (c) =>
        `<th style="
          padding:8px 12px;
          background:${COLORS.primaryLight};
          color:${COLORS.primary};
          font-weight:600;
          font-size:13px;
          text-align:left;
          border:1px solid ${COLORS.border};
        ">${c}</th>`,
    )
    .join('');
  return `<tr>${cells}</tr>`;
}

function tableRow(cells: string[]): string {
  const tds = cells
    .map(
      (c) =>
        `<td style="
          padding:6px 12px;
          font-size:13px;
          border:1px solid ${COLORS.border};
          vertical-align:top;
        ">${c}</td>`,
    )
    .join('');
  return `<tr>${tds}</tr>`;
}

function tableWrap(rows: string): string {
  return `<table style="
    width:100%;
    border-collapse:collapse;
    margin:8px 0;
  ">${rows}</table>`;
}

function listItem(text: string, icon: string, color: string): string {
  return `<div style="margin:4px 0;font-size:13px;">
    <span style="color:${color};margin-right:6px;">${icon}</span>${text}
  </div>`;
}

// ---------------------------------------------------------------------------
// ExportService
// ---------------------------------------------------------------------------

export class ExportService {
  // -----------------------------------------------------------------------
  // 1. Interview Report PDF
  // -----------------------------------------------------------------------
  static async exportInterviewReport(
    session: InterviewSession,
    questions: Question[],
  ): Promise<void> {
    const container = ExportService.createReportContainer();
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const totalScore = session.overallScore?.totalScore ?? 0;
    const passed = totalScore >= PASS_SCORE;
    const questionCount = session.questions.length;
    const answeredCount = session.questions.filter((iq) => iq.score).length;
    const duration = session.duration
      ? `${Math.floor(session.duration / 60)}分${session.duration % 60}秒`
      : '-';

    let html = '';

    // -- Header --
    html += `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:26px;font-weight:800;color:${COLORS.primary};margin-bottom:4px;">
          模拟面试报告
        </div>
        <div style="font-size:13px;color:${COLORS.textTertiary};">
          ${formatDate(session.startedAt, 'YYYY年MM月DD日 HH:mm')}
          &nbsp;&nbsp;
          ${badge(INTERVIEW_STATUS_LABEL[session.status] ?? session.status, INTERVIEW_STATUS_COLOR[session.status] ?? COLORS.textTertiary)}
        </div>
      </div>`;

    // -- Summary --
    html += sectionTitle('总览');
    html += `
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin:12px 0;">
        <div style="
          flex:1;min-width:140px;
          padding:16px;
          text-align:center;
          border-radius:8px;
          background:${passed ? COLORS.successLight : COLORS.errorLight};
          border:1px solid ${passed ? COLORS.success : COLORS.error};
        ">
          <div style="font-size:36px;font-weight:800;color:${passed ? COLORS.success : COLORS.error};">
            ${totalScore}
          </div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">
            总分 (${getScoreLabel(totalScore)})
          </div>
        </div>
        <div style="
          flex:1;min-width:140px;
          padding:16px;
          text-align:center;
          border-radius:8px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${questionCount}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">题目数量</div>
        </div>
        <div style="
          flex:1;min-width:140px;
          padding:16px;
          text-align:center;
          border-radius:8px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${answeredCount}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">已作答</div>
        </div>
        <div style="
          flex:1;min-width:140px;
          padding:16px;
          text-align:center;
          border-radius:8px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${duration}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">用时</div>
        </div>
      </div>`;

    html += keyValue('面试类型', session.type === 'mock' ? '模拟面试' : '练习模式');
    html += keyValue('及格线', `${PASS_SCORE}分`);
    html += keyValue('结果', passed ? '通过' : '未通过');

    // -- Strengths & Weaknesses --
    if (session.overallScore) {
      const { strengths, weaknesses } = session.overallScore;

      if (strengths.length || weaknesses.length) {
        html += sectionTitle('优势与不足');
        html += `<div style="display:flex;gap:20px;">`;

        // Strengths
        html += `<div style="flex:1;">`;
        html += el('div', `font-weight:600;color:${COLORS.success};margin-bottom:6px;`, '优势');
        if (strengths.length) {
          strengths.forEach((s) => {
            html += listItem(s, '&#10003;', COLORS.success);
          });
        } else {
          html += el('div', `color:${COLORS.textTertiary};font-size:13px;`, '暂无');
        }
        html += `</div>`;

        // Weaknesses
        html += `<div style="flex:1;">`;
        html += el('div', `font-weight:600;color:${COLORS.error};margin-bottom:6px;`, '待改进');
        if (weaknesses.length) {
          weaknesses.forEach((w) => {
            html += listItem(w, '&#10007;', COLORS.error);
          });
        } else {
          html += el('div', `color:${COLORS.textTertiary};font-size:13px;`, '暂无');
        }
        html += `</div>`;

        html += `</div>`;
      }
    }

    // -- Per-question details --
    html += sectionTitle('题目详情');

    session.questions
      .sort((a, b) => a.order - b.order)
      .forEach((iq: InterviewQuestion, idx: number) => {
        const question = questionMap.get(iq.questionId);
        const title = question?.title ?? `题目 ${idx + 1}`;
        const category = question ? CATEGORIES[question.category] ?? question.category : '';
        const difficulty = question ? DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty : '';
        const score = iq.score;

        html += `
          <div style="
            margin:12px 0;
            padding:14px;
            border-radius:8px;
            border:1px solid ${COLORS.borderLight};
            background:${COLORS.bgGray};
          ">`;

        // Title row
        html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:700;font-size:15px;">
            <span style="color:${COLORS.primary};margin-right:6px;">#${iq.order}</span>${title}
          </div>
          ${score ? scoreBadge(score.totalScore) : ''}
        </div>`;

        // Meta
        const metaParts: string[] = [];
        if (category) metaParts.push(category);
        if (difficulty) metaParts.push(difficulty);
        if (score) metaParts.push(score.isCorrect ? '回答正确' : '回答有误');
        if (metaParts.length) {
          html += `<div style="font-size:12px;color:${COLORS.textTertiary};margin-bottom:8px;">${metaParts.join(' | ')}</div>`;
        }

        // Dimension scores table
        if (score && score.dimensions.length) {
          let tableHtml = tableHeader(['评分维度', '得分', '评语']);
          score.dimensions.forEach((d) => {
            const dimColor = getScoreColor(d.score);
            tableHtml += tableRow([
              d.name,
              `<span style="font-weight:700;color:${dimColor};">${d.score}</span>`,
              d.comment || '-',
            ]);
          });
          html += tableWrap(tableHtml);
        }

        // AI comment
        if (score?.overallComment) {
          html += `<div style="margin-top:8px;padding:8px 12px;border-left:3px solid ${COLORS.primary};background:${COLORS.primaryLight};border-radius:0 4px 4px 0;font-size:13px;">
            <span style="font-weight:600;color:${COLORS.primary};">AI点评：</span>${score.overallComment}
          </div>`;
        }

        // Suggested answer excerpt
        if (score?.suggestedAnswer) {
          const excerpt =
            score.suggestedAnswer.length > 200
              ? score.suggestedAnswer.slice(0, 200) + '...'
              : score.suggestedAnswer;
          html += `<div style="margin-top:8px;font-size:13px;">
            <span style="font-weight:600;color:${COLORS.textSecondary};">参考答案：</span>
            <span style="color:${COLORS.textSecondary};">${excerpt}</span>
          </div>`;
        }

        html += `</div>`; // end question card
      });

    // -- Recommendations footer --
    if (session.overallScore?.recommendations?.length) {
      html += sectionTitle('改进建议');
      session.overallScore.recommendations.forEach((r, i) => {
        html += listItem(`${i + 1}. ${r}`, '&#9733;', COLORS.warning);
      });
    }

    container.innerHTML = html;
    await ExportService.renderToPdf(container, `面试报告_${formatDate(session.startedAt, 'YYYYMMDD_HHmm')}`);
  }

  // -----------------------------------------------------------------------
  // 2. Review Analysis Report PDF
  // -----------------------------------------------------------------------
  static async exportReviewReport(
    items: ReviewItem[],
    questions: Question[],
    weaknessSummary: Record<string, { count: number; avgScore: number }>,
  ): Promise<void> {
    const container = ExportService.createReportContainer();
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const masteredCount = items.filter((i) => i.reviewStatus === 'mastered').length;
    const reviewingCount = items.filter((i) => i.reviewStatus === 'reviewing').length;
    const unreviewedCount = items.filter((i) => i.reviewStatus === 'unreviewed').length;

    let html = '';

    // -- Header --
    html += `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:26px;font-weight:800;color:${COLORS.primary};margin-bottom:4px;">
          错题分析报告
        </div>
        <div style="font-size:13px;color:${COLORS.textTertiary};">
          ${formatDate(new Date(), 'YYYY年MM月DD日')}
          &nbsp;&nbsp;共 ${items.length} 道错题
        </div>
      </div>`;

    // -- Weakness summary table --
    const weaknessEntries = Object.entries(weaknessSummary);
    if (weaknessEntries.length) {
      html += sectionTitle('薄弱维度分析');

      let tableHtml = tableHeader(['薄弱维度', '出现次数', '平均得分', '风险等级']);
      weaknessEntries
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([name, { count, avgScore }]) => {
          const color = getScoreColor(avgScore);
          const risk = avgScore < 50 ? '高' : avgScore < 70 ? '中' : '低';
          const riskColor = avgScore < 50 ? COLORS.error : avgScore < 70 ? COLORS.warning : COLORS.success;
          tableHtml += tableRow([
            `<span style="font-weight:600;">${name}</span>`,
            `${count}次`,
            `<span style="font-weight:700;color:${color};">${avgScore.toFixed(1)}分</span>`,
            badge(risk, riskColor),
          ]);
        });
      html += tableWrap(tableHtml);
    }

    // -- Per-item details --
    html += sectionTitle('错题详情');

    items.forEach((item, idx) => {
      const question = questionMap.get(item.questionId);
      const title = question?.title ?? `题目 ${idx + 1}`;
      const category = question ? CATEGORIES[question.category] ?? question.category : '';

      html += `
        <div style="
          margin:12px 0;
          padding:14px;
          border-radius:8px;
          border:1px solid ${COLORS.borderLight};
          background:${COLORS.bgGray};
        ">`;

      // Title row
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:700;font-size:15px;">
          <span style="color:${COLORS.primary};margin-right:6px;">#${idx + 1}</span>${title}
        </div>
        ${scoreBadge(item.aiScore.totalScore)}
      </div>`;

      // Meta line
      html += `<div style="font-size:12px;color:${COLORS.textTertiary};margin-bottom:8px;">
        ${category ? category + ' | ' : ''}
        复习 ${item.reviewCount} 次 |
        ${badge(REVIEW_STATUS_LABEL[item.reviewStatus], REVIEW_STATUS_COLOR[item.reviewStatus])}
      </div>`;

      // Weakness tags
      if (item.weaknessTags.length) {
        html += `<div style="margin:6px 0;">
          <span style="font-size:12px;color:${COLORS.textTertiary};">薄弱标签：</span>
          ${item.weaknessTags.map((t) => badge(t, COLORS.warning)).join(' ')}
        </div>`;
      }

      // Dimension scores
      if (item.aiScore.dimensions.length) {
        let tableHtml = tableHeader(['评分维度', '得分', '评语']);
        item.aiScore.dimensions.forEach((d) => {
          const dimColor = getScoreColor(d.score);
          tableHtml += tableRow([
            d.name,
            `<span style="font-weight:700;color:${dimColor};">${d.score}</span>`,
            d.comment || '-',
          ]);
        });
        html += tableWrap(tableHtml);
      }

      // AI comment
      if (item.aiScore.overallComment) {
        html += `<div style="margin-top:8px;padding:8px 12px;border-left:3px solid ${COLORS.primary};background:${COLORS.primaryLight};border-radius:0 4px 4px 0;font-size:13px;">
          <span style="font-weight:600;color:${COLORS.primary};">AI点评：</span>${item.aiScore.overallComment}
        </div>`;
      }

      // User note
      if (item.userNote) {
        html += `<div style="margin-top:8px;padding:8px 12px;border-left:3px solid ${COLORS.warning};background:${COLORS.warningLight};border-radius:0 4px 4px 0;font-size:13px;">
          <span style="font-weight:600;color:${COLORS.warning};">我的笔记：</span>${item.userNote}
        </div>`;
      }

      html += `</div>`; // end item card
    });

    // -- Review progress footer --
    html += sectionTitle('复习进度统计');
    html += `
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="
          flex:1;min-width:120px;
          padding:12px;text-align:center;
          border-radius:8px;background:${COLORS.successLight};border:1px solid ${COLORS.success};
        ">
          <div style="font-size:24px;font-weight:700;color:${COLORS.success};">${masteredCount}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};">已掌握</div>
        </div>
        <div style="
          flex:1;min-width:120px;
          padding:12px;text-align:center;
          border-radius:8px;background:${COLORS.warningLight};border:1px solid ${COLORS.warning};
        ">
          <div style="font-size:24px;font-weight:700;color:${COLORS.warning};">${reviewingCount}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};">复习中</div>
        </div>
        <div style="
          flex:1;min-width:120px;
          padding:12px;text-align:center;
          border-radius:8px;background:${COLORS.bgGray};border:1px solid ${COLORS.border};
        ">
          <div style="font-size:24px;font-weight:700;color:${COLORS.textTertiary};">${unreviewedCount}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};">未复习</div>
        </div>
      </div>`;

    if (items.length > 0) {
      const masteryRate = ((masteredCount / items.length) * 100).toFixed(1);
      html += `<div style="margin-top:10px;font-size:13px;color:${COLORS.textSecondary};">
        掌握率：<span style="font-weight:700;color:${COLORS.success};">${masteryRate}%</span>
      </div>`;
    }

    container.innerHTML = html;
    await ExportService.renderToPdf(container, `错题分析_${formatDate(new Date(), 'YYYYMMDD')}`);
  }

  // -----------------------------------------------------------------------
  // 3. Study Plan PDF
  // -----------------------------------------------------------------------
  static async exportStudyPlan(plan: StudyPlan): Promise<void> {
    const container = ExportService.createReportContainer();

    const { progress, dailyGoal, tasks } = plan;
    const completionRate =
      progress.totalTasks > 0
        ? ((progress.completedTasks / progress.totalTasks) * 100).toFixed(1)
        : '0.0';

    let html = '';

    // -- Header --
    html += `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:26px;font-weight:800;color:${COLORS.primary};margin-bottom:4px;">
          ${plan.name}
        </div>
        <div style="font-size:13px;color:${COLORS.textTertiary};">
          目标岗位：${plan.targetPosition}
          ${plan.targetCompany ? ` @ ${plan.targetCompany}` : ''}
          &nbsp;|&nbsp;
          目标日期：${formatDate(plan.targetDate, 'YYYY年MM月DD日')}
        </div>
      </div>`;

    // -- Progress stats --
    html += sectionTitle('学习进度');
    html += `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin:12px 0;">
        <div style="
          flex:1;min-width:130px;
          padding:14px;text-align:center;
          border-radius:8px;background:${COLORS.primaryLight};border:1px solid ${COLORS.primary};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.primary};">
            ${progress.completedTasks}/${progress.totalTasks}
          </div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">任务完成</div>
        </div>
        <div style="
          flex:1;min-width:130px;
          padding:14px;text-align:center;
          border-radius:8px;background:${COLORS.bgGray};border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${completionRate}%</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">完成率</div>
        </div>
        <div style="
          flex:1;min-width:130px;
          padding:14px;text-align:center;
          border-radius:8px;background:${COLORS.bgGray};border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${progress.streakDays}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">连续天数</div>
        </div>
        <div style="
          flex:1;min-width:130px;
          padding:14px;text-align:center;
          border-radius:8px;background:${COLORS.bgGray};border:1px solid ${COLORS.borderLight};
        ">
          <div style="font-size:28px;font-weight:700;color:${COLORS.textPrimary};">${progress.averageScore}</div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:2px;">平均分</div>
        </div>
      </div>`;

    html += keyValue('已完成题目', `${progress.totalQuestions} 道`);
    html += keyValue('已掌握题目', `${progress.masteredQuestions} 道`);

    // -- Daily goal --
    html += sectionTitle('每日目标');
    html += `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:8px 0;">
        <div style="
          flex:1;min-width:160px;
          padding:10px 14px;
          border-radius:6px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
          font-size:13px;
        ">
          <span style="color:${COLORS.textTertiary};">每日练习题</span>
          <span style="float:right;font-weight:700;">${dailyGoal.questionsPerDay} 道</span>
        </div>
        <div style="
          flex:1;min-width:160px;
          padding:10px 14px;
          border-radius:6px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
          font-size:13px;
        ">
          <span style="color:${COLORS.textTertiary};">每周模拟面试</span>
          <span style="float:right;font-weight:700;">${dailyGoal.mockInterviewsPerWeek} 次</span>
        </div>
        <div style="
          flex:1;min-width:160px;
          padding:10px 14px;
          border-radius:6px;
          background:${COLORS.bgGray};
          border:1px solid ${COLORS.borderLight};
          font-size:13px;
        ">
          <span style="color:${COLORS.textTertiary};">每日复习</span>
          <span style="float:right;font-weight:700;">${dailyGoal.reviewItemsPerDay} 道</span>
        </div>
      </div>`;

    // -- Task list grouped by date --
    html += sectionTitle('任务列表');

    const tasksByDate = new Map<string, PlanTask[]>();
    tasks.forEach((t) => {
      const dateKey = formatDate(t.scheduledDate, 'YYYY-MM-DD');
      const group = tasksByDate.get(dateKey) ?? [];
      group.push(t);
      tasksByDate.set(dateKey, group);
    });

    const sortedDates = Array.from(tasksByDate.keys()).sort();

    sortedDates.forEach((dateKey) => {
      const group = tasksByDate.get(dateKey)!;
      html += `<div style="margin:12px 0 4px 0;font-weight:700;font-size:14px;color:${COLORS.textSecondary};">
        ${formatDate(dateKey, 'MM月DD日 ddd')}
      </div>`;

      group.forEach((task) => {
        html += `
          <div style="
            display:flex;
            align-items:center;
            gap:10px;
            padding:8px 12px;
            margin:4px 0;
            border-radius:6px;
            background:${COLORS.bgGray};
            border:1px solid ${COLORS.borderLight};
          ">
            ${badge(TASK_TYPE_LABEL[task.type] ?? task.type, TASK_TYPE_COLOR[task.type] ?? COLORS.textTertiary)}
            <span style="flex:1;font-size:13px;font-weight:600;">${task.title}</span>
            ${badge(TASK_STATUS_LABEL[task.status] ?? task.status, TASK_STATUS_COLOR[task.status] ?? COLORS.textTertiary)}
          </div>`;
      });
    });

    if (tasks.length === 0) {
      html += `<div style="color:${COLORS.textTertiary};font-size:13px;text-align:center;padding:20px;">暂无任务</div>`;
    }

    container.innerHTML = html;
    await ExportService.renderToPdf(container, `学习计划_${plan.name}_${formatDate(new Date(), 'YYYYMMDD')}`);
  }

  // -----------------------------------------------------------------------
  // 4. JSON Backup Export
  // -----------------------------------------------------------------------
  static async exportJSON(): Promise<void> {
    try {
      const adapter = storageManager.getAdapter();
      const jsonString = await adapter.exportData();

      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const filename = `interview-prep-backup-${formatDate(new Date(), 'YYYYMMDD-HHmmss')}.json`;
      ExportService.downloadBlob(blob, filename);
    } catch (error) {
      console.error('[ExportService] JSON export failed:', error);
      throw new Error(
        `数据导出失败：${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // 5. JSON Import
  // -----------------------------------------------------------------------
  static async importJSON(file: File): Promise<void> {
    try {
      const text = await file.text();

      // Validate JSON structure
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('文件格式错误：无效的 JSON 数据');
      }

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('文件格式错误：JSON 根节点必须为对象');
      }

      const adapter = storageManager.getAdapter();
      await adapter.importData(text);
    } catch (error) {
      console.error('[ExportService] JSON import failed:', error);
      // Re-throw with user-friendly message if it's already our Error
      if (error instanceof Error && error.message.startsWith('文件格式错误')) {
        throw error;
      }
      throw new Error(
        `数据导入失败：${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Renders an off-screen HTML container to a multi-page A4 PDF using
   * html2canvas (for Chinese text support) and jsPDF.
   */
  private static async renderToPdf(
    container: HTMLElement,
    filename: string,
  ): Promise<void> {
    try {
      // Append off-screen so layout engine can calculate dimensions
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Wait a tick for fonts and layout to settle
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Render to canvas at 2x for quality
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // A4 dimensions in mm (portrait)
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 10;
      const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
      const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = CONTENT_WIDTH_MM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Calculate page breaks
      const pageHeight = CONTENT_HEIGHT_MM;
      let remainingHeight = imgHeight;
      let position = 0; // current y offset in the source image (mm)
      let pageIndex = 0;

      while (remainingHeight > 0) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Create a canvas slice for this page
        const sourceY = (position / imgHeight) * canvas.height;
        const sourceHeight = Math.min(
          (pageHeight / imgHeight) * canvas.height,
          canvas.height - sourceY,
        );

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceHeight);

        const ctx = pageCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('无法创建 canvas 上下文');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight,
        );

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeight = Math.min(
          (sourceHeight / canvas.height) * imgHeight,
          pageHeight,
        );

        pdf.addImage(
          pageImgData,
          'JPEG',
          MARGIN_MM,
          MARGIN_MM,
          imgWidth,
          sliceHeight,
        );

        remainingHeight -= pageHeight;
        position += pageHeight;
        pageIndex++;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('[ExportService] PDF render failed:', error);
      throw new Error(
        `PDF 生成失败：${error instanceof Error ? error.message : '未知错误'}`,
      );
    } finally {
      // Always clean up the DOM
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  /**
   * Triggers a browser download for a Blob.
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Clean up after a short delay to allow the download to start
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 100);
  }

  /**
   * Creates an off-screen div styled for report rendering.
   */
  private static createReportContainer(): HTMLDivElement {
    const div = document.createElement('div');
    Object.assign(div.style, baseContainerStyle);
    return div;
  }
}

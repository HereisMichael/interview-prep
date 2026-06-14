import { useEffect, useState } from 'react';
import { Card, List, Tag, Button, Empty, Progress, Typography, Space, Input, message } from 'antd';
import { CheckCircleOutlined, BookOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useReviewStore } from '../../stores/useReviewStore';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { getScoreColor, getScoreLabel } from '../../utils/scoring';
import { CATEGORIES } from '../../constants/categories';
import { ExportService } from '../../services/ExportService';
import type { ReviewItem, ReviewStatus } from '../../models/review';
import type { Question } from '../../models/question';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusLabels: Record<ReviewStatus, { text: string; color: string }> = {
  unreviewed: { text: '未复习', color: 'red' },
  reviewing: { text: '复习中', color: 'orange' },
  mastered: { text: '已掌握', color: 'green' },
};

export default function ReviewList() {
  const navigate = useNavigate();
  const { items, loading, fetchReviews, updateReviewStatus, getWeaknessSummary } = useReviewStore();
  const { questions, fetchQuestions } = useQuestionStore();
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');

  useEffect(() => {
    fetchReviews();
    fetchQuestions();
  }, [fetchReviews, fetchQuestions]);

  const filteredItems = filter === 'all'
    ? items
    : items.filter((i) => i.reviewStatus === filter);

  const weaknessSummary = getWeaknessSummary();
  const weaknessEntries = Object.entries(weaknessSummary).sort((a, b) => b[1].count - a[1].count);

  const getQuestion = (id: string): Question | undefined =>
    questions.find((q) => q.id === id);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {weaknessEntries.length > 0 && (
        <Card title="薄弱环节分析" size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {weaknessEntries.slice(0, 8).map(([tag, data]) => (
              <div key={tag} style={{ textAlign: 'center', minWidth: 100 }}>
                <Progress
                  type="circle"
                  size={60}
                  percent={Math.round(data.avgScore)}
                  strokeColor={getScoreColor(data.avgScore)}
                  format={(p) => `${p}`}
                />
                <div style={{ marginTop: 4, fontSize: 12 }}>{tag}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{data.count} 题</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="错题本"
        extra={
          <Space>
            <Button
              icon={<FilePdfOutlined />}
              size="small"
              onClick={async () => {
                try {
                  await ExportService.exportReviewReport(items, questions, weaknessSummary);
                  message.success('分析报告已导出');
                } catch {
                  message.error('导出失败，请重试');
                }
              }}
            >
              导出报告
            </Button>
            {(['all', 'unreviewed', 'reviewing', 'mastered'] as const).map((s) => (
              <Button
                key={s}
                type={filter === s ? 'primary' : 'default'}
                size="small"
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? `全部 (${items.length})` : `${statusLabels[s].text} (${items.filter((i) => i.reviewStatus === s).length})`}
              </Button>
            ))}
          </Space>
        }
      >
        {filteredItems.length === 0 ? (
          <Empty description="暂无错题记录" />
        ) : (
          <List
            dataSource={filteredItems}
            renderItem={(item) => {
              const question = getQuestion(item.questionId);
              return (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      onClick={() => navigate(`/review/${item.id}`)}
                    >
                      查看详情
                    </Button>,
                    item.reviewStatus !== 'mastered' ? (
                      <Button
                        key="master"
                        type="link"
                        icon={<CheckCircleOutlined />}
                        onClick={() => {
                          updateReviewStatus(item.id, 'mastered');
                          message.success('已标记为掌握');
                        }}
                      >
                        标记掌握
                      </Button>
                    ) : null,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{question?.title || '未知题目'}</span>
                        <Tag color={statusLabels[item.reviewStatus].color}>
                          {statusLabels[item.reviewStatus].text}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <span style={{ color: getScoreColor(item.aiScore.totalScore), fontWeight: 600 }}>
                          {item.aiScore.totalScore}分 ({getScoreLabel(item.aiScore.totalScore)})
                        </span>
                        <span>|</span>
                        <span>复习 {item.reviewCount} 次</span>
                        {question && <Tag>{CATEGORIES[question.category]}</Tag>}
                        {item.weaknessTags.map((t) => <Tag key={t} color="red">{t}</Tag>)}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}

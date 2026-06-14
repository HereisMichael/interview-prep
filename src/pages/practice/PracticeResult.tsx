import { useMemo } from 'react';
import {
  Card, Button, Typography, Progress, Row, Col, Statistic,
  Tag, Collapse, Space,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined,
  BugOutlined, HomeOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';
import { PASS_SCORE } from '../../constants/defaults';
import type { QuestionScore } from '../../models/interview';

const { Title, Text, Paragraph } = Typography;

interface PracticeResultItem {
  questionId: string;
  userAnswer: string;
  score: QuestionScore | null;
  timeSpent: number;
}

export default function PracticeResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    results?: PracticeResultItem[];
    totalTime?: number;
    questionIds?: string[];
  };

  const results = state?.results || [];
  const totalTime = state?.totalTime || 0;
  const questions = useQuestionStore((s) => s.questions);

  const stats = useMemo(() => {
    const scored = results.filter((r) => r.score !== null);
    if (scored.length === 0) {
      return { totalScore: 0, correctCount: 0, totalCount: results.length, accuracy: 0 };
    }

    const totalScore = Math.round(
      scored.reduce((sum, r) => sum + (r.score?.totalScore || 0), 0) / scored.length
    );
    const correctCount = scored.filter(
      (r) => r.score && r.score.totalScore >= PASS_SCORE
    ).length;
    const accuracy = Math.round((correctCount / scored.length) * 100);

    return { totalScore, correctCount, totalCount: scored.length, accuracy };
  }, [results]);

  const weaknessSummary = useMemo(() => {
    const dimMap: Record<string, { total: number; count: number }> = {};
    results.forEach((r) => {
      r.score?.dimensions?.forEach((d) => {
        if (!dimMap[d.name]) dimMap[d.name] = { total: 0, count: 0 };
        dimMap[d.name].total += d.score;
        dimMap[d.name].count += 1;
      });
    });

    return Object.entries(dimMap)
      .map(([name, { total, count }]) => ({
        name,
        avgScore: Math.round(total / count),
      }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [results]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">没有刷题记录</Text>
        <br />
        <Button type="primary" onClick={() => navigate('/practice')} style={{ marginTop: 16 }}>
          开始刷题
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Summary Stats */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          刷题完成！
        </Title>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="平均分"
              value={stats.totalScore}
              suffix="分"
              valueStyle={{
                color: stats.totalScore >= 80
                  ? '#52c41a'
                  : stats.totalScore >= 60
                    ? '#faad14'
                    : '#ff4d4f',
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="通过率"
              value={stats.accuracy}
              suffix="%"
              valueStyle={{ color: stats.accuracy >= 60 ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="通过/总题"
              value={stats.correctCount}
              suffix={`/ ${stats.totalCount}`}
            />
          </Col>
          <Col span={6}>
            <Statistic title="总用时" value={formatTime(totalTime)} />
          </Col>
        </Row>
      </Card>

      {/* Weakness Dimensions */}
      {weaknessSummary.length > 0 && (
        <Card title="各维度得分" size="small" style={{ marginBottom: 16 }}>
          {weaknessSummary.map((dim) => (
            <div key={dim.name} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{dim.name}</Text>
                <Text strong>{dim.avgScore}分</Text>
              </div>
              <Progress
                percent={dim.avgScore}
                showInfo={false}
                strokeColor={
                  dim.avgScore >= 80 ? '#52c41a' : dim.avgScore >= 60 ? '#faad14' : '#ff4d4f'
                }
                size="small"
              />
            </div>
          ))}
        </Card>
      )}

      {/* Question List */}
      <Card title="逐题详情" size="small">
        <Collapse
          accordion
          items={results.map((result, index) => {
            const question = questions.find((q) => q.id === result.questionId);
            const passed = result.score && result.score.totalScore >= PASS_SCORE;
            const skipped = !result.score;

            return {
              key: index,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  {skipped ? (
                    <Tag>跳过</Tag>
                  ) : passed ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <Text strong style={{ flex: 1 }}>
                    {index + 1}. {question?.title || '未知题目'}
                  </Text>
                  {result.score && (
                    <Text
                      strong
                      style={{
                        color: result.score.totalScore >= PASS_SCORE ? '#52c41a' : '#ff4d4f',
                      }}
                    >
                      {result.score.totalScore}分
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {result.timeSpent}秒
                  </Text>
                  {question && (
                    <Tag color={CATEGORY_COLORS[question.category]} style={{ marginRight: 0 }}>
                      {CATEGORIES[question.category]}
                    </Tag>
                  )}
                </div>
              ),
              children: (
                <div>
                  {question?.content && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>题目：</Text>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {question.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {result.userAnswer && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>你的回答：</Text>
                      <Paragraph style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
                        {result.userAnswer}
                      </Paragraph>
                    </div>
                  )}

                  {result.score?.overallComment && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>评价：</Text>
                      <Paragraph>{result.score.overallComment}</Paragraph>
                    </div>
                  )}

                  {result.score?.suggestedAnswer && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>建议回答：</Text>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.score.suggestedAnswer}
                      </ReactMarkdown>
                    </div>
                  )}

                  {question?.referenceAnswer && (
                    <div>
                      <Text strong>参考答案：</Text>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {question.referenceAnswer}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ),
            };
          })}
        />
      </Card>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space size="middle">
          <Button
            type="primary"
            icon={<RedoOutlined />}
            onClick={() => navigate('/practice')}
          >
            再来一轮
          </Button>
          {stats.correctCount < stats.totalCount && (
            <Button
              icon={<BugOutlined />}
              onClick={() => navigate('/review')}
            >
              查看错题
            </Button>
          )}
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
        </Space>
      </div>
    </div>
  );
}

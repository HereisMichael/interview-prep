import { useMemo } from 'react';
import { Card, Row, Col, Statistic, Button, List, Empty } from 'antd';
import {
  BookOutlined,
  VideoCameraOutlined,
  EditOutlined,
  BugOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../stores/useQuestionStore';
import { useInterviewStore } from '../stores/useInterviewStore';
import { useReviewStore } from '../stores/useReviewStore';
import { usePlanStore } from '../stores/usePlanStore';
import dayjs from 'dayjs';

export default function Dashboard() {
  const navigate = useNavigate();
  const questions = useQuestionStore((s) => s.questions);
  const sessions = useInterviewStore((s) => s.sessions);
  const reviewItems = useReviewStore((s) => s.items);
  const plans = usePlanStore((s) => s.plans);
  const activePlan = plans.find((p) => p.status === 'active');

  const todayReviews = useMemo(() => {
    const now = new Date();
    return reviewItems.filter(
      (item) =>
        item.reviewStatus !== 'mastered' &&
        item.nextReviewAt &&
        new Date(item.nextReviewAt) <= now
    );
  }, [reviewItems]);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.overallScore?.totalScore ?? 0), 0) /
            completedSessions.length
        )
      : 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/questions')}>
            <Statistic
              title="题库总数"
              value={questions.length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/interview')}>
            <Statistic
              title="面试次数"
              value={completedSessions.length}
              prefix={<VideoCameraOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/review')}>
            <Statistic
              title="待复习题目"
              value={todayReviews.length}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均得分"
              value={avgScore}
              suffix="分"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: avgScore >= 60 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card
            title="快速开始"
            extra={<Button type="link" onClick={() => navigate('/interview')}>查看全部</Button>}
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate('/interview/new')}
              >
                开始模拟面试
              </Button>
              <Button
                size="large"
                icon={<EditOutlined />}
                onClick={() => navigate('/practice')}
              >
                刷题
              </Button>
              <Button size="large" onClick={() => navigate('/questions')}>
                浏览题库
              </Button>
              <Button size="large" onClick={() => navigate('/review')}>
                错题复盘
              </Button>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="今日待复习">
            {todayReviews.length > 0 ? (
              <List
                size="small"
                dataSource={todayReviews.slice(0, 5)}
                renderItem={(item) => {
                  const question = questions.find((q) => q.id === item.questionId);
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={question?.title || '未知题目'}
                        description={`得分: ${item.aiScore.totalScore} | 复习次数: ${item.reviewCount}`}
                      />
                      <Button size="small" onClick={() => navigate(`/review/${item.id}`)}>
                        复习
                      </Button>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="暂无待复习题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {activePlan && (
        <Card title={`当前计划: ${activePlan.name}`} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="目标日期"
                value={dayjs(activePlan.targetDate).format('MM/DD')}
                suffix={`(还有${dayjs(activePlan.targetDate).diff(dayjs(), 'day')}天)`}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="任务进度"
                value={activePlan.progress.completedTasks}
                suffix={`/ ${activePlan.progress.totalTasks}`}
              />
            </Col>
            <Col span={6}>
              <Statistic title="目标岗位" value={activePlan.targetPosition} />
            </Col>
            <Col span={6} style={{ display: 'flex', alignItems: 'center' }}>
              <Button type="primary" onClick={() => navigate(`/plans/${activePlan.id}`)}>
                查看详情
              </Button>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}

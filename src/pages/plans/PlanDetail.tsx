import { useEffect } from 'react';
import {
  Card, Button, Space, Tag, Progress, List, Statistic, Row, Col,
  Typography, Empty, message,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, ForwardOutlined, CalendarOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlanStore } from '../../stores/usePlanStore';
import { formatDate, daysBetween, isToday } from '../../utils/date';
import { ExportService } from '../../services/ExportService';
import type { PlanTask } from '../../models/plan';

const { Title, Text } = Typography;

const taskTypeLabels: Record<string, { text: string; color: string }> = {
  practice_questions: { text: '练习题', color: 'blue' },
  mock_interview: { text: '模拟面试', color: 'purple' },
  review: { text: '复习错题', color: 'orange' },
  read_material: { text: '阅读材料', color: 'cyan' },
};

export default function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { plans, completeTask, skipTask } = usePlanStore();

  const plan = plans.find((p) => p.id === id);

  if (!plan) {
    return <Empty description="未找到该计划" />;
  }

  const todayTasks = plan.tasks.filter((t) => isToday(t.scheduledDate));
  const pendingTasks = plan.tasks.filter((t) => t.status === 'pending');
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed');
  const daysLeft = daysBetween(new Date(), plan.targetDate);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/plans')} />
            <span>{plan.name}</span>
          </Space>
        }
        extra={
          <Button
            icon={<FilePdfOutlined />}
            onClick={async () => {
              try {
                await ExportService.exportStudyPlan(plan);
                message.success('计划已导出');
              } catch {
                message.error('导出失败，请重试');
              }
            }}
          >
            导出计划
          </Button>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="目标日期"
              value={formatDate(plan.targetDate, 'MM/DD')}
              suffix={daysLeft > 0 ? `(还有${daysLeft}天)` : '(已过期)'}
              valueStyle={{ color: daysLeft > 7 ? '#1677ff' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic title="总进度" value={plan.progress.completedTasks} suffix={`/ ${plan.progress.totalTasks} 任务`} />
          </Col>
          <Col span={6}>
            <Statistic title="连续学习" value={plan.progress.streakDays} suffix="天" />
          </Col>
          <Col span={6}>
            <Statistic title="平均得分" value={plan.progress.averageScore} suffix="分" />
          </Col>
        </Row>

        <Progress
          percent={plan.progress.totalTasks > 0 ? Math.round((plan.progress.completedTasks / plan.progress.totalTasks) * 100) : 0}
          status="active"
          style={{ marginBottom: 24 }}
        />

        <Title level={5}>
          <CalendarOutlined /> 今日任务
          <Tag style={{ marginLeft: 8 }}>{todayTasks.filter((t) => t.status === 'completed').length}/{todayTasks.length}</Tag>
        </Title>

        {todayTasks.length === 0 ? (
          <Empty description="今天没有安排任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={todayTasks}
            renderItem={(task) => (
              <List.Item
                actions={[
                  task.status === 'pending' ? (
                    <Space key="actions">
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => completeTask(plan.id, task.id)}
                      >
                        完成
                      </Button>
                      <Button
                        size="small"
                        icon={<ForwardOutlined />}
                        onClick={() => skipTask(plan.id, task.id)}
                      >
                        跳过
                      </Button>
                    </Space>
                  ) : (
                    <Tag key="status" color={task.status === 'completed' ? 'green' : 'default'}>
                      {task.status === 'completed' ? '已完成' : '已跳过'}
                    </Tag>
                  ),
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={taskTypeLabels[task.type]?.color || 'default'}>
                        {taskTypeLabels[task.type]?.text || task.type}
                      </Tag>
                      <span style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </Space>
                  }
                  description={task.description}
                />
              </List.Item>
            )}
          />
        )}

        {pendingTasks.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 24 }}>待完成任务 ({pendingTasks.length})</Title>
            <List
              size="small"
              dataSource={pendingTasks.slice(0, 10)}
              renderItem={(task) => (
                <List.Item>
                  <Space>
                    <Tag color={taskTypeLabels[task.type]?.color}>
                      {taskTypeLabels[task.type]?.text}
                    </Tag>
                    <Text>{task.title}</Text>
                    <Text type="secondary">{formatDate(task.scheduledDate, 'MM/DD')}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </>
        )}
      </Card>
    </div>
  );
}

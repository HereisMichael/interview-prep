import { useEffect } from 'react';
import {
  Card, List, Tag, Button, Progress, Space, Empty, Modal, Form,
  Input, DatePicker, InputNumber, message,
} from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../../stores/usePlanStore';
import { formatDate, daysBetween } from '../../utils/date';
import type { StudyPlan } from '../../models/plan';
import dayjs from 'dayjs';

export default function PlanList() {
  const navigate = useNavigate();
  const { plans, fetchPlans, createPlan, deletePlan, updatePlanStatus } = usePlanStore();
  const [modal, modalCtx] = Modal.useModal();
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = () => {
    modal.confirm({
      title: '创建面试计划',
      content: (
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="计划名称" rules={[{ required: true }]}>
            <Input placeholder="如：阿里云SA面试冲刺" />
          </Form.Item>
          <Form.Item name="targetDate" label="目标面试日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="position" label="目标岗位" rules={[{ required: true }]}>
            <Input placeholder="如：解决方案架构师" />
          </Form.Item>
          <Form.Item name="company" label="目标公司">
            <Input placeholder="如：阿里云" />
          </Form.Item>
          <Form.Item name="questionsPerDay" label="每日练习题目数" initialValue={3}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="mocksPerWeek" label="每周模拟面试次数" initialValue={1}>
            <InputNumber min={0} max={7} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const values = await form.validateFields();
        await createPlan(
          values.name,
          values.targetDate.toISOString(),
          values.position,
          {
            questionsPerDay: values.questionsPerDay || 3,
            mockInterviewsPerWeek: values.mocksPerWeek || 1,
            reviewItemsPerDay: 2,
          },
          values.company
        );
        message.success('计划已创建');
        form.resetFields();
      },
      width: 500,
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {modalCtx}
      <Card
        title="面试计划"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建计划
          </Button>
        }
      >
        {plans.length === 0 ? (
          <Empty description="暂无面试计划，创建一个开始备考吧" />
        ) : (
          <List
            dataSource={plans}
            renderItem={(plan) => {
              const daysLeft = daysBetween(new Date(), plan.targetDate);
              const progressPercent = plan.progress.totalTasks > 0
                ? Math.round((plan.progress.completedTasks / plan.progress.totalTasks) * 100)
                : 0;

              return (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      onClick={() => navigate(`/plans/${plan.id}`)}
                    >
                      查看详情
                    </Button>,
                    plan.status === 'active' ? (
                      <Button
                        key="pause"
                        type="link"
                        onClick={() => updatePlanStatus(plan.id, 'paused')}
                      >
                        暂停
                      </Button>
                    ) : (
                      <Button
                        key="resume"
                        type="link"
                        onClick={() => updatePlanStatus(plan.id, 'active')}
                      >
                        恢复
                      </Button>
                    ),
                    <Button
                      key="delete"
                      type="link"
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: '确认删除该计划？',
                          onOk: () => {
                            deletePlan(plan.id);
                            message.success('已删除');
                          },
                        });
                      }}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{plan.name}</span>
                        <Tag color={plan.status === 'active' ? 'green' : plan.status === 'paused' ? 'orange' : 'default'}>
                          {plan.status === 'active' ? '进行中' : plan.status === 'paused' ? '已暂停' : '已完成'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <CalendarOutlined />
                          <span>目标: {formatDate(plan.targetDate, 'YYYY-MM-DD')}</span>
                          <span>（还有 {daysLeft > 0 ? daysLeft : 0} 天）</span>
                          <span>|</span>
                          <span>{plan.targetPosition}{plan.targetCompany ? ` @ ${plan.targetCompany}` : ''}</span>
                        </Space>
                        <Progress
                          percent={progressPercent}
                          size="small"
                          format={() => `${plan.progress.completedTasks}/${plan.progress.totalTasks} 任务`}
                        />
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

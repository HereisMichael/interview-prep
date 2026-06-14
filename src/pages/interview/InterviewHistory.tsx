import { useEffect } from 'react';
import { Table, Card, Tag, Button, Space, Empty } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { formatDate } from '../../utils/date';
import { getScoreColor, getScoreLabel } from '../../utils/scoring';
import type { InterviewSession } from '../../models/interview';
import type { ColumnsType } from 'antd/es/table';

export default function InterviewHistory() {
  const navigate = useNavigate();
  const { sessions, fetchSessions, deleteSession } = useInterviewStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const columns: ColumnsType<InterviewSession> = [
    {
      title: '面试时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 180,
      render: (d: string) => formatDate(d),
    },
    {
      title: '模式',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: string) => <Tag color={t === 'mock' ? 'blue' : 'green'}>{t === 'mock' ? '模拟面试' : '自由练习'}</Tag>,
    },
    {
      title: '题目数',
      key: 'questionCount',
      width: 80,
      render: (_: unknown, r: InterviewSession) => r.questions.length,
    },
    {
      title: '总分',
      key: 'totalScore',
      width: 100,
      render: (_: unknown, r: InterviewSession) =>
        r.overallScore ? (
          <span style={{ color: getScoreColor(r.overallScore.totalScore), fontWeight: 600 }}>
            {r.overallScore.totalScore}分 ({getScoreLabel(r.overallScore.totalScore)})
          </span>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'in_progress' ? 'blue' : 'default'}>
          {s === 'completed' ? '已完成' : s === 'in_progress' ? '进行中' : '已放弃'}
        </Tag>
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (d?: number) => d ? `${Math.floor(d / 60)}分${d % 60}秒` : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, r: InterviewSession) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/interview/${r.id}/result`)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteSession(r.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title="面试历史"
        extra={
          <Button type="primary" onClick={() => navigate('/interview/new')}>
            新面试
          </Button>
        }
      >
        {sessions.length === 0 ? (
          <Empty description="暂无面试记录" />
        ) : (
          <Table
            columns={columns}
            dataSource={sessions}
            rowKey="id"
            size="middle"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}

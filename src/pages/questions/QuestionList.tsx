import { useState, useEffect } from 'react';
import {
  Table, Input, Select, Tag, Button, Space, Card, Modal, message, Tooltip, Badge,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, StarOutlined, StarFilled,
  DeleteOutlined, EditOutlined, ImportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';
import type { Question, QuestionCategory, Difficulty } from '../../models/question';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const difficultyLabels: Record<Difficulty, { text: string; color: string }> = {
  easy: { text: '简单', color: 'green' },
  medium: { text: '中等', color: 'orange' },
  hard: { text: '困难', color: 'red' },
};

export default function QuestionList() {
  const navigate = useNavigate();
  const {
    questions, loading, searchKeyword, filters,
    fetchQuestions, setSearchKeyword, setFilters,
    toggleStar, deleteQuestion, getFilteredQuestions,
  } = useQuestionStore();

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filteredQuestions = getFilteredQuestions();

  const columns: ColumnsType<Question> = [
    {
      title: '题目',
      dataIndex: 'title',
      key: 'title',
      width: 360,
      ellipsis: true,
      render: (text: string, record: Question) => (
        <Space>
          <Button type="link" style={{ padding: 0, textAlign: 'left' }} onClick={() => navigate(`/questions/${record.id}`)}>
            {text}
          </Button>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat: QuestionCategory) => (
        <Tag color={CATEGORY_COLORS[cat]}>{CATEGORIES[cat]}</Tag>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (d: Difficulty) => (
        <Tag color={difficultyLabels[d].color}>{difficultyLabels[d].text}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: Question['tags']) =>
        tags.slice(0, 3).map((t) => (
          <Tag key={`${t.key}-${t.value}`} style={{ marginBottom: 2 }}>{t.value}</Tag>
        )),
    },
    {
      title: '练习',
      dataIndex: ['stats', 'timesAttempted'],
      key: 'attempts',
      width: 70,
      render: (n: number) => <Badge count={n} showZero color="#1677ff" />,
    },
    {
      title: '平均分',
      dataIndex: ['stats', 'averageScore'],
      key: 'avgScore',
      width: 80,
      render: (score: number) => (
        <span style={{ color: score >= 60 ? '#52c41a' : score > 0 ? '#ff4d4f' : '#999' }}>
          {score > 0 ? score : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Question) => (
        <Space>
          <Tooltip title={record.starred ? '取消收藏' : '收藏'}>
            <Button
              type="text"
              size="small"
              icon={record.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={() => toggleStar(record.id)}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/questions/${record.id}/edit`)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定删除题目"${record.title}"吗？`,
                onOk: () => {
                  deleteQuestion(record.id);
                  message.success('已删除');
                },
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="搜索题目..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            value={filters.category}
            onChange={(v) => setFilters({ ...filters, category: v })}
            allowClear
            style={{ width: 180 }}
          >
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <Option key={key} value={key}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="难度"
            value={filters.difficulty}
            onChange={(v) => setFilters({ ...filters, difficulty: v })}
            allowClear
            style={{ width: 120 }}
          >
            <Option value="easy">简单</Option>
            <Option value="medium">中等</Option>
            <Option value="hard">困难</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button
            icon={<ImportOutlined />}
            onClick={() => navigate('/questions/import')}
          >
            导入
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/questions/new')}
          >
            新增题目
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredQuestions}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 15, showTotal: (total) => `共 ${total} 题` }}
        />
      </Card>
    </div>
  );
}

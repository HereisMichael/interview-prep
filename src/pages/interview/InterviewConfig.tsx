import { useState, useEffect } from 'react';
import {
  Card, Form, Select, InputNumber, Switch, Button, Space, Tag, Radio, message, Alert,
} from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CATEGORIES } from '../../constants/categories';
import type { InterviewConfig, InterviewerStyle, InterviewMode } from '../../models/interview';
import type { QuestionCategory, Difficulty } from '../../models/question';
import { DEFAULT_INTERVIEW_CONFIG } from '../../constants/defaults';

export default function InterviewConfig() {
  const navigate = useNavigate();
  const { questions, fetchQuestions } = useQuestionStore();
  const { startInterview } = useInterviewStore();
  const { aiConfig } = useSettingsStore();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_INTERVIEW_CONFIG);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleStart = async () => {
    if (!aiConfig.apiKey) {
      message.error('请先在设置中配置 AI API Key');
      navigate('/settings');
      return;
    }

    let questionIds: string[];
    const filtered = getFilteredQuestions();

    if (config.mode === 'targeted' && selectedIds.length > 0) {
      questionIds = selectedIds;
    } else if (config.mode === 'random') {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      questionIds = shuffled.slice(0, config.questionCount).map((q) => q.id);
    } else {
      questionIds = filtered.slice(0, config.questionCount).map((q) => q.id);
    }

    if (questionIds.length === 0) {
      message.warning('没有匹配的题目，请调整筛选条件');
      return;
    }

    const session = await startInterview(config, questionIds);
    navigate(`/interview/${session.id}`);
  };

  const getFilteredQuestions = () => {
    let filtered = [...questions];
    if (config.filters?.categories?.length) {
      filtered = filtered.filter((q) => config.filters!.categories!.includes(q.category));
    }
    if (config.filters?.difficulty?.length) {
      filtered = filtered.filter((q) => config.filters!.difficulty!.includes(q.difficulty));
    }
    if (config.filters?.tags?.length) {
      filtered = filtered.filter((q) =>
        q.tags.some((t) => config.filters!.tags!.includes(t.value))
      );
    }
    return filtered;
  };

  const filteredCount = getFilteredQuestions().length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {!aiConfig.apiKey && (
        <Alert
          message="未配置 AI API Key"
          description="请先在设置页面配置 API Key 才能开始模拟面试"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => navigate('/settings')}>去设置</Button>}
        />
      )}

      <Card title="面试配置">
        <Form layout="vertical">
          <Form.Item label="抽题模式">
            <Radio.Group
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as InterviewMode })}
            >
              <Radio.Button value="random">随机抽题</Radio.Button>
              <Radio.Button value="sequential">顺序模式</Radio.Button>
              <Radio.Button value="targeted">自选题目</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {config.mode !== 'targeted' && (
            <Form.Item label="题目数量">
              <InputNumber
                min={1}
                max={Math.min(20, filteredCount)}
                value={config.questionCount}
                onChange={(v) => setConfig({ ...config, questionCount: v || 5 })}
              />
              <span style={{ marginLeft: 8, color: '#999' }}>
                当前筛选条件下共 {filteredCount} 题
              </span>
            </Form.Item>
          )}

          <Form.Item label="筛选条件">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                mode="multiple"
                placeholder="按分类筛选"
                value={config.filters?.categories}
                onChange={(v) => setConfig({
                  ...config,
                  filters: { ...config.filters, categories: v as QuestionCategory[] },
                })}
              >
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <Select.Option key={key} value={key}>{label}</Select.Option>
                ))}
              </Select>
              <Select
                mode="multiple"
                placeholder="按难度筛选"
                value={config.filters?.difficulty}
                onChange={(v) => setConfig({
                  ...config,
                  filters: { ...config.filters, difficulty: v as Difficulty[] },
                })}
              >
                <Select.Option value="easy">简单</Select.Option>
                <Select.Option value="medium">中等</Select.Option>
                <Select.Option value="hard">困难</Select.Option>
              </Select>
            </Space>
          </Form.Item>

          <Form.Item label="面试官风格">
            <Radio.Group
              value={config.aiInterviewerStyle}
              onChange={(e) => setConfig({ ...config, aiInterviewerStyle: e.target.value as InterviewerStyle })}
            >
              <Radio.Button value="neutral">专业中立</Radio.Button>
              <Radio.Button value="friendly">友善引导</Radio.Button>
              <Radio.Button value="strict">严格追问</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Space size="large">
            <Form.Item label="开启追问">
              <Switch
                checked={config.enableFollowUp}
                onChange={(v) => setConfig({ ...config, enableFollowUp: v })}
              />
            </Form.Item>

            {config.enableFollowUp && (
              <Form.Item label="最大追问轮数">
                <InputNumber
                  min={1}
                  max={5}
                  value={config.maxFollowUpRounds}
                  onChange={(v) => setConfig({ ...config, maxFollowUpRounds: v || 2 })}
                />
              </Form.Item>
            )}

            <Form.Item label="每题限时 (秒, 0=不限时)">
              <InputNumber
                min={0}
                max={600}
                step={30}
                value={config.timePerQuestion}
                onChange={(v) => setConfig({ ...config, timePerQuestion: v || 0 })}
              />
            </Form.Item>
          </Space>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={!aiConfig.apiKey}
            style={{ minWidth: 200 }}
          >
            开始面试
          </Button>
        </div>
      </Card>
    </div>
  );
}

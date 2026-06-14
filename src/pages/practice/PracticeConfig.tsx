import { useState, useEffect, useMemo } from 'react';
import {
  Card, Segmented, Select, Button, Row, Col,
  Tag, Space, Typography, Divider, Radio, message,
} from 'antd';
import {
  ThunderboltOutlined, SwapOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useReviewStore } from '../../stores/useReviewStore';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';
import { PRESET_TAGS } from '../../constants/tags';
import type { QuestionCategory, Difficulty, Question } from '../../models/question';

const { Title, Text } = Typography;

type PracticeMode = 'quick' | 'flashcard';
type Strategy = 'random' | 'weakness' | 'sequential';

export default function PracticeConfig() {
  const navigate = useNavigate();
  const questions = useQuestionStore((s) => s.questions);
  const reviewItems = useReviewStore((s) => s.items);
  const { fetchQuestions } = useQuestionStore();
  const { fetchReviews } = useReviewStore();

  const [mode, setMode] = useState<PracticeMode>('quick');
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [tagValues, setTagValues] = useState<string[]>([]);
  const [count, setCount] = useState<number>(10);
  const [strategy, setStrategy] = useState<Strategy>('random');

  useEffect(() => {
    if (questions.length === 0) fetchQuestions();
    if (reviewItems.length === 0) fetchReviews();
  }, []);

  const filteredQuestions = useMemo(() => {
    let filtered = [...questions];
    if (categories.length > 0) {
      filtered = filtered.filter((q) => categories.includes(q.category));
    }
    if (difficulties.length > 0) {
      filtered = filtered.filter((q) => difficulties.includes(q.difficulty));
    }
    if (tagValues.length > 0) {
      filtered = filtered.filter((q) =>
        q.tags.some((t) => tagValues.includes(t.value))
      );
    }
    return filtered;
  }, [questions, categories, difficulties, tagValues]);

  const selectQuestions = (): Question[] => {
    const pool = [...filteredQuestions];
    if (pool.length === 0) return [];

    const actualCount = Math.min(count, pool.length);

    if (strategy === 'sequential') {
      return pool.slice(0, actualCount);
    }

    if (strategy === 'weakness') {
      // Prioritize: never attempted > low average score > review items
      const reviewed = reviewItems.filter((r) => r.reviewStatus !== 'mastered');
      const reviewQuestionIds = new Set(reviewed.map((r) => r.questionId));

      const scored = pool.map((q) => {
        let priority = 0;
        if (q.stats.timesAttempted === 0) priority = 100;
        else if (reviewQuestionIds.has(q.id)) priority = 80;
        else priority = Math.max(0, 100 - q.stats.averageScore);
        return { question: q, priority };
      });

      scored.sort((a, b) => b.priority - a.priority);
      return scored.slice(0, actualCount).map((s) => s.question);
    }

    // Random
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, actualCount);
  };

  const handleStart = () => {
    const selected = selectQuestions();
    if (selected.length === 0) {
      message.warning('没有符合条件的题目，请调整筛选条件');
      return;
    }

    const questionIds = selected.map((q) => q.id);

    if (mode === 'flashcard') {
      navigate('/practice/flashcard', { state: { questionIds } });
    } else {
      navigate('/practice/start', { state: { questionIds } });
    }
  };

  const allTagValues = useMemo(() => {
    const vals = new Set<string>();
    Object.values(PRESET_TAGS).forEach((arr) => arr.forEach((v) => vals.add(v)));
    return Array.from(vals);
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 16 }}>刷题模式</Title>
          <Segmented
            size="large"
            value={mode}
            onChange={(v) => setMode(v as PracticeMode)}
            options={[
              {
                label: (
                  <span>
                    <ThunderboltOutlined /> 快速刷题
                  </span>
                ),
                value: 'quick',
              },
              {
                label: (
                  <span>
                    <SwapOutlined /> 闪卡模式
                  </span>
                ),
                value: 'flashcard',
              },
            ]}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              {mode === 'quick'
                ? '逐题作答 → AI评分 → 查看解析'
                : '看题思考 → 翻转看答案 → 自评掌握程度'}
            </Text>
          </div>
        </div>

        <Divider />

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>题目分类</Text>
          <Select
            mode="multiple"
            placeholder="全部分类"
            style={{ width: '100%' }}
            value={categories}
            onChange={setCategories}
            allowClear
            options={Object.entries(CATEGORIES).map(([k, v]) => ({
              label: <Tag color={CATEGORY_COLORS[k as QuestionCategory]}>{v}</Tag>,
              value: k,
            }))}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>难度</Text>
          <Select
            mode="multiple"
            placeholder="全部难度"
            style={{ width: '100%' }}
            value={difficulties}
            onChange={setDifficulties}
            allowClear
            options={[
              { label: <Tag color="green">简单</Tag>, value: 'easy' },
              { label: <Tag color="orange">中等</Tag>, value: 'medium' },
              { label: <Tag color="red">困难</Tag>, value: 'hard' },
            ]}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>标签筛选</Text>
          <Select
            mode="multiple"
            placeholder="全部标签"
            style={{ width: '100%' }}
            value={tagValues}
            onChange={setTagValues}
            allowClear
            maxTagCount={5}
            options={allTagValues.map((v) => ({ label: v, value: v }))}
          />
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>题目数量</Text>
              <Radio.Group
                value={count}
                onChange={(e) => setCount(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                {[5, 10, 15, 20].map((n) => (
                  <Radio.Button key={n} value={n}>{n}题</Radio.Button>
                ))}
              </Radio.Group>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>出题策略</Text>
              <Radio.Group
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value="random">随机出题</Radio>
                  <Radio value="weakness">按薄弱度（优先错题和未做过的）</Radio>
                  <Radio value="sequential">按顺序</Radio>
                </Space>
              </Radio.Group>
            </div>
          </Col>
        </Row>

        <Divider />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Space>
            <Text type="secondary">
              符合条件的题目: <Text strong>{filteredQuestions.length}</Text> 道
            </Text>
            <Text type="secondary">
              本次练习: <Text strong>{Math.min(count, filteredQuestions.length)}</Text> 道
            </Text>
          </Space>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={filteredQuestions.length === 0}
          >
            {mode === 'quick' ? '开始刷题' : '开始闪卡'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

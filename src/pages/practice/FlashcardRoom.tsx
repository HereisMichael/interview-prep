import { useState, useEffect, useMemo } from 'react';
import {
  Card, Button, Typography, Tag, Progress,
  Row, Col, Statistic, Space, Input,
} from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined,
  FrownOutlined, MehOutlined, SmileOutlined,
  HomeOutlined, RedoOutlined, BugOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useReviewStore } from '../../stores/useReviewStore';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';
import type { Question } from '../../models/question';

const { Title, Text } = Typography;
const { TextArea } = Input;

type SelfEval = 'miss' | 'fuzzy' | 'master';

interface FlashcardResult {
  questionId: string;
  eval?: SelfEval;
  note?: string;
}

export default function FlashcardRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const questionIds = (location.state as { questionIds?: string[] })?.questionIds;

  const questions = useQuestionStore((s) => s.questions);
  const { updateQuestion, fetchQuestions } = useQuestionStore();
  const { addReview } = useReviewStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<FlashcardResult[]>([]);
  const [note, setNote] = useState('');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!questionIds || questionIds.length === 0) {
      navigate('/practice');
      return;
    }
    if (questions.length === 0) fetchQuestions();
    if (questions.length > 0) {
      setResults(questionIds.map((id) => ({ questionId: id })));
    }
  }, [questionIds]);

  const currentQuestion: Question | undefined = questionIds
    ? questions.find((q) => q.id === questionIds[currentIndex])
    : undefined;

  const totalCount = questionIds?.length ?? 0;

  const stats = useMemo(() => {
    const evaluated = results.filter((r) => r.eval);
    return {
      mastered: evaluated.filter((r) => r.eval === 'master').length,
      fuzzy: evaluated.filter((r) => r.eval === 'fuzzy').length,
      miss: evaluated.filter((r) => r.eval === 'miss').length,
      total: evaluated.length,
    };
  }, [results]);

  const handleSelfEval = async (evalType: SelfEval) => {
    if (!currentQuestion) return;

    const newResults = [...results];
    newResults[currentIndex] = {
      questionId: currentQuestion.id,
      eval: evalType,
      note: note || undefined,
    };
    setResults(newResults);

    // Update question stats
    const oldStats = currentQuestion.stats;
    const isCorrect = evalType === 'master';
    await updateQuestion(currentQuestion.id, {
      stats: {
        timesAttempted: oldStats.timesAttempted + 1,
        timesCorrect: oldStats.timesCorrect + (isCorrect ? 1 : 0),
        averageScore: oldStats.timesAttempted === 0
          ? (isCorrect ? 100 : 30)
          : Math.round(
              (oldStats.averageScore * oldStats.timesAttempted + (isCorrect ? 100 : 30)) /
                (oldStats.timesAttempted + 1)
            ),
        lastAttemptedAt: new Date().toISOString(),
      },
    });

    // Add to review if "miss" or "fuzzy"
    if (evalType === 'miss' || evalType === 'fuzzy') {
      await addReview(
        currentQuestion.id,
        `flashcard-${Date.now()}`,
        note || '(闪卡自评)',
        {
          totalScore: evalType === 'miss' ? 20 : 50,
          dimensions: [],
          overallComment: evalType === 'miss' ? '闪卡自评: 不会' : '闪卡自评: 模糊',
          suggestedAnswer: currentQuestion.referenceAnswer || '',
          isCorrect: false,
        },
        currentQuestion.tags.map((t) => t.value)
      );
    }

    setNote('');
    setIsFlipped(false);

    // Move to next or finish
    if (currentIndex < totalCount - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 300);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setNote(results[currentIndex - 1]?.note || '');
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setNote(results[currentIndex + 1]?.note || '');
    }
  };

  if (!currentQuestion && !finished) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  // Finished view
  if (finished) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Card>
          <Title level={3} style={{ textAlign: 'center' }}>闪卡完成！</Title>
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic
                title="掌握"
                value={stats.mastered}
                valueStyle={{ color: '#52c41a' }}
                prefix={<SmileOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="模糊"
                value={stats.fuzzy}
                valueStyle={{ color: '#faad14' }}
                prefix={<MehOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="不会"
                value={stats.miss}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<FrownOutlined />}
              />
            </Col>
          </Row>

          <div style={{ textAlign: 'center' }}>
            <Space size="middle">
              <Button
                type="primary"
                icon={<RedoOutlined />}
                onClick={() => navigate('/practice')}
              >
                再来一轮
              </Button>
              {stats.miss > 0 && (
                <Button icon={<BugOutlined />} onClick={() => navigate('/review')}>
                  查看错题
                </Button>
              )}
              <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
                返回首页
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Stats Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <Text strong>{currentIndex + 1} / {totalCount}</Text>
            <Progress
              percent={Math.round(((currentIndex) / totalCount) * 100)}
              size="small"
              style={{ width: 120, margin: 0 }}
            />
          </Space>
          <Space>
            <Tag color="#52c41a">掌握 {stats.mastered}</Tag>
            <Tag color="#faad14">模糊 {stats.fuzzy}</Tag>
            <Tag color="#ff4d4f">不会 {stats.miss}</Tag>
          </Space>
        </div>
      </Card>

      {/* Flashcard */}
      <div
        style={{
          perspective: '1000px',
          height: 420,
          marginBottom: 16,
        }}
      >
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.3s ease',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer',
          }}
        >
          {/* Front */}
          <Card
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Tag color={CATEGORY_COLORS[currentQuestion!.category]}>
                  {CATEGORIES[currentQuestion!.category]}
                </Tag>
                <Tag color={currentQuestion!.difficulty === 'hard' ? 'red' : currentQuestion!.difficulty === 'medium' ? 'orange' : 'green'}>
                  {currentQuestion!.difficulty === 'hard' ? '困难' : currentQuestion!.difficulty === 'medium' ? '中等' : '简单'}
                </Tag>
              </Space>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Title level={4} style={{ textAlign: 'center' }}>
                {currentQuestion!.title}
              </Title>
              {currentQuestion!.content && (
                <div style={{ color: '#666', marginTop: 12, padding: '0 16px' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentQuestion!.content.split('\n')[0]}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                先想想，点击卡片翻转查看答案
              </Text>
            </div>
          </Card>

          {/* Back */}
          <Card
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              overflow: 'auto',
              background: '#fafafa',
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong>参考答案：</Text>
            </div>
            <div style={{ flex: 1 }}>
              {currentQuestion!.referenceAnswer ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentQuestion!.referenceAnswer}
                </ReactMarkdown>
              ) : (
                <Text type="secondary">此题暂无参考答案，请根据自己的理解组织答案。</Text>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>添加笔记（可选）：</Text>
              <TextArea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记录你的理解和要点..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Controls */}
      {!isFlipped ? (
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button onClick={handlePrev} disabled={currentIndex === 0} icon={<ArrowLeftOutlined />}>
              上一张
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => setIsFlipped(true)}
            >
              翻转看答案
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentIndex >= totalCount - 1}
              icon={<ArrowRightOutlined />}
            >
              下一张
            </Button>
          </Space>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            你觉得这道题掌握得怎么样？
          </Text>
          <Space size="middle">
            <Button
              danger
              size="large"
              icon={<FrownOutlined />}
              onClick={() => handleSelfEval('miss')}
            >
              不会
            </Button>
            <Button
              size="large"
              style={{ borderColor: '#faad14', color: '#faad14' }}
              icon={<MehOutlined />}
              onClick={() => handleSelfEval('fuzzy')}
            >
              模糊
            </Button>
            <Button
              type="primary"
              size="large"
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              icon={<SmileOutlined />}
              onClick={() => handleSelfEval('master')}
            >
              掌握
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}

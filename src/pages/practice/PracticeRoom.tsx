import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Input, Typography, Tag, Progress,
  Space, message, Spin, Collapse,
} from 'antd';
import {
  CheckOutlined, StarOutlined, StarFilled,
  ArrowRightOutlined, ArrowLeftOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useReviewStore } from '../../stores/useReviewStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { AIService } from '../../services/AIService';
import { buildPracticeScoringPrompt } from '../../ai/prompts/interviewer';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';
import { PASS_SCORE } from '../../constants/defaults';
import type { Question } from '../../models/question';
import type { QuestionScore } from '../../models/interview';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface PracticeResult {
  questionId: string;
  userAnswer: string;
  score: QuestionScore | null;
  timeSpent: number;
}

export default function PracticeRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const questionIds = (location.state as { questionIds?: string[] })?.questionIds;

  const questions = useQuestionStore((s) => s.questions);
  const { updateQuestion, fetchQuestions } = useQuestionStore();
  const { addReview } = useReviewStore();
  const { aiConfig } = useSettingsStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [showScore, setShowScore] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!questionIds || questionIds.length === 0) {
      navigate('/practice');
      return;
    }
    if (questions.length === 0) fetchQuestions();
    if (questions.length > 0) {
      setResults(
        questionIds.map((id) => ({
          questionId: id,
          userAnswer: '',
          score: null,
          timeSpent: 0,
        }))
      );
    }
  }, [questionIds]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentIndex]);

  const currentQuestion: Question | undefined = questionIds
    ? questions.find((q) => q.id === questionIds[currentIndex])
    : undefined;

  const currentResult = results[currentIndex];
  const totalCount = questionIds?.length ?? 0;
  const answeredCount = results.filter((r) => r.score !== null).length;

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入你的回答');
      return;
    }
    if (!currentQuestion) return;

    setIsLoading(true);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    try {
      const aiService = new AIService(aiConfig);
      const prompt = buildPracticeScoringPrompt(currentQuestion, inputValue);
      const response = await aiService.chat([
        { role: 'system', content: prompt },
      ]);

      const parsed = AIService.extractJsonFromResponse(response) as QuestionScore | null;

      if (!parsed || typeof parsed.totalScore !== 'number') {
        message.error('AI评分解析失败，请重试');
        setIsLoading(false);
        return;
      }

      const score: QuestionScore = {
        totalScore: parsed.totalScore,
        dimensions: parsed.dimensions || [],
        overallComment: parsed.overallComment || '',
        suggestedAnswer: parsed.suggestedAnswer || '',
        isCorrect: parsed.isCorrect ?? parsed.totalScore >= PASS_SCORE,
      };

      // Update results
      const newResults = [...results];
      newResults[currentIndex] = {
        questionId: currentQuestion.id,
        userAnswer: inputValue,
        score,
        timeSpent,
      };
      setResults(newResults);
      setShowScore(true);

      // Update question stats
      const oldStats = currentQuestion.stats;
      await updateQuestion(currentQuestion.id, {
        stats: {
          timesAttempted: oldStats.timesAttempted + 1,
          timesCorrect: oldStats.timesCorrect + (score.totalScore >= PASS_SCORE ? 1 : 0),
          averageScore: oldStats.timesAttempted === 0
            ? score.totalScore
            : Math.round(
                (oldStats.averageScore * oldStats.timesAttempted + score.totalScore) /
                  (oldStats.timesAttempted + 1)
              ),
          lastAttemptedAt: new Date().toISOString(),
        },
      });

      // Auto-add to review if below pass score
      if (score.totalScore < PASS_SCORE) {
        await addReview(
          currentQuestion.id,
          `practice-${Date.now()}`,
          inputValue,
          score,
          currentQuestion.tags.map((t) => t.value)
        );
      }
    } catch (err) {
      message.error(`AI评分失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
      setShowScore(false);
      setQuestionStartTime(Date.now());
    } else {
      // All done, navigate to result
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      navigate('/practice/result', {
        state: { results, totalTime, questionIds },
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevResult = results[currentIndex - 1];
      setInputValue(prevResult.userAnswer || '');
      setShowScore(prevResult.score !== null);
    }
  };

  const handleToggleStar = async () => {
    if (!currentQuestion) return;
    await updateQuestion(currentQuestion.id, {
      starred: !currentQuestion.starred,
    });
  };

  const handleSkip = () => {
    // Skip without answering
    const newResults = [...results];
    newResults[currentIndex] = {
      ...newResults[currentIndex],
      userAnswer: inputValue,
      timeSpent: Math.round((Date.now() - questionStartTime) / 1000),
    };
    setResults(newResults);
    handleNext();
  };

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const progress = Math.round((answeredCount / totalCount) * 100);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Progress Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text strong>
            {currentIndex + 1} / {totalCount}
          </Text>
          <Progress
            percent={progress}
            style={{ flex: 1, minWidth: 80, margin: 0 }}
            strokeColor={progress >= 100 ? '#52c41a' : '#1677ff'}
          />
          <Space>
            <Tag color={CATEGORY_COLORS[currentQuestion.category]}>
              {CATEGORIES[currentQuestion.category]}
            </Tag>
            <Tag color={currentQuestion.difficulty === 'hard' ? 'red' : currentQuestion.difficulty === 'medium' ? 'orange' : 'green'}>
              {currentQuestion.difficulty === 'hard' ? '困难' : currentQuestion.difficulty === 'medium' ? '中等' : '简单'}
            </Tag>
          </Space>
        </div>
      </Card>

      {/* Question */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Title level={4} style={{ margin: 0, flex: 1 }}>
            {currentQuestion.title}
          </Title>
          <Button
            type="text"
            icon={currentQuestion.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={handleToggleStar}
          />
        </div>
        {currentQuestion.content && (
          <div style={{ marginTop: 12, color: '#666' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentQuestion.content}
            </ReactMarkdown>
          </div>
        )}
      </Card>

      {/* Answer Area */}
      {!showScore ? (
        <Card>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>你的回答：</Text>
          <TextArea
            ref={textareaRef as any}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="在这里输入你的回答... (Shift+Enter 换行)"
            autoSize={{ minRows: 6, maxRows: 12 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <Button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                icon={<ArrowLeftOutlined />}
              >
                上一题
              </Button>
              <Button onClick={handleSkip} type="text">
                跳过
              </Button>
            </Space>
            <Button
              type="primary"
              icon={isLoading ? <LoadingOutlined /> : <CheckOutlined />}
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!inputValue.trim()}
            >
              {isLoading ? 'AI评分中...' : '提交评分'}
            </Button>
          </div>
        </Card>
      ) : (
        /* Score Card */
        <Card
          style={{
            borderColor: currentResult?.score && currentResult.score.totalScore >= PASS_SCORE
              ? '#52c41a'
              : '#ff4d4f',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: currentResult?.score && currentResult.score.totalScore >= PASS_SCORE
                  ? '#f6ffed'
                  : '#fff2f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: currentResult?.score && currentResult.score.totalScore >= PASS_SCORE
                  ? '#52c41a'
                  : '#ff4d4f',
              }}
            >
              {currentResult?.score?.totalScore}
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {currentResult?.score && currentResult.score.totalScore >= PASS_SCORE
                  ? '回答不错！'
                  : '还需要加强'}
              </Title>
              <Text type="secondary">
                用时 {currentResult?.timeSpent}秒
                {currentResult?.score && currentResult.score.totalScore < PASS_SCORE && ' (已自动加入错题本)'}
              </Text>
            </div>
          </div>

          {/* Dimension Scores */}
          {currentResult?.score?.dimensions && currentResult.score.dimensions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {currentResult.score.dimensions.map((dim, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text>{dim.name}</Text>
                    <Text strong>{dim.score}分</Text>
                  </div>
                  <Progress
                    percent={dim.score}
                    showInfo={false}
                    strokeColor={dim.score >= 80 ? '#52c41a' : dim.score >= 60 ? '#faad14' : '#ff4d4f'}
                    size="small"
                  />
                  {dim.comment && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{dim.comment}</Text>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Overall Comment */}
          {currentResult?.score?.overallComment && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>评价：</Text>
              <Paragraph style={{ marginTop: 4 }}>
                {currentResult.score.overallComment}
              </Paragraph>
            </div>
          )}

          {/* Suggested Answer */}
          {currentResult?.score?.suggestedAnswer && (
            <Collapse
              items={[{
                key: '1',
                label: <Text strong>建议回答</Text>,
                children: (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentResult.score!.suggestedAnswer}
                  </ReactMarkdown>
                ),
              }]}
            />
          )}

          {/* Reference Answer (from question) */}
          {currentQuestion.referenceAnswer && (
            <Collapse
              items={[{
                key: '1',
                label: <Text strong>参考答案</Text>,
                children: (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentQuestion.referenceAnswer!}
                  </ReactMarkdown>
                ),
              }]}
              style={{ marginTop: 8 }}
            />
          )}

          {/* User Answer */}
          <Collapse
            items={[{
              key: '1',
              label: <Text strong>我的回答</Text>,
              children: <Paragraph>{currentResult?.userAnswer}</Paragraph>,
            }]}
            style={{ marginTop: 8 }}
          />

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <Button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                icon={<ArrowLeftOutlined />}
              >
                上一题
              </Button>
              <Button
                onClick={handleToggleStar}
                icon={currentQuestion.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              >
                {currentQuestion.starred ? '已收藏' : '收藏'}
              </Button>
            </Space>
            <Button
              type="primary"
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
            >
              {currentIndex < totalCount - 1 ? '下一题' : '查看结果'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

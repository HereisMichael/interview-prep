import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Input, Space, Typography, Tag, Progress,
  Divider, Statistic, Row, Col, message, Spin, Empty,
} from 'antd';
import {
  SendOutlined, StopOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useReviewStore } from '../../stores/useReviewStore';
import { AIService } from '../../services/AIService';
import { buildInterviewerPrompt, buildSummaryPrompt } from '../../ai/prompts/interviewer';
import { CATEGORIES } from '../../constants/categories';
import type { Question } from '../../models/question';
import type { QuestionScore, OverallScore, ConversationMessage } from '../../models/interview';
import { ExportService } from '../../services/ExportService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function InterviewRoom() {
  const navigate = useNavigate();
  const { id } = useParams();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { currentSession, currentQuestionIndex, addMessage, setQuestionScore, completeSession, setCurrentSession, setCurrentQuestionIndex } = useInterviewStore();
  const { questions } = useQuestionStore();
  const { aiConfig } = useSettingsStore();
  const { addReview } = useReviewStore();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [timeLeft, setTimeLeft] = useState(180);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [overallResult, setOverallResult] = useState<OverallScore | null>(null);

  const currentQuestion = currentSession?.questions[currentQuestionIndex];
  const questionData = currentQuestion
    ? questions.find((q) => q.id === currentQuestion.questionId)
    : null;

  useEffect(() => {
    if (!currentSession && id) {
      // Try to load from sessions
      const sessions = useInterviewStore.getState().sessions;
      const session = sessions.find((s) => s.id === id);
      if (session && session.status === 'in_progress') {
        setCurrentSession(session);
      } else {
        navigate('/interview');
      }
    }
  }, [id, currentSession, navigate, setCurrentSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQuestion?.conversation, streamingText]);

  // Timer
  useEffect(() => {
    if (!currentSession || sessionComplete || isLoading) return;
    if (currentSession.config.timePerQuestion <= 0) return;

    const initialTime = currentSession.config.timePerQuestion;
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, currentSession, sessionComplete, isLoading]);

  const handleTimeUp = async () => {
    if (!inputValue.trim()) {
      addMessage(currentQuestionIndex, {
        role: 'candidate',
        content: '[时间到，未作答]',
      });
    }
    await scoreCurrentQuestion();
  };

  // Start the first question
  useEffect(() => {
    if (currentSession && currentQuestion && currentQuestion.conversation.length === 0 && questionData) {
      askQuestion(questionData);
    }
  }, [currentSession, currentQuestionIndex]);

  const askQuestion = async (question: Question) => {
    if (!aiConfig.apiKey) {
      message.error('请先在设置中配置 AI API Key');
      navigate('/settings');
      return;
    }

    setIsLoading(true);
    setStreamingText('');

    const prompt = buildInterviewerPrompt(question, currentSession!.config.aiInterviewerStyle, {});

    const service = new AIService(aiConfig);
    let fullText = '';

    await service.streamChat(
      [{ role: 'system', content: prompt }],
      {
        onToken: (token) => {
          fullText += token;
          setStreamingText(fullText);
        },
        onComplete: (text) => {
          addMessage(currentQuestionIndex, {
            role: 'interviewer',
            content: text,
          });
          setStreamingText('');
          setIsLoading(false);
        },
        onError: (err) => {
          message.error(`AI 响应失败: ${err.message}`);
          setIsLoading(false);
        },
      }
    );
  };

  const handleSendAnswer = async () => {
    if (!inputValue.trim() || isLoading) return;

    const answer = inputValue.trim();
    setInputValue('');

    addMessage(currentQuestionIndex, {
      role: 'candidate',
      content: answer,
    });

    setIsLoading(true);
    setStreamingText('');

    const service = new AIService(aiConfig);
    const messages = currentQuestion!.conversation
      .concat([{ id: '', role: 'candidate' as const, content: answer, timestamp: '' }])
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // First message was from interviewer (assistant), candidate responses are 'user'
    const chatMessages = [
      { role: 'assistant' as const, content: currentQuestion!.conversation[0]?.content || '' },
      ...messages.filter((_, i) => i > 0),
    ];

    let fullText = '';
    await service.streamChat(chatMessages, {
      onToken: (token) => {
        fullText += token;
        setStreamingText(fullText);
      },
      onComplete: async (text) => {
        setStreamingText('');

        // Check if the AI is asking a follow-up or giving a score
        const jsonResult = AIService.extractJsonFromResponse(text);

        if (jsonResult && jsonResult.totalScore !== undefined) {
          // It's a score
          const score: QuestionScore = {
            totalScore: jsonResult.totalScore as number,
            dimensions: (jsonResult.dimensions as QuestionScore['dimensions']) || [],
            overallComment: (jsonResult.overallComment as string) || '',
            suggestedAnswer: (jsonResult.suggestedAnswer as string) || '',
            isCorrect: (jsonResult.isCorrect as boolean) || false,
          };
          setQuestionScore(currentQuestionIndex, score);

          // Add to review if failed
          if (!score.isCorrect && questionData) {
            const weaknessTags = score.dimensions
              .filter((d) => d.score < 60)
              .map((d) => d.name);
            await addReview(
              questionData.id,
              currentSession!.id,
              answer,
              score,
              weaknessTags
            );
          }

          addMessage(currentQuestionIndex, {
            role: 'system',
            content: `评分: ${score.totalScore}分 - ${score.overallComment}`,
          });

          // Move to next question or finish
          if (currentQuestionIndex < currentSession!.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          } else {
            await finishInterview();
          }
        } else {
          // Follow-up question from AI
          addMessage(currentQuestionIndex, {
            role: 'interviewer',
            content: text,
            isFollowUp: true,
          });
        }

        setIsLoading(false);
      },
      onError: (err) => {
        message.error(`AI 响应失败: ${err.message}`);
        setIsLoading(false);
      },
    });
  };

  const scoreCurrentQuestion = async () => {
    // Auto-score when time runs out
    const service = new AIService(aiConfig);
    const conversation = currentQuestion!.conversation;
    if (conversation.length === 0) {
      const defaultScore: QuestionScore = {
        totalScore: 0,
        dimensions: [],
        overallComment: '未作答',
        suggestedAnswer: '',
        isCorrect: false,
      };
      setQuestionScore(currentQuestionIndex, defaultScore);
      if (currentQuestionIndex < currentSession!.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        await finishInterview();
      }
    }
  };

  const finishInterview = async () => {
    setIsLoading(true);
    const session = currentSession!;
    const scoredQuestions = session.questions.filter((q) => q.score);

    const summaryData = scoredQuestions.map((q) => {
      const qData = questions.find((ques) => ques.id === q.questionId);
      return {
        title: qData?.title || '未知题目',
        score: q.score!.totalScore,
        comment: q.score!.overallComment,
      };
    });

    let overall: OverallScore = {
      totalScore: 0,
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };

    if (summaryData.length > 0) {
      try {
        const service = new AIService(aiConfig);
        const prompt = buildSummaryPrompt(summaryData);
        const response = await service.chat([
          { role: 'system', content: '你是一位技术面试官，请生成面试总结报告。' },
          { role: 'user', content: prompt },
        ]);

        const jsonResult = AIService.extractJsonFromResponse(response);
        if (jsonResult) {
          overall = {
            totalScore: (jsonResult.totalScore as number) || Math.round(summaryData.reduce((s, q) => s + q.score, 0) / summaryData.length),
            strengths: (jsonResult.strengths as string[]) || [],
            weaknesses: (jsonResult.weaknesses as string[]) || [],
            recommendations: (jsonResult.recommendations as string[]) || [],
          };
        }
      } catch {
        overall.totalScore = Math.round(summaryData.reduce((s, q) => s + q.score, 0) / summaryData.length);
      }
    }

    await completeSession(overall);
    setOverallResult(overall);
    setSessionComplete(true);
    setIsLoading(false);
  };

  if (!currentSession || !questionData) {
    return <Empty description="没有找到面试会话" />;
  }

  if (sessionComplete && overallResult) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card title="面试完成!" style={{ textAlign: 'center' }}>
          <Statistic
            title="总分"
            value={overallResult.totalScore}
            suffix="分"
            valueStyle={{
              fontSize: 48,
              color: overallResult.totalScore >= 60 ? '#52c41a' : '#ff4d4f',
            }}
          />
          <Divider />
          <Row gutter={16}>
            <Col span={12}>
              <Card title="优势" size="small">
                {overallResult.strengths.map((s, i) => (
                  <Paragraph key={i}><CheckCircleOutlined style={{ color: '#52c41a' }} /> {s}</Paragraph>
                ))}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="待改进" size="small">
                {overallResult.weaknesses.map((w, i) => (
                  <Paragraph key={i}><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> {w}</Paragraph>
                ))}
              </Card>
            </Col>
          </Row>
          {overallResult.recommendations.length > 0 && (
            <>
              <Divider />
              <Card title="改进建议" size="small">
                {overallResult.recommendations.map((r, i) => (
                  <Paragraph key={i}>
                    <Text strong>{i + 1}.</Text> {r}
                  </Paragraph>
                ))}
              </Card>
            </>
          )}
          <Divider />
          <Space>
            <Button type="primary" onClick={() => navigate('/interview')}>返回首页</Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={async () => {
                try {
                  await ExportService.exportInterviewReport(currentSession!, questions);
                  message.success('报告已导出');
                } catch {
                  message.error('导出失败，请重试');
                }
              }}
            >
              导出报告
            </Button>
            <Button onClick={() => navigate('/review')}>查看错题</Button>
          </Space>
        </Card>
      </div>
    );
  }

  const totalQuestions = currentSession.questions.length;
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <Tag color="blue">第 {currentQuestionIndex + 1}/{totalQuestions} 题</Tag>
            <Tag>{CATEGORIES[questionData.category]}</Tag>
            {currentSession.config.timePerQuestion > 0 && (
              <Tag
                color={timeLeft < 30 ? 'red' : timeLeft < 60 ? 'orange' : 'green'}
                icon={<ClockCircleOutlined />}
              >
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Button danger onClick={() => { navigate('/interview'); }} icon={<StopOutlined />}>
            结束面试
          </Button>
        }
      >
        <Progress percent={progressPercent} showInfo={false} strokeColor="#1677ff" />

        {/* Chat area */}
        <div
          style={{
            height: 400,
            overflowY: 'auto',
            padding: '16px 0',
            marginTop: 16,
            borderTop: '1px solid #f0f0f0',
          }}
        >
          {currentQuestion.conversation.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: 12,
                display: 'flex',
                justifyContent: msg.role === 'candidate' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: msg.role === 'candidate' ? '#1677ff' : msg.role === 'system' ? '#f6ffed' : '#f5f5f5',
                  color: msg.role === 'candidate' ? '#fff' : '#333',
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {msg.role === 'interviewer' && (
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>面试官</div>
                )}
                {msg.role === 'system' && (
                  <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4, fontWeight: 600 }}>系统评分</div>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {streamingText && (
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#f5f5f5',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>面试官</div>
                {streamingText}
                <span style={{ animation: 'blink 1s infinite' }}>|</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入你的回答..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendAnswer();
              }
            }}
            disabled={isLoading || currentQuestion.score !== undefined}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendAnswer}
            loading={isLoading}
            disabled={!inputValue.trim() || currentQuestion.score !== undefined}
            style={{ height: 'auto' }}
          >
            发送
          </Button>
        </div>

        {currentQuestion.score && (
          <Card
            size="small"
            title={
              <Space>
                <span>本题评分: </span>
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: currentQuestion.score.totalScore >= 60 ? '#52c41a' : '#ff4d4f',
                }}>
                  {currentQuestion.score.totalScore}分
                </span>
              </Space>
            }
            style={{ marginTop: 12, borderColor: currentQuestion.score.isCorrect ? '#b7eb8f' : '#ffccc7' }}
          >
            <Paragraph>{currentQuestion.score.overallComment}</Paragraph>
            {currentQuestion.score.suggestedAnswer && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>建议回答:</Text>
                <Paragraph style={{ fontSize: 13 }}>{currentQuestion.score.suggestedAnswer}</Paragraph>
              </>
            )}
            {currentQuestionIndex < totalQuestions - 1 && !currentQuestion.score && (
              <Button type="primary" onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                下一题
              </Button>
            )}
          </Card>
        )}
      </Card>
    </div>
  );
}

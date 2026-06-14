import { useEffect, useState } from 'react';
import { Card, Typography, Divider, Tag, Row, Col, Progress, Input, Button, Space, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReviewStore } from '../../stores/useReviewStore';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { getScoreColor, getScoreLabel } from '../../utils/scoring';
import { CATEGORIES } from '../../constants/categories';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ReviewDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, updateNote, completeReview, updateReviewStatus } = useReviewStore();
  const { questions } = useQuestionStore();
  const [note, setNote] = useState('');

  const item = items.find((i) => i.id === id);
  const question = item ? questions.find((q) => q.id === item.questionId) : null;

  useEffect(() => {
    if (item) setNote(item.userNote || '');
  }, [item]);

  if (!item || !question) {
    return <div style={{ padding: 24, textAlign: 'center' }}>未找到该错题记录</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/review')} />
            <span>错题详情</span>
            <Tag color={getScoreColor(item.aiScore.totalScore)}>
              {item.aiScore.totalScore}分 - {getScoreLabel(item.aiScore.totalScore)}
            </Tag>
          </Space>
        }
        extra={
          item.reviewStatus !== 'mastered' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                updateReviewStatus(item.id, 'mastered');
                message.success('已标记为掌握');
                navigate('/review');
              }}
            >
              标记为已掌握
            </Button>
          )
        }
      >
        <Title level={4}>{question.title}</Title>
        <Space>
          <Tag>{CATEGORIES[question.category]}</Tag>
          {question.tags.map((t) => <Tag key={`${t.key}-${t.value}`}>{t.value}</Tag>)}
        </Space>

        <Divider />

        {/* Three column comparison */}
        <Row gutter={16}>
          <Col span={8}>
            <Card title="你的回答" size="small" style={{ height: '100%' }}>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {item.userAnswer || '未作答'}
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="AI 建议回答" size="small" style={{ height: '100%' }}>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.aiScore.suggestedAnswer || '暂无'}
                </ReactMarkdown>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="参考答案" size="small" style={{ height: '100%' }}>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.referenceAnswer || '暂无参考答案'}
                </ReactMarkdown>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Scoring details */}
        <Card title="评分详情" size="small">
          <Row gutter={[16, 8]}>
            {item.aiScore.dimensions.map((dim) => (
              <Col span={12} key={dim.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 80 }}>{dim.name}</Text>
                  <Progress
                    percent={dim.score}
                    strokeColor={getScoreColor(dim.score)}
                    style={{ flex: 1 }}
                    format={(p) => `${p}分`}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 88 }}>
                  {dim.comment}
                </Text>
              </Col>
            ))}
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Paragraph>{item.aiScore.overallComment}</Paragraph>
        </Card>

        <Divider />

        {/* Notes */}
        <Card title="我的笔记" size="small">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="记录你的理解和记忆要点..."
          />
          <Button
            style={{ marginTop: 8 }}
            onClick={() => {
              updateNote(item.id, note);
              message.success('笔记已保存');
            }}
          >
            保存笔记
          </Button>
        </Card>
      </Card>
    </div>
  );
}

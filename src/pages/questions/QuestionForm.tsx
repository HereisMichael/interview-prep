import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Space, Tag, Switch } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuestionStore } from '../../stores/useQuestionStore';
import { CATEGORIES } from '../../constants/categories';
import { PRESET_TAGS, TAG_KEYS } from '../../constants/tags';
import type { QuestionCategory, Difficulty, Tag as QuestionTag } from '../../models/question';

const { TextArea } = Input;

export default function QuestionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id && id !== 'new';
  const { questions, addQuestion, updateQuestion, fetchQuestions } = useQuestionStore();
  const [form] = Form.useForm();
  const [tags, setTags] = useState<QuestionTag[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (isEditing) {
      const q = questions.find((q) => q.id === id);
      if (q) {
        form.setFieldsValue({
          title: q.title,
          content: q.content,
          category: q.category,
          difficulty: q.difficulty,
          referenceAnswer: q.referenceAnswer || '',
          source: q.source || '',
        });
        setTags(q.tags);
      }
    }
  }, [id, isEditing, questions, form]);

  const handleSubmit = async (values: Record<string, string>) => {
    const data = {
      title: values.title,
      content: values.content || '',
      category: values.category as QuestionCategory,
      difficulty: (values.difficulty || 'medium') as Difficulty,
      referenceAnswer: values.referenceAnswer || undefined,
      source: values.source || '手动添加',
      tags,
      starred: false,
    };

    if (isEditing) {
      await updateQuestion(id!, data);
      message.success('题目已更新');
    } else {
      await addQuestion(data);
      message.success('题目已添加');
    }
    navigate('/questions');
  };

  const addTag = (key: string, value: string) => {
    if (!tags.find((t) => t.key === key && t.value === value)) {
      setTags([...tags, { key, value }]);
    }
  };

  const removeTag = (key: string, value: string) => {
    setTags(tags.filter((t) => !(t.key === key && t.value === value)));
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/questions')} />
            {isEditing ? '编辑题目' : '新增题目'}
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="题目标题"
            rules={[{ required: true, message: '请输入题目标题' }]}
          >
            <Input placeholder="如：设计一个互联网医院的整体解决方案架构" />
          </Form.Item>

          <Form.Item name="content" label="题目描述（支持 Markdown）">
            <TextArea rows={4} placeholder="详细描述题目背景、考察点、延伸问题等" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="category"
              label="分类"
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ width: 240 }}
            >
              <Select placeholder="选择分类">
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <Select.Option key={key} value={key}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="difficulty" label="难度" initialValue="medium" style={{ width: 160 }}>
              <Select>
                <Select.Option value="easy">简单</Select.Option>
                <Select.Option value="medium">中等</Select.Option>
                <Select.Option value="hard">困难</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item label="标签">
            <div style={{ marginBottom: 8 }}>
              {tags.map((t) => (
                <Tag
                  key={`${t.key}-${t.value}`}
                  closable
                  onClose={() => removeTag(t.key, t.value)}
                  style={{ marginBottom: 4 }}
                >
                  {TAG_KEYS[t.key as keyof typeof TAG_KEYS] || t.key}: {t.value}
                </Tag>
              ))}
            </div>
            {Object.entries(PRESET_TAGS).map(([key, values]) => (
              <div key={key} style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
                  {TAG_KEYS[key as keyof typeof TAG_KEYS]}:
                </span>
                {values.map((v) => (
                  <Tag
                    key={v}
                    style={{ cursor: 'pointer', marginBottom: 4 }}
                    onClick={() => addTag(key, v)}
                  >
                    {v}
                  </Tag>
                ))}
              </div>
            ))}
          </Form.Item>

          <Form.Item name="referenceAnswer" label="参考答案（Markdown）">
            <TextArea rows={6} placeholder="可选，填写参考答案供复习参考" />
          </Form.Item>

          <Form.Item name="source" label="来源">
            <Input placeholder="如：阿里SA面经、牛客网等" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {isEditing ? '保存修改' : '添加题目'}
              </Button>
              <Button onClick={() => navigate('/questions')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

import { useState, useRef } from 'react';
import {
  Card, Form, Input, Select, Button, Space, message, Alert, Divider, Tag,
  Descriptions, InputNumber, Slider,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, ExportOutlined, ImportOutlined,
} from '@ant-design/icons';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { AI_PRESETS } from '../../models/common';
import { AIService } from '../../services/AIService';
import { ExportService } from '../../services/ExportService';

export default function AISettings() {
  const { aiConfig, setAIConfig, applyPreset } = useSettingsStore();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    latency?: number;
    model?: string;
    error?: string;
  } | null>(null);
  const [modelList, setModelList] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTest = async () => {
    if (!aiConfig.apiKey) {
      message.warning('请先填写 API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    const service = new AIService(aiConfig);
    const result = await service.testConnection();
    setTestResult(result);
    setTesting(false);
    if (result.success) {
      message.success(`连接成功! 延迟 ${result.latency}ms`);
    } else {
      message.error(`连接失败: ${result.error}`);
    }
  };

  const handleLoadModels = async () => {
    if (!aiConfig.apiKey) {
      message.warning('请先填写 API Key');
      return;
    }
    setLoadingModels(true);
    const service = new AIService(aiConfig);
    const models = await service.listModels();
    setModelList(models);
    setLoadingModels(false);
    if (models.length > 0) {
      message.success(`发现 ${models.length} 个可用模型`);
    } else {
      message.warning('未找到可用模型，请检查 API Key 和 Base URL');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title="AI 模型配置" extra={<Tag icon={<ThunderboltOutlined />} color="blue">AI 设置</Tag>}>
        <Form layout="vertical">
          <Form.Item label="快速预设">
            <Space>
              {Object.keys(AI_PRESETS).map((key) => (
                <Button
                  key={key}
                  type={aiConfig.provider === key ? 'primary' : 'default'}
                  onClick={() => applyPreset(key)}
                >
                  {key === 'openai' ? 'OpenAI' : key === 'dashscope' ? '通义千问' : key === 'deepseek' ? 'DeepSeek' : key}
                </Button>
              ))}
            </Space>
          </Form.Item>

          <Divider />

          <Form.Item label="Provider">
            <Select value={aiConfig.provider} onChange={(v) => {
              setAIConfig({ provider: v as typeof aiConfig.provider });
              if (AI_PRESETS[v]) applyPreset(v);
            }}>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="dashscope">通义千问 (DashScope)</Select.Option>
              <Select.Option value="deepseek">DeepSeek</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="API Key" required>
            <Input.Password
              value={aiConfig.apiKey}
              onChange={(e) => setAIConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </Form.Item>

          <Form.Item label="Base URL">
            <Input
              value={aiConfig.baseUrl}
              onChange={(e) => setAIConfig({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </Form.Item>

          <Form.Item label="模型">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={aiConfig.model}
                onChange={(e) => setAIConfig({ model: e.target.value })}
                placeholder="gpt-4o"
                style={{ width: '100%' }}
              />
              <Button
                onClick={handleLoadModels}
                loading={loadingModels}
                disabled={!aiConfig.apiKey}
              >
                拉取模型列表
              </Button>
            </Space.Compact>
            {modelList.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {modelList.map((m) => (
                  <Tag
                    key={m}
                    style={{ cursor: 'pointer', marginBottom: 4 }}
                    color={m === aiConfig.model ? 'blue' : undefined}
                    onClick={() => setAIConfig({ model: m })}
                  >
                    {m}
                  </Tag>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item label={`Temperature: ${aiConfig.temperature}`}>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={aiConfig.temperature}
              onChange={(v) => setAIConfig({ temperature: v })}
            />
          </Form.Item>

          <Form.Item label="Max Tokens">
            <InputNumber
              value={aiConfig.maxTokens}
              onChange={(v) => setAIConfig({ maxTokens: v || 4096 })}
              min={256}
              max={128000}
              step={256}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label={`超时时间 (秒): ${aiConfig.timeout / 1000}`}>
            <Slider
              min={10}
              max={120}
              step={5}
              value={aiConfig.timeout / 1000}
              onChange={(v) => setAIConfig({ timeout: v * 1000 })}
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<ApiOutlined />}
                onClick={handleTest}
                loading={testing}
                disabled={!aiConfig.apiKey}
              >
                测试连接
              </Button>
            </Space>
          </Form.Item>

          {testResult && (
            <Alert
              type={testResult.success ? 'success' : 'error'}
              showIcon
              icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              message={testResult.success ? '连接成功' : '连接失败'}
              description={
                <Descriptions column={1} size="small">
                  {testResult.latency && (
                    <Descriptions.Item label="延迟">{testResult.latency}ms</Descriptions.Item>
                  )}
                  {testResult.model && (
                    <Descriptions.Item label="模型">{testResult.model}</Descriptions.Item>
                  )}
                  {testResult.error && (
                    <Descriptions.Item label="错误">
                      {testResult.error}
                      {testResult.error.includes('401') && <div>提示: API Key 无效，请检查</div>}
                      {testResult.error.includes('429') && <div>提示: 请求过于频繁或余额不足</div>}
                      {testResult.error.includes('timeout') && <div>提示: 网络超时，请检查网络连接或增加超时时间</div>}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              }
            />
          )}
        </Form>
      </Card>

      <Card title="数据管理" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Button
              icon={<ExportOutlined />}
              onClick={async () => {
                try {
                  await ExportService.exportJSON();
                  message.success('数据已导出');
                } catch {
                  message.error('导出失败');
                }
              }}
            >
              导出全部数据 (JSON)
            </Button>
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              将题库、面试记录、错题本、计划等全部数据导出为 JSON 文件，可用于备份或迁移
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await ExportService.importJSON(file);
                  message.success('数据导入成功，请刷新页面');
                } catch {
                  message.error('导入失败，请检查文件格式');
                }
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <Button
              icon={<ImportOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              导入数据 (JSON)
            </Button>
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              从 JSON 备份文件导入数据，将覆盖现有数据
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}

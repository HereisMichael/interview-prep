# AI 面试助手 - 面试准备工具

一款专为解决方案架构师（SA）/ 售前岗位设计的 AI 面试准备工具，支持题库管理、模拟面试、刷题练习、闪卡复习、错题复盘和面试计划。

## 功能特性

- **题库管理** — 59 道精选 SA 面试题，覆盖架构设计、云计算、行业方案、售前软技能等方向，支持分类/难度/标签筛选
- **模拟面试** — AI 面试官逐题追问，实时流式对话，五维度评分（内容完整性/技术深度/业务理解/逻辑表达/创新思维）
- **快速刷题** — 选题配置 → 逐题作答 → AI 评分 → 查看解析，低分自动入错题本
- **闪卡模式** — 看题思考 → 翻转看答案 → 三档自评（不会/模糊/掌握），与 SM-2 间隔重复系统集成
- **错题复盘** — 薄弱维度分析，SM-2 算法智能安排复习计划
- **面试计划** — 创建学习计划，每日任务打卡，进度跟踪
- **PDF 导出** — 面试报告、复习报告、学习计划一键导出 PDF
- **桌面应用** — Electron 打包，支持 Windows/macOS 桌面端

## 技术栈

- **前端**：React 19 + TypeScript + Ant Design + TailwindCSS
- **状态管理**：Zustand
- **AI**：OpenAI 兼容 API（支持通义千问/DeepSeek/OpenAI）
- **存储**：IndexedDB（浏览器）/ 本地文件系统（Electron）
- **构建**：Vite 5
- **桌面**：Electron

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动 Electron 开发模式
npm run electron:dev

# 打包桌面应用
npm run electron:build
```

## 项目结构

```
src/
├── ai/prompts/          # AI 提示词
├── constants/           # 分类、标签、默认配置
├── layouts/             # 页面布局
├── models/              # TypeScript 数据模型
├── pages/
│   ├── Dashboard.tsx    # 首页仪表盘
│   ├── questions/       # 题库管理
│   ├── interview/       # 模拟面试
│   ├── practice/        # 刷题（快速刷题 + 闪卡）
│   ├── review/          # 错题复盘
│   ├── plans/           # 面试计划
│   └── settings/        # 设置
├── services/            # AI 服务、数据导出、种子数据
├── storage/             # 存储适配层（IndexedDB/本地文件）
├── stores/              # Zustand 状态管理
└── utils/               # 工具函数（SM-2 算法、日期处理等）
```

## AI 配置

在设置页面配置 AI 模型：

- **通义千问**：API 地址 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **DeepSeek**：API 地址 `https://api.deepseek.com/v1`
- **OpenAI**：API 地址 `https://api.openai.com/v1`

支持任何 OpenAI 兼容 API。

## License

MIT

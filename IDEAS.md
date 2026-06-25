# LLMSearchEngine — 生成式搜索引擎（纯前端方案）

## 核心理念

一个类似搜索引擎首页的页面：输入框 + 确认按钮。用户输入描述后，直接从浏览器调用 LLM API，由 LLM 实时生成完整网页并在沙箱 iframe 中渲染。

**本质：生成式搜索引擎 — 输入即得页面。**

**部署目标：** GitHub Pages (mingdedi.github.io)，零后端、零服务器成本。

---

## 架构总览

```
┌─────────────────────── 浏览器 (纯前端) ───────────────────────┐
│                                                              │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│  │  搜索首页    │    │  设置面板        │    │  结果渲染区  │  │
│  │  输入框+按钮 │    │  API Key         │    │  iframe 沙箱 │  │
│  └──────┬──────┘    │  Base URL        │    └──────▲──────┘  │
│         │           │  Model           │           │         │
│         │           └────────┬─────────┘           │         │
│         │                    │ 存入 LocalStorage    │         │
│         │                    │                     │         │
│         ▼                    ▼                     │         │
│  ┌──────────────────────────────────────┐           │         │
│  │  fetch() + ReadableStream            │           │         │
│  │  直接调用 LLM API (流式)              │           │         │
│  │  从 LocalStorage 读取配置             │           │         │
│  └──────────────────┬───────────────────┘           │         │
│                     │                               │         │
│         逐 chunk 拼接 HTML，显示进度                   │         │
│                     │                               │         │
│         生成完成 ────┼───────────────────────────────┘         │
│                     ▼                                         │
│         iframe.srcdoc = 完整 HTML                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼ (HTTPS, CORS)
                 ┌─────────────────┐
                 │  LLM API 服务    │
                 │  (OpenAI 兼容)   │
                 └─────────────────┘
```

## 为什么不需要后端

| 传统方案 | 本方案 |
|---------|--------|
| 浏览器 → 后端 → LLM API | 浏览器 → LLM API（直连）|
| 需要服务器部署 | GitHub Pages 静态托管 |
| API Key 存后端环境变量 | API Key 存用户浏览器 LocalStorage |
| 需要处理 SSE 中转 | 浏览器原生 fetch + ReadableStream |

**前提条件：** LLM API 服务商需支持 CORS（OpenAI、DeepSeek、智谱等主流服务商均支持）。

## 技术栈

| 层 | 技术 | 理由 |
|---|---|---|
| 页面 | 原生 HTML/CSS/JS | 无构建步骤，GitHub Pages 直接托管 |
| LLM 调用 | fetch API (原生) | 不依赖 SDK，浏览器直连 |
| 流式传输 | fetch + ReadableStream | 浏览器原生支持，逐块读取 |
| 配置存储 | LocalStorage | 用户自行管理密钥，无需服务器 |
| 页面渲染 | iframe sandbox + srcdoc | 安全隔离生成内容 |
| 部署 | GitHub Pages | 零成本静态托管 |

## 目录结构

```
LLMSearchEngine/
├── index.html          # 搜索首页 + 设置面板 + 渲染区
├── style.css           # 全部样式
├── app.js              # 全部逻辑（LLM 调用、流式接收、配置管理）
├── README.md           # 项目说明
└── .gitignore
```

> 仅 3 个核心文件，无构建步骤，无依赖。

## 核心流程

```
用户输入 "一个番茄钟计时器"
        │
        ▼
从 LocalStorage 读取 API 配置（Key / Base URL / Model）
        │
        ▼
fetch(POST base_url + "/chat/completions", {
  headers: { Authorization: Bearer ${apiKey} },
  body: { model, messages, stream: true }
})
        │
        ▼  逐 chunk 读取 ReadableStream
        │
实时拼接 HTML 内容，更新进度条
        │
        ▼  流结束
iframe.srcdoc = 完整 HTML
```

## 关键设计

### 1. 配置管理（LocalStorage）

```javascript
const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o'
};

function loadConfig() {
  const saved = localStorage.getItem('llm_config');
  return saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  localStorage.setItem('llm_config', JSON.stringify(config));
}
```

- 首次使用时弹出设置面板引导用户填写
- 配置仅存在用户本地浏览器，不上传任何服务器
- 设置面板可随时修改

### 2. System Prompt（核心）

```
你是一个专业的网页生成器。根据用户描述，生成一个完整、独立、可直接运行的 HTML 页面。

规则：
1. 只输出纯 HTML 代码，从 <!DOCTYPE html> 开始
2. 所有 CSS 内联在 <style> 中，所有 JS 内联在 <script> 中
3. 不使用外部依赖（CDN 除外，如 Tailwind CDN）
4. 页面必须响应式，适配移动端
5. 设计现代、美观、交互完整
6. 不要输出任何解释、markdown 标记或代码块标记
7. 确保所有功能在浏览器中可正常运行
```

### 3. 流式传输（纯浏览器实现）

```javascript
const response = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: query }
    ],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 解析 SSE data: 行，提取 delta.content
  // 过滤 markdown 代码块标记
  // 拼接 HTML，更新进度条
}
```

### 4. 安全沙箱

```html
<iframe sandbox="allow-scripts allow-forms allow-modals"
        srcdoc="生成的HTML">
</iframe>
```

### 5. 安全说明

- API Key 存在 LocalStorage 中，仅用户自己可访问
- 所有请求直接从用户浏览器发往 LLM API，不经过任何中间服务器
- GitHub Pages 仅托管静态文件，不参与数据处理
- 用户应自行评估所使用 LLM 服务商的数据隐私政策

## 用户体验设计

```
┌─────────────────────────────────────────────┐
│  🔍 LLMSearchEngine              [⚙ 设置]    │
│                                              │
│   ┌──────────────────────────┐  ┌───┐       │
│   │ 描述你想要的页面...        │  │GO │       │
│   └──────────────────────────┘  └───┘       │
│                                              │
│   ── 生成中 ████████░░░░ 65% ──             │
│                                              │
│   ┌──────────────────────────────────────┐  │
│   │                                      │  │
│   │     [生成的页面在 iframe 中]           │  │
│   │                                      │  │
│   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

设置面板（模态框）:
┌─────────────────────────────────────────────┐
│  ⚙ API 配置                            [×]  │
│                                              │
│  API Key:                                    │
│  ┌──────────────────────────────────────┐    │
│  │ sk-xxxxxxxxxxxxx                     │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Base URL:                                   │
│  ┌──────────────────────────────────────┐    │
│  │ https://api.openai.com/v1            │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Model:                                      │
│  ┌──────────────────────────────────────┐    │
│  │ gpt-4o                               │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ℹ 密钥仅存储在本地浏览器，不会上传到任何服务器 │
│                                              │
│              [取消]    [保存配置]              │
└─────────────────────────────────────────────┘
```

## 已知挑战与应对

| 挑战 | 应对方案 |
|------|---------|
| LLM API 的 CORS 限制 | 主流服务商（OpenAI/DeepSeek/智谱等）均支持 CORS；若不支持则提示用户 |
| API Key 存 LocalStorage 的安全性 | 纯客户端应用，用户自行承担；UI 明确提示风险 |
| LLM 输出 markdown 代码块标记 | 前端过滤 ` ```html ` 和 ` ``` ` 标记 |
| 生成速度慢 | 流式输出 + 进度条，用户看到实时生成 |
| 首次使用未配置 | 检测 LocalStorage 无配置时自动弹出设置面板 |
| GitHub Pages HTTPS | GitHub Pages 默认 HTTPS，满足大多数 LLM API 的安全要求 |

## 后续扩展方向

- [ ] 历史记录（localStorage 存储已生成页面）
- [ ] 多页面类型模板（仪表盘、表单、游戏等）
- [ ] 生成后可编辑（二次对话修改页面）
- [ ] 生成页面分享（导出 HTML 文件）
- [ ] 常用配置预设（一键切换 OpenAI / DeepSeek / 智谱等）

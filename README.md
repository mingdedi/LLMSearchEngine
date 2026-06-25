# LLMSearchEngine — 生成式搜索引擎

描述你想要的页面，AI 为你实时生成。

## 使用方法

1. 打开网页，首次使用会自动弹出设置面板
2. 填入你的 LLM API 配置：
   - **API Key**：你的密钥
   - **Base URL**：API 端点地址
   - **Model**：模型名称
3. 也可点击快捷预设一键填充（OpenAI / DeepSeek / 智谱）
4. 保存配置后，在搜索框输入页面描述，点击「生成」
5. 生成完成后页面全屏展示，可在顶部输入框描述修正要求，AI 会在保持上下文的情况下修改页面

## 支持的 LLM 服务商

任何兼容 OpenAI API 格式的服务商均可使用：

| 服务商 | Base URL | Model 示例 |
|--------|----------|-----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

## 隐私说明

- API Key 仅存储在你本地浏览器的 LocalStorage 中
- 所有请求直接从你的浏览器发往 LLM API，不经过任何中间服务器
- 本网站（GitHub Pages）仅托管静态文件，不收集任何数据

## 技术栈

- 纯前端：HTML + CSS + JavaScript，无框架、无构建步骤
- 流式传输：fetch + ReadableStream
- 安全沙箱：iframe sandbox + srcdoc
- 部署：GitHub Pages

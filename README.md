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
| **小米 MiMo ⭐推荐** | `https://api.xiaomimimo.com/v1` | `mimo-v2.5-pro-ultraspeed` |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.5` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-v4-pro` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-5.2` |
| Moonshot | `https://api.moonshot.cn/v1` | `kimi-k2.7-code` |

> **💡 推荐：** 使用 [MiMo-V2.5-Pro-UltraSpeed](https://mimo.mi.com/models/zh-CN/mimo-v2.5-pro-ultraspeed) 获得最佳体验。该模型为万亿参数旗舰模型，推理速度突破 1000 tokens/s，生成页面几乎实时响应，非常适合本项目的流式生成场景。  
**截止目前（2026-06-26）该高速度模型处于内测阶段，需要申请才可使用**

## 隐私说明

- API Key 仅存储在你本地浏览器的 LocalStorage 中
- 所有请求直接从你的浏览器发往 LLM API，不经过任何中间服务器
- 本网站（GitHub Pages）仅托管静态文件，不收集任何数据

## 技术栈

- 纯前端：HTML + CSS + JavaScript，无框架、无构建步骤
- 流式传输：fetch + ReadableStream
- 安全沙箱：iframe sandbox + srcdoc
- 部署：GitHub Pages

## 关于本项目

for VibeCoding，本项目全部由 **Qwen Code** + **GLM-5.2** 生成，从零到一，无手写代码。

灵感来源于 Microsoft Build 上 **Scott Hanselman** 与 **Mark Russinovich** 的演讲 [Scott and Mark learn to Vibe Check](https://build.microsoft.com/en-US/sessions/LIVE101)（LIVE101）。演讲中提出的 **vibeOS** 理念——开发者从"写代码"转变为"描述意图，AI 生成实现"——直接启发了本项目：用自然语言描述你想要的页面，AI 实时为你生成。

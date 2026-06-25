# TODO — LLMSearchEngine 构建步骤（纯前端方案）

> 每一步都是自包含的任务，可单独交给 AI 编码助手执行。
> 按顺序执行，每步完成后验证再进入下一步。
> 全程无需 npm install，无需构建工具，纯静态文件。

---

## Step 1: 项目骨架与 HTML 结构

**目标：** 创建页面骨架，包含搜索区、设置面板、渲染区三大区域

**创建文件：**
- `index.html`

**具体要求：**
1. 页面结构分三大区域：
   - **搜索区**：标题 "LLMSearchEngine" + 输入框 `#search-input` + 生成按钮 `#generate-btn` + 设置按钮 `#settings-btn`
   - **进度区**（初始隐藏）：进度条 `#progress-bar` + 进度文字 `#progress-text`
   - **渲染区**（初始隐藏）：iframe `#result-frame`，属性 `sandbox="allow-scripts allow-forms allow-modals"`
2. **设置面板**（模态框，初始隐藏）：
   - API Key 输入框 `#config-api-key`（type="password"）
   - Base URL 输入框 `#config-base-url`
   - Model 输入框 `#config-model`
   - 安全提示文字："密钥仅存储在本地浏览器，不会上传到任何服务器"
   - 取消按钮 `#config-cancel` + 保存按钮 `#config-save`
3. 引入 `style.css` 和 `app.js`
4. 添加 `.gitignore`（忽略 `.DS_Store` 等）

**验证：** 用浏览器打开 `index.html`，能看到所有区域的结构（未样式化也没关系）

---

## Step 2: 样式设计

**目标：** 实现现代美观的搜索首页 + 设置面板样式

**创建文件：**
- `style.css`

**具体要求：**
1. 全局：`box-sizing: border-box`，清除默认 margin/padding
2. 背景：深色渐变（如 `#0f0f23` → `#1a1a3e`）或浅色干净背景
3. 搜索区：Flexbox 垂直水平居中，占视口高度 100%
4. 输入框：大圆角（`border-radius: 24px`），padding 充足，focus 时高亮边框
5. 生成按钮：醒目渐变色，hover 有上浮 + 阴影过渡动画
6. 设置按钮：右上角齿轮图标，hover 旋转效果
7. 进度条：
   - 固定高度 6px，圆角，灰色底色
   - 内部填充条用渐变色 + 宽度动画
   - 生成中显示脉冲动画
8. iframe 区域：全宽，高度 60vh，圆角边框，轻微阴影
9. 设置面板（模态框）：
   - 半透明遮罩层覆盖全屏
   - 面板居中，白色背景，圆角，阴影
   - 输入框全宽，有 focus 效果
   - 按钮区右对齐
10. 响应式：移动端输入框和按钮堆叠为垂直布局，面板宽度自适应

**验证：** 页面视觉美观，输入框/按钮有交互反馈，设置面板弹出效果正常

---

## Step 3: 配置管理模块

**目标：** 实现 LocalStorage 读写 + 设置面板交互

**修改文件：**
- `app.js`（创建文件）

**具体要求：**
1. 定义默认配置常量：
   ```javascript
   const DEFAULT_CONFIG = {
     apiKey: '',
     baseUrl: 'https://api.openai.com/v1',
     model: 'gpt-4o'
   };
   ```
2. `loadConfig()` — 从 LocalStorage 读取配置，无则返回默认值
3. `saveConfig(config)` — 保存配置到 LocalStorage
4. 设置面板交互：
   - 点击 `#settings-btn` → 显示面板，填充当前配置
   - 点击 `#config-cancel` → 隐藏面板
   - 点击 `#config-save` → 保存配置，隐藏面板
5. 页面加载时检测：如果 `apiKey` 为空，自动弹出设置面板
6. 导出 `getConfig()` 供其他模块使用

**验证：** 填写配置 → 保存 → 刷新页面 → 打开设置面板，配置仍在；清除 LocalStorage 后刷新，自动弹出设置面板

---

## Step 4: 系统提示词

**目标：** 定义 LLM 生成网页的系统提示词

**修改文件：**
- `app.js`（追加内容）

**具体要求：**
1. 定义 `SYSTEM_PROMPT` 常量，内容：
   - 角色：专业网页生成器
   - 规则：只输出纯 HTML，从 `<!DOCTYPE html>` 开始
   - CSS 内联在 `<style>`，JS 内联在 `<script>`
   - 不使用外部依赖（CDN 除外，如 Tailwind CDN）
   - 响应式设计，适配移动端
   - 设计现代美观，交互完整
   - 不输出解释、markdown 标记或代码块标记
   - 确保功能在浏览器中可正常运行
2. 定义 `buildUserPrompt(query)` 函数，将用户输入包装为生成指令

**验证：** 在浏览器控制台 `console.log(SYSTEM_PROMPT)` 能看到提示词内容

---

## Step 5: LLM 流式调用

**目标：** 实现从浏览器直接调用 LLM API 并流式接收响应

**修改文件：**
- `app.js`（追加内容）

**具体要求：**
1. 实现 `async function streamGenerate(query, onChunk)`：
   - 从 `getConfig()` 读取 `apiKey`、`baseUrl`、`model`
   - 如果 `apiKey` 为空，抛出错误提示用户先配置
   - 使用 `fetch()` 调用 `${baseUrl}/chat/completions`：
     - method: POST
     - headers: `Content-Type: application/json` + `Authorization: Bearer ${apiKey}`
     - body: `{ model, messages: [{role:'system',...},{role:'user',...}], stream: true }`
   - 使用 `response.body.getReader()` + `TextDecoder()` 逐块读取
   - 解析 SSE 格式（`data: {...}` 行），提取 `choices[0].delta.content`
   - 遇到 `data: [DONE]` 结束
   - 每个 chunk 调用 `onChunk(content)` 回调
2. 过滤 markdown 代码块标记（` ```html `、` ``` `）
3. 错误处理：
   - HTTP 非 200：解析 error message 并抛出
   - 网络错误：抛出友好提示
   - CORS 错误：提示用户检查 Base URL 是否支持浏览器跨域

**验证：** 在控制台手动调用 `streamGenerate("一个计数器页面", (chunk) => console.log(chunk))`，能看到逐字输出

---

## Step 6: 前端交互与渲染

**目标：** 串联完整流程——输入 → 流式生成 → 进度显示 → iframe 渲染

**修改文件：**
- `app.js`（追加内容）

**具体要求：**
1. 监听 `#generate-btn` 点击和输入框回车键
2. 提交时：
   - 显示进度区，隐藏渲染区
   - 禁用输入框和按钮
   - 初始化进度条为 0
3. 调用 `streamGenerate(query, onChunk)`：
   - `onChunk` 回调中：拼接 HTML 内容，更新进度条（基于已接收字符数估算，如每 500 字符 +5%，上限 95%）
   - 更新进度文字（如"已生成 1234 字符..."）
4. 生成完成后：
   - 进度条设为 100%，短暂延迟后隐藏进度区
   - 将完整 HTML 通过 `iframe.srcdoc` 注入
   - 显示渲染区
   - 恢复输入框和按钮
5. 错误处理：
   - 在进度区位置显示错误信息（红色文字）
   - 恢复输入框和按钮
   - 提供重试引导

**验证：** 端到端测试——输入"一个番茄钟计时器"，能看到流式生成进度，最终在 iframe 中渲染出可用的番茄钟页面

---

## Step 7: 端到端测试与修复

**目标：** 全面测试各种查询场景，修复发现的问题

**测试用例：**
1. 简单页面：`一个计数器页面`
2. 交互页面：`一个番茄钟计时器`
3. 数据展示：`一个待办事项列表`
4. 游戏页面：`一个贪吃蛇游戏`
5. 表单页面：`一个用户注册表单`
6. 边界情况：空输入、超长输入、特殊字符

**检查项：**
- [ ] 流式输出正常，无中断
- [ ] markdown 代码块标记被正确过滤
- [ ] iframe 中页面功能正常（JS 可执行）
- [ ] 进度条显示合理
- [ ] 错误情况有友好提示（未配置 API Key、网络错误、CORS 错误）
- [ ] 移动端布局正常
- [ ] 刷新页面后配置不丢失

**修复方向（按需）：**
- 如果 LLM 输出有 markdown 标记残留 → 加强过滤逻辑
- 如果 iframe 内容不渲染 → 检查 sandbox 属性和 srcdoc 设置
- 如果流式中断 → 检查 fetch 错误处理和连接超时
- 如果 CORS 报错 → 提示用户更换支持 CORS 的 API 端点

---

## Step 8: 收尾优化

**目标：** 打磨细节，提升体验

**可选优化：**
1. 输入框 placeholder 示例提示（如"试试：一个贪吃蛇游戏"）
2. 生成中按钮显示 loading 动画（旋转图标或脉冲）
3. iframe 旁边加"在新标签页打开"按钮（`window.open` + `document.write`）
4. 生成完成后显示"重新生成"按钮
5. 添加 favicon
6. 页面标题动态更新（显示当前生成的页面类型）
7. 设置面板中添加常用预设快捷按钮（OpenAI / DeepSeek / 智谱 一键填充 Base URL + Model）
8. 生成完成后显示已用字符数 / 耗时

**验证：** 整体体验流畅，无明显粗糙感

---

## Step 9: 部署到 GitHub Pages

**目标：** 将项目部署到 mingdedi.github.io

**具体要求：**
1. 确保 `index.html`、`style.css`、`app.js` 三个核心文件就绪
2. 创建 `README.md`，包含：
   - 项目简介
   - 使用说明（首次配置 API Key 的步骤）
   - 支持的 LLM 服务商列表
   - 隐私说明（密钥仅存本地）
3. Git 初始化并推送到 GitHub 仓库
4. 在 GitHub 仓库设置中开启 Pages：
   - Source: main branch
   - Folder: / (root)
5. 等待部署完成，访问 `https://mingdedi.github.io` 验证

**验证：** 线上访问正常，配置保存正常，生成功能正常

---

## 完成标志

当以下全部满足时，原型完成：
- [ ] 输入查询 → 流式生成 → iframe 渲染，全链路通畅
- [ ] 至少 5 种不同类型页面都能正确生成和渲染
- [ ] 错误情况不会导致页面崩溃
- [ ] 移动端可正常使用
- [ ] 已部署到 GitHub Pages 可公开访问

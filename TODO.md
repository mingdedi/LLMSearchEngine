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

**✅ 已完成。** 实际创建文件：`index.html` + `style.css`（基础深色主题） + `app.js`（占位） + `.gitignore`

**超出原计划的元素（供后续 Step 参考）：**
- 错误提示区：`#error-section` / `#error-text` / `#retry-btn`
- 渲染区工具栏：`#open-new-tab-btn`（新标签页打开）/ `#regenerate-btn`（重新生成）
- 设置面板快捷预设：`.preset-btn`（`data-base-url` / `data-model` 属性，OpenAI / DeepSeek / 智谱）
- 设置面板关闭按钮：`#config-close`
- 标语：`.tagline`
- Favicon：emoji SVG data URI
- noscript 降级提示

---

## Step 2: 样式打磨与动画

**目标：** 在 Step 1 已有基础样式上，添加动画效果和视觉打磨

**修改文件：**
- `style.css`（已存在，在此基础上增强）

**具体要求：**
1. 进度条生成中脉冲动画（`@keyframes pulse`）
2. 生成按钮 loading 状态样式（旋转图标或脉冲）
3. 模态框出现/消失过渡动画（`opacity` + `transform` 过渡）
4. iframe 区域出现动画（淡入或上滑）
5. 输入框 focus 时的 glow 效果（`box-shadow`）
6. 错误提示出现动画（抖动或淡入）
7. 搜索区在有结果时缩小上移（从居中变为顶部）

**验证：** 页面视觉美观，输入框/按钮有交互反馈，设置面板弹出效果正常

**✅ 已完成。** 实现细节：
- `@keyframes pulse` — 进度条脉冲，`.progress-bar-fill.pulsing` 触发
- `@keyframes spin` — 按钮 loading 旋转，`.generate-btn.loading::before` 伪元素 spinner
- `@keyframes fadeInUp` — 进度区/渲染区淡入上滑
- `@keyframes shake` — 错误提示抖动
- 输入框 focus glow — `box-shadow: 0 0 0 3px var(--accent-glow)`
- 模态框过渡 — `opacity + visibility + transform: scale` 替代 `display:none`，HTML 类名从 `hidden` 改为 `modal-hidden`
- 搜索区缩小 — `body.has-result .search-section` 调整 padding 和字号
- 生成按钮 HTML 增加 `<span class="btn-text">` 包裹文字，loading 时隐藏

---

## Step 3: 配置管理模块

**目标：** 实现 LocalStorage 读写 + 设置面板交互

**修改文件：**
- `app.js`（已存在占位脚本，在此基础上添加逻辑）

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
   - 点击 `#config-cancel` 或 `#config-close` → 隐藏面板
   - 点击 `#config-save` → 保存配置，隐藏面板
   - 点击 `.preset-btn` → 一键填充 Base URL 和 Model（不自动保存，用户需手动点保存）
5. 页面加载时检测：如果 `apiKey` 为空，自动弹出设置面板
6. 导出 `getConfig()` 供其他模块使用

**验证：** 填写配置 → 保存 → 刷新页面 → 打开设置面板，配置仍在；清除 LocalStorage 后刷新，自动弹出设置面板

**✅ 已完成。** 实现细节：
- `STORAGE_KEY = 'llm_config'`，`DEFAULT_CONFIG` 含 apiKey/baseUrl/model
- `loadConfig()` 合并默认值与已存配置，`saveConfig()` 写入 LocalStorage
- `getConfig()` 惰性缓存，避免重复读取
- 设置面板：打开时填充当前配置，保存时 trim + 回填默认值
- 预设按钮：填充但不自动保存，点击后高亮 `.active`
- 点击遮罩层或按 Esc 关闭面板
- 页面加载时 apiKey 为空则自动弹出设置面板

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

**✅ 已完成。** 实现细节：
- `SYSTEM_PROMPT` 常量：7 条规则，覆盖纯 HTML 输出、内联 CSS/JS、CDN 例外、响应式、美观、无 markdown、可运行
- `buildUserPrompt(query)` 函数：将用户输入包装为生成指令

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

**✅ 已完成。** 实现细节：
- `streamGenerate(query, onChunk)` 异步函数
- URL 拼接：`baseUrl` 去尾部斜杠 + `/chat/completions`
- fetch 错误区分：`TypeError: Failed to fetch` → CORS/网络不可达提示；其他 → 通用网络错误
- HTTP 非 200：尝试解析 `errorBody.error.message`，失败则用状态码
- SSE 解析：`buffer` 缓存不完整行，按 `\n` 分割，`data: ` 前缀过滤，`[DONE]` 终止
- markdown 过滤：`inCodeBlock` 状态跟踪，移除 ` ```html ` 和 ` ``` ` 标记

---

## Step 6: 前端交互与渲染

**目标：** 串联完整流程——输入 → 流式生成 → 进度显示 → iframe 渲染

**修改文件：**
- `app.js`（追加内容）

**具体要求：**
1. 监听 `#search-form` 提交事件（已绑定 preventDefault，需添加实际逻辑）
2. 提交时：
   - 显示 `#progress-section`，隐藏 `#result-section` 和 `#error-section`
   - 禁用输入框和按钮
   - 初始化进度条为 0
3. 调用 `streamGenerate(query, onChunk)`：
   - `onChunk` 回调中：拼接 HTML 内容，更新进度条（基于已接收字符数估算，如每 500 字符 +5%，上限 95%）
   - 更新 `#progress-text`（如"已生成 1234 字符..."）
4. 生成完成后：
   - 进度条设为 100%，短暂延迟后隐藏 `#progress-section`
   - 将完整 HTML 通过 `#result-frame.srcdoc` 注入
   - 显示 `#result-section`
   - 恢复输入框和按钮
5. 错误处理：
   - 隐藏 `#progress-section`，显示 `#error-section`
   - 在 `#error-text` 中显示错误信息
   - 恢复输入框和按钮
   - `#retry-btn` 点击时重新提交上次的查询
6. 渲染区工具栏交互：
   - `#open-new-tab-btn`：用 `window.open()` + `document.write()` 在新标签页打开生成的 HTML
   - `#regenerate-btn`：用上次的查询重新生成

**验证：** 端到端测试——输入"一个番茄钟计时器"，能看到流式生成进度，最终在 iframe 中渲染出可用的番茄钟页面

**✅ 已完成。** 实现细节：
- `handleGenerate(query)` 串联全流程：禁用输入 → 显示进度 → 流式接收 → 渲染 iframe
- 进度估算：每 500 字符 +5%，上限 95%；完成时设 100% + 500ms 延迟后切换到渲染区
- `lastQuery` / `lastHtml` 缓存上次查询，支持重试和重新生成
- `#retry-btn` 和 `#regenerate-btn` 都调用 `handleGenerate(lastQuery)`
- `#open-new-tab-btn` 用 `window.open()` + `document.write()` 在新标签页打开
- 错误时隐藏进度区、显示错误区、恢复输入
- `body.has-result` 触发搜索区缩小上移

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

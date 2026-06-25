'use strict';

/* ===== Step 3: 配置管理模块 ===== */
// loadConfig(), saveConfig(), getConfig(), 设置面板交互

/* ===== Step 4: 系统提示词 ===== */
// SYSTEM_PROMPT, buildUserPrompt(query)

/* ===== Step 5: LLM 流式调用 ===== */
// streamGenerate(query, onChunk)

/* ===== Step 6: 前端交互与渲染 ===== */
// 表单提交, 进度更新, iframe 渲染

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
  }
});

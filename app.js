'use strict';

/* ===== 配置管理模块 ===== */

const STORAGE_KEY = 'llm_config';

const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o'
};

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('配置读取失败，使用默认值', e);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

let _config = null;
function getConfig() {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/* ===== 设置面板交互 ===== */

function openSettings() {
  const modal = document.getElementById('settings-modal');
  const config = getConfig();

  document.getElementById('config-api-key').value = config.apiKey;
  document.getElementById('config-base-url').value = config.baseUrl;
  document.getElementById('config-model').value = config.model;

  modal.classList.remove('modal-hidden');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('modal-hidden');
}

function handleSaveConfig() {
  const config = {
    apiKey: document.getElementById('config-api-key').value.trim(),
    baseUrl: document.getElementById('config-base-url').value.trim(),
    model: document.getElementById('config-model').value.trim()
  };

  if (!config.baseUrl) config.baseUrl = DEFAULT_CONFIG.baseUrl;
  if (!config.model) config.model = DEFAULT_CONFIG.model;

  saveConfig(config);
  _config = config;
  closeSettings();
}

function handlePresetClick(e) {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;

  document.getElementById('config-base-url').value = btn.dataset.baseUrl;
  document.getElementById('config-model').value = btn.dataset.model;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ===== 系统提示词 ===== */

const SYSTEM_PROMPT = `你是一个专业的网页生成器。根据用户描述，生成一个完整、独立、可直接运行的 HTML 页面。

规则：
1. 只输出纯 HTML 代码，从 <!DOCTYPE html> 开始
2. 所有 CSS 内联在 <style> 中，所有 JS 内联在 <script> 中
3. 不使用外部依赖（CDN 除外，如 Tailwind CDN）
4. 页面必须响应式，适配移动端
5. 设计现代、美观，交互完整
6. 不要输出任何解释、markdown 标记或代码块标记
7. 确保所有功能在浏览器中可正常运行`;

function buildUserPrompt(query) {
  return `请根据以下描述生成一个完整的 HTML 页面：\n\n${query}`;
}

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

  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('config-cancel').addEventListener('click', closeSettings);
  document.getElementById('config-close').addEventListener('click', closeSettings);
  document.getElementById('config-save').addEventListener('click', handleSaveConfig);

  document.querySelector('.presets').addEventListener('click', handlePresetClick);

  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  if (!getConfig().apiKey) {
    openSettings();
  }
});

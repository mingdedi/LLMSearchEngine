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

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

/* ===== LLM 流式调用 ===== */

async function streamGenerate(messages, onChunk) {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        stream: true
      })
    });
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('网络请求失败，可能是 CORS 限制或 Base URL 不可达。请检查设置中的 Base URL 是否正确，且该服务支持浏览器跨域访问。');
    }
    throw new Error(`网络请求失败：${err.message}`);
  }

  if (!response.ok) {
    let errorMsg = `API 返回错误 ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error?.message) {
        errorMsg = `API 错误：${errorBody.error.message}`;
      }
    } catch (_) {
      // 响应体非 JSON，使用状态码
    }
    throw new Error(errorMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inCodeBlock = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (!content) continue;

        let cleaned = content;
        if (cleaned.includes('```')) {
          if (cleaned.includes('```html')) {
            cleaned = cleaned.replace(/```html\n?/g, '');
            inCodeBlock = true;
          }
          if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/```/g, '');
            inCodeBlock = false;
          }
        }

        if (cleaned) {
          onChunk(cleaned);
        }
      } catch (_) {
        // JSON 解析失败，跳过不完整的 chunk
      }
    }
  }
}

/* ===== 前端交互与渲染 ===== */

let conversationHistory = [];
let lastHtml = '';
let lastQuery = '';

function handleGenerate(query) {
  if (!query.trim()) return;

  const config = getConfig();
  if (!config.apiKey) {
    openSettings();
    return;
  }

  lastQuery = query;
  conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(query) }
  ];

  const input = document.getElementById('search-input');
  const btn = document.getElementById('generate-btn');
  const progressSection = document.getElementById('progress-section');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const errorSection = document.getElementById('error-section');

  input.disabled = true;
  btn.disabled = true;
  btn.classList.add('loading');

  errorSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressBar.classList.add('pulsing');
  progressText.textContent = '准备生成...';

  let html = '';
  let charCount = 0;

  streamGenerate(conversationHistory, (chunk) => {
    html += chunk;
    charCount += chunk.length;
    const progress = Math.min(95, Math.floor(charCount / 500) * 5);
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `已生成 ${charCount} 字符...`;
  }).then(() => {
    progressBar.style.width = '100%';
    progressBar.classList.remove('pulsing');
    progressText.textContent = '生成完成！正在渲染...';

    lastHtml = html;
    conversationHistory.push({ role: 'assistant', content: html });

    setTimeout(() => {
      progressSection.classList.add('hidden');
      const frame = document.getElementById('result-frame');
      frame.srcdoc = html;
      document.getElementById('result-section').classList.remove('hidden');
      input.disabled = false;
      btn.disabled = false;
      btn.classList.remove('loading');
    }, 500);
  }).catch((err) => {
    progressSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    document.getElementById('error-text').textContent = err.message;
    input.disabled = false;
    btn.disabled = false;
    btn.classList.remove('loading');
  });
}

function handleCorrection(correction) {
  if (!correction.trim()) return;

  conversationHistory.push({ role: 'user', content: correction });

  const correctionInput = document.getElementById('correction-input');
  const correctionBtn = document.getElementById('correction-btn');
  const progressDiv = document.getElementById('correction-progress');
  const progressBar = document.getElementById('correction-progress-bar');

  correctionInput.disabled = true;
  correctionBtn.disabled = true;
  correctionBtn.classList.add('loading');
  progressDiv.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressBar.classList.add('pulsing');

  let html = '';
  let charCount = 0;

  streamGenerate(conversationHistory, (chunk) => {
    html += chunk;
    charCount += chunk.length;
    const progress = Math.min(95, Math.floor(charCount / 500) * 5);
    progressBar.style.width = `${progress}%`;
  }).then(() => {
    progressBar.style.width = '100%';
    progressBar.classList.remove('pulsing');

    lastHtml = html;
    conversationHistory.push({ role: 'assistant', content: html });

    setTimeout(() => {
      const frame = document.getElementById('result-frame');
      frame.srcdoc = html;
      progressDiv.classList.add('hidden');
      correctionInput.disabled = false;
      correctionBtn.disabled = false;
      correctionBtn.classList.remove('loading');
      correctionInput.value = '';
    }, 300);
  }).catch((err) => {
    conversationHistory.pop();
    progressDiv.classList.add('hidden');
    correctionInput.disabled = false;
    correctionBtn.disabled = false;
    correctionBtn.classList.remove('loading');
    showToast(err.message);
  });
}

function goBack() {
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('search-input').focus();
  conversationHistory = [];
  lastHtml = '';
}

function openInNewTab() {
  if (!lastHtml) return;
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.write(lastHtml);
    newTab.document.close();
  }
}

function showToast(message, duration = 4000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
}

/* ===== 初始化 ===== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('search-input').value;
      handleGenerate(query);
    });
  }

  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('config-cancel').addEventListener('click', closeSettings);
  document.getElementById('config-close').addEventListener('click', closeSettings);
  document.getElementById('config-save').addEventListener('click', handleSaveConfig);

  document.querySelector('.presets').addEventListener('click', handlePresetClick);

  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  document.getElementById('retry-btn').addEventListener('click', () => {
    if (lastQuery) handleGenerate(lastQuery);
  });

  document.getElementById('back-btn').addEventListener('click', goBack);

  const correctionForm = document.getElementById('correction-form');
  if (correctionForm) {
    correctionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const correction = document.getElementById('correction-input').value;
      handleCorrection(correction);
    });
  }

  document.getElementById('open-new-tab-btn').addEventListener('click', openInNewTab);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  if (!getConfig().apiKey) {
    openSettings();
  }
});

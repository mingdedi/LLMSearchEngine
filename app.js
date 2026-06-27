'use strict';

/* ===== 配置管理模块 ===== */

const STORAGE_KEY = 'llm_config';

const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.7,
  extraBody: ''
};

function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadConfigData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.configs && Array.isArray(parsed.configs)) {
        return parsed;
      }
      if (parsed.apiKey !== undefined || parsed.baseUrl !== undefined || parsed.model !== undefined) {
        const migrated = {
          configs: [{ id: _generateId(), name: '默认配置', ...parsed }],
          activeId: null
        };
        migrated.activeId = migrated.configs[0].id;
        return migrated;
      }
    }
  } catch (e) {
    console.warn('配置读取失败，使用默认值', e);
  }
  return { configs: [], activeId: null };
}

function saveConfigData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let _configData = null;
function getConfigData() {
  if (!_configData) {
    _configData = loadConfigData();
    if (_configData.configs.length > 0 && !_configData.activeId) {
      _configData.activeId = _configData.configs[0].id;
    }
  }
  return _configData;
}

function getActiveConfig() {
  const data = getConfigData();
  return data.configs.find(c => c.id === data.activeId) || data.configs[0] || null;
}

function getConfig() {
  const active = getActiveConfig();
  if (active) return active;
  return { ...DEFAULT_CONFIG };
}

/* ===== 设置面板交互 ===== */

let _editingId = null;

function openSettings() {
  const data = getConfigData();
  refreshConfigSelect();

  if (data.configs.length > 0) {
    _editingId = data.activeId || data.configs[0].id;
  } else {
    _editingId = null;
  }
  loadConfigToForm(_editingId);

  document.getElementById('settings-modal').classList.remove('modal-hidden');
}

function refreshConfigSelect() {
  const data = getConfigData();
  const select = document.getElementById('config-select');

  select.innerHTML = '';

  if (data.configs.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— 暂无配置，请新建 —';
    select.appendChild(opt);
  } else {
    data.configs.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const prefix = c.id === data.activeId ? '● ' : '○ ';
      opt.textContent = prefix + c.name;
      select.appendChild(opt);
    });
  }

  const newOpt = document.createElement('option');
  newOpt.value = 'new';
  newOpt.textContent = '＋ 新建配置';
  select.appendChild(newOpt);
}

function updateTempDisplay(val) {
  document.getElementById('temp-value-display').textContent = parseFloat(val).toFixed(2);
}

function loadConfigToForm(id) {
  const nameInput = document.getElementById('config-name');
  const apiKeyInput = document.getElementById('config-api-key');
  const baseUrlInput = document.getElementById('config-base-url');
  const modelInput = document.getElementById('config-model');
  const tempInput = document.getElementById('config-temperature');
  const extraBodyInput = document.getElementById('config-extra-body');
  const deleteBtn = document.getElementById('config-delete');
  const setActiveBtn = document.getElementById('config-set-active');

  if (!id || id === 'new') {
    _editingId = null;
    nameInput.value = '';
    apiKeyInput.value = '';
    baseUrlInput.value = '';
    modelInput.value = '';
    tempInput.value = 0.7;
    updateTempDisplay(0.7);
    extraBodyInput.value = '';
    deleteBtn.disabled = true;
    setActiveBtn.disabled = true;
    setActiveBtn.textContent = '设为当前';
    return;
  }

  const config = getConfigData().configs.find(c => c.id === id);
  if (!config) return;

  _editingId = id;
  nameInput.value = config.name;
  apiKeyInput.value = config.apiKey;
  baseUrlInput.value = config.baseUrl;
  modelInput.value = config.model;
  tempInput.value = config.temperature ?? 0.7;
  updateTempDisplay(config.temperature ?? 0.7);
  extraBodyInput.value = config.extraBody || '';

  deleteBtn.disabled = false;
  const isActive = id === getConfigData().activeId;
  setActiveBtn.disabled = isActive;
  setActiveBtn.textContent = isActive ? '✓ 当前使用' : '设为当前';
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('modal-hidden');
}

function handleConfigSelectChange() {
  const select = document.getElementById('config-select');
  loadConfigToForm(select.value);
}

function handleNewConfig() {
  document.getElementById('config-select').value = 'new';
  loadConfigToForm(null);
  document.getElementById('config-name').focus();
}

function handleDeleteConfig() {
  if (!_editingId) return;

  const data = getConfigData();
  data.configs = data.configs.filter(c => c.id !== _editingId);

  if (data.activeId === _editingId) {
    data.activeId = data.configs[0]?.id || null;
  }

  saveConfigData(data);
  _editingId = data.activeId;
  refreshConfigSelect();
  if (_editingId) {
    document.getElementById('config-select').value = _editingId;
  }
  loadConfigToForm(_editingId);
  updateModelSwitcher();
  showToast('配置已删除', 'success');
}

function handleSetActive() {
  if (!_editingId) return;
  const data = getConfigData();
  data.activeId = _editingId;
  saveConfigData(data);
  refreshConfigSelect();
  document.getElementById('config-select').value = _editingId;
  loadConfigToForm(_editingId);
  updateModelSwitcher();
  showToast('已切换为当前使用的配置', 'success');
}

function handleSaveConfig() {
  const name = document.getElementById('config-name').value.trim() || '未命名配置';
  const apiKey = document.getElementById('config-api-key').value.trim();
  const baseUrl = document.getElementById('config-base-url').value.trim() || DEFAULT_CONFIG.baseUrl;
  const model = document.getElementById('config-model').value.trim() || DEFAULT_CONFIG.model;
  const temperature = parseFloat(document.getElementById('config-temperature').value) || DEFAULT_CONFIG.temperature;
  const extraBody = document.getElementById('config-extra-body').value.trim();

  const data = getConfigData();

  if (_editingId) {
    const config = data.configs.find(c => c.id === _editingId);
    if (config) {
      config.name = name;
      config.apiKey = apiKey;
      config.baseUrl = baseUrl;
      config.model = model;
      config.temperature = temperature;
      config.extraBody = extraBody;
    }
  } else {
    const newConfig = { id: _generateId(), name, apiKey, baseUrl, model, temperature, extraBody };
    data.configs.push(newConfig);
    _editingId = newConfig.id;
    if (data.configs.length === 1) {
      data.activeId = newConfig.id;
    }
  }

  saveConfigData(data);
  refreshConfigSelect();
  document.getElementById('config-select').value = _editingId;
  loadConfigToForm(_editingId);
  updateModelSwitcher();
  showToast('配置已保存', 'success');
}

function handlePresetClick(e) {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;

  if (btn.dataset.name) {
    document.getElementById('config-name').value = btn.dataset.name;
  }
  document.getElementById('config-base-url').value = btn.dataset.baseUrl;
  document.getElementById('config-model').value = btn.dataset.model;
  if (btn.dataset.temperature) {
    document.getElementById('config-temperature').value = btn.dataset.temperature;
    updateTempDisplay(btn.dataset.temperature);
  }
  document.getElementById('config-extra-body').value = btn.dataset.extraBody || '';

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ===== 模型切换器 ===== */

function updateModelSwitcher() {
  const config = getActiveConfig();
  const nameEl = document.getElementById('current-model-name');
  if (config) {
    nameEl.textContent = config.name;
  } else {
    nameEl.textContent = '未配置';
  }

  const dropdown = document.getElementById('model-dropdown');
  const data = getConfigData();

  dropdown.innerHTML = '';

  if (data.configs.length === 0) {
    const item = document.createElement('div');
    item.className = 'model-dropdown-item';
    item.innerHTML = '<span class="model-dropdown-name">暂无配置，请点击设置添加</span>';
    item.addEventListener('click', () => {
      closeModelDropdown();
      openSettings();
    });
    dropdown.appendChild(item);
    return;
  }

  data.configs.forEach(c => {
    const item = document.createElement('div');
    item.className = 'model-dropdown-item' + (c.id === data.activeId ? ' active' : '');
    item.innerHTML =
      '<span class="model-dropdown-name">' + c.name + '</span>' +
      '<span class="model-dropdown-model">' + c.model + '</span>';
    item.addEventListener('click', () => {
      data.activeId = c.id;
      saveConfigData(data);
      updateModelSwitcher();
      closeModelDropdown();
      showToast('已切换到：' + c.name, 'success');
    });
    dropdown.appendChild(item);
  });
}

function toggleModelDropdown() {
  document.getElementById('model-dropdown').classList.toggle('hidden');
}

function closeModelDropdown() {
  document.getElementById('model-dropdown').classList.add('hidden');
}

/* ===== 系统提示词 ===== */

const SYSTEM_PROMPT = `你是一位资深前端工程师，擅长根据自然语言描述生成完整、独立、可直接在浏览器中运行的 HTML 页面。

## 核心任务
将用户的文字描述转化为一个功能完整、视觉精美的单文件 HTML 页面。

## 运行环境（重要）
生成的页面将在一个 sandbox iframe 中运行，具体限制如下：
- 允许运行 JavaScript、提交表单、使用 alert/confirm/prompt
- 禁止使用 localStorage、sessionStorage、IndexedDB、Cookie 等存储 API（沙箱未授权 same-origin）
- 禁止使用 window.open()、window.close() 等弹窗 API
- 禁止使用 fetch/XMLHttpRequest 发起网络请求
- 页面通过 srcdoc 注入，所有资源路径必须为绝对 URL（CDN 链接可用），不得使用相对路径
- 如需保存状态（如游戏分数、用户输入），请使用 JavaScript 内存中的变量

## 技术规范
1. 输出从 <!DOCTYPE html> 开始的完整 HTML 文档
2. 所有 CSS 写在 <style> 标签内，所有 JavaScript 写在 <script> 标签内
3. 可使用 CDN 引入外部库（如 Tailwind CSS、Three.js、Chart.js 等），但不得依赖任何本地文件
4. 页面必须响应式，在手机和桌面端均有良好表现
5. 使用语义化 HTML 标签（<header>、<main>、<section>、<nav> 等）

## 设计规范
1. 采用现代扁平化设计风格，配色和谐、层次分明
2. 合理使用留白、圆角、阴影提升视觉质感
3. 交互元素需有 hover、active 等状态反馈
4. 适当使用 CSS 过渡和动画增强体验，但不过度

## 功能规范
1. 所有按钮、表单等交互元素必须绑定真实的事件处理逻辑
2. 若为游戏，需包含完整的游戏循环（开始 → 进行 → 结束/重启）和计分机制
3. 若为工具，需实现完整的核心功能逻辑，不得有占位符或 TODO
4. 代码需处理常见边界情况（如空输入、除零等）

## 输出格式（严格遵守）
1. 只输出纯 HTML 代码，从 <!DOCTYPE html> 开始，到 </html> 结束
2. 绝不输出任何解释性文字、markdown 标记、代码块标记（如 \`\`\`）
3. 绝不输出任何前缀或后缀说明

## 修正模式
当用户发送修正请求时（如"把按钮改成红色"、"增加一个搜索功能"），你应当：
1. 基于上一版本页面进行修改，保留未提及的部分不变
2. 只调整用户要求修改的内容
3. 同样只输出完整的修改后 HTML 代码`;

function buildUserPrompt(query) {
  return `请根据以下描述，生成一个完整、可直接运行的 HTML 页面：\n\n${query}`;
}

/* ===== LLM 流式调用 ===== */

async function streamGenerate(messages, onChunk) {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let extraBody = {};
  if (config.extraBody) {
    try {
      extraBody = JSON.parse(config.extraBody);
    } catch (e) {
      throw new Error('Extra Body JSON 格式无效，请在设置中检查');
    }
  }

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
        temperature: config.temperature,
        messages: messages,
        stream: true,
        ...extraBody
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
  let htmlStarted = false;
  let preBuffer = '';

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
      if (data === '[DONE]') {
        if (!htmlStarted) {
          throw new Error('模型未返回有效的 HTML 代码，请重试或更换模型');
        }
        return;
      }

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (!content) continue;

        let cleaned = content;
        if (cleaned.includes('```')) {
          if (cleaned.includes('```html')) {
            cleaned = cleaned.replace(/```html\n?/g, '');
          }
          if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/```/g, '');
          }
        }

        if (!cleaned) continue;

        if (!htmlStarted) {
          preBuffer += cleaned;
          const marker = preBuffer.match(/<!DOCTYPE\s+html|<html[\s>]/i);
          if (marker) {
            htmlStarted = true;
            onChunk(preBuffer.slice(marker.index));
            preBuffer = '';
          }
        } else {
          onChunk(cleaned);
        }
      } catch (_) {
        // JSON 解析失败，跳过不完整的 chunk
      }
    }
  }

  if (!htmlStarted) {
    throw new Error('模型未返回有效的 HTML 代码，请重试或更换模型');
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

  document.title = `生成中：${query} — LLMSearchEngine`;

  let html = '';
  let charCount = 0;
  const startTime = Date.now();

  streamGenerate(conversationHistory, (chunk) => {
    html += chunk;
    charCount += chunk.length;
    const progress = Math.min(95, Math.floor(charCount / 500) * 5);
    progressBar.style.width = `${progress}%`;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    progressText.textContent = `已生成 ${charCount} 字符 · ${elapsed}s`;
  }).then(() => {
    progressBar.style.width = '100%';
    progressBar.classList.remove('pulsing');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    progressText.textContent = `生成完成 · ${charCount} 字符 · ${elapsed}s`;

    lastHtml = html;
    conversationHistory.push({ role: 'assistant', content: html });

    document.title = `${query} — LLMSearchEngine`;

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
  const startTime = Date.now();

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
  document.title = 'LLMSearchEngine — 生成式搜索引擎';
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

function downloadHtml() {
  if (!lastHtml) return;

  const blob = new Blob([lastHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeName = (lastQuery || 'generated-page')
    .replace(/[\\/:*?"<>|]/g, '')
    .slice(0, 50)
    .trim() || 'generated-page';

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===== 强制修正 → 跳转小游戏 ===== */

function openForceGame() {
  sessionStorage.setItem('llm_game_context', JSON.stringify({
    conversationHistory,
    lastHtml,
    lastQuery
  }));
  window.location.href = 'game.html';
}

function restoreContext() {
  const saved = sessionStorage.getItem('llm_game_context');
  if (!saved) return false;

  try {
    const ctx = JSON.parse(saved);
    conversationHistory = ctx.conversationHistory || [];
    lastHtml = ctx.lastHtml || '';
    lastQuery = ctx.lastQuery || '';

    if (lastHtml) {
      const frame = document.getElementById('result-frame');
      frame.srcdoc = lastHtml;
      document.getElementById('result-section').classList.remove('hidden');
      document.title = `${lastQuery} — LLMSearchEngine`;
      sessionStorage.removeItem('llm_game_context');
      return true;
    }
  } catch (e) {
    sessionStorage.removeItem('llm_game_context');
  }
  return false;
}

function showToast(message, type = 'error', duration = 4000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'success') {
    toast.classList.add('toast-success');
  }
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
  document.getElementById('config-select').addEventListener('change', handleConfigSelectChange);
  document.getElementById('config-new').addEventListener('click', handleNewConfig);
  document.getElementById('config-delete').addEventListener('click', handleDeleteConfig);
  document.getElementById('config-set-active').addEventListener('click', handleSetActive);

  document.getElementById('model-switch-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModelDropdown();
  });

  document.addEventListener('click', (e) => {
    const switcher = document.querySelector('.model-switcher');
    if (switcher && !switcher.contains(e.target)) {
      closeModelDropdown();
    }
  });

  document.querySelector('.presets').addEventListener('click', handlePresetClick);

  document.getElementById('config-temperature').addEventListener('input', (e) => {
    updateTempDisplay(e.target.value);
  });

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

  document.getElementById('download-btn').addEventListener('click', downloadHtml);

  document.getElementById('force-correct-btn').addEventListener('click', openForceGame);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
      closeModelDropdown();
    }
  });

  if (!getConfig().apiKey) {
    openSettings();
  }

  updateModelSwitcher();

  restoreContext();

  /* ===== 标语轮播 ===== */
  const taglineEl = document.getElementById('tagline');
  const phrases = [
    '描述你想要的页面，AI 为你实时生成',
    'What can I say?!',
    '摸鱼小游戏？',
    'Windows模拟器',
    '原神启动！！！',
    'iKun TV',
    '网页加载不出请点击上方强制修正'
  ];

  taglineEl.innerHTML = phrases.map((p, i) =>
    `<span class="tagline-text${i === 0 ? ' active' : ''}">${p}</span>`
  ).join('');

  let currentIdx = 0;
  const spans = taglineEl.querySelectorAll('.tagline-text');

  function rotateTagline() {
    const current = spans[currentIdx];
    current.classList.remove('active');
    current.classList.add('leaving');

    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * phrases.length);
    } while (nextIdx === currentIdx && phrases.length > 1);

    currentIdx = nextIdx;

    setTimeout(() => {
      current.classList.remove('leaving');
      spans[currentIdx].classList.add('active');
    }, 500);
  }

  setInterval(rotateTagline, 2800);
});

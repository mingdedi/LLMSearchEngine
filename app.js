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

/* ===== LLM 跳格子小游戏 ===== */

let gameCanvas = null;
let gameCtx = null;
let gameAnimId = null;
let gameState = null;

function initGameState() {
  return {
    running: false,
    score: 0,
    speed: 5,
    llm: { x: 80, y: 0, vy: 0, jumping: false, width: 54, height: 36 },
    hurdles: [],
    groundY: 0,
    spawnTimer: 0,
    spawnInterval: 100,
    frameCount: 0
  };
}

function resizeGameCanvas() {
  if (!gameCanvas) return;
  gameCanvas.width = gameCanvas.offsetWidth;
  gameCanvas.height = gameCanvas.offsetHeight;
  if (gameState) gameState.groundY = gameCanvas.height - 50;
}

function openForceGame() {
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('game-section').classList.remove('hidden');

  gameCanvas = document.getElementById('game-canvas');
  gameCtx = gameCanvas.getContext('2d');
  resizeGameCanvas();

  gameState = initGameState();
  gameState.groundY = gameCanvas.height - 50;

  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-over-overlay').classList.add('hidden');
  document.getElementById('game-start-overlay').classList.remove('hidden');

  drawGame();
}

function startGameLoop() {
  if (!gameState) return;
  gameState.running = true;
  document.getElementById('game-start-overlay').classList.add('hidden');
  gameLoop();
}

function gameLoop() {
  if (!gameState || !gameState.running) return;
  updateGame();
  drawGame();
  gameAnimId = requestAnimationFrame(gameLoop);
}

function updateGame() {
  const llm = gameState.llm;

  if (llm.jumping) {
    llm.vy -= 0.7;
    llm.y += llm.vy;
    if (llm.y <= 0) {
      llm.y = 0;
      llm.vy = 0;
      llm.jumping = false;
    }
  }

  gameState.spawnTimer++;
  if (gameState.spawnTimer >= gameState.spawnInterval) {
    gameState.spawnTimer = 0;
    gameState.spawnInterval = 70 + Math.floor(Math.random() * 50);
    spawnHurdle();
  }

  for (let i = gameState.hurdles.length - 1; i >= 0; i--) {
    const h = gameState.hurdles[i];
    h.x -= gameState.speed;
    if (h.x + h.width < 0) {
      gameState.hurdles.splice(i, 1);
      gameState.score += 10;
      document.getElementById('game-score').textContent = gameState.score;
    }
  }

  gameState.speed += 0.003;
  gameState.frameCount++;

  const llmLeft = llm.x;
  const llmRight = llm.x + llm.width;
  const llmBottom = gameState.groundY - llm.y;
  const llmTop = llmBottom - llm.height;

  for (const h of gameState.hurdles) {
    const hLeft = h.x;
    const hRight = h.x + h.width;
    const hTop = gameState.groundY - h.height;
    const hBottom = gameState.groundY;

    if (llmRight > hLeft + 4 && llmLeft < hRight - 4 && llmBottom > hTop + 4) {
      gameOver();
      return;
    }
  }
}

function spawnHurdle() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const len = 4 + Math.floor(Math.random() * 4);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  const height = 45 + Math.random() * 50;
  const width = 12 + str.length * 9;
  gameState.hurdles.push({
    x: gameCanvas.width + 20,
    width: width,
    height: height,
    string: str
  });
}

function drawGame() {
  if (!gameCtx || !gameCanvas) return;
  const ctx = gameCtx;
  const w = gameCanvas.width;
  const h = gameCanvas.height;
  const groundY = gameState.groundY;

  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(42, 42, 74, 0.4)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 20, groundY + 8);
    ctx.stroke();
  }

  ctx.font = '14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const hurdle of gameState.hurdles) {
    const hx = hurdle.x;
    const hy = groundY - hurdle.height;

    ctx.fillStyle = 'rgba(108, 99, 255, 0.15)';
    ctx.fillRect(hx, hy, hurdle.width, hurdle.height);

    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx, hy, hurdle.width, hurdle.height);

    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(hurdle.string, hx + hurdle.width / 2, hy + hurdle.height / 2);
  }

  const llm = gameState.llm;
  const llmBottom = groundY - llm.y;

  if (llm.jumping) {
    ctx.fillStyle = 'rgba(108, 99, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(llm.x + llm.width / 2, groundY + 2, llm.width / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
  ctx.fillText('LLM', llm.x + 2, llmBottom + 2);

  ctx.fillStyle = '#6c63ff';
  ctx.fillText('LLM', llm.x, llmBottom);
}

function jumpLlm() {
  if (!gameState || !gameState.running) return;
  if (!gameState.llm.jumping) {
    gameState.llm.jumping = true;
    gameState.llm.vy = 13;
  }
}

function gameOver() {
  gameState.running = false;
  cancelAnimationFrame(gameAnimId);
  document.getElementById('game-final-score').textContent = gameState.score;
  document.getElementById('game-over-overlay').classList.remove('hidden');
}

function restartGame() {
  document.getElementById('game-over-overlay').classList.add('hidden');
  gameState = initGameState();
  gameState.groundY = gameCanvas.height - 50;
  document.getElementById('game-score').textContent = '0';
  startGameLoop();
}

function exitGameToHome() {
  if (gameState) gameState.running = false;
  cancelAnimationFrame(gameAnimId);
  document.getElementById('game-section').classList.add('hidden');
  document.getElementById('game-over-overlay').classList.add('hidden');
  document.getElementById('game-start-overlay').classList.remove('hidden');
  goBack();
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

  document.getElementById('force-correct-btn').addEventListener('click', openForceGame);

  document.getElementById('game-start-btn').addEventListener('click', startGameLoop);
  document.getElementById('game-restart-btn').addEventListener('click', restartGame);
  document.getElementById('game-home-btn').addEventListener('click', exitGameToHome);

  document.getElementById('game-canvas').addEventListener('click', jumpLlm);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState && gameState.running) {
      e.preventDefault();
      jumpLlm();
    }
  });

  window.addEventListener('resize', resizeGameCanvas);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  if (!getConfig().apiKey) {
    openSettings();
  }

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

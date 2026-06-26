(function () {
  'use strict';

  var API_URL = '/api/chat';
  var MAX_HISTORY = 10;
  var WELCOME_DELAY = 1000;

  var isOpen = false;
  var isLoading = false;
  var history = [];
  var loadingEl = null;

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '#jys-cb-wrap * { box-sizing: border-box; margin: 0; padding: 0; }',

    /* Toggle button */
    '#jys-cb-toggle {',
    '  position: fixed; bottom: 28px; right: 28px;',
    '  width: 58px; height: 58px; border-radius: 50%; border: none;',
    '  background: linear-gradient(135deg,#A855F7,#7C3AED);',
    '  box-shadow: 0 8px 28px rgba(168,85,247,0.5);',
    '  cursor: pointer; z-index: 9999;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: transform .2s ease, box-shadow .2s ease;',
    '}',
    '#jys-cb-toggle:hover { transform: scale(1.09); box-shadow: 0 12px 36px rgba(168,85,247,0.65); }',

    /* Close icon hidden by default */
    '#jys-cb-toggle .jys-icon-close { display: none; }',
    '#jys-cb-toggle.jys-open-btn .jys-icon-chat { display: none; }',
    '#jys-cb-toggle.jys-open-btn .jys-icon-close { display: flex; }',

    /* Panel */
    '#jys-cb-panel {',
    '  position: fixed; bottom: 100px; right: 28px;',
    '  width: 380px; max-width: calc(100vw - 40px);',
    '  height: 520px; max-height: calc(100vh - 140px);',
    '  background: #0E1330;',
    '  border: 1px solid rgba(255,255,255,0.08);',
    '  border-radius: 20px;',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  z-index: 9998;',
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(168,85,247,0.12);',
    '  transform: translateY(16px); opacity: 0; pointer-events: none;',
    '  transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;',
    '}',
    '#jys-cb-panel.jys-open { transform: translateY(0); opacity: 1; pointer-events: all; }',

    /* Header */
    '#jys-cb-header {',
    '  padding: 14px 16px;',
    '  background: linear-gradient(135deg, rgba(124,58,237,0.28), rgba(168,85,247,0.12));',
    '  border-bottom: 1px solid rgba(255,255,255,0.08);',
    '  display: flex; align-items: center; gap: 10px; flex-shrink: 0;',
    '}',
    '#jys-cb-avatar {',
    '  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;',
    '  background: linear-gradient(135deg,#A855F7,#7C3AED);',
    '  display: flex; align-items: center; justify-content: center;',
    '}',
    '#jys-cb-header-info { flex: 1; }',
    '#jys-cb-header-title { font-family: "Pretendard","Pretendard Variable",sans-serif; font-size: 14px; font-weight: 700; color: #F5F7FF; }',
    '#jys-cb-header-status { display: flex; align-items: center; gap: 5px; margin-top: 3px; }',
    '#jys-cb-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 6px #4ADE80; flex-shrink: 0; }',
    '#jys-cb-status-text { font-family: "Pretendard","Pretendard Variable",sans-serif; font-size: 11.5px; color: #8A92B8; }',
    '#jys-cb-close {',
    '  width: 30px; height: 30px; border: none; border-radius: 50%;',
    '  background: rgba(255,255,255,0.07); color: #8A92B8; font-size: 16px;',
    '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
    '  transition: background .15s, color .15s; flex-shrink: 0;',
    '}',
    '#jys-cb-close:hover { background: rgba(255,255,255,0.14); color: #EDEFFA; }',

    /* Messages */
    '#jys-cb-messages {',
    '  flex: 1; overflow-y: auto; padding: 16px;',
    '  display: flex; flex-direction: column; gap: 10px;',
    '  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;',
    '}',
    '#jys-cb-messages::-webkit-scrollbar { width: 3px; }',
    '#jys-cb-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }',

    /* Message rows */
    '.jys-row { display: flex; flex-direction: column; max-width: 85%; }',
    '.jys-row-user { align-self: flex-end; align-items: flex-end; }',
    '.jys-row-bot  { align-self: flex-start; align-items: flex-start; }',
    '.jys-row-err  { align-self: center; max-width: 94%; }',

    /* Bubbles */
    '.jys-bubble {',
    '  padding: 10px 13px; border-radius: 16px;',
    '  font-family: "Pretendard","Pretendard Variable",sans-serif;',
    '  font-size: 14px; line-height: 1.62; word-break: break-word;',
    '}',
    '.jys-bubble-user { background: linear-gradient(135deg,#A855F7,#7C3AED); color: #fff; border-bottom-right-radius: 4px; }',
    '.jys-bubble-bot  { background: rgba(255,255,255,0.06); color: #EDEFFA; border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px; }',
    '.jys-bubble-err  { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.28); color: #FCA5A5; border-radius: 12px; font-size: 13px; text-align: center; }',

    /* Typing dots */
    '.jys-typing {',
    '  display: flex; align-items: center; gap: 5px;',
    '  padding: 12px 16px;',
    '  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);',
    '  border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content;',
    '}',
    '.jys-dot {',
    '  width: 7px; height: 7px; border-radius: 50%; background: #8A92B8;',
    '  animation: jysBounce .8s infinite ease-in-out;',
    '}',
    '.jys-dot:nth-child(2) { animation-delay: .15s; }',
    '.jys-dot:nth-child(3) { animation-delay: .3s; }',
    '@keyframes jysBounce { 0%,80%,100% { transform:translateY(0); opacity:.45; } 40% { transform:translateY(-6px); opacity:1; } }',

    /* Input area */
    '#jys-cb-input-area {',
    '  padding: 12px 13px; border-top: 1px solid rgba(255,255,255,0.07);',
    '  display: flex; gap: 8px; background: #080B1C; flex-shrink: 0;',
    '}',
    '#jys-cb-input {',
    '  flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10);',
    '  border-radius: 11px; padding: 10px 13px;',
    '  font-family: "Pretendard","Pretendard Variable",sans-serif; font-size: 14px;',
    '  color: #EDEFFA; outline: none; transition: border-color .15s;',
    '}',
    '#jys-cb-input::placeholder { color: #9AA3C7; }',
    '#jys-cb-input:focus { border-color: #A855F7; }',
    '#jys-cb-send {',
    '  width: 42px; height: 42px; border: none; border-radius: 11px;',
    '  background: linear-gradient(135deg,#A855F7,#7C3AED);',
    '  color: #fff; cursor: pointer; flex-shrink: 0;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: opacity .15s;',
    '}',
    '#jys-cb-send:hover { opacity: .85; }',
    '#jys-cb-send:disabled { opacity: .35; cursor: not-allowed; }',

    /* Mobile */
    '@media (max-width: 480px) {',
    '  #jys-cb-panel { right: 20px; bottom: 86px; }',
    '  #jys-cb-toggle { right: 20px; bottom: 20px; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  /* ── DOM ── */
  var wrap = document.createElement('div');
  wrap.id = 'jys-cb-wrap';
  wrap.innerHTML = [
    '<button id="jys-cb-toggle" aria-label="채팅 상담 열기">',
    '  <span class="jys-icon-chat" style="display:flex;align-items:center;justify-content:center;">',
    '    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">',
    '      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"',
    '        stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
    '    </svg>',
    '  </span>',
    '  <span class="jys-icon-close" style="align-items:center;justify-content:center;">',
    '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">',
    '      <path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    '    </svg>',
    '  </span>',
    '</button>',

    '<div id="jys-cb-panel" role="dialog" aria-label="JYS마케팅 AI 상담">',
    '  <div id="jys-cb-header">',
    '    <div id="jys-cb-avatar">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">',
    '        <path d="M5 17L11 10l3.5 3.5L20 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    '        <path d="M15 6h5v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    '      </svg>',
    '    </div>',
    '    <div id="jys-cb-header-info">',
    '      <div id="jys-cb-header-title">JYS마케팅 AI 상담</div>',
    '      <div id="jys-cb-header-status">',
    '        <span id="jys-cb-status-dot"></span>',
    '        <span id="jys-cb-status-text">온라인 · 즉시 응답</span>',
    '      </div>',
    '    </div>',
    '    <button id="jys-cb-close" aria-label="닫기">✕</button>',
    '  </div>',
    '  <div id="jys-cb-messages"></div>',
    '  <div id="jys-cb-input-area">',
    '    <input id="jys-cb-input" type="text" placeholder="메시지를 입력하세요..." maxlength="400" autocomplete="off">',
    '    <button id="jys-cb-send" aria-label="전송">',
    '      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">',
    '        <path d="M22 2L11 13" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    '        <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '</div>',
  ].join('');
  document.body.appendChild(wrap);

  /* ── Refs ── */
  var toggleBtn = document.getElementById('jys-cb-toggle');
  var panel     = document.getElementById('jys-cb-panel');
  var closeBtn  = document.getElementById('jys-cb-close');
  var msgArea   = document.getElementById('jys-cb-messages');
  var inputEl   = document.getElementById('jys-cb-input');
  var sendBtn   = document.getElementById('jys-cb-send');

  /* ── Helpers ── */
  function openChat() {
    isOpen = true;
    panel.classList.add('jys-open');
    toggleBtn.classList.add('jys-open-btn');
    toggleBtn.setAttribute('aria-label', '채팅 상담 닫기');
    setTimeout(function () { inputEl.focus(); }, 320);
  }

  function closeChat() {
    isOpen = false;
    panel.classList.remove('jys-open');
    toggleBtn.classList.remove('jys-open-btn');
    toggleBtn.setAttribute('aria-label', '채팅 상담 열기');
  }

  function addMessage(role, text) {
    var row = document.createElement('div');
    row.className = 'jys-row jys-row-' + role;
    var bubble = document.createElement('div');
    bubble.className = 'jys-bubble jys-bubble-' + role;
    bubble.textContent = text;
    row.appendChild(bubble);
    msgArea.appendChild(row);
    msgArea.scrollTop = msgArea.scrollHeight;
    return row;
  }

  function showLoading() {
    var row = document.createElement('div');
    row.className = 'jys-row jys-row-bot';
    row.innerHTML = '<div class="jys-typing"><div class="jys-dot"></div><div class="jys-dot"></div><div class="jys-dot"></div></div>';
    msgArea.appendChild(row);
    loadingEl = row;
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function hideLoading() {
    if (loadingEl) { loadingEl.remove(); loadingEl = null; }
  }

  function setInputDisabled(v) {
    inputEl.disabled = v;
    sendBtn.disabled = v;
  }

  /* ── Send ── */
  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    inputEl.value = '';
    isLoading = true;
    setInputDisabled(true);

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    addMessage('user', text);
    showLoading();

    try {
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var data = await res.json();
      var reply = data.message || '응답을 받지 못했습니다.';

      history.push({ role: 'assistant', content: reply });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

      hideLoading();
      addMessage('bot', reply);
    } catch (err) {
      console.error('[JYS챗봇]', err);
      hideLoading();
      addMessage('err', '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      isLoading = false;
      setInputDisabled(false);
      inputEl.focus();
    }
  }

  /* ── Events ── */
  toggleBtn.addEventListener('click', function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  /* ── Welcome ── */
  setTimeout(function () {
    openChat();
    setTimeout(function () {
      addMessage('bot', '안녕하세요! JYS마케팅 AI 상담사입니다 😊\n서비스나 요금, 진행 방법 등 궁금한 점을 편하게 물어보세요!');
    }, 350);
  }, WELCOME_DELAY);
})();

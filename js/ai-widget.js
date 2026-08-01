/* ==========================================================================
   AI ASSISTANT WIDGET
   Self-contained: injects its own stylesheet and DOM into whatever page
   includes this script, so every page only needs one <script> tag.

   Talks to /api/chat (a Vercel serverless function that holds the Gemini
   key server-side). If that endpoint isn't reachable — e.g. the site is
   deployed to GitHub Pages instead of Vercel, or running from a plain
   static host — the widget degrades gracefully to a WhatsApp prompt
   instead of silently failing.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '923287658832';
  const SUGGESTIONS = ['Help me find my size', 'What fabrics do you use?', 'How does a custom order work?', 'What\'s your delivery time?'];
  let history = [];
  let hasGreeted = false;
  let backendUnavailable = false;

  function injectStyles() {
    // Pages now link css/ai-widget.css directly in <head> so it's ready
    // before this script runs (this used to inject the stylesheet at
    // runtime, which caused a visible flash of the unstyled button before
    // the CSS arrived). Only fall back to injecting it here if a page
    // forgot to add the <head> link.
    if (document.querySelector('link[href="css/ai-widget.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/ai-widget.css';
    document.head.appendChild(link);
  }

  function injectMarkup() {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'ai-fab';
    fab.setAttribute('aria-label', 'Open shopping assistant');
    fab.innerHTML = `
      <span class="ai-fab-icon"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM9 10h.01M12 10h.01M15 10h.01" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span>Ask the Atelier</span>
    `;

    const panel = document.createElement('div');
    panel.className = 'ai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Atelier shopping assistant chat');
    panel.innerHTML = `
      <div class="ai-panel-header">
        <div class="ai-title">
          <span class="ai-avatar"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM9 10h.01M12 10h.01M15 10h.01" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <div><h4>Atelier Assistant</h4><p>Sizing · Custom Orders · Fabrics</p></div>
        </div>
        <button type="button" class="ai-panel-close" aria-label="Close chat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-width="1.5" stroke-linecap="round"/></svg></button>
      </div>
      <div class="ai-messages" data-ai-messages aria-live="polite" aria-atomic="false"></div>
      <div class="ai-suggestions" data-ai-suggestions></div>
      <div class="ai-input-row">
        <label for="ai-chat-input" class="visually-hidden">Type your message</label>
        <textarea id="ai-chat-input" rows="1" placeholder="Ask about sizing, fabrics, orders..." data-ai-input></textarea>
        <button type="button" class="ai-send-btn" data-ai-send aria-label="Send message">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    return { fab, panel };
  }

  function addMessage(role, text) {
    const messages = document.querySelector('[data-ai-messages]');
    const msg = document.createElement('div');
    msg.className = `ai-msg ai-msg-${role === 'assistant' ? 'bot' : 'user'}`;
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    bubble.textContent = text;
    msg.appendChild(bubble);
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const messages = document.querySelector('[data-ai-messages]');
    const typing = document.createElement('div');
    typing.className = 'ai-typing';
    typing.setAttribute('data-ai-typing', '');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    return typing;
  }

  function showFallback() {
    const messages = document.querySelector('[data-ai-messages]');
    const fallback = document.createElement('div');
    fallback.className = 'ai-fallback';
    fallback.innerHTML = `The live assistant isn't available on this deployment right now — <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">message us on WhatsApp</a> and we'll help directly.`;
    messages.appendChild(fallback);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderSuggestions() {
    const wrap = document.querySelector('[data-ai-suggestions]');
    wrap.innerHTML = SUGGESTIONS.map((s) => `<button type="button" class="ai-suggestion-chip">${s}</button>`).join('');
    wrap.querySelectorAll('.ai-suggestion-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        sendMessage(chip.textContent);
        wrap.innerHTML = '';
      });
    });
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || backendUnavailable) return;

    addMessage('user', trimmed);
    history.push({ role: 'user', text: trimmed });

    const input = document.querySelector('[data-ai-input]');
    input.value = '';
    document.querySelector('[data-ai-send]').disabled = true;

    const typing = showTyping();

    try {
      const res = await fetch('api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: history.slice(0, -1) })
      });

      typing.remove();

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addMessage('assistant', errData.error || "Sorry, I'm having trouble answering right now — try WhatsApp instead.");
        return;
      }

      const data = await res.json();
      addMessage('assistant', data.reply);
      history.push({ role: 'assistant', text: data.reply });
    } catch (err) {
      typing.remove();
      backendUnavailable = true;
      showFallback();
    } finally {
      document.querySelector('[data-ai-send]').disabled = false;
    }
  }

  function initEvents(fab, panel) {
    const closeBtn = panel.querySelector('.ai-panel-close');
    const input = panel.querySelector('[data-ai-input]');
    const sendBtn = panel.querySelector('[data-ai-send]');

    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-haspopup', 'dialog');

    function open() {
      panel.classList.add('is-open');
      fab.classList.add('is-hidden');
      fab.setAttribute('aria-expanded', 'true');
      if (!hasGreeted) {
        hasGreeted = true;
        addMessage('assistant', "Hi! I'm the Atelier Assistant — ask me about sizing, fabrics, custom orders, or anything else about our corsets.");
        renderSuggestions();
      }
      input.focus();
    }
    function close() {
      panel.classList.remove('is-open');
      fab.classList.remove('is-hidden');
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    }

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });
  }

  function init() {
    injectStyles();
    const { fab, panel } = injectMarkup();
    initEvents(fab, panel);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

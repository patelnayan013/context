/**
 * Knowledge Base Chat Widget
 *
 * Usage:
 * <script
 *   src="https://your-domain.com/widget.js"
 *   data-api-url="https://your-domain.com"
 *   data-position="bottom-right"
 *   data-theme="light"
 *   data-primary-color="#6366f1"
 *   data-title="Ask us anything"
 *   data-placeholder="Type your question..."
 *   defer
 * ></script>
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.KnowledgeWidget) return;

  // Get configuration from script tag
  const currentScript = document.currentScript;
  const config = {
    apiUrl: currentScript?.dataset.apiUrl || window.location.origin,
    position: currentScript?.dataset.position || 'bottom-right',
    theme: currentScript?.dataset.theme || 'light',
    primaryColor: currentScript?.dataset.primaryColor || '#6366f1',
    title: currentScript?.dataset.title || 'Ask us anything',
    placeholder: currentScript?.dataset.placeholder || 'Type your question...',
    welcomeMessage: currentScript?.dataset.welcomeMessage || 'Hi! How can I help you today?',
  };

  // Generate unique session ID
  const sessionId = 'kw_' + Math.random().toString(36).substring(2, 15);

  // CSS styles (scoped to widget)
  const styles = `
    #kw-widget-root {
      --kw-primary: ${config.primaryColor};
      --kw-primary-hover: ${adjustColor(config.primaryColor, -15)};
      --kw-bg: ${config.theme === 'dark' ? '#1f2937' : '#ffffff'};
      --kw-bg-secondary: ${config.theme === 'dark' ? '#374151' : '#f3f4f6'};
      --kw-text: ${config.theme === 'dark' ? '#f9fafb' : '#111827'};
      --kw-text-secondary: ${config.theme === 'dark' ? '#9ca3af' : '#6b7280'};
      --kw-border: ${config.theme === 'dark' ? '#4b5563' : '#e5e7eb'};
      --kw-shadow: ${config.theme === 'dark'
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'};

      position: fixed;
      ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-sizing: border-box;
    }

    #kw-widget-root *, #kw-widget-root *::before, #kw-widget-root *::after {
      box-sizing: border-box;
    }

    .kw-toggle-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--kw-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease, background-color 0.2s ease;
      position: relative;
    }

    .kw-toggle-btn:hover {
      background: var(--kw-primary-hover);
      transform: scale(1.05);
    }

    .kw-toggle-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .kw-toggle-btn .kw-icon-close {
      position: absolute;
      opacity: 0;
      transform: rotate(-90deg);
    }

    .kw-toggle-btn.kw-open .kw-icon-chat {
      opacity: 0;
      transform: rotate(90deg);
    }

    .kw-toggle-btn.kw-open .kw-icon-close {
      opacity: 1;
      transform: rotate(0deg);
    }

    .kw-panel {
      position: absolute;
      ${config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
      ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: var(--kw-bg);
      border-radius: 16px;
      box-shadow: var(--kw-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px) scale(0.95);
      transition: all 0.3s ease;
      border: 1px solid var(--kw-border);
    }

    .kw-panel.kw-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .kw-header {
      background: var(--kw-primary);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .kw-header-title {
      font-weight: 600;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kw-header-title svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .kw-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }

    .kw-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .kw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .kw-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      animation: kw-fadeIn 0.3s ease;
    }

    @keyframes kw-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .kw-message-user {
      background: var(--kw-primary);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .kw-message-assistant {
      background: var(--kw-bg-secondary);
      color: var(--kw-text);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .kw-message-content {
      word-wrap: break-word;
    }

    .kw-message-content p {
      margin: 0 0 8px 0;
    }

    .kw-message-content p:last-child {
      margin-bottom: 0;
    }

    .kw-message-content code {
      background: ${config.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'};
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }

    .kw-message-content pre {
      background: ${config.theme === 'dark' ? '#0d1117' : '#1e1e1e'};
      color: #e6e6e6;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .kw-message-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .kw-message-content ul, .kw-message-content ol {
      margin: 8px 0;
      padding-left: 20px;
    }

    .kw-sources {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--kw-border);
      font-size: 12px;
    }

    .kw-sources-title {
      color: var(--kw-text-secondary);
      margin-bottom: 6px;
    }

    .kw-sources a {
      color: var(--kw-primary);
      text-decoration: none;
      display: inline-block;
      margin-right: 12px;
    }

    .kw-sources a:hover {
      text-decoration: underline;
    }

    .kw-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: var(--kw-bg-secondary);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      max-width: 60px;
    }

    .kw-typing-dot {
      width: 8px;
      height: 8px;
      background: var(--kw-text-secondary);
      border-radius: 50%;
      animation: kw-bounce 1.4s infinite ease-in-out both;
    }

    .kw-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .kw-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes kw-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .kw-input-form {
      padding: 16px;
      border-top: 1px solid var(--kw-border);
      display: flex;
      gap: 10px;
      background: var(--kw-bg);
      flex-shrink: 0;
    }

    .kw-input-field {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--kw-border);
      border-radius: 24px;
      background: var(--kw-bg-secondary);
      color: var(--kw-text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .kw-input-field::placeholder {
      color: var(--kw-text-secondary);
    }

    .kw-input-field:focus {
      border-color: var(--kw-primary);
      box-shadow: 0 0 0 3px ${hexToRgba(config.primaryColor, 0.15)};
    }

    .kw-submit-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--kw-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, transform 0.2s ease;
      flex-shrink: 0;
    }

    .kw-submit-btn:hover:not(:disabled) {
      background: var(--kw-primary-hover);
      transform: scale(1.05);
    }

    .kw-submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .kw-submit-btn svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .kw-powered-by {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: var(--kw-text-secondary);
      background: var(--kw-bg);
    }

    .kw-powered-by a {
      color: var(--kw-primary);
      text-decoration: none;
    }

    @media (max-width: 480px) {
      .kw-panel {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
      }
    }
  `;

  // Helper function to adjust color brightness
  function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  // Helper function to convert hex to rgba
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Simple markdown parser
  function parseMarkdown(text) {
    return text
      // Code blocks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>')
      // Paragraphs (basic)
      .replace(/<br><br>/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  // Sanitize HTML to prevent XSS
  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  // Create widget HTML
  function createWidget() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create widget container
    const root = document.createElement('div');
    root.id = 'kw-widget-root';
    root.innerHTML = `
      <button class="kw-toggle-btn" aria-label="Open chat">
        <svg class="kw-icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <svg class="kw-icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      <div class="kw-panel">
        <div class="kw-header">
          <div class="kw-header-title">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
            ${sanitizeHtml(config.title)}
          </div>
          <button class="kw-close-btn" aria-label="Close chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="kw-messages"></div>
        <form class="kw-input-form">
          <input
            type="text"
            class="kw-input-field"
            placeholder="${sanitizeHtml(config.placeholder)}"
            autocomplete="off"
          />
          <button type="submit" class="kw-submit-btn" aria-label="Send message">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(root);

    return root;
  }

  // Initialize widget
  function init() {
    const root = createWidget();
    const toggleBtn = root.querySelector('.kw-toggle-btn');
    const closeBtn = root.querySelector('.kw-close-btn');
    const panel = root.querySelector('.kw-panel');
    const messages = root.querySelector('.kw-messages');
    const form = root.querySelector('.kw-input-form');
    const input = root.querySelector('.kw-input-field');

    let isOpen = false;

    // Add welcome message
    addMessage(config.welcomeMessage, 'assistant');

    // Toggle panel
    function togglePanel() {
      isOpen = !isOpen;
      toggleBtn.classList.toggle('kw-open', isOpen);
      panel.classList.toggle('kw-visible', isOpen);
      if (isOpen) {
        input.focus();
      }
    }

    toggleBtn.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        togglePanel();
      }
    });

    // Add message to chat
    function addMessage(content, type, sources = []) {
      const msg = document.createElement('div');
      msg.className = `kw-message kw-message-${type}`;

      const contentHtml = type === 'assistant' ? parseMarkdown(content) : sanitizeHtml(content);

      msg.innerHTML = `
        <div class="kw-message-content">${contentHtml}</div>
        ${sources.length ? `
          <div class="kw-sources">
            <div class="kw-sources-title">Sources:</div>
            ${sources.map(s => `<a href="${sanitizeHtml(s.url)}" target="_blank" rel="noopener">${sanitizeHtml(s.title)}</a>`).join('')}
          </div>
        ` : ''}
      `;

      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    // Show typing indicator
    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'kw-typing';
      typing.id = 'kw-typing-indicator';
      typing.innerHTML = `
        <div class="kw-typing-dot"></div>
        <div class="kw-typing-dot"></div>
        <div class="kw-typing-dot"></div>
      `;
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
    }

    // Hide typing indicator
    function hideTyping() {
      const typing = document.getElementById('kw-typing-indicator');
      if (typing) typing.remove();
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      // Show user message
      addMessage(question, 'user');
      input.value = '';
      input.disabled = true;

      // Show typing indicator
      showTyping();

      try {
        const response = await fetch(`${config.apiUrl}/api/widget/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ question, sessionId }),
        });

        const data = await response.json();

        hideTyping();

        if (response.ok) {
          addMessage(data.answer, 'assistant', data.sources || []);
        } else {
          addMessage(data.error || 'Sorry, something went wrong. Please try again.', 'assistant');
        }
      } catch (error) {
        hideTyping();
        addMessage('Sorry, I couldn\'t connect to the server. Please try again later.', 'assistant');
        console.error('Widget error:', error);
      } finally {
        input.disabled = false;
        input.focus();
      }
    });
  }

  // Expose API for programmatic control
  window.KnowledgeWidget = {
    init,
    open: () => document.querySelector('.kw-toggle-btn')?.click(),
    close: () => {
      const btn = document.querySelector('.kw-toggle-btn');
      if (btn?.classList.contains('kw-open')) btn.click();
    },
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

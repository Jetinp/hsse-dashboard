// AI Chat Panel component
import { queryAI, FATIGUE_PRESETS, ALERT_PRESETS, INCIDENT_PRESETS } from '../ai/engine.js';

let isOpen = false;
let messages = [];
let currentSection = 'alerts';

export function setAiSection(section) {
    currentSection = section;
}

export function toggleAiPanel() {
    isOpen = !isOpen;
    const el = document.getElementById('ai-panel');
    if (isOpen) {
        el.classList.add('open');
        renderAiContent();
    } else {
        el.classList.remove('open');
    }
}

export function openAiPanel() {
    isOpen = true;
    document.getElementById('ai-panel').classList.add('open');
    renderAiContent();
}

export function closeAiPanel() {
    isOpen = false;
    document.getElementById('ai-panel').classList.remove('open');
}

export function askAiQuestion(question, context = {}) {
    openAiPanel();
    handleSend(question, context);
}

function getPresets() {
    if (currentSection === 'fatigue') return FATIGUE_PRESETS;
    if (currentSection === 'overview') return INCIDENT_PRESETS;
    return ALERT_PRESETS;
}

function renderAiContent() {
    const el = document.getElementById('ai-panel');
    const presets = getPresets();

    el.innerHTML = `
    <div class="ai-panel-header">
      <h3><span class="ai-icon">✨</span> AI Assistant</h3>
      <button class="ai-panel-close" id="ai-close">✕</button>
    </div>
    <div class="ai-presets" id="ai-presets">
      ${presets.map((p, i) => `<button class="ai-preset-chip" data-idx="${i}">${truncate(p, 60)}</button>`).join('')}
    </div>
    <div class="ai-messages" id="ai-messages">
      ${messages.length === 0 ? `
        <div style="text-align:center; padding: 2rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">✨</div>
          <p style="font-size: var(--font-sm);">Ask me anything about ${currentSection === 'fatigue' ? 'fatigue incidents' : currentSection === 'overview' ? 'fleet safety and incident equivalents' : 'alerts and safety'}. Click a preset or type your question below.</p>
        </div>
      ` : messages.map(renderMessage).join('')}
    </div>
    <div class="ai-input-area">
      <input type="text" id="ai-input" placeholder="Ask about ${currentSection}..." />
      <button id="ai-send">Send</button>
    </div>
  `;

    document.getElementById('ai-close').addEventListener('click', closeAiPanel);

    el.querySelectorAll('.ai-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const preset = presets[parseInt(chip.dataset.idx)];
            handleSend(preset);
        });
    });

    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    sendBtn.addEventListener('click', () => {
        if (input.value.trim()) handleSend(input.value.trim());
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && input.value.trim()) handleSend(input.value.trim());
    });

    scrollMessages();
}

async function handleSend(question, context = {}) {
    messages.push({ role: 'user', text: question });
    updateMessages();

    // Show typing indicator
    const msgEl = document.getElementById('ai-messages');
    if (msgEl) {
        msgEl.insertAdjacentHTML('beforeend', `
      <div class="ai-typing" id="ai-typing">
        <span></span><span></span><span></span>
      </div>
    `);
        scrollMessages();
    }

    try {
        const response = await queryAI(question, context);
        // Remove typing indicator
        const typing = document.getElementById('ai-typing');
        if (typing) typing.remove();

        messages.push({ role: 'assistant', data: response });
        updateMessages();
    } catch (err) {
        const typing = document.getElementById('ai-typing');
        if (typing) typing.remove();
        messages.push({ role: 'assistant', data: { answer: 'Sorry, an error occurred processing your question.', evidence: [], drivers: [], filterContext: '' } });
        updateMessages();
    }
}

function updateMessages() {
    const msgEl = document.getElementById('ai-messages');
    if (!msgEl) return;
    msgEl.innerHTML = messages.map(renderMessage).join('');
    scrollMessages();

    // Re-focus input
    const input = document.getElementById('ai-input');
    if (input) { input.value = ''; input.focus(); }
}

function scrollMessages() {
    const msgEl = document.getElementById('ai-messages');
    if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
}

function renderMessage(msg) {
    if (msg.role === 'user') {
        return `<div class="ai-msg user">${escapeHtml(msg.text)}</div>`;
    }

    const d = msg.data;
    return `
    <div class="ai-msg assistant">
      ${d.filterContext ? `<div class="ai-filter-badge">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5h13l-5 6v5l-3 2v-7z"/></svg>
        ${escapeHtml(d.filterContext)}
      </div>` : ''}
      <div class="ai-answer">${formatMarkdown(d.answer)}</div>
      ${d.evidence && d.evidence.length > 0 ? `
        <div class="ai-section-title">Evidence</div>
        <ul>${d.evidence.map(e => `<li>${formatMarkdown(e)}</li>`).join('')}</ul>
      ` : ''}
      ${d.drivers && d.drivers.length > 0 ? `
        <div class="ai-section-title">Key Drivers</div>
        <ul>${d.drivers.map(e => `<li>${formatMarkdown(e)}</li>`).join('')}</ul>
      ` : ''}
    </div>
  `;
}

function formatMarkdown(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '…' : str;
}

// Sidebar navigation component
export function renderSidebar(currentPage, onNavigate, onAiToggle) {
    const el = document.getElementById('sidebar');

    const pages = [
        { id: 'fatigue', label: 'Fatigue', icon: '💤' },
        { id: 'alerts', label: 'Alerts', icon: '🔔' },
        { id: 'hssekpis', label: 'HSSE KPIs', icon: '⚡' },
    ];

    el.innerHTML = `
    <div class="sidebar-brand">
      <h1>HSSE Dashboard</h1>
      <p>Health & Safety Intelligence</p>
    </div>
    <nav class="sidebar-nav">
      ${pages.map(p => `
        <a class="sidebar-nav-item ${currentPage === p.id ? 'active' : ''}" data-page="${p.id}">
          <span class="nav-icon">${p.icon}</span>
          ${p.label}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <button class="sidebar-ai-btn" id="sidebar-ai-btn">
        <span>✨</span> Ask AI Assistant
      </button>
    </div>
  `;

    el.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => onNavigate(item.dataset.page));
    });

    document.getElementById('sidebar-ai-btn').addEventListener('click', onAiToggle);
}

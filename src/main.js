// Main application entry point — SPA router
import { renderSidebar } from './components/Sidebar.js';
import { renderFilterBar } from './components/FilterBar.js';
import { toggleAiPanel, setAiSection } from './components/AiPanel.js';
import { renderHsseKpis } from './pages/HsseKpis.js';
import { renderAlerts } from './pages/Alerts.js';
import { renderFatigue } from './pages/Fatigue.js';
import { renderLogin } from './pages/Login.js';
import { filterManager } from './data/filters.js';
import { destroyAllCharts } from './components/Charts.js';

const pages = {
    fatigue: renderFatigue,
    alerts: renderAlerts,
    hssekpis: renderHsseKpis,
};

let currentPage = 'fatigue';

function injectGlobalAskAi() {
    document.querySelectorAll('.chart-card').forEach(card => {
        const header = card.querySelector('.chart-card-header');
        if (!header) return;
        
        // Prevent duplicate injection
        if (card.querySelector('.chart-ask-ai-global') || card.querySelector('.chart-ask-btn')) return;
        
        const titleEl = header.querySelector('.chart-card-title');
        const title = titleEl ? titleEl.childNodes[0].textContent.trim() : 'this chart';
        
        const btn = document.createElement('button');
        btn.className = 'chart-ask-btn chart-ask-ai-global';
        btn.innerHTML = '✨ Ask AI';
        btn.style.marginLeft = 'auto';
        btn.style.padding = '2px 8px';
        btn.style.fontSize = '11px';
        
        btn.addEventListener('click', () => {
             import('./components/AiPanel.js').then(module => {
                 module.askAiQuestion(`Analyze the data trends shown in the "${title}" chart and provide underlying factors.`);
             });
        });
        
        header.appendChild(btn);
    });
}

function navigate(page) {
    if (!pages[page]) return;
    currentPage = page;
    window.location.hash = page;
    destroyAllCharts();
    setAiSection(page); // Update AI contextual presets
    renderSidebar(currentPage, navigate, toggleAiPanel);
    pages[currentPage]();
    
    // Inject global Ask AI after page renders
    setTimeout(injectGlobalAskAi, 50);
}

function bootApp() {
    // Determine initial page from hash
    const hash = window.location.hash.replace('#', '');
    if (pages[hash]) currentPage = hash;

    // Render shell
    setAiSection(currentPage); // Update AI contextual presets on load
    renderSidebar(currentPage, navigate, toggleAiPanel);
    renderFilterBar();
    pages[currentPage]();
    
    setTimeout(injectGlobalAskAi, 50);

    // Re-render on filter changes
    filterManager.subscribe(() => {
        renderFilterBar();
        pages[currentPage]();
        setTimeout(injectGlobalAskAi, 50);
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (pages[hash] && hash !== currentPage) {
            navigate(hash);
        }
    });
}

function init() {
    if (sessionStorage.getItem('auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = '';
        bootApp();
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'block';
        
        // Mount simple login UI
        renderLogin(() => {
            sessionStorage.setItem('auth', 'true');
            document.getElementById('login-screen').innerHTML = '';
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app').style.display = '';
            bootApp();
        });
    }
}

// Boot on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

import { deriveIncidentEquivalents, deriveIncidentEquivalentsTrend } from '../data/incidents.js';
import { filterManager } from '../data/filters.js';
import { generateHsseKpiSummary } from '../ai/engine.js';
import { setAiSection, askAiQuestion } from '../components/AiPanel.js';
import { createLineChart, destroyAllCharts, COLORS } from '../components/Charts.js';

export function renderHsseKpis() {
    destroyAllCharts();
    setAiSection('incidents');
    const filters = filterManager.get();
    const incidents = deriveIncidentEquivalents(filters);
    const trend = deriveIncidentEquivalentsTrend(filters);
    const summary = generateHsseKpiSummary();

    const el = document.getElementById('page-content');
    
    el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">HSSE KPIs</h1>
      <p class="page-description">Estimated Incident-Equivalents derived from leading indicators</p>
    </div>

    <!-- AI Summary -->
    <div class="ai-summary-card">
      <div class="ai-summary-header">
        <span class="ai-summary-icon">✨</span>
        <span class="ai-summary-title">AI Insight (Filters: ${summary.filterContext})</span>
      </div>
      <div class="ai-summary-body">${formatMd(summary.summary)}</div>
    </div>

    <!-- Tier 1 KPIs -->
    <h2 class="section-heading" style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: var(--text-muted); text-transform: uppercase;">Outcome Equivalents (Recordable & Lost Time)</h2>
    <div class="kpi-grid">
      ${kpi('TRCF Equivalent', 'Estimated Total Recordable Case Frequency derived from severe alerts, SOS, and High Fatigue.', incidents.trcf, 'accent-red')}
      ${kpi('LTIF Equivalent', 'Estimated Lost Time Injury Frequency derived from SOS and Fall alerts.', incidents.ltif, 'accent-orange')}
      ${kpi('LWC / RWC Equivalent', 'Cases representing lost workday or restricted work severity equivalents.', incidents.lwc_rwc, 'accent-pink')}
      ${kpi('MTC Equivalent', 'Estimated Medical Treatment Cases derived from High severity conditions.', incidents.mtc, 'accent-amber')}
    </div>

    <!-- Tier 2 KPIs -->
    <h2 class="section-heading" style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: var(--text-muted); text-transform: uppercase;">Precursor Equivalents (Near Misses & Conditions)</h2>
    <div class="kpi-grid" style="grid-template-columns: repeat(5, 1fr);">
      ${kpi('Near Miss Equivalent', 'Events that could have led to an incident but did not.', incidents.enm, 'accent-blue')}
      ${kpi('Unsafe Condition Eq.', 'Hazardous physical or environmental condition detected.', incidents.uc, 'accent-purple')}
      ${kpi('Unsafe Act Eq.', 'Unsafe human behavior or action, e.g., work/rest non-compliance.', incidents.ua, 'accent-indigo')}
      ${kpi('UC + UA (Sum)', 'Mathematical sum of Unsafe Conditions and Unsafe Acts.', incidents.uc_ua, 'accent-slate')}
      ${kpi('UC + UA (Deduplicated)', 'Deduplicated count per person per day of combined UA/UC events.', incidents.uc_ua_dedup, 'accent-emerald')}
    </div>

    <!-- Trend Charts -->
    <div class="chart-grid" style="margin-top:24px">
      <div class="chart-card">
        <div class="chart-card-header">
           <div class="chart-card-title flex items-center">Outcome Equivalents Trend
             <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Time-series tracking of severe Outcome proxy metrics (TRCF, LTIF, LWC/RWC, MTC).</div></div>
           </div>
        </div>
        <div class="chart-canvas-wrap" style="height:300px">
          <canvas id="chart-outcomes-trend"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <div class="chart-card-header">
           <div class="chart-card-title flex items-center">Precursor Equivalents Trend
             <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Time-series tracking of leading proxy conditions (Near Miss, Unsafe Condition, Unsafe Act).</div></div>
           </div>
        </div>
        <div class="chart-canvas-wrap" style="height:300px">
          <canvas id="chart-precursors-trend"></canvas>
        </div>
      </div>
    </div>
  `;

    // Render Trend Charts
    const labels = trend.map(t => t[0]);
    
    createLineChart('chart-outcomes-trend', labels, [
        { label: 'TRCF', data: trend.map(t => t[1].trcf), color: COLORS.red },
        { label: 'LTIF', data: trend.map(t => t[1].ltif), color: COLORS.orange },
        { label: 'LWC / RWC', data: trend.map(t => t[1].lwc_rwc), color: COLORS.pink },
        { label: 'MTC', data: trend.map(t => t[1].mtc), color: COLORS.amber }
    ]);
    
    createLineChart('chart-precursors-trend', labels, [
        { label: 'Near Miss', data: trend.map(t => t[1].enm), color: COLORS.blue },
        { label: 'Unsafe Condition', data: trend.map(t => t[1].uc), color: COLORS.purple },
        { label: 'Unsafe Act', data: trend.map(t => t[1].ua), color: COLORS.indigo }
    ]);
}

window.dispatchAskAi = function(q) {
    if(askAiQuestion) askAiQuestion(q);
};

function kpi(label, tooltipText, value, accent, trend, sub) {
    let aiQuery = `Explain the ${label} metric dynamics.`;
    if (label === 'Near Miss Equivalent') aiQuery = 'What is the estimated Near Miss-equivalent incident count for the selected period?';
    if (label === 'TRCF Equivalent') aiQuery = 'What is the estimated Total Recordable Case Frequency (TRCF) equivalent incident count?';

    return `
    <div class="kpi-card ${accent}">
      <div class="kpi-label" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span>${label}</span>
          <span title="Ask AI about ${label}" onclick="window.dispatchAskAi('${aiQuery}')" style="cursor: pointer; font-size: 14px; opacity: 0.6; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">✨</span>
        </span>
        <div class="info-icon-wrapper">ⓘ
          <div class="tooltip-box">${tooltipText}</div>
        </div>
      </div>
      <div class="kpi-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
      ${trend !== null && trend !== undefined ? `
        <span class="kpi-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}">
          ${trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} ${Math.abs(trend)}%
        </span>
      ` : ''}
      ${sub ? `<div class="text-xs text-muted" style="margin-top:4px">${sub}</div>` : ''}
    </div>
  `;
}

function formatMd(text) {
    if (!text) return '';
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

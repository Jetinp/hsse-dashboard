// Overview page
import { vessels, totalCrew, activeWatches, activeVessels, totalVessels } from '../data/vessels.js';
import { allAlerts, filterAlerts, alertsByDay, alertsByVessel, heatAlertsBySubtype, hrAlertsByZone, fallSosCounts } from '../data/alerts.js';
import { allFatigueIncidents, filterFatigue, fatigueByDay } from '../data/fatigue.js';
import { deriveIncidentEquivalents } from '../data/incidents.js';
import { filterManager } from '../data/filters.js';
import { generateOverviewSummary } from '../ai/engine.js';
import { createLineChart, createBarChart, createDoughnutChart, destroyAllCharts, COLORS } from '../components/Charts.js';
import { askAiQuestion } from '../components/AiPanel.js';

export function renderOverview() {
    destroyAllCharts();
    const filters = filterManager.get();
    const alerts = filterAlerts(allAlerts, filters);
    const fatigue = filterFatigue(allFatigueIncidents, filters);
    const heat = heatAlertsBySubtype(alerts);
    const hr = hrAlertsByZone(alerts);
    const fs = fallSosCounts(alerts);
    const summary = generateOverviewSummary();

    const el = document.getElementById('page-content');
    el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Operations Overview</h1>
      <p class="page-description">Health & safety monitoring across the fleet</p>
    </div>

    <div class="ai-summary-card">
      <div class="ai-summary-header">
        <span class="ai-summary-icon">✨</span>
        <span class="ai-summary-title">AI Summary</span>
        <span class="ai-summary-badge">Auto-generated</span>
      </div>
      <div class="ai-summary-body">${formatMd(summary.summary)}</div>
    </div>

    <h2 class="section-heading" style="margin-bottom: 16px; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Fleet Status</h2>
    <div class="kpi-grid">
      ${kpi('Total Vessels', 'Total number of vessels being monitored in the platform.', totalVessels, 'accent-blue', null, `${activeVessels} active`)}
      ${kpi('Active Crew', 'Total number of crew members currently assigned to active vessels.', totalCrew, 'accent-green')}
      ${kpi('Active Watches', 'Total number of crew currently on an active watch shift.', activeWatches, 'accent-teal')}
      ${kpi('Total Alerts', 'Number of all alerts across the selected filters.', alerts.length, 'accent-red', calcTrend(alerts, alertsByDay))}
      ${kpi('Fatigue Incidents', 'Total count of detected fatigue events.', fatigue.length, 'accent-purple', calcTrend(fatigue, fatigueByDay))}
      ${kpi('Heat Alerts', 'Number of Heat Exposure alerts.', heat.total, 'accent-amber', null, `${heat.veryHigh} Very High`)}
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">Alert Trend
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Time-series trend of all alerts across the selected date range.</div></div>
            </div>
            <div class="chart-card-subtitle">Daily alerts over selected period</div>
          </div>
          <button class="chart-ask-btn" id="ask-alert-trend">✨ Ask AI</button>
        </div>
        <div class="chart-canvas-wrap" style="height:260px">
          <canvas id="chart-alert-trend"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">Fatigue Incidents Trend
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Time-series trend of fatigue incidents detected natively or via watch data.</div></div>
            </div>
            <div class="chart-card-subtitle">Daily fatigue incidents</div>
          </div>
          <button class="chart-ask-btn" id="ask-fatigue-trend">✨ Ask AI</button>
        </div>
        <div class="chart-canvas-wrap" style="height:260px">
          <canvas id="chart-fatigue-trend"></canvas>
        </div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">Top Vessels by Alerts
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Ranking of vessels sorted by the total number of alerts they generated.</div></div>
            </div>
            <div class="chart-card-subtitle">Alert count by vessel</div>
          </div>
          <button class="chart-ask-btn" id="ask-vessel-alerts">✨ Ask AI</button>
        </div>
        <div class="chart-canvas-wrap" style="height:260px">
          <canvas id="chart-vessel-alerts"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">Alert Type Distribution
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Proportion of alerts broken down by their primary category.</div></div>
            </div>
            <div class="chart-card-subtitle">Breakdown by category</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:260px">
          <canvas id="chart-alert-types"></canvas>
        </div>
      </div>
    </div>
  `;

    // Render charts
    const dailyAlerts = alertsByDay(alerts);
    createLineChart('chart-alert-trend',
        dailyAlerts.map(([d]) => d.slice(5)),
        [{ label: 'Alerts', data: dailyAlerts.map(([, v]) => v), color: COLORS.red }],
        (date) => askAiQuestion(`Explain the alert spike on ${date} — what types increased?`, { date })
    );

    const dailyFatigue = fatigueByDay(fatigue);
    createLineChart('chart-fatigue-trend',
        dailyFatigue.map(([d]) => d.slice(5)),
        [{ label: 'Fatigue Incidents', data: dailyFatigue.map(([, v]) => v), color: COLORS.purple }],
        (date) => askAiQuestion(`Why did fatigue risks spike on ${date}?`, { date })
    );

    const topVessels = alertsByVessel(alerts).slice(0, 8);
    createBarChart('chart-vessel-alerts',
        topVessels.map(([v]) => v.replace(/^(MV |MT |FPSO )/, '')),
        [{ label: 'Alerts', data: topVessels.map(([, v]) => v), color: COLORS.blue }],
        { horizontal: true, onClick: (vessel) => askAiQuestion(`For the top vessel ${vessel} by alerts, show the distribution by location and type.`) }
    );

    createDoughnutChart('chart-alert-types',
        ['Heat Exposure', 'Heart Exertion', 'Fall', 'SOS'],
        [heat.total, hr.total, fs.totalFalls, fs.totalSOS],
        [COLORS.orange, COLORS.red, COLORS.amber, COLORS.pink]
    );

    // Bind AI ask buttons
    document.getElementById('ask-alert-trend')?.addEventListener('click', () =>
        askAiQuestion('Explain the alert trend — what types of alerts increased and where?'));
    document.getElementById('ask-fatigue-trend')?.addEventListener('click', () =>
        askAiQuestion('What is the total fatigue incidents for the selected period, and which vessels contributed the most?'));
    document.getElementById('ask-vessel-alerts')?.addEventListener('click', () =>
        askAiQuestion('For the top vessel by alerts, show the distribution by location and type.'));
}

function kpi(label, tooltipText, value, accent, trend, sub) {
    return `
    <div class="kpi-card ${accent}">
      <div class="kpi-label" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span>${label}</span>
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

function calcTrend(data, byDayFn) {
    const daily = byDayFn(data);
    if (daily.length < 4) return null;
    const mid = Math.floor(daily.length / 2);
    const prior = daily.slice(0, mid).reduce((s, [, v]) => s + v, 0);
    const current = daily.slice(mid).reduce((s, [, v]) => s + v, 0);
    if (prior === 0) return null;
    return Math.round(((current - prior) / prior) * 100);
}

function formatMd(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

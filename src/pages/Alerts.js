import { allAlerts, filterAlerts, alertsByDay, alertsByVessel, alertsByRank, alertsByVesselType, alertsByLocation, heatAlertsBySubtype, hrAlertsByZone, fallSosCounts, cooldownReactionRate, dailyAlertsByType } from '../data/alerts.js';
import { filterManager } from '../data/filters.js';
import { generateAlertsSummary } from '../ai/engine.js';
import { createLineChart, createBarChart, createDoughnutChart, destroyAllCharts, COLORS, alpha } from '../components/Charts.js';
import { askAiQuestion, setAiSection } from '../components/AiPanel.js';
import { activeVessels, totalCrew, activeWatches } from '../data/vessels.js';
import { workRestViolations } from '../data/workRest.js';

export function renderAlerts() {
    destroyAllCharts();
    setAiSection('alerts');
    const filters = filterManager.get();
    const alerts = filterAlerts(allAlerts, filters);
    const heat = heatAlertsBySubtype(alerts);
    const hr = hrAlertsByZone(alerts);
    const fs = fallSosCounts(alerts);
    const cooldown = cooldownReactionRate(alerts);
    const summary = generateAlertsSummary();

    const el = document.getElementById('page-content');
    
    // Calculate mock workload alerts (work-rest violations inside the filtered period)
    const filteredWorkLoad = workRestViolations.filter(w => {
        if (filters.period !== 'all') {
            const now = Date.now();
            const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
            const limit = now - (daysMap[filters.period] * 24 * 60 * 60 * 1000);
            if (w.timestamp < limit) return false;
        }
        if (filters.vessel !== 'all' && w.vesselName !== filters.vessel) return false;
        return true;
    });

    el.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 class="page-title">Alerts Monitoring</h1>
        <p class="page-description">Tracking SOS, Heat, Heart, Workload, and Fall Alerts across the fleet</p>
      </div>
      <div style="text-align: right; color: var(--text-muted); font-size: var(--font-xs);">
        Last updated<br/>
        <strong>${new Date().toLocaleString()} UTC</strong>
      </div>
    </div>

    <!-- AI Summary -->
    <div class="ai-summary-card">
      <div class="ai-summary-header">
        <span class="ai-summary-icon">✨</span>
        <span class="ai-summary-title">AI Insight (Filters: ${summary.filterContext})</span>
      </div>
      <div class="ai-summary-body">${fmd(summary.summary)}</div>
    </div>

    <!-- Top Summary -->
    <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
      <div class="kpi-card" style="background: var(--bg-primary); border-color: transparent; box-shadow: none;">
        <div class="kpi-label" style="color: var(--accent-primary);"><span style="margin-right:8px">🚢</span>VESSELS</div>
        <div class="kpi-value" style="color: var(--accent-primary); font-weight: 400; font-size: 2rem;">${activeVessels}</div>
      </div>
      <div class="kpi-card" style="background: var(--bg-primary); border-color: transparent; box-shadow: none;">
        <div class="kpi-label" style="color: var(--accent-primary);"><span style="margin-right:8px">👥</span>ACTIVE CREW</div>
        <div class="kpi-value" style="color: var(--accent-primary); font-weight: 400; font-size: 2rem;">${totalCrew.toLocaleString()}</div>
      </div>
      <div class="kpi-card" style="background: var(--bg-primary); border-color: transparent; box-shadow: none;">
        <div class="kpi-label" style="color: var(--accent-primary);"><span style="margin-right:8px">⏱️</span>ACTIVE WATCHES</div>
        <div class="kpi-value" style="color: var(--accent-primary); font-weight: 400; font-size: 2rem;">${activeWatches.toLocaleString()}</div>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-grid">
      ${kpi('SOS Alerts', 'Total SOS button triggers.', fs.totalSOS, 'accent-red', 10)}
      ${kpi('Heat Alerts', 'Combined High and Very High heat exposure alerts.', heat.total, 'accent-amber', 18)}
      ${kpi('Heart Alerts', 'HR Exertion alerts in Zone 4 and Zone 5.', hr.total, 'accent-pink', -5)}
      ${kpi('Work Load Alerts', 'Work-Rest hours compliance violations.', filteredWorkLoad.length, 'accent-purple', -12)}
      ${kpi('Fall Alerts', 'Detected slip/trip/fall events from wearables.', fs.totalFalls, 'accent-blue', 10)}
    </div>

    <!-- Hero Chart -->
    <div class="chart-grid cols-1">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">Alerts Trend
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Time-series line chart showing the aggregated daily volume of all alerts.</div></div>
            </div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:300px">
          <canvas id="chart-alerts-main-trend"></canvas>
        </div>
      </div>
    </div>

    <!-- Split Row 1 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">By Vessel
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Alert volume distributed by the top 3 vessels.</div></div>
            </div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-alerts-vessel"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">By Type
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Proportional breakdown of alerts by their primary category.</div></div>
            </div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px; display: flex; justify-content: center;">
          <div style="width: 250px; position:relative;">
             <canvas id="chart-alerts-type"></canvas>
             <div style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 600; color: var(--text-primary);">${alerts.length}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Split Row 2 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">By Rank
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Alert distribution across different crew ranks.</div></div>
            </div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-alerts-rank"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">By Location
              <div class="info-icon-wrapper">ⓘ<div class="tooltip-box">Alert distribution by physical location on the vessel.</div></div>
            </div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-alerts-location"></canvas>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Daily Alerts</h2>
      </div>
      <button class="chart-ask-btn" style="background: var(--bg-card); border-color: var(--accent-primary); color: var(--accent-primary);">Download Report</button>
    </div>
    <div class="data-table-wrap">
      <table class="data-table" id="alert-table">
        <thead>
          <tr>
            <th>VESSEL</th>
            <th>CREW MEMBER</th>
            <th>RANK</th>
            <th>TYPE</th>
            <th>TIMESTAMP</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.slice(-30).reverse().map(a => `
            <tr>
              <td><span style="font-weight: 500; color: var(--text-primary);">${a.vesselName}</span></td>
              <td>${a.crewName || 'Unknown'}</td>
              <td>${a.rank}</td>
              <td>${a.type}${a.subtype ? ` (${a.subtype})` : ''}</td>
              <td>${a.date} ${new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

    // ── Render Charts ──

    // Main Trend
    const dailyAll = alertsByDay(alerts);
    createLineChart('chart-alerts-main-trend', dailyAll.map(([d]) => d.slice(5)), [
        { label: 'Total Alerts', data: dailyAll.map(([, v]) => v), color: COLORS.blue },
    ]);

    // By Vessel (Top 3)
    const vesselPairs = alertsByVessel(alerts).slice(0, 3);
    createBarChart('chart-alerts-vessel', vesselPairs.map(([v]) => v.replace(/^(MV |MT |FPSO )/, '')), [
        { label: 'Alerts', data: vesselPairs.map(([, v]) => v), color: COLORS.blueLight }
    ]);

    // By Type Doughnut
    createDoughnutChart('chart-alerts-type',
        ['Heat', 'Heart Exertion', 'Fall', 'SOS'],
        [heat.total, hr.total, fs.totalFalls, fs.totalSOS],
        [COLORS.amber, COLORS.red, COLORS.purple, COLORS.pink]
    );

    // By Rank
    const rankPairs = alertsByRank(alerts).slice(0, 8);
    createBarChart('chart-alerts-rank', rankPairs.map(([r]) => r.split(' ')[0]), [
        { label: 'Alerts', data: rankPairs.map(([, v]) => v), color: COLORS.purpleLight }
    ]);

    // By Location
    const locPairs = alertsByLocation(alerts).slice(0, 5);
    createBarChart('chart-alerts-location', locPairs.map(([l]) => l), [
        { label: 'Alerts', data: locPairs.map(([, v]) => v), color: COLORS.orange }
    ]);
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
          ${trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} ${Math.abs(trend)}% versus last week
        </span>
      ` : ''}
      ${sub ? `<div class="text-xs text-muted" style="margin-top:4px">${sub}</div>` : ''}
    </div>
  `;
}

function fmd(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

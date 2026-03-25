// Fatigue page
import { allFatigueIncidents, filterFatigue, fatigueByDay, fatigueByLevel, fatigueByVessel, fatigueByRank, fatigueByLocation, uniqueFatigueCrew, topFatigueSigns } from '../data/fatigue.js';
import { filterManager } from '../data/filters.js';
import { generateFatigueSummary } from '../ai/engine.js';
import { createLineChart, createBarChart, createDoughnutChart, destroyAllCharts, COLORS, alpha } from '../components/Charts.js';
import { askAiQuestion, setAiSection } from '../components/AiPanel.js';
import { activeVessels, totalCrew, activeWatches } from '../data/vessels.js';
import { workRestViolations } from '../data/workRest.js';

export function renderFatigue() {
    destroyAllCharts();
    setAiSection('fatigue');
    const filters = filterManager.get();
    const fatigue = filterFatigue(allFatigueIncidents, filters);
    const levels = fatigueByLevel(fatigue);
    const byV = fatigueByVessel(fatigue);
    const byR = fatigueByRank(fatigue);
    const daily = fatigueByDay(fatigue);
    const summary = generateFatigueSummary();

    const maxRank = byR.length > 0 ? byR[0][0] : 'N/A';
    const numCrew = uniqueFatigueCrew(fatigue) || 1;

    const el = document.getElementById('page-content');
    el.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 class="page-title">Fatigue Monitoring</h1>
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

    <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
      ${kpi('ALL RISKS', 'Total accumulated fatigue risk factors identified across the active crew.', fatigue.length, 'accent-blue', 5, 'Fatigue profile trends')}
      ${kpi('High Fatigue Days per crew', 'Average number of days a crew member experienced High or Very High fatigue.', Math.round((levels['Very High']+levels['High'])/numCrew) || 0, 'accent-red', 10, 'compared to last 7 days')}
      ${kpi('Med Fatigue Days per crew', 'Average number of days a crew member experienced Moderate fatigue.', Math.round(levels['Moderate']/numCrew) || 0, 'accent-amber', -5, 'compared to last 7 days')}
      ${kpi('Max Rank Fatigue per crew', 'The maximum recorded fatigue incidents for the highest-risk rank role.', Math.round((byR.length>0?byR[0][1]:0)/numCrew) || 0, 'accent-red', 12, 'compared to last 7 days')}
    </div>

    <!-- Hero Chart -->
    <div class="chart-grid cols-1">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">FATIGUE BACKGROUND</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-fatigue-bg"></canvas>
        </div>
      </div>
    </div>

    <!-- Split Row 1 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY VESSEL, TYPE</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-fatigue-vessel-type"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY TIME</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-fatigue-time"></canvas>
        </div>
      </div>
    </div>

    <!-- Split Row 2 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY VESSEL</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-fatigue-vessel"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY TYPE</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px; display: flex; justify-content: center;">
          <div style="width: 250px; position:relative;">
             <canvas id="chart-fatigue-type"></canvas>
             <div style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 600; color: var(--text-primary);">${fatigue.length}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Split Row 3 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY RANK</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px">
          <canvas id="chart-fatigue-rank"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">BY RANK GROUP</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:250px; display: flex; justify-content: center;">
          <div style="width: 250px; position:relative;">
             <canvas id="chart-fatigue-group"></canvas>
             <div style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 600; color: var(--text-primary);">${byR.length}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hero Chart 2 -->
    <div class="chart-grid cols-1">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <div class="chart-card-title flex items-center">FATIGUE LEVEL UNIQUE CREW MEASURES</div>
          </div>
        </div>
        <div class="chart-canvas-wrap" style="height:280px; display: flex; justify-content: center;">
          <div style="width: 280px; position:relative;">
             <canvas id="chart-fatigue-crew"></canvas>
             <div style="position: absolute; top:50%; left:50%; transform: translate(-50%, -50%); font-size: 30px; font-weight: 600; color: var(--text-primary);">${numCrew}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Daily Fatigue Incidents</h2>
      </div>
      <button class="chart-ask-btn" style="background: var(--bg-card); border-color: var(--accent-primary); color: var(--accent-primary);">Download Report</button>
    </div>

    <div class="data-table-wrap">
      <table class="data-table" id="fatigue-table">
        <thead>
          <tr>
            <th>VESSEL</th>
            <th>CREW MEMBER</th>
            <th>RANK</th>
            <th>TYPE</th>
            <th>TIMESTAMP</th>
            <th>SEVERITY</th>
          </tr>
        </thead>
        <tbody>
          ${fatigue.slice(-25).reverse().map(f => `
            <tr>
              <td><span style="font-weight: 500; color: var(--text-primary);">${f.vesselName.replace(/^(MV |MT |FPSO )/, '')}</span></td>
              <td>${f.crewName || 'Unknown'}</td>
              <td>${f.rank}</td>
              <td>Insufficient rest period</td>
              <td>${f.date} ${new Date(f.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
               <td><span class="badge ${f.level.toLowerCase().replace(' ', '-')}">${f.level.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

    // ── Render Charts ──

    // Fatigue Background
    createLineChart('chart-fatigue-bg',
        daily.map(([d]) => d.slice(5)),
        [{ label: 'Fatigue Risk', data: daily.map(([, v]) => v), color: COLORS.blue }]
    );

    // By Vessel, Type (stacked bar, critical vs high)
    const topVesselsLimit = byV.slice(0, 3).map(([v]) => v.replace(/^(MV |MT |FPSO )/, ''));
    createBarChart('chart-fatigue-vessel-type',
        topVesselsLimit,
        [
            { label: 'Critical', data: [8, 0, 3], color: COLORS.red },
            { label: 'High', data: [1, 7, 0], color: COLORS.amber }
        ],
        { horizontal: false, stacked: true }
    );

    // By Time
    createLineChart('chart-fatigue-time',
        daily.map(([d]) => d.slice(5)),
        [{ label: 'By Time', data: daily.map(([, v]) => v + Math.random()*5), color: COLORS.blue }]
    );

    // By Vessel
    createBarChart('chart-fatigue-vessel',
        byV.slice(0, 3).map(([v]) => v.replace(/^(MV |MT |FPSO )/, '')),
        [{ label: 'Fatigue', data: byV.slice(0, 3).map(([, v]) => v), color: COLORS.blueLight }]
    );

    // By Type
    createDoughnutChart('chart-fatigue-type',
        ['Insufficient rest', 'Extended duty', 'Consecutive shifts', 'Short breaks', 'Other'],
        [20, 15, 5, 2, 4],
        [COLORS.blue, COLORS.purple, COLORS.teal, COLORS.orange, COLORS.blueLight]
    );

    // By Rank
    const topRanks = byR.slice(0, 8);
    createBarChart('chart-fatigue-rank',
        topRanks.map(([r]) => r.split(' ')[0]),
        [{ label: 'Incidents', data: topRanks.map(([, v]) => v), color: COLORS.purpleLight }]
    );

    // By Rank Group
    createDoughnutChart('chart-fatigue-group',
        ['Deck Officer', 'Engineering', 'Unlicensed Officer', 'Unlicensed Ratings'],
        [5, 4, 2, 2],
        [COLORS.purpleLight, COLORS.teal, COLORS.blueLight, COLORS.orange]
    );

    // Fatigue Level Unique Crew
    createDoughnutChart('chart-fatigue-crew',
        ['Very High Fatigue', 'High Fatigue', 'Moderate Fatigue'],
        [levels['Very High'], levels['High'], levels['Moderate']],
        [COLORS.purple, COLORS.red, COLORS.teal]
    );
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

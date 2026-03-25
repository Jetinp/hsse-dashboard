// AI response engine - generates structured, filter-aware answers from synthetic data
import { filterManager } from '../data/filters.js';
import { allAlerts, filterAlerts, alertsByDay, alertsByType, alertsByVessel, alertsByRank, alertsByVesselType, alertsByLocation, heatAlertsBySubtype, hrAlertsByZone, fallSosCounts, cooldownReactionRate, dailyAlertsByType } from '../data/alerts.js';
import { allFatigueIncidents, filterFatigue, fatigueByDay, fatigueByLevel, fatigueByVessel, fatigueByRank, fatigueByLocation, uniqueFatigueCrew, topFatigueSigns } from '../data/fatigue.js';
import { vessels, crew, totalCrew, activeWatches } from '../data/vessels.js';
import { deriveIncidentEquivalents } from '../data/incidents.js';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getFilteredData() {
    const filters = filterManager.get();
    return {
        filters,
        alerts: filterAlerts(allAlerts, filters),
        fatigue: filterFatigue(allFatigueIncidents, filters),
        incidents: deriveIncidentEquivalents(filters)
    };
}

function fmtNum(n) { return n.toLocaleString(); }
function pct(a, b) { return b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`; }

function topN(entries, n = 5) {
    return entries.slice(0, n).map(([k, v]) => `**${k}**: ${fmtNum(v)}`).join(', ');
}

function compareWindow(data, daysFn) {
    // Split data in half for current vs prior comparison
    const dates = daysFn(data);
    if (dates.length < 2) return null;
    const mid = Math.floor(dates.length / 2);
    const prior = dates.slice(0, mid).reduce((s, [, v]) => s + v, 0);
    const current = dates.slice(mid).reduce((s, [, v]) => s + v, 0);
    if (prior === 0) return null;
    const change = Math.round(((current - prior) / prior) * 100);
    return { prior, current, change };
}

// ── Fatigue Preset Handlers ──
const fatigueHandlers = {
    totalIncidents(data) {
        const total = data.fatigue.length;
        const byV = fatigueByVessel(data.fatigue);
        const comp = compareWindow(data.fatigue, fatigueByDay);
        let answer = `There are **${fmtNum(total)} fatigue incidents** in the selected period.`;
        if (comp) answer += ` This is a **${comp.change > 0 ? '+' : ''}${comp.change}% change** vs the prior window.`;
        return {
            answer,
            evidence: [
                `Total incidents: **${fmtNum(total)}**`,
                `Unique crew affected: **${uniqueFatigueCrew(data.fatigue)}**`,
                `Top vessels: ${topN(byV, 3)}`,
                comp ? `Prior period: ${fmtNum(comp.prior)} → Current: ${fmtNum(comp.current)}` : null,
            ].filter(Boolean),
            drivers: byV.slice(0, 3).map(([v, c]) => `${v} contributed ${fmtNum(c)} incidents (${pct(c, total)})`),
        };
    },

    spikeAnalysis(data, dateStr) {
        const dayData = data.fatigue.filter(f => f.date === dateStr);
        if (dayData.length === 0) {
            // Find peak day
            const daily = fatigueByDay(data.fatigue);
            const peak = daily.reduce((max, cur) => cur[1] > max[1] ? cur : max, daily[0]);
            if (!peak) return { answer: 'No fatigue data available for the selected period.', evidence: [], drivers: [] };
            const peakData = data.fatigue.filter(f => f.date === peak[0]);
            return buildSpikeResponse(peakData, peak[0], data.fatigue.length);
        }
        return buildSpikeResponse(dayData, dateStr, data.fatigue.length);
    },

    byRank(data) {
        const byR = fatigueByRank(data.fatigue);
        const total = data.fatigue.length;
        return {
            answer: `**${byR[0]?.[0] || 'N/A'}** has the highest fatigue incidents with **${fmtNum(byR[0]?.[1] || 0)}** incidents (${pct(byR[0]?.[1] || 0, total)}).`,
            evidence: byR.slice(0, 5).map(([r, c]) => `**${r}**: ${fmtNum(c)} (${pct(c, total)})`),
            drivers: [`Top rank group contributing is ratings and engine crew, consistent with higher physical demands.`],
        };
    },

    byLevel(data) {
        const levels = fatigueByLevel(data.fatigue);
        const total = data.fatigue.length;
        const topLevel = Object.entries(levels).sort(([, a], [, b]) => b - a);
        return {
            answer: `Fatigue levels break down as: Moderate **${fmtNum(levels['Moderate'])}**, High **${fmtNum(levels['High'])}**, Very High **${fmtNum(levels['Very High'])}**.`,
            evidence: [
                `Moderate (1–3 signs): **${fmtNum(levels['Moderate'])}** (${pct(levels['Moderate'], total)})`,
                `High (4–6 signs): **${fmtNum(levels['High'])}** (${pct(levels['High'], total)})`,
                `Very High (>6 signs): **${fmtNum(levels['Very High'])}** (${pct(levels['Very High'], total)})`,
                `Total: **${fmtNum(total)}** incidents`,
            ],
            drivers: topLevel.length > 0 ? [`**${topLevel[0][0]}** is the most common fatigue level, driven primarily by ${fatigueByVessel(data.fatigue)[0]?.[0] || 'unknown vessel'}.`] : [],
        };
    },

    topSigns(data) {
        const signs = topFatigueSigns(data.fatigue);
        const total = data.fatigue.length;
        return {
            answer: `The most recurring fatigue sign is **"${signs[0]?.[0] || 'N/A'}"** appearing in **${fmtNum(signs[0]?.[1] || 0)}** incidents.`,
            evidence: signs.slice(0, 5).map(([s, c]) => `**${s}**: ${fmtNum(c)} occurrences`),
            drivers: [`Elevated resting HR and poor sleep quality are the most common physiological indicators of crew fatigue.`],
        };
    },
};

function buildSpikeResponse(dayData, dateStr, totalAll) {
    const byV = {};
    const byR = {};
    const byL = {};
    dayData.forEach(f => {
        byV[f.vesselName] = (byV[f.vesselName] || 0) + 1;
        byR[f.rank] = (byR[f.rank] || 0) + 1;
        byL[f.level] = (byL[f.level] || 0) + 1;
    });
    const topVessel = Object.entries(byV).sort(([, a], [, b]) => b - a);
    return {
        answer: `On **${dateStr}**, there were **${dayData.length} fatigue incidents**, representing **${pct(dayData.length, totalAll)}** of all incidents in this period.`,
        evidence: [
            `Incident count: **${dayData.length}**`,
            `Unique crew: **${new Set(dayData.map(f => f.crewId)).size}**`,
            `Very High: ${byL['Very High'] || 0}, High: ${byL['High'] || 0}, Moderate: ${byL['Moderate'] || 0}`,
            `Top vessel: **${topVessel[0]?.[0]}** (${topVessel[0]?.[1]} incidents)`,
        ],
        drivers: topVessel.slice(0, 2).map(([v, c]) => `${v}: ${c} incidents on this date`),
    };
}

// ── Alert Preset Handlers ──
const alertHandlers = {
    heatBreakdown(data) {
        const heat = heatAlertsBySubtype(data.alerts);
        const byV = alertsByVessel(data.alerts.filter(a => a.type === 'Heat Exposure'));
        return {
            answer: `There were **${fmtNum(heat.high)} High** and **${fmtNum(heat.veryHigh)} Very High** heat alerts, totaling **${fmtNum(heat.total)}**.`,
            evidence: [
                `High (39.4–46.1°C, 45min): **${fmtNum(heat.high)}**`,
                `Very High (>46.1°C, 30min): **${fmtNum(heat.veryHigh)}**`,
                `Cooldown reaction rate: **${cooldownReactionRate(data.alerts)}%**`,
                `Top vessels: ${topN(byV, 3)}`,
            ],
            drivers: byV.slice(0, 3).map(([v, c]) => `${v} drove ${fmtNum(c)} heat alerts (${pct(c, heat.total)})`),
        };
    },

    alertSpike(data, dateStr) {
        const daily = dailyAlertsByType(data.alerts);
        let target = dateStr;
        if (!target || !daily[target]) {
            const allDays = alertsByDay(data.alerts);
            const peak = allDays.reduce((max, cur) => cur[1] > max[1] ? cur : max, allDays[0]);
            target = peak?.[0];
        }
        if (!target || !daily[target]) return { answer: 'No alert data for this selection.', evidence: [], drivers: [] };
        const dayTypes = daily[target];
        const dayAlerts = data.alerts.filter(a => a.date === target);
        const byV = {};
        dayAlerts.forEach(a => { byV[a.vesselName] = (byV[a.vesselName] || 0) + 1; });
        const topV = Object.entries(byV).sort(([, a], [, b]) => b - a);
        return {
            answer: `On **${target}**, there were **${dayAlerts.length} alerts**. The primary contributors were ${Object.entries(dayTypes).map(([t, c]) => `${t}: ${c}`).join(', ')}.`,
            evidence: [
                `Total alerts on this date: **${dayAlerts.length}**`,
                ...Object.entries(dayTypes).map(([t, c]) => `**${t}**: ${c}`),
                `Top vessel: **${topV[0]?.[0]}** (${topV[0]?.[1]})`,
            ],
            drivers: topV.slice(0, 2).map(([v, c]) => `${v}: ${c} alerts on this date`),
        };
    },

    hrByRank(data) {
        const hr = data.alerts.filter(a => a.type === 'Heart Exertion');
        const byR = {};
        hr.forEach(a => { byR[a.rank] = (byR[a.rank] || 0) + 1; });
        const sorted = Object.entries(byR).sort(([, a], [, b]) => b - a);
        return {
            answer: `**${sorted[0]?.[0] || 'N/A'}** has the most HR exertion alerts with **${fmtNum(sorted[0]?.[1] || 0)}** alerts.`,
            evidence: sorted.slice(0, 5).map(([r, c]) => `**${r}**: ${fmtNum(c)}`),
            drivers: [`Engine crew and deck ratings have the highest exertion rates due to physical demands in high-temperature environments.`],
        };
    },

    fallVsSOS(data) {
        const counts = fallSosCounts(data.alerts);
        const falls = data.alerts.filter(a => a.type === 'Fall');
        const sos = data.alerts.filter(a => a.type === 'SOS');
        const fallByV = {};
        falls.forEach(a => { fallByV[a.vesselName] = (fallByV[a.vesselName] || 0) + 1; });
        const sosByV = {};
        sos.forEach(a => { sosByV[a.vesselName] = (sosByV[a.vesselName] || 0) + 1; });
        const topFallV = Object.entries(fallByV).sort(([, a], [, b]) => b - a);
        const topSosV = Object.entries(sosByV).sort(([, a], [, b]) => b - a);
        const outlier = topFallV[0]?.[1] > (counts.totalFalls / vessels.length) * 2;
        return {
            answer: `There are **${fmtNum(counts.totalFalls)} fall alerts** and **${fmtNum(counts.totalSOS)} SOS alerts**. ${outlier ? `**${topFallV[0]?.[0]}** appears to be an outlier for falls.` : 'No single vessel is a clear outlier.'}`,
            evidence: [
                `Total falls: **${fmtNum(counts.totalFalls)}** (${counts.uniqueFallCrew} unique crew)`,
                `Total SOS: **${fmtNum(counts.totalSOS)}** (${counts.uniqueSOSCrew} unique crew)`,
                topFallV[0] ? `Top vessel for falls: **${topFallV[0][0]}** (${topFallV[0][1]})` : null,
                topSosV[0] ? `Top vessel for SOS: **${topSosV[0][0]}** (${topSosV[0][1]})` : null,
            ].filter(Boolean),
            drivers: outlier ? [`${topFallV[0][0]} has ${topFallV[0][1]} fall alerts — ${pct(topFallV[0][1], counts.totalFalls)} of all falls — suggesting a vessel-specific safety concern.`] : [],
        };
    },

    topVesselDistribution(data) {
        const byV = alertsByVessel(data.alerts);
        if (byV.length === 0) return { answer: 'No alerts in current selection.', evidence: [], drivers: [] };
        const topVName = byV[0][0];
        const topVAlerts = data.alerts.filter(a => a.vesselName === topVName);
        const byLoc = {};
        const byType = {};
        topVAlerts.forEach(a => {
            byLoc[a.location] = (byLoc[a.location] || 0) + 1;
            byType[a.type] = (byType[a.type] || 0) + 1;
        });
        return {
            answer: `**${topVName}** leads with **${fmtNum(byV[0][1])} total alerts**. The distribution by type and location is below.`,
            evidence: [
                `Total alerts: **${fmtNum(byV[0][1])}**`,
                ...Object.entries(byType).sort(([, a], [, b]) => b - a).map(([t, c]) => `**${t}**: ${c}`),
            ],
            drivers: Object.entries(byLoc).sort(([, a], [, b]) => b - a).slice(0, 3).map(([l, c]) => `${l}: ${c} alerts`),
        };
    },
};

// ── Incident Equivalents Handlers ──
const incidentHandlers = {
    nearMiss(data) {
        return {
            answer: `There are an estimated **${fmtNum(data.incidents.enm)} Near Miss-equivalent incidents** in the selected period.`,
            evidence: [
                `Total Near Miss equivalents: **${fmtNum(data.incidents.enm)}**`,
                `Derived from: Heat(Very High), HR Exertion, Fatigue(High), and severe Work-Rest violations.`,
                `Based on ${fmtNum(data.incidents.evidence.alertsProcessed)} alerts, ${fmtNum(data.incidents.evidence.fatigueProcessed)} fatigue records, and ${fmtNum(data.incidents.evidence.workRestProcessed)} work-rest records.`
            ],
            drivers: []
        };
    },
    trcf(data) {
        return {
            answer: `There are an estimated **${fmtNum(data.incidents.trcf)} TRCF-equivalent incidents** in the selected period.`,
            evidence: [
                `Total TRCF equivalents: **${fmtNum(data.incidents.trcf)}**`,
                `Derived from: Fall, SOS, HR Exertion, Heat(High/Very High), and Fatigue(High/Very High).`,
                `Based on ${fmtNum(data.incidents.evidence.alertsProcessed)} alerts, ${fmtNum(data.incidents.evidence.fatigueProcessed)} fatigue records, and ${fmtNum(data.incidents.evidence.workRestProcessed)} work-rest records.`
            ],
            drivers: []
        };
    }
};

// ── Summary Generators ──
export function generateAlertsSummary() {
    const data = getFilteredData();
    const total = data.alerts.length;
    const heat = heatAlertsBySubtype(data.alerts);
    const hr = hrAlertsByZone(data.alerts);
    const fs = fallSosCounts(data.alerts);
    const byV = alertsByVessel(data.alerts);
    const comp = compareWindow(data.alerts, alertsByDay);

    let trend = '';
    if (comp) trend = comp.change > 0 ? `trending **up ${comp.change}%**` : `trending **down ${Math.abs(comp.change)}%**`;

    return {
        filterContext: data.filters,
        summary: `There are **${fmtNum(total)} total alerts** in the selected period${trend ? `, ${trend} vs prior window` : ''}. Heat exposure accounts for **${fmtNum(heat.total)}** (${pct(heat.total, total)}), HR exertion for **${fmtNum(hr.total)}** (${pct(hr.total, total)}), falls **${fmtNum(fs.totalFalls)}**, and SOS **${fmtNum(fs.totalSOS)}**. Top vessel: **${byV[0]?.[0] || 'N/A'}** with ${fmtNum(byV[0]?.[1] || 0)} alerts. Cooldown reaction rate is **${cooldownReactionRate(data.alerts)}%**.`,
    };
}

export function generateFatigueSummary() {
    const data = getFilteredData();
    const total = data.fatigue.length;
    const levels = fatigueByLevel(data.fatigue);
    const byV = fatigueByVessel(data.fatigue);
    const uniq = uniqueFatigueCrew(data.fatigue);
    const comp = compareWindow(data.fatigue, fatigueByDay);

    let trend = '';
    if (comp) trend = comp.change > 0 ? `trending **up ${comp.change}%**` : `trending **down ${Math.abs(comp.change)}%**`;

    return {
        filterContext: data.filters,
        summary: `**${fmtNum(total)} fatigue incidents** detected across **${uniq}** crew members${trend ? `, ${trend} vs prior window` : ''}. Breakdown: Moderate **${fmtNum(levels['Moderate'])}**, High **${fmtNum(levels['High'])}**, Very High **${fmtNum(levels['Very High'])}**. Top vessel: **${byV[0]?.[0] || 'N/A'}** (${fmtNum(byV[0]?.[1] || 0)} incidents).`,
    };
}

export function generateOverviewSummary() {
    const data = getFilteredData();
    const totalAlerts = data.alerts.length;
    const totalFatigue = data.fatigue.length;
    const heat = heatAlertsBySubtype(data.alerts);
    const fs = fallSosCounts(data.alerts);
    const byV = alertsByVessel(data.alerts);

    return {
        filterContext: data.filters,
        summary: `Fleet status: **${vessels.length}** vessels monitored, **${totalCrew}** crew, **${activeWatches}** active watches. In the selected period: **${fmtNum(totalAlerts)} alerts** (${fmtNum(heat.total)} heat, ${fmtNum(fs.totalFalls)} falls, ${fmtNum(fs.totalSOS)} SOS) and **${fmtNum(totalFatigue)} fatigue incidents**. Top alert vessel: **${byV[0]?.[0] || 'N/A'}**.`,
    };
}

export function generateHsseKpiSummary() {
    const data = getFilteredData();
    const { enm, uc, ua, uc_ua_dedup, trcf, ltif } = data.incidents;
    return {
        filterContext: filterManager.getFilterSummary(),
        summary: `Incident-Equivalent Derivations: Estimated **${fmtNum(enm)}** Near Misses, combined **${fmtNum(uc_ua_dedup)}** Unsafe Conditions/Acts, and **${fmtNum(trcf)}** TRCF-equivalent risk precursors based on aggregated heat, HR, fatigue, and work-rest tracking. Lost-Time equivalents remain at **${fmtNum(ltif)}**.`,
    };
}

// ── Main Query Handler ──
export async function queryAI(question, context = {}) {
    await delay(800 + Math.random() * 1500); // Simulate latency

    const data = getFilteredData();
    const q = question.toLowerCase();

    // Match fatigue presets
    if (q.includes('total fatigue') || q.includes('fatigue incidents') && q.includes('vessel')) {
        return formatResponse(fatigueHandlers.totalIncidents(data), data.filters);
    }
    if (q.includes('fatigue') && (q.includes('spike') || q.includes('why'))) {
        return formatResponse(fatigueHandlers.spikeAnalysis(data, context.date), data.filters);
    }
    if (q.includes('fatigue') && q.includes('rank')) {
        return formatResponse(fatigueHandlers.byRank(data), data.filters);
    }
    if (q.includes('fatigue') && (q.includes('level') || q.includes('moderate') || q.includes('high') || q.includes('breakdown'))) {
        return formatResponse(fatigueHandlers.byLevel(data), data.filters);
    }
    if (q.includes('fatigue') && q.includes('sign')) {
        return formatResponse(fatigueHandlers.topSigns(data), data.filters);
    }

    // Match alert presets
    if (q.includes('heat') && (q.includes('high') || q.includes('alert'))) {
        return formatResponse(alertHandlers.heatBreakdown(data), data.filters);
    }
    if (q.includes('spike') || (q.includes('alert') && q.includes('explain'))) {
        return formatResponse(alertHandlers.alertSpike(data, context.date), data.filters);
    }
    if (q.includes('exertion') && q.includes('rank')) {
        return formatResponse(alertHandlers.hrByRank(data), data.filters);
    }
    if (q.includes('fall') || q.includes('sos')) {
        return formatResponse(alertHandlers.fallVsSOS(data), data.filters);
    }
    if (q.includes('top vessel') || q.includes('distribution')) {
        return formatResponse(alertHandlers.topVesselDistribution(data), data.filters);
    }

    // Match incident presets
    if (q.includes('near miss') || q.includes('nm')) {
        return formatResponse(incidentHandlers.nearMiss(data), data.filters);
    }
    if (q.includes('trcf') || q.includes('recordable')) {
        return formatResponse(incidentHandlers.trcf(data), data.filters);
    }

    // Generic handler
    if (q.includes('fatigue')) {
        return formatResponse(fatigueHandlers.totalIncidents(data), data.filters);
    }
    if (q.includes('alert')) {
        return formatResponse(alertHandlers.heatBreakdown(data), data.filters);
    }

    // Fallback
    return formatResponse({
        answer: `Based on current filters, there are **${fmtNum(data.alerts.length)} alerts** and **${fmtNum(data.fatigue.length)} fatigue incidents**. Please try one of the preset questions for more specific analysis.`,
        evidence: [
            `Alerts: **${fmtNum(data.alerts.length)}**`,
            `Fatigue incidents: **${fmtNum(data.fatigue.length)}**`,
            `Period: ${data.filters.startDate} to ${data.filters.endDate}`,
        ],
        drivers: [],
    }, data.filters);
}

function formatResponse(result, filters) {
    return {
        filterContext: filterManager.getFilterSummary(),
        answer: result.answer,
        evidence: result.evidence || [],
        drivers: result.drivers || [],
    };
}

export const FATIGUE_PRESETS = [
    'What is the total fatigue incidents for the selected period, and which vessels contributed the most?',
    'Why did fatigue risk increase on [selected date]?',
    'Which ranks and rank groups have the highest fatigue incidents?',
    'Break down fatigue by fatigue level, Moderate, High, and Very High, and identify the main contributing vessel.',
    'Show the top recurring fatigue patterns from the Daily Signs of Fatigue list.',
];

export const ALERT_PRESETS = [
    'How many heat alerts were High vs Very High, and which vessels drove them?',
    'Explain the alerts spike on [selected date], what types of alerts increased and where?',
    'Which ranks have the most HR exertion alerts?',
    'Show fall alerts vs SOS alerts, and identify whether any vessel is an outlier.',
    'For the vessel with the highest alerts, show the distribution by alert type, rank, and location.',
];

export const INCIDENT_PRESETS = [
    'What is the estimated Near Miss-equivalent incident count for the selected period?',
    'Show the estimated Unsafe Condition-equivalent and Unsafe Act-equivalent counts.',
    'What is the estimated Medical Treatment Case equivalent count?',
    'What is the estimated Total Recordable Case Frequency (TRCF) equivalent incident count?',
];

// Synthetic fatigue data generator
import { vessels, crew } from './vessels.js';

function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const rand = seededRandom(456);
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }

const now = new Date(2026, 2, 5);
const DAY_MS = 86400000;

const FATIGUE_SIGNS = [
    'Elevated resting HR', 'Poor sleep quality', 'Reduced HRV',
    'Extended work hours', 'High physical exertion', 'Irregular watch pattern',
    'Elevated stress index', 'Reduced recovery time', 'Repeated high HR episodes',
    'Low activity during rest'
];

function generateFatigueData() {
    const incidents = [];
    let id = 1;

    // For each crew member, generate a 90-day RHR baseline series
    const crewBaselines = {};
    crew.forEach(c => {
        const baseRHR = randInt(58, 78); // baseline resting HR
        const dailyRHR = [];
        for (let d = 95; d >= 0; d--) {
            // Normal variation + occasional fatigue spikes
            let variation = (rand() - 0.5) * 8;
            // Some days spike significantly
            if (rand() > 0.92) variation += randInt(8, 18);
            dailyRHR.push(Math.round(baseRHR + variation));
        }
        crewBaselines[c.id] = { baseRHR, dailyRHR };
    });

    // Compute fatigue incidents using the rolling 7-day average logic
    for (let d = 89; d >= 0; d--) {
        const date = new Date(now.getTime() - d * DAY_MS);
        const dateStr = date.toISOString().split('T')[0];
        const dayIdx = 95 - d; // index into dailyRHR array

        crew.forEach(c => {
            const data = crewBaselines[c.id];
            if (dayIdx < 7) return; // need 7 days for baseline

            // 7-day rolling average
            let sum = 0;
            for (let i = dayIdx - 7; i < dayIdx; i++) sum += data.dailyRHR[i];
            const baseline = sum / 7;

            const todayRHR = data.dailyRHR[dayIdx];
            const yesterdayRHR = data.dailyRHR[dayIdx - 1];

            // Mark fatigue incident if both today and yesterday exceed baseline by +10 BPM
            if (todayRHR > baseline + 10 && yesterdayRHR > baseline + 10) {
                // Count signs of fatigue (simulated)
                const signCount = Math.min(10, Math.floor((todayRHR - baseline - 10) / 2) + randInt(1, 3));
                const signs = [];
                const shuffled = [...FATIGUE_SIGNS].sort(() => rand() - 0.5);
                for (let i = 0; i < Math.min(signCount, FATIGUE_SIGNS.length); i++) {
                    signs.push(shuffled[i]);
                }

                let level;
                if (signCount <= 3) level = 'Moderate';
                else if (signCount <= 6) level = 'High';
                else level = 'Very High';

                const vessel = vessels.find(v => v.id === c.vesselId);
                incidents.push({
                    id: `F${String(id++).padStart(5, '0')}`,
                    date: dateStr,
                    timestamp: date.toISOString(),
                    crewId: c.id,
                    vesselId: c.vesselId,
                    vesselName: vessel.name,
                    vesselType: vessel.type,
                    rank: c.rank,
                    rankGroup: c.rankGroup,
                    location: c.location,
                    rhr: todayRHR,
                    baseline: Math.round(baseline),
                    deviation: Math.round(todayRHR - baseline),
                    signCount,
                    signs,
                    level,
                });
            }
        });
    }

    return incidents;
}

export const allFatigueIncidents = generateFatigueData();

// Aggregation helpers
export function filterFatigue(incidents, filters) {
    return incidents.filter(f => {
        if (filters.vessel && filters.vessel !== 'all' && f.vesselId !== filters.vessel) return false;
        if (filters.vesselType && filters.vesselType !== 'all' && f.vesselType !== filters.vesselType) return false;
        if (filters.rank && filters.rank !== 'all' && f.rank !== filters.rank) return false;
        if (filters.location && filters.location !== 'all' && f.location !== filters.location) return false;
        if (filters.startDate && f.date < filters.startDate) return false;
        if (filters.endDate && f.date > filters.endDate) return false;
        return true;
    });
}

export function fatigueByDay(incidents) {
    const map = {};
    incidents.forEach(f => {
        map[f.date] = (map[f.date] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

export function fatigueByLevel(incidents) {
    const map = { 'Moderate': 0, 'High': 0, 'Very High': 0 };
    incidents.forEach(f => { map[f.level] = (map[f.level] || 0) + 1; });
    return map;
}

export function fatigueByVessel(incidents) {
    const map = {};
    incidents.forEach(f => { map[f.vesselName] = (map[f.vesselName] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function fatigueByRank(incidents) {
    const map = {};
    incidents.forEach(f => { map[f.rank] = (map[f.rank] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function fatigueByLocation(incidents) {
    const map = {};
    incidents.forEach(f => { map[f.location] = (map[f.location] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function fatigueByVesselType(incidents) {
    const map = {};
    incidents.forEach(f => { map[f.vesselType] = (map[f.vesselType] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function uniqueFatigueCrew(incidents) {
    return new Set(incidents.map(f => f.crewId)).size;
}

export function topFatigueSigns(incidents) {
    const map = {};
    incidents.forEach(f => {
        f.signs.forEach(s => { map[s] = (map[s] || 0) + 1; });
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

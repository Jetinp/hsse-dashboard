// Synthetic alert event data generator
import { vessels, crew, LOCATIONS } from './vessels.js';

function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const rand = seededRandom(123);
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }

const ALERT_TYPES = {
    HEAT_VERY_HIGH: { type: 'Heat Exposure', subtype: 'Very High', severity: 'Very High', description: 'HI > 46.1°C persisting 30 min' },
    HEAT_HIGH: { type: 'Heat Exposure', subtype: 'High', severity: 'High', description: 'HI 39.4–46.1°C persisting 45 min' },
    HR_ZONE5: { type: 'Heart Exertion', subtype: 'Zone 5', severity: 'Very High', description: 'HR > 90% of HRMax for 15 min' },
    HR_ZONE4: { type: 'Heart Exertion', subtype: 'Zone 4', severity: 'High', description: 'HR 80–90% of HRMax for 15 min' },
    FALL: { type: 'Fall', subtype: 'Fall Detected', severity: 'High', description: 'Accelerometer fall detection triggered' },
    SOS: { type: 'SOS', subtype: 'SOS Activated', severity: 'Very High', description: 'Manual SOS activation by crew' }
};

const now = new Date(2026, 2, 5); // March 5, 2026
const DAY_MS = 86400000;

function generateAlerts() {
    const alerts = [];
    let id = 1;

    // Generate 90 days of data
    for (let d = 89; d >= 0; d--) {
        const date = new Date(now.getTime() - d * DAY_MS);
        const dateStr = date.toISOString().split('T')[0];

        // More heat alerts in recent days / simulate seasonal pattern
        const heatBase = 3 + Math.sin((90 - d) * 0.07) * 2;
        // Spikes on specific days
        const isSpike = d === 15 || d === 42 || d === 7;

        // Heat Very High: rarer
        const vhCount = Math.max(0, Math.round(heatBase * 0.3 * (isSpike ? 3 : 1) + (rand() - 0.5) * 2));
        for (let i = 0; i < vhCount; i++) {
            const c = pick(crew);
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.HEAT_VERY_HIGH,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(6, 18) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(['Deck', 'Engine Room', 'Cargo Hold']),
                heatIndex: (46.1 + rand() * 8).toFixed(1),
                duration: randInt(30, 90),
                cooldownAction: rand() > 0.3,
            });
        }

        // Heat High: more common
        const hCount = Math.max(0, Math.round(heatBase * 0.7 * (isSpike ? 2.5 : 1) + (rand() - 0.5) * 3));
        for (let i = 0; i < hCount; i++) {
            const c = pick(crew);
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.HEAT_HIGH,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(6, 18) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(['Deck', 'Engine Room', 'Cargo Hold']),
                heatIndex: (39.4 + rand() * 6.7).toFixed(1),
                duration: randInt(45, 120),
                cooldownAction: rand() > 0.25,
            });
        }

        // Heart Exertion alerts
        const hrBase = 2 + Math.sin((90 - d) * 0.05) * 1.5;
        const hrZ5 = Math.max(0, Math.round(hrBase * 0.25 * (isSpike ? 2 : 1) + (rand() - 0.5) * 1.5));
        for (let i = 0; i < hrZ5; i++) {
            const c = pick(crew);
            const hrMax = 220 - c.age;
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.HR_ZONE5,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(4, 20) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(LOCATIONS),
                heartRate: Math.round(hrMax * (0.9 + rand() * 0.1)),
                hrMax,
                duration: randInt(15, 45),
            });
        }

        const hrZ4 = Math.max(0, Math.round(hrBase * 0.75 * (isSpike ? 2 : 1) + (rand() - 0.5) * 2));
        for (let i = 0; i < hrZ4; i++) {
            const c = pick(crew);
            const hrMax = 220 - c.age;
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.HR_ZONE4,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(4, 20) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(LOCATIONS),
                heartRate: Math.round(hrMax * (0.8 + rand() * 0.1)),
                hrMax,
                duration: randInt(15, 60),
            });
        }

        // Fall alerts: rare
        const fallCount = rand() > 0.7 ? randInt(0, 2) : 0;
        for (let i = 0; i < fallCount; i++) {
            const c = pick(crew);
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.FALL,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(0, 23) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(['Deck', 'Engine Room', 'Cargo Hold', 'Bridge']),
            });
        }

        // SOS alerts: very rare
        if (rand() > 0.88) {
            const c = pick(crew);
            alerts.push({
                id: `A${String(id++).padStart(5, '0')}`,
                ...ALERT_TYPES.SOS,
                date: dateStr,
                timestamp: new Date(date.getTime() + randInt(0, 23) * 3600000 + randInt(0, 3599) * 1000).toISOString(),
                vesselId: c.vesselId,
                vesselName: c.vesselName,
                vesselType: vessels.find(v => v.id === c.vesselId)?.type,
                crewId: c.id,
                rank: c.rank,
                rankGroup: c.rankGroup,
                location: pick(LOCATIONS),
            });
        }
    }

    return alerts;
}

export const allAlerts = generateAlerts();

// Aggregation helpers
export function filterAlerts(alerts, filters) {
    return alerts.filter(a => {
        if (filters.vessel && filters.vessel !== 'all' && a.vesselId !== filters.vessel) return false;
        if (filters.vesselType && filters.vesselType !== 'all' && a.vesselType !== filters.vesselType) return false;
        if (filters.rank && filters.rank !== 'all' && a.rank !== filters.rank) return false;
        if (filters.location && filters.location !== 'all' && a.location !== filters.location) return false;
        if (filters.startDate && a.date < filters.startDate) return false;
        if (filters.endDate && a.date > filters.endDate) return false;
        return true;
    });
}

export function alertsByDay(alerts) {
    const map = {};
    alerts.forEach(a => {
        map[a.date] = (map[a.date] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

export function alertsByType(alerts) {
    const map = {};
    alerts.forEach(a => {
        const key = a.type;
        map[key] = (map[key] || 0) + 1;
    });
    return map;
}

export function alertsByVessel(alerts) {
    const map = {};
    alerts.forEach(a => {
        map[a.vesselName] = (map[a.vesselName] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function alertsByRank(alerts) {
    const map = {};
    alerts.forEach(a => {
        map[a.rank] = (map[a.rank] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function alertsByVesselType(alerts) {
    const map = {};
    alerts.forEach(a => {
        map[a.vesselType] = (map[a.vesselType] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function alertsByLocation(alerts) {
    const map = {};
    alerts.forEach(a => {
        map[a.location] = (map[a.location] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function heatAlertsBySubtype(alerts) {
    const heat = alerts.filter(a => a.type === 'Heat Exposure');
    const high = heat.filter(a => a.subtype === 'High').length;
    const veryHigh = heat.filter(a => a.subtype === 'Very High').length;
    return { high, veryHigh, total: high + veryHigh };
}

export function hrAlertsByZone(alerts) {
    const hr = alerts.filter(a => a.type === 'Heart Exertion');
    const zone4 = hr.filter(a => a.subtype === 'Zone 4').length;
    const zone5 = hr.filter(a => a.subtype === 'Zone 5').length;
    return { zone4, zone5, total: zone4 + zone5 };
}

export function fallSosCounts(alerts) {
    const falls = alerts.filter(a => a.type === 'Fall');
    const sos = alerts.filter(a => a.type === 'SOS');
    return {
        totalFalls: falls.length,
        uniqueFallCrew: new Set(falls.map(a => a.crewId)).size,
        totalSOS: sos.length,
        uniqueSOSCrew: new Set(sos.map(a => a.crewId)).size,
    };
}

export function cooldownReactionRate(alerts) {
    const heat = alerts.filter(a => a.type === 'Heat Exposure' && a.cooldownAction !== undefined);
    if (heat.length === 0) return 0;
    const reacted = heat.filter(a => a.cooldownAction).length;
    return Math.round((reacted / heat.length) * 100);
}

export function dailyAlertsByType(alerts) {
    const map = {};
    alerts.forEach(a => {
        if (!map[a.date]) map[a.date] = {};
        const key = a.type === 'Heat Exposure' ? a.subtype : a.type;
        map[a.date][key] = (map[a.date][key] || 0) + 1;
    });
    return map;
}

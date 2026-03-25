// Rule-based derivation engine for Incident Equivalents
import { allAlerts, filterAlerts } from './alerts.js';
import { allFatigueIncidents, filterFatigue } from './fatigue.js';
import { workRestViolations } from './workRest.js';

export function deriveIncidentEquivalents(filters) {
    const alerts = filterAlerts(allAlerts, filters);
    const fatigue = filterFatigue(allFatigueIncidents, filters);
    
    // Filter work rest violations by time/vessel
    const wr = workRestViolations.filter(w => {
        if (filters.period !== 'all') {
            const now = Date.now();
            const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
            const limit = now - (daysMap[filters.period] * 24 * 60 * 60 * 1000);
            if (w.timestamp < limit) return false;
        }
        if (filters.vessel && filters.vessel !== 'all' && w.vesselName !== filters.vessel) return false;
        return true;
    });

    const cases = new Set();
    const metrics = {
        enm: 0,
        uc: 0,
        ua: 0,
        uc_ua: 0, // mathematical sum
        uc_ua_dedup: 0, // deduplicated combo
        mtc: 0,
        lwc_rwc: 0,
        ltif: 0,
        trcf: 0
    };
    
    // Helper to evaluate and ingest proxy matches
    // Deduplication rule: case_key = crewId + vesselId + calendar_date + proxy_category
    function evaluate(event, type) {
        let d = event.date || (event.timestamp ? new Date(event.timestamp).toISOString().split('T')[0] : 'undated');
        const vId = event.vesselId || event.vesselName || 'no_vessel';
        const crewId = event.crewId || 'no_crew';
        const matches = [];

        // Formatting field names
        const severity = event.severity || event.level; // Fatigue uses 'level'
        const eventType = event.type === 'Fall Detected' ? 'Fall' : (event.type === 'SOS Activated' ? 'SOS' : event.type);

        // 1. Estimated Near Miss-Equivalent
        if (
            (type === 'alert' && eventType === 'Heat Exposure' && severity === 'Very High') ||
            (type === 'alert' && eventType === 'Heart Exertion') ||
            (type === 'fatigue' && severity === 'High') ||
            (type === 'wr' && ['maximum_working_hour', 'rest_duration_day', 'rest_duration_week'].includes(event.type))
        ) matches.push('NM_EQ');

        // 2.1 Unsafe Condition
        if (
            (type === 'alert' && eventType === 'Heat Exposure' && ['High', 'Very High'].includes(severity)) ||
            (type === 'alert' && eventType === 'Fall')
        ) matches.push('UC_EQ');
        
        // 2.2 Unsafe Act
        if (
            (type === 'fatigue' && ['High', 'Very High'].includes(severity)) ||
            (type === 'wr')
        ) matches.push('UA_EQ');

        // 3. MTC
        if (
            (type === 'alert' && eventType === 'Heat Exposure' && severity === 'High') ||
            (type === 'alert' && eventType === 'Heart Exertion') ||
            (type === 'fatigue' && severity === 'High')
        ) matches.push('MTC_EQ');

        // 4. LWC/RWC
        if (
            (type === 'alert' && ['Fall', 'SOS'].includes(eventType)) ||
            (type === 'alert' && eventType === 'Heat Exposure' && severity === 'Very High') ||
            (type === 'fatigue' && severity === 'Very High')
        ) matches.push('LWC_RWC_EQ');

        // 5. LTIF
        if (type === 'alert' && ['Fall', 'SOS'].includes(eventType)) matches.push('LTIF_EQ');

        // 6. TRCF
        if (
            (type === 'alert' && ['Fall', 'SOS', 'Heart Exertion'].includes(eventType)) ||
            (type === 'alert' && eventType === 'Heat Exposure' && ['High', 'Very High'].includes(severity)) ||
            (type === 'fatigue' && ['High', 'Very High'].includes(severity))
        ) matches.push('TRCF_EQ');

        // Deduplication process
        matches.forEach(proxy => {
            const key = `${crewId}_${vId}_${d}_${proxy}`;
            if (!cases.has(key)) {
                cases.add(key);
                if (proxy === 'NM_EQ') metrics.enm++;
                if (proxy === 'UC_EQ') metrics.uc++;
                if (proxy === 'UA_EQ') metrics.ua++;
                if (proxy === 'MTC_EQ') metrics.mtc++;
                if (proxy === 'LWC_RWC_EQ') metrics.lwc_rwc++;
                if (proxy === 'LTIF_EQ') metrics.ltif++;
                if (proxy === 'TRCF_EQ') metrics.trcf++;
                
                // Track deduplicated UC+UA combined
                if (proxy === 'UC_EQ' || proxy === 'UA_EQ') {
                    const comboKey = `${crewId}_${vId}_${d}_UC_UA_COMBO`;
                    if (!cases.has(comboKey)) {
                        cases.add(comboKey);
                        metrics.uc_ua_dedup++;
                    }
                }
            }
        });
    }

    // Process all arrays
    alerts.forEach(a => evaluate(a, 'alert'));
    fatigue.forEach(f => evaluate(f, 'fatigue'));
    wr.forEach(w => evaluate(w, 'wr'));
    
    metrics.uc_ua = metrics.uc + metrics.ua;

    return {
        ...metrics,
        evidence: {
            alertsProcessed: alerts.length,
            fatigueProcessed: fatigue.length,
            workRestProcessed: wr.length
        }
    };
}

export function deriveIncidentEquivalentsTrend(filters) {
    // Generate trend data over the last N days evaluating incidents
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'all': 90 };
    const days = daysMap[filters.period] || 30;
    
    const trend = [];
    const now = new Date(2026, 2, 5); // Base mock date
    
    // We compute the metrics day by day to build a trend line
    for (let i = days - 1; i >= 0; i--) {
        const dStr = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
        // Create an isolated daily filter
        const dayFilters = { ...filters, startDate: dStr, endDate: dStr };
        const dayMetrics = deriveIncidentEquivalents(dayFilters);
        trend.push([dStr, dayMetrics]);
    }
    return trend;
}

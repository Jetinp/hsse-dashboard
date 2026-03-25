// Central filter state manager with event emitter pattern
import { vessels, RANKS, LOCATIONS, VESSEL_TYPES } from './vessels.js';

const DAY_MS = 86400000;
const now = new Date(2026, 2, 5);

function formatDate(d) { return d.toISOString().split('T')[0]; }

class FilterManager {
    constructor() {
        this.listeners = [];
        this.state = {
            vessel: 'all',
            vesselType: 'all',
            rank: 'all',
            location: 'all',
            timePeriod: '30d',
            startDate: formatDate(new Date(now.getTime() - 30 * DAY_MS)),
            endDate: formatDate(now),
        };
    }

    get() { return { ...this.state }; }

    set(key, value) {
        this.state[key] = value;
        if (key === 'timePeriod') {
            const days = { '7d': 7, '30d': 30, '90d': 90 }[value] || 30;
            this.state.startDate = formatDate(new Date(now.getTime() - days * DAY_MS));
            this.state.endDate = formatDate(now);
        }
        this.emit();
    }

    subscribe(fn) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    emit() {
        this.listeners.forEach(fn => fn(this.state));
    }

    getActiveFiltersDisplay() {
        const parts = [];
        if (this.state.vessel !== 'all') {
            const v = vessels.find(v => v.id === this.state.vessel);
            parts.push(v ? v.name : this.state.vessel);
        }
        if (this.state.vesselType !== 'all') parts.push(this.state.vesselType);
        if (this.state.rank !== 'all') parts.push(this.state.rank);
        if (this.state.location !== 'all') parts.push(this.state.location);
        parts.push(this.state.timePeriod);
        return parts.join(' · ');
    }

    getFilterSummary() {
        const parts = [];
        if (this.state.vessel !== 'all') {
            const v = vessels.find(v => v.id === this.state.vessel);
            parts.push(`Vessel: ${v ? v.name : this.state.vessel}`);
        }
        if (this.state.vesselType !== 'all') parts.push(`Type: ${this.state.vesselType}`);
        if (this.state.rank !== 'all') parts.push(`Rank: ${this.state.rank}`);
        if (this.state.location !== 'all') parts.push(`Location: ${this.state.location}`);
        parts.push(`Period: ${this.state.startDate} to ${this.state.endDate}`);
        return parts.join(' | ');
    }
}

export const filterManager = new FilterManager();

export function getFilterOptions() {
    return {
        vessels: [{ value: 'all', label: 'All Vessels' }, ...vessels.map(v => ({ value: v.id, label: v.name }))],
        vesselTypes: [{ value: 'all', label: 'All Types' }, ...VESSEL_TYPES.map(t => ({ value: t, label: t }))],
        ranks: [{ value: 'all', label: 'All Ranks' }, ...RANKS.map(r => ({ value: r, label: r }))],
        locations: [{ value: 'all', label: 'All Locations' }, ...LOCATIONS.map(l => ({ value: l, label: l }))],
        timePeriods: [
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
        ],
    };
}

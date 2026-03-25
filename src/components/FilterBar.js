// Global filter bar component
import { filterManager, getFilterOptions } from '../data/filters.js';

export function renderFilterBar() {
    const el = document.getElementById('filter-bar');
    const options = getFilterOptions();
    const state = filterManager.get();

    function buildSelect(id, opts, current, label) {
        return `
      <div class="filter-group">
        <label class="filter-label" for="filter-${id}">${label}</label>
        <select class="filter-select" id="filter-${id}">
          ${opts.map(o => `<option value="${o.value}" ${o.value === current ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;
    }

    el.innerHTML = `
    ${buildSelect('vessel', options.vessels, state.vessel, 'Vessel')}
    ${buildSelect('vesselType', options.vesselTypes, state.vesselType, 'Type')}
    ${buildSelect('rank', options.ranks, state.rank, 'Rank')}
    ${buildSelect('location', options.locations, state.location, 'Location')}
    <div class="filter-divider"></div>
    ${buildSelect('timePeriod', options.timePeriods, state.timePeriod, 'Period')}
    <div class="filter-pills" id="filter-pills"></div>
  `;

    // Bind events
    document.getElementById('filter-vessel').addEventListener('change', e => filterManager.set('vessel', e.target.value));
    document.getElementById('filter-vesselType').addEventListener('change', e => filterManager.set('vesselType', e.target.value));
    document.getElementById('filter-rank').addEventListener('change', e => filterManager.set('rank', e.target.value));
    document.getElementById('filter-location').addEventListener('change', e => filterManager.set('location', e.target.value));
    document.getElementById('filter-timePeriod').addEventListener('change', e => filterManager.set('timePeriod', e.target.value));

    updatePills();
}

function updatePills() {
    const el = document.getElementById('filter-pills');
    if (!el) return;
    const state = filterManager.get();
    const pills = [];
    if (state.vessel !== 'all') pills.push({ key: 'vessel', label: state.vessel });
    if (state.vesselType !== 'all') pills.push({ key: 'vesselType', label: state.vesselType });
    if (state.rank !== 'all') pills.push({ key: 'rank', label: state.rank });
    if (state.location !== 'all') pills.push({ key: 'location', label: state.location });

    el.innerHTML = pills.map(p => `
    <span class="filter-pill">${p.label}<button data-key="${p.key}">×</button></span>
  `).join('');

    el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            filterManager.set(btn.dataset.key, 'all');
            renderFilterBar();
        });
    });
}

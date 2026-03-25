// Chart creation utilities using Chart.js
import { Chart, registerables } from 'chart.js';
import { askAiQuestion } from './AiPanel.js';
Chart.register(...registerables);

// Default chart styling for light theme
Chart.defaults.color = '#475569';
Chart.defaults.borderColor = '#e2e8f0';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 16;

const COLORS = {
    red: '#f87171',
    orange: '#fb923c',
    amber: '#fbbf24',
    green: '#34d399',
    teal: '#2dd4bf',
    blue: '#60a5fa',
    indigo: '#818cf8',
    purple: '#c084fc',
    pink: '#f472b6',
    blueLight: '#93c5fd',
    purpleLight: '#d8b4fe'
};

const COLORS_ARRAY = Object.values(COLORS);

function alpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

// Store chart instances for cleanup
const chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

export function createLineChart(canvasId, labels, datasets, onClick) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                borderColor: ds.color || COLORS_ARRAY[i % COLORS_ARRAY.length],
                backgroundColor: alpha(ds.color || COLORS_ARRAY[i % COLORS_ARRAY.length], 0.1),
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.3,
                fill: ds.fill !== undefined ? ds.fill : true,
            })),
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: datasets.length > 1, position: 'top' },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 12, maxRotation: 0 },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#e2e8f0' },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    if(onClick) onClick(labels[idx], datasets.map(ds => ds.data[idx]));
                    else askAiQuestion(`Explain the significance of the ${labels[idx]} data point showing ${datasets[0].data[idx]} in the timeline.`);
                }
            },
        },
    });

    chartInstances[canvasId] = chart;
    return chart;
}

export function createBarChart(canvasId, labels, datasets, opts = {}) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                backgroundColor: ds.colors || (ds.color ? alpha(ds.color, 0.7) : COLORS_ARRAY.map(c => alpha(c, 0.7))),
                borderColor: ds.colors ? ds.colors.map(c => c) : (ds.color || COLORS_ARRAY.slice(0, ds.data.length)),
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
            })),
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: opts.horizontal ? 'y' : 'x',
            plugins: {
                legend: { display: datasets.length > 1, position: 'top' },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    stacked: opts.stacked || false,
                    grid: { display: opts.horizontal ? true : false, color: '#e2e8f0' },
                    ticks: { maxRotation: opts.horizontal ? 0 : 45 },
                },
                y: {
                    stacked: opts.stacked || false,
                    beginAtZero: true,
                    grid: { color: opts.horizontal ? 'transparent' : '#e2e8f0' },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    if(opts.onClick) opts.onClick(labels[idx], datasets.map(ds => ds.data[idx]));
                    else askAiQuestion(`Why does the ${labels[idx]} category have ${datasets[0].data[idx]} recorded events in this chart?`);
                }
            },
        },
    });

    chartInstances[canvasId] = chart;
    return chart;
}

export function createDoughnutChart(canvasId, labels, data, colors) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors || COLORS_ARRAY.slice(0, data.length).map(c => alpha(c, 0.8)),
                borderColor: colors || COLORS_ARRAY.slice(0, data.length),
                borderWidth: 2,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16 },
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    askAiQuestion(`What is the impact of ${labels[idx]} which represents ${data[idx]} total in this distribution?`);
                }
            },
        },
    });

    chartInstances[canvasId] = chart;
    return chart;
}

export function destroyAllCharts() {
    Object.keys(chartInstances).forEach(destroyChart);
}

export { COLORS, COLORS_ARRAY, alpha };

import { vessels, crew, DAY_MS, now } from './vessels.js';

let mockIdCounter = 1;
function generateMockId() {
    return `WR${String(mockIdCounter++).padStart(4, '0')}`;
}

// Work-rest violation types from PRD
const VIOLATION_TYPES = [
    'total_violations',
    'rest_division',
    'rest_duration_day',
    'maximum_working_hour',
    'rest_duration_week'
];

export const workRestViolations = [];

// Generate mock data for the last 60 days
const START_TIME = now - (60 * DAY_MS);

// Simulate ~150 work-rest violations across the fleet
for (let i = 0; i < 150; i++) {
    const vessel = vessels[Math.floor(Math.random() * vessels.length)];
    const crewMember = crew[Math.floor(Math.random() * crew.length)];
    const dateTs = START_TIME + Math.random() * (now - START_TIME);
    const dateStr = new Date(dateTs).toISOString().split('T')[0];
    
    // Bias towards certain types
    const rand = Math.random();
    let type;
    if (rand < 0.4) type = 'rest_division'; // 40%
    else if (rand < 0.7) type = 'rest_duration_day'; // 30%
    else if (rand < 0.85) type = 'maximum_working_hour'; // 15%
    else type = 'rest_duration_week'; // 15%

    workRestViolations.push({
        id: generateMockId(),
        vesselId: vessel.id,
        vesselType: vessel.type,
        location: vessel.location,
        crewId: crewMember.id, // Simplified for mock
        rank: crewMember.rank,
        timestamp: new Date(dateTs).toISOString(),
        dateStr: dateStr,
        type: type,
        status: 'Open'
    });
}

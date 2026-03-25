// Synthetic vessel and crew data

export const VESSEL_TYPES = ['Tanker', 'Bulk Carrier', 'Container', 'FPSO'];
export const RANKS = ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Bosun', 'AB Seaman', 'Oiler', 'Cook', 'Electrician', 'Fitter', 'Cadet', 'Motorman'];
export const RANK_GROUPS = { 'Captain': 'Officers', 'Chief Officer': 'Officers', 'Second Officer': 'Officers', 'Third Officer': 'Officers', 'Chief Engineer': 'Engineers', 'Second Engineer': 'Engineers', 'Third Engineer': 'Engineers', 'Bosun': 'Ratings', 'AB Seaman': 'Ratings', 'Oiler': 'Ratings', 'Cook': 'Ratings', 'Electrician': 'Engineers', 'Fitter': 'Ratings', 'Cadet': 'Cadets', 'Motorman': 'Ratings' };
export const LOCATIONS = ['Bridge', 'Engine Room', 'Deck', 'Cargo Hold', 'Galley', 'Accommodation'];

function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

const rand = seededRandom(42);

function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }

const vesselNames = [
    'MV Pacific Guardian', 'MT Ocean Titan', 'MV Northern Star',
    'MT Coral Voyager', 'MV Iron Meridian', 'FPSO Atlas Spirit',
    'MV Eastern Promise', 'MT Gulf Pioneer', 'MV Silver Horizon',
    'FPSO Neptune Rising', 'MV Trade Wind', 'MT Sapphire Dawn'
];

export const vessels = vesselNames.map((name, i) => ({
    id: `V${String(i + 1).padStart(3, '0')}`,
    name,
    type: VESSEL_TYPES[i % VESSEL_TYPES.length],
    status: i < 10 ? 'Active' : 'In Port',
    crewCount: randInt(18, 28),
    region: pick(['Asia Pacific', 'Middle East', 'West Africa', 'North Sea', 'Gulf of Mexico', 'Mediterranean'])
}));

let crewId = 1;
export const crew = [];
vessels.forEach(vessel => {
    const shuffledRanks = [...RANKS].sort(() => rand() - 0.5);
    const count = vessel.crewCount;
    for (let i = 0; i < count; i++) {
        crew.push({
            id: `C${String(crewId++).padStart(4, '0')}`,
            vesselId: vessel.id,
            vesselName: vessel.name,
            rank: shuffledRanks[i % shuffledRanks.length],
            rankGroup: RANK_GROUPS[shuffledRanks[i % shuffledRanks.length]],
            age: randInt(22, 58),
            location: pick(LOCATIONS),
            watchStatus: rand() > 0.3 ? 'On Watch' : 'Off Watch'
        });
    }
});

export function getVesselById(id) { return vessels.find(v => v.id === id); }
export function getCrewByVessel(vesselId) { return crew.filter(c => c.vesselId === vesselId); }

export const totalVessels = vessels.length;
export const activeVessels = vessels.filter(v => v.status === 'Active').length;
export const totalCrew = crew.length;
export const activeWatches = crew.filter(c => c.watchStatus === 'On Watch').length;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const now = new Date('2026-03-23T12:00:00Z').getTime();

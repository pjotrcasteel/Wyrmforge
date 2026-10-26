// Renderer-neutral bridge for existing C# TownCitizen feet positions.
// The current live Town renders plain CSS rectangles, not finalized NPC art.
// This reproduces those existing production placeholders IN THE LAB ONLY so
// their lighting, cast shadows, and authored foreground order can be tested.
export const TOWN_CITIZEN_ART_WIDTH = 16;
export const TOWN_CITIZEN_ART_HEIGHT = 30;
export const TOWN_WELL_FRONT_DEPTH_Y = 572;

export const TOWN_CITIZEN_CSS_COLORS = Object.freeze([
    '#cb9975', // CSS :nth-child(3n+1)
    '#8d9eaa', // CSS :nth-child(3n+2)
    '#c1b28e', // CSS :nth-child(3n)
]);

const ART_SIZE = Object.freeze([1672, 941]);

const validVec3 = (value, label) => {
    if (!Array.isArray(value) || value.length !== 3 || value.some(n => !Number.isFinite(n)))
        throw new TypeError('Invalid ' + label);
};

export function projectTownCitizens(citizens, project, toward, { enabled = true } = {}) {
    if (!Array.isArray(citizens) || typeof project !== 'function' || typeof enabled !== 'boolean')
        throw new TypeError('Invalid NPC projection input');
    validVec3(toward, 'Town camera facing');
    if (Math.abs(Math.hypot(...toward) - 1) > 1e-5) throw new RangeError('Camera facing must be normalized');

    const seen = new Set();
    const visible = citizens.filter(c => {
        if (!c || !Number.isInteger(c.id) || c.id < 0 || seen.has(c.id))
            throw new TypeError('Invalid or duplicate authoritative NPC ID');
        seen.add(c.id);
        if (typeof c.isPresent !== 'boolean') throw new TypeError('Missing C# NPC presence state');
        if (!Array.isArray(c.feet) || c.feet.length !== 2 ||
            !c.feet.every(Number.isFinite) || c.feet[0] < 0 || c.feet[0] > ART_SIZE[0] ||
            c.feet[1] < 0 || c.feet[1] > ART_SIZE[1])
            throw new RangeError('NPC feet are not canonical source-pixel coordinates');
        return c.isPresent;
    });
    if (visible.length > 14) throw new RangeError('Town proof exceeds existing 14-NPC stress contract');
    if (!enabled) return { materials: [], layers: [] };

    const materials = TOWN_CITIZEN_CSS_COLORS.map((color, index) => ({
        id: 'town-css-citizen-color-' + index, color, emission: '#000000', emissionIntensity: 0,
        roughness: .9, metalness: 0, specular: .1, reflection: 'off',
        alphaCutoff: .5, doubleSided: true,
    }));

    const layers = visible.map((citizen, index) => {
        const [x, y] = citizen.feet;
        const center = project(x, y - TOWN_CITIZEN_ART_HEIGHT / 2);
        validVec3(center, 'projected Town citizen position');
        // Proof-only source painting depth ordering: the approved existing
        // well-depth threshold decides whether actor is in front of cutouts.
        // This is NOT the permanent world-space depth system for all facades.
        const foregroundDepth = y >= TOWN_WELL_FRONT_DEPTH_Y ? .15 : .045;
        const position = center.map((coord, i) => coord + foregroundDepth * toward[i]);
        return {
            id: 'town-citizen-' + citizen.id,
            ownerId: 'town-crowd-citizen-' + citizen.id,
            artBounds: [x - TOWN_CITIZEN_ART_WIDTH / 2, y - TOWN_CITIZEN_ART_HEIGHT,
                TOWN_CITIZEN_ART_WIDTH, TOWN_CITIZEN_ART_HEIGHT],
            geometry: 'town-citizen-css-rectangle',
            occluderGeometry: 'town-citizen-css-rectangle',
            material: materials[index % materials.length].id,
            position, rotation: [0, 0, 0], scale: [1, 1, 1],
            castsShadow: true, receivesShadow: true,
        };
    });
    return { materials, layers };
}

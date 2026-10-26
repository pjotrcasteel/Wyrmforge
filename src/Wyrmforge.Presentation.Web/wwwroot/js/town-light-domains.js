// T2: domain ownership for the existing universal GPU LightingEngine.
// The five selected owner screenshots are references, never additive RGB layers.
// No new shaders, image overlays, flags-as-emitters or gameplay progression.
export const TOWN_LIGHT_DOMAINS = Object.freeze([
    'common', 'nexus', 'blacksmith', 'codex', 'hall',
]);
export const TOWN_LIGHT_ISOLATIONS = Object.freeze([
    'combined', 'off', ...TOWN_LIGHT_DOMAINS,
]);
// PassiveSchool in C#: Death = Necromancer, Binding = Summoner.
// The shared school's warm/cold identity follows existing elemental palettes.
export const TOWN_NEXUS_SCHOOL_LIGHTS = Object.freeze({
    none: '#ffffff',
    fire: '#e7763e',
    frost: '#88c4df',
    storm: '#e0c665',
    arcane: '#ae75df',
    death: '#76c98e',
    binding: '#63bcb3',
});

const FIXTURES = Object.freeze([
    // One exclusive owner per fixture; in particular NO public chimney lamp.
    { id: 'gate-arch', domain: 'common', x: 828, y: 207, height: .32,
        color: '#ffcd94', intensity: 2.8, range: 3.4, shadow: true },
    { id: 'square-well', domain: 'common', x: 917, y: 439, height: .21,
        color: '#ffcf96', intensity: 2.9, range: 3.5, shadow: true },
    // Independently registered *real* public lantern anchors, not painted
    // emissive flags or broad fill. Coordinates are in the approved 1672x941
    // canonical Town grid; each adds one bounded point source with no shadows.
    { id: 'gate-west-sconce', domain: 'common', x: 733, y: 208, height: .16,
        color: '#ffbf7f', intensity: 1.6, range: 2.4, shadow: false },
    { id: 'gate-east-sconce', domain: 'common', x: 914, y: 210, height: .16,
        color: '#ffbf7f', intensity: 1.6, range: 2.4, shadow: false },
    { id: 'plaza-upper-west', domain: 'common', x: 549, y: 348, height: .14,
        color: '#ffcc8b', intensity: 1.7, range: 3.2, shadow: false },
    { id: 'plaza-upper-east', domain: 'common', x: 1088, y: 349, height: .14,
        color: '#ffcc8b', intensity: 1.7, range: 3.2, shadow: false },
    { id: 'plaza-mid-west', domain: 'common', x: 558, y: 565, height: .14,
        color: '#ffbf85', intensity: 1.6, range: 3.0, shadow: false },
    { id: 'plaza-mid-east', domain: 'common', x: 1090, y: 558, height: .14,
        color: '#ffbf85', intensity: 1.6, range: 3.0, shadow: false },
    { id: 'plaza-south-west', domain: 'common', x: 625, y: 805, height: .12,
        color: '#ffd09b', intensity: 1.4, range: 3.1, shadow: false },
    { id: 'plaza-south-east', domain: 'common', x: 969, y: 809, height: .12,
        color: '#ffd09b', intensity: 1.4, range: 3.1, shadow: false },
    { id: 'nexus-windows', domain: 'nexus', x: 262, y: 226, height: .25,
        color: '#ffcc93', intensity: 2.8, range: 2.1, shadow: false },
    { id: 'nexus-magic', domain: 'nexus', x: 395, y: 288, height: .32,
        color: '#ffffff', intensity: 3.3, range: 2.4, shadow: false, magic: true },
    { id: 'nexus-shop-lantern', domain: 'nexus', x: 155, y: 301, height: .12,
        color: '#ffca90', intensity: 1.6, range: 1.25, shadow: false },
    { id: 'blacksmith-forge', domain: 'blacksmith', x: 197, y: 635, height: .25,
        color: '#ff8e43', intensity: 4.2, range: 2.4, shadow: false },
    { id: 'blacksmith-chimney', domain: 'blacksmith', x: 136, y: 458, height: .3,
        color: '#ffae5b', intensity: 1.8, range: 1.4, shadow: false },
    { id: 'blacksmith-shop-lantern', domain: 'blacksmith', x: 355, y: 613, height: .13,
        color: '#ffc28c', intensity: 1.6, range: 1.25, shadow: false },
    { id: 'codex-interior', domain: 'codex', x: 1290, y: 266, height: .31,
        color: '#ffd2a0', intensity: 3.3, range: 2.5, shadow: false },
    { id: 'codex-study-lantern', domain: 'codex', x: 1418, y: 189, height: .15,
        color: '#ffcd8f', intensity: 1.55, range: 1.35, shadow: false },
    { id: 'codex-entrance-lantern', domain: 'codex', x: 1164, y: 310, height: .14,
        color: '#ffd09c', intensity: 1.55, range: 1.3, shadow: false },
    { id: 'hall-interior', domain: 'hall', x: 1293, y: 628, height: .34,
        color: '#ffcb94', intensity: 3.3, range: 2.5, shadow: false },
    { id: 'hall-stair-lantern', domain: 'hall', x: 1147, y: 665, height: .13,
        color: '#ffc18a', intensity: 1.55, range: 1.35, shadow: false },
    { id: 'hall-east-lantern', domain: 'hall', x: 1508, y: 693, height: .14,
        color: '#ffd39a', intensity: 1.5, range: 1.3, shadow: false },
]);

function unitVector(v) {
    if (!Array.isArray(v) || v.length !== 3 ||
        v.some(x => !Number.isFinite(x)) || Math.abs(Math.hypot(...v) - 1) > 1e-4)
        throw new TypeError('Town direction must be a unit-length vector');
}
export function createTownDomainFixtures(project, toward) {
    if (typeof project !== 'function') throw new TypeError('Town projection required');
    unitVector(toward);
    return FIXTURES.map(source => {
        const projected = project(source.x, source.y);
        if (!Array.isArray(projected) || projected.length !== 3 ||
            projected.some(x => !Number.isFinite(x))) throw new TypeError('Bad fixture projection');
        const position = projected.map((v, i) => v + toward[i] * source.height);
        return {
            id: 'town-' + source.id, ownerId: 'town-' + source.domain,
            domain: source.domain, magic: source.magic === true,
            type: source.shadow ? 'spot' : 'point',
            enabled: true, color: source.color, intensity: source.intensity,
            position, direction: [0, 0, -1], range: source.range,
            coneAngle: .58, penumbra: .65,
            castsShadow: source.shadow, priority: source.shadow ? 4 : 1,
            artAnchor: [source.x, source.y],
        };
    });
}

const STATE_KEYS = Object.freeze({
    nexus: 'nexusUnlocked', blacksmith: 'forgeUnlocked',
    codex: 'codexUnlocked', hall: 'hallUnlocked',
});
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/**
 * This is the only T2 isolation switch: it changes light descriptors in the
 * already-shared GPU scene, never C# unlocks, saves, CSS or underlying pixels.
 * In combined mode the four building groups obey the C#-owned DOM flags.
 * Explicit single-domain selection is a developer-only inspection override.
 */
export function configureTownLightDomains(fixtures, {
    unlocks = {}, isolation = 'combined', school = 'none',
    strength = .16, neutralMagic = false,
} = {}) {
    if (!Array.isArray(fixtures) || !TOWN_LIGHT_ISOLATIONS.includes(isolation))
        throw new TypeError('Invalid Town light isolation');
    if (!own(TOWN_NEXUS_SCHOOL_LIGHTS, school) ||
        !Number.isFinite(strength) || strength < 0 || strength > 1 ||
        typeof neutralMagic !== 'boolean') throw new TypeError('Invalid authoritative Nexus radiance');
    for (const key of Object.values(STATE_KEYS))
        if (typeof unlocks[key] !== 'boolean') throw new TypeError('Missing C# Town unlock: ' + key);
    const ids = new Set();
    for (const light of fixtures) {
        if (ids.has(light.id)) throw new TypeError('Duplicate Town source: ' + light.id);
        ids.add(light.id);
        if (!TOWN_LIGHT_DOMAINS.includes(light.domain) || light.ownerId !== 'town-' + light.domain)
            throw new TypeError('Unowned Town light: ' + light.id);
        const active = light.domain === 'common' ||
            unlocks[STATE_KEYS[light.domain]];
        light.enabled = isolation === 'combined'
            ? active : isolation !== 'off' && light.domain === isolation;
        if (light.magic) {
            light.color = neutralMagic ? '#ffffff' : TOWN_NEXUS_SCHOOL_LIGHTS[school];
            // Mirrors the C# TownNexusRadiance strength already calculated
            // from real invested points. Conservative scaling avoids bloom.
            light.intensity = Math.min(4.8, 1.6 + 3.2 * strength);
        }
    }
    const chimney = fixtures.find(x => x.id === 'town-blacksmith-chimney');
    if (!chimney || chimney.domain !== 'blacksmith' ||
        chimney.ownerId !== 'town-blacksmith')
        throw new Error('Blacksmith chimney ownership was lost');
    return fixtures;
}

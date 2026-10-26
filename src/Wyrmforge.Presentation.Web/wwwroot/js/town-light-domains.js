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
        color: '#ffcd94', intensity: 1.55, range: 3.4, shadow: true },
    { id: 'square-well', domain: 'common', x: 917, y: 439, height: .21,
        color: '#ffcf96', intensity: 1.35, range: 2.6, shadow: true },
    { id: 'nexus-windows', domain: 'nexus', x: 262, y: 226, height: .25,
        color: '#ffcc93', intensity: .72, range: 1.95, shadow: false },
    { id: 'nexus-magic', domain: 'nexus', x: 395, y: 288, height: .32,
        color: '#ffffff', intensity: .65, range: 2.1, shadow: false, magic: true },
    { id: 'blacksmith-forge', domain: 'blacksmith', x: 197, y: 635, height: .25,
        color: '#ff8e43', intensity: 1.1, range: 2.2, shadow: false },
    { id: 'blacksmith-chimney', domain: 'blacksmith', x: 136, y: 458, height: .3,
        color: '#ffae5b', intensity: .45, range: 1.25, shadow: false },
    { id: 'codex-interior', domain: 'codex', x: 1290, y: 266, height: .31,
        color: '#ffd2a0', intensity: 1.05, range: 2.3, shadow: false },
    { id: 'hall-interior', domain: 'hall', x: 1293, y: 628, height: .34,
        color: '#ffcb94', intensity: 1.15, range: 2.45, shadow: false },
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
            light.intensity = Math.min(1.4, .35 + .85 * strength);
        }
    }
    const chimney = fixtures.find(x => x.id === 'town-blacksmith-chimney');
    if (!chimney || chimney.domain !== 'blacksmith' ||
        chimney.ownerId !== 'town-blacksmith')
        throw new Error('Blacksmith chimney ownership was lost');
    return fixtures;
}

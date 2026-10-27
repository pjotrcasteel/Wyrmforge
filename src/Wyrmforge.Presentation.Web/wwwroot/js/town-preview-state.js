// Pure T2 descriptor policy shared by live Town, GPU lab and regression tests.
// No save writes, progression simulation, scene replacement or renderer here.
import { configureTownLightDomains, TOWN_NEXUS_SCHOOL_LIGHTS } from './town-light-domains.js';
import { compileTownLightingSnapshot } from './town-relightable-scene.js';
import { gradeTownPreviewLighting } from './town-lighting-grade.js';

export function resolveTownPreviewMode(scene, query, clockState) {
    const diagnostic = query.get('townGpuMode');
    if (diagnostic !== null && !['day', 'night', 'zero'].includes(diagnostic))
        throw new TypeError('Invalid Town diagnostic mode');
    const mode = diagnostic ?? scene.dataset.townTime ?? clockState?.effective ?? 'night';
    if (!['day', 'night', 'zero'].includes(mode)) throw new TypeError('Missing device-local Town time');
    return mode;
}

export function townDomainSnapshot(manifest, {
    unlocks, isolation = 'combined', school = 'none', strength = .16,
    neutralMagic = false, lamps = true, mode = 'night', exposure = 1,
} = {}) {
    if (typeof lamps !== 'boolean' || !Number.isFinite(exposure) || exposure < .25 || exposure > 2)
        throw new TypeError('Invalid Town diagnostic calibration');
    const scene = structuredClone(manifest);
    configureTownLightDomains(scene.fixtures, { unlocks, isolation, school, strength, neutralMagic });
    if (!lamps) for (const light of scene.fixtures) light.enabled = false;
    const effectiveMode = isolation === 'off' ? 'zero' : mode;
    const enabled = new Set(scene.fixtures.filter(light => light.enabled).map(light => light.domain));
    // Diffuse geometry is INVARIANT under all light/unlock changes. Only actual
    // emissive apertures are suppressed; a closed shop still receives street light.
    scene.layers = scene.layers.filter(layer => !layer.emissionKind ||
        effectiveMode === 'night' && enabled.has(layer.domain));
    const magic = scene.materials.find(m => m.id === 'town-emissive-nexus-magic-material');
    if (magic) {
        magic.emission = neutralMagic ? '#ffffff' : TOWN_NEXUS_SCHOOL_LIGHTS[school];
        magic.emissionIntensity = Math.min(2.4, .5 + 1.6 * strength);
    }
    const snapshot = gradeTownPreviewLighting(compileTownLightingSnapshot(scene, {
        state: {}, mode: effectiveMode, localHour: 12, time: 0,
    }), effectiveMode);
    snapshot.environment.exposure = exposure;
    // All night inspections keep the same small calibrated environment. This
    // reveals unpowered masonry without enabling any building emitter. The
    // hand-authored scene alpha keeps negative sky space strictly black; off
    // and zero still disable ambient, every local source and all emission.
    return { snapshot, effectiveMode };
}

/** Device time updates never reset an explicit temporary lighting inspector. */
export function applyTownPreviewEnvironment(state, options) {
    const valid = value => ['day','night','zero'].includes(value);
    if (Object.hasOwn(options,'environmentMode')) {
        if (!valid(options.environmentMode)) throw new TypeError('Invalid authoritative Town environment');
        state.environmentMode=options.environmentMode;
    }
    if (Object.hasOwn(options,'mode')) {
        if (options.mode!==null && !valid(options.mode)) throw new TypeError('Invalid diagnostic Town environment');
        state.diagnosticMode=options.mode;
    }
    state.mode=state.diagnosticMode ?? state.environmentMode;
    return state.mode;
}

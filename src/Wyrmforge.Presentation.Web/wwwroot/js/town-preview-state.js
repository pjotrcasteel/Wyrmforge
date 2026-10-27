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
    // Isolation compares ONLY that source group: no broad ambient contribution.
    // Combined Gothic night retains a conservative small diagnostic fill.
    if (effectiveMode === 'night' && isolation !== 'combined') snapshot.environment.ambient = 0;
    return { snapshot, effectiveMode };
}

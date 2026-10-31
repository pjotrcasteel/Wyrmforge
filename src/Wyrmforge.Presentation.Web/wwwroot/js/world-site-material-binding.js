// AR4-A1: presentation-only mapping from the authoritative C# AR3 elevation preview.
// WF32 owns source pixels; this module never decides geography, passability or lighting.
export const WORLD_SITE_MATERIALS = Object.freeze([
    Object.freeze({ id: 0, name: 'Soil', weight: 'soilWeight', sourceFamily: 'soil', fallback: '#585b52', sourceGate: 'P1i' }),
    Object.freeze({ id: 1, name: 'Grass', weight: 'grassWeight', sourceFamily: 'grass', fallback: '#4f6b50', sourceGate: 'P1i' }),
    Object.freeze({ id: 2, name: 'Road', weight: 'roadWeight', sourceFamily: 'soil', fallback: '#9e8b69', sourceGate: 'trail-fallback' }),
    Object.freeze({ id: 3, name: 'Mud', weight: 'mudWeight', sourceFamily: 'mud', fallback: '#4f595c', sourceGate: 'P1i' }),
    Object.freeze({ id: 4, name: 'Rock', weight: 'rockWeight', sourceFamily: null, fallback: '#50606c', sourceGate: 'P1j-rock-review' }),
    Object.freeze({ id: 5, name: 'ShallowWater', weight: 'waterWeight', sourceFamily: null, fallback: '#4b707c', sourceGate: 'water-not-approved' }),
    Object.freeze({ id: 6, name: 'GlacialIce', weight: 'iceWeight', sourceFamily: null, fallback: '#abbeca', sourceGate: 'ice-not-approved' }),
]);

const sourceByName = new Map(WORLD_SITE_MATERIALS.map(spec => [spec.name, spec]));
const clamp01 = value => Math.max(0, Math.min(1, value));

/** Match the numeric or string JSON enum sent by the C# WorldSiteSurfaceId contract. */
export function worldSiteMaterialName(value) {
    if (Number.isInteger(value)) return WORLD_SITE_MATERIALS[value]?.name ?? null;
    return typeof value === 'string' && sourceByName.has(value) ? value : null;
}

/** Retain all seven C# semantic weights, with a safe diagnostic fallback for damaged input. */
export function normalizeWorldSiteMaterialWeights(sample) {
    if (!sample || typeof sample !== 'object') return null;
    const amounts = WORLD_SITE_MATERIALS.map(({ weight }) =>
        Number.isFinite(sample[weight]) ? Math.max(0, sample[weight]) : 0);
    const total = amounts.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) {
        const dominant = worldSiteMaterialName(sample.material) ?? 'Soil';
        return Object.freeze(Object.fromEntries(WORLD_SITE_MATERIALS.map(spec =>
            [spec.name, spec.name === dominant ? 1 : 0])));
    }
    return Object.freeze(Object.fromEntries(WORLD_SITE_MATERIALS.map((spec, index) =>
        [spec.name, amounts[index] / total])));
}

/** A site-space (0..1) bilinear *visual* sample of immutable AR3 preview weights.
 * Physics always samples the actual C# field, never this preview/interpolation.
 */
export function sampleWorldSiteMaterialWeights(preview, siteX, siteY) {
    const { columns, rows, samples } = preview ?? {};
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2 ||
        columns > 65 || rows > 97 || !Array.isArray(samples) || samples.length !== columns * rows ||
        !Number.isFinite(siteX) || !Number.isFinite(siteY)) return null;

    const x = clamp01(siteX) * (columns - 1);
    const y = clamp01(siteY) * (rows - 1);
    const left = Math.floor(x);
    const top = Math.floor(y);
    const right = Math.min(columns - 1, left + 1);
    const bottom = Math.min(rows - 1, top + 1);
    const fractionX = x - left;
    const fractionY = y - top;
    const corners = [
        [left, top, (1 - fractionX) * (1 - fractionY)],
        [right, top, fractionX * (1 - fractionY)],
        [left, bottom, (1 - fractionX) * fractionY],
        [right, bottom, fractionX * fractionY],
    ];
    const output = Object.fromEntries(WORLD_SITE_MATERIALS.map(spec => [spec.name, 0]));
    for (const [col, row, influence] of corners) {
        if (influence === 0) continue;
        const weights = normalizeWorldSiteMaterialWeights(samples[row * columns + col]);
        if (!weights) return null;
        for (const spec of WORLD_SITE_MATERIALS) output[spec.name] += weights[spec.name] * influence;
    }
    const total = Object.values(output).reduce((sum, value) => sum + value, 0);
    if (!(total > 0)) return null;
    for (const spec of WORLD_SITE_MATERIALS) output[spec.name] /= total;
    return Object.freeze(output);
}

/** Stable across camera frames; invalidates once the immutable site/asset generation changes. */
export function worldSiteMaterialCacheKey(geography, width, height, assetRevision = 'none') {
    const preview = geography?.landscape?.elevation;
    if (!preview || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
        return null;
    return [
        geography.siteId ?? 'unknown', geography.worldSeed ?? 'unknown',
        preview.columns, preview.rows, geography.landscape.kind ?? '',
        width, height, assetRevision,
    ].join(':');
}

/** Source handoff explicitly distinguishes authored families from interim diagnostic fallbacks. */
export function worldSiteSourceBindings(geography) {
    const monastery = geography?.landscape?.kind === 'mountain-monastery';
    return WORLD_SITE_MATERIALS.map(spec => {
        const road = spec.name === 'Road';
        const sourceFamily = road && monastery ? 'flagstone' : spec.sourceFamily;
        const sourceGate = road && monastery ? 'P1i-whole-stone-boundary' : spec.sourceGate;
        return Object.freeze({
            id: spec.id, material: spec.name, weight: spec.weight,
            sourceFamily, sourceGate, fallback: spec.fallback,
            // This is *art-source* approval, not proof that runtime texture files exist.
            // Stone boundaries and 2.5D rocks are not yet approved for live site rendering.
            sourceApproved: ['Soil', 'Grass', 'Mud'].includes(spec.name),
        });
    });
}

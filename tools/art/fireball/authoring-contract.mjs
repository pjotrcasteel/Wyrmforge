// Authoring/review metadata only. NOT a spell renderer or a lighting backend.
// Actual damage, location and durations belong to Wyrmforge's C# simulation.
export const FIREBALL_MUTATIONS = Object.freeze({
    meteorHeart: 1,
    detonation: 2,
    scorchedEarth: 4,
    cinderNeedle: 8,
});
export const FIREBALL_PHASES = Object.freeze(['cast', 'flight', 'impact', 'aftermath']);
export const FIREBALL_MATERIAL_CHANNELS = Object.freeze(['albedo', 'emissive', 'normal', 'height', 'cutout']);

export function requiredFireballRoles(mask) {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new RangeError('Only four playable Fireball mutations');
    const meteor = Boolean(mask & FIREBALL_MUTATIONS.meteorHeart);
    const needle = Boolean(mask & FIREBALL_MUTATIONS.cinderNeedle);
    // These are AUTHORED art slots, never automatically synthesized silhouettes.
    // The combined Meteor+Needle shape needs its own reviewed physical body.
    const silhouette = meteor && needle ? 'core-meteor-needle' :
        meteor ? 'core-meteor' : needle ? 'core-needle' : 'core-original';
    return {
        cast: ['staff-fireball'],
        flight: [silhouette],
        impact: ['impact-original', ...(mask & FIREBALL_MUTATIONS.detonation ? ['impact-detonation-fragments'] : [])],
        aftermath: mask & FIREBALL_MUTATIONS.scorchedEarth ? ['material-char-and-flame'] : [],
    };
}

export function allFireballRecipes() {
    return Array.from({ length: 16 }, (_, mask) => ({ mask, required: requiredFireballRoles(mask) }));
}

function sourceIsWithinFireballArt(path) {
    return typeof path === 'string' &&
        path.startsWith('art/source/spells/fireball/') &&
        !path.split('/').includes('..') && !path.includes('\\');
}

function validateFrames(source, path) {
    if (!sourceIsWithinFireballArt(source?.sheet) || !/\.(?:aseprite|ase|blend)$/.test(source.sheet))
        throw new Error(`${path}: missing editable source-sheet provenance`);
    if (!Number.isInteger(source.frames) || source.frames < 2 || source.frames > 256)
        throw new Error(`${path}: must have real authored animation frames`);
    if (!Array.isArray(source.anchor) || source.anchor.length !== 2 ||
        !source.anchor.every(Number.isFinite)) throw new Error(`${path}: invalid stable anchor`);
    if (!(source.worldSize > 0) || !Number.isFinite(source.worldSize))
        throw new Error(`${path}: missing game-world size`);
    for (const channel of FIREBALL_MATERIAL_CHANNELS)
        if (!sourceIsWithinFireballArt(source.channels?.[channel]) || !source.channels[channel].endsWith('.png'))
            throw new Error(`${path}: required ${channel} authoring channel is missing`);
    return true;
}

/** Pure release gate; NEVER creates an image, effect or approved state. */
export function validateFireballArtManifest(manifest, exists) {
    if (manifest?.schemaVersion !== 1 || manifest.spell !== 'FireBolt')
        throw new Error('Unsupported Fireball art manifest');
    if (manifest.status !== 'owner-approved')
        throw new Error('Art has not received owner visual approval');
    if (typeof exists !== 'function') throw new TypeError('An asset lookup is required');
    const assets = manifest.assets;
    if (!assets || typeof assets !== 'object') throw new Error('No authored assets');
    const roles = new Set(allFireballRecipes().flatMap(x => FIREBALL_PHASES.flatMap(p => x.required[p])));
    for (const role of roles) {
        const asset = assets[role];
        validateFrames(asset, role);
        for (const source of [asset.sheet, ...Object.values(asset.channels)])
            if (!exists(source)) throw new Error(`${role}: source missing from repo: ${source}`);
        if (asset.reviewStatus !== 'approved') throw new Error(`${role}: not owner-reviewed`);
    }
    return { validatedRoles: roles.size, combinations: 16 };
}

/**
 * Correlate REAL immutable C# snapshots, without assuming that cast, impact,
 * and ground always exist. Do not create an impact or burning zone in JS.
 */
export function inspectFireballLineage(snapshot) {
    const shots = (snapshot?.projectiles ?? []).filter(x => x.spell === 1);
    const impacts = (snapshot?.elementalImpacts ?? []).filter(x => x.spell === 1);
    const ground = snapshot?.burningGrounds ?? [];
    const physical = [...shots, ...impacts, ...ground];
    const ids = new Map();
    for (const event of physical) {
        if (!Number.isInteger(event.fireballSourceId) || event.fireballSourceId <= 0)
            throw new Error('A physical Fireball event has no source identity');
        const mask = event.fireballMutationMask;
        requiredFireballRoles(mask);
        if (ids.has(event.fireballSourceId) && ids.get(event.fireballSourceId) !== mask)
            throw new Error('One physical Fireball has conflicting mutation identities');
        ids.set(event.fireballSourceId, mask);
    }
    for (const event of ground)
        if (event.remainingSeconds <= 0 || event.radius <= 0)
            throw new Error('Expired/invalid ground cannot become an authored burn visual');

    const cast = snapshot?.castMotion?.spell === 1 ? snapshot.castMotion : null;
    if (cast) requiredFireballRoles(cast.fireballMutationMask);
    return {
        cast: cast ? { mutationMask: cast.fireballMutationMask, sourceId: null } : null,
        flight: shots.map(x => ({ sourceId: x.fireballSourceId, mutationMask: x.fireballMutationMask })),
        impact: impacts.map(x => ({
            sourceId: x.fireballSourceId, mutationMask: x.fireballMutationMask,
            actualSplashRadius: x.splashRadius ?? 0,
        })),
        aftermath: ground.map(x => ({
            sourceId: x.fireballSourceId, mutationMask: x.fireballMutationMask,
            actualRadius: x.radius, remainingSeconds: x.remainingSeconds,
        })),
    };
}

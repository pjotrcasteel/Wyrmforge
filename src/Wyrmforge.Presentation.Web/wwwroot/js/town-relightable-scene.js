import { environmentProfile, validateSnapshot } from './lighting/registry.js';

// Contract for the 1672x941 approved Town paintings. Art pixels are reference
// coordinates only: the authored world transforms, never navigation colliders,
// determine lighting and shadow geometry.
export const TOWN_ART_SIZE = Object.freeze([1672, 941]);

const number = (value, name, min = -Infinity) => {
    if (!Number.isFinite(value) || value < min) throw new TypeError(`Invalid ${name}`);
};
const point = (x, y) => {
    number(x, 'art x', 0); number(y, 'art y', 0);
    if (x > TOWN_ART_SIZE[0] || y > TOWN_ART_SIZE[1]) throw new RangeError('Town art point outside canonical canvas');
};

export function townArtToUv(x, y) {
    point(x, y);
    return [x / TOWN_ART_SIZE[0], 1 - y / TOWN_ART_SIZE[1]];
}

export function townUvToArt(u, v) {
    number(u, 'u', 0); number(v, 'v', 0);
    if (u > 1 || v > 1) throw new RangeError('Town UV outside image');
    return [u * TOWN_ART_SIZE[0], (1 - v) * TOWN_ART_SIZE[1]];
}

function enabledWhen(when, state) {
    if (when === undefined) return true;
    if (!when || typeof when !== 'object' || Array.isArray(when) ||
        typeof when.key !== 'string' || typeof when.equals !== 'boolean' ||
        Object.keys(when).some(key => key !== 'key' && key !== 'equals')) {
        throw new TypeError('Town state predicate must contain key and boolean equals');
    }
    if (typeof state[when.key] !== 'boolean') throw new TypeError(`Missing authoritative town state ${when.key}`);
    return state[when.key] === when.equals;
}

function validateLayer(layer) {
    if (typeof layer.id !== 'string' || !layer.id ||
        typeof layer.ownerId !== 'string' || !layer.ownerId ||
        typeof layer.geometry !== 'string' || !layer.geometry ||
        typeof layer.material !== 'string' || !layer.material ||
        !Array.isArray(layer.artBounds) || layer.artBounds.length !== 4) {
        throw new TypeError('Incomplete authored Town layer');
    }
    const [x, y, w, h] = layer.artBounds;
    point(x, y); number(w, 'layer width', 0.001); number(h, 'layer height', 0.001);
    if (x + w > TOWN_ART_SIZE[0] || y + h > TOWN_ART_SIZE[1]) throw new RangeError('Town layer exceeds painting');
    // The exact optical projection must be calibrated by the authoring pipeline.
    // An artBounds rectangle is never secretly used as occluder geometry.
    if (layer.castsShadow && !layer.occluderGeometry) {
        throw new TypeError(`Layer ${layer.id} needs authored occluder geometry`);
    }
    if (!Array.isArray(layer.position) || !Array.isArray(layer.rotation) || !Array.isArray(layer.scale)) {
        throw new TypeError('Town layer needs authored GPU world transform');
    }
}

function validateFixture(fixture) {
    if (!fixture || typeof fixture.id !== 'string' || !fixture.id ||
        !Array.isArray(fixture.artAnchor) || fixture.artAnchor.length !== 2) {
        throw new TypeError('Town fixture requires ID and registered pixel anchor');
    }
    point(...fixture.artAnchor);
}

/**
 * Stage a renderer-neutral G1/G3 lighting snapshot from authored 2.5D Town
 * layers. Inputs come from a new, approved relightable atlas/material manifest.
 * This function never samples the already-lit Town panorama or synthesizes
 * normals, depth, emission, or caster geometry from its RGB pixels.
 *
 * state is supplied by authoritative C# progression, not inferred in JS.
 * No production scene is modified until the separate G5 acceptance cutover.
 */
export function compileTownLightingSnapshot(manifest, { state = {}, mode = 'night', localHour = 12, time = 0 } = {}) {
    if (!manifest || manifest.version !== 1 ||
        !Array.isArray(manifest.artSize) ||
        manifest.artSize[0] !== TOWN_ART_SIZE[0] || manifest.artSize[1] !== TOWN_ART_SIZE[1] ||
        !Array.isArray(manifest.materials) || !Array.isArray(manifest.layers) ||
        !Array.isArray(manifest.fixtures)) throw new TypeError('Invalid 2.5D Town manifest');
    number(time, 'Town snapshot time', 0);
    const environment = environmentProfile(mode, localHour);
    const objects = manifest.layers.flatMap(layer => {
        validateLayer(layer);
        if (!enabledWhen(layer.when, state)) return [];
        const { id, ownerId, geometry, occluderGeometry, material, position, rotation, scale } = layer;
        return [{ id, ownerId, geometry, occluderGeometry, material, position, rotation, scale,
            castsShadow: layer.castsShadow ?? false, receivesLight: true,
            receivesShadow: layer.receivesShadow ?? true }];
    });
    const lights = manifest.fixtures.map(fixture => {
        validateFixture(fixture);
        const { when, artAnchor, ...descriptor } = fixture;
        const unlocked = enabledWhen(when, state); // Validate C# state even in zero-light inspection.
        return { ...descriptor, enabled: mode !== 'zero' && unlocked && fixture.enabled !== false };
    });
    // The G1/G3 GPU engine validates every material, object and light without
    // any Town-specific shader, hardcoded building type or alternate light pass.
    return validateSnapshot({
        version: 1, time, materials: manifest.materials, objects, lights, environment,
    });
}

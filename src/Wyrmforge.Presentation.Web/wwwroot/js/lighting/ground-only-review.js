// Wet Forest V2 / milestone GROUND-1.
// Ground only, existing owner-approved quilted albedo, shared G1 LightingEngine.
// No arena scene imports, props, legacy trees, procedural colour overlays or gameplay.
import * as T from './vendor/three.module.js';
import { LightingEngine } from './engine.js';
import { environmentProfile } from './registry.js';
import {
    GROUND_ATLAS_URL, CELL, MATERIALS,
    buildGroundQuiltAtlas, drawReferenceGroundBoard,
} from '../arena-materials.js';

export const GROUND_REVIEW_COLUMNS = 24;
export const GROUND_REVIEW_ROWS = 24;
export const GROUND_REVIEW_SEED = 1441;
// Show a continuous playable-scale ground field, not a tiny isolated diamond. Camera/GPU engine unchanged.
const METRES = 24;
const allowedMaterials = Object.freeze({
    grass: { index: 0, roughness: .94, specular: .12 },
    mud: { index: 1, roughness: .78, specular: .30 },
    dirt: { index: 3, roughness: .96, specular: .10 },
    marsh: { index: 5, roughness: .72, specular: .36 },
});
const scenes = new WeakMap();

export function singleMaterialGroundBoard(key, columns = GROUND_REVIEW_COLUMNS, rows = GROUND_REVIEW_ROWS) {
    if (!(key in allowedMaterials) || !Number.isInteger(columns) || !Number.isInteger(rows) ||
        columns < 1 || rows < 1 || columns * rows > 65536)
        throw new RangeError('Invalid one-material ground review board');
    return new Uint8Array(columns * rows).fill(allowedMaterials[key].index);
}

// Descriptors are exactly the portable G1 contract; light remains the sole world visibility source.
// Roughness/specular are provisional knobs for the art review, NOT painted surface normals.
export function groundReviewSnapshot(key = 'grass', lighting = 'fire', position = .5) {
    if (!(key in allowedMaterials) || !['fire', 'moon', 'neutral', 'zero'].includes(lighting) ||
        !Number.isFinite(position) || position < 0 || position > 1)
        throw new RangeError('Invalid ground-only lighting request');
    const config = allowedMaterials[key];
    const neutral = lighting === 'neutral';
    const zero = lighting === 'zero';
    const environment = zero ? environmentProfile('zero') :
        neutral ? { ambient: .22, color: '#ffffff', exposure: 1, emission: false } :
        environmentProfile('night');
    const light = (id, type, location, color, intensity, direction = [0, 0, -1]) => ({
        id, ownerId: id, type, enabled: true, position: location, direction,
        color, intensity, range: 12, coneAngle: .6, penumbra: .2, castsShadow: false, priority: 1,
    });
    const lights = zero ? [] : neutral ?
        [light('studio-inspection', 'directional', [-2, -3, 8], '#ffffff', 1, [-.3, .3, -1])] :
        lighting === 'moon' ?
            [light('moon', 'directional', [-2, -3, 8], '#9ab8df', .36, [-.3, .3, -1])] :
            [
                light('moon', 'directional', [-2, -3, 8], '#9ab8df', .055, [-.3, .3, -1]),
                light('fireball', 'point', [-2.5 + 5 * position, -1, 2.1], '#ff8b48', 27),
            ];
    return {
        version: 1, time: 0, lights, environment,
        materials: [{
            id: 'wet-forest-ground', color: '#ffffff', albedo: 'wet-forest-'+key,
            roughness: config.roughness, metalness: 0, specular: config.specular,
            reflection: 'direct', emission: '#000000', emissionIntensity: 0,
            alphaCutoff: 0, doubleSided: false,
        }],
        objects: [{
            id: 'ground', ownerId: 'wet-forest-ground-review', geometry: 'ground-plane',
            material: 'wet-forest-ground', position: [0, 0, 0], rotation: [0, 0, 0],
            scale: [METRES, METRES, 1], castsShadow: false, receivesShadow: true, receivesLight: true,
        }],
    };
}

async function prepareGround(engine, canvas) {
    const source = new Image();
    source.src = GROUND_ATLAS_URL;
    await source.decode();
    const atlas = buildGroundQuiltAtlas(source, GROUND_REVIEW_SEED, undefined, false);
    if (!atlas) throw new Error('Approved ground atlas could not be quilted');
    for (const [key, config] of Object.entries(allowedMaterials)) {
        const board = singleMaterialGroundBoard(key);
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = GROUND_REVIEW_COLUMNS * CELL;
        textureCanvas.height = GROUND_REVIEW_ROWS * CELL;
        const ctx = textureCanvas.getContext('2d');
        if (!ctx || !drawReferenceGroundBoard(ctx, board, atlas,
            GROUND_REVIEW_COLUMNS, GROUND_REVIEW_ROWS, GROUND_REVIEW_SEED))
            throw new Error('Failed to compose ground-only albedo: '+key);
        // Source albedo is uploaded unlit into G1; the shared shader supplies illumination.
        engine.registerTexture('wet-forest-'+key, new T.CanvasTexture(textureCanvas));
    }
}

export async function initializeGroundReview(canvas) {
    if (scenes.has(canvas)) return;
    const engine = new LightingEngine(canvas);
    const state = { engine, alive: true, material: 'grass', lighting: 'fire', position: .5 };
    scenes.set(canvas, state);
    try {
        engine.registerGeometry('ground-plane', new T.PlaneGeometry(1, 1));
        await prepareGround(engine, canvas);
        if (!state.alive) return;
        engine.setCamera([0, 0, 0], 4.6);
        state.resizer = new ResizeObserver(() => { if (state.alive) engine.render(); });
        state.resizer.observe(canvas);
        configureGroundReview(canvas, {});
        canvas.dataset.ready = 'true';
    } catch (error) {
        engine.dispose();
        scenes.delete(canvas);
        canvas.dataset.error = error.message;
        throw error;
    }
}

export function configureGroundReview(canvas, options = {}) {
    const state = scenes.get(canvas);
    if (!state?.alive) return;
    const material = options.material ?? state.material;
    const lighting = options.lighting ?? state.lighting;
    const position = options.position ?? state.position;
    const snapshot = groundReviewSnapshot(material, lighting, position);
    state.material = material; state.lighting = lighting; state.position = position;
    state.engine.apply(snapshot);
    state.engine.setDebugView('lit');
    state.engine.render();
    canvas.dataset.material = material;
    canvas.dataset.lighting = lighting;
    canvas.dataset.objects = String(snapshot.objects.length);
    canvas.dataset.lights = String(snapshot.lights.length);
}

export function groundReviewPixels(canvas) {
    const engine = scenes.get(canvas)?.engine;
    if (!engine) throw new Error('Ground review is not initialized');
    engine.render();
    return [...engine.pixels()];
}

export function disposeGroundReview(canvas) {
    const state = scenes.get(canvas);
    if (!state) return;
    state.alive = false;
    state.resizer?.disconnect();
    state.engine.dispose();
    scenes.delete(canvas);
}

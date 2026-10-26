// Playable Wet Forest art adapter. Original 900px PR #340 candidate pixels only.
// The real C# snapshot remains the sole authority for trails, gates, props,
// combat collision, pickups and water semantics. No new lighting pipeline.
import { CELL as ATLAS_CELL } from './arena-materials.js';
import { bakeSourceBackedThreeMaterialGround, sourceBackedUrl, SOURCE_BACKED_VARIANTS } from './wet-forest-three-material-kit.js';

const SOURCE_CELL = 12; // canonical createWetForestTilePlan pixel grid
const MATERIAL_ID = Object.freeze({
    loam: 0, moss: 0, mud: 1, puddle: 1,
    road: 3, clearing: 3, leafbed: 3,
});
const ready = new Map();
const pending = new Map();
const failed = new Map();
let generation = 0;

export function wetForestVariantForSeed(seed) {
    return Number.isInteger(seed) ? 1 + ((seed >>> 0) % SOURCE_BACKED_VARIANTS.length) : null;
}

function decode(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            if (image.width !== 900 || image.height !== 900) {
                reject(new Error('Unexpected archived Wet Forest candidate dimensions'));
                return;
            }
            resolve(image);
        };
        image.onerror = () => reject(new Error('Could not decode existing Wet Forest candidate art'));
        image.src = url;
    });
}

// Lazy: only fetch three materials for the current C# world seed. Retain at
// most two banks (~18.5MB decoded) on mobile. A missing asset keeps the
// previous LIVE Hunt terrain as the fallback, never a blank/black arena.
export function preloadLiveWetForestMaterials(seed) {
    const variant = wetForestVariantForSeed(seed);
    if (!variant || ready.has(variant) || pending.has(variant) || failed.has(variant)
        || typeof Image === 'undefined') return;
    const urls = [0, 1, 3].map(id => sourceBackedUrl(id, variant));
    if (urls.some(url => !url)) return;
    const task = Promise.all(urls.map(decode))
        .then(([grass, mud, earth]) => {
            ready.delete(variant);
            ready.set(variant, { 0: grass, 1: mud, 3: earth });
            while (ready.size > 2) ready.delete(ready.keys().next().value);
            generation++;
        })
        .catch(error => {
            failed.set(variant, error.message);
            console.warn('WyrmForge: using existing Wet Forest fallback after artwork load failure.', error);
        })
        .finally(() => pending.delete(variant));
    pending.set(variant, task);
}

export function liveWetForestArtworkGeneration() {
    return generation;
}

export function liveWetForestMaterialDiagnostics(seed) {
    const variant = wetForestVariantForSeed(seed);
    return {
        variant, generation,
        status: ready.has(variant) ? 'source-backed' : failed.has(variant) ? 'fallback-error'
            : pending.has(variant) ? 'loading' : 'fallback-unrequested',
        error: failed.get(variant) ?? null,
        source: 'PR340-original-candidates',
    };
}

/** Map live 12px C# terrain annotations to the shared 16px visual material
 * sampler. The road, puddle and clearing *locations* come from the EXISTING
 * live Wet Forest classifier, not the independent GPU review mock recipe.
 * This only selects imagery and never changes the source tile objects.
 */
export function liveWetForestMaterialPlan(tiles, seed, width, height) {
    if (!Array.isArray(tiles) || !Number.isInteger(seed)
        || !Number.isInteger(width) || !Number.isInteger(height)
        || width < ATLAS_CELL || height < ATLAS_CELL || width > 8192 || height > 8192) return null;
    const sourceColumns = Math.ceil(width / SOURCE_CELL);
    const sourceRows = Math.ceil(height / SOURCE_CELL);
    if (tiles.length !== sourceColumns * sourceRows) return null;
    const columns = Math.ceil(width / ATLAS_CELL);
    const rows = Math.ceil(height / ATLAS_CELL);
    if (columns * rows > 65536) return null;
    const board = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const px = Math.min(width - 1, x * ATLAS_CELL + ATLAS_CELL / 2);
        const py = Math.min(height - 1, y * ATLAS_CELL + ATLAS_CELL / 2);
        const id = Math.floor(py / SOURCE_CELL) * sourceColumns + Math.floor(px / SOURCE_CELL);
        const kind = tiles[id]?.material;
        if (!Object.hasOwn(MATERIAL_ID, kind)) return null;
        board[y * columns + x] = MATERIAL_ID[kind];
    }
    return { seed, width, height, board, columns, rows };
}

/** Called ONLY during the existing once-per-terrain-texture bake, never every
 * combat frame. Paints source pixels directly into the current 2D floor cache.
 * The existing ambient/night rendering and actor layers still run afterward.
 */
export function drawLiveWetForestMaterialBase(ctx, tiles, seed, width, height) {
    const variant = wetForestVariantForSeed(seed);
    const images = ready.get(variant);
    if (!images) {
        preloadLiveWetForestMaterials(seed);
        return false;
    }
    const plan = liveWetForestMaterialPlan(tiles, seed, width, height);
    if (!ctx || !plan) return false;
    // Reuse the already-tested organic PR #361 source-only compositor without
    // allocating another world-sized offscreen canvas.
    const target = { width, height, getContext: () => ctx };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    try {
        return Boolean(bakeSourceBackedThreeMaterialGround(plan, images, seed, () => target, 'organic'));
    } finally {
        ctx.restore();
    }
}

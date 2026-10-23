// Opt-in Arena V2 L0/L1 art review. No references to old tree/camp/road assets.
// Source tree files are selected locally: PR #307's candidate PNGs remain unapproved.
// Lighting is separate from the ground recipe; normal Hunts NEVER load this module.
import {
    CELL, GROUND_ATLAS_URL, buildGroundQuiltAtlas, drawReferenceGroundBoard, drawGroundMaterialTransitions,
} from './arena-materials.js';
import { groundFoundationBoard, FOUNDATION_COLUMNS, FOUNDATION_ROWS,
    FOUNDATION_WIDTH, FOUNDATION_HEIGHT } from './arena-ground-foundation.js';
import { resolveSceneLighting, contactShadowPlan, drawContactShadow, drawSceneLighting,
    sortSpritesByFoot } from './arena-scene-lighting.js';

const states = new WeakMap();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const world = Object.freeze({ width: FOUNDATION_WIDTH, height: FOUNDATION_HEIGHT });
const slots = Object.freeze({
    oak: { x: 415, y: 755, height: 235, trunk: 45 },
    elm: { x: 555, y: 820, height: 215, trunk: 37 },
});

function render(state) {
    if (!state.alive) return;
    const canvas = state.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio), pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    state.camera.x = clamp(state.camera.x, 0, Math.max(0, world.width - width));
    state.camera.y = clamp(state.camera.y, 0, Math.max(0, world.height - height));
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.fillStyle = '#17221e';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));
    if (state.ground) ctx.drawImage(state.ground, 0, 0);

    const sprites = sortSpritesByFoot(Object.entries(slots).filter(([id]) => state.images[id])
        .map(([id, slot]) => ({ id, foot: { x: slot.x, y: slot.y }, ...slot })));
    for (const sprite of sprites) {
        const plan = contactShadowPlan(sprite.foot, sprite.trunk, state.light);
        drawContactShadow(ctx, plan);
        const image = state.images[sprite.id];
        // The original PNG has a transparent frame. Use actual alpha bounds
        // so the visible roots, not the PNG rectangle, touch the foot pivot.
        const crop = image.crop;
        const drawHeight = sprite.height;
        const drawWidth = drawHeight * crop.width / crop.height;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image.image, crop.x, crop.y, crop.width, crop.height,
            sprite.foot.x - drawWidth / 2, sprite.foot.y - drawHeight,
            drawWidth, drawHeight);
        ctx.imageSmoothingEnabled = false;
    }
    if (state.ground) drawSceneLighting(ctx, world, state.light);
    ctx.restore();

    canvas.dataset.lightingReady = String(Boolean(state.ground));
    canvas.dataset.lightingEnabled = String(state.light.enabled);
    canvas.dataset.lightingObjects = String(sprites.length);
    canvas.dataset.lightingShadows = String(state.light.enabled && state.light.shadows ? sprites.length : 0);
    canvas.dataset.lightingApprovedGround = String(Boolean(state.ground));
    canvas.dataset.lightingPhysicsObjects = '0';
    canvas.dataset.lightingLegacyAssets = '0';
    canvas.dataset.lightingSeed = String(state.seed);
}

function schedule(state) {
    if (!state.alive || state.pending) return;
    state.pending = true;
    requestAnimationFrame(() => { state.pending = false; render(state); });
}

function buildGround(state) {
    if (!state.alive || !state.source) return;
    const atlas = buildGroundQuiltAtlas(state.source, state.seed, undefined, false);
    const board = groundFoundationBoard(state.seed, 'trails');
    if (!atlas || board.length !== FOUNDATION_COLUMNS * FOUNDATION_ROWS) return;
    const canvas = document.createElement('canvas');
    canvas.width = FOUNDATION_WIDTH;
    canvas.height = FOUNDATION_HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx || !drawReferenceGroundBoard(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, state.seed))
        return;
    drawGroundMaterialTransitions(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, state.seed);
    state.ground = canvas;
    schedule(state);
}

async function loadGround(state) {
    const source = new Image();
    source.src = GROUND_ATLAS_URL;
    try {
        await source.decode();
        if (!state.alive) return;
        state.source = source;
        buildGround(state);
        state.canvas.dataset.lightingError = '';
    } catch {
        if (state.alive) state.canvas.dataset.lightingError = 'approved-ground-load';
    }
}

export function initializeArenaLighting(canvas, seed = 1204, options = {}) {
    if (states.has(canvas)) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const state = {
        canvas, alive: true, seed: seed | 0, light: resolveSceneLighting(options),
        camera: { x: clamp(480 - width / 2, 0, Math.max(0, world.width - width)),
            y: clamp(770 - height / 2, 0, Math.max(0, world.height - height)) },
        source: null, ground: null, images: {}, pointer: null, pending: false, listeners: [],
    };
    states.set(canvas, state);
    const add = (event, handler, opts) => {
        canvas.addEventListener(event, handler, opts);
        state.listeners.push(() => canvas.removeEventListener(event, handler, opts));
    };
    add('pointerdown', e => {
        if (state.pointer) return;
        e.preventDefault();
        state.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, ...state.camera };
        canvas.setPointerCapture?.(e.pointerId);
    });
    add('pointermove', e => {
        const p = state.pointer;
        if (!p || p.id !== e.pointerId) return;
        e.preventDefault();
        state.camera.x = p.x - (e.clientX - p.x);
        state.camera.y = p.y - (e.clientY - p.y);
        schedule(state);
    });
    const end = e => { if (state.pointer?.id === e.pointerId) state.pointer = null; };
    add('pointerup', end);
    add('pointercancel', end);
    const prevent = e => { if (e.cancelable) e.preventDefault(); };
    add('touchstart', prevent, { passive: false });
    add('touchmove', prevent, { passive: false });
    const resize = () => schedule(state);
    window.addEventListener('resize', resize);
    state.listeners.push(() => window.removeEventListener('resize', resize));
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        state.listeners.push(() => observer.disconnect());
    }
    schedule(state);
    void loadGround(state);
}

export function configureArenaLighting(canvas, seed, options = {}) {
    const state = states.get(canvas);
    if (!state) return;
    const nextSeed = seed | 0;
    const nextLight = resolveSceneLighting(options);
    if (state.seed !== nextSeed) {
        state.seed = nextSeed;
        state.ground = null;
        if (state.source) buildGround(state);
    }
    state.light = nextLight;
    schedule(state);
}

function findAlphaBounds(image) {
    const sample = document.createElement('canvas');
    sample.width = image.naturalWidth;
    sample.height = image.naturalHeight;
    const ctx = sample.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
    let minX = sample.width, minY = sample.height, maxX = -1, maxY = -1;
    for (let y = 0; y < sample.height; y++)
        for (let x = 0; x < sample.width; x++) {
            if (data[(y * sample.width + x) * 4 + 3] <= 8) continue;
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
    return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// Never upload user art or persist object URLs. Previews are selected from the
// candidate render artifact and discarded on refresh.
export async function loadArenaLightingSprite(canvas, input, slot) {
    const state = states.get(canvas);
    const file = input?.files?.[0];
    if (!state || !(slot in slots) || !file || !['image/png', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024) return false;
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!state.alive) return false;
        const crop = findAlphaBounds(image);
        if (!crop) return false;
        state.images[slot] = { image, crop };
        schedule(state);
        return true;
    } catch {
        return false;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function readArenaLightingDiagnostics(canvas) {
    const s = states.get(canvas);
    if (!s) return null;
    return { ready: Boolean(s.ground), seed: s.seed, light: s.light,
        sprites: Object.keys(s.images).sort(), physicsObjects: 0, legacyAssets: 0,
        camera: { ...s.camera }, world: { ...world }, groundRecipe: 'approved-forest-trails' };
}

export function disposeArenaLighting(canvas) {
    const s = states.get(canvas);
    if (!s) return;
    s.alive = false;
    for (const remove of s.listeners) remove();
    s.images = {}; s.ground = null; s.source = null;
    states.delete(canvas);
}

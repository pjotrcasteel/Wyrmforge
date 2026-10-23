// Arena Rebuild phase 2: ground-only organic trails and clearings.
// Still NO arena environment, old tree assets, props, roads, player,
// navigation, monsters, shadows or collision; no new per-frame effects.
// This is a throwaway Canvas viewer for the approved material paintings;
// native iOS/Android gameplay will consume portable recipe data instead.
import {
    CELL, GROUND_ATLAS_URL, buildGroundQuiltAtlas, naturalGroundPreview,
    drawReferenceGroundBoard, drawGroundMaterialTransitions,
} from './arena-materials.js';
import { composeForestTrailGround } from './arena-ground-trails.js';

export const FOUNDATION_COLUMNS = 60;
export const FOUNDATION_ROWS = 96;
export const FOUNDATION_WIDTH = FOUNDATION_COLUMNS * CELL;
export const FOUNDATION_HEIGHT = FOUNDATION_ROWS * CELL;
const states = new WeakMap();
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

export function groundFoundationBoard(seed, mode = 'trails', columns = FOUNDATION_COLUMNS, rows = FOUNDATION_ROWS) {
    if (!Number.isInteger(columns) || !Number.isInteger(rows) ||
        columns < 1 || rows < 1 || columns * rows > 65536) return new Uint8Array();
    // Boolean inputs are retained for existing Step-1 tests and integrations.
    if (mode === false || mode === 'grass') return new Uint8Array(columns * rows);
    const natural = naturalGroundPreview(seed, columns, rows);
    if (mode === 'trails') return composeForestTrailGround(natural, seed, columns, rows)?.board ?? natural;
    return natural; // Unmodified Step-1 reference, available for A/B review.
}

export function clampGroundCamera(camera, viewportWidth, viewportHeight) {
    return {
        x: clamp(camera.x, 0, Math.max(0, FOUNDATION_WIDTH - viewportWidth)),
        y: clamp(camera.y, 0, Math.max(0, FOUNDATION_HEIGHT - viewportHeight)),
    };
}

function render(state) {
    if (!state.alive) return;
    const { canvas } = state;
    const viewport = canvas.getBoundingClientRect();
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#202a22';
    ctx.fillRect(0, 0, width, height);
    const view = clampGroundCamera(state.camera, width, height);
    state.camera = view;
    if (state.scene) ctx.drawImage(state.scene, -Math.round(view.x), -Math.round(view.y));
    canvas.dataset.foundationReady = String(Boolean(state.scene));
    canvas.dataset.foundationMode = state.mode;
    canvas.dataset.foundationTrails = state.mode === 'trails' ? '2' : '0';
    canvas.dataset.foundationSeed = String(state.seed);
    canvas.dataset.foundationAssets = '0';
    canvas.dataset.foundationCollision = '0';
    canvas.dataset.foundationRoads = '0';
}

function requestRender(state) {
    if (state.scheduled || !state.alive) return;
    state.scheduled = true;
    requestAnimationFrame(() => { state.scheduled = false; render(state); });
}

function buildScene(state) {
    if (!state.alive || !state.source) return;
    const board = groundFoundationBoard(state.seed, state.mode);
    if (!state.atlas || state.atlasSeed !== state.seed) {
        state.atlas = buildGroundQuiltAtlas(state.source, state.seed, undefined, false);
        state.atlasSeed = state.seed;
    }
    const atlas = state.atlas;
    if (!atlas) { state.canvas.dataset.foundationError = 'atlas'; return; }
    const scene = document.createElement('canvas');
    scene.width = FOUNDATION_WIDTH;
    scene.height = FOUNDATION_HEIGHT;
    const ctx = scene.getContext('2d', { alpha: false });
    if (!ctx) { state.canvas.dataset.foundationError = 'canvas'; return; }
    ctx.imageSmoothingEnabled = false;
    if (!drawReferenceGroundBoard(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, state.seed)) {
        state.canvas.dataset.foundationError = 'paint';
        return;
    }
    drawGroundMaterialTransitions(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, state.seed);
    state.scene = scene;
    state.canvas.dataset.foundationError = '';
    requestRender(state);
}

async function loadApprovedSource(state) {
    const source = new Image();
    source.src = GROUND_ATLAS_URL;
    try {
        await source.decode();
        if (!state.alive) return;
        state.source = source;
        buildScene(state);
    } catch (error) {
        if (state.alive) {
            state.canvas.dataset.foundationError = 'image';
            console.error('Approved foundation image could not load', error);
        }
    }
}

export function initializeGroundFoundation(canvas, seed = 1204, mode = 'trails') {
    if (states.has(canvas)) return;
    const state = {
        alive: true, canvas, seed: seed | 0, mode, source: null,
        scene: null, atlas: null, atlasSeed: null, scheduled: false,
        camera: { x: 0, y: 0 }, pointer: null,
        listeners: [],
    };
    states.set(canvas, state);
    const add = (event, callback, options) => {
        canvas.addEventListener(event, callback, options);
        state.listeners.push(() => canvas.removeEventListener(event, callback, options));
    };
    add('pointerdown', event => {
        if (state.pointer) return;
        event.preventDefault();
        state.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, camera: { ...state.camera } };
        canvas.setPointerCapture?.(event.pointerId);
    });
    add('pointermove', event => {
        const p = state.pointer;
        if (!p || event.pointerId !== p.id) return;
        event.preventDefault();
        const width = canvas.getBoundingClientRect().width;
        const height = canvas.getBoundingClientRect().height;
        state.camera = clampGroundCamera({
            x: p.camera.x - (event.clientX - p.x),
            y: p.camera.y - (event.clientY - p.y),
        }, width, height);
        requestRender(state);
    });
    const release = event => { if (state.pointer?.id === event.pointerId) state.pointer = null; };
    add('pointerup', release);
    add('pointercancel', release);
    const preventScroll = event => { if (event.cancelable) event.preventDefault(); };
    add('touchstart', preventScroll, { passive: false });
    add('touchmove', preventScroll, { passive: false });
    state.camera = clampGroundCamera({
        x: (FOUNDATION_WIDTH - canvas.getBoundingClientRect().width) / 2,
        y: (FOUNDATION_HEIGHT - canvas.getBoundingClientRect().height) / 2,
    }, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
    requestRender(state);
    void loadApprovedSource(state);
}

export function configureGroundFoundation(canvas, seed, mode = 'trails') {
    const state = states.get(canvas);
    if (!state) return;
    const nextSeed = seed | 0;
    const nextMode = ['trails', 'natural', 'grass'].includes(mode) ? mode : 'natural';
    if (state.seed === nextSeed && state.mode === nextMode) return;
    state.seed = nextSeed;
    state.mode = nextMode;
    state.scene = null;
    requestRender(state);
    if (state.source) buildScene(state);
}

export function readGroundFoundationDiagnostics(canvas) {
    const s = states.get(canvas);
    if (!s) return null;
    return {
        seed: s.seed, mode: s.mode, trailBranches: s.mode === 'trails' ? 2 : 0,
        ready: Boolean(s.scene), worldWidth: FOUNDATION_WIDTH, worldHeight: FOUNDATION_HEIGHT,
        assets: 0, obstacles: 0, mobs: 0, roads: 0, props: 0,
        camera: { ...s.camera },
    };
}

export function disposeGroundFoundation(canvas) {
    const s = states.get(canvas);
    if (!s) return;
    s.alive = false;
    s.listeners.forEach(remove => remove());
    s.scene = null;
    s.atlas = null;
    s.source = null;
    states.delete(canvas);
}

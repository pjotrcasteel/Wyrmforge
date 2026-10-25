// Opt-in Arena V2 L0/L1 art review. No references to old tree/camp/road assets.
// Source tree files are selected locally: PR #307's candidate PNGs remain unapproved.
// Lighting is separate from the ground recipe; normal Hunts NEVER load this module.
import {
    CELL, GROUND_ATLAS_URL, buildGroundQuiltAtlas, drawReferenceGroundBoard, drawGroundMaterialTransitions,
} from './arena-materials.js';
import { groundFoundationBoard, FOUNDATION_COLUMNS, FOUNDATION_ROWS,
    FOUNDATION_WIDTH, FOUNDATION_HEIGHT } from './arena-ground-foundation.js';
import { resolveSceneLighting, contactShadowPlan, projectedShadowPlan, drawContactShadow, drawSceneLighting,
    sortSpritesByFoot, spriteFootPlacement } from './arena-scene-lighting.js';
import { gothicNightPlan, drawGothicNight } from './arena-night-lighting.js';
import { calibrationEmitters, drawCalibrationEmitterCores } from './arena-lighting-calibration.js';
import { litWetMaterialPlan, drawLitWetMaterial, drawLocalNightMist } from './arena-l3-material-atmosphere.js';

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
    // World ground -> all cast shadows -> all root contact -> sorted sprites.
    // Shadowing each sprite in its own drawing pass could obscure the branches
    // of a farther tree. Neither shadow pass changes the ground material atlas.
    for (const sprite of sprites)
        drawContactShadow(ctx, projectedShadowPlan(sprite.foot, sprite.trunk, sprite.height, state.light));
    for (const sprite of sprites)
        drawContactShadow(ctx, contactShadowPlan(sprite.foot, sprite.trunk, state.light));
    for (const sprite of sprites) {
        const image = state.images[sprite.id];
        // Preserve original alpha and register visible root baseline in world
        // coordinates rather than using the full transparent Blender canvas.
        const crop = image.crop;
        const placement = spriteFootPlacement(sprite.foot, crop, sprite.height);
        if (!placement) continue;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image.image, crop.x, crop.y, crop.width, crop.height,
            placement.x, placement.y, placement.width, placement.height);
        ctx.imageSmoothingEnabled = false;
    }
    // The lab uses the same night mask as live Hunts, but its mid-air Fireball
    // and optional torch are explicit TEST SOURCES, never real gameplay props.
    const flightProgress = state.animateFireball
        ? ((performance.now() - state.animationStart) / 4800) % 1
        : state.fireballProgress;
    const sources = calibrationEmitters({
        fireball: state.demoFireball, torch: state.demoTorch, progress: flightProgress,
    });
    if (state.ground && state.light.enabled) {
        const view = { x: state.camera.x, y: state.camera.y, width, height };
        drawGothicNight(ctx, gothicNightPlan(null, sources, view,
            { darkness: state.darkness }), state.nightMask);
        if (state.wetResponse)
            drawLitWetMaterial(ctx, litWetMaterialPlan(state.board, FOUNDATION_COLUMNS,
                FOUNDATION_ROWS, sources, state.seed));
        if (state.mist) drawLocalNightMist(ctx, sources);
        drawCalibrationEmitterCores(ctx, sources);
    }
    // Technical calibration overlay; never enabled in the normal renderer.
    if (state.showAnchors) {
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.font = '11px system-ui';
        for (const sprite of sprites) {
            ctx.strokeStyle = '#ebce91';
            ctx.beginPath();
            ctx.arc(sprite.foot.x, sprite.foot.y, sprite.trunk * .5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sprite.foot.x - 9, sprite.foot.y);
            ctx.lineTo(sprite.foot.x + 9, sprite.foot.y);
            ctx.moveTo(sprite.foot.x, sprite.foot.y - 9);
            ctx.lineTo(sprite.foot.x, sprite.foot.y + 9);
            ctx.stroke();
            ctx.fillStyle = '#f8efdc';
            ctx.fillText(sprite.id + ' · root anchor', sprite.foot.x + 12, sprite.foot.y + 14);
        }
        ctx.restore();
    }
    ctx.restore();

    canvas.dataset.lightingReady = String(Boolean(state.ground));
    canvas.dataset.lightingEnabled = String(state.light.enabled);
    canvas.dataset.gothicNight = String(state.light.enabled);
    canvas.dataset.fireballCalibration = String(state.demoFireball);
    canvas.dataset.torchCalibration = String(state.demoTorch);
    canvas.dataset.fireballProgress = flightProgress.toFixed(3);
    canvas.dataset.wetResponse = String(state.wetResponse);
    canvas.dataset.mist = String(state.mist);
    canvas.dataset.lightingObjects = String(sprites.length);
    canvas.dataset.lightingShadows = String(state.light.enabled && state.light.shadows ? sprites.length : 0);
    canvas.dataset.lightingApprovedGround = String(Boolean(state.ground));
    canvas.dataset.lightingAnchors = String(state.showAnchors);
    canvas.dataset.lightingPhysicsObjects = '0';
    canvas.dataset.lightingLegacyAssets = '0';
    canvas.dataset.lightingSeed = String(state.seed);
    if (state.alive && state.animateFireball && state.demoFireball && state.light.enabled &&
        !document.hidden) schedule(state);
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
    state.board = board;
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
        showAnchors: options.showAnchors === true,
        nightMask: document.createElement('canvas'),
        darkness: Number.isFinite(options.darkness) ? options.darkness : .90,
        demoFireball: options.demoFireball !== false,
        demoTorch: options.demoTorch === true,
        animateFireball: options.animateFireball !== false,
        fireballProgress: Number.isFinite(options.fireballProgress) ? options.fireballProgress : .5,
        animationStart: performance.now(),
        wetResponse: options.wetResponse !== false,
        mist: options.mist !== false, board: null,
        camera: { x: clamp(480 - width / 2, 0, Math.max(0, world.width - width)),
            y: clamp(695 - height / 2, 0, Math.max(0, world.height - height)) },
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
    state.showAnchors = options.showAnchors === true;
    state.darkness = Number.isFinite(options.darkness) ? options.darkness : .90;
    state.demoFireball = options.demoFireball !== false;
    state.demoTorch = options.demoTorch === true;
    state.animateFireball = options.animateFireball !== false;
    state.fireballProgress = Number.isFinite(options.fireballProgress) ? options.fireballProgress : .5;
    state.wetResponse = options.wetResponse !== false;
    state.mist = options.mist !== false;
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
    if (maxX < 0) return null;

    // Radial roots can extend 10-30 source pixels below the opaque collar.
    // Detect the lowest *solid center-trunk row* rather than trusting alpha
    // bbox bottom. This is per original PNG and does not repaint source art.
    const center = Math.round((minX + maxX) * .5);
    const halfWidth = Math.min(32, Math.max(9, Math.floor((maxX - minX) / 12)));
    let solidBase = maxY;
    for (let y = maxY; y >= minY; y--) {
        let opaque = 0, samples = 0;
        for (let x = center - halfWidth; x <= center + halfWidth; x++) {
            if (x < 0 || x >= sample.width) continue;
            samples++;
            if (data[(y * sample.width + x) * 4 + 3] >= 192) opaque++;
        }
        if (samples > 0 && opaque / samples >= .67) {
            solidBase = y;
            break;
        }
    }
    return { x: minX, y: minY, width: maxX - minX + 1,
        height: maxY - minY + 1, footInsetPixels: maxY - solidBase };
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
        demoFireball: s.demoFireball, demoTorch: s.demoTorch, wetResponse: s.wetResponse, mist: s.mist,
        sprites: Object.keys(s.images).sort(), showAnchors: s.showAnchors, physicsObjects: 0, legacyAssets: 0,
        camera: { ...s.camera }, world: { ...world }, groundRecipe: 'approved-forest-trails' };
}

export function disposeArenaLighting(canvas) {
    const s = states.get(canvas);
    if (!s) return;
    s.alive = false;
    for (const remove of s.listeners) remove();
    s.images = {}; s.ground = null; s.source = null; s.board = null; s.nightMask = null;
    states.delete(canvas);
}

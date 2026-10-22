// WyrmForge Arena Lab. All geometry, props, collisions, destruction and loot
// are authoritative C# data. This module only handles viewport/input/drawing.
import { drawArenaEnvironment, getArenaCloisterElevations, drawArenaCloisterElevation } from './arena-environment.js';
import { drawMage, updateMageWalk } from './arena-mage.js';
import { drawEnemyPixelArt, createEnemyMotionState, updateEnemyMotions, enemyFacing } from './arena-enemy-art.js';
import { drawWetForestActorContact, appendWetForestFootprint, drawWetForestFootprints } from './arena-wet-forest-dressing.js';
import { loadArt } from './art-atlas.js';
import { GROUND_ATLAS_URL, buildGroundQuiltAtlas } from './arena-materials.js';
import { preloadHollowSprites, hollowSpritesReady, createHollowState, updateHollowSprites, drawHollowEnemy } from './hollow-sprites.js';
import { ashlingSprites } from './ashling-sprites.js';
import { resolveArenaCamera } from './arena-camera.js';

const labs = new WeakMap();
let approvedSource = null;
let approvedSourcePromise = null;
let approvedAtlas = null;
let approvedAtlasSeed = null;

// Lazy opt-in art: do not allocate the ~11MB approved quilt atlas in normal
// Hunts or on an Arena Lab screen that never enables the preview.
function requestApprovedGround() {
    if (approvedSource || approvedSourcePromise) return;
    const image = new Image();
    image.src = GROUND_ATLAS_URL;
    approvedSourcePromise = image.decode().then(() => { approvedSource = image; })
        .catch(error => { console.warn('Approved ground preview unavailable:', error); })
        .finally(() => { approvedSourcePromise = null; });
}
function previewGroundAtlas(state, frame) {
    if (!state.options.approvedGround || frame?.environment?.habitat !== 'WetForest' ||
        frame?.environment?.generatorPreview !== true) return null;
    if (!approvedSource) { requestApprovedGround(); return null; }
    if (!approvedAtlas || approvedAtlasSeed !== frame.seed) {
        approvedAtlas = buildGroundQuiltAtlas(approvedSource, frame.seed);
        approvedAtlasSeed = frame.seed;
    }
    return approvedAtlas;
}
const limit = (value, low, high) => Math.max(low, Math.min(high, value));

export function worldClickPoint(x, y, camera) {
    return { x: limit(x + camera.x, 0, camera.width), y: limit(y + camera.y, 0, camera.height) };
}
export function arenaLabInput(x, y) {
    const magnitude = Math.hypot(x, y);
    return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
}

// Dragging the world in Inspect/Pan mode never changes the C# player position.
export function panArenaLabCamera(camera, deltaX, deltaY, viewWidth, viewHeight) {
    return {
        x: limit(camera.x - deltaX, 0, Math.max(0, camera.width - viewWidth)),
        y: limit(camera.y - deltaY, 0, Math.max(0, camera.height - viewHeight)),
        width: camera.width, height: camera.height,
    };
}

function cameraForState(state, width, height) {
    const frame = state.frame;
    const follow = resolveArenaCamera({ width: frame.worldWidth, height: frame.worldHeight },
        { x: frame.x, y: frame.y }, width, height);
    if (!state.freeCamera) return follow;
    return { ...follow, x: limit(state.freeCamera.x, 0, Math.max(0, frame.worldWidth - width)),
        y: limit(state.freeCamera.y, 0, Math.max(0, frame.worldHeight - height)) };
}

export async function initializeArenaLab(canvas, dotnet) {
    if (labs.has(canvas)) return;
    const state = {
        canvas, dotnet, active: true, options: { tool: 'walk', collision: false, mobs: true, approvedGround: false },
        frame: null, keys: new Set(), pointer: null, freeCamera: null, keyboard: { x: 0, y: 0 }, clock: 0,
        busy: false, last: performance.now(), walk: { facing: 'S' }, enemyMotion: createEnemyMotionState(),
        hollow: createHollowState(), ashling: ashlingSprites.createState(),
        lastPlayer: null, tracks: [], previousActors: new Map(), previousSeed: null, raf: 0,
        width: 0, height: 0, dpr: 1, events: [],
    };
    labs.set(canvas, state);
    state.events.push(bind(canvas, 'pointerdown', event => handlePointerDown(state, event)));
    state.events.push(bind(canvas, 'pointermove', event => handlePointerMove(state, event)));
    state.events.push(bind(canvas, 'pointerup', event => handlePointerUp(state, event)));
    state.events.push(bind(canvas, 'pointercancel', event => handlePointerUp(state, event)));
    // iOS Safari and embedded iPhone webviews may scroll the document before
    // pointer capture takes effect. Own touch gestures only inside the canvas.
    const blockPageScroll = event => { if (event.cancelable) event.preventDefault(); };
    state.events.push(bind(canvas, 'touchstart', blockPageScroll, { passive: false }));
    state.events.push(bind(canvas, 'touchmove', blockPageScroll, { passive: false }));
    state.events.push(bind(window, 'keydown', event => key(state, event, true)));
    state.events.push(bind(window, 'keyup', event => key(state, event, false)));
    state.events.push(bind(window, 'blur', () => { state.keys.clear(); state.pointer = null; }));
    state.events.push(bind(document, 'visibilitychange', () => {
        state.last = performance.now(); if (document.hidden) state.keys.clear();
    }));
    // The real Hunt uses these eight-direction rigs. The Lab previously showed tiny atlas
    // placeholders, making its Hollow and Ashling unrepresentative of the actual game.
    // Do not stall the first frame on the large animation sheets: retain atlas fallbacks.
    loadArt('art/');
    preloadHollowSprites();
    ashlingSprites.preload();
    state.raf = requestAnimationFrame(now => tick(state, now));
}

function bind(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    return () => target.removeEventListener(name, listener, options);
}
export function configureArenaLab(canvas, tool, collision, mobs, approvedGround = false) {
    const state = labs.get(canvas);
    if (!state) return;
    const oldTool = state.options.tool;
    state.options = { tool, collision: Boolean(collision), mobs: Boolean(mobs), approvedGround: Boolean(approvedGround) };
    if (state.options.approvedGround) requestApprovedGround();
    state.pointer = null;
    if (tool === 'walk' && oldTool !== 'walk') state.freeCamera = null;
}
export function readArenaLabDiagnostics(canvas) {
    const state = labs.get(canvas);
    if (!state) return null;
    const frame = state.frame;
    return { active: state.active, seed: frame?.seed ?? null, stage: frame?.stage ?? null,
        props: frame?.environment?.props?.length ?? 0, barriers: frame?.environment?.barriers?.length ?? 0,
        site: frame?.environment?.wetForest?.site ?? null, biome: frame?.environment?.biome ?? null,
        player: frame ? { x: frame.x, y: frame.y } : null,
        world: frame ? { width: frame.worldWidth, height: frame.worldHeight } : null,
        enemyKinds: frame?.mobs?.map(mob => mob.kind) ?? [],
        enemyArt: { hollow: hollowSpritesReady(), ashling: ashlingSprites.ready() },
        enemyAnimation: { hollow: [...state.hollow.entities.values()].map(p => ({ clip: p.clip, frame: p.frame, direction: p.direction })),
            ashling: ashlingSprites.diagnostics(state.ashling).entities.map(p => ({ clip: p.clip, frame: p.frame, direction: p.direction })) },
        collisionVisible: state.options.collision, tool: state.options.tool,
        approvedGroundRequested: state.options.approvedGround,
        approvedGroundReady: Boolean(approvedSource && approvedAtlas) };
}
export function disposeArenaLab(canvas) {
    const state = labs.get(canvas);
    if (!state) return;
    state.active = false;
    cancelAnimationFrame(state.raf);
    state.events.forEach(unbind => unbind());
    labs.delete(canvas);
}
function key(state, event, pressed) {
    if (event.target?.matches?.('input, select, textarea, button')) return;
    const name = event.key.toLowerCase();
    if (!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(name)) return;
    event.preventDefault();
    if (pressed) state.keys.add(name);
    else state.keys.delete(name);
}
function keyboardMotion(state) {
    const k = state.keys;
    return arenaLabInput(Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft')),
        Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup')));
}
function handlePointerDown(state, event) {
    if (!state.frame) return;
    event.preventDefault();
    // Focusing a canvas on touch causes Safari to scroll it into view.
    // Keep keyboard focus for desktop without ever moving the document.
    if (event.pointerType !== 'touch') state.canvas.focus({ preventScroll: true });
    if (state.options.tool === 'hit' || state.options.tool === 'blast') {
        strike(state, event.clientX, event.clientY, state.options.tool === 'blast');
        return;
    }
    if (state.pointer) return;
    const pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
        mode: state.options.tool, x: 0, y: 0 };
    if (state.options.tool === 'pan') {
        const rect = state.canvas.getBoundingClientRect();
        const camera = cameraForState(state, rect.width, rect.height);
        pointer.cameraStart = camera;
        state.freeCamera = { x: camera.x, y: camera.y };
    }
    state.pointer = pointer;
    state.canvas.setPointerCapture?.(event.pointerId);
}
function handlePointerMove(state, event) {
    if (!state.pointer || event.pointerId !== state.pointer.id) return;
    if (event.cancelable) event.preventDefault();
    const pointer = state.pointer;
    if (pointer.mode === 'pan') {
        const rect = state.canvas.getBoundingClientRect();
        state.freeCamera = panArenaLabCamera(pointer.cameraStart,
            event.clientX - pointer.startX, event.clientY - pointer.startY, rect.width, rect.height);
        return;
    }
    const result = arenaLabInput((event.clientX - pointer.startX) / 55, (event.clientY - pointer.startY) / 55);
    pointer.x = result.x; pointer.y = result.y;
}
function handlePointerUp(state, event) {
    if (state.pointer?.id === event.pointerId) state.pointer = null;
}
async function strike(state, clientX, clientY, blast) {
    if (state.busy || !state.frame || !state.active) return;
    const rect = state.canvas.getBoundingClientRect();
    const frame = state.frame;
    const camera = cameraForState(state, rect.width, rect.height);
    const hit = worldClickPoint(clientX - rect.left, clientY - rect.top, camera);
    state.busy = true;
    try { state.frame = await state.dotnet.invokeMethodAsync('Strike', hit.x, hit.y, blast); }
    finally { state.busy = false; }
}
async function tick(state, now) {
    if (!state.active) return;
    const delta = limit((now - state.last) / 1000, 0, .05);
    state.last = now;
    state.clock += delta;
    if (!state.busy) {
        state.busy = true;
        const movement = state.options.tool !== 'walk' ? { x: 0, y: 0 } :
            state.pointer?.mode === 'walk' ? arenaLabInput(state.pointer.x, state.pointer.y) : keyboardMotion(state);
        try { state.frame = await state.dotnet.invokeMethodAsync('Frame', delta, movement.x, movement.y); }
        catch (error) { console.error('Arena Lab simulation failed', error); state.active = false; }
        finally { state.busy = false; }
    }
    if (state.active) {
        draw(state);
        state.raf = requestAnimationFrame(next => tick(state, next));
    }
}
function draw(state) {
    const { canvas, frame } = state;
    if (!frame) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    const ww = frame.worldWidth, wh = frame.worldHeight;
    const sceneKey = [frame.seed, frame.stage, frame.environment?.habitat].join(':');
    if (state.previousSeed !== sceneKey) state.freeCamera = null;
    const camera = cameraForState(state, width, height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    const groundAtlas = previewGroundAtlas(state, frame);
    drawArenaEnvironment(ctx, frame.environment, ww, wh, state.clock, groundAtlas);
    if (frame.environment?.generatorPreview && frame.environment?.habitat === 'WetForest')
        drawWetForestFootprints(ctx, state.tracks, state.clock);
    // The same atlas and distance-driven gait as live Hunts: actors no longer walk on a timer.
    const forest = frame.environment?.generatorPreview && frame.environment?.habitat === 'WetForest';
    if (state.previousSeed !== sceneKey) {
        state.tracks.length = 0;
        state.previousActors.clear();
        state.enemyMotion = createEnemyMotionState();
        state.hollow = createHollowState();
        state.ashling = ashlingSprites.createState();
        state.previousSeed = sceneKey;
    }
    if (forest) {
        for (const actor of [...frame.mobs.map(mob => ({ id: mob.id, x: mob.x, y: mob.y, kind: mob.kind })),
            { id: 0, x: frame.x, y: frame.y, kind: -1 }]) {
            const previous = state.previousActors.get(actor.id);
            if (previous && Math.hypot(actor.x - previous.x, actor.y - previous.y) >= 1.2)
                appendWetForestFootprint(state.tracks, actor.id, actor.x, actor.y, state.clock, actor.kind);
            state.previousActors.set(actor.id, { x: actor.x, y: actor.y });
        }
    }
    const enemyPoses = updateEnemyMotions(state.enemyMotion, frame.mobs.map(mob => ({
        entityId: mob.id, kind: mob.kind, x: mob.x, y: mob.y,
    })), state.clock);
    // Only C# supplies world positions. These two are non-attacking navigation probes,
    // so no synthetic hit/contact, death or attack is fed to the gameplay animation rigs.
    // Their walk gait and all eight facings follow the actual C# displacement.
    const labEnemies = frame.mobs.map(mob => ({ entityId: mob.id, kind: mob.kind, x: mob.x, y: mob.y,
        radius: mob.kind === 0 ? 11 : 8 }));
    const animationSnapshot = { enemies: labEnemies, player: null, deathBursts: [], paused: false, ended: false };
    updateHollowSprites(state.hollow, animationSnapshot, state.clock);
    ashlingSprites.update(state.ashling, animationSnapshot, state.clock);
    const moved = state.lastPlayer ? Math.hypot(frame.x - state.lastPlayer.x, frame.y - state.lastPlayer.y) > .1 : false;
    state.lastPlayer = { x: frame.x, y: frame.y };
    const layers = [
        ...getArenaCloisterElevations(frame.environment, ww, wh, state.clock, groundAtlas),
        ...frame.mobs.map(mob => ({ kind: 'mob', depth: mob.y + 10, mob })),
        { kind: 'mage', depth: frame.y + 12 },
    ].sort((a, b) => a.depth - b.depth);
    for (const layer of layers) {
        if (layer.kind === 'masonry') drawArenaCloisterElevation(ctx, layer);
        else if (layer.kind === 'mob') {
            const mob = layer.mob;
            const phase = enemyPoses.get(mob.id) ?? 0;
            const actor = labEnemies.find(enemy => enemy.entityId === mob.id);
            if (forest) drawWetForestActorContact(ctx, mob.x, mob.y, actor.radius, phase > 0, phase);
            // Identical approved source frames and animation controllers to actual Hunts.
            // Native atlas remains a safe fallback while one or both rigged bundles load.
            const actual = mob.kind === 0 ? drawHollowEnemy(ctx, actor, state.hollow) :
                mob.kind === 2 ? ashlingSprites.drawEnemy(ctx, actor, state.ashling) : false;
            if (!actual) drawEnemyPixelArt(ctx, { ...actor, radius: actor.radius, healthFraction: 1 },
                null, phase, enemyFacing(state.enemyMotion, mob.id));
        } else {
            const player = { x: frame.x, y: frame.y, radius: 12 };
            if (forest) drawWetForestActorContact(ctx, player.x, player.y, 12, moved);
            const walk = updateMageWalk(state.walk, player, state.clock);
            drawMage(ctx, player, null, false, false, null, walk, state.walk.facing);
        }
    }
    if (state.options.collision) drawCollision(ctx, frame.environment, ww, wh);
    ctx.restore();
    drawMinimap(ctx, frame, width, height);
}
function drawCollision(ctx, env, width, height) {
    ctx.save();
    ctx.strokeStyle = '#ed995e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const barrier of env.barriers || []) {
        if (!barrier.open) ctx.strokeRect(barrier.x * width, barrier.y * height, barrier.width * width, barrier.height * height);
    }
    ctx.strokeStyle = '#d8bb66';
    for (const prop of env.props || []) {
        ctx.beginPath();
        ctx.arc(prop.x * width, prop.y * height, prop.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}
function drawMinimap(ctx, frame, width, height) {
    const scale = Math.min(1, height / 660);
    const w = 75 * scale, h = 122 * scale, x = width - w - 12, y = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(8,11,14,.85)';
    ctx.strokeStyle = '#746756';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    for (const prop of frame.environment.props || []) {
        ctx.fillStyle = '#a48b61';
        ctx.fillRect(x + prop.x * w - 1, y + prop.y * h - 1, 2, 2);
    }
    ctx.fillStyle = '#f6c46c';
    ctx.beginPath(); ctx.arc(x + frame.x / frame.worldWidth * w, y + frame.y / frame.worldHeight * h, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

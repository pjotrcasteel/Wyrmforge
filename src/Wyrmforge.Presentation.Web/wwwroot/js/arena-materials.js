// Arena Materials Lab 01: only ground. No layout, heightmap, props or gameplay.
// Material samples deliberately use simple horizontal strips, not a proposed arena.
export const CELL = 16;
export const COLS = 30;
export const ROWS = 40;
export const MATERIALS = Object.freeze([
    { id: 'grass', label: 'Grass / moss' },
    { id: 'mud', label: 'Wet mud' },
    { id: 'paving', label: 'Old paving' },
    { id: 'dirt', label: 'Trampled earth' },
    { id: 'scorched', label: 'Scorched ground' },
]);
const contexts = new WeakMap();

export function materialSampleBoard(columns = COLS, rows = ROWS) {
    const cells = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++) {
        const material = Math.min(MATERIALS.length - 1, Math.floor(y * MATERIALS.length / rows));
        cells.fill(material, y * columns, (y + 1) * columns);
    }
    return cells;
}

export function paintGroundCells(cells, columns, rows, x, y, index, radius = 2) {
    if (!cells || cells.length !== columns * rows || !Number.isFinite(x) ||
        !Number.isFinite(y) || index < 0 || index >= MATERIALS.length) return 0;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const size = Math.max(0, Math.min(7, Math.floor(radius)));
    let changed = 0;
    for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
            if (dx * dx + dy * dy > (size + .3) * (size + .3)) continue;
            const px = cx + dx, py = cy + dy;
            if (px < 0 || py < 0 || px >= columns || py >= rows) continue;
            const offset = py * columns + px;
            if (cells[offset] === index) continue;
            cells[offset] = index;
            changed++;
        }
    }
    return changed;
}

export function materialNoise(seed, x, y, channel = 0) {
    let v = (seed | 0) ^ Math.imul(x + 1, 0x9e3779b1) ^
        Math.imul(y + 1, 0x85ebca6b) ^ Math.imul(channel + 1, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
    v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}

// The five samples are extracted directly from the user's approved arena concept.
// Each region is a 64x64 crop in one small WebP atlas, in MATERIALS order.
// This is an exploratory MATERIAL board, not a procedurally generated arena.
export const REFERENCE_TILE_SIZE = 64;
export const REFERENCE_ATLAS_URL = '../art/environment/reference-ground-atlas.webp';

export function makeReferenceMaterialPatterns(ctx, atlas, seed = 1441) {
    if (!atlas || atlas.width !== REFERENCE_TILE_SIZE * MATERIALS.length ||
        atlas.height !== REFERENCE_TILE_SIZE || typeof document === 'undefined')
        return [];
    const patterns = [];
    const size = REFERENCE_TILE_SIZE;
    for (let index = 0; index < MATERIALS.length; index++) {
        const surface = document.createElement('canvas');
        surface.width = surface.height = size * 2;
        const tile = surface.getContext('2d');
        if (!tile) return [];
        tile.imageSmoothingEnabled = false;
        const reverse = (seed & 1) === 0;
        for (let iy = 0; iy < 2; iy++)
            for (let ix = 0; ix < 2; ix++) {
                const mirrorX = (ix === 1) !== reverse;
                const mirrorY = iy === 1;
                tile.save();
                tile.translate(ix * size + (mirrorX ? size : 0),
                    iy * size + (mirrorY ? size : 0));
                tile.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
                tile.drawImage(atlas, index * size, 0, size, size, 0, 0, size, size);
                tile.restore();
            }
        patterns.push(ctx.createPattern(surface, 'repeat'));
    }
    return patterns;
}

export function drawGroundMaterialTile(ctx, index, col, row, patterns) {
    if (!ctx || index < 0 || index >= MATERIALS.length || !patterns?.[index]) return false;
    ctx.fillStyle = patterns[index];
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    return true;
}

export function drawMaterialBoard(ctx, board, patterns, columns = COLS, rows = ROWS) {
    if (!patterns?.length) return false;
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++)
            drawGroundMaterialTile(ctx, board[row * columns + col], col, row, patterns);
    return true;
}

function render(state) {
    state.pending = false;
    if (state.disposed) return;
    const ctx = state.canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawMaterialBoard(ctx, state.cells, state.patterns);
}
function redraw(state) {
    if (!state.pending && !state.disposed) {
        state.pending = true;
        state.frameId = requestAnimationFrame(() => render(state));
    }
}
function record(state) {
    state.history.push(state.cells.slice());
    if (state.history.length > 20) state.history.shift();
}
function locate(state, event) {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * state.canvas.width / rect.width,
        y: (event.clientY - rect.top) * state.canvas.height / rect.height,
    };
}
function stroke(state, event) {
    const p = locate(state, event);
    paintGroundCells(state.cells, COLS, ROWS, p.x, p.y, state.selected, state.radius);
    redraw(state);
}

export function initMaterialsLab(canvas, seed = 1441) {
    if (contexts.has(canvas)) return;
    const state = {
        canvas, seed: seed | 0, selected: 0, radius: 2,
        cells: materialSampleBoard(), history: [], pointer: null, patterns: [], atlas: null,
        listeners: [], pending: false, frameId: 0, disposed: false,
    };
    const bind = (target, name, handler, options) => {
        target.addEventListener(name, handler, options);
        state.listeners.push(() => target.removeEventListener(name, handler, options));
    };
    bind(canvas, 'pointerdown', e => {
        if (state.pointer !== null) return;
        if (e.cancelable) e.preventDefault();
        state.pointer = e.pointerId;
        record(state);
        canvas.setPointerCapture?.(e.pointerId);
        stroke(state, e);
    });
    bind(canvas, 'pointermove', e => {
        if (state.pointer !== e.pointerId) return;
        if (e.cancelable) e.preventDefault();
        stroke(state, e);
    });
    const finish = e => { if (e.pointerId === state.pointer) state.pointer = null; };
    bind(canvas, 'pointerup', finish);
    bind(canvas, 'pointercancel', finish);
    const preventScroll = e => { if (e.cancelable) e.preventDefault(); };
    bind(canvas, 'touchstart', preventScroll, { passive: false });
    bind(canvas, 'touchmove', preventScroll, { passive: false });
    contexts.set(canvas, state);
    // Never display invented placeholder textures while the approved samples load.
    const atlas = new Image();
    atlas.decoding = 'async';
    atlas.onload = () => {
        if (state.disposed) return;
        state.atlas = atlas;
        state.patterns = makeReferenceMaterialPatterns(canvas.getContext('2d'), atlas, state.seed);
        redraw(state);
    };
    atlas.onerror = () => {
        if (state.disposed) return;
        console.warn('Arena material reference atlas could not be loaded.');
    };
    atlas.src = new URL(REFERENCE_ATLAS_URL, import.meta.url).href;
}
export function selectGroundMaterial(canvas, index) {
    const s = contexts.get(canvas);
    if (s && Number.isInteger(index) && index >= 0 && index < MATERIALS.length) s.selected = index;
}
export function selectGroundBrush(canvas, radius) {
    const s = contexts.get(canvas);
    if (s && Number.isInteger(radius)) s.radius = Math.max(0, Math.min(7, radius));
}
export function resetMaterialSamples(canvas) {
    const s = contexts.get(canvas);
    if (!s) return;
    record(s);
    s.cells = materialSampleBoard();
    redraw(s);
}
export function clearMaterialSamples(canvas) {
    const s = contexts.get(canvas);
    if (!s) return;
    record(s);
    s.cells.fill(0);
    redraw(s);
}
export function undoMaterialStroke(canvas) {
    const s = contexts.get(canvas);
    if (s?.history.length) {
        s.cells = s.history.pop();
        redraw(s);
    }
}
export function changeMaterialSeed(canvas, seed) {
    const s = contexts.get(canvas);
    if (!s) return;
    s.seed = seed | 0;
    if (s.atlas) s.patterns = makeReferenceMaterialPatterns(s.canvas.getContext('2d'), s.atlas, s.seed);
    redraw(s);
}
export function disposeMaterialsLab(canvas) {
    const s = contexts.get(canvas);
    if (!s) return;
    s.disposed = true;
    for (const off of s.listeners) off();
    if (s.frameId) cancelAnimationFrame(s.frameId);
    contexts.delete(canvas);
}

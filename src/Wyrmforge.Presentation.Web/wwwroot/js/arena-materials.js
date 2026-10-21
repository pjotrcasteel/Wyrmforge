// Arena Materials Lab 01: only ground. No layout, heightmap, props or gameplay.
// Material samples deliberately use simple horizontal strips, not a proposed arena.
// The material atlas is cut from the six standalone Gothic ground paintings the player approved.
export const GROUND_TILE_SIZE = 112;
export const GROUND_ATLAS_URL = new URL('../art/environment/wet-forest-materials-painted.webp', import.meta.url).href;
export const CELL = 16;
export const COLS = 30;
export const ROWS = 40;
export const MATERIALS = Object.freeze([
    { id: 'grass', label: 'Grass / moss' },
    { id: 'mud', label: 'Wet mud' },
    { id: 'paving', label: 'Old paving' },
    { id: 'dirt', label: 'Trampled earth' },
    { id: 'scorched', label: 'Scorched ground' },
    { id: 'marsh', label: 'Marsh / wet bank' },
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

// Paint the GENERATED standalone material illustrations, not crops containing
// buildings, tree trunks, torches or flames from the full arena concept image.
// Sample in world coordinates so adjacent brush cells continue the same texture.
export function drawReferenceGroundBoard(ctx, board, atlas, columns = COLS, rows = ROWS, seed = 1441) {
    if (!ctx || !atlas || atlas.width !== GROUND_TILE_SIZE * MATERIALS.length ||
        atlas.height !== GROUND_TILE_SIZE || board.length !== columns * rows) return false;
    const length = GROUND_TILE_SIZE;
    const phase = Math.abs(seed | 0) % 7 * CELL;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const index = board[row * columns + col];
            if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) continue;
            const x = col * CELL, y = row * CELL;
            // 112 is divisible by CELL, so each 16px sub-tile stays inside its
            // material's source region and never borrows a neighbor's artwork.
            const sx = (x + phase) % length, sy = (y + phase) % length;
            ctx.drawImage(atlas, index * length + sx, sy,
                CELL, CELL, x, y, CELL, CELL);
        }
    }
    return true;
}

function render(state) {
    state.pending = false;
    if (state.disposed) return;
    const ctx = state.canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (!drawReferenceGroundBoard(ctx, state.cells, state.atlas, COLS, ROWS, state.seed)) {
        ctx.fillStyle = '#171a16';
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    }
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
        cells: materialSampleBoard(), history: [], pointer: null,
        listeners: [], pending: false, frameId: 0, disposed: false, atlas: null,
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
    render(state);
    const atlas = new Image();
    atlas.onerror = () => {
        if (!state.disposed) console.error('WyrmForge material artwork failed to load.', GROUND_ATLAS_URL);
    };
    atlas.onload = () => {
        if (!state.disposed && atlas.width === GROUND_TILE_SIZE * MATERIALS.length &&
            atlas.height === GROUND_TILE_SIZE) {
            state.atlas = atlas;
            redraw(state);
        }
    };
    atlas.src = GROUND_ATLAS_URL;
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

// Arena Materials Lab 01: only ground. No layout, heightmap, props or gameplay.
// Material samples deliberately use simple horizontal strips, not a proposed arena.
import { MATERIAL_REFERENCE_ATLAS, MATERIAL_REFERENCE_TILE_SIZE } from './arena-material-reference.js';
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

const palettes = [
    ['#273329', '#2a352a', '#2c372c', '#303a2d'],
    ['#302d27', '#352f29', '#38322b', '#33302a'],
    ['#34342e', '#39392f', '#3a3a33', '#35352e'],
    ['#373128', '#3b332b', '#40372e', '#383129'],
    ['#232523', '#282623', '#2c2925', '#262525'],
];
export function drawGroundMaterialTile(ctx, index, col, row, seed = 1441) {
    if (!ctx || !palettes[index]) return false;
    const x = col * CELL, y = row * CELL;
    const n = materialNoise(seed, col, row);
    const v = materialNoise(seed, col, row, 3);
    const p = palettes[index];
    ctx.fillStyle = p[Math.floor(n * p.length)];
    ctx.fillRect(x, y, CELL, CELL);
    const pixel = (dx, dy, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + dx, y + dy, w, h);
    };

    if (index === 0) { // damp forest grass, clumped rather than noise sprayed everywhere
        if (n > .19) {
            const gx = 2 + Math.floor(v * 5) * 2, gy = 4 + Math.floor(n * 3) * 2;
            pixel(gx, gy, 2, 6, '#3a4933');
            pixel(gx + 2, gy - 2, 2, 6, '#46523a');
            if (v > .42) pixel(gx + 4, gy + 2, 2, 4, '#36462f');
        }
        if (v > .54) pixel(2, 12, 8, 2, '#202f28');
        if (n < .30) pixel(10, 4, 4, 2, '#45513c');
    } else if (index === 1) { // wet muddy ground: compressed ruts and restrained reflected wet glints
        if (n > .20) {
            pixel(2, 4 + Math.floor(v * 3) * 2, 10, 4, '#282924');
            pixel(4, 6 + Math.floor(v * 3) * 2, 7, 2, '#404138');
        }
        if (v > .55) pixel(0, 12, 8, 2, '#242823');
        if (n > .67) pixel(9, 3, 5, 2, '#575144');
        if (v < .16) pixel(4, 2, 4, 2, '#4a483c');
    } else if (index === 2) { // sunken Gothic road: short broken stones, subtle bevels
        pixel(0, 0, 16, 2, '#272c28');
        const shift = row % 2 ? 5 : 0;
        for (let k = -1; k <= 2; k++) {
            const left = k * 11 + shift;
            const px = Math.max(0, left);
            const right = Math.min(16, left + 10);
            if (right <= px) continue;
            const shade = materialNoise(seed, col * 4 + k, row, 7);
            pixel(px, 3, right - px, 5, shade > .66 ? '#57574c' : shade > .29 ? '#4b4d43' : '#42483f');
            if (shade > .51) pixel(px + 2 < right ? px + 2 : px, 3,
                Math.max(1, Math.min(4, right - px - 2)), 1, '#777564');
            pixel(px, 9, right - px, 4, shade > .6 ? '#3a4038' : '#41453c');
            if (shade < .15 && right - px > 5) pixel(px + 3, 6, 2, 2, '#303a31');
        }
        if (n > .68) pixel(2, 14, 7, 2, '#334032');
        if (v < .15) pixel(12, 10, 2, 4, '#273529');
    } else if (index === 3) { // compacted forest earth; warm neutral grit, no checkerboard
        if (n > .24) pixel(2 + Math.floor(v * 4) * 2, 8, 8, 2, '#554636');
        if (v > .49) pixel(2, 4, 4, 2, '#292d26');
        if (n < .42) pixel(10, 10, 4, 4, '#484034');
        if (v < .29) pixel(0, 14, 8, 2, '#2d3027');
    } else { // blackened earth with soot and scarce embers; no painted flames
        if (n > .26) pixel(2, 5 + Math.floor(v * 3) * 2, 10, 2, '#171d1b');
        if (v > .46) pixel(5, 10, 7, 2, '#3d332b');
        if (n > .88) pixel(11, 4, 2, 2, '#805036');
        if (v < .22) pixel(1, 13, 4, 2, '#40382f');
    }
    return true;
}

export function drawMaterialBoard(ctx, board, seed, columns = COLS, rows = ROWS) {
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++)
            drawGroundMaterialTile(ctx, board[row * columns + col], col, row, seed);
}

// Direct photographic crops from the user's supplied Gothic Wet Forest reference.
// Each painted cell copies the corresponding portion of the approved source.
// No synthetic geometric cobble, grass or mud patterns are applied over it.
export function drawReferenceGroundBoard(ctx, board, atlas, columns = COLS, rows = ROWS) {
    if (!atlas || !ctx || board.length !== columns * rows) return false;
    const length = MATERIAL_REFERENCE_TILE_SIZE;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const index = board[row * columns + col];
            if (!Number.isInteger(index) || index >= MATERIALS.length) continue;
            const x = col * CELL, y = row * CELL;
            ctx.drawImage(atlas, index * length + x % length, y % length,
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
    if (!drawReferenceGroundBoard(ctx, state.cells, state.atlas))
        drawMaterialBoard(ctx, state.cells, state.seed);
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
    atlas.onload = () => {
        if (!state.disposed && atlas.width === MATERIAL_REFERENCE_TILE_SIZE * MATERIALS.length &&
            atlas.height === MATERIAL_REFERENCE_TILE_SIZE) {
            state.atlas = atlas;
            redraw(state);
        }
    };
    atlas.src = MATERIAL_REFERENCE_ATLAS;
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

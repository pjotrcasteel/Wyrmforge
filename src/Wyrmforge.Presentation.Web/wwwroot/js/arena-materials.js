// Arena Materials Lab 01: only ground. No layout, heightmap, props or gameplay.
// Material samples deliberately use simple horizontal strips, not a proposed arena.
// The material atlas is cut from the six standalone Gothic ground paintings the player approved.
export const GROUND_SOURCE_TILE_SIZE = 112;
export const GROUND_TILE_SIZE = 672;
export const GROUND_PATCH_SIZE = 72;
export const GROUND_PATCH_STEP = 48;
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

// The six approved material paintings are just 112px wide. Repeating those
// directly produces obvious checkerboard motifs. Quilt each one once into a
// 672px toroidal texture with deterministic, overlapping 72px source patches.
// Edges are softly crossfaded, not mirrored into rigid repeated symmetry.
export function groundQuiltPatchPlan(index, seed = 1441) {
    if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) return [];
    const patches = [];
    const count = GROUND_TILE_SIZE / GROUND_PATCH_STEP;
    const inset = (GROUND_PATCH_SIZE - GROUND_PATCH_STEP) / 2;
    for (let row = 0; row < count; row++)
        for (let col = 0; col < count; col++) {
            const random = channel => {
                let v = (seed | 0) ^ Math.imul(index + 13, 0x9e3779b1) ^
                    Math.imul(col + 31, 0x85ebca6b) ^ Math.imul(row + 47, 0xc2b2ae35) ^
                    Math.imul(channel + 7, 0x27d4eb2d);
                v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
                v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
                return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
            };
            const travel = GROUND_SOURCE_TILE_SIZE - GROUND_PATCH_SIZE;
            patches.push({
                x: col * GROUND_PATCH_STEP - inset,
                y: row * GROUND_PATCH_STEP - inset,
                sourceX: index * GROUND_SOURCE_TILE_SIZE + Math.floor(random(0) * (travel + 1)),
                sourceY: Math.floor(random(1) * (travel + 1)),
                flipX: random(2) > .5,
                flipY: random(3) > .5,
            });
        }
    return patches;
}

function groundPatchMask(ctx, horizontal) {
    const size = GROUND_PATCH_SIZE;
    const fade = 12;
    const gradient = ctx.createLinearGradient(0, 0,
        horizontal ? size : 0, horizontal ? 0 : size);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(fade / size, 'rgba(255,255,255,1)');
    gradient.addColorStop(1 - fade / size, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
}

/** Build once on atlas load, not during walking or every brush stroke. */
export function buildGroundQuiltAtlas(source, seed = 1441, canvasFactory) {
    if (!source || source.width !== GROUND_SOURCE_TILE_SIZE * MATERIALS.length ||
        source.height !== GROUND_SOURCE_TILE_SIZE) return null;
    const create = canvasFactory ?? (() => document.createElement('canvas'));
    const canvas = create();
    canvas.width = GROUND_TILE_SIZE * MATERIALS.length;
    canvas.height = GROUND_TILE_SIZE;
    const ctx = canvas.getContext('2d');
    const scratch = create();
    scratch.width = scratch.height = GROUND_PATCH_SIZE;
    const sc = scratch.getContext('2d');
    if (!ctx || !sc) return null;
    ctx.imageSmoothingEnabled = false;
    sc.imageSmoothingEnabled = false;
    const size = GROUND_PATCH_SIZE;
    for (let index = 0; index < MATERIALS.length; index++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(index * GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE, GROUND_TILE_SIZE);
        ctx.clip();
        for (const p of groundQuiltPatchPlan(index, seed)) {
            sc.globalCompositeOperation = 'source-over';
            sc.clearRect(0, 0, size, size);
            sc.save();
            sc.translate(p.flipX ? size : 0, p.flipY ? size : 0);
            sc.scale(p.flipX ? -1 : 1, p.flipY ? -1 : 1);
            sc.drawImage(source, p.sourceX, p.sourceY, size, size, 0, 0, size, size);
            sc.restore();
            sc.globalCompositeOperation = 'destination-in';
            groundPatchMask(sc, true);
            groundPatchMask(sc, false);
            sc.globalCompositeOperation = 'source-over';
            // Wrap only within THIS material panel; the atlas panels never bleed.
            for (const wy of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE])
                for (const wx of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE]) {
                    const dx = p.x + wx, dy = p.y + wy;
                    if (dx + size <= 0 || dy + size <= 0 ||
                        dx >= GROUND_TILE_SIZE || dy >= GROUND_TILE_SIZE) continue;
                    ctx.drawImage(scratch, index * GROUND_TILE_SIZE + dx, dy);
                }
        }
        ctx.restore();
    }
    return canvas;
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
        listeners: [], pending: false, frameId: 0, disposed: false, atlas: null, sourceAtlas: null,
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
        if (!state.disposed && atlas.width === GROUND_SOURCE_TILE_SIZE * MATERIALS.length &&
            atlas.height === GROUND_SOURCE_TILE_SIZE) {
            state.sourceAtlas = atlas;
            state.atlas = buildGroundQuiltAtlas(atlas, state.seed);
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
    if (s.sourceAtlas) s.atlas = buildGroundQuiltAtlas(s.sourceAtlas, s.seed);
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

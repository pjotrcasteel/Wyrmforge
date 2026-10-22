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

// Ground-only placement study. Derived from two correlated low-frequency soil
// fields (wetness and wear), not a hand-drawn road, random prop scatter, or
// gameplay collision map. Hardcoded structures and paving never appear here.
function naturalNoise(seed, x, y, channel) {
    const hash = (ix, iy) => {
        let n = (seed | 0) ^ Math.imul(ix + 137, 0x9e3779b1) ^
            Math.imul(iy + 311, 0x85ebca6b) ^ Math.imul(channel + 17, 0xc2b2ae35);
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const ix = Math.floor(x), iy = Math.floor(y);
    const u = x - ix, v = y - iy;
    const tx = u * u * (3 - 2 * u), ty = v * v * (3 - 2 * v);
    const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
    const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
    return a * (1 - ty) + b * ty;
}

export function naturalGroundPreview(seed = 1441, columns = COLS, rows = ROWS) {
    if (!Number.isInteger(columns) || !Number.isInteger(rows) ||
        columns < 1 || rows < 1 || columns * rows > 65536) return new Uint8Array();
    const board = new Uint8Array(columns * rows);
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
            const x = col + .5, y = row + .5;
            // Large patches come from smooth low-frequency fields, while a
            // smaller second octave varies the edges without confetti.
            const wet = .7 * naturalNoise(seed, x * .14, y * .12, 1) +
                .3 * naturalNoise(seed, x * .29, y * .26, 2);
            const wear = .75 * naturalNoise(seed, 24 + x * .115, 17 + y * .13, 3) +
                .25 * naturalNoise(seed, x * .24, y * .20, 4);
            let material = 0; // natural forest grass is the dominant substrate
            if (wet > .68) material = 5; // marsh near saturated ground
            else if (wet > .56) material = 1; // damp, compacted earth
            else if (wear > .60) material = 3; // dry/trampled earth
            board[row * columns + col] = material;
        }
    return board;
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

// Readable broad tonal variation. These overlays are baked over the
// existing approved artwork; they never create extra props, decals or tiles.
// Positions wrap at the edges so the finished quilt remains seamless.
const GROUND_TONES = Object.freeze([
    ['43,54,31', '15,24,18'], // grass: uneven moss and canopy shade
    ['80,69,51', '23,22,20'], // mud: damp and drier soil
    ['95,94,78', '28,30,27'], // paving: worn and shaded stone
    ['105,78,55', '30,26,23'], // dirt: compacted and looser earth
    ['85,52,41', '17,20,19'], // scorched: charcoal and faint warm ash
    ['64,94,91', '16,28,30'], // marsh: damp and shaded ground
]);

export function groundMaterialVariationPlan(index, seed = 1441) {
    if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) return [];
    const hash = (spot, channel) => {
        let n = (seed | 0) ^ Math.imul(index + 31, 0x9e3779b1) ^
            Math.imul(spot + 17, 0x85ebca6b) ^ Math.imul(channel + 5, 0xc2b2ae35);
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    return Array.from({ length: 14 }, (_, spot) => ({
        x: Math.floor(hash(spot, 0) * GROUND_TILE_SIZE),
        y: Math.floor(hash(spot, 1) * GROUND_TILE_SIZE),
        radius: 85 + Math.floor(hash(spot, 2) * 91),
        tone: GROUND_TONES[index][spot % 2],
        opacity: .16 + hash(spot, 3) * .12,
    }));
}

function drawGroundMaterialVariation(ctx, index, seed) {
    for (const spot of groundMaterialVariationPlan(index, seed)) {
        const radius = spot.radius;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, `rgba(${spot.tone},${spot.opacity})`);
        gradient.addColorStop(1, `rgba(${spot.tone},0)`);
        ctx.fillStyle = gradient;
        // Wrap across the material's own edges, never into neighboring materials.
        for (const offsetY of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE])
            for (const offsetX of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE]) {
                const x = spot.x + offsetX;
                const y = spot.y + offsetY;
                if (x + radius <= 0 || y + radius <= 0 ||
                    x - radius >= GROUND_TILE_SIZE || y - radius >= GROUND_TILE_SIZE) continue;
                ctx.save();
                ctx.translate(index * GROUND_TILE_SIZE + x, y);
                ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                ctx.restore();
            }
    }
}

// Distinct natural wear within a single material: sparse patches of a related
// *approved* painted material, softly feathered into the base texture. This is
// baked once, so mobile brush strokes only sample the final ground atlas.
const GROUND_ACCENTS = Object.freeze([
    [3, 5], // grass: trampled earth and damp moss
    [3, 5], // mud: drier earth and wet seams
    [3, 0], // paving: dirt in joints and moss
    [1, 0], // dirt: wet soil and scarce ground cover
    [3, 1], // scorched: exposed soil and charcoal-dark mud
    [1, 0], // marsh: wet soil and sparse vegetation
]);

export function groundMaterialAccentPlan(index, seed = 1441) {
    if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) return [];
    const random = (spot, channel) => {
        let n = (seed | 0) ^ Math.imul(index + 11, 0x9e3779b1) ^
            Math.imul(spot + 29, 0x85ebca6b) ^ Math.imul(channel + 4, 0xc2b2ae35);
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    return Array.from({ length: 7 }, (_, spot) => ({
        x: Math.floor(random(spot, 0) * GROUND_TILE_SIZE),
        y: Math.floor(random(spot, 1) * GROUND_TILE_SIZE),
        radius: 64 + Math.floor(random(spot, 2) * 49),
        opacity: .23 + random(spot, 3) * .15,
        source: GROUND_ACCENTS[index][spot % 2],
    }));
}

function drawGroundMaterialAccents(ctx, sc, scratch, source, index, seed) {
    for (const spot of groundMaterialAccentPlan(index, seed)) {
        const size = spot.radius * 2;
        scratch.width = scratch.height = size;
        sc.globalCompositeOperation = 'source-over';
        sc.clearRect(0, 0, size, size);
        sc.imageSmoothingEnabled = true;
        sc.drawImage(source, spot.source * GROUND_SOURCE_TILE_SIZE, 0,
            GROUND_SOURCE_TILE_SIZE, GROUND_SOURCE_TILE_SIZE, 0, 0, size, size);
        const mask = sc.createRadialGradient(spot.radius, spot.radius, 0,
            spot.radius, spot.radius, spot.radius);
        mask.addColorStop(0, 'rgba(255,255,255,1)');
        mask.addColorStop(.48, 'rgba(255,255,255,.85)');
        mask.addColorStop(.83, 'rgba(255,255,255,.26)');
        mask.addColorStop(1, 'rgba(255,255,255,0)');
        sc.globalCompositeOperation = 'destination-in';
        sc.fillStyle = mask;
        sc.fillRect(0, 0, size, size);
        sc.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = spot.opacity;
        for (const offsetY of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE])
            for (const offsetX of [-GROUND_TILE_SIZE, 0, GROUND_TILE_SIZE]) {
                const x = spot.x - spot.radius + offsetX;
                const y = spot.y - spot.radius + offsetY;
                if (x + size <= 0 || y + size <= 0 || x >= GROUND_TILE_SIZE || y >= GROUND_TILE_SIZE) continue;
                ctx.drawImage(scratch, index * GROUND_TILE_SIZE + x, y);
            }
    }
    ctx.globalAlpha = 1;
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
        drawGroundMaterialVariation(ctx, index, seed);
        drawGroundMaterialAccents(ctx, sc, scratch, source, index, seed);
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
            // The quilt period is divisible by CELL, so painted cells stay world-aligned
            // and never sample into a neighboring material's artwork.
            const sx = (x + phase) % length, sy = (y + phase) % length;
            ctx.drawImage(atlas, index * length + sx, sy,
                CELL, CELL, x, y, CELL, CELL);
        }
    }
    return true;
}

// Material boundaries must transition naturally, not form 16px stair steps.
// Small opposing swatches are mixed over both sides of each painted boundary;
// the terrain remains 100% visual, with no new gameplay geometry.
export function groundMaterialBoundaryPlan(board, columns = COLS, rows = ROWS, seed = 1441) {
    if (!board || board.length !== columns * rows) return [];
    const boundaries = [];
    const jitter = (col, row, axis, slice) => {
        let n = (seed | 0) ^ Math.imul(col + 1, 0x9e3779b1) ^
            Math.imul(row + 1, 0x85ebca6b) ^ Math.imul(axis * 3 + slice + 1, 0xc2b2ae35);
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        return ((n ^ (n >>> 15)) >>> 0) % 5 - 2;
    };
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
            const a = board[row * columns + col];
            if (col + 1 < columns) {
                const b = board[row * columns + col + 1];
                if (a !== b)
                    for (let slice = 0; slice < 2; slice++)
                        boundaries.push({ vertical: true, x: (col + 1) * CELL + jitter(col, row, 0, slice),
                            y: row * CELL + slice * 8, a, b });
            }
            if (row + 1 < rows) {
                const b = board[(row + 1) * columns + col];
                if (a !== b)
                    for (let slice = 0; slice < 2; slice++)
                        boundaries.push({ vertical: false, x: col * CELL + slice * 8,
                            y: (row + 1) * CELL + jitter(col, row, 1, slice), a, b });
            }
        }
    return boundaries;
}

function drawGroundSourceRegion(ctx, atlas, index, x, y, width, height, seed) {
    const phase = Math.abs(seed | 0) % 7 * CELL;
    const startX = x, startY = y;
    const endX = x + width, endY = y + height;
    for (let py = startY; py < endY;) {
        const sy = ((py + phase) % GROUND_TILE_SIZE + GROUND_TILE_SIZE) % GROUND_TILE_SIZE;
        const h = Math.min(endY - py, GROUND_TILE_SIZE - sy);
        for (let px = startX; px < endX;) {
            const sx = ((px + phase) % GROUND_TILE_SIZE + GROUND_TILE_SIZE) % GROUND_TILE_SIZE;
            const w = Math.min(endX - px, GROUND_TILE_SIZE - sx);
            ctx.drawImage(atlas, index * GROUND_TILE_SIZE + sx, sy, w, h, px, py, w, h);
            px += w;
        }
        py += h;
    }
}

export function drawGroundMaterialTransitions(ctx, board, atlas, columns = COLS, rows = ROWS, seed = 1441) {
    if (!ctx || !atlas || atlas.width !== GROUND_TILE_SIZE * MATERIALS.length ||
        atlas.height !== GROUND_TILE_SIZE || !board || board.length !== columns * rows) return false;
    const weights = [.10, .24, .38, .49];
    ctx.save();
    for (const edge of groundMaterialBoundaryPlan(board, columns, rows, seed)) {
        if (edge.a >= MATERIALS.length || edge.b >= MATERIALS.length) continue;
        for (let step = 0; step < weights.length; step++) {
            const far = step * 2;
            const alpha = weights[step];
            ctx.globalAlpha = alpha;
            if (edge.vertical) {
                // This half is still A, mixed with a little B as it approaches the seam.
                drawGroundSourceRegion(ctx, atlas, edge.b, edge.x - 8 + far, edge.y, 2, 8, seed);
                // Reverse mixture on the B side, so the color never snaps at x=edge.x.
                drawGroundSourceRegion(ctx, atlas, edge.a, edge.x + 6 - far, edge.y, 2, 8, seed);
            } else {
                drawGroundSourceRegion(ctx, atlas, edge.b, edge.x, edge.y - 8 + far, 8, 2, seed);
                drawGroundSourceRegion(ctx, atlas, edge.a, edge.x, edge.y + 6 - far, 8, 2, seed);
            }
        }
    }
    ctx.restore();
    return true;
}

function render(state) {
    state.pending = false;
    if (state.disposed) return;
    const ctx = state.canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (drawReferenceGroundBoard(ctx, state.cells, state.atlas, COLS, ROWS, state.seed))
        drawGroundMaterialTransitions(ctx, state.cells, state.atlas, COLS, ROWS, state.seed);
    else {
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
export function previewNaturalGround(canvas, seed = 1441) {
    const s = contexts.get(canvas);
    if (!s) return;
    record(s);
    s.cells = naturalGroundPreview(seed, COLS, ROWS);
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

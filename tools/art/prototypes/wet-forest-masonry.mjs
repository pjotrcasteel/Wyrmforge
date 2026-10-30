// WyrmForge original, source-only masonry study. Stone patterns are authored in continuous
// WORLD pixel coordinates, then partitioned into 32px frames: there is no per-tile border.
// The tile key is a phase (x/y modulo 8), NOT an interchangeable random style variant.
import { Bitmap, rng } from '../lib/painter.mjs';

export const MASONRY_CELL = 32;
export const MASONRY_PERIOD = 256;
const PERIOD_CELLS = MASONRY_PERIOD / MASONRY_CELL;
const STONE = ['#1b2422', '#2a302d', '#373e38', '#454b42', '#52584d', '#626657', '#767866'];
const SOIL = ['#20211c', '#29271f', '#37342a', '#514537'];
const MOSS = ['#29392b', '#344936', '#466045'];
const choose = (r, list) => list[Math.floor(r() * list.length)];
const range = (r, min, max) => min + Math.floor(r() * (max - min + 1));

function drawChip(paint, x, y, width, height, rnd, tone) {
    // Chips, scars and abrasion are attached to individual stones, not noisy atlas cells.
    for (let i = 0; i < Math.max(1, Math.floor(width * height / 240)); i++) {
        const sx = x + range(rnd, 3, Math.max(3, width - 4));
        const sy = y + range(rnd, 3, Math.max(3, height - 4));
        paint.rect(sx, sy, range(rnd, 2, 4), 1, tone);
        if (rnd() < .55) paint.set(sx + 1, sy + 1, STONE[1]);
    }
}

function stoneFace(paint, x, y, w, h, rand, type) {
    // Polygon-like softened corners; mortar is the continuous dark base underneath.
    const r = rand();
    const sunken = r < (type === 'flagstone' ? .18 : .13);
    const broken = r >= (type === 'flagstone' ? .18 : .13) && r < (type === 'flagstone' ? .49 : .37);
    const face = choose(rand, STONE.slice(2, 6));
    if (sunken) {
        // Missing slab exposes earth and crushed aggregate in the same footprint.
        paint.rect(x + 1, y + 1, w - 2, h - 2, SOIL[1]);
        for (let j = 0; j < Math.max(6, Math.floor(w * h / 15)); j++) {
            const sx = x + range(rand, 2, Math.max(2, w - 3));
            const sy = y + range(rand, 2, Math.max(2, h - 3));
            paint.rect(sx, sy, 1 + range(rand, 0, 2), 1, choose(rand, SOIL));
        }
        return;
    }
    const inset = type === 'flagstone' ? 1 : 2;
    paint.rect(x + inset, y + 1, Math.max(1, w - 2 * inset), h - 2, face);
    paint.rect(x + inset + 1, y + 2, Math.max(1, w - 2 * inset - 2), 1, STONE[4]);
    paint.rect(x + inset + 1, y + h - 2, Math.max(1, w - 2 * inset - 2), 1, STONE[1]);
    // Individual slab irregularity: chipped corners and fractures.
    if (broken) {
        const faceSide = rand() < .5;
        const cornerX = faceSide ? x + 1 : x + w - 3;
        const cornerY = rand() < .5 ? y + 1 : y + h - 3;
        paint.rect(cornerX, cornerY, range(rand, 2, 4), range(rand, 2, 3), SOIL[1]);
        const fx = x + range(rand, 4, Math.max(4, w - 5));
        const fy = y + range(rand, 3, Math.max(3, h - 5));
        paint.line(fx, fy, fx + (rand() < .5 ? -3 : 3), fy + 2, STONE[0]);
        paint.line(fx + 2, fy + 1, fx + 4, fy + 1, STONE[1]);
    }
    drawChip(paint, x, y, w, h, rand, STONE[1]);
    if (rand() < .55) {
        // Moss grows out of a joint, not in random rectangular patches.
        const side = rand() < .5;
        const mx = x + range(rand, 3, Math.max(3, w - 4));
        const my = side ? y + 1 : y + h - 2;
        paint.rect(mx, my, range(rand, 2, 4), 1, choose(rand, MOSS));
        if (rand() < .5) paint.set(mx + 1, my + (side ? 1 : -1), MOSS[0]);
    }
}

// A period is an artwork palette/phase domain; 8×8 phase-aware 32px cells reconstruct
// ONE coherent 256px surface. Do not randomly reorder individual cells in a renderer.
function createBrickMasonryField(type = 'brick', seed = 1387) {
    if (type !== 'brick') throw new RangeError(`Invalid masonry type: ${type}`);
    const r = rng(seed ^ (type === 'cobble' ? 0x452369 : 0x89abcdef));
    const b = new Bitmap(MASONRY_PERIOD, MASONRY_PERIOD);
    b.wrap = true;
    // Worn mortar approaches the surrounding soil; avoid dark graphic outlines.
    b.rect(0, 0, MASONRY_PERIOD, MASONRY_PERIOD, STONE[1]);
    const heights = [];
    let remaining = MASONRY_PERIOD;
    while (remaining > 0) {
        const rangeMin = 11;
        const rangeMax = 16;
        let h = Math.min(remaining, range(r, rangeMin, rangeMax));
        if (remaining - h > 0 && remaining - h < rangeMin) h = remaining;
        heights.push(h);
        remaining -= h;
    }
    let y = 0;
    let previousJoints = new Set();
    for (const height of heights) {
        // Circumference is a ring of nonuniform stones that *crosses* x=0 and every 32px cut.
        let widths = [];
        let remainingWidth = MASONRY_PERIOD;
        const minW = 17;
        const maxW = 36;
        while (remainingWidth > 0) {
            let w = Math.min(remainingWidth, range(r, minW, maxW));
            if (remainingWidth - w > 0 && remainingWidth - w < minW) w = remainingWidth;
            widths.push(w);
            remainingWidth -= w;
        }
        const phase = range(r, 5, MASONRY_PERIOD - 5);
        let x = phase;
        const joints = new Set();
        for (const width of widths) {
            // Repeated use of x±256 is unnecessary: Bitmap wrapping maps coordinates to phase.
            stoneFace(b, x, y, width, height, r, type);
            joints.add(x % MASONRY_PERIOD);
            x += width;
        }
        previousJoints = joints;
        y += height;
    }
    // Sparse biologically grounded dirt and lichen: accumulate along the mortar courses.
    // Scatter on full PERIOD so texture detail never resets at individual 32px cell edges.
    for (let i = 0; i < (type === 'flagstone' ? 160 : 200); i++) {
        const x = range(r, 0, 255), y = range(r, 0, 255);
        if (r() < .68) {
            b.set(x, y, choose(r, [STONE[0], STONE[1], MOSS[0]]));
            if (r() < .25) b.set(x + 1, y, SOIL[1]);
        } else if (r() < .14) {
            b.rect(x, y, 2, 2, SOIL[0]);
        }
    }
    return b;
}


const organicMod = (n, m) => (n % m + m) % m;
function pixelHash(x, y, salt) {
    let h = (Math.imul((x|0) + 231, 374761393) ^ Math.imul((y|0) + 181, 668265263) ^ salt) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function createOrganicMasonryField(type, seed) {
    const cobble = type === 'cobble';
    const count = cobble ? 19 : 11;
    const cell = MASONRY_PERIOD / count;
    const r = rng(seed ^ (cobble ? 0x9e4a2c12 : 0x5b1d7341));
    const centers = Array.from({ length: count * count }, (_, id) => {
        const gx = id % count, gy = Math.floor(id / count);
        const dx = (r() - .5) * cell * (cobble ? .60 : .76);
        const dy = (r() - .5) * cell * (cobble ? .60 : .76);
        const material = r();
        return {
            x: (gx + .5) * cell + dx,
            y: (gy + .5) * cell + dy,
            shade: 2 + Math.floor(r() * 4),
            missing: material < (cobble ? .125 : .19),
            fractured: material >= (cobble ? .125 : .19) && material < (cobble ? .42 : .54),
            mossy: r() < .30,
        };
    });
    const bitmap = new Bitmap(MASONRY_PERIOD, MASONRY_PERIOD);
    for (let y = 0; y < MASONRY_PERIOD; y++) for (let x = 0; x < MASONRY_PERIOD; x++) {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        let first = Infinity, second = Infinity, best = null, cx = 0, cy = 0;
        for (let iy = -1; iy <= 1; iy++) for (let ix = -1; ix <= 1; ix++) {
            const mx = organicMod(gx + ix, count), my = organicMod(gy + iy, count);
            const stone = centers[my * count + mx];
            // Re-center the toroidal seed at this pixel; the stone continues across tile edges.
            let dx = x - stone.x, dy = y - stone.y;
            if (dx > MASONRY_PERIOD / 2) dx -= MASONRY_PERIOD;
            if (dx < -MASONRY_PERIOD / 2) dx += MASONRY_PERIOD;
            if (dy > MASONRY_PERIOD / 2) dy -= MASONRY_PERIOD;
            if (dy < -MASONRY_PERIOD / 2) dy += MASONRY_PERIOD;
            const d = dx * dx + dy * dy;
            if (d < first) { second = first; first = d; best = stone; cx = dx; cy = dy; }
            else if (d < second) second = d;
        }
        const random = pixelHash(x, y, seed);
        const seam = Math.sqrt(second) - Math.sqrt(first) < (cobble ? 1.35 : 1.15);
        if (seam) {
            const mossy = random < .16;
            // Broken-up low-contrast joints disappear into packed earth and moss.
            bitmap.set(x, y, mossy ? MOSS[Math.floor(random * 19) % MOSS.length] :
                random > .72 ? STONE[1] : SOIL[1]);
            continue;
        }
        if (best.missing) {
            // Genuinely absent, sunken stones; soil collects within the worn pavement.
            const soilShade = random < .20 ? SOIL[0] : random < .77 ? SOIL[1] : SOIL[2];
            bitmap.set(x, y, soilShade);
            if (random < .055) bitmap.set(x, y, MOSS[0]);
            continue;
        }
        let shade = best.shade;
        if (random < .08) shade = Math.max(1, shade - 2);
        else if (random > .952) shade = Math.min(6, shade + 1);
        // A chipped, irregular rim belongs to the stone itself. Avoid arbitrary
        // straight scratch lines through the centre of the slab.
        if (best.fractured && Math.sqrt(second) - Math.sqrt(first) < (cobble ? 3.2 : 4.4) &&
            random < .33 && ((cx > 0 && cy < 0) || (cx < 0 && cy > 0))) {
            bitmap.set(x, y, random < .18 ? SOIL[1] : STONE[1]);
            continue;
        }
        if (best.mossy && random < .055 &&
            (Math.abs(cx) > cell * .30 || Math.abs(cy) > cell * .30)) {
            bitmap.set(x, y, choose(rng(Math.floor(random * 2e9) + seed), MOSS));
            continue;
        }
        bitmap.set(x, y, STONE[shade]);
    }
    return bitmap;
}

export function createMasonryField(type = 'flagstone', seed = 1387) {
    if (type === 'brick') return createBrickMasonryField(type, seed);
    if (type === 'flagstone' || type === 'cobble') return createOrganicMasonryField(type, seed);
    throw new RangeError(`Invalid masonry type: ${type}`);
}

export function masonryPhaseTile(field, col, row) {
    if (!field || field.width !== MASONRY_PERIOD || field.height !== MASONRY_PERIOD)
        throw new TypeError('Expected one original 256px masonry field');
    const tile = new Bitmap(MASONRY_CELL, MASONRY_CELL);
    const x0 = ((col % PERIOD_CELLS) + PERIOD_CELLS) % PERIOD_CELLS * MASONRY_CELL;
    const y0 = ((row % PERIOD_CELLS) + PERIOD_CELLS) % PERIOD_CELLS * MASONRY_CELL;
    for (let y = 0; y < MASONRY_CELL; y++)
        for (let x = 0; x < MASONRY_CELL; x++) tile.set(x, y, field.get(x0 + x, y0 + y));
    return tile;
}

export function originalMasonryTileSet() {
    const tiles = {};
    for (const type of ['brick', 'flagstone', 'cobble']) {
        const field = createMasonryField(type);
        for (let row = 0; row < PERIOD_CELLS; row++)
            for (let col = 0; col < PERIOD_CELLS; col++)
                tiles[`wetforest.masonry.${type}.${col}.${row}`] = masonryPhaseTile(field, col, row);
    }
    return tiles;
}

export function reassembleMasonry(tiles, type, width = 512, height = 256) {
    if (width % 32 || height % 32) throw new RangeError('Board dimensions must be multiples of 32');
    const board = new Bitmap(width, height);
    for (let row = 0; row < height / 32; row++)
        for (let col = 0; col < width / 32; col++)
            board.blit(tiles[`wetforest.masonry.${type}.${col % 8}.${row % 8}`], col * 32, row * 32);
    return board;
}

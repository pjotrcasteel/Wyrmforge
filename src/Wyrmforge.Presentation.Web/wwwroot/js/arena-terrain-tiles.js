// Hunt 1.0 terrain textures: original native-pixel art for the ground and rock faces at 64 art pixels per metre (owner decision,
// 4 November 2026), generated from rules (ramps, ordered dither, curved blade tufts, rounded pebbles, slab joints) so every pixel is placed on
// purpose. Not copied from any pack: the owner's reference folder only informed the principles (hand-placed highlights, scalloped grass lip,
// slab edges, 5-step ramps, dark gothic).
//
// Every texture is MEGA x MEGA blocks (256 px, 4 m) and wraps on both axes, and the painter samples it by *global* block position, so
// joints, strata and tone drifts continue unbroken from one block to the next. (Earlier per-block random variants met at the block edges
// with mismatched lines: the owner saw a grid of squares.) Feature sizes are written on the old 32 px grid and multiplied by K, counts by
// MEGA squared, so the art keeps its world scale. Pure pixel buffers: the same code runs in the browser and in the Node preview tool.
export const TILE = 64;
/** A texture covers MEGA x MEGA blocks; the painter indexes it by (column mod MEGA, row mod MEGA). */
export const MEGA = 4;
export const TEXTURE = TILE * MEGA;
const SIZE = TEXTURE;
const K = 2;
/** A length authored on the 32 px grid, on this art grid. */
const S = value => Math.round(value * K);
/** A noise lattice period given per block, over the whole texture. */
const P = periods => periods * MEGA;
/** A feature count given per block, over the whole texture. */
const C = count => Math.max(1, Math.round(count * MEGA * MEGA));

const rgbCache = new Map();
const hexRgb = hex => {
    let rgb = rgbCache.get(hex);
    if (!rgb) { const v = parseInt(hex.slice(1), 16); rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255]; rgbCache.set(hex, rgb); }
    return rgb;
};

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

class Tile {
    constructor() { this.width = SIZE; this.height = SIZE; this.data = new Uint8ClampedArray(SIZE * SIZE * 4); }
    set(x, y, hex) {
        const px = ((Math.round(x) % SIZE) + SIZE) % SIZE, py = ((Math.round(y) % SIZE) + SIZE) % SIZE, i = (py * SIZE + px) * 4;
        const [r, g, b] = hexRgb(hex);
        this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    }
    get(x, y) {
        const px = ((Math.round(x) % SIZE) + SIZE) % SIZE, py = ((Math.round(y) % SIZE) + SIZE) % SIZE, i = (py * SIZE + px) * 4;
        return `#${((this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2]).toString(16).padStart(6, '0')}`;
    }
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x, y) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + .5) / 16;

// Tileable value noise: the lattice wraps every `period` cells so the texture repeats without a seam.
function wrapNoise(seed, period) {
    const random = rng(seed);
    const lattice = Array.from({ length: period * period }, random);
    const at = (x, y) => lattice[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
    return (u, v) => {
        const x = u * period, y = v * period, x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
    };
}

/** A tone from a ramp chosen by a 0..1 value; a per-pixel jitter breaks the contours into the ragged speckle of hand-placed pixels. */
function dithered(ramp, value, x, y, amount = .4) {
    let h = (Math.imul(x + 17, 0x9E3779B1) ^ Math.imul(y + 29, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    const jitter = ((h ^ (h >>> 13)) >>> 0) / 4294967296 - .5;
    const level = Math.round(Math.max(0, Math.min(1, value)) * (ramp.length - 1) + jitter * amount);
    return ramp[Math.max(0, Math.min(ramp.length - 1, level))];
}
// Ramps are [deepest shadow ... highlight]. Dark gothic: muted, desaturated, light kept low; colour saturation belongs to fire.
const liftHex = (hex, factor) => '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * factor)).toString(16).padStart(2, '0')).join('');
const lifted = (ramp, factor) => Object.fromEntries(Object.entries(ramp).map(([key, value]) => [key, Array.isArray(value) ? value.map(hex => liftHex(hex, factor)) : liftHex(value, factor)]));
const RAMPS = Object.freeze([
    { // Wet land: cold damp earth under dull green
        grass: ['#16200f', '#222f17', '#2f4020', '#3d5329', '#566d38'],
        dirt: ['#1d1510', '#2b1e16', '#3a2a1e', '#4d392a', '#664d38'],
        stone: ['#1c1b1b', '#2c2b2a', '#403e3b', '#5a5753', '#7a7670'],
        moss: '#2f4120',
    },
    { // Scorched: dry ash-brown, grass dying
        grass: ['#1b1a0f', '#2a2814', '#3b381c', '#4f4a26', '#6b6434'],
        dirt: ['#1e1612', '#2c211a', '#3d2f25', '#524032', '#6a5444'],
        stone: ['#1d1a19', '#2d2928', '#423d3a', '#5c5652', '#7a736d'],
        moss: '#3b381c',
    },
    { // Burning: charred ground, blood-red undertone
        grass: ['#140f0e', '#201816', '#2e2321', '#403230', '#574541'],
        dirt: ['#140e0d', '#201514', '#2f201d', '#432d29', '#5a3f39'],
        stone: ['#161313', '#252020', '#362f2e', '#4a4140', '#645a57'],
        moss: '#2e2321',
    },
    { // Volcanic: near-black basalt
        grass: ['#0e0b0b', '#171212', '#231c1c', '#312828', '#453a3a'],
        dirt: ['#0f0c0c', '#191313', '#251c1c', '#352828', '#4a3a3a'],
        stone: ['#0f0c0d', '#1a1516', '#2a2324', '#3b3233', '#50464a'],
        moss: '#231c1c',
    },
].map((ramp, band) => band === 2 ? lifted(ramp, 1.35) : band === 3 ? lifted(ramp, 1.55) : { ...ramp, stone: ramp.stone.map(hex => liftHex(hex, 1.2)) }));

export const rampsForBand = band => RAMPS[Math.min(RAMPS.length - 1, Math.max(0, band | 0))];
const hasGrass = band => band <= 1;

/** A rounded stone: lit upper-left, shadowed lower-right, and a one-pixel cast shadow on the ground beside it. */
function pebble(tile, x, y, ramp, size) {
    const w = S(size) + 1, h = S(size);
    const inside = (dx, dy) => {
        if (dx < 0 || dy < 0 || dx >= w || dy >= h) return false;
        const nx = (dx + .5) / w * 2 - 1, ny = (dy + .5) / h * 2 - 1;
        return nx * nx + ny * ny <= 1.08;
    };
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        if (!inside(dx, dy)) continue;
        const nx = (dx + .5) / w * 2 - 1, ny = (dy + .5) / h * 2 - 1, lit = -(nx + ny) * .5;
        tile.set(x + dx, y + dy, ramp[lit > .42 ? 4 : lit > .05 ? 3 : lit > -.35 ? 2 : 1]);
    }
    for (let dy = 0; dy <= h; dy++) for (let dx = 0; dx <= w; dx++)
        if (!inside(dx, dy) && (inside(dx - 1, dy) || inside(dx, dy - 1)) && !inside(dx - 1, dy - 1)) tile.set(x + dx, y + dy, ramp[0]);
}

function crackLine(tile, random, x, y, length, hex) {
    let direction = random() < .5 ? 1 : -1;
    for (let i = 0; i < length; i++) {
        tile.set(x, y, hex);
        if (random() < .55) x += direction; else y += 1;
        if (random() < .2) direction = -direction;
    }
}

/** A curved blade: dark at the root, brightening to a lit tip, leaning more toward the top. */
function blade(tile, x, y, lean, ramp, height = S(4)) {
    for (let i = 0; i < height; i++) {
        const t = i / (height - 1);
        tile.set(x + Math.round(lean * t * t * 2), y - i, ramp[i === 0 ? 1 : t < .35 ? 2 : t < .8 ? 3 : 4]);
    }
}

const rand = (random, limit = SIZE) => Math.floor(random() * limit);

/** Grass top: mottled green with hand-placed blade tufts, a few bare flecks and pebbles. */
function grassTop(band, seed, ramps = rampsForBand(band)) {
    const tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, P(4)), mid = wrapNoise(seed + 2, P(8)), fine = wrapNoise(seed + 3, P(16));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const value = .3 + broad(x / SIZE, y / SIZE) * .3 + (mid(x / SIZE, y / SIZE) - .5) * .14 + (fine(x / SIZE, y / SIZE) - .5) * .08;
        tile.set(x, y, dithered(ramps.grass, value, x, y, .34));
    }
    for (let i = 0; i < C(3); i++) { // darker clover-like clumps give the lawn depth
        const cx = rand(random), cy = rand(random);
        for (let dy = -S(1); dy <= S(1); dy++) for (let dx = -S(1.4); dx <= S(1.4); dx++)
            if ((dx / S(1.4)) ** 2 + (dy / S(1)) ** 2 <= 1.05) tile.set(cx + dx, cy + dy, ramps.grass[1]);
        for (let dx = -S(1); dx <= S(1); dx++) tile.set(cx + dx, cy - S(1) - 1, ramps.grass[3]);
    }
    for (let i = 0; i < C(20); i++) blade(tile, rand(random), S(3) + rand(random, SIZE - S(3)), random() < .5 ? -1 : 1, ramps.grass, S(3) + rand(random, S(2)));
    for (let i = 0; i < C(5); i++) tile.set(rand(random), rand(random), ramps.dirt[3]);
    for (let i = 0; i < C(.3); i++) pebble(tile, rand(random, SIZE - S(3)), rand(random, SIZE - S(3)), ramps.stone, 2);
    return tile;
}

/** Packed earth top: grain, pebbles with a lit corner and a cast shadow, a few hairline cracks. */
function dirtTop(band, seed, ash = false, ramps = rampsForBand(band), cracks = C(1)) {
    const ramp = ash ? ramps.stone : ramps.dirt, tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, P(4)), fine = wrapNoise(seed + 2, P(32));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const value = .3 + broad(x / SIZE, y / SIZE) * .3 + (fine(x / SIZE, y / SIZE) - .5) * .2;
        tile.set(x, y, dithered(ramp, value, x, y));
    }
    for (let i = 0; i < C(12); i++) tile.set(rand(random), rand(random), ramp[4]);
    for (let i = 0; i < C(14); i++) tile.set(rand(random), rand(random), ramp[0]);
    for (let i = 0; i < C(3); i++) pebble(tile, rand(random), rand(random), ramps.stone, random() < .4 ? 3 : 2);
    for (let i = 0; i < cracks; i++) crackLine(tile, random, rand(random), rand(random), S(8) + rand(random, S(8)), ramp[0]);
    return tile;
}

/** The trodden road: lighter, packed and even, with scattered pebbles and crushed-grass flecks, and no cracks. */
function pathTop(band, seed) {
    const ramps = rampsForBand(band), random = rng(seed), tile = new Tile();
    const broad = wrapNoise(seed + 1, P(3)), fine = wrapNoise(seed + 2, P(24)), ruts = wrapNoise(seed + 3, P(6));
    const ramp = ramps.dirt.map(hex => liftHex(hex, 1.18));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const value = .46 + (broad(x / SIZE, y / SIZE) - .5) * .22 + (fine(x / SIZE, y / SIZE) - .5) * .12 + (ruts(x / SIZE, y / SIZE) - .5) * .1;
        tile.set(x, y, dithered(ramp, value, x, y, .22));
    }
    for (let i = 0; i < C(9); i++) tile.set(rand(random), rand(random), ramp[4]);
    for (let i = 0; i < C(8); i++) tile.set(rand(random), rand(random), ramp[1]);
    for (let i = 0; i < C(1.4); i++) pebble(tile, rand(random), rand(random), ramps.stone, random() < .3 ? 3 : 2);
    if (hasGrass(band)) for (let i = 0; i < C(2); i++) blade(tile, rand(random), S(3) + rand(random, SIZE - S(3)), random() < .5 ? -1 : 1, ramps.grass, S(2));
    return tile;
}

/** Irregular plates (nearest-site cells on the wrapping texture) with the distance to the nearest joint, used for flagstones and crust. */
function plates(seed, count, stretch = 1) {
    const random = rng(seed);
    const sites = Array.from({ length: count }, () => ({ x: random() * SIZE, y: random() * SIZE, tone: .22 + random() * .5 }));
    const ids = new Int16Array(SIZE * SIZE), edges = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        let best = 0, first = Infinity, second = Infinity;
        for (let index = 0; index < sites.length; index++) {
            const site = sites[index];
            const dx = Math.min(Math.abs(x - site.x), SIZE - Math.abs(x - site.x)), dy = Math.min(Math.abs(y - site.y), SIZE - Math.abs(y - site.y)) * stretch;
            const distance = Math.hypot(dx, dy);
            if (distance < first) { second = first; first = distance; best = index; } else if (distance < second) second = distance;
        }
        ids[y * SIZE + x] = best; edges[y * SIZE + x] = second - first;
    }
    const wrap = v => ((v % SIZE) + SIZE) % SIZE;
    const edge = (x, y) => edges[wrap(y) * SIZE + wrap(x)];
    const height = (x, y) => Math.min(1, edge(x, y) / (5 * K));
    return { sites, id: (x, y) => ids[wrap(y) * SIZE + wrap(x)], edge, height,
        /** Positive where the surface faces the upper-left light. */
        lit: (x, y) => (height(x + 1, y + 1) - height(x - 1, y - 1)) * K };
}

/** Flagstone top: rounded, bevelled plates lit from the upper left, dark joints, hairline cracks, lichen and, in the wet land, moss. */
function stoneTop(band, seed, count = 3) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const field = plates(seed, C(count), 1.15), grain = wrapNoise(seed + 3, P(32)), moss = wrapNoise(seed + 4, P(4));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const edge = field.edge(x, y), site = field.sites[field.id(x, y)];
        if (edge < 1.1 * K) { tile.set(x, y, ramp[0]); continue; }
        const value = .42 + (site.tone - .47) * .26 + field.height(x, y) * .08 + field.lit(x, y) * .3 + (grain(x / SIZE, y / SIZE) - .5) * .05;
        let color = dithered(ramp, value, x, y, .1);
        if (band === 0 && moss(x / SIZE, y / SIZE) > .64 && field.height(x, y) < .9 && bayer(x, y) < .6) color = ramps.moss;
        tile.set(x, y, color);
    }
    for (let i = 0; i < C(1); i++) crackLine(tile, random, rand(random), rand(random), S(6) + rand(random, S(8)), ramp[1]);
    for (let i = 0; i < C(2); i++) tile.set(rand(random), rand(random), ramp[random() < .5 ? 1 : 4]);
    return tile;
}

/**
 * Calm bedrock: broad, softly faceted slabs with a slow drift of tone and almost no cracks, the quiet counterpart of the cracked flagstone,
 * for the tops of ridges and the bare ground between outcrops.
 */
function slabTop(band, seed) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const field = plates(seed, C(.55), 1.1), drift = wrapNoise(seed + 5, P(2)), mid = wrapNoise(seed + 6, P(7)), grain = wrapNoise(seed + 7, P(40));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const edge = field.edge(x, y), site = field.sites[field.id(x, y)];
        const joint = edge < .9 * K;
        const value = .5 + (site.tone - .47) * .06 + (drift(x / SIZE, y / SIZE) - .5) * .05 + (mid(x / SIZE, y / SIZE) - .5) * .03
            + (grain(x / SIZE, y / SIZE) - .5) * .02 + field.lit(x, y) * .12 - (joint ? .3 : 0);
        tile.set(x, y, dithered(ramp, value, x, y, .06));
    }
    for (let i = 0; i < C(.25); i++) crackLine(tile, random, rand(random), rand(random), S(7) + rand(random, S(6)), ramp[1]);
    for (let i = 0; i < C(1.2); i++) tile.set(rand(random), rand(random), ramp[random() < .5 ? 1 : 3]);
    if (band === 0) for (let i = 0; i < C(6); i++) tile.set(rand(random), rand(random), ramps.moss);
    return tile;
}

/** Soil side: strata bands, hanging roots, embedded pebbles; the grass overhang variant hangs a scalloped lip over it. Wraps vertically. */
function dirtSide(band, seed, withLip) {
    const ramps = rampsForBand(band), ramp = ramps.dirt, tile = new Tile(), random = rng(seed);
    const strata = wrapNoise(seed + 1, P(4)), fine = wrapNoise(seed + 2, P(32));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const band4 = strata(x / SIZE * .5, y / SIZE * 2) * .5;
        const value = .12 + band4 + (fine(x / SIZE, y / SIZE) - .5) * .35;
        tile.set(x, y, dithered(ramp.map((_, i) => ramp[Math.max(0, i - 1)]), value, x, y));
    }
    for (let i = 0; i < C(9); i++) pebble(tile, rand(random, SIZE - S(3)), rand(random), ramps.stone, random() < .5 ? 2 : 1);
    for (let i = 0; i < C(5); i++) { // roots hang as thin darker-lighter pairs
        const x = rand(random), y = rand(random), length = S(4) + rand(random, S(6));
        for (let d = 0; d < length; d++) { tile.set(x + (d > S(4) ? 1 : 0), y + d, ramp[1]); tile.set(x + 1 + (d > S(4) ? 1 : 0), y + d, ramp[3]); }
    }
    if (withLip && hasGrass(band)) paintGrassLip(tile, random, ramps, ramp);
    return tile;
}

/**
 * The grass overhang painted over the top rows of a wall texture: a scalloped lip with a dark contact shadow under it. Depths are drawn per
 * 32 px column and interpolated, so the scallops are smooth curves at the finer grid, and they wrap with the texture.
 */
function paintGrassLip(tile, random, ramps, under) {
    const columns = 32 * MEGA;
    const cells = Array.from({ length: columns }, () => 7 + random() * 4.5);
    const depthAt = x => { const f = x / K, i = Math.floor(f), t = f - i; return S((cells[i % columns] * (1 - t) + cells[(i + 1) % columns] * t + cells[(i + columns - 1) % columns] * .6) / 1.6); };
    for (let x = 0; x < SIZE; x++) {
        const smooth = depthAt(x);
        for (let y = 0; y < smooth; y++) tile.set(x, y, y <= 1 ? ramps.grass[3] : y >= smooth - 2 ? ramps.grass[1] : dithered(ramps.grass, .3 + random() * .3, x, y));
        tile.set(x, smooth, under[0]);
        tile.set(x, smooth + 1, under[0]);
        tile.set(x, smooth + 2, under[1]);
        if (random() < .2) { tile.set(x, smooth + 2, ramps.grass[2]); tile.set(x, smooth + 3, ramps.grass[1]); tile.set(x, smooth + 4, ramps.grass[1]); }
    }
    for (let i = 0; i < C(14); i++) tile.set(rand(random), rand(random, 2), ramps.grass[4]);
}

/**
 * Rock face in the manner of a sea cliff: wavy strata of uneven thickness, each with a lit upper edge and a shadowed lower lip where it
 * overhangs the layer below, vertical fractures, spalls and, in the wet land, moss dripping from the ledges. Wraps on both axes.
 */
function stoneSide(band, seed) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const count = 5 * MEGA;
    const weights = Array.from({ length: count }, () => .6 + random()), total = weights.reduce((a, b) => a + b, 0);
    let cursor = 0;
    const layers = weights.map((weight, i) => {
        const start = cursor; cursor += weight / total * SIZE;
        return { start, tone: .3 + random() * .26, wave: wrapNoise(seed + 10 + i, P(4)), amplitude: (3 + random() * 4) * K };
    });
    const grain = wrapNoise(seed + 1, P(32)), wrapY = y => ((y % SIZE) + SIZE) % SIZE;
    const boundary = (layer, x) => layer.start + (layer.wave(x / SIZE, layer.start / SIZE) - .5) * 2 * layer.amplitude;
    for (let x = 0; x < SIZE; x++) {
        const edges = layers.map(layer => boundary(layer, x));
        for (let y = 0; y < SIZE; y++) {
            let index = layers.length - 1;
            for (let i = 0; i < layers.length; i++) if (edges[i] <= y + (edges[i] < 0 ? SIZE : 0) && wrapY(edges[i]) <= y) index = i;
            const layer = layers[index], below = y - wrapY(edges[index]), next = wrapY(edges[(index + 1) % layers.length]) - y;
            const wrappedBelow = below < 0 ? below + SIZE : below, wrappedNext = next <= 0 ? next + SIZE : next;
            let value = layer.tone + (grain(x / SIZE * .6, y / SIZE * 2.5) - .5) * .18;
            if (wrappedBelow < 1.4 * K) value += .14;                // lit upper edge of the layer
            else if (wrappedNext < 2.6 * K) value -= .12 + (2.6 * K - wrappedNext) * .035 / K; // shadowed lower lip
            tile.set(x, y, dithered(ramp, value, x, y, .08));
        }
    }
    for (let i = 0; i < C(1); i++) { // a vertical fracture, a lit pixel on the lee side
        let x = rand(random), y = rand(random);
        for (let d = 0, length = S(10) + rand(random, S(14)); d < length; d++) {
            tile.set(x, y + d, ramp[0]); tile.set(x - 1, y + d, ramp[3]);
            if (random() < .2) x += random() < .5 ? -1 : 1;
        }
    }
    for (let i = 0; i < C(2); i++) { const x = rand(random), y = rand(random); for (let dy = 0; dy < S(2); dy++) for (let dx = 0; dx < S(3); dx++) tile.set(x + dx, y + dy, ramp[dy < S(1) ? 4 : 2]); }
    if (band === 0) for (let i = 0; i < C(24); i++) { const x = rand(random), y = rand(random); tile.set(x, y, ramps.moss); if (random() < .6) tile.set(x, y + 1, ramps.moss); if (random() < .4) tile.set(x, y + 2, ramps.moss); }
    return tile;
}

/** Rock face under a turf cap: the strata with a grass overhang over the top rows, so a hill is grass above and stone below. */
function stoneGrassSide(band, seed) {
    const ramps = rampsForBand(band), tile = stoneSide(band, seed);
    if (hasGrass(band)) paintGrassLip(tile, rng(seed + 983), ramps, ramps.stone);
    return tile;
}

/** Rock face with a rounded rocky crest (no turf): lobes of lit rock bulge over the strata; the whole texture wraps, so blocks join. */
function stoneLip(band, seed) {
    const ramp = rampsForBand(band).stone, tile = stoneSide(band, seed), random = rng(seed + 977);
    const depth = new Int16Array(SIZE).fill(S(3));
    for (let lobe = 0; lobe < 3 * MEGA; lobe++) {
        const centre = S(8 + lobe * 8) + rand(random, S(3)), radius = S(3) + rand(random, S(2)), amplitude = S(2) + rand(random, S(3));
        for (let x = -radius; x < SIZE + radius; x++) {
            const d = (x - centre) / radius;
            if (Math.abs(d) < 1) { const wrapped = ((x % SIZE) + SIZE) % SIZE; depth[wrapped] = Math.max(depth[wrapped], S(3) + Math.round(amplitude * Math.sqrt(1 - d * d))); }
        }
    }
    for (let x = 0; x < SIZE; x++) {
        const d = depth[x];
        for (let y = 0; y < d; y++) tile.set(x, y, y < K ? ramp[4] : y < d - K ? ramp[3] : ramp[2]);
        for (let y = 0; y < K; y++) { tile.set(x, d + y, ramp[0]); tile.set(x, d + K + y, ramp[1]); }
    }
    return tile;
}
// Molten rock: the one place saturation is allowed. Dark bevelled crust plates, thin glowing cracks of uneven heat and a few molten pools.
const LAVA = Object.freeze(['#1f0a07', '#4a150b', '#8f2a0d', '#d9561a', '#ffb347']);

function lavaTop(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, P(32)), pool = wrapNoise(seed + 2, P(4)), heat = wrapNoise(seed + 5, P(4));
    const field = plates(seed, C(6), 1);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const edge = field.edge(x, y), hot = heat(x / SIZE, y / SIZE);
        let color;
        if (edge < 1.1 * K) color = hot > .66 ? LAVA[random() < .12 ? 4 : 3] : LAVA[0];
        else if (edge < 2 * K && hot > .72) color = LAVA[2];
        else color = dithered(LAVA.slice(0, 3), .12 + field.height(x, y) * .12 + field.lit(x, y) * 1.1 + (grain(x / SIZE, y / SIZE) - .5) * .3, x, y);
        const molten = pool(x / SIZE, y / SIZE);
        if (molten > .86 && edge > 1.1 * K) color = LAVA[molten > .93 ? 4 : 3];
        tile.set(x, y, color);
    }
    void band;
    return tile;
}

function lavaSide(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, P(32));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) tile.set(x, y, dithered(LAVA, .08 + (grain(x / SIZE, y / SIZE) - .5) * .3, x, y));
    for (let i = 0; i < C(8); i++) {
        const x = rand(random), y = rand(random), length = S(6) + rand(random, S(14));
        for (let d = 0; d < length; d++) { tile.set(x, y + d, LAVA[d < 3 || d > length - 4 ? 3 : 4]); tile.set(x + 1, y + d, LAVA[d < 3 || d > length - 4 ? 2 : 3]); }
        for (let d = 2; d < length - 2; d++) tile.set(x + 2, y + d, LAVA[2]);
    }
    void band;
    return tile;
}
const mixHex = (a, b, t) => {
    const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
    return `#${[r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
};

/** Grass that has dried to the colour of the earth beneath it. */
function dryGrassTop(band, seed) {
    const ramps = rampsForBand(band);
    return grassTop(band, seed, { ...ramps, grass: ramps.grass.map((color, i) => mixHex(color, ramps.dirt[Math.min(4, i + 1)], .55)) });
}

/** Damp, dark earth with glossy puddle blotches where the ground has never drained. */
function mudTop(band, seed) {
    const ramps = rampsForBand(band), wet = ramps.dirt.map(color => mixHex(color, '#0a0807', .38));
    const tile = dirtTop(band, seed, false, { ...ramps, dirt: wet }, C(.4)), puddle = wrapNoise(seed + 9, P(4)), random = rng(seed + 3);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const value = puddle(x / SIZE, y / SIZE);
        if (value > .7) tile.set(x, y, value > .78 ? wet[0] : wet[1]);
    }
    for (let i = 0; i < C(10); i++) { const x = rand(random), y = rand(random); if (tile.get(x, y) === wet[0]) tile.set(x, y, ramps.stone[3]); }
    return tile;
}

/**
 * Tangent-space normal map for a tile, derived from its luminance as a height field (dark crevices low, lit edges high) with a Sobel
 * filter over the wrapping tile. Convention: OpenGL / three.js, R = +x to the right, G = +y toward the top of the image, B = out of the
 * surface; a flat pixel is (128, 128, 255). `tilt` leans every normal toward the viewer (down the image) for walls that face south.
 */
export function normalFromTile(tile, strength = 2.4, tilt = 0) {
    const { width, height } = tile;
    const out = new Uint8ClampedArray(width * height * 4);
    const luma = new Float32Array(width * height);
    for (let i = 0; i < luma.length; i++) luma[i] = (tile.data[i * 4] * .299 + tile.data[i * 4 + 1] * .587 + tile.data[i * 4 + 2] * .114) / 255;
    const at = (x, y) => luma[(((y % height) + height) % height) * width + (((x % width) + width) % width)];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        // Light 3-tap smoothing keeps single-pixel noise from becoming a pinprick of relief.
        const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 4;
        const dyDown = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 4;
        let nx = -dx * strength, ny = dyDown * strength, nz = 1;
        if (tilt) { ny -= tilt; nz = 1 - tilt * .45; }
        const length = Math.hypot(nx, ny, nz);
        const i = (y * width + x) * 4;
        out[i] = Math.round((nx / length * .5 + .5) * 255);
        out[i + 1] = Math.round((ny / length * .5 + .5) * 255);
        out[i + 2] = Math.round((nz / length * .5 + .5) * 255);
        out[i + 3] = 255;
    }
    return out;
}

/** Kept for callers that index a variant: every kind is one seamless texture now. */
export const TILE_VARIANTS = 1;
/** One band's full set: one seamless texture per kind (an array of one, for the old variant indexing). */
export function generateTileSet(band) {
    const one = (builder, seed) => [builder(band, seed)];
    return {
        grassTop: one(grassTop, 11), dirtTop: one((b, s) => dirtTop(b, s), 23), ashTop: one((b, s) => dirtTop(b, s, true), 31), stoneTop: one(stoneTop, 41),
        slabTop: one(slabTop, 47), pathTop: one(pathTop, 59),
        grassDryTop: one(dryGrassTop, 113), mudTop: one(mudTop, 127), rubbleTop: one((b, s) => stoneTop(b, s, 7), 139),
        stoneLipSide: one(stoneLip, 71), stoneGrassSide: one(stoneGrassSide, 71), grassSide: one((b, s) => dirtSide(b, s, true), 67),
        dirtSide: one((b, s) => dirtSide(b, s, false), 67), stoneSide: one(stoneSide, 71),
        lavaTop: one(lavaTop, 83), lavaSide: one(lavaSide, 97),
    };
}

/** Every column now samples the same texture at its own block position, so there is no per-column variant. */
export function variantFor() { return 0; }

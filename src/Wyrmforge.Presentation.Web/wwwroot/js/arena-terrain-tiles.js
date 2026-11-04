// Hunt 1.0 terrain tiles: original 64 x 64 native-pixel art for the top and front face of one 1 m block (64 art pixels per metre, owner
// decision 4 November 2026), generated from rules (ramps, ordered dither, blade tufts, rounded pebbles, slab cracks) so every pixel is placed
// on purpose. Not copied from any pack: the owner's reference folder only informed the principles (hand-placed highlights, scalloped grass lip,
// slab edges, 5-step ramps, dark gothic). Pure pixel buffers, so the same code runs in the browser and in the Node preview tool.
// Top tiles wrap, so neighbours never seam. Feature sizes are written in the old 32 px grid and multiplied by K, so the art keeps its
// world scale while every edge, highlight and crack now has twice the resolution.
export const TILE = 64;
const K = TILE / 32;
/** A length or count authored on the 32 px grid, on this tile's grid. */
const S = value => Math.round(value * K);

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
    constructor() { this.data = new Uint8ClampedArray(TILE * TILE * 4); }
    set(x, y, hex) {
        const px = ((Math.round(x) % TILE) + TILE) % TILE, py = ((Math.round(y) % TILE) + TILE) % TILE, i = (py * TILE + px) * 4;
        const [r, g, b] = hexRgb(hex);
        this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    }
    setClipped(x, y, hex) { if (x >= 0 && x < TILE && y >= 0 && y < TILE) this.set(x, y, hex); }
    get(x, y) {
        const px = ((Math.round(x) % TILE) + TILE) % TILE, py = ((Math.round(y) % TILE) + TILE) % TILE, i = (py * TILE + px) * 4;
        return `#${((this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2]).toString(16).padStart(6, '0')}`;
    }
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x, y) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + .5) / 16;

// Tileable value noise: the lattice wraps every `period` cells so a tile repeats without a seam.
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

/** Grass top: mottled green with hand-placed blade tufts, a few bare flecks and pebbles. */
function grassTop(band, seed, ramps = rampsForBand(band)) {
    const tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, 4), mid = wrapNoise(seed + 2, 8), fine = wrapNoise(seed + 3, 16);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const value = .3 + broad(x / TILE, y / TILE) * .3 + (mid(x / TILE, y / TILE) - .5) * .14 + (fine(x / TILE, y / TILE) - .5) * .08;
        tile.set(x, y, dithered(ramps.grass, value, x, y, .34));
    }
    for (let i = 0; i < 3; i++) { // darker clover-like clumps give the lawn depth
        const cx = Math.floor(random() * TILE), cy = Math.floor(random() * TILE);
        for (let dy = -S(1); dy <= S(1); dy++) for (let dx = -S(1.4); dx <= S(1.4); dx++)
            if ((dx / S(1.4)) ** 2 + (dy / S(1)) ** 2 <= 1.05) tile.set(cx + dx, cy + dy, ramps.grass[1]);
        for (let dx = -S(1); dx <= S(1); dx++) tile.set(cx + dx, cy - S(1) - 1, ramps.grass[3]);
    }
    for (let i = 0; i < 24; i++) blade(tile, Math.floor(random() * TILE), S(3) + Math.floor(random() * (TILE - S(3))), random() < .5 ? -1 : 1, ramps.grass, S(3) + Math.floor(random() * S(2)));
    for (let i = 0; i < 5; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramps.dirt[3]);
    if (random() < .3) pebble(tile, Math.floor(random() * (TILE - S(3))), Math.floor(random() * (TILE - S(3))), ramps.stone, 2);
    return tile;
}

/** Packed earth top: grain, pebbles with a lit corner and a cast shadow, a few hairline cracks. */
function dirtTop(band, seed, ash = false, ramps = rampsForBand(band)) {
    const ramp = ash ? ramps.stone : ramps.dirt, tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, 4), fine = wrapNoise(seed + 2, 32);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const value = .3 + broad(x / TILE, y / TILE) * .3 + (fine(x / TILE, y / TILE) - .5) * .2;
        tile.set(x, y, dithered(ramp, value, x, y));
    }
    for (let i = 0; i < 12; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[4]);
    for (let i = 0; i < 14; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[0]);
    for (let i = 0; i < 3; i++) pebble(tile, Math.floor(random() * TILE), Math.floor(random() * TILE), ramps.stone, random() < .4 ? 3 : 2);
    crackLine(tile, random, Math.floor(random() * TILE), Math.floor(random() * TILE), S(8) + Math.floor(random() * S(8)), ramp[0]);
    return tile;
}

/** Irregular plates (nearest-site cells on the wrapping tile) with the distance to the nearest joint, used for flagstones and crust. */
function plates(seed, count, stretch = 1) {
    const random = rng(seed);
    const sites = Array.from({ length: count }, () => ({ x: random() * TILE, y: random() * TILE, tone: .22 + random() * .5 }));
    const ids = new Int8Array(TILE * TILE), edges = new Float32Array(TILE * TILE);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        let best = 0, first = Infinity, second = Infinity;
        sites.forEach((site, index) => {
            const dx = Math.min(Math.abs(x - site.x), TILE - Math.abs(x - site.x)), dy = Math.min(Math.abs(y - site.y), TILE - Math.abs(y - site.y)) * stretch;
            const distance = Math.hypot(dx, dy);
            if (distance < first) { second = first; first = distance; best = index; } else if (distance < second) second = distance;
        });
        ids[y * TILE + x] = best; edges[y * TILE + x] = second - first;
    }
    const wrap = v => ((v % TILE) + TILE) % TILE;
    const edge = (x, y) => edges[wrap(y) * TILE + wrap(x)];
    const height = (x, y) => Math.min(1, edge(x, y) / (5 * K));
    return { sites, id: (x, y) => ids[wrap(y) * TILE + wrap(x)], edge, height,
        /** Positive where the surface faces the upper-left light. */
        lit: (x, y) => (height(x + 1, y + 1) - height(x - 1, y - 1)) * K };
}

/** Flagstone top: rounded, bevelled plates lit from the upper left, dark joints, hairline cracks, lichen and, in the wet land, moss. */
function stoneTop(band, seed, count = 3) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const field = plates(seed, count, 1.15), grain = wrapNoise(seed + 3, 32), moss = wrapNoise(seed + 4, 4);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const edge = field.edge(x, y), site = field.sites[field.id(x, y)];
        if (edge < 1.1 * K) { tile.set(x, y, ramp[0]); continue; }
        const value = .42 + (site.tone - .47) * .26 + field.height(x, y) * .08 + field.lit(x, y) * .3 + (grain(x / TILE, y / TILE) - .5) * .05;
        let color = dithered(ramp, value, x, y, .1);
        if (band === 0 && moss(x / TILE, y / TILE) > .64 && field.height(x, y) < .9 && bayer(x, y) < .6) color = ramps.moss;
        tile.set(x, y, color);
    }
    crackLine(tile, random, Math.floor(random() * TILE), Math.floor(random() * TILE), S(6) + Math.floor(random() * S(8)), ramp[1]);
    for (let i = 0; i < 2; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[random() < .5 ? 1 : 4]);
    return tile;
}
/** Soil side: strata bands, hanging roots, embedded pebbles. Tiles vertically, so any height can be cut from it. */
function dirtSide(band, seed, withLip) {
    const ramps = rampsForBand(band), ramp = ramps.dirt, tile = new Tile(), random = rng(seed);
    const strata = wrapNoise(seed + 1, 4), fine = wrapNoise(seed + 2, 32);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const band4 = strata(x / TILE * .5, y / TILE * 2) * .5;
        const value = .12 + band4 + (fine(x / TILE, y / TILE) - .5) * .35;
        tile.set(x, y, dithered(ramp.map((_, i) => ramp[Math.max(0, i - 1)]), value, x, y));
    }
    for (let i = 0; i < 9; i++) pebble(tile, Math.floor(random() * (TILE - S(3))), Math.floor(random() * TILE), ramps.stone, random() < .5 ? 2 : 1);
    for (let i = 0; i < 5; i++) { // roots hang as thin darker-lighter pairs
        const x = Math.floor(random() * TILE), y = Math.floor(random() * S(20)), length = S(4) + Math.floor(random() * S(6));
        for (let d = 0; d < length; d++) { tile.set(x + (d > S(4) ? 1 : 0), y + d, ramp[1]); tile.set(x + 1 + (d > S(4) ? 1 : 0), y + d, ramp[3]); }
    }
    if (withLip && hasGrass(band)) {
        // The grass overhang: a scalloped lip hangs over the soil, with a dark contact shadow under it. Depths are drawn per 32 px column
        // and interpolated, so the scallops are smooth curves at the finer grid.
        const cells = Array.from({ length: 32 }, () => 5 + random() * 3.6);
        const depthAt = x => { const f = x / K, i = Math.floor(f), t = f - i; return S((cells[i % 32] * (1 - t) + cells[(i + 1) % 32] * t + cells[(i + 31) % 32] * .6) / 1.6); };
        for (let x = 0; x < TILE; x++) {
            const smooth = depthAt(x);
            for (let y = 0; y < smooth; y++) tile.set(x, y, y <= 1 ? ramps.grass[3] : y >= smooth - 2 ? ramps.grass[1] : dithered(ramps.grass, .3 + random() * .3, x, y));
            tile.set(x, smooth, ramp[0]);
            tile.set(x, smooth + 1, ramp[0]);
            tile.set(x, smooth + 2, ramp[1]);
            if (random() < .2) { tile.set(x, smooth + 2, ramps.grass[2]); tile.set(x, smooth + 3, ramps.grass[1]); tile.set(x, smooth + 4, ramps.grass[1]); }
        }
        for (let i = 0; i < 14; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * 2), ramps.grass[4]);
    }
    return tile;
}

/**
 * Rock face in the manner of a sea cliff: wavy strata of uneven thickness, each with a lit upper edge and a shadowed lower lip where it
 * overhangs the layer below, vertical fractures, spalls and, in the wet land, moss dripping from the ledges. Tiles vertically.
 */
function stoneSide(band, seed) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const weights = Array.from({ length: 5 }, () => .6 + random()), total = weights.reduce((a, b) => a + b, 0);
    let cursor = 0;
    const layers = weights.map((weight, i) => {
        const start = cursor; cursor += weight / total * TILE;
        return { start, tone: .3 + random() * .26, wave: wrapNoise(seed + 10 + i, 4), amplitude: (3 + random() * 4) * K };
    });
    const grain = wrapNoise(seed + 1, 32), wrapY = y => ((y % TILE) + TILE) % TILE;
    const boundary = (layer, x) => layer.start + (layer.wave(x / TILE, layer.start / TILE) - .5) * 2 * layer.amplitude;
    for (let x = 0; x < TILE; x++) {
        const edges = layers.map(layer => boundary(layer, x));
        for (let y = 0; y < TILE; y++) {
            let index = layers.length - 1;
            for (let i = 0; i < layers.length; i++) if (edges[i] <= y + (edges[i] < 0 ? TILE : 0) && wrapY(edges[i]) <= y) index = i;
            const layer = layers[index], below = y - wrapY(edges[index]), next = wrapY(edges[(index + 1) % layers.length]) - y;
            const wrappedBelow = below < 0 ? below + TILE : below, wrappedNext = next <= 0 ? next + TILE : next;
            let value = layer.tone + (grain(x / TILE * .6, y / TILE * 2.5) - .5) * .18;
            if (wrappedBelow < 1.4 * K) value += .14;                // lit upper edge of the layer
            else if (wrappedNext < 2.6 * K) value -= .12 + (2.6 * K - wrappedNext) * .035 / K; // shadowed lower lip
            tile.set(x, y, dithered(ramp, value, x, y, .08));
        }
    }
    { // a vertical fracture, a lit pixel on the lee side
        let x = Math.floor(random() * TILE), y = Math.floor(random() * TILE);
        for (let d = 0, length = S(10) + Math.floor(random() * S(14)); d < length; d++) {
            tile.set(x, y + d, ramp[0]); tile.set(x - 1, y + d, ramp[3]);
            if (random() < .2) x += random() < .5 ? -1 : 1;
        }
    }
    for (let i = 0; i < 2; i++) { const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE); for (let dy = 0; dy < S(2); dy++) for (let dx = 0; dx < S(3); dx++) tile.set(x + dx, y + dy, ramp[dy < S(1) ? 4 : 2]); }
    if (band === 0) for (let i = 0; i < 24; i++) { const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE); tile.set(x, y, ramps.moss); if (random() < .6) tile.set(x, y + 1, ramps.moss); if (random() < .4) tile.set(x, y + 2, ramps.moss); }
    return tile;
}
/** Rock face with a scalloped crest: three rounded lobes of lit rock bulge over the strata; both edges share one baseline, so tiles join. */
function stoneLip(band, seed) {
    const ramp = rampsForBand(band).stone, tile = stoneSide(band, seed), random = rng(seed + 977);
    const depth = new Int16Array(TILE).fill(S(3));
    for (let lobe = 0; lobe < 3; lobe++) {
        const centre = S(8 + lobe * 8) + Math.floor(random() * S(3)), radius = S(3) + Math.floor(random() * S(2)), amplitude = S(2) + Math.floor(random() * S(3));
        for (let x = 0; x < TILE; x++) {
            const d = (x - centre) / radius;
            if (Math.abs(d) < 1) depth[x] = Math.max(depth[x], S(3) + Math.round(amplitude * Math.sqrt(1 - d * d)));
        }
    }
    for (let x = 0; x < TILE; x++) {
        const d = depth[x];
        for (let y = 0; y < d; y++) tile.set(x, y, y < K ? ramp[4] : y < d - K ? ramp[3] : ramp[2]);
        for (let y = 0; y < K; y++) { tile.set(x, d + y, ramp[0]); tile.set(x, d + K + y, ramp[1]); }
    }
    return tile;
}
// Molten rock: the one place saturation is allowed. Dark bevelled crust plates, thin glowing cracks of uneven heat and a few molten pools.
const LAVA = Object.freeze(['#1f0a07', '#4a150b', '#8f2a0d', '#d9561a', '#ffb347']);

function lavaTop(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, 32), pool = wrapNoise(seed + 2, 4), heat = wrapNoise(seed + 5, 4);
    const field = plates(seed, 6, 1);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const edge = field.edge(x, y), hot = heat(x / TILE, y / TILE);
        let color;
        if (edge < 1.1 * K) color = hot > .66 ? LAVA[random() < .12 ? 4 : 3] : LAVA[0];
        else if (edge < 2 * K && hot > .72) color = LAVA[2];
        else color = dithered(LAVA.slice(0, 3), .12 + field.height(x, y) * .12 + field.lit(x, y) * 1.1 + (grain(x / TILE, y / TILE) - .5) * .3, x, y);
        const molten = pool(x / TILE, y / TILE);
        if (molten > .86 && edge > 1.1 * K) color = LAVA[molten > .93 ? 4 : 3];
        tile.set(x, y, color);
    }
    void band;
    return tile;
}

function lavaSide(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, 32);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) tile.set(x, y, dithered(LAVA, .08 + (grain(x / TILE, y / TILE) - .5) * .3, x, y));
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE), length = S(6) + Math.floor(random() * S(14));
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
    const tile = dirtTop(band, seed, false, { ...ramps, dirt: wet }), puddle = wrapNoise(seed + 9, 4), random = rng(seed + 3);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const value = puddle(x / TILE, y / TILE);
        if (value > .7) tile.set(x, y, value > .78 ? wet[0] : wet[1]);
    }
    for (let i = 0; i < 10; i++) { const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE); if (tile.get(x, y) === wet[0]) tile.set(x, y, ramps.stone[3]); }
    return tile;
}
/** End grain of a trunk: growth rings, a dark bark rim and radial checks. Charred in the burning bands. */
function woodTop(band, seed) {
    const ramps = rampsForBand(band), ramp = band >= 2 ? ramps.stone : ramps.dirt, tile = new Tile(), random = rng(seed);
    const grain = wrapNoise(seed + 1, 16), cx = TILE / 2 - .5 + (random() - .5) * S(3), cy = TILE / 2 - .5 + (random() - .5) * S(3);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > S(13.5)) { tile.set(x, y, d > S(14.8) ? ramp[0] : ramp[1]); continue; }
        const ring = Math.sin(d * 1.25 / K + (grain(x / TILE, y / TILE) - .5) * 2.2);
        tile.set(x, y, dithered(ramp, .42 + ring * .16 + (grain(x / TILE, y / TILE) - .5) * .2, x, y));
    }
    for (let i = 0; i < 3; i++) { // radial checks
        const angle = random() * 6.28;
        for (let r = S(3); r < S(12); r++) tile.set(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, ramp[0]);
    }
    if (band >= 2) for (let i = 0; i < 12; i++) tile.set(Math.floor(S(8) + random() * S(16)), Math.floor(S(8) + random() * S(16)), LAVA[random() < .5 ? 2 : 3]);
    return tile;
}

/** Bark: deep vertical furrows with lit ridges, lichen in the wet land, glowing cracks in the burning bands. Tiles vertically. */
function woodSide(band, seed) {
    const ramps = rampsForBand(band), ramp = band >= 2 ? ramps.stone : ramps.dirt, tile = new Tile(), random = rng(seed);
    const furrow = wrapNoise(seed + 1, 8), grain = wrapNoise(seed + 2, 32);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const ridge = furrow(x / TILE, y / TILE * .35);
        const next = furrow((x + 1) / TILE, y / TILE * .35);
        let value = .22 + ridge * .5 + (grain(x / TILE, y / TILE) - .5) * .12;
        if (next < ridge - .015) value += .14; // lit edge on the left of a furrow
        tile.set(x, y, dithered(ramp, value, x, y));
    }
    if (band === 0) for (let i = 0; i < 20; i++) { const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE); tile.set(x, y, ramps.moss); if (random() < .5) tile.set(x, y + 1, ramps.moss); }
    if (band >= 2) for (let i = 0; i < 6; i++) { const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE), length = S(4) + Math.floor(random() * S(6)); for (let d = 0; d < length; d++) tile.set(x, y + d, LAVA[d % 3 === 0 ? 3 : 2]); }
    return tile;
}

/**
 * Tangent-space normal map for a tile, derived from its luminance as a height field (dark crevices low, lit edges high) with a Sobel
 * filter over the wrapping tile. Convention: OpenGL / three.js, R = +x to the right, G = +y toward the top of the image, B = out of the
 * surface; a flat pixel is (128, 128, 255). `tilt` leans every normal toward the viewer (down the image) for walls that face south.
 */
export function normalFromTile(tile, strength = 2.4, tilt = 0) {
    const out = new Uint8ClampedArray(TILE * TILE * 4);
    const luma = new Float32Array(TILE * TILE);
    for (let i = 0; i < luma.length; i++) luma[i] = (tile.data[i * 4] * .299 + tile.data[i * 4 + 1] * .587 + tile.data[i * 4 + 2] * .114) / 255;
    const at = (x, y) => luma[(((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE)];
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        // Light 3-tap smoothing keeps single-pixel noise from becoming a pinprick of relief.
        const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 4;
        const dyDown = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 4;
        let nx = -dx * strength, ny = dyDown * strength, nz = 1;
        if (tilt) { ny -= tilt; nz = 1 - tilt * .45; }
        const length = Math.hypot(nx, ny, nz);
        const i = (y * TILE + x) * 4;
        out[i] = Math.round((nx / length * .5 + .5) * 255);
        out[i + 1] = Math.round((ny / length * .5 + .5) * 255);
        out[i + 2] = Math.round((nz / length * .5 + .5) * 255);
        out[i + 3] = 255;
    }
    return out;
}

export const TILE_VARIANTS = 8;
/** One band's full set: variants of every tile kind. Index with `variantFor`. */
export function generateTileSet(band) {
    const make = (builder, base) => Array.from({ length: TILE_VARIANTS }, (_, i) => builder(band, base + i * 101));
    return {
        grassTop: make(grassTop, 11), dirtTop: make((b, s) => dirtTop(b, s), 23), ashTop: make((b, s) => dirtTop(b, s, true), 31), stoneTop: make(stoneTop, 41),
        grassDryTop: make(dryGrassTop, 113), mudTop: make(mudTop, 127), rubbleTop: make((b, s) => stoneTop(b, s, 7), 139),
        stoneLipSide: make(stoneLip, 181), grassSide: make((b, s) => dirtSide(b, s, true), 53), dirtSide: make((b, s) => dirtSide(b, s, false), 67), stoneSide: make(stoneSide, 71),
        lavaTop: make(lavaTop, 83), lavaSide: make(lavaSide, 97), woodTop: make(woodTop, 151), woodSide: make(woodSide, 163),
    };
}

export function variantFor(column, row) {
    let h = (Math.imul(column + 3, 0x9E3779B1) ^ Math.imul(row + 5, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return (h >>> 18) % TILE_VARIANTS;
}

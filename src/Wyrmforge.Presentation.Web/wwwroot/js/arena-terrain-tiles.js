// Hunt 1.0 terrain tiles: original 32 x 32 native-pixel art for the top and front face of one 1 m block, generated from rules (ramps,
// ordered dither, blade tufts, pebbles, slab cracks) so every pixel is placed on purpose. Not copied from any pack: the owner's
// reference folder only informed the principles (hand-placed highlights, scalloped grass lip, slab edges, 4-step ramps, dark gothic).
// Pure pixel buffers, so the same code runs in the browser and in the Node preview tool. Top tiles wrap, so neighbours never seam.
export const TILE = 32;

const hexRgb = hex => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };

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
        const px = ((x % TILE) + TILE) % TILE, py = ((y % TILE) + TILE) % TILE, i = (py * TILE + px) * 4;
        const [r, g, b] = hexRgb(hex);
        this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    }
    setClipped(x, y, hex) { if (x >= 0 && x < TILE && y >= 0 && y < TILE) this.set(x, y, hex); }
    get(x, y) {
        const px = ((x % TILE) + TILE) % TILE, py = ((y % TILE) + TILE) % TILE, i = (py * TILE + px) * 4;
        return `#${((this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2]).toString(16).padStart(6, '0')}`;
    }
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x, y) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + .5) / 16;

// Tileable value noise: the lattice wraps every `period` cells so a 32 px tile repeats without a seam.
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
function dithered(ramp, value, x, y) {
    let h = (Math.imul(x + 17, 0x9E3779B1) ^ Math.imul(y + 29, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    const jitter = ((h ^ (h >>> 13)) >>> 0) / 4294967296 - .5;
    const level = Math.round(Math.max(0, Math.min(1, value)) * (ramp.length - 1) + jitter * .7);
    return ramp[Math.max(0, Math.min(ramp.length - 1, level))];
}
// Ramps are [deepest shadow ... highlight]. Dark gothic: muted, desaturated, light kept low; colour saturation belongs to fire.
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
]);

export const rampsForBand = band => RAMPS[Math.min(RAMPS.length - 1, Math.max(0, band | 0))];
const hasGrass = band => band <= 1;

function pebble(tile, x, y, ramp, size) {
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) tile.set(x + dx, y + dy, ramp[dx === 0 && dy === 0 ? 4 : 3]);
    for (let d = 0; d <= size; d++) { tile.set(x + size, y + d, ramp[0]); tile.set(x + d, y + size, ramp[1]); }
}

function crackLine(tile, random, x, y, length, hex) {
    let direction = random() < .5 ? 1 : -1;
    for (let i = 0; i < length; i++) {
        tile.set(x, y, hex);
        if (random() < .55) x += direction; else y += 1;
        if (random() < .2) direction = -direction;
    }
}

function blade(tile, x, y, lean, ramp) {
    tile.set(x, y, ramp[1]); // shadow at the root
    tile.set(x, y - 1, ramp[2]);
    tile.set(x + lean, y - 2, ramp[3]);
    tile.set(x + lean, y - 3, ramp[4]); // lit tip
}

/** Grass top: mottled green with hand-placed blade tufts, a few bare flecks and pebbles. */
function grassTop(band, seed) {
    const ramps = rampsForBand(band), tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, 4), fine = wrapNoise(seed + 2, 8);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const value = .22 + broad(x / TILE, y / TILE) * .45 + (fine(x / TILE, y / TILE) - .5) * .35;
        tile.set(x, y, dithered(ramps.grass, value, x, y));
    }
    for (let i = 0; i < 7; i++) { // darker clover-like clumps give the lawn depth
        const cx = Math.floor(random() * TILE), cy = Math.floor(random() * TILE);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) tile.set(cx + dx, cy + dy, ramps.grass[1]);
        tile.set(cx, cy - 1, ramps.grass[3]);
    }
    for (let i = 0; i < 26; i++) blade(tile, Math.floor(random() * TILE), 3 + Math.floor(random() * (TILE - 3)), random() < .5 ? -1 : 1, ramps.grass);
    for (let i = 0; i < 6; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramps.dirt[3]);
    if (random() < .7) pebble(tile, Math.floor(random() * (TILE - 3)), Math.floor(random() * (TILE - 3)), ramps.stone, 2);
    return tile;
}

/** Packed earth top: grain, pebbles with a lit corner and a cast shadow, a few hairline cracks. */
function dirtTop(band, seed, ash = false) {
    const ramps = rampsForBand(band), ramp = ash ? ramps.stone : ramps.dirt, tile = new Tile(), random = rng(seed);
    const broad = wrapNoise(seed + 1, 4), fine = wrapNoise(seed + 2, 16);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const value = .2 + broad(x / TILE, y / TILE) * .4 + (fine(x / TILE, y / TILE) - .5) * .45;
        tile.set(x, y, dithered(ramp, value, x, y));
    }
    for (let i = 0; i < 14; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[4]);
    for (let i = 0; i < 18; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[0]);
    for (let i = 0; i < 4; i++) pebble(tile, Math.floor(random() * TILE), Math.floor(random() * TILE), ramps.stone, random() < .4 ? 3 : 2);
    for (let i = 0; i < 2; i++) crackLine(tile, random, Math.floor(random() * TILE), Math.floor(random() * TILE), 8 + Math.floor(random() * 8), ramp[0]);
    return tile;
}

/** Flagstone top: irregular slabs (nearest-site cells), dark joints, a lit upper-left lip on each slab, speckle and, in the wet land, moss. */
function stoneTop(band, seed) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const sites = Array.from({ length: 6 }, () => ({ x: random() * TILE, y: random() * TILE, tone: .3 + random() * .45 }));
    const owner = (x, y) => {
        let best = 0, bestDistance = Infinity;
        sites.forEach((site, index) => {
            const dx = Math.min(Math.abs(x - site.x), TILE - Math.abs(x - site.x)), dy = Math.min(Math.abs(y - site.y), TILE - Math.abs(y - site.y));
            const distance = dx * dx * .8 + dy * dy * 1.25;
            if (distance < bestDistance) { bestDistance = distance; best = index; }
        });
        return best;
    };
    const ids = Array.from({ length: TILE * TILE }, (_, i) => owner(i % TILE, Math.floor(i / TILE)));
    const id = (x, y) => ids[(((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE)];
    const grain = wrapNoise(seed + 3, 16), moss = wrapNoise(seed + 4, 4);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const own = id(x, y), site = sites[own];
        let value = site.tone + (grain(x / TILE, y / TILE) - .5) * .3;
        let color = dithered(ramp, value, x, y);
        if (id(x + 1, y) !== own || id(x, y + 1) !== own) color = ramp[0]; // joint on the lower and right edge of every slab
        else if (id(x - 1, y) !== own || id(x, y - 1) !== own) color = ramp[Math.min(4, Math.round(value * 4) + 1)]; // lit upper-left lip
        else if (band === 0 && moss(x / TILE, y / TILE) > .66 && bayer(x, y) < .55) color = ramps.moss;
        tile.set(x, y, color);
    }
    for (let i = 0; i < 20; i++) tile.set(Math.floor(random() * TILE), Math.floor(random() * TILE), ramp[random() < .5 ? 1 : 4]);
    return tile;
}

/** Soil side: strata bands, hanging roots, embedded pebbles. Tiles vertically, so any height can be cut from it. */
function dirtSide(band, seed, withLip) {
    const ramps = rampsForBand(band), ramp = ramps.dirt, tile = new Tile(), random = rng(seed);
    const strata = wrapNoise(seed + 1, 4), fine = wrapNoise(seed + 2, 16);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const band4 = strata(x / TILE * .5, y / TILE * 2) * .5;
        const value = .12 + band4 + (fine(x / TILE, y / TILE) - .5) * .35;
        tile.set(x, y, dithered(ramp.map((_, i) => ramp[Math.max(0, i - 1)]), value, x, y));
    }
    for (let i = 0; i < 5; i++) pebble(tile, Math.floor(random() * (TILE - 3)), Math.floor(random() * TILE), ramps.stone, random() < .5 ? 2 : 1);
    for (let i = 0; i < 3; i++) { // roots hang as thin darker-lighter pairs
        const x = Math.floor(random() * TILE), y = Math.floor(random() * 20), length = 4 + Math.floor(random() * 6);
        for (let d = 0; d < length; d++) { tile.set(x + (d > 3 ? 1 : 0), y + d, ramp[1]); tile.set(x + 1 + (d > 3 ? 1 : 0), y + d, ramp[3]); }
    }
    if (withLip && hasGrass(band)) {
        // The grass overhang: a scalloped lip hangs over the soil, with a dark contact shadow under it.
        const depth = Array.from({ length: TILE }, () => 5 + Math.floor(random() * 4));
        for (let x = 0; x < TILE; x++) {
            const smooth = Math.round((depth[x] + depth[(x + 1) % TILE] + depth[(x + TILE - 1) % TILE]) / 3);
            for (let y = 0; y < smooth; y++) tile.set(x, y, y === 0 ? ramps.grass[3] : y >= smooth - 1 ? ramps.grass[1] : dithered(ramps.grass, .3 + random() * .3, x, y));
            tile.set(x, smooth, ramp[0]);
            tile.set(x, smooth + 1, ramp[1]);
            if (random() < .22) { tile.set(x, smooth + 1, ramps.grass[2]); tile.set(x, smooth + 2, ramps.grass[1]); }
        }
        for (let i = 0; i < 6; i++) tile.set(Math.floor(random() * TILE), 0, ramps.grass[4]);
    }
    return tile;
}

/** Wall of dressed stone: courses of blocks with dark joints, a lit top edge and a shadowed foot on each block. Tiles vertically. */
function stoneSide(band, seed) {
    const ramps = rampsForBand(band), ramp = ramps.stone, tile = new Tile(), random = rng(seed);
    const grain = wrapNoise(seed + 1, 16), crack = wrapNoise(seed + 2, 4);
    const courses = [[0, 11], [11, 21], [21, 32]];
    courses.forEach(([top, bottom], course) => {
        let x = -Math.floor(random() * 9);
        while (x < TILE) {
            const width = 9 + Math.floor(random() * 9), tone = .3 + random() * .35;
            for (let yy = top; yy < bottom; yy++) for (let xx = x; xx < x + width; xx++) {
                const edgeTop = yy === top, edgeBottom = yy === bottom - 1, edgeLeft = xx === x, edgeRight = xx === x + width - 1;
                let color;
                if (edgeBottom || edgeRight) color = ramp[0];
                else if (edgeTop || edgeLeft) color = ramp[Math.min(4, Math.round(tone * 4) + 1)];
                else color = dithered(ramp, tone * .85 + (grain(xx / TILE, yy / TILE) - .5) * .35 - (yy - top) / (bottom - top) * .12, xx, yy);
                tile.set(xx, yy, color);
            }
            if (random() < .35) crackLine(tile, random, x + 2 + Math.floor(random() * (width - 4)), top + 2, 4 + Math.floor(random() * 4), ramp[0]);
            if (band === 0 && random() < .4) for (let i = 0; i < 4; i++) tile.set(x + 1 + Math.floor(random() * (width - 2)), top + 1 + Math.floor(random() * 3), ramps.moss);
            x += width;
        }
    });
    void crack;
    return tile;
}

// Molten rock: the one place saturation is allowed. Dark crust plates split by glowing seams with a few molten pools.
const LAVA = Object.freeze(['#1f0a07', '#4a150b', '#8f2a0d', '#d9561a', '#ffb347']);

function lavaTop(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, 16), pool = wrapNoise(seed + 2, 4);
    const sites = Array.from({ length: 8 }, () => ({ x: random() * TILE, y: random() * TILE }));
    const owner = (x, y) => {
        let best = 0, bestDistance = Infinity;
        sites.forEach((site, index) => {
            const dx = Math.min(Math.abs(x - site.x), TILE - Math.abs(x - site.x)), dy = Math.min(Math.abs(y - site.y), TILE - Math.abs(y - site.y));
            if (dx * dx + dy * dy < bestDistance) { bestDistance = dx * dx + dy * dy; best = index; }
        });
        return best;
    };
    const ids = Array.from({ length: TILE * TILE }, (_, i) => owner(i % TILE, Math.floor(i / TILE)));
    const id = (x, y) => ids[(((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE)];
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const seam = id(x + 1, y) !== id(x, y) || id(x, y + 1) !== id(x, y);
        const molten = pool(x / TILE, y / TILE);
        const crust = .1 + (grain(x / TILE, y / TILE) - .5) * .3;
        let color = dithered(LAVA, crust + (molten > .62 ? (molten - .62) * 2.4 : 0), x, y);
        if (seam) color = LAVA[random() < .3 ? 4 : 3];
        else if (id(x - 1, y) !== id(x, y) || id(x, y - 1) !== id(x, y)) color = LAVA[2];
        tile.set(x, y, color);
    }
    void band;
    return tile;
}

function lavaSide(band, seed) {
    const tile = new Tile(), random = rng(seed), grain = wrapNoise(seed + 1, 16);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) tile.set(x, y, dithered(LAVA, .08 + (grain(x / TILE, y / TILE) - .5) * .3, x, y));
    for (let i = 0; i < 6; i++) {
        const x = Math.floor(random() * TILE), y = Math.floor(random() * TILE), length = 6 + Math.floor(random() * 14);
        for (let d = 0; d < length; d++) tile.set(x, y + d, LAVA[d < 2 || d > length - 3 ? 3 : 4]);
        for (let d = 1; d < length - 1; d++) tile.set(x + 1, y + d, LAVA[2]);
    }
    void band;
    return tile;
}

/** One band's full set: variants of every tile kind. Index with `variantFor`. */
export const TILE_VARIANTS = 4;
export function generateTileSet(band) {
    const make = (builder, base) => Array.from({ length: TILE_VARIANTS }, (_, i) => builder(band, base + i * 101));
    return {
        grassTop: make(grassTop, 11), dirtTop: make((b, s) => dirtTop(b, s), 23), ashTop: make((b, s) => dirtTop(b, s, true), 31), stoneTop: make(stoneTop, 41),
        grassSide: make((b, s) => dirtSide(b, s, true), 53), dirtSide: make((b, s) => dirtSide(b, s, false), 67), stoneSide: make(stoneSide, 71),
        lavaTop: make(lavaTop, 83), lavaSide: make(lavaSide, 97),
    };
}

export function variantFor(column, row) {
    let h = (Math.imul(column + 3, 0x9E3779B1) ^ Math.imul(row + 5, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return (h >>> 18) % TILE_VARIANTS;
}

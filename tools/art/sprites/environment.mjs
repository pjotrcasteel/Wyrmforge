// Environment art: seamless ground tiles, flat decals, edge vegetation, low ruins, rune walls,
// caches, XP crystals and the trail exit. Everything is authored at 1 art pixel = 1 world unit.
import { Bitmap, mix, rng, hex } from '../lib/painter.mjs';

function valueNoise(size, cells, random) {
    const lattice = Array.from({ length: cells * cells }, random);
    const cell = size / cells;
    return (x, y) => {
        const gx = x / cell, gy = y / cell;
        const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
        const v = (i, j) => lattice[((j % cells + cells) % cells) * cells + ((i % cells + cells) % cells)];
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy;
    };
}

const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

function noiseTile(seed, ramp, { cells = 8, fine = 16, weight = .65 } = {}) {
    const size = 64, b = new Bitmap(size, size);
    b.wrap = true;
    const random = rng(seed);
    const coarse = valueNoise(size, cells / 2, random), detail = valueNoise(size, fine, random);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const n = coarse(x, y) * weight + detail(x, y) * (1 - weight);
        const d = (bayer[y & 3][x & 3] / 16 - .5) * .22;
        b.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor((n + d) * ramp.length)))]);
    }
    return { b, random };
}

export function tiles() {
    const out = {};
    // Wet valley moss and mud.
    {
        const { b, random } = noiseTile(11, ['#141d19', '#18231d', '#1c2a21', '#203024', '#243427']);
        for (let i = 0; i < 70; i++) { // grass blades
            const x = Math.floor(random() * 64), y = Math.floor(random() * 64), h = 1 + Math.floor(random() * 3);
            b.line(x, y, x + (random() < .5 ? 0 : 1), y - h, random() < .3 ? '#3c5236' : '#2e4430');
        }
        for (let i = 0; i < 9; i++) { // pebbles
            const x = Math.floor(random() * 64), y = Math.floor(random() * 64);
            b.rect(x, y, 2, 1, '#3a3f39'); b.set(x, y - 1, '#4f554d'); b.set(x + 1, y + 1, '#0e1411');
        }
        for (let i = 0; i < 3; i++) { // mud smears
            const x = Math.floor(random() * 64), y = Math.floor(random() * 64);
            b.ellipse(x, y, 4 + random() * 4, 1.5 + random(), '#161b17');
        }
        out['tile.valley'] = b;
    }
    // Ash caldera: cinders, cracked crust, rare embers.
    {
        const { b, random } = noiseTile(23, ['#1c1514', '#221918', '#2a1f1b', '#32241f', '#3a2a23']);
        for (let i = 0; i < 6; i++) {
            let x = random() * 64, y = random() * 64;
            for (let s = 0; s < 9; s++) { const nx = x + (random() - .5) * 6, ny = y + random() * 3; b.line(x, y, nx, ny, '#120d0d'); x = nx; y = ny; }
        }
        for (let i = 0; i < 26; i++) b.set(Math.floor(random() * 64), Math.floor(random() * 64), random() < .25 ? '#7a3523' : '#4a403c');
        for (let i = 0; i < 4; i++) b.set(Math.floor(random() * 64), Math.floor(random() * 64), '#c4572c');
        out['tile.ash'] = b;
    }
    // Broken ridge scree.
    {
        const { b, random } = noiseTile(37, ['#15191d', '#1a1f23', '#1f2529', '#252b30', '#2b3237']);
        for (let i = 0; i < 22; i++) {
            const x = random() * 64, y = random() * 64, w = 2 + random() * 4, h = 1.5 + random() * 2.5;
            b.ellipse(x, y, w, h, '#333a40'); b.line(x - w + 1, y - h + 1, x + w - 2, y - h + 1, '#4a5258');
            b.line(x - w + 1, y + h, x + w - 1, y + h, '#101316');
        }
        out['tile.ridge'] = b;
    }
    // Old road cobbles with moss in the joints.
    {
        const b = new Bitmap(64, 64); b.wrap = true;
        const random = rng(53);
        b.rect(0, 0, 64, 64, '#191a18');
        for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
            const w = 9 + Math.floor(random() * 3), x = col * 11 + (row % 2) * 5 + Math.floor(random() * 2), y = row * 8;
            const tone = ['#36332e', '#3c3832', '#423d36', '#302e2a'][Math.floor(random() * 4)];
            b.rect(x + 1, y + 1, w - 1, 6, tone);
            b.rect(x + 1, y + 1, w - 2, 1, mix(tone, '#8a8270', .25));
            b.rect(x + 1, y + 6, w - 1, 1, mix(tone, '#000000', .35));
            if (random() < .3) b.set(x + 2 + Math.floor(random() * (w - 3)), y + 3 + Math.floor(random() * 3), '#262420');
        }
        for (let i = 0; i < 40; i++) b.set(Math.floor(random() * 64), Math.floor(random() * 8) * 8, '#2a3826');
        out['tile.road'] = b;
    }
    // Monastery flagstones.
    {
        const b = new Bitmap(64, 64); b.wrap = true;
        const random = rng(71);
        b.rect(0, 0, 64, 64, '#161a19');
        const slabs = [[0, 0, 22, 16], [22, 0, 18, 16], [40, 0, 24, 16], [0, 16, 14, 18], [14, 16, 26, 18], [40, 16, 24, 18],
            [0, 34, 26, 14], [26, 34, 20, 14], [46, 34, 18, 14], [0, 48, 18, 16], [18, 48, 24, 16], [42, 48, 22, 16]];
        for (const [x, y, w, h] of slabs) {
            const tone = ['#2d3331', '#323836', '#29302e', '#363b38'][Math.floor(random() * 4)];
            b.rect(x + 1, y + 1, w - 1, h - 1, tone);
            b.rect(x + 1, y + 1, w - 1, 1, mix(tone, '#a8b0a0', .18));
            b.rect(x + 1, y + h - 1, w - 1, 1, mix(tone, '#000000', .3));
            if (random() < .5) { const cx = x + 3 + random() * (w - 6), cy = y + 3 + random() * (h - 6); b.line(cx, cy, cx + 4 - random() * 8, cy + 3, '#1c201f'); }
            for (let i = 0; i < 4; i++) b.set(x + 1 + Math.floor(random() * (w - 2)), y + 1 + Math.floor(random() * (h - 2)), mix(tone, '#55604f', .3));
        }
        for (let i = 0; i < 30; i++) b.set(Math.floor(random() * 64), [0, 16, 34, 48][Math.floor(random() * 4)], '#2b3b2a');
        out['tile.flag'] = b;
    }
    // Moonlit snowfield: kept dusky blue so pale frost telegraphs still read on top of it.
    {
        const { b, random } = noiseTile(83, ['#232c35', '#28323c', '#2d3843', '#333e4a', '#394552'], { cells: 6, fine: 12, weight: .72 });
        for (let i = 0; i < 16; i++) { // wind-combed sastrugi
            const x = random() * 64, y = random() * 64, len = 5 + random() * 9;
            b.line(x, y, x + len, y - len * .18, '#4a5868');
            b.line(x + 1, y + 1, x + len - 1, y + 1 - len * .18, '#1d252d');
        }
        for (let i = 0; i < 3; i++) { // hairline ice cracks
            let x = random() * 64, y = random() * 64;
            for (let s = 0; s < 6; s++) { const nx = x + (random() - .3) * 6, ny = y + (random() - .5) * 5; b.line(x, y, nx, ny, '#5d7b90'); x = nx; y = ny; }
        }
        for (let i = 0; i < 22; i++) b.set(Math.floor(random() * 64), Math.floor(random() * 64), random() < .3 ? '#8aa4b8' : '#46535f');
        out['tile.snow'] = b;
    }
    return out;
}

export function decals() {
    const out = {};
    const tuft = (seed, dark, light) => {
        const b = new Bitmap(14, 9), random = rng(seed);
        for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(random() * 10), h = 3 + Math.floor(random() * 5); b.line(7, 8, x, 8 - h, random() < .4 ? light : dark); }
        return b;
    };
    out['decal.tuft.a'] = tuft(3, '#2c4430', '#4a6741');
    out['decal.tuft.b'] = tuft(9, '#2a3c2c', '#58704a');
    out['decal.tuft.ash'] = tuft(15, '#3b2b26', '#6b4a3a');
    {
        const b = new Bitmap(16, 10); // fern
        for (const [dx, dy] of [[-6, -4], [-4, -7], [0, -8], [4, -7], [6, -4]]) { b.line(8, 9, 8 + dx, 9 + dy, '#2f4a33'); b.set(8 + dx, 9 + dy, '#5b7a52'); }
        out['decal.fern'] = b;
    }
    {
        const b = new Bitmap(16, 9); // stones
        b.ellipse(5, 5, 4, 3, '#3e4440'); b.ellipse(11, 6, 3, 2.2, '#363b38'); b.ellipse(8, 3, 2, 1.6, '#4a504a');
        b.rim('#7d857a', '#0d0f0e', .5, .4); b.outline('#0c0e0d');
        out['decal.stones'] = b;
    }
    {
        const b = new Bitmap(28, 12); // puddle reflecting the sky
        b.ellipse(14, 6, 13, 5, '#0d1418'); b.ellipse(13, 5, 10, 3.5, '#1b2a33'); b.line(7, 4, 13, 4, '#4e6a78'); b.line(16, 6, 19, 6, '#33505c');
        out['decal.puddle'] = b;
    }
    {
        const b = new Bitmap(16, 9); // scattered bones
        b.line(2, 6, 10, 3, '#b9b29c'); b.set(1, 6, '#d6cfb9'); b.set(11, 3, '#d6cfb9');
        b.ellipse(12, 6, 2.5, 2, '#cfc8b2'); b.set(11, 6, '#1a1714'); b.set(13, 6, '#1a1714');
        b.line(3, 8, 7, 7, '#9a937f');
        b.outline('#141210');
        out['decal.bones'] = b;
    }
    {
        const b = new Bitmap(10, 8); // pale mushrooms
        b.rect(2, 4, 1, 3, '#a59d88'); b.ellipse(2.5, 3.5, 2.5, 1.5, '#c9bba0'); b.rect(6, 5, 1, 2, '#a59d88'); b.ellipse(6.5, 4.5, 2, 1.2, '#b0a28a');
        b.outline('#14110f');
        out['decal.mushrooms'] = b;
    }
    {
        const b = new Bitmap(18, 10); // cracked ember vent
        b.ellipse(9, 5, 8, 4, '#1a1110'); b.line(3, 5, 9, 4, '#a1401f'); b.line(9, 4, 15, 6, '#d0682c'); b.set(9, 4, '#ffb25a');
        out['decal.ember'] = b;
    }
    out['decal.tuft.frost'] = tuft(19, '#3a4752', '#8399a9');
    {
        const b = new Bitmap(30, 12); // low snowdrift with a wind-carved lip
        b.ellipse(15, 8, 14, 3.5, '#2a343e'); b.ellipse(14, 6, 12, 3.5, '#4b5a68'); b.ellipse(12, 5, 8, 2.2, '#62758a');
        b.line(4, 5, 20, 3, '#8ea6ba'); b.line(22, 7, 27, 8, '#1e262e');
        out['decal.snowdrift'] = b;
    }
    {
        const b = new Bitmap(26, 12); // glassy ice patch with a cold glint
        b.ellipse(13, 6, 12, 4.5, '#1a2631'); b.ellipse(12, 5, 9, 3, '#253746'); b.line(6, 4, 12, 3, '#7fa6bf'); b.set(13, 3, '#c9e4f2'); b.line(15, 7, 19, 6, '#3d5c70');
        out['decal.icepatch'] = b;
    }
    return out;
}

function pine(seed, h, snow = false) {
    const b = new Bitmap(36, h + 6), random = rng(seed), cx = 18;
    b.ellipse(cx, h + 2, 13, 3, [4, 7, 9, 150]);
    b.rect(cx - 1, h - 8, 3, 9, '#2b2019');
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
        const y0 = 2 + t * (h - 10) / tiers, w = 4 + t * 3 + random() * 2;
        b.poly([[cx, y0], [cx + w + 2, y0 + 12], [cx - w - 2, y0 + 12]], t % 2 ? '#14261f' : '#182d24');
        b.line(cx - w, y0 + 11, cx - 1, y0 + 3, '#24413a');
    }
    for (let i = 0; i < 14; i++) b.set(cx - 8 + Math.floor(random() * 16), 6 + Math.floor(random() * (h - 14)), '#2c4c40');
    if (snow) for (let t = 0; t < 5; t++) {
        // Snow loads the windward shoulder of every tier; no extra random draws, so the shapes stay the plain pine's.
        const y0 = 2 + t * (h - 10) / 5, w = 4 + t * 3;
        b.line(cx - w - 1, y0 + 11, cx, y0 + 1, '#a9bccb'); b.line(cx - w, y0 + 11, cx - 1, y0 + 4, '#7f93a4');
        b.line(cx + 1, y0 + 2, cx + w * .6, y0 + 8, '#6d8191');
    }
    b.outline('#060a09');
    return b;
}

function deadTree(seed) {
    const b = new Bitmap(44, 58), random = rng(seed), cx = 22;
    b.ellipse(cx, 54, 14, 3, [4, 7, 9, 140]);
    b.poly([[cx - 3, 54], [cx + 3, 54], [cx + 2, 24], [cx - 2, 24]], '#2a2420');
    b.line(cx - 2, 52, cx - 2, 26, '#3d3530');
    const branch = (x, y, angle, len, depth) => {
        if (depth === 0 || len < 3) return;
        const nx = x + Math.cos(angle) * len, ny = y + Math.sin(angle) * len;
        b.line(x, y, nx, ny, '#2a2420', depth > 2 ? 2 : 1);
        branch(nx, ny, angle - .45 - random() * .2, len * .7, depth - 1);
        branch(nx, ny, angle + .4 + random() * .2, len * .68, depth - 1);
    };
    branch(cx, 26, -Math.PI / 2, 12, 4);
    b.outline('#08090a');
    return b;
}

function bush(seed, tint) {
    const b = new Bitmap(28, 18), random = rng(seed);
    b.ellipse(14, 15, 12, 2.5, [4, 7, 9, 130]);
    for (let i = 0; i < 6; i++) b.ellipse(6 + random() * 16, 7 + random() * 6, 4 + random() * 3, 3 + random() * 2, i % 2 ? tint : mix(tint, '#000000', .25));
    for (let i = 0; i < 10; i++) b.set(4 + Math.floor(random() * 20), 4 + Math.floor(random() * 8), mix(tint, '#9fb48a', .35));
    b.outline('#070a08');
    return b;
}

export function vegetation() {
    return {
        'prop.pine.a': pine(5, 64), 'prop.pine.b': pine(17, 56), 'prop.pine.c': pine(29, 72),
        'prop.deadtree.a': deadTree(41), 'prop.deadtree.b': deadTree(43),
        'prop.bush.a': bush(61, '#1e3326'), 'prop.bush.b': bush(67, '#23382a'), 'prop.bush.ash': bush(71, '#3a2822'),
        'prop.pine.snow.a': pine(5, 64, true), 'prop.pine.snow.b': pine(17, 56, true), 'prop.pine.snow.c': pine(29, 72, true),
        'prop.rock.snow': (() => { const b = new Bitmap(30, 20); b.ellipse(15, 17, 13, 2.5, [4, 7, 9, 130]); b.poly([[3, 16], [6, 6], [14, 3], [24, 6], [27, 16]], '#3b434b'); b.poly([[5, 8], [14, 3], [24, 6], [22, 9], [14, 7], [7, 10]], '#9fb2c2'); b.line(14, 3, 24, 6, '#c8d8e4'); b.line(14, 8, 17, 15, '#262c32'); b.outline('#0a0c0e'); return b; })(),
        'prop.rock.a': (() => { const b = new Bitmap(30, 20); b.ellipse(15, 17, 13, 2.5, [4, 7, 9, 130]); b.poly([[3, 16], [6, 6], [14, 3], [24, 6], [27, 16]], '#3a403e'); b.poly([[6, 6], [14, 3], [16, 9], [8, 10]], '#525a55'); b.line(14, 3, 17, 15, '#262b29'); b.outline('#0a0c0b'); return b; })(),
    };
}

function stoneBlock(b, x, y, w, h, tone = '#4d524d') {
    b.rect(x, y, w, h, tone);
    b.rect(x, y, w, 1, mix(tone, '#c9c4b0', .3));
    b.rect(x, y + h - 1, w, 1, mix(tone, '#000000', .4));
    b.rect(x + w - 1, y, 1, h, mix(tone, '#000000', .25));
}

// Low ground-level ruin footprints. They never stand taller than an actor, so they never imply false walls.
export function ruins() {
    const out = {};
    const base = (w, h) => { const b = new Bitmap(w, h); b.ellipse(w / 2, h - 7, w / 2 - 3, 6, [3, 5, 7, 120]); return b; };
    const moss = (b, seed, n = 16) => { const r = rng(seed); for (let i = 0; i < n; i++) { const x = Math.floor(r() * b.width), y = Math.floor(r() * b.height); if (b.alpha(x, y) > 200) b.set(x, y, '#2e4a32'); } };
    const finish = (b, seed) => { moss(b, seed); b.outline('#0b0d0c'); return b; };
    {   // chapel: broken apse foundation, toppled column
        const b = base(84, 52);
        for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; stoneBlock(b, 42 + Math.cos(a) * 32 - 5, 30 + Math.sin(a) * 18 - 4, 10, 8 + (i % 3) * 3, '#4e5450'); }
        stoneBlock(b, 34, 32, 16, 10, '#58605a'); b.rect(39, 34, 6, 2, '#8a8270');
        b.ellipse(66, 42, 9, 3.5, '#5a605b'); b.ellipse(73, 42, 2.5, 3.5, '#6d736d');
        out['ruin.chapel'] = finish(b, 1);
    }
    {   // waystation: posts, collapsed roof beams, cold hearth
        const b = base(80, 46);
        stoneBlock(b, 10, 18, 9, 18, '#5c574e'); stoneBlock(b, 60, 20, 9, 16, '#5c574e');
        b.line(14, 18, 44, 10, '#5a4534', 3); b.line(44, 10, 66, 26, '#4a3829', 3); b.line(24, 30, 52, 34, '#3e2f24', 2);
        b.ellipse(40, 36, 8, 3.5, '#191513'); b.set(38, 35, '#5a3a2a'); b.set(42, 36, '#7a4a32');
        out['ruin.waystation'] = finish(b, 2);
    }
    {   // altar: low stone slab with a flooded basin and pillar stubs
        const b = base(84, 46);
        stoneBlock(b, 18, 20, 48, 16, '#4c5a55'); b.ellipse(42, 27, 12, 4, '#14232a'); b.line(34, 26, 46, 26, '#5d8c96');
        stoneBlock(b, 4, 18, 9, 14, '#56645e'); stoneBlock(b, 71, 16, 9, 18, '#56645e');
        out['ruin.altar'] = finish(b, 3);
    }
    {   // pyre: charred log ring with embers
        const b = base(76, 44);
        stoneBlock(b, 14, 24, 48, 10, '#4a403c');
        for (const [x0, x1] of [[16, 34], [58, 38], [22, 50], [52, 26]]) b.line(x0, 30, x1, 12, '#1d1716', 3);
        b.set(36, 16, '#ff9a4a'); b.set(40, 20, '#d4582a'); b.set(32, 22, '#a8401e'); b.set(44, 18, '#e0702e');
        out['ruin.pyre'] = finish(b, 4);
    }
    {   // forge: broken anvil, slag, a low furnace mouth
        const b = base(84, 48);
        stoneBlock(b, 8, 14, 32, 22, '#4f3f38'); b.rect(14, 22, 20, 10, '#1a0f0c'); b.ellipse(24, 30, 8, 2, '#c4572c'); b.set(24, 30, '#ffb25a');
        b.poly([[50, 26], [72, 26], [68, 30], [62, 30], [64, 36], [56, 36], [58, 30], [52, 30]], '#5c605f'); b.line(50, 26, 72, 26, '#9aa09d');
        for (let i = 0; i < 8; i++) b.set(44 + i * 4, 40 - (i % 3), '#2c2422');
        out['ruin.forge'] = finish(b, 5);
    }
    {   // caravan: overturned cart, broken wheel, scattered crates
        const b = base(88, 48);
        b.poly([[10, 22], [56, 18], [60, 30], [14, 36]], '#4a3628'); b.line(10, 22, 56, 18, '#6e5440'); for (let x = 18; x < 56; x += 8) b.line(x, 21, x + 2, 33, '#33251b');
        b.ellipse(70, 30, 9, 9, '#3b2b20'); b.ellipse(70, 30, 6, 6, [0, 0, 0, 0]); for (let k = 0; k < 4; k++) b.line(70, 30, 70 + Math.cos(k * .8) * 8, 30 + Math.sin(k * .8) * 8, '#5c4532');
        stoneBlock(b, 60, 36, 9, 7, '#5a4632'); stoneBlock(b, 4, 34, 8, 7, '#5a4632');
        out['ruin.caravan'] = finish(b, 6);
    }
    {   // watchtower: the stump of a round tower, fallen ring of blocks
        const b = base(80, 50);
        b.ellipse(40, 30, 22, 12, '#3f4549'); b.ellipse(40, 28, 16, 8, '#1a1f23');
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; stoneBlock(b, 40 + Math.cos(a) * 20 - 4, 28 + Math.sin(a) * 11 - 3, 8, 6, '#545b60'); }
        stoneBlock(b, 64, 38, 10, 6, '#4a5055');
        out['ruin.watchtower'] = finish(b, 7);
    }
    {   // ossuary: three grave slabs and a bone heap
        const b = base(84, 46);
        for (const [x, y] of [[8, 16], [30, 12], [52, 18]]) { stoneBlock(b, x, y, 14, 22, '#6e6b66'); b.rect(x + 6, y + 4, 2, 10, '#2a2a2c'); b.rect(x + 3, y + 7, 8, 2, '#2a2a2c'); }
        b.ellipse(74, 36, 7, 4, '#bdb6a0'); b.set(72, 35, '#1a1714'); b.set(75, 35, '#1a1714'); b.line(66, 40, 80, 38, '#a49d87');
        out['ruin.ossuary'] = finish(b, 8);
    }
    {   // banner: fallen standard pole with a torn cloth laid on the ground
        const b = base(84, 42);
        stoneBlock(b, 6, 24, 18, 10, '#4b4e4d'); b.line(16, 28, 76, 20, '#7f786f', 2);
        b.poly([[44, 22], [70, 18], [66, 30], [72, 36], [46, 34]], '#5b3034'); b.line(46, 26, 68, 23, '#7a4448');
        out['ruin.banner'] = finish(b, 9);
    }
    {   // fallen monolith pieces used as scatter
        const b = new Bitmap(24, 16); b.ellipse(12, 13, 10, 2.5, [3, 5, 7, 120]); stoneBlock(b, 3, 4, 16, 8, '#4a504c'); b.line(6, 5, 12, 11, '#2a2e2c'); b.outline('#0b0d0c');
        out['ruin.slab'] = b;
        const c = new Bitmap(18, 14); c.ellipse(9, 11, 8, 2.5, [3, 5, 7, 120]); stoneBlock(c, 2, 5, 7, 6, '#525852'); stoneBlock(c, 9, 7, 6, 5, '#474d48'); c.outline('#0b0d0c');
        out['ruin.rubble'] = c;
    }
    // Frost sites. The concept sheets put the region in a buried, wind-scoured north: name cairns, a frozen fall of
    // ice and a hunting sledge left where the cold caught it. They share no silhouette with the Cinder ruins.
    const rime = (b, seed, n = 18) => { const r = rng(seed); for (let i = 0; i < n; i++) { const x = Math.floor(r() * b.width), y = Math.floor(r() * b.height); if (b.alpha(x, y) > 200) b.set(x, y, '#b8cad8'); } };
    const freeze = (b, seed) => { rime(b, seed); b.outline('#0a0d10'); return b; };
    {   // cairnstack: three stacked name cairns, snow on every shoulder
        const b = base(84, 52);
        for (const [x, h] of [[14, 3], [38, 4], [62, 3]]) for (let k = 0; k < h; k++) {
            const w = 16 - k * 3, y = 38 - k * 7;
            stoneBlock(b, x - w / 2 + 2, y, w, 7, ['#4a525a', '#545d66', '#5e6872', '#47505a'][k]);
            b.line(x - w / 2 + 2, y, x + w / 2, y, '#b9cbd9');
        }
        out['ruin.cairnstack'] = freeze(b, 11);
    }
    {   // icefall: a frozen cascade of blue shards leaning out of a drift
        const b = base(80, 54);
        b.ellipse(40, 40, 30, 7, '#4e5f6e');
        for (const [x, top, lean] of [[18, 22, -3], [30, 10, -1], [42, 4, 2], [54, 14, 3], [64, 26, 4]]) {
            b.poly([[x - 5, 42], [x + lean, top], [x + 5, 42]], '#3d6a86'); b.line(x - 2, 40, x + lean, top + 2, '#8fc4dd'); b.line(x + 3, 41, x + lean + 1, top + 6, '#1f3a4c');
        }
        b.ellipse(40, 44, 26, 4, '#6c8090'); b.line(18, 43, 60, 42, '#9fb4c4');
        out['ruin.icefall'] = freeze(b, 12);
    }
    {   // sledge: a hunter's sledge half under the snow, a broken runner and a frozen pack
        const b = base(88, 46);
        b.poly([[12, 26], [62, 22], [64, 30], [14, 34]], '#4a3a2e'); for (let x = 18; x < 60; x += 7) b.line(x, 25, x + 1, 32, '#30251c');
        b.line(8, 36, 66, 31, '#6e6458', 2); b.line(66, 31, 72, 25, '#6e6458', 2); b.line(70, 40, 80, 36, '#5a5248', 2);
        stoneBlock(b, 28, 14, 18, 10, '#5b4a3c'); b.line(28, 14, 46, 14, '#b4c6d4');
        b.ellipse(24, 34, 16, 4, '#5f7282'); b.ellipse(54, 30, 10, 3, '#6c8092');
        out['ruin.sledge'] = freeze(b, 13);
    }
    return out;
}

// Rune walls: authoritative C# barrier rectangles are skinned with a cap, repeating stone courses and a footing.
export function walls() {
    const out = {};
    for (const [name, tone] of [['valley', '#4a514b'], ['ash', '#4c3c36'], ['ridge', '#474d52'], ['snow', '#48525c']]) {
        // Moss grows in the Cinder joints; on the ice the same joints hold packed snow.
        const growth = name === 'snow' ? '#b7c9d6' : '#3b5a3c', footGrowth = name === 'snow' ? '#5c6f80' : '#203024';
        const faceGrowth = name === 'snow' ? '#8ea3b4' : '#2f4a31';
        const cap = new Bitmap(32, 10), r = rng(name.length * 13);
        cap.rect(0, 2, 32, 8, mix(tone, '#c0c6b2', .2));
        for (let x = 0; x < 32; x += 8) { cap.rect(x, 2, 1, 8, mix(tone, '#000000', .35)); cap.rect(x + 1, 2, 7, 1, mix(tone, '#e0dccb', .35)); }
        for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 32); cap.line(x, 3, x + (r() < .5 ? -1 : 1), 0, growth); }
        cap.rect(0, 9, 32, 1, mix(tone, '#000000', .5));
        out[`wall.${name}.cap`] = cap;
        const face = new Bitmap(32, 16);
        for (let row = 0; row < 2; row++) for (let col = -1; col < 3; col++) {
            const x = col * 12 + (row ? 6 : 0), t = mix(tone, r() < .5 ? '#000000' : '#8d917f', .08 + r() * .14);
            face.rect(x + 1, row * 8 + 1, 11, 7, t);
            face.rect(x + 1, row * 8 + 1, 11, 1, mix(t, '#d5d1bf', .22));
            face.rect(x + 1, row * 8 + 7, 11, 1, mix(t, '#000000', .3));
        }
        face.rect(0, 0, 32, 1, mix(tone, '#000000', .55)); face.rect(0, 8, 32, 1, mix(tone, '#000000', .55));
        for (let i = 0; i < 6; i++) face.set(Math.floor(r() * 32), [0, 8][Math.floor(r() * 2)], faceGrowth);
        out[`wall.${name}.face`] = face;
        const foot = new Bitmap(32, 6);
        foot.rect(0, 0, 32, 4, mix(tone, '#000000', .45));
        for (let i = 0; i < 10; i++) foot.set(Math.floor(r() * 32), 4 + Math.floor(r() * 2), footGrowth);
        out[`wall.${name}.foot`] = foot;
    }
    // Failing runes mounted on the wall face: lit and guttering frames per school colour.
    for (const [school, glow] of [['arcane', '#c48aff'], ['fire', '#ff8a45'], ['frost', '#9fe6ff'], ['storm', '#f2e06a']]) {
        for (const [frame, strength] of [['lit', 1], ['dim', .45]]) {
            const b = new Bitmap(14, 14);
            b.rect(1, 1, 12, 12, '#2b2e2e'); b.rect(1, 1, 12, 1, '#5a5f5c'); b.outline('#0b0c0c');
            const c = mix('#2b2e2e', glow, strength);
            b.line(7, 3, 7, 10, c); b.line(4, 5, 10, 8, c); b.line(4, 8, 7, 10, c); b.set(10, 4, c);
            if (strength > .9) { b.set(7, 6, '#ffffff'); }
            out[`rune.${school}.${frame}`] = b;
        }
    }
    // Iron portcullis segment for sealed gates.
    {
        const b = new Bitmap(16, 16);
        b.rect(0, 0, 16, 16, [10, 10, 14, 200]);
        for (let x = 1; x < 16; x += 5) { b.rect(x, 0, 2, 16, '#3d3f44'); b.rect(x, 0, 1, 16, '#62656b'); }
        for (let y = 4; y < 16; y += 7) { b.rect(0, y, 16, 2, '#33353a'); b.rect(0, y, 16, 1, '#55585e'); }
        out['wall.portcullis'] = b;
    }
    // Rubble left in an opened (shattered) gate.
    {
        const b = new Bitmap(48, 18), r = rng(99);
        for (let i = 0; i < 9; i++) { const x = 3 + r() * 40, y = 6 + r() * 8; stoneBlock(b, Math.floor(x), Math.floor(y), 4 + Math.floor(r() * 5), 3 + Math.floor(r() * 3), '#4f5550'); }
        b.line(2, 12, 46, 10, '#3b3a36'); b.outline('#0b0d0c');
        out['wall.rubble'] = b;
    }
    return out;
}

export function pickups() {
    const out = {};
    const crystal = (w, h, body, light, dark) => {
        const b = new Bitmap(w + 4, h + 4), cx = (w + 4) / 2;
        b.poly([[cx, 1], [cx + w / 2, h * .45 + 2], [cx, h + 2], [cx - w / 2, h * .45 + 2]], body);
        b.poly([[cx, 1], [cx - w / 2, h * .45 + 2], [cx, h * .55 + 2]], light);
        b.poly([[cx, 1], [cx + w / 2, h * .45 + 2], [cx, h * .55 + 2]], mix(body, light, .3));
        b.poly([[cx, h + 2], [cx + w / 2, h * .45 + 2], [cx, h * .55 + 2]], dark);
        b.outline('#140b1e');
        return b;
    };
    const tiers = [['small', 6, 10, '#9a6fd8', '#dcc4ff', '#5a3a8e'], ['medium', 8, 13, '#b182f0', '#efdfff', '#6a44a6'], ['large', 10, 15, '#d8b45a', '#fff2c0', '#8e6a26']];
    for (const [name, w, h, body, light, dark] of tiers) {
        const a = crystal(w, h, body, light, dark);
        out[`shard.${name}.0`] = a;
        const glint = a.clone(); const cx = Math.floor(a.width / 2);
        glint.set(cx - 1, 4, '#ffffff'); glint.set(cx - 2, 5, '#ffffff'); glint.set(cx - 1, 6, light);
        out[`shard.${name}.1`] = glint;
    }
    // Caches: sealed reliquary alcove (blocks movement in C#), opened healing basin, opened XP reliquary.
    const plinth = (b) => {
        b.ellipse(36, 48, 31, 12, [3, 5, 7, 140]);
        b.ellipse(36, 40, 30, 15, '#2e3330'); b.ellipse(36, 38, 28, 13, '#454c47'); b.ellipse(36, 37, 23, 10, '#363c38');
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; b.set(36 + Math.cos(a) * 26, 38 + Math.sin(a) * 12, '#6d756e'); }
    };
    for (const [kind, glow] of [['health', '#9fd49a'], ['experience', '#c48aff']]) {
        const sealed = new Bitmap(72, 60); plinth(sealed);
        stoneBlock(sealed, 22, 14, 28, 26, '#545b56');
        sealed.poly([[20, 15], [36, 6], [52, 15]], '#626a64'); sealed.line(20, 15, 36, 6, '#8e968c'); sealed.line(36, 6, 52, 15, '#3a403c');
        sealed.rect(28, 20, 16, 16, '#2a2f2c');
        for (let y = 22; y < 36; y += 4) sealed.rect(29, y, 14, 1, '#4b524d');
        sealed.line(36, 22, 36, 34, glow); sealed.line(32, 26, 40, 30, glow); sealed.set(36, 28, '#ffffff');
        sealed.outline('#0a0c0b');
        out[`cache.${kind}.sealed`] = sealed;
    }
    {
        const b = new Bitmap(72, 60); plinth(b);
        b.poly([[14, 26], [58, 26], [54, 44], [18, 44]], '#4b5a50'); b.line(14, 26, 58, 26, '#96a492');
        b.rect(18, 27, 36, 7, '#203a2c'); b.rect(22, 28, 26, 3, '#6fa877'); b.line(24, 29, 44, 29, '#bfe3b0');
        for (const [x, h, s] of [[24, 9, -1], [34, 12, 1], [46, 8, 1]]) { b.line(x, 26, x + s * 3, 26 - h, '#7a9c74'); b.rect(x + s * 3 - 2, 24 - h, 5, 3, '#c7d6b0'); }
        b.line(32, 34, 36, 42, '#29372f');
        b.outline('#0a0c0b');
        out['cache.health.open'] = b;
    }
    {
        const b = new Bitmap(72, 60); plinth(b);
        stoneBlock(b, 22, 22, 28, 18, '#545b56'); b.rect(26, 24, 20, 10, '#140e1e');
        b.poly([[30, 32], [36, 18], [42, 32]], '#b182f0'); b.poly([[30, 32], [36, 18], [36, 32]], '#dcc4ff'); b.set(35, 22, '#ffffff');
        b.poly([[18, 22], [24, 10], [54, 10], [50, 22]], '#4a514c'); b.line(24, 10, 54, 10, '#7c847d');
        b.outline('#0a0c0b');
        out['cache.experience.open'] = b;
    }
    // Trail exit: a squat waystone gate with a lit passage, deliberately not a spire.
    {
        const b = new Bitmap(88, 96);
        b.ellipse(44, 88, 40, 7, [3, 5, 7, 150]);
        for (const x of [8, 64]) { stoneBlock(b, x, 34, 16, 52, '#4d534e'); for (let y = 40; y < 84; y += 10) b.rect(x, y, 16, 1, '#2b302d'); }
        b.poly([[8, 36], [20, 14], [44, 6], [68, 14], [80, 36], [64, 36], [56, 22], [44, 18], [32, 22], [24, 36]], '#5b625c');
        b.line(20, 14, 44, 6, '#9aa293'); b.line(44, 6, 68, 14, '#3a403c');
        stoneBlock(b, 39, 4, 10, 10, '#6b736b'); b.line(44, 6, 44, 11, '#e6c98f'); b.line(41, 9, 47, 9, '#e6c98f');
        b.outline('#0a0c0b');
        out['exit.waystone'] = b;
    }
    return out;
}

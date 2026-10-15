// Four school Wyrms in a three-quarter front view: spread wings, coiled tail, head toward the hunter.
// Phase 2 adds glowing fissures; the frozen variant is generated from the same silhouette.
import { Bitmap, mix, hex } from '../lib/painter.mjs';

export const WYRM_SIZE = [136, 116];
export const WYRM_ORIGIN = [68, 62];
export const WYRM_RADIUS = 34;

export const WYRM_SCHOOLS = [
    { school: 0, name: 'arcane', body: '#30264a', hi: '#5d4a8c', belly: '#8b76b4', membrane: '#382a58', membraneHi: '#584384', bone: '#1a1428', horn: '#ddd0f2', eye: '#e8b8ff', glow: '#c48aff', spikes: 'shards', tail: 'orb', slim: 1 },
    { school: 1, name: 'fire', body: '#3c201c', hi: '#713325', belly: '#9a5a32', membrane: '#5c2419', membraneHi: '#8c3a22', bone: '#241312', horn: '#d6c4a2', eye: '#ffd27a', glow: '#ff7a33', spikes: 'horns', tail: 'flame', slim: 1 },
    { school: 2, name: 'frost', body: '#3d5b70', hi: '#7ea7ba', belly: '#bcd7e0', membrane: '#4f7c93', membraneHi: '#86b5c8', bone: '#253f50', horn: '#eef9fc', eye: '#c6f6ff', glow: '#9fe6ff', spikes: 'ice', tail: 'blade', slim: 1.06 },
    { school: 3, name: 'storm', body: '#33443f', hi: '#66806f', belly: '#bcb68b', membrane: '#46574f', membraneHi: '#6f8679', bone: '#222a27', horn: '#e0d7a0', eye: '#fff3a0', glow: '#f2e06a', spikes: 'fins', tail: 'fin', slim: .84 },
];

function at(b, ox, oy) {
    return {
        px: (x, y, c) => b.set(ox + x, oy + y, c),
        rect: (x, y, w, h, c) => b.rect(ox + x, oy + y, w, h, c),
        ell: (x, y, rx, ry, c) => b.ellipse(ox + x, oy + y, rx, ry, c),
        poly: (pts, c) => b.poly(pts.map(([x, y]) => [ox + x, oy + y]), c),
        line: (x0, y0, x1, y1, c, w) => b.line(ox + x0, oy + y0, ox + x1, oy + y1, c, w),
    };
}

function wing(g, S, side, down) {
    const m = ([x, y]) => [x * side, y];
    const wrist = down ? [-44, -26] : [-40, -40];
    const tip = down ? [-63, -8] : [-60, -26];
    const scallops = down ? [[-52, 6], [-38, 10], [-25, 8], [-13, 4]] : [[-52, -6], [-40, 2], [-27, 4], [-13, 2]];
    const shoulder = [-11, -10];
    g.poly([shoulder, wrist, tip, ...scallops].map(m), S.membrane);
    // Lighter inner membrane panels.
    g.poly([shoulder, wrist, scallops[1], scallops[3]].map(m), S.membraneHi);
    g.poly([shoulder, wrist, scallops[2], scallops[3]].map(m), S.membrane);
    // Wing bones radiate from the wrist.
    g.line(...m(shoulder), ...m(wrist), S.bone, 3);
    g.line(...m(wrist), ...m(tip), S.bone, 2);
    for (const p of scallops.slice(0, 3)) g.line(...m(wrist), ...m(p), S.bone);
    g.ell(...m(wrist), 2, 2, S.horn); // wrist claw
    if (S.name === 'arcane') for (const [x, y] of [[-30, -14], [-44, -10], [-22, -4], [-50, -18]]) g.px(...m([x, y + (down ? 10 : 0)]), '#e7d2ff');
    if (S.name === 'frost') for (const p of scallops) g.line(...m(p), ...m([p[0] + 2, p[1] + 5]), S.horn);
}

function tail(g, S, flap) {
    const pts = [];
    const len = S.name === 'storm' ? 1.25 : 1;
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        pts.push([Math.round(8 + Math.sin(t * 3.2) * 18 * len), Math.round(-6 - t * 44 * len + Math.cos(t * 4) * 4), Math.max(1.5, 7.5 * (1 - t) * S.slim)]);
    }
    for (const [x, y, r] of pts) g.ell(x, y, r, r * .85, S.body);
    for (const [x, y, r] of pts.filter((_, i) => i % 2 === 0)) g.ell(x - r * .3, y - r * .3, r * .45, r * .35, S.hi);
    const [tx, ty] = pts[pts.length - 1];
    if (S.tail === 'flame') { g.poly([[tx - 3, ty + 2], [tx + 1, ty - 9 - flap], [tx + 4, ty + 2]], S.glow); g.px(tx, ty - 3, '#ffe2a0'); }
    if (S.tail === 'blade') g.poly([[tx - 4, ty + 1], [tx + 2, ty - 10], [tx + 4, ty + 2]], S.horn);
    if (S.tail === 'fin') { g.poly([[tx - 6, ty], [tx, ty - 7], [tx + 6, ty]], S.membraneHi); g.line(tx, ty - 6, tx, ty, S.glow); }
    if (S.tail === 'orb') { g.ell(tx, ty - 3, 3, 3, S.glow); g.px(tx - 1, ty - 4, '#ffffff'); }
}

function body(g, S, phase) {
    const rx = Math.round(14 * S.slim);
    // Hind legs with claws.
    for (const side of [-1, 1]) {
        g.ell(side * 12, 10, 5, 6, S.body);
        g.rect(side * 12 - 3, 15, 6, 2, S.bone);
        g.px(side * 12 - 2, 17, S.horn); g.px(side * 12, 17, S.horn); g.px(side * 12 + 2, 17, S.horn);
    }
    g.ell(0, -2, rx, 18, S.body);
    g.ell(-4, -8, rx * .45, 8, S.hi);
    // Belly plates.
    g.ell(0, 3, 7, 12, S.belly);
    for (let y = -6; y <= 12; y += 3) g.line(-6 + Math.abs(y - 3) / 4, y, 6 - Math.abs(y - 3) / 4, y, mix(S.belly, S.body, .45));
    // Spinal ridge along the back.
    for (let i = 0; i < 6; i++) {
        const y = -18 + i * 4, x = -Math.round(Math.sin(i) * 1.5);
        if (S.spikes === 'ice') g.poly([[x - 2, y], [x, y - 6], [x + 2, y]], S.horn);
        else if (S.spikes === 'fins') g.poly([[x - 3, y], [x, y - 4], [x + 3, y]], S.membraneHi);
        else if (S.spikes === 'shards') { g.px(x, y - 2, S.glow); g.px(x, y - 3, S.glow); }
        else g.poly([[x - 2, y], [x, y - 4], [x + 2, y]], S.bone);
    }
    // Front legs braced forward.
    for (const side of [-1, 1]) {
        g.poly([[side * 9, 4], [side * 15, 16], [side * 11, 19], [side * 6, 8]], S.body);
        g.px(side * 15, 19, S.horn); g.px(side * 13, 20, S.horn); g.px(side * 11, 20, S.horn);
    }
    if (phase === 2) {
        // Phase two: the wyrm's school breaks through its hide.
        const cracks = [[-8, -10, -3, -2], [-3, -2, -6, 6], [6, -12, 3, -4], [3, -4, 7, 4], [-1, 8, 2, 14]];
        for (const [a, b2, c, d] of cracks) g.line(a, b2, c, d, S.glow);
    }
}

function head(g, S, phase) {
    // Neck.
    g.ell(0, 16, 7 * S.slim, 7, S.body);
    g.ell(0, 21, 6 * S.slim, 5, S.body);
    // Skull: wedge pointing toward the viewer (south).
    g.poly([[-9, 21], [9, 21], [7, 33], [3, 38], [-3, 38], [-7, 33]], S.body);
    g.poly([[-9, 21], [-2, 21], [-4, 33], [-7, 33]], S.hi);
    g.poly([[-5, 32], [5, 32], [3, 38], [-3, 38]], mix(S.body, '#000000', .3)); // snout
    g.px(-2, 36, '#0b0808'); g.px(2, 36, '#0b0808'); // nostrils
    // Horns sweep back over the neck.
    if (S.spikes === 'ice') {
        g.poly([[-7, 22], [-15, 8], [-10, 22]], S.horn); g.poly([[7, 22], [15, 8], [10, 22]], S.horn);
        g.poly([[-4, 21], [-6, 13], [-2, 21]], S.horn); g.poly([[4, 21], [6, 13], [2, 21]], S.horn);
    } else if (S.spikes === 'fins') {
        g.poly([[-8, 23], [-17, 16], [-9, 19]], S.membraneHi); g.poly([[8, 23], [17, 16], [9, 19]], S.membraneHi);
        g.line(-6, 21, -12, 12, S.horn); g.line(6, 21, 12, 12, S.horn);
    } else {
        g.line(-7, 22, -13, 13, S.horn, 2); g.line(-13, 13, -14, 9, S.horn);
        g.line(7, 22, 13, 13, S.horn, 2); g.line(13, 13, 14, 9, S.horn);
    }
    // Eyes glow brighter in phase two.
    const eye = phase === 2 ? '#ffffff' : S.eye;
    g.rect(-6, 26, 3, 2, S.glow); g.rect(4, 26, 3, 2, S.glow);
    g.px(-5, 26, eye); g.px(5, 26, eye);
    if (S.name === 'fire') { g.px(-1, 39, S.glow); g.px(1, 40, '#ffd27a'); }
}

export function paintWyrm(school, { phase = 1, flap = 0 } = {}) {
    const S = WYRM_SCHOOLS[school];
    const b = new Bitmap(...WYRM_SIZE);
    const g = at(b, ...WYRM_ORIGIN);
    const down = flap === 1;
    tail(g, S, flap);
    wing(g, S, 1, down);
    wing(g, S, -1, down);
    body(g, S, phase);
    head(g, S, phase);
    if (phase === 2 && S.name === 'arcane') for (const [x, y] of [[-24, -30], [24, -32], [0, -48]]) { g.rect(x - 1, y - 2, 3, 5, S.glow); g.px(x, y, '#ffffff'); }
    b.rim(mix(S.hi, '#ffffff', .4), '#050407', .3, .3);
    b.outline('#08070b');
    // Phase two rim: a single-pixel school-coloured aura outside the dark outline.
    if (phase === 2) {
        const glow = hex(S.glow);
        b.outline([glow[0], glow[1], glow[2], 150]);
    }
    return b;
}

export function wyrmFrozen(bitmap) {
    const ramp = ['#1d3a47', '#3f7889', '#7fb9c9', '#c3e7ef', '#effbfd'].map(hex);
    return bitmap.clone().recolor(c => {
        const l = (c[0] * .3 + c[1] * .55 + c[2] * .15) / 255;
        const r = ramp[Math.min(4, Math.floor(l * 5.2))];
        return [r[0], r[1], r[2], c[3]];
    });
}

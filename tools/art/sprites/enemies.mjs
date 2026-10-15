// Enemy archetypes authored facing east (runtime mirrors for west). Silhouettes differ by anatomy:
// Chaser = carrion hound, RiftStalker = hooded wraith, Skitter = many-legged crawler, Brute = cleaver revenant.
import { Bitmap, mix, hex } from '../lib/painter.mjs';

function at(b, ox, oy) {
    return {
        px: (x, y, c) => b.set(ox + x, oy + y, c),
        rect: (x, y, w, h, c) => b.rect(ox + x, oy + y, w, h, c),
        ell: (x, y, rx, ry, c) => b.ellipse(ox + x, oy + y, rx, ry, c),
        poly: (pts, c) => b.poly(pts.map(([x, y]) => [ox + x, oy + y]), c),
        line: (x0, y0, x1, y1, c, w) => b.line(ox + x0, oy + y0, ox + x1, oy + y1, c, w),
    };
}

// Canvas size, origin (enemy x,y) and the nominal C# radius each sprite was drawn for.
export const ENEMY_SPECS = [
    { kind: 0, name: 'hound', size: [40, 30], origin: [19, 17], radius: 11 },
    { kind: 1, name: 'wraith', size: [36, 44], origin: [18, 24], radius: 14 },
    { kind: 2, name: 'crawler', size: [32, 24], origin: [16, 13], radius: 8 },
    { kind: 3, name: 'revenant', size: [56, 58], origin: [26, 32], radius: 19 },
];

function hound(pose) {
    const s = ENEMY_SPECS[0], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { bone: '#9a9584', pale: '#d3ccb4', dark: '#58544b', deep: '#3a3732', fur: '#2f2c28', eye: '#d0452f', tooth: '#ece6d2' };
    // Legs first (far legs darker); poses swing the pairs opposite each other.
    const swing = pose === 1 ? 2 : pose === 2 ? -2 : 0;
    const leg = (x, dx, c) => { g.line(x, 2, x + dx, 7, c, 2); g.rect(x + dx - 1, 8, 3, 1, C.fur); };
    leg(-6, -swing, C.deep); leg(5, swing, C.deep);
    // Tail: thin, ragged, raised.
    g.line(-9, -2, -13, -5, C.dark, 2); g.line(-13, -5, -16, -4 + (pose === 1 ? -1 : 0), C.dark);
    // Gaunt body with sunken belly.
    g.ell(-1, -1, 9, 4.5, C.bone);
    g.ell(-1, 2, 7, 1.6, C.dark);
    // Exposed ribs.
    for (const x of [-3, -1, 1, 3]) { g.line(x, -2, x, 2, C.deep); g.px(x + 1, -2, C.pale); }
    // Mangy spine ridge.
    for (let x = -8; x <= 5; x += 2) g.px(x, -6, C.fur);
    // Neck and skull head with a long snout and open jaw.
    g.poly([[5, -4], [9, -8], [11, -7], [8, -1]], C.bone);
    g.ell(12, -7, 3.5, 2.6, C.pale);
    g.poly([[13, -9], [18, -7], [18, -5], [13, -5]], C.pale);
    g.line(13, -3, 17, -3, C.bone);
    g.px(16, -4, C.tooth); g.px(14, -4, C.tooth);
    g.px(17, -4, C.deep);
    g.poly([[10, -9], [9, -12], [12, -9]], C.bone); // swept-back ear
    g.rect(12, -8, 2, 1, C.deep); g.px(13, -8, C.eye);
    // Near legs over the body.
    leg(-4, swing, C.bone); leg(7, -swing, C.bone);
    b.rim('#e8e2cc', '#1a1816', .35, .3);
    b.outline('#151412');
    return b;
}

function wraith(pose) {
    const s = ENEMY_SPECS[1], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#463a60', shade: '#2e2742', deep: '#1d1829', edge: '#7c64a6', void: '#08060c', eye: '#c8f1fa', glow: '#6fb6cc', claw: '#cfc6db', rune: '#b38bea' };
    const bob = pose === 1 ? -1 : 0, sway = pose === 2 ? 1 : pose === 1 ? -1 : 0;
    // Tattered hem: alternating rag tips shift between poses.
    const hem = pose === 0 ? [14, 11, 16, 12, 17, 12, 15] : pose === 1 ? [12, 15, 11, 17, 12, 16, 13] : [15, 12, 17, 11, 16, 13, 12];
    const pts = [[-8, -6 + bob], [8, -6 + bob]];
    for (let i = 0; i < hem.length; i++) pts.push([11 - i * 22 / (hem.length - 1) + sway, hem[i]]);
    g.poly(pts, C.robe);
    g.poly([[2, -6 + bob], [8, -6 + bob], [11 + sway, hem[0]], [4 + sway, hem[2]]], C.shade);
    g.line(-6, -4 + bob, -9 + sway, 13, C.edge);
    g.line(-2, 0 + bob, -3 + sway, 14, C.deep);
    // Faint rift rune stitched on the chest.
    g.px(0, 1 + bob, C.rune); g.px(-1, 2 + bob, C.rune); g.px(1, 2 + bob, C.rune); g.px(0, 3 + bob, C.rune);
    // Reaching skeletal arm.
    const reach = pose === 1 ? 1 : pose === 2 ? -1 : 0;
    g.poly([[4, -5 + bob], [11 + reach, 0 + bob], [10 + reach, 3 + bob], [3, -1 + bob]], C.shade);
    g.px(12 + reach, 1 + bob, C.claw); g.px(13 + reach, 2 + bob, C.claw); g.px(12 + reach, 3 + bob, C.claw); g.px(13 + reach, 4 + bob, C.claw);
    // Deep hood with forward peak and a void face.
    g.ell(0, -12 + bob, 6.5, 6.5, C.robe);
    g.poly([[-4, -17 + bob], [3, -19 + bob], [7, -14 + bob]], C.robe);
    g.ell(2, -11 + bob, 3.6, 3.8, C.void);
    g.px(1, -11 + bob, C.eye); g.px(4, -11 + bob, C.eye);
    g.px(1, -10 + bob, C.glow); g.px(4, -10 + bob, C.glow);
    b.rim('#a690cc', '#0a0810', .35, .3);
    b.outline('#0f0b16');
    // Hem fades into vapour.
    for (let y = s.origin[1] + 11; y < s.size[1]; y++) for (let x = 0; x < s.size[0]; x++) {
        const c = b.get(x, y);
        if (c[3]) b.data[(y * b.width + x) * 4 + 3] = Math.round(c[3] * Math.max(.35, 1 - (y - s.origin[1] - 11) * .12));
    }
    return b;
}

function crawler(pose) {
    const s = ENEMY_SPECS[2], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { shell: '#704030', plate: '#4a281d', hi: '#a8684c', leg: '#2c1913', tip: '#c9a27e', ember: '#f08a44', eye: '#ff5a3a', head: '#3b2219' };
    const a = pose === 1 ? 1 : pose === 2 ? -1 : 0;
    // Six jointed legs: three per side, alternating sets.
    const legs = [[-4, -2, -9, -7, -12, -3], [0, -3, -2, -9, -5, -10], [4, -2, 7, -8, 10, -6],
        [-4, 2, -9, 6, -12, 3], [0, 3, -1, 8, -4, 10], [4, 2, 8, 7, 11, 5]];
    legs.forEach(([x0, y0, x1, y1, x2, y2], i) => {
        const d = (i % 2 ? a : -a);
        g.line(x0, y0, x1 + d, y1, C.leg); g.line(x1 + d, y1, x2 + d, y2 + Math.abs(d), C.leg);
        g.px(x2 + d, y2 + Math.abs(d), C.tip);
    });
    g.ell(0, 0, 6.5, 4.5, C.shell);
    g.line(-5, 0, 5, 0, C.plate); g.line(-2, -4, -2, 4, C.plate); g.line(2, -4, 2, 4, C.plate);
    g.px(-3, -2, C.ember); g.px(3, 2, C.ember); g.px(0, -3, C.ember);
    g.ell(7, 0, 2.6, 2.2, C.head);
    g.px(8, -1, C.eye); g.px(8, 1, C.eye);
    g.line(9, -2, 11, -3 + a, C.tip); g.line(9, 2, 11, 3 - a, C.tip);
    b.rim('#d49a74', '#120806', .4, .25);
    b.outline('#120a07');
    return b;
}

function revenant(pose) {
    const s = ENEMY_SPECS[3], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { armor: '#6c3e33', rust: '#9b5c45', dark: '#3d241f', deep: '#24161a', skin: '#8b877a', helm: '#55595b', helmHi: '#868b8a', visor: '#f0a35a', blade: '#949a99', bladeHi: '#d3d6d0', blood: '#6e2a24', cloth: '#4a3a2e', rivet: '#c9a37a', boot: '#2a2120' };
    const step = pose === 1 ? 2 : pose === 2 ? -2 : 0;
    // Stumpy legs and loincloth.
    g.rect(-8, 10 + Math.max(0, step), 6, 12 - Math.max(0, step), C.dark);
    g.rect(3, 10 + Math.max(0, -step), 6, 12 - Math.max(0, -step), C.dark);
    g.rect(-9, 20, 8, 3, C.boot); g.rect(2, 20, 8, 3, C.boot);
    g.poly([[-6, 6], [6, 6], [4 + step / 2, 17], [-4 + step / 2, 17]], C.cloth);
    // Massive hunched torso.
    g.poly([[-15, -11], [15, -11], [12, 10], [-12, 10]], C.armor);
    g.poly([[5, -11], [15, -11], [12, 10], [5, 10]], C.dark);
    for (let y = -6; y <= 6; y += 4) g.line(-11, y, 10, y, C.deep);
    g.px(-8, -4, C.rivet); g.px(-2, -4, C.rivet); g.px(4, -4, C.rivet); g.px(-5, 0, C.rivet); g.px(1, 0, C.rivet);
    g.line(-12, -9, -4, -9, C.rust);
    // Hanging left arm with a heavy fist.
    g.poly([[-15, -8], [-20, 4], [-17, 8], [-12, -3]], C.skin);
    g.rect(-21, 5, 5, 5, C.dark);
    // Pauldrons.
    g.ell(-13, -11, 6.5, 4, C.rust); g.ell(13, -11, 6.5, 4, C.armor);
    g.px(-15, -12, C.rivet); g.px(-11, -12, C.rivet); g.px(11, -12, C.rivet); g.px(15, -12, C.rivet);
    // Sunken helmet with a burning visor slit and two bent crest spikes.
    g.ell(0, -15, 5.5, 4.5, C.helm);
    g.ell(-1, -16, 3, 2, C.helmHi);
    g.rect(-3, -15, 7, 1, C.visor);
    g.line(-3, -19, -6, -24, C.helm); g.line(3, -19, 5, -23, C.helm);
    // Right arm raising a notched cleaver.
    const lift = pose === 2 ? -2 : pose === 1 ? 1 : 0;
    g.poly([[13, -8], [19, -2 + lift], [17, 2 + lift], [11, -3]], C.skin);
    g.poly([[18, -4 + lift], [28, -12 + lift], [30, -2 + lift], [21, 8 + lift]], C.blade);
    g.line(28, -12 + lift, 30, -2 + lift, C.bladeHi);
    g.line(19, -4 + lift, 28, -12 + lift, C.bladeHi);
    b.clear(s.origin[0] + 30, s.origin[1] - 6 + lift); b.clear(s.origin[0] + 29, s.origin[1] - 5 + lift); // notch
    g.px(25, 0 + lift, C.blood); g.px(24, 2 + lift, C.blood); g.px(27, -3 + lift, C.blood);
    g.rect(17, -3 + lift, 3, 4, C.dark);
    b.rim('#c58a6c', '#0d0708', .35, .3);
    b.outline('#120b0b');
    return b;
}

const painters = [hound, wraith, crawler, revenant];

export function paintEnemy(kind, pose) { return painters[kind](pose); }

export function enemyHit(bitmap) {
    return bitmap.clone().recolor(c => mix(c, '#fff0dc', .62));
}

// Ice palette by luminance: frozen enemies keep anatomy but read as rimed solid.
export function enemyFrozen(bitmap) {
    const ramp = ['#1d3a47', '#3f7889', '#7fb9c9', '#c3e7ef', '#effbfd'].map(hex);
    return bitmap.clone().recolor(c => {
        const l = (c[0] * .3 + c[1] * .55 + c[2] * .15) / 255;
        const r = ramp[Math.min(4, Math.floor(l * 5.2))];
        return [r[0], r[1], r[2], c[3]];
    });
}

// The approved slate-blue hooded mage: front (S), back (N) and side (E; W is mirrored at runtime).
// The staff is NOT painted here; it stays articulated in arena-mage.js so it is always continuous.
import { Bitmap, mix } from '../lib/painter.mjs';

export const MAGE_SIZE = [36, 42];
export const MAGE_ORIGIN = [18, 22]; // world (player.x, player.y) maps to this pixel

const P = {
    outline: '#121925', hood: '#576c84', hoodShade: '#43566d', cloak: '#485b73', cloakShade: '#3a4b60',
    cloakDeep: '#2c394b', fold: '#33435a', hem: '#26303f', collar: '#c8c6b8', collarShade: '#9c9a8c',
    face: '#1a202b', chin: '#7d7368', eye: '#9db4c6', belt: '#3b302b', buckle: '#a58c5c',
    boot: '#161b24', glove: '#2b2b32', rim: '#a3b6c9', inner: '#232c3a',
};

// Pose parameters keep authored silhouettes deterministic: lean, crouch, cloak flare and stride.
export const MAGE_POSES = {
    idle: { lean: 0, drop: 0, hemL: 0, hemR: 0, footL: [-5, 0], footR: [2, 0], arm: 0 },
    walkA: { lean: 0, drop: 0, hemL: -1, hemR: 1, footL: [-6, 1], footR: [3, -1], arm: 1, sway: -1 },
    walkB: { lean: 0, drop: 0, hemL: 1, hemR: -1, footL: [-4, -1], footR: [1, 1], arm: -1, sway: 1 },
    windup: { lean: -2, drop: 1, hemL: -2, hemR: 0, footL: [-7, 0], footR: [2, 0], arm: 2, crouch: true },
    release: { lean: 2, drop: 0, hemL: -3, hemR: 1, footL: [-6, 0], footR: [4, 0], arm: -2 },
    followThrough: { lean: 1, drop: 0, hemL: -3, hemR: 0, footL: [-7, 0], footR: [3, 0], arm: -1 },
    surgeRelease: { lean: 3, drop: -1, hemL: -5, hemR: 3, footL: [-7, 0], footR: [5, 0], arm: -3, surge: true },
};

function at(b, ox, oy) {
    return {
        px: (x, y, c) => b.set(ox + x, oy + y, c),
        rect: (x, y, w, h, c) => b.rect(ox + x, oy + y, w, h, c),
        ell: (x, y, rx, ry, c) => b.ellipse(ox + x, oy + y, rx, ry, c),
        poly: (pts, c) => b.poly(pts.map(([x, y]) => [ox + x, oy + y]), c),
        line: (x0, y0, x1, y1, c, w) => b.line(ox + x0, oy + y0, ox + x1, oy + y1, c, w),
    };
}

function robe(g, p, back) {
    const top = -4 + p.drop, L = p.lean, hem = 15;
    // Main robe trapezoid; hem corners flare with motion.
    g.poly([[-8 + L, top], [8 + L, top], [10 + p.hemR, hem], [-10 + p.hemL, hem]], P.cloak);
    // Shadow side (right, away from the upper-left key light).
    g.poly([[4 + L, top], [8 + L, top], [10 + p.hemR, hem], [5 + Math.round(p.hemR / 2), hem]], P.cloakShade);
    // Long folds read as heavy wet wool.
    g.line(-4 + L, top + 6, -6 + p.hemL, hem - 1, P.fold);
    g.line(3 + L, top + 6, 4 + Math.round(p.hemR / 2), hem - 1, P.fold);
    if (!back) {
        g.line(L, top + 6, Math.round((p.hemL + p.hemR) / 2), hem - 1, P.inner);
        g.rect(-6 + L, top + 8, 12, 1, P.belt);
        g.rect(-1 + L, top + 8, 2, 1, P.buckle);
    } else {
        g.line(L, top + 2, Math.round((p.hemL + p.hemR) / 2), hem - 1, P.fold);
        g.rect(-6 + L, top + 8, 12, 1, P.belt);
    }
    // Ragged dark hem.
    for (let x = -10 + p.hemL; x <= 10 + p.hemR; x++) g.px(x, hem, (x & 1) ? P.hem : P.cloakDeep);
    if (p.surge) {
        g.poly([[-10 + p.hemL, hem - 4], [-14 + p.hemL, hem - 1], [-10 + p.hemL, hem]], P.cloakShade);
        g.poly([[10 + p.hemR, hem - 3], [13 + p.hemR, hem], [9 + p.hemR, hem]], P.cloakShade);
    }
}

function feet(g, p) {
    g.rect(p.footL[0], 16 + p.footL[1], 3, 2, P.boot);
    g.rect(p.footR[0], 16 + p.footR[1], 3, 2, P.boot);
}

function frontHood(g, p) {
    const L = p.lean, D = p.drop + (p.crouch ? 1 : 0);
    g.ell(L, -11 + D, 7, 6.5, P.hood);
    g.poly([[L - 2, -16 + D], [L + 1, -20 + D], [L + 3, -15 + D]], P.hood); // soft peaked tip
    g.ell(L + 4, -10 + D, 3, 5, P.hoodShade);
    g.ell(L, -9 + D, 4, 3.6, P.face);
    g.px(L - 2, -9 + D, P.eye);
    g.px(L + 1, -9 + D, P.eye);
    g.rect(L - 1, -6 + D, 2, 1, P.chin);
}

function backHood(g, p) {
    const L = p.lean, D = p.drop + (p.crouch ? 1 : 0);
    g.ell(L, -11 + D, 7, 6.5, P.hood);
    g.poly([[L - 2, -16 + D], [L + 1, -20 + D], [L + 3, -15 + D]], P.hood);
    g.ell(L + 4, -10 + D, 3, 5, P.hoodShade);
    g.line(L, -16 + D, L, -6 + D, P.hoodShade); // centre seam
    g.ell(L, -5 + D, 6, 2, P.hoodShade); // hood drape over the mantle
}

function collar(g, p, back) {
    const L = p.lean, D = p.drop;
    if (back) {
        g.poly([[-8 + L, -5 + D], [8 + L, -5 + D], [9 + L, -2 + D], [-9 + L, -2 + D]], P.collar);
        g.rect(-8 + L, -2 + D, 17, 1, P.collarShade);
        return;
    }
    g.poly([[-8 + L, -6 + D], [8 + L, -6 + D], [9 + L, -3 + D], [3 + L, -1 + D], [0 + L, 1 + D], [-3 + L, -1 + D], [-9 + L, -3 + D]], P.collar);
    g.line(-8 + L, -3 + D, -3 + L, -1 + D, P.collarShade);
    g.line(3 + L, -1 + D, 8 + L, -3 + D, P.collarShade);
}

function freeArm(g, p, side) {
    // The non-staff arm hangs inside the sleeve; the staff hand is painted by the runtime.
    const L = p.lean, D = p.drop, x = side < 0 ? -9 + L : 8 + L;
    g.poly([[x, -3 + D], [x + side * 3, 6 + D + p.arm], [x + side, 8 + D + p.arm], [x - side * 2, -1 + D]], P.cloakShade);
    g.rect(x + side * 2 - (side < 0 ? 1 : 0), 7 + D + p.arm, 2, 2, P.glove);
}

export function paintMageFront(pose) {
    const p = MAGE_POSES[pose];
    const b = new Bitmap(...MAGE_SIZE);
    const g = at(b, ...MAGE_ORIGIN);
    feet(g, p);
    robe(g, p, false);
    freeArm(g, p, -1);
    collar(g, p, false);
    frontHood(g, p);
    return finish(b);
}

export function paintMageBack(pose) {
    const p = { ...MAGE_POSES[pose], hemL: -MAGE_POSES[pose].hemR, hemR: -MAGE_POSES[pose].hemL };
    const b = new Bitmap(...MAGE_SIZE);
    const g = at(b, ...MAGE_ORIGIN);
    feet(g, { ...p, footL: [-p.footR[0] - 3, p.footR[1]], footR: [-p.footL[0] - 3, p.footL[1]] });
    robe(g, p, true);
    freeArm(g, p, 1);
    collar(g, p, true);
    backHood(g, p);
    return finish(b);
}

export function paintMageSide(pose) {
    const p = MAGE_POSES[pose];
    const b = new Bitmap(...MAGE_SIZE);
    const g = at(b, ...MAGE_ORIGIN);
    const L = p.lean, D = p.drop + (p.crouch ? 1 : 0);
    // Stride: front foot ahead, rear foot behind.
    const stride = pose === 'walkA' ? 3 : pose === 'walkB' ? -2 : pose === 'release' || pose === 'surgeRelease' ? 3 : 1;
    g.rect(1 + stride, 16, 4, 2, P.boot);
    g.rect(-5 - Math.max(0, stride - 1), 16, 3, 2, P.boot);
    // Robe in profile: narrower body with the cloak trailing behind.
    const trail = -10 + Math.min(0, p.hemL) - (pose === 'walkA' || pose === 'walkB' ? 1 : 0);
    g.poly([[-6 + L, -4 + p.drop], [5 + L, -4 + p.drop], [8 + Math.max(0, p.hemR), 15], [trail, 15]], P.cloak);
    g.poly([[-6 + L, -4 + p.drop], [-2 + L, -4 + p.drop], [-3, 15], [trail, 15]], P.cloakShade);
    g.line(1 + L, 2 + p.drop, 2 + Math.max(0, p.hemR), 14, P.fold);
    g.rect(-5 + L, 4 + p.drop, 10, 1, P.belt);
    for (let x = trail; x <= 8 + Math.max(0, p.hemR); x++) g.px(x, 15, (x & 1) ? P.hem : P.cloakDeep);
    if (p.surge) g.poly([[trail, 9], [trail - 5, 13], [trail, 15]], P.cloakShade);
    // Rear arm tucked; staff arm is the runtime hand ahead of the body.
    g.poly([[-4 + L, -3 + p.drop], [-6 + L, 6 + p.drop], [-3 + L, 7 + p.drop]], P.cloakDeep);
    g.poly([[2 + L, -4 + p.drop], [6 + L, -2 + p.drop], [6 + L, 0 + p.drop], [2 + L, 1 + p.drop]], P.cloakShade);
    // Mantle wraps from back to chest.
    g.poly([[-6 + L, -6 + p.drop], [6 + L, -6 + p.drop], [7 + L, -3 + p.drop], [-5 + L, -2 + p.drop]], P.collar);
    g.line(-5 + L, -2 + p.drop, 7 + L, -3 + p.drop, P.collarShade);
    // Hood in profile with a drape down the back and a face opening forward.
    g.ell(L, -11 + D, 6.5, 6.5, P.hood);
    g.poly([[L - 6, -12 + D], [L - 9, -5 + D], [L - 4, -6 + D]], P.hoodShade);
    g.poly([[L - 3, -16 + D], [L - 4, -20 + D], [L + 1, -16 + D]], P.hood);
    g.ell(L + 4, -9 + D, 2.6, 3.3, P.face);
    g.px(L + 5, -10 + D, P.eye);
    g.px(L + 5, -7 + D, P.chin);
    return finish(b);
}

function finish(b) {
    b.rim(P.rim, '#0b1018', .32, .25);
    b.outline(P.outline);
    return b;
}

// Damage reaction: same silhouette, warm desaturated wound tint (never a white flash on the robe).
export function hitVariant(bitmap) {
    return bitmap.clone().recolor(c => c[3] && !(c[0] < 30 && c[1] < 35) ? mix(c, '#b0646c', .45) : null);
}

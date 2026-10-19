// First-hunt roster sprites, authored facing east (runtime mirrors for west) from the concept sheets in
// user_handover_files/concepts as art direction only. Frame order follows EnemyKind ints:
// 0 Hollow, 1 Mire Hound, 2 Ashling, 3 Penitent, 4 Ash Slinger, 5 Ash Priest, 6 Drowned Wraith, 7 The Reliquary, 8 Reliquary ward,
// 9 The Bell Warden, 10 Frostling Packling, 11 Shardcaster, 12 Whitefang Stalker, 13 Cairn Sentinel, 14 Hoarfrost Cantor, 15 Mirror
// Wisp, 16 its double, 17 The Bell of Winter (the Frost roster: rime greys and glacial blues, never a recoloured Cinder kin).
// Poses 0-2 are the idle/walk cycle; pose 3 is the attack posture shown while C# reports a telegraph,
// so the body itself reads as the warning (crouched hound, ember swung overhead, reaching claws, shield thrust, staff raised).
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

export const ENEMY_POSES = [0, 1, 2, 3];
// The two canines have eight articulated trot frames plus release/recovery/recoil/collapse.
// Keep the shared roster compact: humanoid art remains its authored four-pose set.
export const enemyPoses = kind => kind === 1 || kind === 12 ? Array.from({ length: 16 }, (_, i) => i) : ENEMY_POSES;

// A trot pairs the near forelimb with the far hindlimb. Contact paws sweep backwards
// under the body; during swing the elbow/hock bends and the paw clears the ground.
// Reference: Carlisle et al., 2019, doi:10.1053/j.tcam.2019.03.003.
export function caninePawPhase(pose, front, near) {
    if (pose < 8) return { stride: 0, lift: 0 };
    const pair = front === near ? 0 : 4;
    const t = ((pose - 8 + pair) % 8) / 8;
    return t < .625 ? { stride: 4 - 8 * t / .625, lift: 0 } :
        { stride: -4 + 8 * (t - .625) / .375, lift: Math.sin((t - .625) / .375 * Math.PI) * 4 };
}
function canineLeg(g, pose, x, top, front, near, color, paw, width = 2) {
    const gait = caninePawPhase(pose, front, near);
    const crouch = pose === 3, strike = pose === 4, recover = pose === 5;
    const dx = pose === 7 ? (front ? 5 : -2) : crouch ? (front ? 3 : -3) :
        strike ? (front ? 6 : -5) : recover ? (front ? 1 : -3) : gait.stride;
    const footY = pose === 7 ? 6 : 10 - gait.lift;
    const jointX = x + dx * .45 + (front ? -2 : 3);
    const jointY = (top + footY) / 2 - (gait.lift > 0 ? 1 : 0);
    g.line(x, top, jointX, jointY, color, width);
    g.line(jointX, jointY, x + dx, footY, color, width);
    g.rect(x + dx - 1, footY, width + 1, 1, color);
    g.px(x + dx + width, footY, paw);
}

// Canvas size, origin (enemy x,y) and the nominal C# radius each sprite was drawn for.
export const ENEMY_SPECS = [
    { kind: 0, name: 'hollow', size: [34, 44], origin: [16, 26], radius: 11 },
    { kind: 1, name: 'mire-hound', size: [50, 34], origin: [23, 20], radius: 13 },
    { kind: 2, name: 'ashling', size: [32, 32], origin: [15, 19], radius: 8 },
    { kind: 3, name: 'penitent', size: [46, 58], origin: [20, 35], radius: 19 },
    { kind: 4, name: 'ash-slinger', size: [44, 50], origin: [18, 29], radius: 11 },
    { kind: 5, name: 'ash-priest', size: [44, 60], origin: [19, 36], radius: 12 },
    { kind: 6, name: 'drowned-wraith', size: [44, 54], origin: [19, 31], radius: 12 },
    { kind: 7, name: 'reliquary', size: [60, 76], origin: [28, 46], radius: 22 },
    { kind: 8, name: 'reliquary-ward', size: [28, 38], origin: [13, 24], radius: 13 },
    { kind: 9, name: 'bell-warden', size: [84, 94], origin: [40, 61], radius: 30 },
    { kind: 10, name: 'frostling-packling', size: [40, 30], origin: [19, 18], radius: 9 },
    { kind: 11, name: 'shardcaster', size: [52, 62], origin: [23, 37], radius: 11 },
    { kind: 12, name: 'whitefang-stalker', size: [60, 42], origin: [28, 25], radius: 13 },
    { kind: 13, name: 'cairn-sentinel', size: [62, 74], origin: [28, 46], radius: 20 },
    { kind: 14, name: 'hoarfrost-cantor', size: [50, 66], origin: [22, 40], radius: 13 },
    { kind: 15, name: 'mirror-wisp', size: [48, 56], origin: [22, 32], radius: 11 },
    { kind: 16, name: 'mirror-double', size: [48, 56], origin: [22, 32], radius: 11 },
    { kind: 17, name: 'bell-of-winter', size: [92, 108], origin: [38, 70], radius: 40 },
    { kind: 18, name: 'reliquary-of-glass', size: [80, 92], origin: [39, 56], radius: 27 },
    { kind: 19, name: 'crystal-ward', size: [30, 46], origin: [14, 31], radius: 14 },
    { kind: 20, name: 'glass-false-form', size: [80, 92], origin: [39, 56], radius: 27 },
];

const stride = pose => pose === 1 ? 2 : pose === 2 ? -2 : 0;

// The Hollow: gaunt grey-brown villager corpse, hunched forward, long hanging claws, rag skirt. Shambles; never sprints.
function hollow(pose) {
    const s = ENEMY_SPECS[0], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { bone: '#a59b86', pale: '#d2c8ae', flesh: '#776552', dark: '#4c4135', deep: '#2b241e', rag: '#5a4f43', ragHi: '#7e7260', void: '#16110e', claw: '#d8cfb8' };
    const step = stride(pose), reach = pose === 3;
    // Far leg, near leg: bony shins with splayed feet.
    g.line(-2, 6, -3 - step, 15, C.dark, 2); g.rect(-5 - step, 16, 4, 1, C.deep);
    g.line(2, 6, 3 + step, 15, C.bone, 2); g.rect(2 + step, 16, 4, 1, C.dark);
    // Far arm hangs behind the body.
    g.line(-1, -7, reach ? 6 : 1, reach ? -4 : 3, C.dark, 1);
    // Rag skirt with a torn hem.
    g.poly([[-5, 1], [5, 1], [6, 9], [3, 7], [1, 11], [-1, 8], [-4, 10], [-6, 7]], C.rag);
    g.line(-4, 3, -5, 9, C.ragHi);
    // Hunched, starved torso: exposed ribs under a rag drape.
    g.poly([[-4, -10], [4, -9], [5, 2], [-5, 2]], C.flesh);
    for (const y of [-6, -4, -2]) g.line(-2, y, 4, y, C.bone);
    g.line(-4, -9, -4, 1, C.dark);
    g.poly([[-6, -10], [-1, -10], [-3, -1], [-6, -3]], C.ragHi);
    // Forward-jutting skull with an open jaw and dark sockets.
    g.ell(3, -13, 3.6, 3.4, C.pale);
    g.rect(4, -11, 3, 2, C.bone); g.px(6, -10, C.void); g.px(5, -10, C.void);
    g.px(3, -14, C.void); g.px(5, -14, C.void);
    // Near arm: hanging claws, or a reaching grasp in the attack posture.
    if (reach) {
        g.line(2, -7, 11, -6, C.bone, 2);
        g.px(13, -7, C.claw); g.px(13, -5, C.claw); g.px(12, -8, C.claw);
    } else {
        const sway = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(2, -7, 6, -1 + sway, C.bone, 2); g.line(6, -1 + sway, 7, 4 + sway, C.bone);
        g.px(6, 5 + sway, C.claw); g.px(8, 5 + sway, C.claw); g.px(7, 6 + sway, C.claw);
    }
    b.rim('#e6dcc4', '#120e0b', .35, .3);
    b.outline('#120f0c');
    return b;
}

// Collapsed canines retain their bone/ice ridge and long muzzle; paws fold beneath
// the torso. This is a separately authored corpse pose, not a scaled standing sprite.
function deadCanine(kind) {
    const s=ENEMY_SPECS[kind], b=new Bitmap(...s.size), g=at(b,...s.origin), frost=kind===12;
    const fur=frost?'#b8b3ab':'#3b2b22', hi=frost?'#e2ded6':'#6e5c4d', dark=frost?'#45413f':'#1d1511';
    const spike=frost?'#a9dcf0':'#c9b591';
    g.line(-10,6,-18,7,dark,2); g.line(-18,7,-21,5,dark);
    g.ell(-2,5,frost?13:11,3.5,fur);g.ell(7,5,7,3,fur);
    g.line(-10,6,-5,9,dark,2);g.line(-5,9,-1,9,hi);
    g.line(4,6,8,9,dark,2);g.line(8,9,14,9,hi);
    for (const x of [-10,-6,-2,2,6])g.line(x,3,x-2,frost?-2:0,spike);
    g.ell(14,7,5,2.5,hi);g.rect(17,7,6,2,fur);g.px(16,6,dark);
    g.poly([[11,6],[9,3],[14,6]],fur);g.line(18,8,23,8,dark);
    b.rim(frost?'#eef9ff':'#a08872','#0a0808',.3,.3);b.outline('#0a0808');
    return b;
}

// Mire Hound: wide, low, wet dark hide with a ridge of bone spines and ember eyes. Pose 3 is the pounce crouch:
// head dropped, haunches up, spines bristling - the body is the telegraph.
function mireHound(pose) {
    if (pose === 7) return deadCanine(1);
    const s = ENEMY_SPECS[1], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { fur: '#3b2b22', furHi: '#5c4433', deep: '#1d1511', wet: '#6e5c4d', spine: '#8c7860', spineHi: '#c9b591', eye: '#ff8f2e', maw: '#7c1f1a', tooth: '#eadfc6' };
    const crouch = pose === 3, drop = pose === 7 ? 6 : crouch ? 2 : pose === 5 ? 1 : pose === 4 ? -1 : 0;
    const leg = (x, front, near, c, top = 1) => canineLeg(g, pose, x, top, front, near, c, C.spine);
    if (pose === 6 || pose === 7) C.eye = C.deep;
    // Far legs.
    leg(-9, false, false, C.deep, crouch ? -1 : 1); leg(6, true, false, C.deep, 1 + drop);
    // Ragged tail held low behind.
    g.line(-11, -3, -16, -5, C.fur, 2); g.line(-16, -5, -19, -3 + (pose === 1 ? -1 : 0), C.fur);
    // Long low body with a shoulder hump; the rear rises in the crouch.
    g.ell(-2, -2 + (pose === 7 ? 6 : crouch ? -1 : 0), 11, 5, C.fur);
    g.ell(5, -3 + drop / 2, 5.5, 4.5, C.fur);
    g.ell(-2, 1, 9, 1.6, C.deep);
    g.line(-9, -5, 0, -6, C.wet); g.line(2, -6, 6, -7 + drop / 2, C.wet);
    // Bone spines along the back, longer when bristling.
    [-10, -7, -4, -1, 2, 5].forEach((x, i) => {
        const len = 3 + (i % 2) + (crouch ? 2 : 0), base = -6 + (x > 0 ? drop / 2 : crouch ? -1 : 0);
        g.line(x, base, x - 2, base - len, C.spine); g.px(x - 2, base - len, C.spineHi);
    });
    // Neck, skull and an open, toothed maw.
    const head = at(b, s.origin[0] + (pose === 4 ? 2 : pose === 6 ? -2 : 0), s.origin[1]);
    head.poly([[6, -7 + drop], [11, -8 + drop], [13, -2 + drop], [7, 0 + drop]], C.fur);
    head.ell(14, -4 + drop, 4, 3, C.furHi);
    head.poly([[15, -6 + drop], [22, -4 + drop], [22, -2 + drop], [15, -1 + drop]], C.fur);
    head.rect(16, -2 + drop, 6, 2, C.maw);
    head.px(17, -2 + drop, C.tooth); head.px(19, -2 + drop, C.tooth); head.px(21, -2 + drop, C.tooth); head.px(18, -1 + drop, C.tooth);
    head.poly([[11, -7 + drop], [9, -12 + drop], [13, -7 + drop]], C.fur);
    head.px(15, -5 + drop, C.eye); head.px(16, -5 + drop, C.eye);
    // Near legs over the body.
    leg(-6, false, true, C.fur, crouch ? -1 : 1); leg(9, true, true, C.fur, 1 + drop);
    b.rim('#a08872', '#0b0806', .35, .3);
    b.outline('#0e0a08');
    return b;
}

// Ashling: small russet hunched demon with swept horns, long clawed arms and a skull belt. Pose 3 is the dart crouch.
function ashling(pose) {
    const s = ENEMY_SPECS[2], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { skin: '#8c3b29', skinHi: '#b85b3c', dark: '#5a2418', deep: '#33140e', horn: '#dacaa9', hornDk: '#9b8566', eye: '#ffb32e', bone: '#e2d6ba', rag: '#4a3424', ember: '#f08a44' };
    const step = stride(pose), leap = pose === 3, low = leap ? 2 : 0;
    // Digitigrade legs.
    g.line(-3, 3, -6 - step, 7, C.dark, 2); g.line(-6 - step, 7, -4 - step, 10, C.dark);
    g.line(1, 3, 3 + step, 7, C.skin, 2); g.line(3 + step, 7, 1 + step, 10, C.skin);
    // Whip tail.
    g.line(-5, 0, -9, -2, C.dark); g.line(-9, -2, -10, -5, C.dark);
    // Loin rag and skull trophies.
    g.poly([[-4, 1], [3, 1], [2, 6], [-3, 6]], C.rag);
    g.px(-2, 2, C.bone); g.px(1, 2, C.bone);
    // Hunched torso and forward head.
    g.ell(-1, -2 + low, 4.5, 4, C.skin);
    g.ell(-2, 0 + low, 3, 2.5, C.dark);
    g.px(-1, -4 + low, C.ember);
    g.ell(4, -6 + low, 3, 2.6, C.skinHi);
    g.px(5, -7 + low, C.eye); g.px(6, -5 + low, C.deep); g.px(7, -5 + low, C.bone);
    // Swept horns.
    g.line(3, -8 + low, 1, -12 + low, C.horn); g.line(1, -12 + low, -1, -13 + low, C.hornDk);
    g.line(5, -8 + low, 6, -12 + low, C.horn); g.px(5, -13 + low, C.hornDk);
    // Long arm: hanging claws or a lunging rake.
    if (leap) {
        g.line(2, -2 + low, 10, -3 + low, C.skin);
        g.px(11, -4 + low, C.horn); g.px(11, -2 + low, C.horn); g.px(12, -3 + low, C.horn);
    } else {
        const sway = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(2, -3, 6, 3 + sway, C.skin);
        g.px(7, 4 + sway, C.horn); g.px(6, 5 + sway, C.horn);
    }
    b.rim('#e09a72', '#120806', .4, .25);
    b.outline('#140906');
    return b;
}

// The Penitent: tall hooded guard in a pale ragged tabard, one great rusted shield facing forward, blade held low behind.
// Pose 3 thrusts the shield forward for the bash.
function penitent(pose) {
    const s = ENEMY_SPECS[3], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#cdc1a3', robeDk: '#9a8f78', robeDp: '#6a6252', armor: '#4a4440', armorHi: '#7c746b', deep: '#231f1d', skull: '#d9cdb1', void: '#0d0a09',
        shield: '#7c4f35', shieldHi: '#ab734e', shieldDk: '#4a2e20', rivet: '#dab282', blade: '#8b8f8d', bladeHi: '#cbcfca', chain: '#8a7a5a' };
    const step = stride(pose), bash = pose === 3 ? 3 : 0;
    // Armoured legs and sabatons.
    g.rect(-6, 10 + Math.max(0, step), 5, 10 - Math.max(0, step), C.armor);
    g.rect(1, 10 + Math.max(0, -step), 5, 10 - Math.max(0, -step), C.deep);
    g.rect(-7, 19, 7, 2, C.deep); g.rect(1, 19, 7, 2, C.deep);
    // Blade held low behind, notched edge catching light.
    g.line(-8, 0, -17, 15, C.blade, 2); g.line(-9, 0, -17, 14, C.bladeHi); g.rect(-9, -1, 3, 3, C.deep);
    // Ragged tabard over mail.
    g.poly([[-8, -12], [6, -12], [8, 17], [4, 14], [1, 18], [-2, 14], [-5, 18], [-9, 15]], C.robe);
    g.poly([[-8, -12], [-4, -12], [-5, 15], [-9, 15]], C.robeDk);
    g.line(2, -8, 3, 15, C.robeDp);
    // Chain and the corrupted star sigil.
    g.line(-3, -9, 1, -3, C.chain);
    g.px(0, 0, C.robeDp); g.px(-1, 1, C.robeDp); g.px(1, 1, C.robeDp); g.px(0, 2, C.robeDp); g.px(0, -1, C.robeDp);
    // Pauldrons.
    g.ell(-6, -12, 4, 3, C.armor); g.ell(5, -12, 4, 3, C.armorHi);
    // Deep hood with a skull face.
    g.poly([[-6, -13], [0, -24], [6, -13], [5, -8], [-5, -8]], C.robe);
    g.poly([[-6, -13], [0, -24], [-1, -9], [-5, -8]], C.robeDk);
    g.ell(2, -14, 2.8, 3.4, C.void);
    g.ell(2, -13, 1.8, 2.2, C.skull);
    g.px(1, -14, C.void); g.px(3, -14, C.void); g.px(2, -11, C.void);
    // The great shield always faces forward: this is the side that blocks.
    const x = 7 + bash;
    g.poly([[x, -13], [x + 8, -15], [x + 9, 12], [x + 4, 18], [x, 14]], C.shield);
    g.line(x, -13, x, 14, C.shieldDk); g.line(x + 8, -15, x + 9, 12, C.shieldHi);
    g.line(x + 4, -12, x + 4, 15, C.shieldDk); g.line(x + 1, -3, x + 8, -4, C.shieldDk);
    for (const [rx, ry] of [[1, -11], [7, -12], [1, 11], [8, 9], [4, -6], [4, 5]]) g.px(x + rx, ry, C.rivet);
    b.rim('#efe4c8', '#0c0908', .3, .3);
    b.outline('#100c0a');
    return b;
}

// Ash Slinger: lanky horned, hooded demon in burnt red rags with bells, swinging a burning ember on a chain.
// Pose 3 swings the ember overhead behind the head - the swing is the 0.65s telegraph.
function ashSlinger(pose) {
    const s = ENEMY_SPECS[4], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { rag: '#6c2b1f', ragHi: '#97432c', ragDk: '#3e1812', skin: '#7c4b37', skinDk: '#4a2a1e', horn: '#cfba95', hornDk: '#8b7659',
        skull: '#dccab0', void: '#130907', chain: '#6e5e4d', ember: '#ffb347', core: '#fff3b8', emberDk: '#e2531e', bell: '#b58d3c' };
    const step = stride(pose), windup = pose === 3;
    // Long digitigrade legs.
    g.line(-3, 4, -5 - step, 11, C.skinDk, 2); g.line(-5 - step, 11, -3 - step, 18, C.skinDk, 2);
    g.line(1, 4, 3 + step, 11, C.skin, 2); g.line(3 + step, 11, 1 + step, 18, C.skin, 2);
    // Tail.
    g.line(-6, 2, -11, 6, C.skinDk); g.line(-11, 6, -13, 3, C.skinDk);
    // Far arm.
    g.line(-3, -5, -6, 1, C.skinDk);
    // Rags and bells.
    g.poly([[-6, -7], [4, -7], [6, 8], [3, 6], [1, 10], [-2, 6], [-5, 9], [-7, 4]], C.rag);
    g.poly([[-6, -7], [-2, -7], [-4, 6], [-7, 4]], C.ragDk);
    g.line(1, -5, 3, 6, C.ragHi);
    g.px(-4, 5, C.bell); g.px(2, 7, C.bell); g.px(-1, 8, C.bell);
    // Hood, skull face and long horns.
    g.ell(1, -11, 4.2, 4, C.rag);
    g.ell(3, -10, 2.3, 2.6, C.void);
    g.px(3, -11, C.emberDk); g.px(4, -9, C.skull); g.px(3, -8, C.skull);
    g.line(-1, -14, -4, -19, C.horn); g.line(-4, -19, -3, -22, C.hornDk);
    g.line(3, -14, 6, -19, C.horn); g.line(6, -19, 5, -22, C.hornDk);
    // Sling arm, chain and the ember: low at the side while walking, overhead behind while winding up.
    const ember = (x, y, r) => {
        g.ell(x, y, r, r, C.emberDk); g.ell(x - .4, y - .4, r - 1, r - 1, C.ember);
        g.px(x - 1, y - 1, C.core); g.px(x, y - 1, C.core);
    };
    if (windup) {
        g.line(2, -6, -2, -15, C.skin, 2);
        g.line(-2, -15, -9, -19, C.chain);
        ember(-11, -20, 3.2);
    } else {
        const sw = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(2, -6, 7, -1, C.skin, 2);
        g.line(7, -1, 10 + sw, 7, C.chain);
        ember(10 + sw, 9, 2.6);
    }
    b.rim('#d98a66', '#0c0605', .35, .3);
    b.outline('#120806');
    // The ember stays bright over the outline so it reads at phone scale.
    const o = s.origin;
    if (windup) { b.set(o[0] - 12, o[1] - 21, C.core); }
    else b.set(o[0] + 10 + (pose === 1 ? 1 : pose === 2 ? -1 : 0), o[1] + 9, C.core);
    return b;
}

// Ash Priest: the tallest common silhouette - horned skull under a red hood, long tattered robes hung with bells, and a
// staff crowned by a burning lantern. Pose 3 lifts the lantern high: the heal/raise cast the hunter should interrupt.
function ashPriest(pose) {
    const s = ENEMY_SPECS[5], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#5e2a20', robeHi: '#8a3f2c', robeDk: '#331511', hood: '#7a3324', skull: '#d9cbb0', skullDk: '#9c8b70', void: '#120806',
        horn: '#c9b28c', hornDk: '#7e6a4e', staff: '#4a3424', staffHi: '#6e5038', brass: '#b58d3c', flame: '#ffb347', core: '#fff3b8', flameDk: '#e2531e', hand: '#7c5a48' };
    const step = stride(pose), cast = pose === 3;
    // Robe hem sways with the stride; feet barely show under the long robe.
    g.poly([[-7, -4], [6, -4], [9 + step, 18], [5, 16], [2, 19], [-1, 16], [-4, 19], [-8 - step, 17]], C.robe);
    g.poly([[-7, -4], [-3, -4], [-5, 16], [-8 - step, 17]], C.robeDk);
    g.line(2, -2, 4 + step, 15, C.robeHi);
    // Brass sigil disc and hanging bells.
    g.ell(0, 2, 2, 2, C.brass); g.px(0, 2, C.robeDk);
    g.px(-6, 9, C.brass); g.px(6 + step, 12, C.brass); g.px(-2, 14, C.brass);
    // Far arm: a clawed hand hanging a chain censer.
    g.line(-5, -6, -9, 2, C.robeDk, 2); g.line(-9, 2, -9, 7, C.brass); g.px(-9, 8, C.flameDk);
    // Hood and shoulder mantle.
    g.poly([[-4, -10], [5, -10], [8, -4], [6, -2], [-7, -2], [-9, -4]], C.hood);
    g.ell(1, -14, 4.6, 4.8, C.hood);
    // Skull face with ember eyes, inside the hood.
    g.ell(2, -13, 2.8, 3.2, C.skull);
    g.px(1, -14, C.void); g.px(3, -14, C.void); g.px(1, -14, C.flameDk);
    g.rect(1, -11, 3, 1, C.skullDk);
    // Long curling horns.
    g.line(-2, -17, -6, -21, C.horn); g.line(-6, -21, -5, -25, C.hornDk);
    g.line(4, -17, 8, -21, C.horn); g.line(8, -21, 7, -25, C.hornDk);
    // Staff and lantern: planted beside the priest while walking, lifted overhead during a cast.
    const lantern = (x, y) => {
        g.rect(x - 2, y - 3, 5, 6, C.brass);
        g.rect(x - 1, y - 2, 3, 4, C.flame);
        g.px(x, y - 1, C.core);
        g.px(x, y - 5, C.flameDk); g.px(x, y - 4, C.flame);
    };
    if (cast) {
        g.line(4, -7, 9, -15, C.hand, 2);
        g.line(10, -26, 10, 14, C.staff, 1); g.line(11, -26, 11, 14, C.staffHi, 1);
        lantern(10, -29);
    } else {
        const sw = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(4, -7, 9, -2, C.hand, 2);
        g.line(10 + sw, -19, 10, 18, C.staff, 1); g.line(11 + sw, -19, 11, 18, C.staffHi, 1);
        lantern(10 + sw, -22);
    }
    b.rim('#d98a66', '#0c0605', .35, .3);
    b.outline('#120806');
    // Lantern core stays bright above the outline: the priest is found by its light.
    const o = s.origin;
    if (cast) b.set(o[0] + 10, o[1] - 30, C.core);
    else b.set(o[0] + 10 + (pose === 1 ? 1 : pose === 2 ? -1 : 0), o[1] - 23, C.core);
    return b;
}

// Drowned Wraith: a gaunt drowned woman in cold blue-grey, soaked hair hanging over a skull face, rusted chains, and a
// shredded hem that never touches the ground - it dissolves into water. Pose 3 is the Chilling Touch: both clawed hands
// thrust forward and the hair streams back, matching the frontal wedge C# tests.
function drownedWraith(pose) {
    const s = ENEMY_SPECS[6], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { shroud: '#3c4a5c', shroudHi: '#61758c', shroudDk: '#232c3a', skin: '#8496a6', skinDk: '#56677a', face: '#b8c6d0',
        void: '#0b0f16', hair: '#1a1f28', hairHi: '#343d4c', chain: '#7a6248', water: '#8fc6e6', foam: '#d6f0ff', claw: '#d8e4ec' };
    const bob = pose === 1 ? -1 : pose === 2 ? 1 : 0, strike = pose === 3;
    const y = v => v + bob;
    // Tattered hem: long ragged strips trailing back and dissolving into droplets instead of feet.
    g.poly([[-7, y(-2)], [6, y(-2)], [9, y(12)], [6, y(10)], [5, y(18)], [2, y(13)], [0, y(20)], [-3, y(14)], [-5, y(19)], [-7, y(12)], [-10, y(15)]], C.shroud);
    g.poly([[-7, y(-2)], [-3, y(-2)], [-4, y(14)], [-5, y(19)], [-7, y(12)], [-10, y(15)]], C.shroudDk);
    g.line(2, y(0), 4, y(15), C.shroudHi); g.line(-1, y(2), 0, y(18), C.shroudHi);
    for (const [x, d] of [[-9, 18], [-4, 22], [1, 23], [6, 21], [8, 15]]) { g.px(x, y(d), C.water); g.px(x, y(d) + 2, C.foam); }
    // Rusted chain across the waist with a hanging cross.
    g.line(-6, y(2), 6, y(5), C.chain); g.line(-2, y(3), -3, y(10), C.chain);
    g.rect(-4, y(9), 3, 1, C.chain); g.rect(-3, y(8), 1, 4, C.chain);
    // Far arm, then the gaunt chest.
    if (strike) g.line(-2, y(-8), 9, y(-6), C.skinDk, 2);
    else g.line(-5, y(-8), -9, y(1), C.skinDk, 2);
    g.poly([[-5, y(-11)], [5, y(-11)], [6, y(-2)], [-6, y(-2)]], C.skin);
    g.line(-1, y(-9), -1, y(-3), C.skinDk); g.line(2, y(-8), 3, y(-4), C.skinDk);
    // Head bowed forward; hair hangs down past the shoulders, or streams back when it strikes.
    g.ell(3, y(-15), 3.6, 4, C.face);
    g.px(3, y(-16), C.void); g.px(5, y(-16), C.void); g.rect(3, y(-13), 3, 1, C.void);
    if (strike) {
        g.poly([[-1, y(-19)], [4, y(-20)], [1, y(-14)], [-9, y(-14)], [-13, y(-10)], [-8, y(-17)]], C.hair);
        g.line(-2, y(-18), -11, y(-12), C.hairHi);
    } else {
        g.poly([[-1, y(-19)], [5, y(-20)], [6, y(-17)], [1, y(-16)], [0, y(-5)], [-3, y(0)], [-5, y(-6)], [-4, y(-15)]], C.hair);
        g.line(-2, y(-15), -3, y(-3), C.hairHi);
    }
    // Near arm: long fingers hang low while drifting, or lunge out as a claw.
    if (strike) {
        g.line(3, y(-9), 13, y(-9), C.skin, 2);
        for (const d of [-11, -9, -7]) g.line(14, y(d), 16, y(d + 1), C.claw);
    } else {
        const sway = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(3, y(-9), 7, y(-1 + sway), C.skin, 2); g.line(7, y(-1 + sway), 8, y(5 + sway), C.skin);
        g.px(8, y(6 + sway), C.claw); g.px(9, y(6 + sway), C.claw); g.px(7, y(7 + sway), C.claw);
    }
    b.rim('#b6dcf2', '#06090e', .4, .3);
    b.outline('#070a10');
    return b;
}

// The Reliquary (concept 09): a towering crowned celebrant in rigid crimson vestments, a spoked gilt crown behind a
// porcelain mask, chains and bells across the robe, and a lantern censer swinging from each hand. It glides rather than
// walks, so poses 1-2 only swing the censers and the hem. Pose 3 is every rite's cast: both censers lifted high.
function reliquary(pose) {
    const s = ENEMY_SPECS[7], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#7a1820', robeHi: '#a8323a', robeDk: '#45101a', deep: '#24070c', stole: '#d8c8a4', stoleDk: '#a8977a', gold: '#c9a24a',
        goldHi: '#f0d27a', goldDk: '#7e6228', mask: '#e6dcc8', void: '#14060a', chain: '#8a7a5a', flame: '#ff8a3c', core: '#fff1c0', ember: '#d9452a' };
    const sway = pose === 1 ? 2 : pose === 2 ? -2 : 0, cast = pose === 3;
    // Spoked crown behind the head: the silhouette that names it from across the field.
    for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i + .5) * Math.PI / 9, r = i % 2 ? 11 : 15;
        const x = Math.round(Math.cos(a) * r), y = Math.round(-26 + Math.sin(a) * r);
        g.line(0, -26, x, y, C.gold); g.px(x, y, C.goldHi);
    }
    g.ell(0, -26, 7, 7, C.goldDk); g.ell(0, -26, 5.5, 5.5, C.deep);
    // Rigid bell-shaped vestment; the hem only shifts a pixel as it glides.
    g.poly([[-9, -14], [9, -14], [15 + sway / 2, 23], [-15 + sway / 2, 23]], C.robe);
    g.poly([[-9, -14], [-4, -14], [-9 + sway / 2, 23], [-15 + sway / 2, 23]], C.robeDk);
    g.line(6, -10, 11 + sway / 2, 22, C.robeHi); g.line(3, -8, 5 + sway / 2, 22, C.robeDk);
    g.rect(-15 + sway / 2, 22, 31, 2, C.gold); g.rect(-15 + sway / 2, 24, 31, 1, C.goldDk);
    // Bone stole down the front with a gilt sigil.
    g.poly([[-3, -13], [3, -13], [4, 21], [-4, 21]], C.stole);
    g.line(-3, -12, -4, 20, C.stoleDk);
    g.ell(0, 4, 2.5, 2.5, C.gold); g.px(0, 4, C.ember); g.line(0, 7, 0, 12, C.gold); g.line(-2, 9, 2, 9, C.gold);
    // Chains swagged across the robe, hung with bells.
    g.line(-12, 8, 0, 13, C.chain); g.line(0, 13, 13, 8, C.chain);
    for (const [x, y] of [[-12, 10], [-6, 13], [6, 13], [13, 10]]) { g.px(x, y, C.gold); g.px(x, y + 1, C.goldDk); }
    // Mantle and high collar.
    g.poly([[-11, -15], [11, -15], [13, -9], [-13, -9]], C.robeDk);
    g.rect(-11, -16, 23, 2, C.gold);
    // Hood and porcelain mask with hollow eyes.
    g.ell(0, -22, 5.5, 6, C.robeDk);
    g.ell(1, -21, 3.6, 4.2, C.mask);
    g.rect(-1, -22, 2, 1, C.void); g.rect(2, -22, 2, 1, C.void); g.line(1, -19, 1, -18, C.stoleDk);
    // Arms and twin censers: swinging at the hips, or lifted high to cast.
    const censer = (x, y) => {
        g.rect(x - 3, y - 3, 7, 8, C.goldDk); g.rect(x - 2, y - 2, 5, 6, C.gold);
        g.rect(x - 1, y - 1, 3, 4, C.flame); g.px(x, y, C.core);
        g.poly([[x - 3, y - 3], [x + 4, y - 3], [x, y - 7]], C.gold); g.px(x, y + 6, C.goldDk);
    };
    if (cast) {
        g.line(-9, -13, -16, -26, C.robe, 3); g.line(9, -13, 16, -26, C.robe, 3);
        g.line(-16, -27, -19, -21, C.chain); g.line(16, -27, 19, -21, C.chain);
        censer(-20, -17); censer(20, -17);
    } else {
        g.line(-9, -13, -14, -3, C.robe, 3); g.line(9, -13, 14, -3, C.robe, 3);
        g.line(-14, -2, -17 - sway, 9, C.chain); g.line(14, -2, 17 - sway, 9, C.chain);
        censer(-17 - sway, 13); censer(17 - sway, 13);
    }
    b.rim('#e88a7a', '#0a0305', .35, .3);
    b.outline('#0c0406');
    // Censer cores stay lit above the outline: its light is how the hunter tracks it.
    const o = s.origin;
    for (const [x, y] of cast ? [[-20, -17], [20, -17]] : [[-17 - sway, 13], [17 - sway, 13]]) b.set(o[0] + x, o[1] + y, C.core);
    return b;
}

// Reliquary ward: a bone-and-gilt reliquary box on an iron stake driven into the ground, crimson glass glowing and a
// small flame on its spire. Poses 0-2 flicker; pose 3 (the fuse warning) flares white-hot.
function reliquaryWard(pose) {
    const s = ENEMY_SPECS[8], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { iron: '#3a3236', ironDk: '#1c171a', bone: '#d8c8a4', boneDk: '#a8977a', gold: '#c9a24a', goldDk: '#7e6228', glass: '#b02a34',
        glassHi: '#e2525a', flame: '#ff8a3c', core: '#fff1c0', chain: '#8a7a5a' };
    const flare = pose === 3, flick = pose === 1 ? -1 : 0;
    // Stake and its splayed ground spikes.
    g.line(0, -1, 0, 11, C.iron, 2); g.line(-5, 12, 0, 8, C.ironDk); g.line(5, 12, 0, 8, C.ironDk);
    // Hanging chains with bells.
    g.line(-6, -6, -8, 3, C.chain); g.line(6, -6, 8, 3, C.chain); g.px(-8, 4, C.gold); g.px(8, 4, C.gold);
    // The reliquary box.
    g.rect(-6, -12, 13, 11, C.goldDk); g.rect(-5, -11, 11, 9, C.bone); g.line(-5, -11, -5, -3, C.boneDk);
    g.rect(-2, -10, 5, 6, flare ? C.glassHi : C.glass); g.px(0, -8, flare ? C.core : C.glassHi);
    // Gabled spire and flame.
    g.poly([[-7, -12], [7, -12], [0, -18]], C.gold);
    const h = flare ? 6 : 3;
    g.ell(0, -19 - h / 2 + flick, flare ? 3 : 2, h / 2 + 1, C.flame);
    g.px(0, -19 + flick, C.core);
    b.rim('#f0d27a', '#0a0305', .35, .3);
    b.outline('#0c0406');
    const o = s.origin;
    b.set(o[0], o[1] - 19 + flick, C.core);
    if (flare) b.set(o[0], o[1] - 8, C.core);
    return b;
}

// The Bell Warden (concept 08): a hulking monastery guardian in rusted plate under a spiked skull helm, a torn crimson
// tabard and a great bronze bell swung from its forward fist, a chained lantern in the other. Poses 1-2 are the heavy
// stomp with the bell swaying; pose 3 is every tell: the bell heaved high overhead, so the raised bell itself is the warning.
function bellWarden(pose) {
    const s = ENEMY_SPECS[9], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { armor: '#3d322d', armorHi: '#6f5b4c', armorDk: '#1d1714', rust: '#7c4a2c', bronze: '#a8742e', bronzeHi: '#dcaa5c',
        bronzeDk: '#5c3c17', cloth: '#8a1c1e', clothHi: '#b53a30', clothDk: '#4c0d11', bone: '#cfbd9b', boneDk: '#8e7c60', void: '#120606',
        ember: '#ff7a2c', core: '#fff1c0', chain: '#6e6050' };
    const step = pose === 1 ? 2 : pose === 2 ? -2 : 0, raised = pose === 3, sway = raised ? 0 : -step / 2;
    const bell = (cx, top, h, w) => {
        g.poly([[cx - w / 3, top], [cx + w / 3, top], [cx + w / 2, top + h], [cx - w / 2, top + h]], C.bronze);
        g.poly([[cx - w / 3, top], [cx - w / 6, top], [cx - w / 4, top + h], [cx - w / 2, top + h]], C.bronzeDk);
        g.line(cx + w / 5, top + 2, cx + w / 3, top + h - 2, C.bronzeHi);
        g.rect(cx - w / 2 - 1, top + h, w + 3, 3, C.bronzeDk); g.rect(cx - w / 2, top + h, w + 1, 1, C.bronzeHi);
        g.ell(cx, top - 1, w / 5, 2.5, C.bronzeDk);
        // The cross cast into the bell's shoulder.
        g.line(cx, top + 3, cx, top + h * .55, C.bronzeDk); g.line(cx - 3, top + 6, cx + 3, top + 6, C.bronzeDk);
        for (const x of [cx - w / 2 + 2, cx, cx + w / 2 - 2]) g.px(x, top + h + 3, C.chain);
    };
    // Armoured legs in a wide, heavy stance.
    g.poly([[-12, 6], [-4, 6], [-6 - step, 29], [-14 - step, 29]], C.armorDk);
    g.poly([[4, 6], [12, 6], [13 + step, 29], [5 + step, 29]], C.armor);
    g.line(9, 8, 10 + step, 27, C.armorHi);
    g.rect(-16 - step, 28, 11, 4, C.armorDk); g.rect(4 + step, 28, 12, 4, C.armor); g.rect(5 + step, 28, 10, 1, C.armorHi);
    g.ell(-9 - step / 2, 17, 4, 3, C.rust); g.ell(9 + step / 2, 17, 4, 3, C.armorHi);
    // Massive breastplate and pauldrons.
    g.poly([[-17, -27], [17, -27], [14, 8], [-14, 8]], C.armor);
    g.poly([[-17, -27], [-6, -27], [-8, 8], [-14, 8]], C.armorDk);
    g.line(10, -24, 9, 4, C.armorHi); g.line(-2, -20, 3, -12, C.rust); g.line(5, -6, 9, -1, C.rust);
    // Overlapping plate seams and rivets break up the chest.
    for (const y of [-18, -12]) { g.line(-15, y, 15, y, C.armorDk); g.line(-5, y + 1, 14, y + 1, C.armorHi); }
    for (const [x, y] of [[-12, -22], [-4, -22], [6, -22], [13, -22], [-11, -15], [12, -15]]) g.px(x, y, C.rust);
    g.ell(-18, -24, 8, 6, C.armorDk); g.ell(18, -24, 8, 6, C.armor); g.ell(19, -26, 5, 3, C.armorHi);
    for (const [x0, y0, x1, y1] of [[-20, -28, -24, -35], [-15, -29, -16, -36], [17, -29, 18, -36], [22, -28, 26, -35]]) g.line(x0, y0, x1, y1, C.armorHi);
    // Torn crimson tabard with a hanging gilt medallion.
    g.poly([[-7, -6], [7, -6], [9 + sway, 25], [-9 + sway, 25]], C.cloth);
    g.poly([[-7, -6], [-3, -6], [-5 + sway, 25], [-9 + sway, 25]], C.clothDk);
    g.line(4, -4, 6 + sway, 23, C.clothHi);
    for (const x of [-7, -3, 2, 6]) g.line(x + sway, 23, x + sway + 1, 27, C.clothDk);
    g.rect(-15, -8, 31, 3, C.bronzeDk); g.rect(-15, -8, 31, 1, C.bronze);
    g.ell(0, -1, 3.5, 3.5, C.bronze); g.px(0, -1, C.ember); g.line(0, -5, 0, -8, C.chain);
    // Skull helm under a crown of spikes.
    g.ell(1, -34, 7, 8, C.armorDk);
    for (const [x, y] of [[-5, -44], [-1, -47], [3, -47], [7, -44]]) g.line(1, -38, x, y, C.armor);
    g.ell(3, -33, 4.6, 5.2, C.bone); g.line(-1, -36, -1, -29, C.boneDk);
    g.rect(1, -35, 2, 2, C.void); g.rect(5, -35, 2, 2, C.void); g.px(2, -34, C.ember); g.px(6, -34, C.ember);
    g.rect(2, -30, 5, 2, C.void); g.px(3, -30, C.bone); g.px(5, -30, C.bone);
    // Rear arm: a chained lantern swinging low.
    g.line(-18, -21, -22, -3, C.armorDk, 4); g.ell(-22, -2, 3.5, 3, C.armor);
    g.line(-22, 0, -24 + sway, 10, C.chain);
    g.rect(-28 + sway, 10, 8, 10, C.bronzeDk); g.rect(-27 + sway, 11, 6, 8, C.ember); g.rect(-25 + sway, 13, 2, 4, C.core);
    g.poly([[-29 + sway, 10], [-19 + sway, 10], [-24 + sway, 6]], C.bronze);
    // Forward arm and the great bell: carried at the hip, or heaved high overhead before it falls.
    if (raised) {
        g.line(18, -26, 16, -44, C.armor, 5); g.ell(15, -46, 4, 3.5, C.armorHi);
        bell(13, -59, 16, 22);
    } else {
        g.line(18, -21, 23, -8, C.armor, 5); g.ell(24, -7, 4, 3.5, C.armorHi);
        g.line(24, -5, 26 + sway, -1, C.chain);
        bell(27 + sway, -1, 17, 22);
    }
    b.rim('#f0b070', '#080404', .35, .3);
    b.outline('#0a0606');
    // Eyes, lantern and medallion stay lit above the outline: the Warden is tracked by its embers.
    const o = s.origin;
    for (const [x, y] of [[2, -34], [6, -34], [0, -1], [-24 + sway, 14], [-24 + sway, 15]]) b.set(o[0] + x, o[1] + y, C.core);
    return b;
}

// Frostling Packling: a small feral scavenger on long clawed limbs, its back a bristling mane of rime crystals and two cold
// blue eyes. Pose 3 is the skitter crouch: belly to the snow, mane flared, claws planted - the body is the lunge tell.
function frostlingPackling(pose) {
    const s = ENEMY_SPECS[10], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { hide: '#8a8580', hideHi: '#b9b3aa', hideDk: '#57524f', deep: '#2c2a2b', claw: '#e7ecef', crystal: '#bfe6f4',
        crystalHi: '#f2fdff', crystalDk: '#5f9cb8', eye: '#7fe4ff', maw: '#3b1f27', tooth: '#eef3f2' };
    const crouch = pose === 3, low = crouch ? 2 : 0, gait = pose === 1 ? 2 : pose === 2 ? -2 : 0;
    const limb = (x0, y0, x1, y1, c) => { g.line(x0, y0, x1, y1, c, 2); g.px(x1 + 1, y1 + 1, C.claw); g.px(x1 + 2, y1, C.claw); };
    // Far limbs, splayed spider-wide so the silhouette reads as low and quick.
    limb(-6, 1 + low, -11 - gait, 8, C.deep); limb(4, 0 + low, 8 + gait, 8, C.deep);
    // Lean ribbed body slung between the limbs.
    g.ell(-1, -1 + low, 8, 4, C.hide);
    g.ell(-2, 1 + low, 6, 2, C.hideDk);
    for (const x of [-4, -1, 2]) g.line(x, 0 + low, x + 1, 2 + low, C.hideDk);
    // Rime mane: a crown of crystal spikes down the spine, longer and flared in the crouch.
    [-8, -5, -2, 1, 4].forEach((x, i) => {
        const len = 4 + (i % 2) * 2 + (crouch ? 3 : 0), lean = crouch ? -2 : -1;
        g.line(x, -3 + low, x + lean, -3 + low - len, C.crystalDk);
        g.line(x + 1, -3 + low, x + 1 + lean, -2 + low - len, C.crystal);
        g.px(x + lean, -3 + low - len, C.crystalHi);
    });
    // Head thrust forward: a narrow skull, open maw and the cold eyes.
    g.ell(9, -2 + low * 1.5, 4, 3, C.hideHi);
    g.poly([[11, -1 + low * 1.5], [16, 0 + low * 1.5], [15, 2 + low * 1.5], [10, 2 + low * 1.5]], C.hide);
    g.rect(12, 1 + low * 1.5, 4, 1, C.maw);
    g.px(13, 1 + low * 1.5, C.tooth); g.px(15, 1 + low * 1.5, C.tooth);
    g.px(10, -3 + low * 1.5, C.eye); g.px(12, -3 + low * 1.5, C.eye);
    g.line(7, -4 + low, 6, -8 + low, C.crystal);
    // Near limbs over the body; long hooked forelimb reaching ahead.
    limb(-4, 1 + low, -7 + gait, 9, C.hideDk);
    if (crouch) limb(6, 1 + low, 13, 8, C.hideHi);
    else limb(6, 0, 10 - gait, 9, C.hideHi);
    b.rim('#e6f6ff', '#0a0f14', .4, .3);
    b.outline('#0b1016');
    // Eyes stay lit over the outline: a pack is tracked by its eyes in the snow.
    const o = s.origin;
    b.set(o[0] + 10, o[1] - 3 + Math.round(low * 1.5), C.crystalHi);
    return b;
}

// Shardcaster: a tall hooded winter adept in layered frost-stiff grey robes, ice shards bristling from its shoulders and
// back, carrying a long jagged ice lance. Pose 3 draws the lance back level at the shoulder, point toward the hunter:
// the straight lane on the ground and the levelled lance are the same tell.
function shardcaster(pose) {
    const s = ENEMY_SPECS[11], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#6f6a66', robeHi: '#9d978f', robeDk: '#433f3d', deep: '#211f21', void: '#0b0d12', skin: '#a9b4bb',
        ice: '#a9dcf0', iceHi: '#effcff', iceDk: '#4e8fb0', chain: '#7c7f86', eye: '#8ce8ff' };
    const step = stride(pose), aim = pose === 3;
    const shard = (x0, y0, x1, y1) => { g.line(x0, y0, x1, y1, C.iceDk, 2); g.line(x0, y0, x1, y1, C.ice); g.px(x1, y1, C.iceHi); };
    // Legs hidden under a long, ragged hem; only the feet step.
    g.rect(-5 - step, 19, 4, 2, C.deep); g.rect(2 + step, 19, 4, 2, C.deep);
    // Back shards fan out behind the shoulders: the silhouette is a crown of ice, not horns.
    for (const [x0, y0, x1, y1] of [[-6, -14, -15, -26], [-4, -16, -9, -30], [-1, -16, -1, -31], [-7, -10, -18, -17], [-6, -5, -16, -6]]) shard(x0, y0, x1, y1);
    // Layered robe, stiff and torn into icicle-like strips at the hem.
    g.poly([[-8, -14], [6, -14], [9, 19], [5, 15], [3, 20], [0, 15], [-3, 20], [-6, 15], [-9, 19]], C.robe);
    g.poly([[-8, -14], [-3, -14], [-4, 18], [-9, 19]], C.robeDk);
    g.line(3, -10, 5, 16, C.robeHi);
    for (const x of [-6, -2, 2, 6]) g.px(x, 19 - (x & 1), C.iceHi);
    g.line(-6, -4, 5, -2, C.chain);
    // Shoulder shards.
    shard(-5, -14, -8, -21); shard(4, -14, 8, -23);
    // Deep hood with only the cold eyes showing.
    g.poly([[-6, -15], [1, -27], [7, -15], [6, -9], [-5, -9]], C.robe);
    g.poly([[-6, -15], [1, -27], [-1, -10], [-5, -9]], C.robeDk);
    g.ell(3, -15, 2.8, 3.4, C.void);
    g.px(2, -16, C.eye); g.px(4, -16, C.eye);
    // Lance arm: carried trailing low while it walks, levelled at the shoulder while it aims.
    if (aim) {
        g.line(4, -11, -3, -11, C.skin, 2);
        g.line(-12, -11, 22, -11, C.iceDk, 3); g.line(-12, -12, 22, -12, C.ice); g.line(16, -12, 24, -11, C.iceHi);
        g.poly([[20, -14], [26, -11], [20, -8]], C.ice);
    } else {
        const sw = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(4, -11, 9, -2, C.skin, 2);
        g.line(2, 10 + sw, 18, -12 + sw, C.iceDk, 2); g.line(3, 9 + sw, 18, -12 + sw, C.ice); g.px(19, -13 + sw, C.iceHi);
    }
    b.rim('#dff6ff', '#07090d', .35, .3);
    b.outline('#080a0f');
    const o = s.origin;
    b.set(o[0] + 2, o[1] - 16, C.iceHi); b.set(o[0] + 4, o[1] - 16, C.iceHi);
    if (aim) b.set(o[0] + 24, o[1] - 11, C.iceHi);
    return b;
}

// Whitefang Stalker: a big pale wolf-thing, shoulders higher than its haunches, its whole back and tail bristling with
// long ice quills and two blue eyes over a snarling muzzle. Not the Mire Hound: pale where the hound is dark, tall where it
// is low, a quill-crowned predator rather than a bone-spined scavenger. Pose 3 is the coiled flank crouch: haunches
// raised, chest to the snow, quills flared - the body is the pounce tell.
function whitefangStalker(pose) {
    if (pose === 7) return deadCanine(12);
    const s = ENEMY_SPECS[12], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { fur: '#b8b3ab', furHi: '#e2ded6', furDk: '#7d7872', deep: '#45413f', claw: '#1c1a1c', quill: '#a9dcf0',
        quillHi: '#f1fcff', quillDk: '#4f8fb2', eye: '#7fe4ff', maw: '#3a1c24', tooth: '#f4f6f2' };
    const coil = pose === 3, drop = pose === 7 ? 6 : coil ? 3 : pose === 5 ? 1 : pose === 4 ? -1 : 0;
    const leg = (x, top, front, near, c) => canineLeg(g, pose, x, top, front, near, c, C.claw, 3);
    if (pose === 6 || pose === 7) C.eye = C.deep;
    // Far legs.
    leg(-10, 2 - (coil ? 2 : 0), false, false, C.furDk); leg(7, 2 + drop, true, false, C.furDk);
    // Long quilled tail swept back and up.
    g.line(-13, -4, -21, -9, C.furDk, 3); g.line(-21, -9, -25, -8 + (pose === 1 ? -1 : 0), C.fur, 2);
    for (const [x, y] of [[-16, -7], [-20, -9], [-23, -9]]) { g.line(x, y, x - 3, y - 4, C.quillDk); g.px(x - 3, y - 4, C.quillHi); }
    // Deep-chested body: high shoulders, lean waist; the haunches rise in the coil.
    g.ell(-6, -2 - (coil ? 2 : 0), 8, 5, C.fur);
    g.ell(4, -4 + drop, 8, 6.5, C.fur);
    g.ell(0, 2, 10, 1.8, C.furDk);
    g.line(-12, -5, 8, -9 + drop, C.furHi);
    // Ice quills down the whole back, longest at the shoulders, flared in the coil.
    [-12, -9, -6, -3, 0, 3, 6, 9].forEach((x, i) => {
        const shoulder = x > -2 ? 3 : 0, len = 4 + (i % 2) * 2 + shoulder + (coil ? 3 : 0);
        const base = x > -2 ? -9 + drop : -7 - (coil ? 2 : 0);
        g.line(x, base, x - 3, base - len, C.quillDk, 2);
        g.line(x + 1, base, x - 2, base - len, C.quill);
        g.px(x - 3, base - len, C.quillHi);
    });
    // Head: long wolf muzzle, snarling, ears pinned back, eyes lit.
    const head = at(b, s.origin[0] + (pose === 4 ? 2 : pose === 6 ? -2 : 0), s.origin[1]);
    const hy = drop + (coil ? 1 : 0);
    head.ell(14, -6 + hy, 5, 4, C.furHi);
    head.poly([[16, -7 + hy], [25, -4 + hy], [24, -1 + hy], [16, 0 + hy]], C.fur);
    head.rect(18, -2 + hy, 6, 2, C.maw);
    for (const x of [18, 20, 22]) head.px(x, -2 + hy, C.tooth);
    head.px(19, -1 + hy, C.tooth); head.px(23, -1 + hy, C.tooth);
    head.poly([[11, -9 + hy], [9, -14 + hy], [14, -9 + hy]], C.furDk);
    head.px(16, -7 + hy, C.eye); head.px(17, -7 + hy, C.eye);
    // Near legs over the body, forelimb reaching in the stride.
    leg(-6, 2 - (coil ? 2 : 0), false, true, C.fur); leg(10, 2 + drop, true, true, C.furHi);
    b.rim('#eef9ff', '#0a0e13', .4, .3);
    b.outline('#0a0d12');
    const o = s.origin;
    const headOffset = pose === 4 ? 2 : pose === 6 ? -2 : 0;
    b.set(o[0] + 16 + headOffset, o[1] - 7 + hy, pose === 6 ? C.deep : C.quillHi); b.set(o[0] + 17 + headOffset, o[1] - 7 + hy, C.eye);
    return b;
}

// Cairn Sentinel: a frost-sealed monastery guardian in dark riveted plate, a great helm, icicles hanging from every edge,
// a tall tower shield with a gilt cross-frame on its front arm and a heavy flanged mace trailing behind. Not the Penitent:
// dark iron and ice where the Penitent is pale cloth and rust, a wall rather than a guard. Pose 3 is the Frost Brace:
// shield planted low before it, body sunk behind it - the stance and the drawn front arc are the same tell.
function cairnSentinel(pose) {
    const s = ENEMY_SPECS[13], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { plate: '#3d3f45', plateHi: '#676b74', plateDk: '#24252a', deep: '#141518', rivet: '#8d9099', ice: '#cbe9f4',
        iceHi: '#f4fdff', iceDk: '#6aa6c0', gilt: '#b78a3e', giltHi: '#e3bd6b', shield: '#2f3136', void: '#07080b', eye: '#8ce8ff' };
    const step = stride(pose), brace = pose === 3, sink = brace ? 3 : 0;
    const icicles = (x0, x1, y, every = 3) => { for (let x = x0; x <= x1; x += every) g.line(x, y, x, y + 2 + ((x * 7) & 3), C.ice); };
    // Heavy legs and sabatons; braced, the stance widens.
    const spread = brace ? 2 : 0;
    g.rect(-9 - spread, 12 + sink + Math.max(0, step), 7, 13 - sink - Math.max(0, step), C.plate);
    g.rect(2 + spread, 12 + sink + Math.max(0, -step), 7, 13 - sink - Math.max(0, -step), C.plateDk);
    g.rect(-10 - spread, 24, 9, 3, C.deep); g.rect(1 + spread, 24, 9, 3, C.deep);
    // Flanged mace trailing low behind.
    g.line(-9, -2 + sink, -18, 14, C.plateDk, 2);
    g.rect(-22, 13, 7, 7, C.plate); g.rect(-21, 14, 5, 5, C.plateHi);
    for (const [x, y] of [[-23, 16], [-14, 16], [-19, 12], [-19, 20]]) g.px(x, y, C.rivet);
    // Massive plated torso with a frosted tabard of hanging ice.
    g.poly([[-11, -14 + sink], [9, -14 + sink], [10, 13 + sink], [-11, 13 + sink]], C.plate);
    g.poly([[-11, -14 + sink], [-4, -14 + sink], [-5, 13 + sink], [-11, 13 + sink]], C.plateDk);
    g.line(4, -12 + sink, 5, 12 + sink, C.plateHi);
    for (const y of [-8, -2, 4]) g.line(-10, y + sink, 9, y + sink, C.deep);
    for (const [x, y] of [[-8, -11], [6, -11], [-8, 9], [6, 9]]) g.px(x, y + sink, C.rivet);
    icicles(-10, 9, 13 + sink, 2);
    // Pauldrons crusted with ice.
    g.ell(-10, -14 + sink, 5, 4, C.plate); g.ell(8, -14 + sink, 5, 4, C.plateHi);
    icicles(-14, -6, -11 + sink); icicles(4, 12, -11 + sink);
    // Great helm: flat-topped, a single dark slit with a cold glint.
    g.rect(-6, -27 + sink, 12, 13, C.plate);
    g.rect(-6, -27 + sink, 4, 13, C.plateDk);
    g.rect(-5, -28 + sink, 10, 2, C.plateHi);
    g.rect(-1, -22 + sink, 7, 2, C.void);
    g.line(2, -20 + sink, 2, -15 + sink, C.deep);
    icicles(-5, 5, -15 + sink, 2);
    // Tower shield on the front arm, gilt cross-frame; braced, it is planted lower and further forward.
    const x = 10 + (brace ? 3 : 0), top = -22 + (brace ? 4 : 0), bottom = 22 + (brace ? 3 : 0);
    g.poly([[x, top + 2], [x + 11, top], [x + 12, bottom - 2], [x + 1, bottom]], C.shield);
    g.line(x, top + 2, x + 1, bottom, C.deep); g.line(x + 11, top, x + 12, bottom - 2, C.plateHi);
    g.line(x + 2, top + 3, x + 10, top + 1, C.gilt); g.line(x + 2, bottom - 2, x + 10, bottom - 3, C.gilt);
    g.line(x + 6, top + 2, x + 7, bottom - 2, C.gilt, 2); g.line(x + 2, top + 12, x + 11, top + 11, C.gilt, 2);
    g.px(x + 6, top + 11, C.giltHi); g.px(x + 7, top + 12, C.giltHi);
    icicles(x + 1, x + 11, top + 1, 2);
    for (const y of [top + 18, top + 30]) g.line(x + 1, y, x + 11, y - 1, C.iceDk);
    if (brace) for (let i = 0; i < 4; i++) g.line(x + 1 + i * 3, bottom + 1, x + i * 3 - 1, bottom + 3, C.iceHi);
    b.rim('#d9f2ff', '#060709', .3, .3);
    b.outline('#06070a');
    const o = s.origin;
    b.set(o[0] + 3, o[1] - 22 + sink, C.eye); b.set(o[0] + 4, o[1] - 22 + sink, C.iceHi);
    return b;
}

// Hoarfrost Cantor (concept 02): a tall hunched elder in a tattered ivory robe with a cold blue stole, a crown of pale antlers
// strung with little bells, and a staff topped by a hanging rime lantern. Not the Ash Priest: ivory and blue where the priest
// is ember-red, antlers instead of horns, and it never casts at the hunter - pose 3 is the chant, both arms raised and the
// lantern held high over the pack.
function hoarfrostCantor(pose) {
    const s = ENEMY_SPECS[14], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#cfc6b0', robeHi: '#efe8d6', robeDk: '#8d846f', stole: '#4f7d9a', stoleDk: '#2f5068', void: '#0c1016',
        face: '#a9b6bd', antler: '#e2dccb', antlerDk: '#9a927e', bell: '#9fb7c6', staff: '#5c5348', staffHi: '#7d7262',
        rime: '#a9dcf0', glow: '#effcff', hand: '#9aa6ad' };
    const step = stride(pose), chant = pose === 3;
    // Long robe, hem torn into frozen strips; it hunches forward.
    g.poly([[-8, -8], [6, -8], [10 + step, 20], [6, 17], [3, 21], [0, 17], [-3, 21], [-6, 17], [-10 - step, 20]], C.robe);
    g.poly([[-8, -8], [-3, -8], [-5, 19], [-10 - step, 20]], C.robeDk);
    g.line(3, -5, 5 + step, 17, C.robeHi);
    for (const x of [-7, -3, 1, 5]) g.px(x, 20 - (x & 1), C.rime);
    // Blue stole hanging down the front with bell tassels.
    g.poly([[-3, -8], [3, -8], [2, 12], [-2, 12]], C.stole);
    g.line(-3, -8, -2, 12, C.stoleDk);
    g.px(-2, 13, C.bell); g.px(2, 13, C.bell);
    // Hood and bowed head.
    g.poly([[-6, -9], [6, -9], [5, -17], [0, -20], [-5, -17]], C.robe);
    g.poly([[-6, -9], [-2, -9], [-3, -18], [-5, -17]], C.robeDk);
    g.ell(1, -14, 2.6, 3, C.void); g.px(0, -15, C.rime); g.px(2, -15, C.rime);
    g.rect(0, -12, 2, 1, C.face);
    // Antler crown: two branching racks, bells hung at the tips.
    for (const [sx] of [[-1], [1]]) {
        g.line(sx * 2, -19, sx * 7, -26, C.antler); g.line(sx * 7, -26, sx * 9, -32, C.antler);
        g.line(sx * 5, -23, sx * 2, -28, C.antlerDk); g.line(sx * 7, -26, sx * 12, -27, C.antlerDk);
        g.px(sx * 12, -26, C.bell); g.px(sx * 9, -33, C.bell);
    }
    const lantern = (x, y) => {
        g.line(x, y - 3, x, y - 1, C.staff);
        g.poly([[x - 2, y], [x + 2, y], [x + 1, y + 5], [x - 1, y + 5]], C.bell);
        g.rect(x - 1, y + 1, 2, 3, C.rime); g.px(x, y + 2, C.glow);
    };
    if (chant) {
        // Both arms lifted: the far one open-palmed, the near one raising the lantern staff.
        g.line(-5, -7, -12, -18, C.hand, 2); g.px(-13, -20, C.glow);
        g.line(4, -7, 11, -16, C.hand, 2);
        g.line(12, -32, 12, 12, C.staff); g.line(13, -32, 13, 12, C.staffHi);
        g.line(9, -32, 16, -32, C.staff);
        lantern(15, -31);
    } else {
        const sw = pose === 1 ? 1 : pose === 2 ? -1 : 0;
        g.line(-5, -7, -8, 3, C.robeDk, 2);
        g.line(4, -7, 10, -1, C.hand, 2);
        g.line(11 + sw, -24, 11, 20, C.staff); g.line(12 + sw, -24, 12, 20, C.staffHi);
        g.line(8 + sw, -24, 15 + sw, -24, C.staff);
        lantern(14 + sw, -23);
    }
    b.rim('#dff6ff', '#07090d', .35, .3);
    b.outline('#0a0d12');
    const o = s.origin;
    if (chant) b.set(o[0] + 15, o[1] - 29, C.glow);
    else b.set(o[0] + 14 + (pose === 1 ? 1 : pose === 2 ? -1 : 0), o[1] - 21, C.glow);
    return b;
}

// Mirror Wisp (concept 06): a slender pale woman of frosted glass - long white hair, a shard-diamond diadem, a gown that
// thins to nothing below the knees, and ice diamonds orbiting her. The renderer draws her translucent while veiled; the
// sprite keeps hard, glassy facet light so she reads as "reflection", not "ghost". Pose 3 is the Shiver Cut wind-up: the
// near arm drawn back with a long glass blade of a hand, hair flaring.
function mirrorWisp(pose) {
    const s = ENEMY_SPECS[15], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { gown: '#c8dce6', gownHi: '#f2fbff', gownDk: '#7f9fb2', skin: '#dce8ee', face: '#f4f9fb', void: '#1a2836',
        hair: '#9fc0d2', hairDk: '#5f8296', ice: '#a9dcf0', iceHi: '#ffffff', iceDk: '#4e8fb0', eye: '#5fd2ff' };
    const bob = pose === 1 ? -1 : pose === 2 ? 1 : 0, cut = pose === 3;
    const y = v => v + bob;
    const diamond = (x, yy) => { g.poly([[x, yy - 3], [x + 2, yy], [x, yy + 3], [x - 2, yy]], C.ice); g.px(x, yy - 1, C.iceHi); };
    // Gown thinning to glass splinters instead of feet.
    g.poly([[-6, y(-4)], [5, y(-4)], [8, y(10)], [5, y(16)], [2, y(12)], [0, y(19)], [-2, y(12)], [-5, y(16)], [-8, y(10)]], C.gown);
    g.poly([[-6, y(-4)], [-2, y(-4)], [-2, y(12)], [-5, y(16)], [-8, y(10)]], C.gownDk);
    g.line(2, y(-2), 4, y(12), C.gownHi);
    for (const [x, d] of [[-6, 19], [-1, 22], [4, 20]]) g.px(x, y(d), C.ice);
    // Narrow torso and shoulders.
    g.poly([[-4, y(-12)], [4, y(-12)], [5, y(-4)], [-5, y(-4)]], C.gown);
    g.line(0, y(-11), 0, y(-5), C.gownDk);
    // Far arm.
    if (cut) g.line(-3, y(-10), -9, y(-15), C.skin, 2); else g.line(-4, y(-10), -7, y(0), C.skin, 2);
    // Head, long hair falling (or flaring back), shard diadem.
    g.ell(1, y(-16), 3.2, 3.6, C.face);
    g.px(0, y(-16), C.eye); g.px(2, y(-16), C.eye); g.px(1, y(-14), C.void);
    if (cut) {
        g.poly([[-2, y(-20)], [4, y(-20)], [-2, y(-15)], [-12, y(-12)], [-14, y(-16)]], C.hair);
        g.line(-3, y(-18), -12, y(-14), C.hairDk);
    } else {
        g.poly([[-2, y(-20)], [4, y(-20)], [5, y(-16)], [3, y(-15)], [-2, y(-15)], [-3, y(0)], [-5, y(-6)], [-4, y(-17)]], C.hair);
        g.line(-3, y(-14), -4, y(-3), C.hairDk);
    }
    for (const [x, d] of [[-2, -22], [1, -24], [4, -22]]) { g.line(x, y(d + 2), x, y(d), C.ice); g.px(x, y(d - 1), C.iceHi); }
    // Near arm: hangs lightly while drifting; in the wind-up it trails a long glass blade.
    if (cut) {
        g.line(3, y(-10), 9, y(-6), C.skin, 2);
        g.line(9, y(-6), 20, y(-14), C.iceDk, 2); g.line(9, y(-7), 20, y(-14), C.ice); g.px(21, y(-15), C.iceHi);
    } else {
        g.line(3, y(-10), 6, y(-2), C.skin, 2); g.line(6, y(-2), 8, y(4), C.ice); g.px(8, y(5), C.iceHi);
    }
    // Orbiting ice diamonds; their places shift with the pose so she shimmers as she drifts.
    const orbit = [[-13, -6], [12, -19], [11, 8], [-10, 12]];
    const k = cut ? 2 : pose;
    for (let i = 0; i < orbit.length; i++) {
        const [x, d] = orbit[(i + k) % orbit.length];
        if (cut && i === 0) continue;
        diamond(x, y(d));
    }
    b.rim('#ffffff', '#06090e', .3, .25);
    b.outline('#0d1a24');
    const o = s.origin;
    b.set(o[0], o[1] - 16 + bob, C.iceHi); b.set(o[0] + 2, o[1] - 16 + bob, C.iceHi);
    return b;
}

// The reflection the Wisp leaves where it stood is the same figure: it must be mistakable for her for a heartbeat.
function mirrorDouble(pose) { return mirrorWisp(pose); }

// The Bell of Winter (Frost F4b): not the Warden's squat bronze bulk but a gaunt, horned keeper, chain-wrapped iron in rust-red
// rags, dragging a bell taller than its legs whose lip is a fringe of icicles. Idle poses drag the bell low and ahead along the
// snow; pose 3 heaves it overhead by its chain, the tell for slam and toll alike.
function bellOfWinter(pose) {
    const s = ENEMY_SPECS[17], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { iron: '#4a525b', ironHi: '#8796a3', ironDk: '#1c2127', rag: '#7a2a22', ragHi: '#a8463a', ragDk: '#3e1210',
        bell: '#7d8a92', bellHi: '#c6d6de', bellDk: '#3b454d', rime: '#dff2fb', ice: '#a9dcf0', bone: '#d8d2c2', boneDk: '#8e887a',
        horn: '#cfc4a8', void: '#06090d', glow: '#9fe6ff', core: '#f2fcff', chain: '#5b5148' };
    const step = pose === 1 ? 2 : pose === 2 ? -2 : 0, raised = pose === 3, sway = raised ? 0 : -step / 2;
    const bell = (cx, top, h, w) => {
        g.poly([[cx - w / 3, top], [cx + w / 3, top], [cx + w / 2, top + h], [cx - w / 2, top + h]], C.bell);
        g.poly([[cx - w / 3, top], [cx - w / 8, top], [cx - w / 5, top + h], [cx - w / 2, top + h]], C.bellDk);
        g.line(cx + w / 5, top + 2, cx + w / 3, top + h - 3, C.bellHi);
        // Cast bands of old prayer script, frosted over.
        for (const y of [top + h * .3, top + h * .62]) g.line(cx - w / 2.6, y, cx + w / 2.6, y, C.bellDk);
        g.ell(cx, top - 1, w / 4.5, 2.5, C.bellDk);
        g.rect(cx - w / 2 - 1, top + h, w + 3, 3, C.bellDk); g.rect(cx - w / 2, top + h, w + 1, 1, C.rime);
        // The icicle fringe: uneven teeth hanging from the lip.
        for (let x = cx - w / 2; x <= cx + w / 2; x += 3) {
            const length = 3 + ((x * 7) & 3) + ((x * 3) & 1) * 2;
            g.line(x, top + h + 2, x, top + h + 2 + length, C.ice);
            g.px(x, top + h + 2, C.rime);
        }
        // Snow caked on the shoulder.
        g.ell(cx - 1, top + 1, w / 3, 2, C.rime);
    };
    // Long, bowed legs in a dragging stride.
    g.poly([[-10, 8], [-3, 8], [-5 - step, 33], [-12 - step, 33]], C.ironDk);
    g.poly([[3, 8], [10, 8], [11 + step, 33], [4 + step, 33]], C.iron);
    g.line(8, 10, 9 + step, 31, C.ironHi);
    g.rect(-14 - step, 32, 10, 4, C.ironDk); g.rect(3 + step, 32, 11, 4, C.iron); g.rect(3 + step, 32, 11, 1, C.rime);
    // Gaunt, stooped chest of overlapping iron, a chain wound across it.
    g.poly([[-13, -30], [13, -30], [10, 9], [-10, 9]], C.iron);
    g.poly([[-13, -30], [-4, -30], [-6, 9], [-10, 9]], C.ironDk);
    g.line(8, -27, 7, 6, C.ironHi);
    for (const y of [-22, -14, -6]) g.line(-11, y, 11, y, C.ironDk);
    for (let i = 0; i < 7; i++) g.px(-11 + i * 4, -26 + i * 4, i % 2 ? C.chain : C.ironHi);
    g.ell(-14, -27, 6, 5, C.ironDk); g.ell(14, -27, 6, 5, C.iron); g.ell(14, -29, 4, 2, C.rime);
    // Rust-red rags torn into long tongues below the belt.
    g.poly([[-9, 2], [9, 2], [8 + sway, 22], [-8 + sway, 22]], C.rag);
    g.poly([[-9, 2], [-4, 2], [-5 + sway, 22], [-8 + sway, 22]], C.ragDk);
    g.line(5, 4, 6 + sway, 21, C.ragHi);
    for (const x of [-7, -3, 1, 5]) g.line(x + sway, 22, x + sway + (x & 1) - step / 2, 26 + (x & 3), x & 2 ? C.rag : C.ragDk);
    g.rect(-12, 0, 25, 3, C.ironDk); g.rect(-12, 0, 25, 1, C.chain);
    // Horned skull helm, iced at the brow, hunched forward on a long neck.
    g.ell(3, -37, 6, 7, C.ironDk);
    g.line(-2, -41, -8, -50, C.horn, 2); g.line(-8, -50, -6, -54, C.horn);
    g.line(8, -41, 13, -50, C.horn, 2); g.line(13, -50, 11, -54, C.horn);
    g.ell(4, -36, 4.4, 5, C.bone); g.line(0, -39, 0, -32, C.boneDk);
    g.rect(2, -38, 2, 2, C.void); g.rect(6, -38, 2, 2, C.void);
    g.rect(3, -33, 4, 2, C.void); g.px(4, -33, C.bone);
    g.line(1, -42, 7, -42, C.rime);
    for (const x of [1, 4, 7]) g.line(x, -31, x, -29 + (x & 1), C.ice);
    // Rear arm: a loose length of chain trailing in the snow.
    g.line(-14, -24, -19, -6, C.ironDk, 3); g.ell(-19, -5, 3, 3, C.iron);
    for (let i = 0; i < 6; i++) g.px(-20 - i + sway, -2 + i * 5, C.chain);
    // Forward arm and the bell: dragged low ahead of the keeper, or heaved overhead on its chain.
    if (raised) {
        g.line(14, -28, 12, -48, C.iron, 4); g.ell(12, -50, 3.5, 3, C.ironHi);
        g.line(12, -52, 18, -56, C.chain);
        bell(22, -64, 18, 26);
    } else {
        g.line(14, -24, 20, -10, C.iron, 4); g.ell(21, -9, 3.5, 3, C.ironHi);
        g.line(21, -7, 26 + sway, -3, C.chain);
        bell(28 + sway, -2, 22, 28);
    }
    b.rim('#cfeaf8', '#05080c', .35, .3);
    b.outline('#05080a');
    // The eye sockets burn cold above the outline: the keeper is tracked by its frostlight.
    const o = s.origin;
    for (const [x, y] of [[2, -37], [6, -37]]) b.set(o[0] + x, o[1] + y, C.glow);
    b.set(o[0] + 3, o[1] - 37, C.core);
    return b;
}

// The Reliquary of Glass (Frost concept 08): a tall pale celebrant in long tattered vestments, a gilt spoked halo behind
// a pointed mask, and a yoke across its shoulders hung with four gilt lanterns holding blue crystal light. Unlike the
// crimson Reliquary it barely moves: poses 1-2 only sway the lanterns and the torn hem; pose 3 lifts the yoke to cast.
// `lit` false paints a Refraction Veil false form: the same silhouette with dead, smoky lanterns (the identification tell).
function reliquaryOfGlass(pose, lit = true, kind = 18) {
    const s = ENEMY_SPECS[kind], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { robe: '#d9d2c2', robeHi: '#f3eee2', robeDk: '#a59c88', deep: '#5d574c', void: '#0d1218', stole: '#c9a24a', stoleDk: '#7e6228',
        gold: '#c9a24a', goldHi: '#f0d27a', goldDk: '#7e6228', mask: '#b8b0a0', ice: lit ? '#8fdcff' : '#3d4650', iceHi: lit ? '#e8faff' : '#59636e',
        core: lit ? '#ffffff' : '#6b7480', chain: '#8a7a5a' };
    const sway = pose === 1 ? 1 : pose === 2 ? -1 : 0, cast = pose === 3, lift = cast ? -6 : 0;
    // Gilt spoked halo: a full ring with twelve spokes, the silhouette read from across the snow.
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, r = i % 3 ? 11 : 15;
        g.line(0, -36, Math.round(Math.cos(a) * r), Math.round(-36 + Math.sin(a) * r), i % 3 ? C.goldDk : C.gold);
    }
    g.ell(0, -36, 11, 11, C.gold); g.ell(0, -36, 9.5, 9.5, C.void);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.px(Math.round(Math.cos(a) * 10), Math.round(-36 + Math.sin(a) * 10), C.goldDk); }
    g.line(0, -52, 0, -47, C.gold); g.px(0, -53, C.goldHi);
    // Long vestment flaring to a wide, shredded hem that trails on the ground.
    g.poly([[-8, -22], [8, -22], [20 + sway, 30], [-20 + sway, 30]], C.robe);
    g.poly([[-8, -22], [-3, -22], [-11 + sway, 30], [-20 + sway, 30]], C.robeDk);
    g.poly([[3, -18], [8, -22], [20 + sway, 30], [12 + sway, 30]], C.robeHi);
    for (let x = -19; x <= 19; x += 4) {
        const d = (x * 7 + 40) % 5 + 2;
        g.poly([[x + sway, 29], [x + 3 + sway, 29], [x + 1 + sway, 30 + d]], (x / 4) % 2 ? C.robeDk : C.robe);
    }
    for (const [x, y] of [[-14, 14], [-9, 22], [10, 18], [15, 25], [-4, 26]]) g.line(x + sway, y, x + sway, y + 4, C.deep);
    // Gilt stole with a sigil wheel.
    g.poly([[-3, -20], [3, -20], [4, 28], [-4, 28]], C.stole);
    g.line(-3, -19, -4, 27, C.stoleDk);
    g.ell(0, -6, 3.5, 3.5, C.goldDk); g.ell(0, -6, 2, 2, C.void); g.px(0, -6, C.ice);
    for (const y of [4, 12, 20]) { g.px(0, y, C.goldHi); g.px(-1, y + 1, C.goldDk); g.px(1, y + 1, C.goldDk); }
    // Shoulders, hood and pointed mask.
    g.poly([[-10, -24], [10, -24], [12, -16], [-12, -16]], C.robeDk);
    g.poly([[-5, -24], [5, -24], [3, -36], [0, -44], [-3, -36]], C.robeDk);
    g.poly([[-3, -26], [3, -26], [2, -34], [0, -40], [-2, -34]], C.mask);
    g.px(-1, -32, C.void); g.px(1, -32, C.void); g.px(-1, -31, C.ice); g.px(1, -31, C.ice);
    // The yoke: a gilt crossbar over the shoulders, hung with four lanterns.
    const yy = -22 + lift;
    g.line(-28, yy, 28, yy, C.goldDk, 2); g.line(-28, yy - 1, 28, yy - 1, C.gold);
    for (const x of [-28, -18, 18, 28]) g.px(x, yy - 2, C.goldHi);
    // Sleeves down to open hands below the yoke.
    g.poly([[-9, -20], [-14, -20 + lift], [-17, -6 + lift], [-11, -8]], C.robe);
    g.poly([[9, -20], [14, -20 + lift], [17, -6 + lift], [11, -8]], C.robe);
    const lantern = (x, y) => {
        g.line(x, yy, x, y - 6, C.chain);
        g.rect(x - 3, y - 5, 7, 2, C.gold); g.rect(x - 3, y + 4, 7, 2, C.goldDk);
        g.rect(x - 2, y - 3, 5, 7, C.ice); g.line(x - 2, y - 3, x - 2, y + 3, C.goldDk); g.line(x + 2, y - 3, x + 2, y + 3, C.goldDk);
        g.px(x, y, C.iceHi); g.px(x, y - 1, C.core);
        g.poly([[x - 2, y - 5], [x + 2, y - 5], [x, y - 9]], C.goldDk); g.px(x, y + 6, C.gold);
    };
    const hang = cast ? [[-28, -6], [-18, 2], [18, 2], [28, -6]] : [[-28 - sway, 0], [-18 - sway, 8], [18 - sway, 8], [28 - sway, 0]];
    for (const [x, d] of hang) lantern(x, yy + 12 + d);
    if (cast && lit) for (const x of [-34, 34]) { g.line(x, yy - 8, x, yy - 2, C.ice); g.px(x, yy - 9, C.iceHi); }
    b.rim(lit ? '#cfeaff' : '#8a96a2', '#05080c', .35, .3);
    b.outline('#070a10');
    // Lit lantern cores sit above the outline: the light is how the hunter finds the true body.
    if (lit) { const o = s.origin; for (const [x, d] of hang) b.set(o[0] + x, o[1] + yy + 12 + d - 1, C.core); }
    return b;
}

// Crystal Ward (Frost concept 08): a jagged spire of blue glass rising from a cracked base, a gilt band at its waist.
// Poses 0-2 shimmer; pose 3 (the tether kindling) flares white.
function crystalWard(pose) {
    const s = ENEMY_SPECS[19], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { ice: '#5fb8e6', iceHi: '#bfeeff', iceDk: '#2c6c94', deep: '#16324a', core: '#ffffff', gold: '#c9a24a', goldDk: '#7e6228',
        rock: '#4a525c', rockDk: '#262c33', snow: '#e6eef2' };
    const flare = pose === 3, glint = pose === 1 ? -6 : pose === 2 ? -14 : -10;
    g.poly([[-9, 10], [9, 10], [7, 13], [-7, 13]], C.rockDk); g.poly([[-8, 8], [8, 8], [9, 11], [-9, 11]], C.rock);
    g.line(-8, 8, -3, 8, C.snow); g.line(3, 8, 8, 8, C.snow);
    g.poly([[-7, 9], [-9, -2], [-5, 4]], C.iceDk); g.poly([[7, 9], [9, -4], [5, 4]], C.iceDk);
    g.poly([[-5, 9], [5, 9], [4, -12], [0, -27], [-4, -12]], C.ice);
    g.poly([[-5, 9], [-1, 9], [-1, -20], [-4, -12]], C.iceDk);
    g.line(1, -22, 3, 6, flare ? C.core : C.iceHi); g.line(-2, -6, -1, 6, C.deep);
    g.rect(-5, -2, 11, 2, C.goldDk); g.rect(-5, -3, 11, 1, C.gold);
    g.px(1, glint, C.core); g.px(2, glint + 1, C.iceHi);
    b.rim(flare ? '#ffffff' : '#bfeeff', '#05080c', .35, .3);
    b.outline('#070a10');
    const o = s.origin;
    b.set(o[0], o[1] - 26, C.core);
    if (flare) for (let y = -18; y <= 2; y += 4) b.set(o[0] + 1, o[1] + y, C.core);
    return b;
}

const glassFalseForm = pose => reliquaryOfGlass(pose, false, 20);

const painters = [hollow, mireHound, ashling, penitent, ashSlinger, ashPriest, drownedWraith, reliquary, reliquaryWard, bellWarden,
    frostlingPackling, shardcaster, whitefangStalker, cairnSentinel, hoarfrostCantor, mirrorWisp, mirrorDouble,
    bellOfWinter, reliquaryOfGlass, crystalWard, glassFalseForm];

export function paintEnemy(kind, pose) { return painters[kind]((kind === 1 || kind === 12) && (pose === 1 || pose === 2) ? (pose === 1 ? 8 : 12) : pose); }

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

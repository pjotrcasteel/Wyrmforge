// First-hunt roster sprites, authored facing east (runtime mirrors for west) from the concept sheets in
// user_handover_files/concepts as art direction only. Frame order follows EnemyKind ints:
// 0 Hollow, 1 Mire Hound, 2 Ashling, 3 Penitent, 4 Ash Slinger, 5 Ash Priest, 6 Drowned Wraith, 7 The Reliquary, 8 Reliquary ward.
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

// Mire Hound: wide, low, wet dark hide with a ridge of bone spines and ember eyes. Pose 3 is the pounce crouch:
// head dropped, haunches up, spines bristling - the body is the telegraph.
function mireHound(pose) {
    const s = ENEMY_SPECS[1], b = new Bitmap(...s.size), g = at(b, ...s.origin);
    const C = { fur: '#3b2b22', furHi: '#5c4433', deep: '#1d1511', wet: '#6e5c4d', spine: '#8c7860', spineHi: '#c9b591', eye: '#ff8f2e', maw: '#7c1f1a', tooth: '#eadfc6' };
    const crouch = pose === 3, drop = crouch ? 2 : 0, swing = pose === 1 ? 3 : pose === 2 ? -3 : 0;
    const leg = (x, dx, c, top = 1) => { g.line(x, top, x + dx, 8, c, 2); g.rect(x + dx - 1, 9, 3, 1, C.spine); };
    // Far legs.
    leg(-9, -swing, C.deep, crouch ? -1 : 1); leg(6, swing, C.deep, 1 + drop);
    // Ragged tail held low behind.
    g.line(-11, -3, -16, -5, C.fur, 2); g.line(-16, -5, -19, -3 + (pose === 1 ? -1 : 0), C.fur);
    // Long low body with a shoulder hump; the rear rises in the crouch.
    g.ell(-2, -2 + (crouch ? -1 : 0), 11, 5, C.fur);
    g.ell(5, -3 + drop / 2, 5.5, 4.5, C.fur);
    g.ell(-2, 1, 9, 1.6, C.deep);
    g.line(-9, -5, 0, -6, C.wet); g.line(2, -6, 6, -7 + drop / 2, C.wet);
    // Bone spines along the back, longer when bristling.
    [-10, -7, -4, -1, 2, 5].forEach((x, i) => {
        const len = 3 + (i % 2) + (crouch ? 2 : 0), base = -6 + (x > 0 ? drop / 2 : crouch ? -1 : 0);
        g.line(x, base, x - 2, base - len, C.spine); g.px(x - 2, base - len, C.spineHi);
    });
    // Neck, skull and an open, toothed maw.
    g.poly([[6, -7 + drop], [11, -8 + drop], [13, -2 + drop], [7, 0 + drop]], C.fur);
    g.ell(14, -4 + drop, 4, 3, C.furHi);
    g.poly([[15, -6 + drop], [22, -4 + drop], [22, -2 + drop], [15, -1 + drop]], C.fur);
    g.rect(16, -2 + drop, 6, 2, C.maw);
    g.px(17, -2 + drop, C.tooth); g.px(19, -2 + drop, C.tooth); g.px(21, -2 + drop, C.tooth); g.px(18, -1 + drop, C.tooth);
    g.poly([[11, -7 + drop], [9, -12 + drop], [13, -7 + drop]], C.fur);
    g.px(15, -5 + drop, C.eye); g.px(16, -5 + drop, C.eye);
    // Near legs over the body.
    leg(-6, swing, C.fur, crouch ? -1 : 1); leg(9, -swing, C.fur, 1 + drop);
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

const painters = [hollow, mireHound, ashling, penitent, ashSlinger, ashPriest, drownedWraith, reliquary, reliquaryWard];

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

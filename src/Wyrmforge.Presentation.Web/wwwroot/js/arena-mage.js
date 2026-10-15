// Authored character frames now replace the temporary body geometry; the staff remains articulated.
// Gameplay/physics never reads animation geometry.
import { drawMagePixelFrame, mageFrameKey } from './arena-mage-frames.js';

const cloak = '#485b73';
const cloakEdge = '#1b2637';
const paleCollar = '#c8c6b8';
const staffWood = '#766552';

export function magePose(cast, reducedMotion = false) {
    if (!cast || !Number.isFinite(cast.progress) || cast.progress < 0 || cast.progress >= 1)
        return { active: false, reach: 17, sweep: 0, aim: -0.7 };
    const rank = Math.max(1, Math.min(3, Number(cast.rank) || 1));
    const t = Math.max(0, Math.min(1, cast.progress));
    // Wind-up, forceful release, and follow-through only modify the drawing.
    const release = t < .22 ? -(.22 - t) / .22 : t < .48 ? (t - .22) / .26 : 1 - (t - .48) / .52;
    return {
        active: true,
        reach: 17 + rank * 4 + (cast.surge ? 7 : 0) + (reducedMotion ? 0 : Math.max(0, release) * (5 + rank * 3)),
        sweep: reducedMotion ? 0 : -0.35 + Math.max(0, release) * .52,
        aim: Number.isFinite(cast.angle) ? cast.angle : -0.7,
    };
}

export function updateMageWalk(motion, player, seconds, reducedMotion = false) {
    if (!motion || !player || !Number.isFinite(seconds)) return 0;
    if (Number.isFinite(motion.x) && Number.isFinite(motion.y)) {
        const distance = Math.hypot(player.x - motion.x, player.y - motion.y);
        // Repeated render frames draw the same C# snapshot. Only fresh actual
        // world motion advances the brief walking phase; no animation owns movement.
        if (distance > .3 && distance < 48) motion.lastMove = seconds;
    }
    motion.x = player.x;
    motion.y = player.y;
    return reducedMotion || !Number.isFinite(motion.lastMove) || seconds - motion.lastMove > .16
        ? 0 : (Math.floor(seconds * 8) % 2 ? 1 : 2);
}

// The haft is continuous through the hand. Windup, release, Surge and walking have
// distinct upper endpoints; the player's authoritative cast angle only biases the lean.
export function mageStaffGeometry(frameKey, cast = null, reducedMotion = false) {
    const pose = magePose(cast, reducedMotion);
    const grips = {
        idle: [6, -2], walkA: [7, -3], walkB: [5, -2],
        windup: [1, -4], release: [9, -5], followThrough: [7, -3], surgeRelease: [10, -6],
    };
    const [gx, gy] = grips[frameKey] ?? grips.idle;
    const offsets = { idle: 6, walkA: 9, walkB: 3, windup: -9, release: 12,
        followThrough: 8, surgeRelease: 15 };
    const tipY = frameKey === 'surgeRelease' ? -36 : frameKey === 'windup' ? -29 : -31;
    const lean = pose.active ? Math.round(Math.cos(pose.aim) * Math.min(11, pose.reach * .27)) : 0;
    const tip = { x: gx + offsets[frameKey] + lean, y: tipY };
    const grip = { x: gx, y: gy };
    const buttY = 15;
    // Collinearity prevents the staff from detaching or appearing as a separate hammer.
    const butt = { x: Math.round(gx - (tip.x - gx) * (buttY - gy) / (gy - tipY)), y: buttY };
    return { butt, grip, tip };
}

function paintPixelShaft(ctx, from, to, thickness, pigment) {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
    ctx.fillStyle = pigment;
    for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        ctx.fillRect(Math.round(from.x + (to.x - from.x) * t) - Math.floor(thickness / 2),
            Math.round(from.y + (to.y - from.y) * t), thickness, 2);
    }
}

export function drawMage(ctx, player, cast, hit = false, reducedMotion = false, lighting = null, walkPhase = 0) {
    if (!player) return;
    const scale = Math.max(.7, Math.min(1.45, (Number(player.radius) || 12) / 12));

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(scale, scale);

    // Small displaced shadow marks feet, not a HUD-like circle or glowing outline.
    ctx.fillStyle = 'rgba(7, 9, 14, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Distinct authored pixel silhouettes express weight transfer and cloak follow-through.
    const currentFrame = mageFrameKey(cast, walkPhase);
    drawMagePixelFrame(ctx, currentFrame, hit);

    if (lighting?.intensity > .015) {
        // The face and cloak catch light from the actual nearby cast, projectile or impact.
        // Shade the lit side only; never create a bright silhouette ring around the mage.
        const [red, green, blue] = lighting.color;
        const side = lighting.sourceX < player.x ? -1 : 1;
        // Broad enough to survive the 390px mobile pixel scale, but confined
        // to the hood's material planes, never an emissive character outline.
        const strength = Math.min(.65, lighting.intensity * 1.35);
        ctx.fillStyle = `rgba(${red},${green},${blue},${strength * .82})`;
        ctx.fillRect(side < 0 ? -8 : 3, -12, 5, 9);
        ctx.fillStyle = `rgba(${red},${green},${blue},${strength * .58})`;
        ctx.fillRect(side < 0 ? -8 : 5, -3, 3, 12);
        ctx.fillStyle = `rgba(${red},${green},${blue},${strength})`;
        ctx.fillRect(side < 0 ? -6 : 3, -5, 3, 2);
    }

    // Thin carved ash staff, never a broad hammer-shaped terminal.
    // Both ends and the hand are placed in character space: no camera-facing billboard.
    const staff = mageStaffGeometry(currentFrame, cast, reducedMotion);
    paintPixelShaft(ctx, staff.butt, staff.tip, 4, '#211e22');
    paintPixelShaft(ctx, staff.butt, staff.tip, 2, staffWood);
    paintPixelShaft(ctx, staff.butt, staff.tip, 1, '#a79576');
    // Narrow fork and inset crystal are smaller than the haft's silhouette.
    ctx.fillStyle = '#302e36';
    ctx.fillRect(staff.tip.x - 2, staff.tip.y + 1, 2, 5);
    ctx.fillRect(staff.tip.x + 1, staff.tip.y + 1, 2, 5);
    ctx.fillStyle = '#b4afa0';
    ctx.fillRect(staff.tip.x - 1, staff.tip.y - 2, 3, 4);
    ctx.fillStyle = '#819aaa';
    ctx.fillRect(staff.tip.x, staff.tip.y - 1, 1, 3);
    if (lighting?.intensity > .015) {
        const [red, green, blue] = lighting.color;
        ctx.fillStyle = `rgba(${red},${green},${blue},${Math.min(.8, lighting.intensity)})`;
        ctx.fillRect(staff.tip.x, staff.tip.y, 2, 2);
    }
    // Three tiny charge marks follow the shaft rather than floating at its old hammer head.
    const charge = Math.max(0, Math.min(3, Number(player.focusCharge) || 0));
    for (let index = 0; index < 3; index++) {
        const t = .58 + index * .065;
        const x = Math.round(staff.butt.x + (staff.tip.x - staff.butt.x) * t);
        const y = Math.round(staff.butt.y + (staff.tip.y - staff.butt.y) * t);
        ctx.fillStyle = index < charge ? '#dfc4a5' : '#544d4b';
        ctx.fillRect(x - 1, y, 2, 2);
    }
    // Hand is painted LAST, visibly wrapping the continuous staff shaft.
    ctx.fillStyle = cloakEdge;
    ctx.fillRect(staff.grip.x - 3, staff.grip.y - 3, 7, 6);
    ctx.fillStyle = hit ? '#966f76' : cloak;
    ctx.fillRect(staff.grip.x - 2, staff.grip.y - 2, 5, 4);
    ctx.fillStyle = paleCollar;
    ctx.fillRect(staff.grip.x + 1, staff.grip.y - 1, 2, 2);

    if (player.barrier) {
        // A restrained shoulder seam is enough to read magical protection.
        ctx.fillStyle = '#a9c8d3';
        ctx.fillRect(-9, -3, 3, 8);
        ctx.fillRect(6, -3, 3, 8);
    }
    ctx.restore();
}

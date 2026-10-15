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

export function drawMage(ctx, player, cast, hit = false, reducedMotion = false, lighting = null) {
    if (!player) return;
    const pose = magePose(cast, reducedMotion);
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
    const currentFrame = mageFrameKey(cast);
    drawMagePixelFrame(ctx, currentFrame, hit);

    if (lighting?.intensity > .015) {
        // The face and cloak catch light from the actual nearby cast, projectile or impact.
        // Shade the lit side only; never create a bright silhouette ring around the mage.
        const [red, green, blue] = lighting.color;
        const side = lighting.sourceX < player.x ? -1 : 1;
        const strength = Math.min(.48, lighting.intensity * .9);
        ctx.fillStyle = `rgba(${red},${green},${blue},${strength * .58})`;
        ctx.fillRect(side < 0 ? -7 : 4, -10, 3, 5);
        ctx.fillRect(side < 0 ? -8 : 5, -3, 3, 12);
        ctx.fillStyle = `rgba(${red},${green},${blue},${strength})`;
        ctx.fillRect(side < 0 ? -6 : 3, -5, 3, 2);
    }

    // The staff is a readable weapon silhouette and leads the actual cast angle.
    // It follows the attack, not the movement controls, and cannot block movement.
    ctx.save();
    const staffGrip = currentFrame === 'windup' ? { x: 2, y: -4 }
        : currentFrame === 'surgeRelease' ? { x: 10, y: -7 }
        : currentFrame === 'release' ? { x: 9, y: -5 }
        : currentFrame === 'followThrough' ? { x: 7, y: -3 } : { x: 5, y: -3 };
    ctx.translate(staffGrip.x, staffGrip.y);
    ctx.rotate(pose.aim + pose.sweep);
    ctx.fillStyle = cloakEdge;
    ctx.fillRect(1, -4, 8, 7);
    ctx.fillStyle = hit ? '#966f76' : cloak;
    ctx.fillRect(2, -3, 7, 5);
    ctx.fillStyle = paleCollar;
    ctx.fillRect(7, -2, 3, 3);
    ctx.fillStyle = '#2a211f';
    ctx.fillRect(8, -2, pose.reach + 1, 5);
    ctx.fillStyle = staffWood;
    ctx.fillRect(9, -1, pose.reach, 3);
    ctx.fillStyle = '#aaa18c';
    ctx.fillRect(9 + pose.reach, -4, 5, 9);
    ctx.fillStyle = '#6d798e';
    ctx.fillRect(10 + pose.reach, -2, 3, 5);
    if (lighting?.intensity > .015) {
        const [red, green, blue] = lighting.color;
        ctx.fillStyle = `rgba(${red},${green},${blue},${Math.min(.8, lighting.intensity)})`;
        ctx.fillRect(10 + pose.reach, -3, 3, 3);
    }
    // Three tiny marks on the shaft show actual saved charge; no extra HUD button or halo.
    const charge = Math.max(0, Math.min(3, Number(player.focusCharge) || 0));
    for (let index = 0; index < 3; index++) {
        ctx.fillStyle = index < charge ? '#dfc4a5' : '#544d4b';
        ctx.fillRect(9 + pose.reach - 12 + index * 4, -2, 2, 4);
    }
    ctx.restore();

    if (player.barrier) {
        // A restrained shoulder seam is enough to read magical protection.
        ctx.fillStyle = '#a9c8d3';
        ctx.fillRect(-9, -3, 3, 8);
        ctx.fillRect(6, -3, 3, 8);
    }
    ctx.restore();
}

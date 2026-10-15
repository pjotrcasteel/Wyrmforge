// Readable temporary mage silhouette based on the approved slate-blue cloak, pale collar and staff.
// Fixed pixel geometry; the final hand-authored animation frames can replace this isolated renderer.
const cloak = '#485b73';
const cloakShade = '#26364b';
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

    // Hem and uneven cloak edges read at phone scale; a pale collar separates the hood from it.
    ctx.fillStyle = cloakEdge;
    ctx.fillRect(-10, -5, 20, 19);
    ctx.fillRect(-8, 13, 6, 3);
    ctx.fillRect(3, 13, 6, 3);
    ctx.fillStyle = hit ? '#7d5260' : cloakShade;
    ctx.fillRect(-9, -5, 18, 18);
    ctx.fillRect(-8, 11, 6, 4);
    ctx.fillRect(3, 11, 6, 4);
    ctx.fillStyle = hit ? '#a06e73' : cloak;
    ctx.fillRect(-7, -4, 13, 14);
    ctx.fillRect(-8, 7, 8, 5);
    ctx.fillStyle = '#677c92';
    ctx.fillRect(-6, -5, 4, 12);
    ctx.fillRect(3, 0, 3, 10);

    // Muted hood with a deliberately dark face opening (no bright helmet blob).
    ctx.fillStyle = cloakEdge;
    ctx.fillRect(-7, -15, 14, 12);
    ctx.fillStyle = hit ? '#946671' : '#63788f';
    ctx.fillRect(-6, -15, 12, 10);
    ctx.fillStyle = '#293241';
    ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = paleCollar;
    ctx.fillRect(-6, -5, 12, 3);
    ctx.fillRect(-5, -2, 3, 2);
    ctx.fillRect(3, -2, 3, 2);

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
    ctx.translate(5, -3);
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

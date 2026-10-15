// Diegetic trail scratches reveal an already-open cache only to wounded hunters.
// This presentation reads canonical world/cache coordinates; it grants no healing or navigation.
export function recoveryGuidePlan(snapshot, camera, viewWidth, viewHeight) {
    const player = snapshot?.player;
    const hud = snapshot?.hud;
    if (!player || !camera || !hud?.maxHealth || hud.health / hud.maxHealth > .65 ||
        snapshot.exit || snapshot.extraction || snapshot.ended) return null;

    const supplies = snapshot.environment?.supplies ?? [];
    const available = supplies.filter(item => item.kind === 'health' && item.open === true)
        .map(item => ({ x: item.x * camera.width, y: item.y * camera.height }));
    if (available.length === 0) return null;

    available.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
    const target = available[0];
    const visibleX = target.x - camera.x;
    const visibleY = target.y - camera.y;
    // Avoid unnecessary noise if the actual cache is readable in the visible viewport.
    if (visibleX >= 45 && visibleX <= viewWidth - 45 && visibleY >= 132 && visibleY <= viewHeight - 64) return null;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 95) return null;

    return { x: player.x, y: player.y, angle: Math.atan2(dy, dx), distance };
}

export function drawRecoveryGuide(ctx, snapshot, camera, viewWidth, viewHeight, elapsed = 0, reducedMotion = false) {
    const plan = recoveryGuidePlan(snapshot, camera, viewWidth, viewHeight);
    if (!plan) return false;

    // Shallow carved grass/mud scratches, not a target ring or a HUD button.
    // Even with reduced motion, orientation and positions remain readable.
    ctx.save();
    ctx.translate(plan.x, plan.y);
    ctx.rotate(plan.angle);
    for (let index = 0; index < 3; index++) {
        const offset = 56 + 24 * index;
        const sway = reducedMotion ? 0 : Math.sin(elapsed * 1.7 + index * .6) * .08;
        ctx.globalAlpha = .43 + index * .13 + sway;
        ctx.strokeStyle = '#c1d2b0';
        ctx.lineWidth = 1.6 + index * .2;
        ctx.beginPath();
        ctx.moveTo(offset - 10, -7);
        ctx.lineTo(offset + 1, 0);
        ctx.lineTo(offset - 10, 7);
        ctx.stroke();
        ctx.strokeStyle = '#506b5d';
        ctx.beginPath();
        ctx.moveTo(offset - 16, -9);
        ctx.lineTo(offset - 11, -12);
        ctx.moveTo(offset - 16, 9);
        ctx.lineTo(offset - 11, 12);
        ctx.stroke();
    }
    ctx.restore();
    return true;
}

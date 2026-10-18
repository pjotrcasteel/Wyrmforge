// Elite signature (encounter brief §7): one restrained, readable mark per elite, never a boss bar.
// Like a Diablo champion's tint or a Hades armored foe's glow, the silhouette stays the ordinary enemy's
// so its counterplay still reads; the affix colour names the one rule that changed.

export const ELITE_COLORS = Object.freeze({
    Gravebound: '178, 156, 255',
    Packblood: '255, 98, 72',
    EmberAnointer: '255, 207, 106',
    CinderMarksman: '255, 138, 58',
    Thornrunner: '155, 227, 106',
    Oathshield: '236, 226, 196',
    Drowncaller: '127, 214, 255',
    // Frost champions: cold hues, each still distinct so the rule reads on the snow.
    Rimehowl: '196, 240, 255',
    Splinterwright: '98, 176, 255',
    Twinfang: '246, 250, 255',
    Barrowlord: '150, 168, 196',
    Choirwarden: '112, 255, 226',
    Thousandface: '226, 196, 255',
});

export function eliteColor(affix) {
    return ELITE_COLORS[affix] ?? '230, 200, 140';
}

// Ground half, beneath the actor: a slow dashed sigil and soft glow. Static under reduced motion.
export function drawEliteGround(ctx, enemy, seconds = 0, reducedMotion = false) {
    if (!enemy?.elite) return;
    const rgb = eliteColor(enemy.elite);
    const radius = Math.max(8, Number(enemy.radius) || 12) * 1.65;
    const opacity = Math.max(0, Math.min(1, Number(enemy.opacity ?? 1)));
    if (opacity <= 0) return;
    const spin = reducedMotion ? 0 : (Number(seconds) || 0) * 0.9;
    ctx.save();
    ctx.globalAlpha *= opacity;
    if (typeof ctx.createRadialGradient === 'function') {
        const glow = ctx.createRadialGradient(enemy.x, enemy.y, radius * 0.2, enemy.x, enemy.y, radius * 1.15);
        glow.addColorStop(0, `rgba(${rgb}, 0.2)`);
        glow.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = glow;
    } else ctx.fillStyle = `rgba(${rgb}, 0.12)`;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, radius * 1.15, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, 0.75)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash?.([5, 4]);
    ctx.lineDashOffset = -spin * 10;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, radius, radius * 0.54, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.restore();
}

// Airborne half, above the sprite: a small diamond crest so a packed crowd still shows which one is elite.
export function drawEliteCrest(ctx, enemy, seconds = 0, reducedMotion = false) {
    if (!enemy?.elite) return;
    const opacity = Math.max(0, Math.min(1, Number(enemy.opacity ?? 1)));
    if (opacity <= 0) return;
    const rgb = eliteColor(enemy.elite);
    const radius = Math.max(8, Number(enemy.radius) || 12);
    const bob = reducedMotion ? 0 : Math.sin((Number(seconds) || 0) * 3) * 1.5;
    const x = enemy.x;
    const y = enemy.y - radius * 2.3 - 6 + bob;
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(12, 8, 16, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
}

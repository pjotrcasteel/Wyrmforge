// Simulation-authoritative spell identities and cast progress; all effects are cosmetic.
// Keep one legible primary cast rather than filling the screen with unrelated spell spam.
export function spellFamily(spell, combination = null) {
    if (combination === 0) return 'frostfire';
    if (spell === 1 || spell === 4) return 'fire';
    if (spell === 2 || spell === 5) return 'frost';
    if (spell === 3 || spell === 6) return 'storm';
    return 'arcane';
}

export function castMotionProfile(cast) {
    const rank = Math.max(1, Math.min(3, Number(cast?.rank) || 1));
    const progress = Math.max(0, Math.min(1, Number(cast?.progress) || 0));
    return { family: spellFamily(cast?.spell, cast?.combination), reach: 21 + 7 * rank, rank, progress, alpha: 1 - progress };
}

export function drawSpellCastMotion(ctx, cast, reducedMotion = false) {
    if (!cast) return;
    const { family, reach, rank, progress, alpha } = castMotionProfile(cast);
    if (alpha <= 0) return;
    ctx.save();
    ctx.translate(cast.x, cast.y);
    ctx.rotate(Number(cast.angle) || 0);
    ctx.globalAlpha *= reducedMotion ? alpha * 0.65 : alpha;
    const extent = reducedMotion ? 0.72 : 1;
    const length = reach * extent;
    const sweep = reducedMotion ? 0 : (progress * 1.8 - 0.9);

    if (family === 'fire' || family === 'frostfire') {
        // Heavy overhand slash, followed by an outward surge.
        ctx.strokeStyle = '#ee8744';
        ctx.lineWidth = 2.5 + rank;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, length, -1.35 + sweep, 0.6 + sweep);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, -10);
        ctx.quadraticCurveTo(length * .7, -length * .55, length + progress * 9, 0);
        ctx.stroke();
    }
    if (family === 'frost' || family === 'frostfire') {
        // Straight staff thrust and angular ice fracture, not a fire-colored ring.
        ctx.strokeStyle = '#b4e7ec';
        ctx.lineWidth = 2 + rank * .8;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(length + (reducedMotion ? 0 : progress * 12), 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(length * .72, -9 - rank);
        ctx.lineTo(length + 6, 0);
        ctx.lineTo(length * .72, 9 + rank);
        ctx.stroke();
    }
    if (family === 'storm') {
        // Whip-like angular discharge; the live chain still determines its targets.
        ctx.strokeStyle = '#e8d88b';
        ctx.lineWidth = 2.1 + rank;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(-4, -12);
        ctx.lineTo(length * .32, -length * (.85 - progress * .4));
        ctx.lineTo(length * .53, -4);
        ctx.lineTo(length * .78, -length * .36);
        ctx.lineTo(length + 9, 0);
        ctx.stroke();
    }
    if (family === 'arcane') {
        // An asymmetric crescent drawn across the casting arm.
        ctx.strokeStyle = '#b9a3d8';
        ctx.lineWidth = 2.3 + rank;
        ctx.beginPath();
        ctx.arc(length * .24, 0, length * .7, -1.65 + sweep, .65 + sweep);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(length + 4, 0);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawSpellProjectile(ctx, projectile, reducedMotion = false) {
    const family = spellFamily(projectile.spell, projectile.combination);
    const radius = Math.max(2, projectile.radius);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(Number(projectile.angle) || 0);
    ctx.lineJoin = 'round';

    if (family === 'fire' || family === 'frostfire') {
        ctx.fillStyle = '#d76839';
        ctx.beginPath();
        ctx.moveTo(radius * 1.6, 0);
        ctx.quadraticCurveTo(-radius * .4, -radius * .9, -radius * 1.2, -radius * .4);
        ctx.lineTo(-radius * .65, 0);
        ctx.lineTo(-radius * 1.2, radius * .4);
        ctx.quadraticCurveTo(-radius * .4, radius * .9, radius * 1.6, 0);
        ctx.fill();
        ctx.fillStyle = '#f8c080';
        ctx.beginPath();
        ctx.ellipse(radius * .2, 0, radius * .75, radius * .45, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (family === 'frost' || family === 'frostfire') {
        ctx.fillStyle = '#8fcfda';
        ctx.strokeStyle = '#d1eef0';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(radius * 1.75, 0);
        ctx.lineTo(-radius * .4, -radius * .85);
        ctx.lineTo(-radius * 1.05, 0);
        ctx.lineTo(-radius * .4, radius * .85);
        ctx.closePath();
        if (family === 'frost') ctx.fill();
        ctx.stroke();
    }
    if (family === 'storm') {
        ctx.strokeStyle = projectile.combination === 1 ? '#c4e6e9' : '#e2d585';
        ctx.lineWidth = Math.max(2.4, radius * .7);
        ctx.beginPath();
        ctx.moveTo(-radius * 1.3, -radius * .5);
        ctx.lineTo(-radius * .15, radius * .3);
        ctx.lineTo(radius * .2, -radius * .45);
        ctx.lineTo(radius * 1.4, radius * .35);
        ctx.stroke();
    }
    if (family === 'arcane') {
        ctx.fillStyle = '#a48ac4';
        ctx.strokeStyle = '#d3bedc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(radius * 1.35, 0);
        ctx.lineTo(0, -radius * .9);
        ctx.lineTo(-radius * 1.15, 0);
        ctx.lineTo(0, radius * .9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    if (family === 'frostfire') {
        // One composite projectile: cold shell containing the same fire core.
        ctx.fillStyle = '#f3a368';
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * .54, radius * .4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (!reducedMotion && projectile.inferno && family === 'fire') {
        ctx.strokeStyle = 'rgba(244, 160, 104, .55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.5, -.9, .9);
        ctx.stroke();
    }
    ctx.restore();
}

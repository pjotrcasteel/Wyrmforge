import { drawFirePixelProjectile, drawFirePixelImpact } from './arena-fire-pixels.js';

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
    const surge = cast?.surge === true;
    return { family: spellFamily(cast?.spell, cast?.combination), reach: 21 + 7 * rank + (surge ? 12 : 0), rank, progress, alpha: 1 - progress, surge };
}

export function drawSpellCastMotion(ctx, cast, reducedMotion = false) {
    if (!cast) return;
    const { family, reach, rank, progress, alpha, surge } = castMotionProfile(cast);
    if (alpha <= 0) return;
    ctx.save();
    ctx.translate(cast.x, cast.y);
    ctx.rotate(Number(cast.angle) || 0);
    ctx.globalAlpha *= reducedMotion ? alpha * 0.65 : alpha;
    const extent = reducedMotion ? 0.72 : 1;
    const length = reach * extent;
    const sweep = reducedMotion ? 0 : (progress * 1.8 - 0.9);
    if (surge) {
        // Energy gathers at the staff tip. No floating semicircular targeting ring around the mage.
        ctx.strokeStyle = '#dcc5a6';
        ctx.lineWidth = 1.5 + rank * .4;
        ctx.beginPath();
        ctx.moveTo(length * .68, -5 - rank);
        ctx.lineTo(length, -1);
        ctx.lineTo(length * .68, 5 + rank);
        ctx.stroke();
    }

    if (family === 'fire' || family === 'frostfire') {
        // Short directional heat strokes at release: the projectile and impact carry the power.
        ctx.strokeStyle = '#ee8744';
        ctx.lineWidth = 1.5 + rank * .5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(length * .4, -7 + sweep * 3);
        ctx.lineTo(length + progress * 5, -2);
        ctx.moveTo(length * .55, 7);
        ctx.lineTo(length * .93, 3);
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
        // A compact staff-side arcane fracture, not a screen-filling rotating ring.
        ctx.strokeStyle = '#b9a3d8';
        ctx.lineWidth = 1.6 + rank * .35;
        ctx.beginPath();
        ctx.moveTo(length * .58, -8);
        ctx.lineTo(length + 4, -2);
        ctx.lineTo(length * .8, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(length * .7, -4);
        ctx.lineTo(length * .7 + 5, 6);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawSpellProjectile(ctx, projectile, reducedMotion = false, fireballVisual = null) {
    const family = spellFamily(projectile.spell, projectile.combination);
    const radius = Math.max(2, projectile.radius);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(Number(projectile.angle) || 0);
    if (family === 'fire') {
        drawFirePixelProjectile(ctx, projectile, reducedMotion, projectile.spell === 1 ? fireballVisual : null);
        ctx.restore();
        return;
    }
    ctx.lineJoin = 'round';

    // One velocity-aligned wake is visual evidence of impact, not another projectile.
    if (!reducedMotion) {
        const rank = Math.max(1, Math.min(3, Number(projectile.rank) || 1));
        const tail = radius * (1.5 + rank * .62 + (projectile.surge ? 1.1 : 0));
        ctx.lineCap = 'round';
        ctx.strokeStyle = family === 'frostfire' ? 'rgba(149, 202, 209, .56)'
            : family === 'fire' ? 'rgba(205, 106, 62, .45)'
            : family === 'frost' ? 'rgba(159, 213, 227, .50)'
            : family === 'storm' ? 'rgba(217, 208, 129, .46)' : 'rgba(167, 135, 191, .52)';
        ctx.lineWidth = Math.max(1.5, radius * (.38 + (rank - 1) * .08));
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(-radius * .55, 0);
        ctx.stroke();
    }

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
    if (projectile.surge) {
        ctx.strokeStyle = 'rgba(235, 214, 191, .85)';
        ctx.lineWidth = 2 + Math.min(3, Number(projectile.rank) || 1) * .5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.4, -.95, .95);
        ctx.stroke();
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


// The simulation sends immutable hit identity; upgrades and combinations are not inferred
// from whatever the player has focused by the time the impact reaches the canvas.
export function impactMotionProfile(impact) {
    const rank = Math.max(1, Math.min(3, Number(impact?.rank) || 1));
    const progress = Math.max(0, Math.min(1, Number(impact?.progress) || 0));
    return {
        family: spellFamily(impact?.spell, impact?.combination),
        rank,
        progress,
        radius: (11 + rank * 6) * (.45 + progress * .84) * (impact?.surge ? 1.36 : 1),
        alpha: (1 - progress) * .95,
        surge: impact?.surge === true,
    };
}

function impactRay(ctx, angle, inner, outer, kink = 0) {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const px = Math.cos(angle + .23);
    const py = Math.sin(angle + .23);
    ctx.moveTo(x * inner, y * inner);
    ctx.lineTo(x * (inner + outer) * .5 + px * kink, y * (inner + outer) * .5 + py * kink);
    ctx.lineTo(x * outer, y * outer);
}

export function drawSpellImpact(ctx, impact, reducedMotion = false, fireballVisual = null) {
    if (!impact) return;
    const { family, rank, progress, radius, alpha, surge } = impactMotionProfile(impact);
    if (alpha <= 0) return;
    const r = reducedMotion ? radius / (.45 + progress * .84) * .72 : radius;
    ctx.save();
    ctx.translate(impact.x, impact.y);
    if (family === 'fire') {
        drawFirePixelImpact(ctx, impact, reducedMotion, impact.spell === 1 ? fireballVisual : null);
        ctx.restore();
        return;
    }
    ctx.globalAlpha *= alpha;

    if (surge) {
        ctx.strokeStyle = '#e1d2c4';
        ctx.lineWidth = 2.4 + rank * .6;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.06, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (family === 'fire' || family === 'frostfire') {
        // The first ring is close to the collision; rank upgrades push fragments farther.
        ctx.strokeStyle = '#e38a58';
        ctx.lineWidth = 1.5 + rank * .7;
        ctx.beginPath();
        ctx.arc(0, 0, r * .55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 5 + rank; i++) impactRay(ctx, i * Math.PI * 2 / (5 + rank), r * .54, r * (1 + .07 * rank), r * .18);
        ctx.stroke();
    }
    if (family === 'frost' || family === 'frostfire') {
        // Clear sixfold crystalline fractures, visibly unlike a fiery explosion.
        ctx.strokeStyle = family === 'frostfire' ? '#a5d7df' : '#c0e9ed';
        ctx.lineWidth = 1.3 + rank * .6;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + Math.PI / 6;
            impactRay(ctx, angle, r * .18, r * (1.0 + rank * .13));
            const bx = Math.cos(angle) * r * .7;
            const by = Math.sin(angle) * r * .7;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(angle + .7) * r * .22, by + Math.sin(angle + .7) * r * .22);
        }
        ctx.stroke();
    }
    if (family === 'storm') {
        const stormglass = impact.combination === 1;
        ctx.strokeStyle = stormglass ? '#a7d9e1' : '#e3d48d';
        ctx.lineWidth = 1.6 + rank * .85;
        ctx.beginPath();
        for (let i = 0; i < 3 + rank; i++)
            impactRay(ctx, i * Math.PI * 2 / (3 + rank) + .15, r * .12, r * 1.05, r * .36);
        ctx.stroke();
        if (stormglass) {
            ctx.strokeStyle = '#89afc6';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, r * .4, Math.PI / 5, Math.PI * 1.9);
            ctx.stroke();
        }
    }
    if (family === 'arcane') {
        // Uneven fractured orbit, not the same circular pulse as the other schools.
        ctx.strokeStyle = '#c3a8d3';
        ctx.lineWidth = 1.6 + rank * .5;
        ctx.beginPath();
        ctx.arc(-r * .1, 0, r * .68, -.65 - progress, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 4 + rank; i++) {
            const a = i * Math.PI * 2 / (4 + rank);
            impactRay(ctx, a, r * .52, r * 1.12, -r * .16);
        }
        ctx.stroke();
    }
    ctx.restore();
}

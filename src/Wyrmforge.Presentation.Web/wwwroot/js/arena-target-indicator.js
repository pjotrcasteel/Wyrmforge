// Tactical selection feedback lives in presentation only. The C# aim target IDs,
// not pointer position or renderer heuristics, are the single source of truth.
// Objects are matched by registered prop ID, never by their current art/kind.
const finite = value => Number.isFinite(value);

export function resolveTargetIndicator(snapshot) {
    const player = snapshot?.player;
    if (!player || player.manualAim || snapshot.paused || snapshot.ended) return null;

    if (Number.isInteger(player.aimPropId)) {
        const world = snapshot.world;
        const prop = world && (snapshot.environment?.props ?? [])
            .find(item => item.id === player.aimPropId && item.healthFraction > 0);
        if (!prop || !finite(world.width) || !finite(world.height)) return null;
        return indicator('object', prop.x * world.width, prop.y * world.height, prop.radius);
    }

    if (!Number.isInteger(player.aimTargetId)) return null;
    const enemy = (snapshot.enemies ?? [])
        .find(item => item.entityId === player.aimTargetId && item.healthRatio > 0);
    if (enemy) return indicator('enemy', enemy.x, enemy.y, enemy.radius);

    const dragon = snapshot.dragon;
    if (dragon?.entityId === player.aimTargetId && dragon.health > 0 && dragon.targetable !== false)
        return indicator('boss', dragon.x, dragon.y, dragon.radius);

    return null;
}

function indicator(kind, x, y, radius) {
    if (![x, y, radius].every(finite) || radius <= 0) return null;
    // Readable at 320px mobile width; respects each target's C# collision size.
    const footprint = Math.min(142, Math.max(18, radius * 1.14 + (kind === 'boss' ? 12 : 7)));
    return {
        kind,
        x: Math.round(x),
        y: Math.round(y + radius * (kind === 'object' ? .7 : .75)),
        rx: footprint,
        ry: Math.max(7, Math.round(footprint * .32)),
    };
}

// Target selection is an in-world magical seal, not an attack telegraph.
// All schools and object kinds share the same desaturated, near-ivory ink.
const SIGIL_COLOR = '#d9cfee';

// Small hand-drawn Futhark-inspired strokes, not text characters or a font.
// Normalized coordinates keep glyphs legible on high-DPI mobile canvases.
const RUNES = Object.freeze([
    [[-0.45, -1, -0.45, 1], [-0.45, -.85, .55, -.48], [-.45, -.15, .45, .15]],
    [[-.5, -1, -.5, 1], [-.5, -1, .48, -.1], [.48, -.1, -.5, .18]],
    [[-.52, -1, .48, 1], [.48, -1, -.52, 1]],
    [[0, -1, 0, 1], [-.65, -.5, 0, -.05], [.65, -.5, 0, -.05]],
    [[-.5, -1, .52, -.15], [.52, -.15, -.5, .6], [-.5, .6, .5, 1]],
    [[-.55, -.9, .5, -.9], [0, -.9, 0, 1], [-.48, -.25, .45, -.25]],
    [[-.55, -1, -.55, 1], [-.55, -.1, .53, -.1], [.53, -.1, .53, .8]],
    [[-.5, -1, .5, 1], [.5, -1, -.5, 1], [0, -.55, 0, .6]],
]);

// Empty gaps let the sigil fade into the cobbles without becoming another
// concentric AoE circle. No full ring, warning-color fill or cardinal reticle.
const RING_ARCS = Object.freeze([
    [.12, 1.07], [1.49, 2.56], [2.94, 3.94], [4.36, 5.38], [5.68, 6.06],
]);

function strokeArcSegments(ctx, rx, ry, count) {
    for (let i = 0; i < count; i++) {
        const [start, end] = RING_ARCS[i];
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, start, end);
        ctx.stroke();
    }
}

function strokeRune(ctx, rune, size) {
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of rune) {
        ctx.moveTo(x1 * size, y1 * size);
        ctx.lineTo(x2 * size, y2 * size);
    }
    ctx.stroke();
}

function drawRuneInscriptions(ctx, marker) {
    const { rx, ry, kind } = marker;
    const count = kind === 'boss' ? 10 : kind === 'object' ? 3 : 6;
    const size = Math.min(5.2, Math.max(2.8, rx * .13));
    const offset = kind === 'object' ? .4 : .21;
    for (let index = 0; index < count; index++) {
        const angle = -Math.PI + offset + (index + .5) * (Math.PI * 2 / count);
        const x = Math.cos(angle) * rx * .83;
        const y = Math.sin(angle) * ry * .81;
        // A narrower glyph height follows the foreshortened ground plane.
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, .62);
        strokeRune(ctx, RUNES[index % RUNES.length], size);
        ctx.restore();
    }
}

function drawUnderlight(ctx, marker) {
    if (marker.kind === 'object') return;
    // This is an extremely faint selection VFX on the lower body, not a
    // registered GPU/world light and not a new source of physical shadows.
    // Its radial falloff never fills the sigil or produces a bright spotlight.
    const { rx, ry } = marker;
    const lift = Math.max(14, ry * 2.5);
    const halo = ctx.createRadialGradient(0, -lift * .42, 1, 0, -lift * .42, rx * .90);
    halo.addColorStop(0, marker.kind === 'boss' ? 'rgba(216,208,243,.055)' : 'rgba(216,208,243,.07)');
    halo.addColorStop(.55, 'rgba(216,208,243,.023)');
    halo.addColorStop(1, 'rgba(216,208,243,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-rx, -lift * 1.8, rx * 2, lift * 2.1);
}

export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false) {
    if (!marker || (pass !== 'ground' && pass !== 'contrast')) return;

    const isObject = marker.kind === 'object';
    const baseAlpha = isObject ? .26 : marker.kind === 'boss' ? .46 : .40;
    const breath = reducedMotion || !Number.isFinite(seconds) ? 1 : 1 + Math.sin(seconds * .9) * .035;

    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = SIGIL_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pass === 'ground') {
        // The world/night lighting naturally darkens this subtle ground trace.
        ctx.globalAlpha = baseAlpha * .44;
        ctx.lineWidth = 1;
        strokeArcSegments(ctx, marker.rx, marker.ry, isObject ? 3 : 5);
    } else {
        drawUnderlight(ctx, marker);
        ctx.globalAlpha = Math.min(.5, baseAlpha * breath);
        ctx.shadowColor = 'rgba(210,197,240,.20)';
        ctx.shadowBlur = isObject ? 1.2 : 2.2;
        ctx.lineWidth = isObject ? .9 : 1.15;
        strokeArcSegments(ctx, marker.rx, marker.ry, isObject ? 3 : 5);
        ctx.shadowBlur = 0;
        ctx.lineWidth = isObject ? .85 : 1;
        drawRuneInscriptions(ctx, marker);

        // One incomplete inner arc gives bosses a hint of a ritual seal.
        if (marker.kind === 'boss') {
            ctx.globalAlpha *= .38;
            ctx.beginPath();
            ctx.ellipse(0, 0, marker.rx * .72, marker.ry * .7, 0, .45, 2.35);
            ctx.stroke();
        }
    }

    ctx.restore();
}

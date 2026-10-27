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

// A single neutral visual language for Fire, Frost, Storm and every other school.
// Unlike hostile orange area telegraphs, a target is shown by short, unfilled
// ivory-lilac rune fragments at the feet. No gameplay, emissive light or art edits.
const SIGIL_COLOR = '#dcd4ee';
const SEGMENTS = Object.freeze([
    [.14, 1.07],
    [1.84, 2.73],
    [3.28, 4.22],
    [5.02, 5.94],
]);

function drawBrokenArcs(ctx, marker, passage) {
    const { rx, ry, kind } = marker;
    const count = kind === 'object' ? 2 : 4;
    for (let i = 0; i < count; i++) {
        // Props keep only opposite, short fragments: visually lower priority.
        const index = kind === 'object' ? i * 2 : i;
        const [start, end] = SEGMENTS[index];
        ctx.beginPath();
        ctx.ellipse(0, 0, rx + passage, ry + passage * .3, 0, start, end);
        ctx.stroke();
    }
}

function drawDiamond(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * .68, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * .68, y);
    ctx.closePath();
    ctx.stroke();
}

function drawRunicAccents(ctx, marker) {
    const { rx, ry, kind } = marker;
    const size = kind === 'boss' ? 5 : kind === 'object' ? 2.7 : 3.5;
    drawDiamond(ctx, -rx - 2, 0, size);
    if (kind !== 'object') drawDiamond(ctx, rx + 2, 0, size);

    // Two short angled glyphs make the line feel inscribed rather than a crosshair.
    // The marks never join into an enclosing outline or compete with attack AoEs.
    if (kind === 'object') return;
    ctx.beginPath();
    ctx.moveTo(-rx * .25, -ry - 1);
    ctx.lineTo(-rx * .25 + 2.5, -ry - 4);
    ctx.moveTo(rx * .25, ry + 1);
    ctx.lineTo(rx * .25 - 2.5, ry + 4);
    ctx.stroke();

    // A boss earns two extra inscription marks, not a huge second warning ring.
    if (kind !== 'boss') return;
    ctx.beginPath();
    ctx.moveTo(-rx * .52, ry * .85);
    ctx.lineTo(-rx * .52 - 3.5, ry * .85 + 3);
    ctx.moveTo(rx * .52, -ry * .85);
    ctx.lineTo(rx * .52 + 3.5, -ry * .85 - 3);
    ctx.stroke();
}

export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false) {
    if (!marker || (pass !== 'ground' && pass !== 'contrast')) return;
    const isObject = marker.kind === 'object';
    // A very small opacity breath adds magic without rotation, pulsing size,
    // shader work or additional lights. Reduced motion freezes it.
    const breath = reducedMotion || !Number.isFinite(seconds) ? 1 : 1 + Math.sin(seconds * 1.1) * .055;
    const emphasis = isObject ? .54 : marker.kind === 'boss' ? .86 : .78;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = SIGIL_COLOR;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (pass === 'ground') {
        // The underlying trace sits under actors, the world/night mask and
        // destructible scenery. Deliberately no filled target circle.
        ctx.globalAlpha = emphasis * .30;
        ctx.lineWidth = isObject ? 1.2 : 1.5;
        drawBrokenArcs(ctx, marker, 0);
    } else {
        // A restrained glow survives Gothic darkness without looking emissive,
        // school-colored or like a filled hostile attack telegraph.
        ctx.globalAlpha = Math.min(1, emphasis * breath);
        ctx.lineWidth = isObject ? 1.35 : 1.6;
        ctx.shadowColor = 'rgba(206,194,239,.42)';
        ctx.shadowBlur = isObject ? 1 : 2.5;
        drawBrokenArcs(ctx, marker, .7);
        ctx.shadowBlur = 0;
        ctx.lineWidth = isObject ? 1.15 : 1.35;
        drawRunicAccents(ctx, marker);
    }

    ctx.restore();
}

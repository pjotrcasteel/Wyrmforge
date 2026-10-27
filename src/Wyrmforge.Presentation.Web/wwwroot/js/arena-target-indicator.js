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

export function drawTargetIndicator(ctx, marker, pass = 'ground') {
    if (!marker) return;
    const { x, y, rx, ry, kind } = marker;
    const isObject = kind === 'object';
    // Silver/ivory for a hostile, muted amber for a breakable. Neither uses
    // danger-telegraph red, spell emissive orange, bloom or flashing animation.
    const color = isObject ? '#ddc18b' : '#cbdde4';
    ctx.save();
    ctx.translate(x, y);

    if (pass === 'ground') {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = isObject ? 'rgba(144,104,49,.12)' : 'rgba(124,160,172,.09)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(2,3,7,.85)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.globalAlpha = .6;
        ctx.lineWidth = 1.8;
        ctx.stroke();
    } else if (pass === 'contrast') {
        // Re-establish only a thin footprint edge above the night mask.
        // A solid overlay across the monster would obscure animation pixels.
        ctx.strokeStyle = 'rgba(2,3,7,.9)';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx + 1, ry + 1, 0, .16, Math.PI - .16);
        ctx.ellipse(0, 0, rx + 1, ry + 1, 0, Math.PI + .16, Math.PI * 2 - .16);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.globalAlpha = .94;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx + 1, ry + 1, 0, .16, Math.PI - .16);
        ctx.ellipse(0, 0, rx + 1, ry + 1, 0, Math.PI + .16, Math.PI * 2 - .16);
        ctx.stroke();

        // Four fixed notches remain recognizable on an animated/dark terrain.
        // No animation, framebuffer readback, sprite edits or GPU emitters.
        ctx.beginPath();
        ctx.moveTo(-rx - 5, 0);
        ctx.lineTo(-rx + 3, 0);
        ctx.moveTo(rx - 3, 0);
        ctx.lineTo(rx + 5, 0);
        ctx.moveTo(0, -ry - 4);
        ctx.lineTo(0, -ry + 2);
        ctx.moveTo(0, ry - 2);
        ctx.lineTo(0, ry + 4);
        ctx.stroke();
    }
    ctx.restore();
}

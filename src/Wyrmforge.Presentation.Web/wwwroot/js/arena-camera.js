// Camera coordinates are presentation-only. Physics, enemy AI, rewards and exits use canonical C# world positions.
export function resolveArenaCamera(world, player, viewWidth, viewHeight) {
    if (!world || !player) return { x: 0, y: 0, width: viewWidth, height: viewHeight };
    const maxX = Math.max(0, world.width - viewWidth);
    const maxY = Math.max(0, world.height - viewHeight);
    return {
        x: Math.min(maxX, Math.max(0, player.x - viewWidth / 2)),
        y: Math.min(maxY, Math.max(0, player.y - viewHeight / 2)),
        width: world.width,
        height: world.height,
    };
}

/**
 * Opt-in spectator camera for a genuine C# monastery footprint.
 * Presentation only: no player teleport, collision, world generation or target authority.
 */
export function resolveMonasteryArtReviewCamera(world, geography, viewWidth, viewHeight) {
    if (!(world?.width > 0 && world?.height > 0) ||
        geography?.landscape?.kind !== 'mountain-monastery') return null;
    const buildings = geography.landscape.obstacles?.filter(obstacle =>
        obstacle.kind?.startsWith('monastery-') && Array.isArray(obstacle.outline) &&
        obstacle.outline.length >= 3 && obstacle.outline.every(point =>
            Number.isFinite(point.x) && Number.isFinite(point.y) &&
            point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)) ?? [];
    if (!buildings.length) return null;
    const points = buildings.flatMap(building => building.outline);
    const focusX = (Math.min(...points.map(point => point.x)) +
        Math.max(...points.map(point => point.x))) * world.width * .5;
    const focusY = (Math.min(...points.map(point => point.y)) +
        Math.max(...points.map(point => point.y))) * world.height * .5;
    return { ...resolveArenaCamera(world, { x: focusX, y: focusY }, viewWidth, viewHeight),
        landmarkCount: buildings.length, focusX, focusY };
}

export function exitGuidePosition(exit, camera, viewWidth, viewHeight) {
    if (!exit) return null;
    const screenX = exit.x - camera.x;
    const screenY = exit.y - camera.y;
    const marginX = 48;
    const marginTop = Math.min(152, viewHeight * .26);
    const marginBottom = 72;
    if (screenX > marginX && screenX < viewWidth - marginX &&
        screenY > marginTop && screenY < viewHeight - marginBottom) return null;

    // Direction is relative to the actual visible viewport and gracefully handles diagonal exits.
    const dx = screenX - viewWidth / 2;
    const dy = screenY - viewHeight / 2;
    const t = Math.min(
        (viewWidth / 2 - marginX) / Math.max(Math.abs(dx), 1),
        (viewHeight / 2 - (dy < 0 ? marginTop : marginBottom)) / Math.max(Math.abs(dy), 1));
    return {
        x: Math.max(marginX, Math.min(viewWidth - marginX, viewWidth / 2 + dx * t)),
        y: Math.max(marginTop, Math.min(viewHeight - marginBottom, viewHeight / 2 + dy * t)),
        angle: Math.atan2(dy, dx),
        distance: Math.round(Math.hypot(dx, dy)),
    };
}

export function drawExitGuide(ctx, exit, camera, viewWidth, viewHeight) {
    const guide = exitGuidePosition(exit, camera, viewWidth, viewHeight);
    if (!guide) return;
    ctx.save();
    ctx.translate(guide.x, guide.y);
    ctx.fillStyle = 'rgba(15,8,22,.9)';
    ctx.strokeStyle = '#e2b781';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(guide.angle + Math.PI / 2);
    ctx.fillStyle = '#f5dcaf';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(11, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-11, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#f1d8b4';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#100910';
    ctx.shadowBlur = 4;
    ctx.fillText('EXIT', guide.x, guide.y + 37);
    ctx.restore();
}

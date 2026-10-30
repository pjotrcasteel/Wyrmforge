import { drawSemanticSiteFloor } from './arena-environment.js?v=20261029-world-first-ar0';

// A full-site inspection of the authoritative C# landscape on the real Hunt canvas.
// It is an opt-in, read-only topology review: it never changes the camera,
// simulation, collision, port commitment, material generation or normal gameplay.
export function drawAr1GeographyReview(ctx, geography, geographyActive, player, camera, width, height) {
    if (!geographyActive || geography?.version !== 1 || !geography?.landscape ||
        !player || !camera?.width || !camera?.height) return false;

    const worldWidth = camera.width;
    const worldHeight = camera.height;
    const narrow = height < 650;
    const headerBottom = narrow ? 106 : 136;
    const footerHeight = narrow ? 42 : 62;
    const availableHeight = Math.max(120, height - headerBottom - footerHeight - 16);
    const availableWidth = Math.max(120, width - 36);
    // Preserve the *actual world* aspect ratio; never stretch cliffs/roads to fit.
    const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
    const mapWidth = worldWidth * scale;
    const mapHeight = worldHeight * scale;
    const left = (width - mapWidth) / 2;
    const top = headerBottom + (availableHeight - mapHeight) / 2;

    ctx.save();
    ctx.fillStyle = '#0b1017';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f5dfb2';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('AR1 · C# SITE OVERVIEW', width / 2, narrow ? 84 : 108);
    ctx.fillStyle = '#c4c1b6';
    ctx.font = '11px system-ui';
    ctx.fillText(geography.landscape.kind.replaceAll('-', ' ').toUpperCase() +
        '  ·  REAL HUNT FOOTPRINTS', width / 2, narrow ? 101 : 128);

    ctx.fillStyle = '#1d242c';
    ctx.fillRect(left - 5, top - 5, mapWidth + 10, mapHeight + 10);
    ctx.strokeStyle = '#d6ba82';
    ctx.lineWidth = 2;
    ctx.strokeRect(left - 5, top - 5, mapWidth + 10, mapHeight + 10);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, mapWidth, mapHeight);
    ctx.clip();
    ctx.translate(left, top);
    ctx.scale(scale, scale);
    // The game renderer draws the exact same C# substrate, polygons, ports and
    // mandatory corridors here as in its normal semantic Hunt presentation.
    drawSemanticSiteFloor(ctx, geography, worldWidth, worldHeight, true);
    ctx.restore();

    // Explicitly show what the player could see from the *current real camera*.
    const viewportX = left + camera.x * scale;
    const viewportY = top + camera.y * scale;
    const viewportWidth = Math.min(worldWidth, width) * scale;
    const viewportHeight = Math.min(worldHeight, height) * scale;
    ctx.strokeStyle = '#fff2ce';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

    const playerX = left + player.x * scale;
    const playerY = top + player.y * scale;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9e7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#161923';
    ctx.stroke();

    ctx.fillStyle = '#e0d6c1';
    ctx.textAlign = 'center';
    ctx.font = '10px system-ui';
    ctx.fillText('White frame: live viewport  ·  Dot: real hunter', width / 2,
        Math.min(height - 10, top + mapHeight + (narrow ? 22 : 30)));
    ctx.restore();
    return true;
}

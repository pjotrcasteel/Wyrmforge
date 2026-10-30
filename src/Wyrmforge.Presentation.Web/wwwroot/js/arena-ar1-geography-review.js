import { drawSemanticSiteFloor } from './arena-environment.js?v=20261029-world-first-ar0';

// Review-only projection of the C# site recipe, drawn inside the normal Hunt canvas.
// This is not a camera zoom, gameplay map, physics layer or independent terrain generator.
export function drawAr1GeographyReview(ctx, geography, geographyActive, player, camera, width, height) {
    if (!geographyActive || geography?.version !== 1 || !geography?.landscape ||
        !player || !camera?.width || !camera?.height) return false;

    const worldWidth = camera.width;
    const worldHeight = camera.height;
    const mapHeight = Math.min(348, Math.floor(height * .60));
    const mapWidth = Math.min(width - 24, Math.round(mapHeight * worldWidth / worldHeight));
    const actualHeight = mapWidth * worldHeight / worldWidth;
    const left = width - mapWidth - 12;
    const top = height - actualHeight - 18;

    ctx.save();
    ctx.fillStyle = 'rgba(11, 16, 23, .96)';
    ctx.fillRect(left - 7, top - 31, mapWidth + 14, actualHeight + 38);
    ctx.strokeStyle = '#d6ba82';
    ctx.lineWidth = 2;
    ctx.strokeRect(left - 7, top - 31, mapWidth + 14, actualHeight + 38);
    ctx.fillStyle = '#f5dfb2';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('AR1 · C# SITE OVERVIEW', left, top - 13);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, mapWidth, actualHeight);
    ctx.clip();
    ctx.translate(left, top);
    ctx.scale(mapWidth / worldWidth, actualHeight / worldHeight);
    // Reuse the actual game's semantic renderer and the same authoritative polygons.
    drawSemanticSiteFloor(ctx, geography, worldWidth, worldHeight, true);
    ctx.restore();

    // The rectangle marks the *real* camera viewport. No camera or world state changes.
    ctx.strokeStyle = '#fff2ce';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
        left + camera.x / worldWidth * mapWidth,
        top + camera.y / worldHeight * actualHeight,
        Math.min(mapWidth, width / worldWidth * mapWidth),
        Math.min(actualHeight, height / worldHeight * actualHeight));
    ctx.fillStyle = '#fff9e7';
    ctx.strokeStyle = '#161923';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(left + player.x / worldWidth * mapWidth,
        top + player.y / worldHeight * actualHeight, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    return true;
}

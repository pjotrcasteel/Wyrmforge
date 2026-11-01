// Default Hunt ground: a featureless, flat one-metre-thick XYZ layer.
// These are source-art and physical grid units, not a screen-space tile raster.
// No terrain atlas, repeated material, walls, outlines or scenery are drawn.
export const GREYBOX_GROUND_COLOR = '#808080';

export function drawGreyboxGround(ctx, grid, width, height) {
    if (!ctx || !grid || !Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 0 || height <= 0) return false;
    ctx.fillStyle = GREYBOX_GROUND_COLOR;
    ctx.fillRect(0, 0, width, height);
    return true;
}

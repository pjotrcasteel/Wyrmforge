// Grounding for the authored characters. Their strips are upright pixel art, so tilting or rescaling them would break the pixel grid; what makes an
// upright figure read as standing on tilted ground is where its feet are and what it casts. This places the feet below the C# position by a
// fraction of the body radius (C# positions are the middle of the footprint, the art's root is its front foot), draws a footprint ellipse the
// size of that footprint, and throws the sprite's own silhouette flat across the ground. Presentation only: nothing here touches gameplay.
export const FOOT_DROP_FRACTION = .3;
export const SHADOW_SKEW = .5;
export const SHADOW_SQUASH = .3;

/** How far below its C# position a body of this radius plants its front foot. */
export const footDrop = radius => Math.round(Math.max(3, Number(radius) || 0) * FOOT_DROP_FRACTION);

/** The footprint ellipse: as wide as the body, a little over a third as deep. */
export const footprint = radius => {
    const rx = Math.max(7, Number(radius) || 0);
    return { rx, ry: Math.max(3, Math.round(rx * .4)) };
};

/** A dark ellipse on the ground under the whole body, with a denser core so a heavy body sits in it. */
export function drawFootprint(ctx, x, y, radius, alpha = 1) {
    const { rx, ry } = footprint(radius);
    ctx.save();
    ctx.fillStyle = 'rgb(5, 6, 10)';
    ctx.globalAlpha = .26 * alpha;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .3 * alpha;
    ctx.beginPath(); ctx.ellipse(x, y, rx * .62, ry * .62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

/**
 * The sprite's silhouette laid down on the ground in front of it and leaning away from the light: height becomes length (squashed to
 * `SHADOW_SQUASH`), and the top slides sideways by `SHADOW_SKEW` per unit of height. The feet stay on the spot, so the shadow is joined to them.
 */
export function drawCastShadow(ctx, image, crop, rootX, rootY, x, feetY, scale = 1, alpha = 1, side = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(feetY));
    ctx.transform(1, 0, -SHADOW_SKEW * side, -SHADOW_SQUASH, 0, 0);
    ctx.globalAlpha = .34 * alpha;
    ctx.filter = 'brightness(0)';
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, -rootX * scale, -rootY * scale, crop.width * scale, crop.height * scale);
    ctx.restore();
}

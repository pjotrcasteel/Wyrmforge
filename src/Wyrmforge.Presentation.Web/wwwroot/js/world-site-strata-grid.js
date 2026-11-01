// XYZ0 matrix REVIEW ONLY. Numerical material, body and Z values originate in
// C# WorldSiteStrataGrid.GetCell(x,y,z). This module never classifies terrain,
// changes collision, or invents a neighbor-join tile. Native faces stay 32x32.

// Index order matches the C# WorldSiteSurfaceId enum (not a JS world generator).
const materialRgb = Object.freeze([
    [111, 80, 64],   // Soil
    [60, 103, 73],   // Grass
    [175, 145, 112], // Road
    [86, 75, 69],    // Mud
    [114, 128, 136], // Rock
    [56, 127, 157],  // ShallowWater
    [165, 187, 200], // GlacialIce
]);
const airRgb = [17, 18, 20];

// Choose literal white/black by perceptual luminance: each tile uses its OWN
// contrast, including at unlike-material joins. Neither edge expands its pitch.
export function insetStrokeRgb(rgb) {
    const linear = rgb.map(channel => {
        const value = channel / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    return luminance > .179 ? [0, 0, 0] : [255, 255, 255];
}

// Pixel-exact pure compositor. The border occupies the FIRST and LAST pixel
// inside each 32px face. Neighbors therefore contribute 1px + 1px (2px total).
// A site whose dimensions aren't a multiple of 32 clips only its outer cells.
export function composeWorldSiteStrataPixels(strata, worldWidth, worldHeight) {
    const pitch = strata?.tilePixels;
    if (pitch !== 32 || !Number.isInteger(worldWidth) || !Number.isInteger(worldHeight) ||
        worldWidth <= 0 || worldHeight <= 0 ||
        strata.columns !== Math.ceil(worldWidth / pitch) ||
        strata.rows !== Math.ceil(worldHeight / pitch) ||
        strata.surfaceMaterialIds?.length !== strata.columns * strata.rows ||
        strata.bodyMaterialIds?.length !== strata.columns * strata.rows ||
        strata.surfaceZ?.length !== strata.columns * strata.rows) return null;

    const rgba = new Uint8ClampedArray(worldWidth * worldHeight * 4);
    for (let cy = 0; cy < strata.rows; cy++) {
        const top = cy * pitch;
        const tileHeight = Math.min(pitch, worldHeight - top);
        for (let cx = 0; cx < strata.columns; cx++) {
            const left = cx * pitch;
            const tileWidth = Math.min(pitch, worldWidth - left);
            const id = strata.surfaceMaterialIds[cy * strata.columns + cx];
            const rgb = materialRgb[id] ?? airRgb;
            const rim = insetStrokeRgb(rgb);
            for (let y = 0; y < tileHeight; y++) {
                for (let x = 0; x < tileWidth; x++) {
                    const border = x === 0 || x === tileWidth - 1 || y === 0 || y === tileHeight - 1;
                    const pixel = ((top + y) * worldWidth + left + x) * 4;
                    const color = border ? rim : rgb;
                    rgba[pixel] = color[0];
                    rgba[pixel + 1] = color[1];
                    rgba[pixel + 2] = color[2];
                    rgba[pixel + 3] = 255;
                }
            }
        }
    }
    return rgba;
}

const siteCanvases = new Map();

export function drawWorldSiteStrataGrid(ctx, strata, width, height) {
    if (typeof document === 'undefined' || !strata) return false;
    const key = `${strata.siteId}:${strata.worldSeed}:${strata.tilePixels}:${strata.columns}x${strata.rows}`;
    let cached = siteCanvases.get(key);
    if (!cached || cached.width !== width || cached.height !== height) {
        const rgba = composeWorldSiteStrataPixels(strata, width, height);
        if (!rgba) return false;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const target = canvas.getContext('2d');
        if (!target) return false;
        const image = target.createImageData(width, height);
        image.data.set(rgba);
        target.putImageData(image, 0, 0);
        cached = { canvas, width, height };
        siteCanvases.set(key, cached);
        if (siteCanvases.size > 3) siteCanvases.delete(siteCanvases.keys().next().value);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cached.canvas, 0, 0);
    ctx.restore();
    return true;
}

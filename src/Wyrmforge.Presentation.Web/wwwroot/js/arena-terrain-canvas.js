// Hunt 1.0 terrain painter (H5.1). Draws the authoritative C# heightfield as flat colour ramps in the metric oblique
// projection: a 32x32 top face and a 32x32 front face per 1 m block. No textures, no outlines (the one-pixel inset line is a
// separate debug overlay). Presentation reads the grid; it never edits it.
import { FACE_PIXELS, blockFrontRect, blockTopRect } from './arena-projection.js';

export const TERRAIN_MATERIAL = Object.freeze({ Soil: 0, Ash: 1, Stone: 2, Lava: 3 });
// Same bounds as C# WyrmInfluenceProfile.Fire: Wet, Scorched, Burning, Volcanic.
export const INFLUENCE_UPPER_BOUNDS = Object.freeze([0.25, 0.55, 0.85]);
// Room above row 0 for columns that rise above the floor, and below for pits.
export const TERRAIN_PAD_UNITS = 4 * FACE_PIXELS;

// [top, front] per material for each influence band. Flat two-tone ramps; the front face is always the darker tone.
const PALETTE = Object.freeze([
    // Natural / wet
    [['#7d7a62', '#5a5846'], ['#7b7873', '#58544f'], ['#8d8d90', '#5f5f66'], ['#d2661c', '#8f3d12']],
    // Scorched
    [['#6d6455', '#4b4439'], ['#706a65', '#4b4642'], ['#85847f', '#585760'], ['#e0701a', '#97400f']],
    // Burning
    [['#5e5249', '#3f352f'], ['#625b57', '#403a37'], ['#7a7578', '#514d55'], ['#ee7a14', '#a8440c']],
    // Volcanic
    [['#463d3a', '#2d2625'], ['#4c4543', '#302b2a'], ['#615b60', '#3f3b43'], ['#ff8a10', '#b84a08']],
]);

export function influenceBandIndex(corruption) {
    const value = Number.isFinite(corruption) ? Math.min(1, Math.max(0, corruption)) : 0;
    for (let band = 0; band < INFLUENCE_UPPER_BOUNDS.length; band++)
        if (value < INFLUENCE_UPPER_BOUNDS[band]) return band;
    return INFLUENCE_UPPER_BOUNDS.length;
}

export function terrainColors(band, material) {
    const bandPalette = PALETTE[Math.min(PALETTE.length - 1, Math.max(0, band | 0))];
    const [top, front] = bandPalette[material] ?? bandPalette[TERRAIN_MATERIAL.Soil];
    return { top, front };
}

/** Raised ground reads lighter and pits darker, in whole 1 m steps so shading never shimmers. */
export function heightShade(hex, surfaceMicrocells) {
    const meters = Math.max(-2, Math.min(3, Math.round(surfaceMicrocells / 8)));
    if (meters === 0) return hex;
    const factor = 1 + meters * 0.08;
    const value = parseInt(hex.slice(1), 16);
    const channel = shift => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)));
    return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

/**
 * Paints the whole grid back to front. Output coordinates are world units offset by (0, offsetY) so raised columns that
 * draw above row 0 stay on the surface. Returns the number of rectangles painted.
 */
export function paintTerrain(ctx, frame, band, offsetY = TERRAIN_PAD_UNITS) {
    const { columns, rows, surface, material } = frame;
    let painted = 0;
    ctx.save();
    ctx.translate(0, offsetY);
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const index = row * columns + column;
            const height = surface[index];
            const colors = terrainColors(band, material[index]);
            const top = blockTopRect(column, row, height);
            ctx.fillStyle = heightShade(colors.top, height);
            ctx.fillRect(top.x, top.y, top.width, top.height);
            painted++;
            const frontHeight = row + 1 < rows ? surface[index + columns] : height;
            const front = blockFrontRect(column, row, height, frontHeight);
            if (front) {
                ctx.fillStyle = colors.front;
                ctx.fillRect(front.x, front.y, front.width, front.height);
                painted++;
            }
        }
    }
    ctx.restore();
    return painted;
}

/**
 * Caches the painted heightfield in one offscreen surface and rebuilds it only when the C# terrain revision (or the
 * influence band) changes. Per frame the camera window is copied out, so excavation costs one repaint per impact.
 */
export class TerrainCanvasCache {
    constructor(createCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height })) {
        this.createCanvas = createCanvas;
        this.canvas = null;
        this.revision = null;
        this.band = null;
        this.repaints = 0;
    }

    update(frame, band) {
        if (!frame) return false;
        if (this.canvas && this.revision === frame.revision && this.band === band) return false;
        const width = frame.columns * FACE_PIXELS;
        const height = frame.rows * FACE_PIXELS + TERRAIN_PAD_UNITS * 2;
        if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height)
            this.canvas = this.createCanvas(width, height);
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        paintTerrain(ctx, frame, band, TERRAIN_PAD_UNITS);
        this.revision = frame.revision;
        this.band = band;
        this.repaints++;
        return true;
    }

    /** Draws the cached terrain for the visible world window into a context already translated by -camera. */
    draw(ctx, view) {
        if (!this.canvas) return false;
        const worldHeight = this.canvas.height - TERRAIN_PAD_UNITS * 2;
        const x = Math.max(0, Math.floor(view.x));
        const y = Math.max(-TERRAIN_PAD_UNITS, Math.floor(view.y));
        const width = Math.min(this.canvas.width, Math.ceil(view.x + view.width)) - x;
        const height = Math.min(worldHeight + TERRAIN_PAD_UNITS, Math.ceil(view.y + view.height)) - y;
        if (width <= 0 || height <= 0) return false;
        // The cache already holds screen-space output (raised columns lifted, pits sunk), offset by the pad.
        ctx.drawImage(this.canvas, x, y + TERRAIN_PAD_UNITS, width, height, x, y, width, height);
        return true;
    }
}

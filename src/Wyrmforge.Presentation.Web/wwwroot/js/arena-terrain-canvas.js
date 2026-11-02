// Hunt 1.0 terrain painter (H5.1). Draws the authoritative C# heightfield as flat colour ramps in the metric oblique
// projection: a 32x32 top face and a 32x32 front face per 1 m block. No textures, no outlines (the one-pixel inset line is a
// separate debug overlay). Presentation reads the grid; it never edits it.
import { FACE_PIXELS, MICROCELL_UNITS, blockFrontRect, blockTopRect } from './arena-projection.js';

export const TERRAIN_MATERIAL = Object.freeze({ Soil: 0, Ash: 1, Stone: 2, Lava: 3 });
// Same bounds as C# WyrmInfluenceProfile.Fire: Wet, Scorched, Burning, Volcanic.
export const INFLUENCE_UPPER_BOUNDS = Object.freeze([0.25, 0.55, 0.85]);
// Room above row 0 for columns that rise above the floor, and below for pits.
export const TERRAIN_PAD_UNITS = 4 * FACE_PIXELS;

// [top, front] per material for each influence band. Dark gothic flat ramps: muted earth, deep front faces for volume,
// and saturation reserved for lava (fire, blood and lightning carry the colour). The front is always the darker tone.
const PALETTE = Object.freeze([
    // Natural / wet: cold damp earth
    [['#6c6050', '#322c25'], ['#7a7773', '#2e2c2a'], ['#8a8580', '#2a2523'], ['#c9501a', '#7a1f0c']],
    // Scorched: dry ash-brown
    [['#5e5149', '#2a2420'], ['#6a6460', '#2c2826'], ['#7f7872', '#292321'], ['#d65a16', '#82200c']],
    // Burning: charred, blood-red undertone
    [['#4b3f3a', '#231b19'], ['#4e4642', '#262120'], ['#6e6159', '#241e1c'], ['#e8641a', '#8c1f0a']],
    // Volcanic: near-black basalt
    [['#352d2c', '#171212'], ['#3a3331', '#1a1514'], ['#58494a', '#1a1415'], ['#ff7a14', '#a01a08']],
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

// Owner direction (2 Nov 2026): grass cap, dirt, stone, bedrock. Each excavation removes the cap first, then dirt, then stone.
// Layer depths come from the C# grid (soil 1 m over stone, bedrock -4 m); colours are flat, dark and per influence band.
export const GRASS_TOP = Object.freeze(['#47582f', '#5d5a31', null, null]);
const DIRT = Object.freeze([
    { top: '#7a4630', upper: '#52291b', lower: '#3d1f15' },
    { top: '#6e4030', upper: '#4a2619', lower: '#381d14' },
    { top: '#5a362a', upper: '#3d2117', lower: '#2d1811' },
    { top: '#46302a', upper: '#2f1d17', lower: '#22130e' },
]);
const STONE_STRATA = Object.freeze(['#5c5348', '#554c42', '#4a423a', '#3a3430']);
export const DIRT_UPPER_FLOOR = -4;
export const DIRT_LOWER_FLOOR = -8;

const bandIndex = band => Math.min(PALETTE.length - 1, Math.max(0, band | 0));

/** Top-face colour for a column: grass on undisturbed ground, dirt once dug into, otherwise the material ramp. */
export function topFaceColor(band, material, surfaceMicrocells) {
    const index = bandIndex(band);
    if (material === TERRAIN_MATERIAL.Soil) {
        if (surfaceMicrocells < 0) return DIRT[index].top;
        if (GRASS_TOP[index] && surfaceMicrocells === 0) return GRASS_TOP[index];
    } else if (material === TERRAIN_MATERIAL.Ash && surfaceMicrocells < 0) {
        return DIRT[index].top;
    }
    return terrainColors(band, material).top;
}

/**
 * The visible front face as horizontal bands, top to bottom, in microcells: raised ground keeps its own material, then
 * two dirt bands from the original surface down, then stone. Lava stays one band.
 */
export function frontSegments(band, material, topMicrocells, bottomMicrocells) {
    const index = bandIndex(band);
    const ownFront = terrainColors(band, material).front;
    if (topMicrocells <= bottomMicrocells) return [];
    if (material === TERRAIN_MATERIAL.Lava) return [{ from: topMicrocells, to: bottomMicrocells, color: ownFront }];
    const segments = [];
    let cursor = topMicrocells;
    const take = (floor, color) => {
        const end = Math.max(bottomMicrocells, floor);
        if (cursor > end) { segments.push({ from: cursor, to: end, color }); cursor = end; }
    };
    if (cursor > 0) take(0, ownFront);
    if (cursor > DIRT_UPPER_FLOOR) take(DIRT_UPPER_FLOOR, DIRT[index].upper);
    if (cursor > DIRT_LOWER_FLOOR) take(DIRT_LOWER_FLOOR, DIRT[index].lower);
    take(bottomMicrocells, STONE_STRATA[index]);
    return segments;
}

/** Raised ground reads lighter and pits darker, in whole 1 m steps so shading never shimmers. */
export function heightShade(hex, surfaceMicrocells) {
    const meters = Math.max(-2, Math.min(3, Math.round(surfaceMicrocells / 8)));
    return meters === 0 ? hex : scaleHex(hex, 1 + meters * 0.12);
}

export function scaleHex(hex, factor) {
    const value = parseInt(hex.slice(1), 16);
    const channel = shift => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)));
    return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

/** A deterministic flat tone step per 1 m block (-1, 0 or +1) so open ground reads as individual blocks without texture. */
export function blockTone(column, row) {
    let h = (Math.imul(column + 1, 0x9E3779B1) ^ Math.imul(row + 7, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return ((h >>> 20) % 3) - 1;
}

export const BLOCK_TONE_STEP = 0.09;

// Share of undisturbed ground blocks that carry a glowing ember vein, per influence band: the land cracks open toward the Wyrm.
export const VEIN_CHANCE = Object.freeze([0, 0, 0.09, 0.2]);
const VEIN_COLORS = Object.freeze([null, null, ['#e8641a', '#ffb347'], ['#ff7a14', '#ffd27a']]);

/** Deterministic staircase of ember pixels inside one 32 x 32 top face (cell-local coordinates), or none. */
export function veinSegments(column, row, band) {
    const index = bandIndex(band);
    const chance = VEIN_CHANCE[index];
    if (!chance) return [];
    let h = (Math.imul(column + 11, 0x9E3779B1) ^ Math.imul(row + 3, 0xC2B2AE35)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0;
    if ((h & 0xffff) / 65536 >= chance) return [];
    const [core, spark] = VEIN_COLORS[index];
    const dx = (h >>> 16) & 1 ? 3 : -3;
    let x = 6 + ((h >>> 17) % 20), y = 5 + ((h >>> 22) % 20);
    const segments = [];
    for (let step = 0; step < 4 + ((h >>> 12) % 4); step++) {
        if (x < 0 || x > FACE_PIXELS - 3 || y < 0 || y > FACE_PIXELS - 2) break;
        segments.push({ x, y, w: 3, h: 2, color: core });
        if (step % 2) segments.push({ x: x + 1, y, w: 1, h: 1, color: spark });
        x += dx; y += step % 2 ? 2 : 1;
    }
    return segments;
}

export const MICRO_PER_COLUMN = 8;
export const MICRO_UNITS = FACE_PIXELS / MICRO_PER_COLUMN;

/**
 * Folds a C# terrain frame (coarse heights plus the subdivided columns that changed) into the client's previous frame.
 * An empty `heights` array means the column is whole again. The result is a new object; the previous one is untouched.
 */
export function mergeTerrainFrame(previous, incoming) {
    if (!incoming) return previous ?? null;
    const fine = new Map(previous?.fine ?? []);
    for (const block of incoming.fine ?? []) {
        if (!block.heights?.length) fine.delete(block.index);
        else fine.set(block.index, { heights: block.heights, topsoil: block.topsoil, stoneTop: block.stoneTop, wear: block.wear ?? null });
    }
    return { revision: incoming.revision, columns: incoming.columns, rows: incoming.rows,
        surface: incoming.surface, material: incoming.material, fine,
        // Which fine blocks this delta touched: cosmetic destruction cues are derived from exactly these.
        changed: (incoming.fine ?? []).map(block => block.index) };
}

/** Height of one 12.5 cm microcolumn; whole columns answer with their single coarse height. */
export function microHeight(frame, column, row, microX, microY) {
    const block = frame.fine?.get(row * frame.columns + column);
    return block ? block.heights[microY * MICRO_PER_COLUMN + microX] : frame.surface[row * frame.columns + column];
}

/** What a microcolumn is made of: stone at or below the stone line, otherwise the column's original topsoil. */
export function microMaterial(block, height) {
    if (block.topsoil === TERRAIN_MATERIAL.Stone || block.topsoil === TERRAIN_MATERIAL.Lava) return block.topsoil;
    return height <= block.stoneTop ? TERRAIN_MATERIAL.Stone : block.topsoil;
}

export const CRACK_DARK = '#17100d';
export const CRACK_HOT = '#ff7a14';

/**
 * Terraria-style crack stages for worn stone inside one 4 x 4 px microcolumn top (local coordinates): stage 1 a pixel, 2 a short
 * bend, 3 a longer bend with a glowing ember pixel because the next hit breaks it. Stage 0 or less draws nothing.
 */
export function crackPixels(stage) {
    if (!(stage >= 1)) return [];
    const pixels = [{ x: 1, y: 1, w: 1, h: 1, color: CRACK_DARK }];
    if (stage >= 2) pixels.push({ x: 2, y: 1, w: 1, h: 1, color: CRACK_DARK }, { x: 2, y: 2, w: 1, h: 1, color: CRACK_DARK });
    if (stage >= 3) pixels.push({ x: 3, y: 2, w: 1, h: 1, color: CRACK_DARK }, { x: 2, y: 3, w: 1, h: 1, color: CRACK_HOT });
    return pixels;
}

/** Paints a subdivided column as 8 x 8 microcolumns, back to front: a 4 px top square each and 4 px wide strata fronts. */
function paintFineCell(ctx, frame, band, column, row, block) {
    const { columns, rows } = frame;
    const tone = 1 + blockTone(column, row) * BLOCK_TONE_STEP;
    let painted = 0;
    for (let microY = 0; microY < MICRO_PER_COLUMN; microY++) {
        for (let microX = 0; microX < MICRO_PER_COLUMN; microX++) {
            const height = block.heights[microY * MICRO_PER_COLUMN + microX];
            const material = microMaterial(block, height);
            const x = column * FACE_PIXELS + microX * MICRO_UNITS;
            const y = row * FACE_PIXELS + microY * MICRO_UNITS;
            ctx.fillStyle = scaleHex(heightShade(topFaceColor(band, material, height), height), tone);
            ctx.fillRect(x, y - height * MICROCELL_UNITS, MICRO_UNITS, MICRO_UNITS);
            painted++;
            for (const crack of crackPixels(block.wear?.[microY * MICRO_PER_COLUMN + microX])) {
                ctx.fillStyle = crack.color;
                ctx.fillRect(x + crack.x, y - height * MICROCELL_UNITS + crack.y, crack.w, crack.h);
                painted++;
            }
            const southY = microY + 1 < MICRO_PER_COLUMN ? microY + 1 : 0;
            const southRow = microY + 1 < MICRO_PER_COLUMN ? row : row + 1;
            const south = southRow < rows ? microHeight(frame, column, southRow, microX, southY) : height;
            for (const segment of frontSegments(band, block.topsoil, height, south)) {
                ctx.fillStyle = segment.color;
                ctx.fillRect(x, y + MICRO_UNITS - segment.from * MICROCELL_UNITS, MICRO_UNITS, (segment.from - segment.to) * MICROCELL_UNITS);
                painted++;
            }
        }
    }
    return painted;
}

/**
 * Paints the whole grid back to front. Output coordinates are world units offset by (0, offsetY) so raised columns that
 * draw above row 0 stay on the surface. Returns the number of rectangles painted.
 */
export function paintTerrain(ctx, frame, band, offsetY = TERRAIN_PAD_UNITS) {
    const { columns, rows } = frame;
    let painted = 0;
    ctx.save();
    ctx.translate(0, offsetY);
    for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) painted += paintTerrainCell(ctx, frame, band, column, row);
    ctx.restore();
    return painted;
}

/** Paints one column's top face and, where a lower neighbour is in front, its front face. Returns rectangles painted. */
export function paintTerrainCell(ctx, frame, band, column, row) {
    const { columns, rows, surface, material } = frame;
    const index = row * columns + column;
    const fineBlock = frame.fine?.get(index);
    if (fineBlock) return paintFineCell(ctx, frame, band, column, row, fineBlock);
    const height = surface[index];
    const top = blockTopRect(column, row, height);
    const tone = 1 + blockTone(column, row) * BLOCK_TONE_STEP;
    ctx.fillStyle = scaleHex(heightShade(topFaceColor(band, material[index], height), height), tone);
    ctx.fillRect(top.x, top.y, top.width, top.height);
    let painted = 1;
    const frontHeight = row + 1 < rows ? surface[index + columns] : height;
    // A whole column standing behind a subdivided one meets its microcolumns, not their average.
    if (row + 1 < rows && frame.fine?.has(index + columns)) {
        for (let microX = 0; microX < MICRO_PER_COLUMN; microX++) {
            for (const segment of frontSegments(band, material[index], height, microHeight(frame, column, row + 1, microX, 0))) {
                ctx.fillStyle = segment.color;
                ctx.fillRect(column * FACE_PIXELS + microX * MICRO_UNITS, (row + 1) * FACE_PIXELS - segment.from * MICROCELL_UNITS,
                    MICRO_UNITS, (segment.from - segment.to) * MICROCELL_UNITS);
                painted++;
            }
        }
        return painted;
    }
    for (const segment of frontSegments(band, material[index], height, frontHeight)) {
        ctx.fillStyle = segment.color;
        ctx.fillRect(column * FACE_PIXELS, (row + 1) * FACE_PIXELS - segment.from * MICROCELL_UNITS, FACE_PIXELS,
            (segment.from - segment.to) * MICROCELL_UNITS);
        painted++;
    }
    return painted;
}

const OCCLUSION_ROWS = 4;

/**
 * Terrain columns in front of (south of) an actor that stand higher than its feet: they hide part of it.
 * Returned back to front so repainting them keeps the painter's order.
 */
export function occludingTerrainCells(frame, groundX, groundY, groundZ, halfWidth) {
    if (!frame || !Number.isFinite(groundX) || !Number.isFinite(groundY)) return [];
    const { columns, rows, surface } = frame;
    const footRow = Math.floor(groundY / FACE_PIXELS);
    const first = Math.max(0, Math.floor((groundX - halfWidth) / FACE_PIXELS));
    const last = Math.min(columns - 1, Math.floor((groundX + halfWidth) / FACE_PIXELS));
    const cells = [];
    for (let row = Math.max(0, footRow + 1); row <= Math.min(rows - 1, footRow + OCCLUSION_ROWS); row++)
        for (let column = first; column <= last; column++)
            if (surface[row * columns + column] * MICROCELL_UNITS > groundZ + 1) cells.push({ column, row });
    return cells;
}

/** GPU path: remove the covered pixels from an actor's scratch tile so the lit terrain beneath shows through. */
export function eraseTerrainOcclusion(ctx, frame, cells) {
    if (cells.length === 0) return 0;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (const { column, row } of cells) {
        const height = frame.surface[row * frame.columns + column];
        const top = blockTopRect(column, row, height);
        ctx.fillRect(top.x, top.y, top.width, top.height);
        const front = blockFrontRect(column, row, height, row + 1 < frame.rows ? frame.surface[(row + 1) * frame.columns + column] : height);
        if (front) ctx.fillRect(front.x, front.y, front.width, front.height);
    }
    ctx.restore();
    return cells.length;
}

/** Canvas path: paint the covering terrain over the actor in painter's order. */
export function repaintTerrainOcclusion(ctx, frame, band, cells) {
    for (const { column, row } of cells) paintTerrainCell(ctx, frame, band, column, row);
    return cells.length;
}

export const BLOCK_INSET_COLOR = '#ff00ff';

/** Debug toggle: `?blockInset=1`. Never part of the cache, art or physics. */
export function blockInsetOverlayEnabled(search = globalThis.location?.search ?? '') {
    return new URLSearchParams(search).get('blockInset') === '1';
}

/**
 * One-source-pixel contrasting line inset inside every visible top and front face, to verify the 32x32 faces and the
 * 4 px microcell grid. A world unit is one source pixel, so the line is one unit wide. Returns the faces outlined.
 */
export function drawBlockInsetOverlay(ctx, frame, view) {
    const { columns, rows, surface } = frame;
    const first = Math.max(0, Math.floor(view.x / FACE_PIXELS) - 1);
    const last = Math.min(columns - 1, Math.floor((view.x + view.width) / FACE_PIXELS) + 1);
    const firstRow = Math.max(0, Math.floor(view.y / FACE_PIXELS) - 1);
    const lastRow = Math.min(rows - 1, Math.floor((view.y + view.height + 4 * FACE_PIXELS) / FACE_PIXELS) + 1);
    let outlined = 0;
    ctx.save();
    ctx.strokeStyle = BLOCK_INSET_COLOR;
    ctx.lineWidth = 1;
    for (let row = firstRow; row <= lastRow; row++) {
        for (let column = first; column <= last; column++) {
            const index = row * columns + column;
            if (frame.fine?.has(index)) {
                // A dug block is outlined per 4 px microcolumn at its own height, not at the rounded whole-column height.
                for (let my = 0; my < MICRO_PER_COLUMN; my++) for (let mx = 0; mx < MICRO_PER_COLUMN; mx++) {
                    const height = microHeight(frame, column, row, mx, my);
                    ctx.strokeRect(column * FACE_PIXELS + mx * MICRO_UNITS + 0.5, row * FACE_PIXELS + my * MICRO_UNITS - height * MICROCELL_UNITS + 0.5,
                        MICRO_UNITS - 1, MICRO_UNITS - 1);
                    outlined++;
                }
                continue;
            }
            const top = blockTopRect(column, row, surface[index]);
            ctx.strokeRect(top.x + 0.5, top.y + 0.5, top.width - 1, top.height - 1);
            outlined++;
            const front = blockFrontRect(column, row, surface[index], row + 1 < rows ? surface[index + columns] : surface[index]);
            if (!front) continue;
            for (let offset = 0; offset < front.height; offset += FACE_PIXELS) {
                ctx.strokeRect(front.x + 0.5, front.y + offset + 0.5, front.width - 1, Math.min(FACE_PIXELS, front.height - offset) - 1);
                outlined++;
            }
        }
    }
    ctx.restore();
    return outlined;
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
        this.totalRepaintMs = 0;
        this.maxRepaintMs = 0;
    }

    update(frame, band) {
        if (!frame) return false;
        if (this.canvas && this.revision === frame.revision && this.band === band) return false;
        const started = globalThis.performance?.now() ?? 0;
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
        const elapsed = (globalThis.performance?.now() ?? 0) - started;
        this.totalRepaintMs += elapsed;
        this.maxRepaintMs = Math.max(this.maxRepaintMs, elapsed);
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

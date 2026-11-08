// Hunt 1.0 terrain painter (H5.1). Draws the authoritative C# heightfield in the metric oblique projection: a 64x64 art-pixel top face and
// a 64x64 art-pixel front face per 1 m block. All geometry below is in world units (32 per metre, what C# and the camera use); the cached
// surface is TERRAIN_ART_SCALE times denser, and the cache applies that scale to the context so a 64 px tile lands on one canvas pixel per
// tile pixel. No outlines (the one-pixel inset line is a separate debug overlay). Presentation reads the grid; it never edits it.
import { FACE_PIXELS, MICROCELL_UNITS, TERRAIN_ART_SCALE, blockFrontRect, blockTopRect } from './arena-projection.js';
import { generateTileSet, TILE, MEGA, normalFromTile } from './arena-terrain-tiles.js';

// A tile is TILE art pixels for FACE_PIXELS world units; the canvas is TERRAIN_ART_SCALE pixels per unit. They must agree.
const ART = TILE / FACE_PIXELS;
if (ART !== TERRAIN_ART_SCALE) throw new Error('Terrain tiles and the terrain canvas must share one art scale.');
import { drawGroundDecals } from './arena-ground-decals.js';
import { cellShadow, shadowStyle, SHADOW_SAMPLES } from './arena-terrain-shadows.js';
import { forestKit } from './forest-kit.js';
import { layerLabEnabled } from './arena-layer-lab.js?v=20261108-terrain-evidence-v1';

export const TERRAIN_MATERIAL = Object.freeze({ Soil: 0, Ash: 1, Stone: 2, Lava: 3, Wood: 4, Boulder: 5 });
const isUprightProp = material => material === TERRAIN_MATERIAL.Wood || material === TERRAIN_MATERIAL.Boulder;
// Same bounds as C# WyrmInfluenceProfile.Fire: Wet, Scorched, Burning, Volcanic.
export const INFLUENCE_UPPER_BOUNDS = Object.freeze([0.25, 0.55, 0.85]);
// Room above row 0 for columns that rise above the floor, and below for pits.
export const TERRAIN_PAD_UNITS = 4 * FACE_PIXELS;

// [top, front] per material for each influence band. Dark gothic flat ramps: muted earth, deep front faces for volume,
// and saturation reserved for lava (fire, blood and lightning carry the colour). The front is always the darker tone.
const PALETTE = Object.freeze([
    // Natural / wet: cold damp earth
    [['#6c6050', '#322c25'], ['#7a7773', '#2e2c2a'], ['#6f6c68', '#2a2523'], ['#c9501a', '#7a1f0c']],
    // Scorched: dry ash-brown
    [['#5e5149', '#2a2420'], ['#6a6460', '#2c2826'], ['#645f5a', '#292321'], ['#d65a16', '#82200c']],
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
// Unbreakable bedrock at the bottom of a deep crater: near-black violet with no cracks, so it reads as "this will not break".
export const BEDROCK_MICROCELLS = -32;
export const BEDROCK_TOP = '#1d1822';

const bandIndex = band => Math.min(PALETTE.length - 1, Math.max(0, band | 0));

/** Top-face colour for a column: grass on undisturbed ground, dirt once dug into, otherwise the material ramp. */
export function topFaceColor(band, material, surfaceMicrocells) {
    if (surfaceMicrocells <= BEDROCK_MICROCELLS) return BEDROCK_TOP;
    const index = bandIndex(band);
    if (material === TERRAIN_MATERIAL.Soil) {
        if (surfaceMicrocells < 0) return DIRT[index].top;
        if (GRASS_TOP[index] && surfaceMicrocells >= 0) return GRASS_TOP[index];
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
    if (material === TERRAIN_MATERIAL.Lava) return [{ from: topMicrocells, to: bottomMicrocells, color: ownFront, kind: 'lava' }];
    const segments = [];
    let cursor = topMicrocells;
    const take = (floor, color, kind) => {
        const end = Math.max(bottomMicrocells, floor);
        if (cursor > end) { segments.push({ from: cursor, to: end, color, kind }); cursor = end; }
    };
    if (cursor > 0) take(0, ownFront, 'own');
    if (cursor > DIRT_UPPER_FLOOR) take(DIRT_UPPER_FLOOR, DIRT[index].upper, 'dirtUpper');
    if (cursor > DIRT_LOWER_FLOOR) take(DIRT_LOWER_FLOOR, DIRT[index].lower, 'dirtLower');
    take(bottomMicrocells, STONE_STRATA[index], 'stone');
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

// Ground grain: every top-face microcell takes one of five tone steps from two scales of noise (soft drifts about a metre across plus
// the odd single-cell speck), bare earth patches break the grass, and rare pebbles sit on open ground. All whole 4 px cells, flat colours.
const hash2 = (x, y, seed) => {
    let h = (Math.imul(x + 11, 0x9E3779B1) ^ Math.imul(y + 3, 0x85EBCA6B) ^ Math.imul(seed, 0xC2B2AE35)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return (h ^ (h >>> 12)) >>> 0;
};
const unit = (x, y, seed) => hash2(x, y, seed) / 4294967296;
function valueNoise(x, y, scale, seed) {
    const [fx, fy] = [x / scale, y / scale];
    const [x0, y0] = [Math.floor(fx), Math.floor(fy)];
    const [tx, ty] = [fx - x0, fy - y0].map(t => t * t * (3 - 2 * t));
    const top = unit(x0, y0, seed) * (1 - tx) + unit(x0 + 1, y0, seed) * tx;
    const bottom = unit(x0, y0 + 1, seed) * (1 - tx) + unit(x0 + 1, y0 + 1, seed) * tx;
    return top * (1 - ty) + bottom * ty;
}
export const GROUND_TONE_STEP = 0.05;
/** Tone step -2..2 of one global microcell. */
export function groundStep(gx, gy) {
    const drift = valueNoise(gx, gy, 6, 1);
    const speck = unit(gx, gy, 2);
    return Math.max(-2, Math.min(2, (drift < .3 ? -1 : drift > .72 ? 1 : 0) + (speck < .09 ? -1 : speck > .93 ? 1 : 0)));
}
export const isBarePatch = (gx, gy) => valueNoise(gx, gy, 9, 7) > .72 && unit(gx, gy, 9) > .2;
export const isPebble = (gx, gy) => unit(gx, gy, 5) > .985;

// Damp, muted earth where the grass has worn through: darker and greyer than freshly dug dirt so it never reads as blood or rust.
const BARE_EARTH = Object.freeze(['#4a4234', '#52443a', '#3f332e', '#342a27']);

const scaled = new Map();
const scaledHex = (hex, factor) => {
    const key = `${hex}|${factor}`;
    let value = scaled.get(key);
    if (!value) { value = scaleHex(hex, factor); scaled.set(key, value); }
    return value;
};

/**
 * Chips and strata flecks on a wall face: some 4 px cells of a front-face band are a step darker or lighter, so cliffs read as rock
 * built of voxels instead of a flat slab. `x` is the left edge of one microcolumn slice, `gx` its global microcolumn index.
 */
function frontGrain(ctx, segment, material, gx, x, yTop) {
    if (material === TERRAIN_MATERIAL.Lava) return 0;
    let painted = 0;
    const cells = Math.round(segment.from - segment.to);
    for (let k = 0; k < cells; k++) {
        const roll = unit(gx, segment.from - k, 3);
        const factor = roll < .13 ? .84 : roll > .9 ? 1.14 : 1;
        if (factor === 1) continue;
        ctx.fillStyle = scaledHex(segment.color, factor);
        ctx.fillRect(x, yTop + k * MICROCELL_UNITS, MICRO_UNITS, MICROCELL_UNITS);
        painted++;
    }
    return painted;
}

/** Top-face colour of one undisturbed or dug microcell with its grain; lava and bedrock stay flat. */
export function groundTopColor(band, material, height, gx, gy) {
    if (material === TERRAIN_MATERIAL.Lava || height <= BEDROCK_MICROCELLS) return topFaceColor(band, material, height);
    const index = bandIndex(band);
    let base;
    if (material === TERRAIN_MATERIAL.Soil && height >= 0 && GRASS_TOP[index] && isBarePatch(gx, gy)) base = BARE_EARTH[index];
    else if (material !== TERRAIN_MATERIAL.Stone && height >= 0 && isPebble(gx, gy)) base = terrainColors(band, TERRAIN_MATERIAL.Stone).top;
    else base = topFaceColor(band, material, height);
    return scaledHex(heightShade(base, height), 1 + groundStep(gx, gy) * GROUND_TONE_STEP);
}

// Heat cracks come from the C# arena generator as paths of 4-adjacent global microcells (x, y pairs): each runs from a lava pool or old
// crater toward another, forks, and a fork either joins another source or ends in a fresh crater. The client only turns them into
// whole 4 px cells with a one-cell halo of cooler rock; it never invents a crack of its own.
const CRACK_RAMP = Object.freeze([null,
    { core: ['#8a2a0c', '#b8400f'], halo: '#3a110a' },
    { core: ['#e8641a', '#ff9a2a'], halo: '#7a1f0c' },
    { core: ['#ff7a14', '#ffd27a'], halo: '#a01a08' }]);

/** Colours of the glowing cracks for an influence band; null in the wet land where the ground has not cracked. */
export function veinRamp(band) { return CRACK_RAMP[bandIndex(band)]; }

const crackCache = new WeakMap();

/** Every cell of the crack network in global microcell coordinates: `{ x, y, kind: 'core' | 'halo', tone }`, deduplicated and cached per network. */
export function crackCells(cracks) {
    if (!cracks?.length) return [];
    const cached = crackCache.get(cracks);
    if (cached) return cached;
    const core = new Map();
    for (const path of cracks)
        for (let i = 0; i + 1 < path.length; i += 2) {
            const x = path[i], y = path[i + 1];
            core.set(y * 4096 + x, { x, y, kind: 'core', tone: (x * 3 + y * 5) & 1 });
        }
    const halo = new Map();
    for (const { x, y } of core.values())
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = (y + dy) * 4096 + x + dx;
            if (x + dx >= 0 && y + dy >= 0 && !core.has(key) && !halo.has(key)) halo.set(key, { x: x + dx, y: y + dy, kind: 'halo', tone: 0 });
        }
    const cells = [...core.values(), ...halo.values()];
    crackCache.set(cracks, cells);
    return cells;
}
export const MICRO_PER_COLUMN = 8;
/** How high the terrain draws a tree's or boulder's column: none, because the sprite carries the whole object (a raised block shows as a square plinth). */
export const TRUNK_MOUND_MICROCELLS = 0;
export const MICRO_UNITS = FACE_PIXELS / MICRO_PER_COLUMN;

/**
 * Folds a C# terrain frame (coarse heights plus the subdivided columns that changed) into the client's previous frame.
 * An empty `heights` array means the column is whole again. The result is a new object; the previous one is untouched.
 */
export function mergeTerrainFrame(previous, incoming) {
    if (!incoming) return previous ?? null;
    const visualSeed = incoming.visualSeed ?? previous?.visualSeed ?? 0;
    const sameSite = previous && previous.columns === incoming.columns && previous.rows === incoming.rows &&
        previous.visualSeed === visualSeed && incoming.revision >= previous.revision;
    const fine = new Map(sameSite ? previous.fine : []);
    const changed = new Set();
    for (const block of incoming.fine ?? []) {
        if (!Number.isInteger(block.index) || block.index < 0 || block.index >= incoming.columns * incoming.rows) continue;
        const before = fine.get(block.index);
        if (!block.heights?.length) {
            fine.delete(block.index);
            if (before) changed.add(block.index);
            continue;
        }
        const next = { heights: isUprightProp(incoming.material?.[block.index])
            ? block.heights.map(height => Math.min(height, TRUNK_MOUND_MICROCELLS)) : block.heights,
            topsoil: block.topsoil, stoneTop: block.stoneTop, wear: block.wear ?? null };
        if (!terrainFineEqual(before, next)) changed.add(block.index);
        fine.set(block.index, next);
    }
    // Trees and boulders are drawn as upright sprites; the terrain itself only shows a low mound under them. The real height (the coarse
    // height C# collides with) stays in `trunks` / `boulders`, and a boulder paints as stone.
    const trunks = new Map(), boulders = new Map();
    let surface = incoming.surface, material = incoming.material;
    for (let index = 0; index < (incoming.material?.length ?? 0); index++) {
        const kind = incoming.material[index];
        if (!isUprightProp(kind)) continue;
        if (surface === incoming.surface) surface = Array.from(incoming.surface);
        (kind === TERRAIN_MATERIAL.Wood ? trunks : boulders).set(index, incoming.surface[index]);
        surface[index] = Math.min(surface[index], TRUNK_MOUND_MICROCELLS);
        if (kind === TERRAIN_MATERIAL.Boulder) {
            if (material === incoming.material) material = Array.from(incoming.material);
            material[index] = TERRAIN_MATERIAL.Stone;
        }
    }
    // Fine deltas are not the only way to change a column: coarse material or height replacements
    // must still invalidate their faces (and neighbours), even when the server reports no fine blocks.
    if (sameSite) {
        for (let i = 0; i < surface.length; i++)
            if (surface[i] !== previous.surface[i] || material[i] !== previous.material[i]) changed.add(i);
    }
    return { revision: incoming.revision, columns: incoming.columns, rows: incoming.rows,
        surface, material, fine, trunks, boulders,
        // Damage changes physical heights, not the authored ground's splat/blend pattern. Capture it once for this site.
        baseSurface: sameSite ? (previous.baseSurface ?? Array.from(previous.surface)) : Array.from(surface),
        baseMaterial: sameSite ? (previous.baseMaterial ?? Array.from(previous.material)) : Array.from(material),
        // Ground cover is part of the original site: do not rebuild its whole-map placement on each impact.
        coverField: sameSite ? previous.coverField : undefined,
        roadNear: sameSite ? previous.roadNear : undefined,
        rockNear: sameSite ? previous.rockNear : undefined,
        visualSeed,
        // A reliable visual delta: retransmitted but identical heights/stone wear must never redraw or reupload
        // distant undamaged terrain. A new site always repaints fully regardless of this list.
        changed: [...changed],
        // Road edits require a whole-site resplat, not a local dirty clip.
        visualDeltaComplete: Boolean(sameSite && (!incoming.road?.length || terrainArrayEqual(incoming.road, previous.road))),
        // The generated crack network travels once, with the first full load; so do the road (1/16 cell polyline) and the torches.
        cracks: incoming.cracks?.length ? incoming.cracks : previous?.cracks ?? [],
        road: incoming.road?.length ? incoming.road : previous?.road ?? [],
        torches: incoming.torches?.length ? incoming.torches : previous?.torches ?? [] };
}

/** Compare source-authoritative microcell data, not object identity or server revision.
 * Repeated damage/kill updates may resend the same block, and repainting that data must not
 * touch its neighbours or create a new ground GPU capture.
 */
function terrainArrayEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function terrainFineEqual(a, b) {
    return a === b || Boolean(a && b && a.topsoil === b.topsoil && a.stoneTop === b.stoneTop &&
        terrainArrayEqual(a.heights, b.heights) && terrainArrayEqual(a.wear, b.wear));
}

/** Height of one 12.5 cm microcolumn; whole columns answer with their single coarse height. */
export function microHeight(frame, column, row, microX, microY) {
    const block = frame.fine?.get(row * frame.columns + column);
    return block ? block.heights[microY * MICRO_PER_COLUMN + microX] : frame.surface[row * frame.columns + column];
}

/** What a microcolumn is made of: stone at or below the stone line, otherwise the column's original topsoil. */
export function microMaterial(block, height) {
    if (block.topsoil === TERRAIN_MATERIAL.Stone || block.topsoil === TERRAIN_MATERIAL.Lava || block.topsoil === TERRAIN_MATERIAL.Wood) return block.topsoil;
    return height <= block.stoneTop ? TERRAIN_MATERIAL.Stone : block.topsoil;
}

export const CRACK_DARK = '#17100d';
export const CRACK_HOT = '#ff7a14';

/** Impact points that break one stone microcell; mirrors `ArenaTerrainGrid.StoneWearPerMicrocell` in C#. */
export const STONE_WEAR_PER_MICROCELL = 2;
/** Maps a wear counter (1 to threshold - 1) onto crack stages 1 to 3, so the last stage always means the next hit breaks it. */
export const wearStage = counter => counter > 0 ? Math.min(3, Math.ceil(counter * 3 / Math.max(1, STONE_WEAR_PER_MICROCELL - 1))) : 0;

/**
 * Terraria-style crack stages for worn stone inside one microcolumn top (local world-unit coordinates, 0 to 4; each pixel is one art pixel,
 * an 8 x 8 grid): stage 1 a short split, 2 a bend, 3 a longer bend with a glowing ember because the next hit breaks it. Stage 0 or
 * less draws nothing.
 */
export function crackPixels(stage) {
    if (!(stage >= 1)) return [];
    const unit = 1 / ART;
    const pixel = (x, y, color = CRACK_DARK) => ({ x: x * unit, y: y * unit, w: unit, h: unit, color });
    const pixels = [pixel(2, 1), pixel(2, 2)];
    if (stage >= 2) pixels.push(pixel(3, 3), pixel(3, 4), pixel(4, 4), pixel(5, 5));
    if (stage >= 3) pixels.push(pixel(1, 3), pixel(5, 6), pixel(6, 6), pixel(4, 5, CRACK_HOT));
    return pixels;
}

// Depth cues built from the voxels themselves, nothing smooth: a contact shadow on the microcells at the foot of every raised face
// (two steps, by how tall the face is) and a lit lip on the microcells along the top edge above a drop. Cheap, cached with the painter.
const CONTACT_SHADOW = Object.freeze([null, 'rgba(8,4,10,.15)', 'rgba(8,4,10,.26)']);
const LIP_LIGHT = 'rgba(255,236,208,.12)';
const shadowStep = rise => rise >= 5 ? 2 : rise >= 2 ? 1 : 0;
const heightOrSelf = (frame, column, row, microX, microY, own) =>
    row < 0 || row >= frame.rows ? own : microHeight(frame, column, row, microX, microY);

/** The height of the microcolumn north (away from the camera) and south (toward it) of one microcolumn. */
function neighbourHeights(frame, column, row, microX, microY, own) {
    const north = microY > 0 ? microHeight(frame, column, row, microX, microY - 1)
        : heightOrSelf(frame, column, row - 1, microX, MICRO_PER_COLUMN - 1, own);
    const south = microY < MICRO_PER_COLUMN - 1 ? microHeight(frame, column, row, microX, microY + 1)
        : heightOrSelf(frame, column, row + 1, microX, 0, own);
    return { north, south };
}

function microDepthCues(ctx, frame, column, row, microX, microY, height, x, y) {
    if (!layerLabEnabled('bakedShadows')) return 0;
    const { north, south } = neighbourHeights(frame, column, row, microX, microY, height);
    let painted = 0;
    const step = shadowStep(north - height);
    if (step) { ctx.fillStyle = CONTACT_SHADOW[step]; ctx.fillRect(x, y, MICRO_UNITS, MICRO_UNITS); painted++; }
    if (height - south >= 3) { ctx.fillStyle = LIP_LIGHT; ctx.fillRect(x, y, MICRO_UNITS, MICRO_UNITS); painted++; }
    return painted;
}

/** Whole columns get the same cues as 4 px bands across their top face, grouped into runs of equal steps. */
function wholeDepthCues(ctx, frame, column, row, height, top) {
    if (!layerLabEnabled('bakedShadows')) return 0;
    let painted = 0;
    for (let microX = 0; microX < MICRO_PER_COLUMN;) {
        const { north } = neighbourHeights(frame, column, row, microX, 0, height);
        const step = shadowStep(north - height);
        let end = microX + 1;
        while (end < MICRO_PER_COLUMN && shadowStep(neighbourHeights(frame, column, row, end, 0, height).north - height) === step) end++;
        if (step) {
            ctx.fillStyle = CONTACT_SHADOW[step];
            ctx.fillRect(top.x + microX * MICRO_UNITS, top.y, (end - microX) * MICRO_UNITS, MICRO_UNITS);
            painted++;
            if (step === 2) {
                ctx.fillStyle = CONTACT_SHADOW[1];
                ctx.fillRect(top.x + microX * MICRO_UNITS, top.y + MICRO_UNITS, (end - microX) * MICRO_UNITS, MICRO_UNITS);
                painted++;
            }
        }
        microX = end;
    }
    for (let microX = 0; microX < MICRO_PER_COLUMN;) {
        const lip = height - neighbourHeights(frame, column, row, microX, MICRO_PER_COLUMN - 1, height).south >= 3;
        let end = microX + 1;
        while (end < MICRO_PER_COLUMN && (height - neighbourHeights(frame, column, row, end, MICRO_PER_COLUMN - 1, height).south >= 3) === lip) end++;
        if (lip) {
            ctx.fillStyle = LIP_LIGHT;
            ctx.fillRect(top.x + microX * MICRO_UNITS, top.y + top.height - MICRO_UNITS, (end - microX) * MICRO_UNITS, MICRO_UNITS);
            painted++;
        }
        microX = end;
    }
    return painted;
}

const atlasCache = new Map();

/** The band's generated textures as canvases (each wraps over MEGA x MEGA blocks), or null where there is no DOM (tests, workers) so callers fall back to flat colour. */
export function terrainAtlas(band) {
    if (typeof document === 'undefined' || typeof ImageData === 'undefined') return null;
    const index = bandIndex(band);
    if (!atlasCache.has(index)) {
        const atlas = {};
        for (const [kind, tiles] of Object.entries(generateTileSet(index)))
            atlas[kind] = tiles.map(tile => {
                const canvas = document.createElement('canvas');
                canvas.width = tile.width; canvas.height = tile.height;
                canvas.getContext('2d').putImageData(new ImageData(tile.data, tile.width, tile.height), 0, 0);
                // Every texture carries its normal-map twin; walls lean toward the viewer.
                const twin = document.createElement('canvas');
                twin.width = tile.width; twin.height = tile.height;
                const wall = kind.endsWith('Side');
                twin.getContext('2d').putImageData(new ImageData(normalFromTile(tile, wall ? 2 : 2.4, wall ? .85 : 0), tile.width, tile.height), 0, 0);
                canvas.normalTwin = twin;
                return canvas;
            });
        atlasCache.set(index, atlas);
    }
    return atlasCache.get(index);
}

/** Art-pixel offset of a block inside a wrapping texture: textures are indexed by global block position, so joints and strata continue across blocks. */
const texX = column => (column % MEGA) * TILE;
const texY = row => (row % MEGA) * TILE;
const TEXTURE_UNITS = MEGA * FACE_PIXELS;

/**
 * The base ground of a whole column. Patches inside it (mud, dry grass, bare rock, flagstone) and the road are laid per art pixel by
 * `kindMap`. A stone column above ground level carries a turf cap in the living bands (a grassy hill with rock faces) unless it is `capped = false`
 * (a chipped or dug microcolumn, which shows the bare rock).
 */
function topTileKind(band, material, height, frame, column, row, capped = true) {
    void frame; void column; void row;
    if (height <= BEDROCK_MICROCELLS) return null;
    if (material === TERRAIN_MATERIAL.Lava) return 'lavaTop';
    if (material === TERRAIN_MATERIAL.Wood) return band <= 1 ? 'grassTop' : 'dirtTop';
    if (material === TERRAIN_MATERIAL.Stone) return capped && band <= 1 && height > 0 ? 'grassTop' : 'slabTop';
    if (height < 0) return 'dirtTop';
    if (material === TERRAIN_MATERIAL.Soil && band <= 1) return 'grassTop';
    // Gravel patches in the wet land are drifts of dry grass: a dark flat patch read as a smudge.
    if (material === TERRAIN_MATERIAL.Ash && band === 0) return 'grassDryTop';
    return 'ashTop';
}
const TOP_KINDS = Object.freeze(['grassTop', 'grassDryTop', 'mudTop', 'dirtTop', 'ashTop', 'stoneTop', 'rubbleTop', 'lavaTop', 'slabTop', 'pathTop']);
const KIND_INDEX = Object.freeze(Object.fromEntries(TOP_KINDS.map((kind, index) => [kind, index])));

let scratchCanvas = null, maskCanvas = null, maskImage = null, scratchNormalCanvas = null;

function scratchContexts() {
    if (typeof document === 'undefined') return null;
    if (!scratchCanvas) {
        scratchCanvas = document.createElement('canvas');
        maskCanvas = document.createElement('canvas');
        scratchNormalCanvas = document.createElement('canvas');
        scratchCanvas.width = scratchCanvas.height = maskCanvas.width = maskCanvas.height = scratchNormalCanvas.width = scratchNormalCanvas.height = TILE;
    }
    return { g: scratchCanvas.getContext('2d'), m: maskCanvas.getContext('2d') };
}

// Tileable value-noise tables (NOISE_SIZE squared, lattice every 16 and 8 world units) sampled by art pixel, so splatting is a couple of
// lookups per pixel.
const NOISE_SIZE = 128 * ART, NOISE_MASK = NOISE_SIZE - 1;
function buildNoiseTable(spacing, seed) {
    const cells = NOISE_SIZE / spacing, table = new Float32Array(NOISE_SIZE * NOISE_SIZE);
    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) {
        let h = (Math.imul(i + 11, 0x9E3779B1) ^ Math.imul(seed, 0xC2B2AE35)) >>> 0;
        h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
        lattice[i] = ((h ^ (h >>> 12)) >>> 0) / 4294967296;
    }
    const at = (x, y) => lattice[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];
    for (let y = 0; y < NOISE_SIZE; y++) for (let x = 0; x < NOISE_SIZE; x++) {
        const fx = x / spacing, fy = y / spacing, x0 = Math.floor(fx), y0 = Math.floor(fy);
        let tx = fx - x0, ty = fy - y0;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        table[y * NOISE_SIZE + x] = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    }
    return table;
}
const NOISE_BROAD = buildNoiseTable(16 * ART, 301);
const NOISE_FINE = buildNoiseTable(8 * ART, 317);

// Patches of mud, dry grass and bare rock are metres across, not the half-metre blobs of the shoreline noise: smooth value noise with a
// 4 m and a 2 m lattice over a 16 m wrapping table (8 bits per sample), so they read as puddles and drifts, never as a scatter of smudges.
const PATCH_SIZE = 1024 * 1, PATCH_MASK = PATCH_SIZE - 1;
function buildPatchTable(spacing, seed) {
    const cells = PATCH_SIZE / spacing, lattice = new Float32Array(cells * cells), table = new Uint8Array(PATCH_SIZE * PATCH_SIZE);
    for (let i = 0; i < lattice.length; i++) {
        let h = (Math.imul(i + 29, 0x9E3779B1) ^ Math.imul(seed, 0xC2B2AE35)) >>> 0;
        h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
        lattice[i] = ((h ^ (h >>> 12)) >>> 0) / 4294967296;
    }
    const at = (x, y) => lattice[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];
    for (let y = 0; y < PATCH_SIZE; y++) for (let x = 0; x < PATCH_SIZE; x++) {
        const fx = x / spacing, fy = y / spacing, x0 = Math.floor(fx), y0 = Math.floor(fy);
        let tx = fx - x0, ty = fy - y0;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        table[y * PATCH_SIZE + x] = Math.round(((at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty) * 255);
    }
    return table;
}
// Built on first use: a few milliseconds on a desktop, and only the painter needs them.
let patchTables = null;
const getPatchTables = () => patchTables ??= [buildPatchTable(256, 401), buildPatchTable(128, 419)];
const patch = (table, x, y, shift) => table[((y + shift * 3) & PATCH_MASK) * PATCH_SIZE + ((x + shift) & PATCH_MASK)] / 255;

// Allocation-free smooth value noise over world pixels, lattice spacing `spacing`, in 0..1.
function pixelNoise(x, y, spacing, seed) {
    const fx = x / spacing, fy = y / spacing, x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const at = (ix, iy) => {
        let h = (Math.imul(ix + 11, 0x9E3779B1) ^ Math.imul(iy + 3, 0x85EBCA6B) ^ Math.imul(seed, 0xC2B2AE35)) >>> 0;
        h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
        return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
    };
    return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
}

// The road is a polyline from C# (1/16 cell units). Each column keeps the segments that can reach it, in art pixels.
function buildRoadIndex(frame) {
    const map = new Map(), road = frame.road, scale = TILE / 16;
    for (let i = 0; i + 3 < road.length; i += 2) {
        const segment = [road[i] * scale, road[i + 1] * scale, road[i + 2] * scale, road[i + 3] * scale];
        const [c0, c1] = [Math.floor(Math.min(road[i], road[i + 2]) / 16) - 2, Math.floor(Math.max(road[i], road[i + 2]) / 16) + 2];
        const [r0, r1] = [Math.floor(Math.min(road[i + 1], road[i + 3]) / 16) - 2, Math.floor(Math.max(road[i + 1], road[i + 3]) / 16) + 2];
        for (let r = Math.max(0, r0); r <= Math.min(frame.rows - 1, r1); r++)
            for (let c = Math.max(0, c0); c <= Math.min(frame.columns - 1, c1); c++) {
                const key = r * frame.columns + c;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(segment);
            }
    }
    return map;
}

function roadSegmentsFor(frame, column, row) {
    if (!frame.road?.length) return null;
    return (frame.roadIndex ??= buildRoadIndex(frame)).get(row * frame.columns + column) ?? null;
}

function segmentDistance(px, py, [x0, y0, x1, y1]) {
    const dx = x1 - x0, dy = y1 - y0, length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / length));
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

/** Half the width of the worn road in art pixels (about 1.2 m); the edge wanders with noise. */
const ROAD_HALF_WIDTH = 76;

/**
 * Splatting: which ground each art pixel of a whole column's top face shows, decided from *global* pixel position so patches are continuous
 * across blocks and never follow the 1 m grid. In layers:
 * 1. the base ground: the kinds of the 3 x 3 columns around it blended bilinearly from their centres and perturbed by noise, so grass, rock
 *    and lava meet in lobed shorelines (a neighbour across a cliff or a dug block counts as this column's own ground);
 * 2. patches inside a ground, from two octaves of smooth noise: mud and dry grass in grass, mud in ash, bare calm rock in a turf-capped hill,
 *    flagstone and rubble in rock, their edges dithered by a pixel hash;
 * 3. the road: a worn dirt strip along the C# route with a ragged, noisy edge.
 * Returns null when nothing varies (lava, dug soil), otherwise one kind index per art pixel.
 */
function kindMap(frame, band, column, row, ownKind, height) {
    const baseSurface = frame.baseSurface ?? frame.surface;
    const baseMaterial = frame.baseMaterial ?? frame.material;
    const cache = frame.kindMaps ??= new Map();
    const key = row * frame.columns + column;
    if (cache.has(key)) return cache.get(key);
    const own = KIND_INDEX[ownKind], around = new Int8Array(9);
    let uniform = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const c = column + dx, r = row + dy, slot = (dy + 1) * 3 + dx + 1;
        around[slot] = own;
        if (c < 0 || r < 0 || c >= frame.columns || r >= frame.rows) continue;
        const index = r * frame.columns + c;
        // Even a subdivided neighbour retains its original ground identity; only its excavated microcells look different.
        const kind = topTileKind(band, baseMaterial[index], baseSurface[index], frame, c, r);
        if (kind && (Math.abs(baseSurface[index] - height) <= 3 || (ownKind === 'lavaTop' && kind !== 'lavaTop')))
            around[slot] = KIND_INDEX[kind];
        if (around[slot] !== own) uniform = false;
    }
    const rockCap = ownKind === 'grassTop' && baseMaterial[key] === TERRAIN_MATERIAL.Stone;
    const patchy = ownKind === 'grassTop' || ownKind === 'ashTop' || ownKind === 'slabTop';
    const segments = ownKind === 'lavaTop' || ownKind === 'dirtTop' ? null : roadSegmentsFor(frame, column, row);
    if (uniform && !patchy && !segments) { cache.set(key, null); return null; }
    const map = new Uint8Array(TILE * TILE), seed = (frame.visualSeed | 0) & 0xffff;
    const [PATCH_BIG, PATCH_MID] = patchy ? getPatchTables() : [null, null];
    const weights = new Float32Array(TOP_KINDS.length);
    const sample = (table, wx, wy, shift) => table[((wy + shift * 3) & NOISE_MASK) * NOISE_SIZE + ((wx + shift) & NOISE_MASK)];
    for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
        const wx = column * TILE + px, wy = row * TILE + py;
        let best = own;
        if (!uniform) {
            const u = (px + .5) / TILE - .5, v = (py + .5) / TILE - .5, au = Math.abs(u), av = Math.abs(v);
            const sx = u < 0 ? -1 : 1, sy = v < 0 ? -1 : 1;
            weights.fill(0);
            weights[around[4]] += (1 - au) * (1 - av);
            weights[around[4 + sx]] += au * (1 - av);
            weights[around[4 + sy * 3]] += (1 - au) * av;
            weights[around[4 + sy * 3 + sx]] += au * av;
            let bestScore = -1;
            for (let kind = 0; kind < weights.length; kind++) {
                if (weights[kind] <= 0) continue;
                const shift = ((seed + kind * 37) & 127) * ART;
                const wobble = (sample(NOISE_BROAD, wx, wy, shift) - .5) * .8 + (sample(NOISE_FINE, wx, wy, shift * 5 / 3) - .5) * .5;
                const score = weights[kind] + wobble * .55;
                if (score > bestScore) { bestScore = score; best = kind; }
            }
        }
        if (patchy && (best === KIND_INDEX.grassTop || best === KIND_INDEX.ashTop || best === KIND_INDEX.slabTop)) {
            const shift = (seed & 127) * ART;
            const hash = (Math.imul(wx, 73856093) ^ Math.imul(wy, 19349663)) >>> 0;
            const jitter = ((hash % 1000) / 1000 - .5) * .05;
            const field = patch(PATCH_BIG, wx, wy, shift + 41) * .65 + patch(PATCH_MID, wx, wy, shift + 83) * .35 + jitter;
            if (best === KIND_INDEX.grassTop) {
                if (rockCap && patch(PATCH_BIG, wx, wy, shift + 97) * .7 + patch(PATCH_MID, wx, wy, shift + 131) * .3 + jitter > .7) best = KIND_INDEX.slabTop;
                else if (field < .34) best = KIND_INDEX.grassDryTop;
            } else if (best === KIND_INDEX.ashTop) {
                if (field < .2) best = KIND_INDEX.mudTop;
            } else if (field < .08) best = KIND_INDEX.rubbleTop;
            else if (field < .2) best = KIND_INDEX.stoneTop;
        }
        if (segments) {
            let nearest = Infinity;
            for (const segment of segments) nearest = Math.min(nearest, segmentDistance(wx, wy, segment));
            const edge = ROAD_HALF_WIDTH + (sample(NOISE_BROAD, wx, wy, 59 * ART) - .5) * 52 + (sample(NOISE_FINE, wx, wy, 23 * ART) - .5) * 16;
            if (nearest < edge && best !== KIND_INDEX.lavaTop) best = KIND_INDEX.pathTop;
        }
        map[py * TILE + px] = best;
    }
    cache.set(key, map);
    return map;
}

/** The immutable site texture for one block, independent of subsequent terrain excavation. */
export function terrainBaseKindMap(frame, band, column, row) {
    const index = row * frame.columns + column;
    const baseSurface = frame.baseSurface ?? frame.surface;
    const baseMaterial = frame.baseMaterial ?? frame.material;
    const kind = topTileKind(band, baseMaterial[index], baseSurface[index], frame, column, row);
    return kind ? kindMap(frame, band, column, row, kind, baseSurface[index]) : null;
}

/** Paints a column's top face from its kind map: the most common ground whole, every other ground through its own pixel mask. */
function drawSplat(ctx, atlas, map, column, row, x, y) {
    const contexts = scratchContexts();
    if (!contexts) return 0;
    const { g, m } = contexts;
    const [ox, oy] = [texX(column), texY(row)];
    const counts = new Int16Array(TOP_KINDS.length);
    for (const kind of map) counts[kind]++;
    let main = 0;
    for (let kind = 1; kind < counts.length; kind++) if (counts[kind] > counts[main]) main = kind;
    ctx.drawImage(atlas[TOP_KINDS[main]][0], ox, oy, TILE, TILE, x, y, FACE_PIXELS, FACE_PIXELS);
    let painted = 1;
    for (let kind = 0; kind < counts.length; kind++) {
        if (kind === main || counts[kind] < 12) continue; // a handful of stray pixels is not worth a mask pass
        const mask = maskImage ??= m.createImageData(TILE, TILE);
        for (let i = 0; i < map.length; i++) mask.data[i * 4 + 3] = map[i] === kind ? 255 : 0;
        m.putImageData(mask, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, TILE, TILE);
        g.drawImage(atlas[TOP_KINDS[kind]][0], ox, oy, TILE, TILE, 0, 0, TILE, TILE);
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(maskCanvas, 0, 0);
        g.globalCompositeOperation = 'source-over';
        ctx.drawImage(scratchCanvas, x, y, FACE_PIXELS, FACE_PIXELS);
        if (ctx.normalContext) {
            // The same mask cuts the normal twin, so relief changes exactly where the ground does.
            const n = scratchNormalCanvas.getContext('2d');
            n.globalCompositeOperation = 'source-over';
            n.clearRect(0, 0, TILE, TILE);
            n.drawImage(atlas[TOP_KINDS[kind]][0].normalTwin, ox, oy, TILE, TILE, 0, 0, TILE, TILE);
            n.globalCompositeOperation = 'destination-in';
            n.drawImage(maskCanvas, 0, 0);
            n.globalCompositeOperation = 'source-over';
            ctx.normalContext.drawImage(scratchNormalCanvas, x, y, FACE_PIXELS, FACE_PIXELS);
        }
        painted++;
    }
    return painted;
}

/**
 * Lava for the emissive ground map: exactly the pixels the splat paints as lava, so the glow follows the same irregular shoreline as the
 * albedo and never fills the square of a column. Coordinates are world units; `view` only culls.
 */
export function paintLavaEmissive(ctx, frame, band, view) {
    // The splat cannot contain lava without an authored lava block; skip texture atlas/mask work in ordinary forests.
    if (!frame?.material?.includes(TERRAIN_MATERIAL.Lava) && !frame?.baseMaterial?.includes(TERRAIN_MATERIAL.Lava)) return 0;
    const atlas = frame?.material ? terrainAtlas(band) : null, contexts = atlas ? scratchContexts() : null;
    if (!atlas || !contexts) return 0;
    const { g, m } = contexts, lava = KIND_INDEX.lavaTop;
    let drawn = 0;
    for (let row = Math.max(0, Math.floor(view.y / FACE_PIXELS) - 2); row < frame.rows && row * FACE_PIXELS - 4 * FACE_PIXELS < view.y + view.height; row++)
        for (let column = Math.max(0, Math.floor(view.x / FACE_PIXELS) - 1); column < frame.columns && column * FACE_PIXELS < view.x + view.width; column++) {
            const index = row * frame.columns + column;
            if (frame.fine?.has(index)) continue;
            const height = frame.surface[index], x = column * FACE_PIXELS, y = row * FACE_PIXELS - height * MICROCELL_UNITS;
            const own = topTileKind(band, frame.material[index], height, frame, column, row);
            if (!own) continue;
            const map = kindMap(frame, band, column, row, own, height);
            const tile = atlas.lavaTop[0], [ox, oy] = [texX(column), texY(row)];
            if (!map) { if (own === 'lavaTop') { ctx.drawImage(tile, ox, oy, TILE, TILE, x, y, FACE_PIXELS, FACE_PIXELS); drawn++; } continue; }
            let any = false;
            const mask = maskImage ??= m.createImageData(TILE, TILE);
            for (let i = 0; i < map.length; i++) { const isLava = map[i] === lava; mask.data[i * 4 + 3] = isLava ? 255 : 0; any ||= isLava; }
            if (!any) continue;
            m.putImageData(mask, 0, 0);
            g.globalCompositeOperation = 'source-over';
            g.clearRect(0, 0, TILE, TILE);
            g.drawImage(tile, ox, oy, TILE, TILE, 0, 0, TILE, TILE);
            g.globalCompositeOperation = 'destination-in';
            g.drawImage(maskCanvas, 0, 0);
            g.globalCompositeOperation = 'source-over';
            ctx.drawImage(scratchCanvas, x, y, FACE_PIXELS, FACE_PIXELS);
            drawn++;
        }
    return drawn;
}

/** One row-by-row ellipse of half-unit steps, so the patch is built from the same art pixels as everything else. */
function steppedEllipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let dy = -ry; dy < ry; dy += .5) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((dy + .25) / ry) ** 2)) * 2) / 2;
        if (half > 0) ctx.fillRect(cx - half, cy + dy, half * 2, .5);
    }
}

/**
 * The ground around a trunk: a dark trodden patch, a few roots and a scatter of leaf litter, so the tree grows out of the earth instead of
 * standing on it. Cosmetic and baked into the terrain; the upright sprite carries the trunk and adds its own contact shadow.
 */
function drawTrunkFoot(ctx, column, row, top) {
    if (!layerLabEnabled('decals')) return 0;
    const cx = top.x + FACE_PIXELS / 2, cy = top.y + 9;
    steppedEllipse(ctx, cx, cy, 14, 6, 'rgba(10,6,8,.14)');
    steppedEllipse(ctx, cx, cy, 10, 4.5, 'rgba(10,6,8,.3)');
    let h = (Math.imul(column + 5, 0x9E3779B1) ^ Math.imul(row + 9, 0x85EBCA6B)) >>> 0;
    const next = () => { h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0; return (h >>> 8) / 16777216; };
    ctx.fillStyle = 'rgba(58,40,28,.85)';
    for (let root = 0; root < 5; root++) {
        const angle = next() * Math.PI * 2, length = 5 + next() * 4;
        for (let step = 2; step < length; step += .5) ctx.fillRect(Math.round((cx + Math.cos(angle) * step) * 2) / 2, Math.round((cy + Math.sin(angle) * step * .45) * 2) / 2, .5, .5);
    }
    for (let leaf = 0; leaf < 9; leaf++) {
        ctx.fillStyle = next() < .5 ? 'rgba(92,70,40,.8)' : 'rgba(70,52,34,.8)';
        ctx.fillRect(Math.round((cx + (next() - .5) * 22) * 2) / 2, Math.round((cy + (next() - .5) * 8) * 2) / 2, .5, .5);
    }
    return 1;
}

// Whole-metre height steps tint the tile so raised ground reads lighter and pits darker without redrawing art.
const heightTint = height => {
    const metres = Math.max(-2, Math.min(3, Math.round(height / 8)));
    return metres > 0 ? `rgba(255,240,220,${.05 * metres})` : metres < 0 ? `rgba(0,0,0,${.1 * -metres})` : null;
};
const WALL_SHADE = Object.freeze({ own: 'rgba(6,4,8,.2)', dirtUpper: 'rgba(6,4,8,.24)', dirtLower: 'rgba(6,4,8,.32)', stone: 'rgba(6,4,8,.3)' });

/**
 * Draws one wall (the front faces of a column or microcolumn) from the band's wrapping textures: a turf cap hangs a grass overhang over soil
 * and, in the living bands, over rock too (a hill is grass above and stone below); then soil, then dressed stone, the texture running
 * continuously down the wall. `sx`/`width` pick the slice of the block in world units; `column` places it inside the wrapping texture.
 */
function drawWall(ctx, atlas, band, material, segments, x, width, sx, baseY, column) {
    if (!layerLabEnabled('faces')) return 0;
    let painted = 0;
    const wallTop = segments.length ? segments[0].from : 0;
    const source = texX(column) + sx * ART;
    // A step of a couple of microcells is a slope in the ground, not a wall: it carries the ground's own texture without a dark face, so
    // rolling hills have no straight lines across them.
    if (segments.length === 1 && segments[0].kind === 'own' && wallTop - segments[0].to <= 2 && (material === TERRAIN_MATERIAL.Soil || material === TERRAIN_MATERIAL.Ash)) {
        const kind = topTileKind(band, material, 1, null, 0, 0), y = baseY - wallTop * MICROCELL_UNITS, height = (wallTop - segments[0].to) * MICROCELL_UNITS;
        const piece = Math.min(height, TEXTURE_UNITS);
        ctx.drawImage(atlas[kind][0], source, TEXTURE_UNITS * ART - piece * ART - 1, width * ART, piece * ART, x, y, width, piece);
        return 1;
    }
    for (const [i, segment] of segments.entries()) {
        const y = baseY - segment.from * MICROCELL_UNITS, height = (segment.from - segment.to) * MICROCELL_UNITS;
        const start = (wallTop - segment.from) * MICROCELL_UNITS;
        if (segment.kind === 'lava') {
            for (let drawn = 0; drawn < height;) {
                const v = start + drawn, piece = Math.min(height - drawn, TEXTURE_UNITS - (v % TEXTURE_UNITS));
                ctx.drawImage(atlas.lavaSide[0], source, (v % TEXTURE_UNITS) * ART, width * ART, piece * ART, x, y + drawn, width, piece);
                drawn += piece;
                painted++;
            }
            continue;
        }
        const stone = segment.kind === 'stone' || material === TERRAIN_MATERIAL.Stone;
        const turf = i === 0 && segment.kind === 'own' && material === TERRAIN_MATERIAL.Soil && band <= 1;
        const rockCrest = stone && i === 0 && material === TERRAIN_MATERIAL.Stone;
        for (let drawn = 0; drawn < height;) {
            const v = start + drawn;
            const crest = v < FACE_PIXELS;
            const name = stone ? (rockCrest && crest ? (band <= 1 ? 'stoneGrassSide' : 'stoneLipSide') : 'stoneSide') : turf && crest ? 'grassSide' : 'dirtSide';
            const piece = Math.min(height - drawn, (rockCrest || turf) && crest ? FACE_PIXELS - v : TEXTURE_UNITS - (v % TEXTURE_UNITS));
            ctx.drawImage(atlas[name][0], source, (v % TEXTURE_UNITS) * ART, width * ART, piece * ART, x, y + drawn, width, piece);
            drawn += piece;
            painted++;
        }
        ctx.fillStyle = WALL_SHADE[segment.kind] ?? WALL_SHADE.own;
        ctx.fillRect(x, y, width, height);
        painted++;
    }
    return painted;
}

/** Paints the stepped moon shadow of a whole column's top face (`levels` from cellShadow) as horizontal runs of 2-unit samples. */
function paintShadow(ctx, levels, x, y) {
    if (!layerLabEnabled('bakedShadows')) return 0;
    if (!levels) return 0;
    let painted = 0;
    for (let sy = 0; sy < SHADOW_SAMPLES; sy++) {
        let sx = 0;
        while (sx < SHADOW_SAMPLES) {
            const level = levels[sy * SHADOW_SAMPLES + sx];
            let end = sx + 1;
            while (end < SHADOW_SAMPLES && levels[sy * SHADOW_SAMPLES + end] === level) end++;
            if (level) { ctx.fillStyle = shadowStyle(level); ctx.fillRect(x + sx * 2, y + sy * 2, (end - sx) * 2, 2); painted++; }
            sx = end;
        }
    }
    return painted;
}

/** Paints a subdivided column as 8 x 8 microcolumns, back to front: a 4 px top square each and 4 px wide strata fronts. */
function paintFineCell(ctx, frame, band, column, row, block, grain = true) {
    // Diagnostic only: compare the same site with authoritative excavation visually hidden.
    // The C# terrain, collisions, impact events and enemy simulation remain untouched.
    if (!layerLabEnabled('excavation')) {
        const base = { ...frame, fine: null, surface: frame.baseSurface ?? frame.surface,
            material: frame.baseMaterial ?? frame.material };
        return paintTerrainCell(ctx, base, band, column, row, grain);
    }
    const { columns, rows } = frame;
    const atlas = grain ? terrainAtlas(band) : null;
    const shade = atlas ? cellShadow(frame, column, row, block.heights) : null;
    // The column's whole-block ground (with its patches and road) is the reference for its undisturbed microcolumns, so chipped ground still matches its neighbours.
    const index = row * columns + column;
    const coarseHeight = (frame.baseSurface ?? frame.surface)[index];
    const baseMaterial = (frame.baseMaterial ?? frame.material)[index];
    const baseKind = atlas ? topTileKind(band, baseMaterial, coarseHeight, frame, column, row) : null;
    const baseMap = baseKind ? terrainBaseKindMap(frame, band, column, row) : null;
    const microArt = TILE / MICRO_PER_COLUMN;
    let painted = 0;
    const preserveTop = Boolean(atlas && baseKind && !isUprightProp(block.topsoil));
    if (preserveTop) {
        // The original pixel-level splat is still correct for untouched microcells. Clip out damaged
        // microcells FIRST; drawing the original full face without this clip puts a false lid over craters.
        ctx.save();
        ctx.beginPath();
        let hasIntact = false;
        for (let my = 0; my < MICRO_PER_COLUMN; my++) {
            let run = -1;
            for (let mx = 0; mx <= MICRO_PER_COLUMN; mx++) {
                const height = mx < MICRO_PER_COLUMN ? block.heights[my * MICRO_PER_COLUMN + mx] : null;
                const intact = height === coarseHeight && microMaterial(block, height) === baseMaterial;
                if (intact && run < 0) run = mx;
                if (!intact && run >= 0) {
                    ctx.rect(column * FACE_PIXELS + run * MICRO_UNITS,
                        row * FACE_PIXELS + my * MICRO_UNITS - coarseHeight * MICROCELL_UNITS,
                        (mx - run) * MICRO_UNITS, MICRO_UNITS);
                    run = -1;
                    hasIntact = true;
                }
            }
        }
        if (hasIntact) {
            ctx.clip();
            const originalTop = blockTopRect(column, row, coarseHeight);
            if (baseMap) painted += drawSplat(ctx, atlas, baseMap, column, row, originalTop.x, originalTop.y);
            else {
                ctx.drawImage(atlas[baseKind][0], texX(column), texY(row), TILE, TILE,
                    originalTop.x, originalTop.y, originalTop.width, originalTop.height);
                painted++;
            }
            const tint = heightTint(coarseHeight);
            if (tint) { ctx.fillStyle = tint; ctx.fillRect(originalTop.x, originalTop.y, originalTop.width, originalTop.height); painted++; }
            if (baseKind !== 'lavaTop') {
                if (layerLabEnabled('decals')) painted += drawGroundDecals(ctx, frame, band, column, row, coarseHeight, baseMaterial, originalTop);
                painted += paintShadow(ctx, cellShadow(frame, column, row, coarseHeight), originalTop.x, originalTop.y);
            }
            painted += wholeDepthCues(ctx, frame, column, row, coarseHeight, originalTop);
        }
        ctx.restore();
    }
    for (let microY = 0; microY < MICRO_PER_COLUMN; microY++) {
        for (let microX = 0; microX < MICRO_PER_COLUMN; microX++) {
            const height = block.heights[microY * MICRO_PER_COLUMN + microX];
            const material = microMaterial(block, height);
            const x = column * FACE_PIXELS + microX * MICRO_UNITS;
            const y = row * FACE_PIXELS + microY * MICRO_UNITS;
            // Preserve every original art pixel unless this individual microcolumn lost height or changed material.
            const unchangedTop = preserveTop && height === coarseHeight && material === baseMaterial;
            const tileKind = !atlas ? null : topTileKind(band, material, height, frame, column, row, false);
            if (unchangedTop) {
                // The exact original pixel mask is already on the canvas, including decals and normal maps.
            } else if (tileKind) {
                ctx.drawImage(atlas[tileKind][0], texX(column) + microX * microArt, texY(row) + microY * microArt, microArt, microArt,
                    x, y - height * MICROCELL_UNITS, MICRO_UNITS, MICRO_UNITS);
                const tint = heightTint(height);
                if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y - height * MICROCELL_UNITS, MICRO_UNITS, MICRO_UNITS); painted++; }
            } else {
                ctx.fillStyle = grain ? groundTopColor(band, material, height, column * MICRO_PER_COLUMN + microX, row * MICRO_PER_COLUMN + microY)
                    : scaleHex(heightShade(topFaceColor(band, material, height), height), 1);
                ctx.fillRect(x, y - height * MICROCELL_UNITS, MICRO_UNITS, MICRO_UNITS);
            }
            if (!unchangedTop) painted++;
            if (layerLabEnabled('bakedShadows') && shade && !unchangedTop && material !== TERRAIN_MATERIAL.Lava) {
                for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
                    const level = shade[(microY * 2 + j) * SHADOW_SAMPLES + microX * 2 + i];
                    if (!level) continue;
                    ctx.fillStyle = shadowStyle(level);
                    ctx.fillRect(x + i * 2, y - height * MICROCELL_UNITS + j * 2, 2, 2);
                    painted++;
                }
            }
            // Worn rock shows a crack on about two microcolumns in five (by position), not on every one: a rock floor is not a mesh.
            const worn = ((Math.imul(column * MICRO_PER_COLUMN + microX, 73856093) ^ Math.imul(row * MICRO_PER_COLUMN + microY, 19349663)) >>> 0) % 5 < 2;
            for (const crack of worn ? crackPixels(wearStage(block.wear?.[microY * MICRO_PER_COLUMN + microX])) : []) {
                ctx.fillStyle = crack.color;
                ctx.fillRect(x + crack.x, y - height * MICROCELL_UNITS + crack.y, crack.w, crack.h);
                painted++;
            }
            if (!unchangedTop) painted += microDepthCues(ctx, frame, column, row, microX, microY, height, x, y - height * MICROCELL_UNITS);
            if (!layerLabEnabled('faces')) continue;
            const southY = microY + 1 < MICRO_PER_COLUMN ? microY + 1 : 0;
            const southRow = microY + 1 < MICRO_PER_COLUMN ? row : row + 1;
            const south = southRow < rows ? microHeight(frame, column, southRow, microX, southY) : height;
            const wall = frontSegments(band, block.topsoil, height, south);
            if (atlas) { painted += drawWall(ctx, atlas, band, block.topsoil, wall, x, MICRO_UNITS, microX * MICRO_UNITS, y + MICRO_UNITS, column); continue; }
            for (const segment of wall) {
                ctx.fillStyle = segment.color;
                ctx.fillRect(x, y + MICRO_UNITS - segment.from * MICROCELL_UNITS, MICRO_UNITS, (segment.from - segment.to) * MICROCELL_UNITS);
                painted++;
                if (grain) painted += frontGrain(ctx, segment, block.topsoil, column * MICRO_PER_COLUMN + microX, x, y + MICRO_UNITS - segment.from * MICROCELL_UNITS);
            }
        }
    }
    return painted;
}

/**
 * Paints the whole grid back to front. Output coordinates are world units offset by (0, offsetY) so raised columns that
 * draw above row 0 stay on the surface. Returns the number of rectangles painted.
 */
export function paintTerrain(ctx, frame, band, offsetY = TERRAIN_PAD_UNITS, grain = true) {
    const { columns, rows } = frame;
    let painted = 0;
    ctx.save();
    ctx.translate(0, offsetY);
    for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) painted += paintTerrainCell(ctx, frame, band, column, row, grain);
    ctx.restore();
    return painted;
}

/** Paints the cells of a whole column's top face that differ from its base colour, as horizontal runs. Returns rectangles painted. */
function paintGrain(ctx, band, material, height, column, row, top, baseColor) {
    if (material === TERRAIN_MATERIAL.Lava || height <= BEDROCK_MICROCELLS) return 0;
    let painted = 0;
    for (let microY = 0; microY < MICRO_PER_COLUMN; microY++) {
        let microX = 0;
        while (microX < MICRO_PER_COLUMN) {
            const gx = column * MICRO_PER_COLUMN + microX, gy = row * MICRO_PER_COLUMN + microY;
            const color = groundTopColor(band, material, height, gx, gy);
            let end = microX + 1;
            while (end < MICRO_PER_COLUMN && groundTopColor(band, material, height, column * MICRO_PER_COLUMN + end, gy) === color) end++;
            if (color !== baseColor) {
                ctx.fillStyle = color;
                ctx.fillRect(top.x + microX * MICRO_UNITS, top.y + microY * MICRO_UNITS, (end - microX) * MICRO_UNITS, MICRO_UNITS);
                painted++;
            }
            microX = end;
        }
    }
    return painted;
}

/** Paints one column's top face and, where a lower neighbour is in front, its front face. Returns rectangles painted. */
export function paintTerrainCell(ctx, frame, band, column, row, grain = true) {
    const { columns, rows, surface, material } = frame;
    const index = row * columns + column;
    const fineBlock = frame.fine?.get(index);
    if (fineBlock) return paintFineCell(ctx, frame, band, column, row, fineBlock, grain);
    const height = surface[index];
    const top = blockTopRect(column, row, height);
    const atlas = grain ? terrainAtlas(band) : null;
    const tileKind = atlas ? topTileKind(band, material[index], height, frame, column, row) : null;
    const baseColor = scaleHex(heightShade(topFaceColor(band, material[index], height), height), 1);
    let painted = 1;
    if (tileKind) {
        const splat = kindMap(frame, band, column, row, tileKind, height);
        if (splat) painted += drawSplat(ctx, atlas, splat, column, row, top.x, top.y);
        else ctx.drawImage(atlas[tileKind][0], texX(column), texY(row), TILE, TILE, top.x, top.y, top.width, top.height);
        const tint = heightTint(height);
        if (tint) { ctx.fillStyle = tint; ctx.fillRect(top.x, top.y, top.width, top.height); painted++; }
        if (tileKind !== 'lavaTop') {
            if (layerLabEnabled('decals')) painted += drawGroundDecals(ctx, frame, band, column, row, height, material[index], top);
            painted += paintShadow(ctx, cellShadow(frame, column, row, height), top.x, top.y);
        }
        if (material[index] === TERRAIN_MATERIAL.Wood) painted += drawTrunkFoot(ctx, column, row, top);
    } else {
        ctx.fillStyle = baseColor;
        ctx.fillRect(top.x, top.y, top.width, top.height);
        if (grain) painted += paintGrain(ctx, band, material[index], height, column, row, top, baseColor);
    }
    painted += wholeDepthCues(ctx, frame, column, row, height, top);
    if (!layerLabEnabled('faces')) return painted;
    const frontHeight = row + 1 < rows ? surface[index + columns] : height;
    // A whole column standing behind a subdivided one meets its microcolumns, not their average.
    if (row + 1 < rows && frame.fine?.has(index + columns)) {
        for (let microX = 0; microX < MICRO_PER_COLUMN; microX++) {
            const wall = frontSegments(band, material[index], height, microHeight(frame, column, row + 1, microX, 0));
            if (atlas) { painted += drawWall(ctx, atlas, band, material[index], wall, column * FACE_PIXELS + microX * MICRO_UNITS, MICRO_UNITS, microX * MICRO_UNITS, (row + 1) * FACE_PIXELS, column); continue; }
            for (const segment of wall) {
                ctx.fillStyle = segment.color;
                ctx.fillRect(column * FACE_PIXELS + microX * MICRO_UNITS, (row + 1) * FACE_PIXELS - segment.from * MICROCELL_UNITS,
                    MICRO_UNITS, (segment.from - segment.to) * MICROCELL_UNITS);
                painted++;
            }
        }
        return painted;
    }
    const frontWall = frontSegments(band, material[index], height, frontHeight);
    if (atlas) return painted + drawWall(ctx, atlas, band, material[index], frontWall, column * FACE_PIXELS, FACE_PIXELS, 0, (row + 1) * FACE_PIXELS, column);
    for (const segment of frontWall) {
        ctx.fillStyle = segment.color;
        ctx.fillRect(column * FACE_PIXELS, (row + 1) * FACE_PIXELS - segment.from * MICROCELL_UNITS, FACE_PIXELS,
            (segment.from - segment.to) * MICROCELL_UNITS);
        painted++;
        if (!grain) continue;
        for (let microX = 0; microX < MICRO_PER_COLUMN; microX++)
            painted += frontGrain(ctx, segment, material[index], column * MICRO_PER_COLUMN + microX,
                column * FACE_PIXELS + microX * MICRO_UNITS, (row + 1) * FACE_PIXELS - segment.from * MICROCELL_UNITS);
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
export function repaintTerrainOcclusion(ctx, frame, band, cells, grain = true) {
    for (const { column, row } of cells) paintTerrainCell(ctx, frame, band, column, row, grain);
    return cells.length;
}

export const BLOCK_INSET_COLOR = '#ff00ff';

/** Debug toggle: `?blockInset=1`. Never part of the cache, art or physics. */
export function blockInsetOverlayEnabled(search = globalThis.location?.search ?? '') {
    return new URLSearchParams(search).get('blockInset') === '1';
}

/**
 * One-source-pixel contrasting line inset inside every visible top and front face, to verify the 64x64 art-pixel faces and the
 * 8 px microcell grid. A source pixel is 1/ART of a world unit, so the line is that wide. Returns the faces outlined.
 */
export function drawBlockInsetOverlay(ctx, frame, view) {
    const { columns, rows, surface } = frame;
    const first = Math.max(0, Math.floor(view.x / FACE_PIXELS) - 1);
    const last = Math.min(columns - 1, Math.floor((view.x + view.width) / FACE_PIXELS) + 1);
    const firstRow = Math.max(0, Math.floor(view.y / FACE_PIXELS) - 1);
    const lastRow = Math.min(rows - 1, Math.floor((view.y + view.height + 4 * FACE_PIXELS) / FACE_PIXELS) + 1);
    let outlined = 0;
    ctx.save();
    const line = 1 / ART, half = line / 2;
    ctx.strokeStyle = BLOCK_INSET_COLOR;
    ctx.lineWidth = line;
    for (let row = firstRow; row <= lastRow; row++) {
        for (let column = first; column <= last; column++) {
            const index = row * columns + column;
            if (frame.fine?.has(index)) {
                // A dug block is outlined per microcolumn at its own height, not at the rounded whole-column height.
                for (let my = 0; my < MICRO_PER_COLUMN; my++) for (let mx = 0; mx < MICRO_PER_COLUMN; mx++) {
                    const height = microHeight(frame, column, row, mx, my);
                    ctx.strokeRect(column * FACE_PIXELS + mx * MICRO_UNITS + half, row * FACE_PIXELS + my * MICRO_UNITS - height * MICROCELL_UNITS + half,
                        MICRO_UNITS - line, MICRO_UNITS - line);
                    outlined++;
                }
                continue;
            }
            const top = blockTopRect(column, row, surface[index]);
            ctx.strokeRect(top.x + half, top.y + half, top.width - line, top.height - line);
            outlined++;
            const front = blockFrontRect(column, row, surface[index], row + 1 < rows ? surface[index + columns] : surface[index]);
            if (!front) continue;
            for (let offset = 0; offset < front.height; offset += FACE_PIXELS) {
                ctx.strokeRect(front.x + half, front.y + offset + half, front.width - line, Math.min(FACE_PIXELS, front.height - offset) - line);
                outlined++;
            }
        }
    }
    ctx.restore();
    return outlined;
}

const FLAT_NORMAL = '#8080ff';

/**
 * Paints one scene into two surfaces at once. Tile images (which carry a normal twin) go to both; fills, tints and shadows, which are
 * colour cues, go to the albedo only. Clearing resets the normal surface to a flat normal, never to the invalid vector (0, 0, 0).
 */
class DualContext {
    constructor(albedo, normal) { this.albedo = albedo; this.normalContext = normal; }
    get fillStyle() { return this.albedo.fillStyle; }
    set fillStyle(value) { this.albedo.fillStyle = value; }
    fillRect(...args) { this.albedo.fillRect(...args); }
    drawImage(image, ...rest) {
        this.albedo.drawImage(image, ...rest);
        if (image.normalTwin) this.normalContext.drawImage(image.normalTwin, ...rest);
    }
    clearRect(x, y, width, height) {
        this.albedo.clearRect(x, y, width, height);
        const n = this.normalContext, style = n.fillStyle;
        n.fillStyle = FLAT_NORMAL;
        n.fillRect(x, y, width, height);
        n.fillStyle = style;
    }
    save() { this.albedo.save(); this.normalContext.save(); }
    restore() { this.albedo.restore(); this.normalContext.restore(); }
    translate(x, y) { this.albedo.translate(x, y); this.normalContext.translate(x, y); }
    scale(x, y) { this.albedo.scale(x, y); this.normalContext.scale(x, y); }
    setTransform(...args) { this.albedo.setTransform(...args); this.normalContext.setTransform(...args); }
    beginPath() { this.albedo.beginPath(); this.normalContext.beginPath(); }
    rect(...args) { this.albedo.rect(...args); this.normalContext.rect(...args); }
    clip() { this.albedo.clip(); this.normalContext.clip(); }
}

/**
 * Make independent dirty regions from impacted columns. A single bounding box around distant hits would redraw everything between them.
 * The margins preserve neighbouring material blends and the moon shadows cast east/south of raised terrain.
 */
export function terrainDirtyRegions(columns, rows, changed) {
    const regions = [];
    for (const index of new Set(changed)) {
        if (!Number.isInteger(index) || index < 0 || index >= columns * rows) continue;
        const c = index % columns, r = Math.floor(index / columns);
        let region = { c0: Math.max(0, c - 1), c1: Math.min(columns - 1, c + 4),
            r0: Math.max(0, r - 1), r1: Math.min(rows - 1, r + 4) };
        // Merge genuinely adjoining dirty cells only. Joining clips through their large height-overdraw margins
        // can transitively repaint nearly an entire arena when an ambush creates several separated craters.
        for (let i = 0; i < regions.length;) {
            const other = regions[i];
            if (region.c0 > other.c1 || other.c0 > region.c1 || region.r0 > other.r1 || other.r0 > region.r1) {
                i++;
                continue;
            }
            region = { c0: Math.min(region.c0, other.c0), c1: Math.max(region.c1, other.c1),
                r0: Math.min(region.r0, other.r0), r1: Math.max(region.r1, other.r1) };
            regions.splice(i, 1);
            i = 0;
        }
        regions.push(region);
    }
    return regions;
}

/** Repaint only the dirty clips, in back-to-front painter order; outside pixels remain exactly as they were. */
export function paintTerrainRegion(ctx, frame, band, regions, offsetY = TERRAIN_PAD_UNITS) {
    const { columns, rows } = frame;
    let painted = 0;
    for (const { c0, c1, r0, r1 } of regions) {
        // The clipped area must be an exact slice of a fresh full repaint, not a blend
        // of old cache pixels and whichever nearby cells happened to be dirty.
        // Scan source rows in canonical back-to-front order. Terrain can overdraw
        // several rows above its origin and pit walls can draw below it; bounding
        // source rows at a fixed +/- margin leaves rectangular stale patches.
        const clipX = c0 * FACE_PIXELS, clipW = (c1 - c0 + 1) * FACE_PIXELS;
        const clipY = offsetY + (r0 - 4) * FACE_PIXELS, clipH = (r1 - r0 + 9) * FACE_PIXELS;
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();
        ctx.clearRect(clipX, clipY, clipW, clipH);
        ctx.translate(0, offsetY);
        for (let row = 0; row < rows; row++)
            for (let column = c0; column <= c1; column++)
                painted += paintTerrainCell(ctx, frame, band, column, row);
        ctx.restore();
    }
    return painted;
}

/**
 * Caches the painted heightfield in one offscreen surface and rebuilds it only when the C# terrain revision (or the
 * influence band) changes. Per frame the camera window is copied out, so excavation costs one repaint per impact.
 */
export class TerrainCanvasCache {
    constructor(createCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height }), withNormals = false) {
        this.createCanvas = createCanvas;
        this.withNormals = withNormals;
        this.allowRegional = true; // Layer Lab can disable dirty-rectangle repaints without changing gameplay.
        this.normalCanvas = null;
        this.canvas = null;
        this.revision = null;
        this.visualSeed = null;
        this.band = null;
        this.repaints = 0;
        this.fullRepaints = 0;
        this.regionalRepaints = 0;
        this.artKitRepaints = 0;
        this.unchangedRevisionSkips = 0;
        this.lastPaintReason = null;
        this.lastDirtyBlocks = 0;
        this.totalRepaintMs = 0;
        this.maxRepaintMs = 0;
    }

    /** Stable only while the painted terrain and its exact camera crop stay the same; used by the GPU texture cache. */
    viewportRevision(camera, width, height, scale) {
        return `${this.repaints}:${camera.x}:${camera.y}:${width}:${height}:${scale}`;
    }

    update(frame, band) {
        if (!frame) return false;
        // The ground cover comes from the forest kit, which downloads after the first frame: one more full repaint once it is there.
        const kitReady = Boolean(forestKit());
        const visualSeed = frame.visualSeed ?? 0;
        if (this.canvas && this.visualSeed === visualSeed && this.revision === frame.revision && this.band === band && this.kitReady === kitReady) return false;
        // The authoritative C# revision may advance without changing a single terrain pixel
        // (e.g. a repeated impact snapshot). Do not clear a full-screen cache or move road/grass
        // pixels in response to a nonvisual update. A late art-kit load and new site still repaint.
        if (this.canvas && this.revision !== null && this.visualSeed === visualSeed && this.band === band &&
            this.kitReady === kitReady && frame.visualDeltaComplete && frame.changed?.length === 0 &&
            frame.revision >= this.revision) {
            this.revision = frame.revision;
            frame.kindMaps = this.kindMaps;
            this.unchangedRevisionSkips++;
            this.lastDirtyBlocks = 0;
            this.lastPaintReason = 'identical-authoritative-terrain';
            return false;
        }
        const started = globalThis.performance?.now() ?? 0;
        const width = frame.columns * FACE_PIXELS * ART;
        const height = (frame.rows * FACE_PIXELS + TERRAIN_PAD_UNITS * 2) * ART;
        const kitSwitched = Boolean(this.canvas) && this.kitReady !== kitReady;
        const full = !this.canvas || this.canvas.width !== width || this.canvas.height !== height ||
            this.band !== band || this.revision === null || this.visualSeed !== visualSeed || kitSwitched;
        if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height)
            this.canvas = this.createCanvas(width, height);
        if (this.withNormals && (!this.normalCanvas || this.normalCanvas.width !== width || this.normalCanvas.height !== height)) this.normalCanvas = this.createCanvas(width, height);
        const baseCtx = this.canvas.getContext('2d');
        // With normals on, one painter drives both surfaces: tiles go to both, colour cues to the albedo only.
        // The painter works in world units; this scale makes every unit ART canvas pixels, so each tile pixel is one canvas pixel.
        baseCtx.setTransform(ART, 0, 0, ART, 0, 0);
        if (this.withNormals) this.normalCanvas.getContext('2d').setTransform(ART, 0, 0, ART, 0, 0);
        const ctx = this.withNormals ? new DualContext(baseCtx, this.normalCanvas.getContext('2d')) : baseCtx;
        const regions = this.allowRegional && !full && frame.visualDeltaComplete !== false && Array.isArray(frame.changed)
            ? terrainDirtyRegions(frame.columns, frame.rows, frame.changed) : [];
        const regional = regions.length > 0;
        // Recompute splat maps from the same authoritative terrain frame as the
        // painter. Reusing masks from a previous revision can paint incompatible
        // dirt/grass patches into an otherwise up-to-date cache after excavation.
        // A kit-only texture load does not change material identity or patch masks.
        const kitOnly = this.canvas && this.revision === frame.revision && this.band === band && this.kitReady !== kitReady;
        this.kindMaps = kitOnly ? this.kindMaps : new Map();
        frame.kindMaps = this.kindMaps;
        if (regional) paintTerrainRegion(ctx, frame, band, regions, TERRAIN_PAD_UNITS);
        else {
            ctx.clearRect(0, 0, width / ART, height / ART);
            paintTerrain(ctx, frame, band, TERRAIN_PAD_UNITS);
        }
        this.revision = frame.revision;
        this.visualSeed = visualSeed;
        this.band = band;
        this.kitReady = kitReady;
        this.repaints++;
        if (regional) this.regionalRepaints++;
        else this.fullRepaints++;
        if (kitSwitched) this.artKitRepaints++;
        this.lastDirtyBlocks = frame.changed?.length ?? 0;
        this.lastPaintReason = kitSwitched ? 'forest-kit-loaded' : regional ? 'voxel-changes' : 'full-terrain-refresh';
        const elapsed = (globalThis.performance?.now() ?? 0) - started;
        this.totalRepaintMs += elapsed;
        this.maxRepaintMs = Math.max(this.maxRepaintMs, elapsed);
        return true;
    }

    /** Turns normals on after construction (the GPU path can arrive after the first frame) and forces one repaint. */
    enableNormals() {
        if (this.withNormals) return;
        this.withNormals = true;
        this.revision = null;
    }

    /** Draws the visible window of the normal map into a context already translated by -camera. */
    drawNormals(ctx, view) {
        if (!this.normalCanvas) return false;
        return this.blit(this.normalCanvas, ctx, view);
    }

    /** Draws the cached terrain for the visible world window into a context already translated by -camera (world units). */
    draw(ctx, view) {
        if (!this.canvas) return false;
        return this.blit(this.canvas, ctx, view);
    }

    blit(source, ctx, view) {
        const worldWidth = source.width / ART, worldHeight = source.height / ART - TERRAIN_PAD_UNITS * 2;
        const x = Math.max(0, Math.floor(view.x));
        const y = Math.max(-TERRAIN_PAD_UNITS, Math.floor(view.y));
        const width = Math.min(worldWidth, Math.ceil(view.x + view.width)) - x;
        const height = Math.min(worldHeight + TERRAIN_PAD_UNITS, Math.ceil(view.y + view.height)) - y;
        if (width <= 0 || height <= 0) return false;
        // The cache already holds screen-space output (raised columns lifted, pits sunk), offset by the pad. Source pixels are art pixels.
        ctx.drawImage(source, x * ART, (y + TERRAIN_PAD_UNITS) * ART, width * ART, height * ART, x, y, width, height);
        return true;
    }
}

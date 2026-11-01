// AR4-B candidate: a presentation-only comparison using original WF32 32x32 atlas frames.
// This is NOT a replacement for the P1i world-continuous source, an approved road/stone kit,
// or a second geography/lighting engine. All material decisions sample C# AR3 weights.
import { WORLD_SITE_MATERIALS, normalizeWorldSiteMaterialWeights,
    worldSiteSourceBindings } from './world-site-material-binding.js';

export const PIXEL32_ATLAS = Object.freeze({ width: 232, height: 133, tile: 32, cluster: 4,
    revision: 'wf-original-32.v2.provisional-comparison' });

// Exact frame positions from the source-art PR #429 manifest (1px padding in its atlas).
const FRAMES = Object.freeze({
    grass: Object.freeze([[100, 34], [133, 34], [166, 34]]),
    mud: Object.freeze([[199, 34], [1, 67], [34, 67]]),
    soil: Object.freeze([[67, 67], [100, 67], [133, 67]]),
});


// Separate AR4-B authored study atlas. The entire #429 source bank remains unmodified;
// these are new *offline painted* frames, not gameplay-generated texture or approved art.
export const PIXEL32_QUIET_ATLAS = Object.freeze({ width: 496, height: 67, tile: 32,
    revision: 'ar4b-quiet-grass-road.v2.provisional' });
const QUIET_FRAMES = Object.freeze({
    grass: Object.freeze([[265, 1], [298, 1], [397, 1], [430, 1], [463, 1], [1, 34], [34, 34], [67, 34], [100, 34], [133, 34], [331, 1], [364, 1]]),
    road: Object.freeze([[166, 34], [199, 34], [232, 34], [265, 34], [298, 34], [331, 34]]),
    edge: Object.freeze({ down: [133, 1], left: [166, 1], right: [199, 1], up: [232, 1] }),
    corner: Object.freeze({ ne: [1, 1], nw: [34, 1], se: [67, 1], sw: [100, 1] }),
});

export const PIXEL32_WORLD = Object.freeze({
    width: 1024, height: 2112, revision: 'ar4b-world-forest-road.v2.provisional',
    seed: 1387, sourceOnly: true,
});
function validWorldSources(sources, width, height) {
    return width <= PIXEL32_WORLD.width && height <= PIXEL32_WORLD.height &&
        ['grass', 'road'].every(family => sources?.[family]?.width === PIXEL32_WORLD.width &&
            sources[family].height === PIXEL32_WORLD.height &&
            sources[family].data?.length === PIXEL32_WORLD.width * PIXEL32_WORLD.height * 4);
}

function validQuietAtlas(atlas) {
    return atlas?.width === PIXEL32_QUIET_ATLAS.width &&
        atlas?.height === PIXEL32_QUIET_ATLAS.height &&
        atlas.data?.length === atlas.width * atlas.height * 4;
}

function quietVariant(cellX, cellY, seed, count) {
    // A deterministic cell hash avoids the alternating checkerboard of the first study.
    let h = Math.imul(cellX ^ seed, 0x45d9f3b) ^ Math.imul(cellY + seed, 0x119de1f3);
    h ^= h >>> 16;
    return (h >>> 0) % count;
}

function paintQuietForestRoad(pixels, width, height, atlas, labels, cellColumns, seed, worldSources = null) {
    const blockSize = PIXEL32_ATLAS.cluster;
    const cellRows = Math.ceil(height / blockSize);
    const at = (col, row) => col >= 0 && row >= 0 && col < cellColumns && row < cellRows
        ? labels[row * cellColumns + col] : -1;
    for (let row = 0; row < cellRows; row++) for (let col = 0; col < cellColumns; col++) {
        const index = at(col, row);
        if (index !== 1 && index !== 2) continue; // Only the forest grass and ordinary road.
        const opposite = index === 1 ? 2 : 1;
        const x0 = col * blockSize, y0 = row * blockSize;
        const w = Math.min(blockSize, width - x0), h = Math.min(blockSize, height - y0);
        const baseFrames = index === 1 ? QUIET_FRAMES.grass : QUIET_FRAMES.road;
        const variant = quietVariant(Math.floor(x0 / 32), Math.floor(y0 / 32),
            seed, baseFrames.length);
        let frame = baseFrames[variant], seamX = null, seamY = null;
        const left = at(col - 1, row) === opposite;
        const right = at(col + 1, row) === opposite;
        const up = at(col, row - 1) === opposite;
        const down = at(col, row + 1) === opposite;
        const horizontal = left ? 'left' : right ? 'right' : null;
        const vertical = up ? 'up' : down ? 'down' : null;
        if (horizontal) seamX = horizontal === 'left' ? x0 : x0 + w;
        if (vertical) seamY = vertical === 'up' ? y0 : y0 + h;
        if (horizontal && vertical) {
            // Four authored convex/concave road corner frames; preserve C# curve topology.
            const roadWest = index === 2 ? horizontal === 'right' : horizontal === 'left';
            const roadNorth = index === 2 ? vertical === 'down' : vertical === 'up';
            frame = QUIET_FRAMES.corner[(roadNorth ? 'n' : 's') + (roadWest ? 'w' : 'e')];
        } else if (horizontal) {
            const grassLeft = index === 1 ? horizontal === 'right' : horizontal === 'left';
            frame = QUIET_FRAMES.edge[grassLeft ? 'left' : 'right'];
        } else if (vertical) {
            const grassUp = index === 1 ? vertical === 'down' : vertical === 'up';
            frame = QUIET_FRAMES.edge[grassUp ? 'up' : 'down'];
        }
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
            const x = x0 + dx, y = y0 + dy;
            const sampleX = seamX !== null ? 16 + x - seamX : x % 32;
            const sampleY = seamY !== null ? 16 + y - seamY : y % 32;
            // Each edge uses its source-authored central transition pixels in site phase.
            // No mirrored frame, RGB averaging, alpha-weight mixing or lighting lies.
            // Whole-world authoring samples absolute source coordinates. No 32px
            // frame repetition or runtime texture synthesis; the authored edge kit
            // still supplies the narrow C# grass/road boundary pixels.
            const source = worldSources && !horizontal && !vertical
                ? worldSources[index === 1 ? 'grass' : 'road'] : atlas;
            const from = source === atlas
                ? ((frame[1] + sampleY) * atlas.width + frame[0] + sampleX) * 4
                : (y * source.width + x) * 4;
            const to = (y * width + x) * 4;
            pixels[to] = source.data[from];
            pixels[to + 1] = source.data[from + 1];
            pixels[to + 2] = source.data[from + 2];
            pixels[to + 3] = 255;
        }
    }
}

function rgb(hex) {
    return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
}

function variantForCell(cellX, cellY, seed) {
    // Deterministic world-cell alternation, including a slow site-space phase change.
    // It keeps adjacent frame identities distinct without a camera-local pattern origin.
    const patchX = Math.floor(cellX / 5), patchY = Math.floor(cellY / 5);
    let hash = Math.imul(patchX ^ seed, 0x45d9f3b) ^ Math.imul(patchY + seed, 0x119de1f3);
    hash ^= hash >>> 16;
    return ((cellX + 2 * cellY + (hash >>> 0) % 3) % 3 + 3) % 3;
}

function validAtlas(atlas) {
    return atlas?.width === PIXEL32_ATLAS.width && atlas?.height === PIXEL32_ATLAS.height &&
        atlas.data?.length === atlas.width * atlas.height * 4;
}

/** One-time site-space bitmap composition. Every terrain pixel is a source pixel or a
 * declared diagnostic fallback; no RGB-weight blur, alpha blend, per-frame bake or fake height.
 * Road uses the original soil *as a visibly provisional study* (never an approved road source).
 * Monastery paving, rock, water and ice remain their declared diagnostics until art approval.
 */
export function composeWorldSitePixel32Albedo(geography, width, height, atlas, quietAtlas = null, worldSources = null) {
    const preview = geography?.landscape?.elevation;
    if (!validAtlas(atlas) || !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 || width > 2048 || height > 3072 ||
        !Number.isInteger(preview?.columns) || !Number.isInteger(preview?.rows) ||
        preview.columns < 2 || preview.rows < 2 || preview.columns > 65 || preview.rows > 97 ||
        !Array.isArray(preview.samples) || preview.samples.length !== preview.columns * preview.rows)
        return null;

    if (quietAtlas && !validQuietAtlas(quietAtlas)) return null;
    if (worldSources && (!quietAtlas || !validWorldSources(worldSources, width, height))) return null;
    const monastery = geography.landscape.kind === 'mountain-monastery';
    const seed = Number.isInteger(geography.worldSeed) ? geography.worldSeed : 0;
    const sources = worldSiteSourceBindings(geography);
    const fallback = sources.map(source => rgb(source.fallback));
    // Normalize the immutable C# preview only once. A numeric lattice avoids allocating
    // thousands of weight maps while compositing a two-million-pixel portrait world.
    const materialCount = WORLD_SITE_MATERIALS.length;
    const grid = new Float32Array(preview.samples.length * materialCount);
    for (let index = 0; index < preview.samples.length; index++) {
        const weights = normalizeWorldSiteMaterialWeights(preview.samples[index]);
        if (!weights) return null;
        for (let material = 0; material < materialCount; material++)
            grid[index * materialCount + material] = weights[WORLD_SITE_MATERIALS[material].name];
    }
    const pixels = new Uint8ClampedArray(width * height * 4);
    const blockSize = PIXEL32_ATLAS.cluster;
    const cellColumns = Math.ceil(width / blockSize);
    const labels = quietAtlas && !monastery
        ? new Uint8Array(cellColumns * Math.ceil(height / blockSize)) : null;
    for (let top = 0; top < height; top += blockSize) {
        const blockHeight = Math.min(blockSize, height - top);
        const vy = (top + blockHeight / 2) / height * (preview.rows - 1);
        const row = Math.floor(vy), below = Math.min(preview.rows - 1, row + 1);
        const fy = vy - row;
        for (let left = 0; left < width; left += blockSize) {
            const blockWidth = Math.min(blockSize, width - left);
            const vx = (left + blockWidth / 2) / width * (preview.columns - 1);
            const col = Math.floor(vx), right = Math.min(preview.columns - 1, col + 1);
            const fx = vx - col;
            const tl = (row * preview.columns + col) * materialCount;
            const tr = (row * preview.columns + right) * materialCount;
            const bl = (below * preview.columns + col) * materialCount;
            const br = (below * preview.columns + right) * materialCount;
            // Winner of the *C# supplied* surface weights; 4px visual grouping is
            // quantization only, and never feeds a material/collision decision to C#.
            let dominant = 0;
            let maximum = -1;
            for (let index = 0; index < materialCount; index++) {
                const weight = (grid[tl + index] * (1 - fx) + grid[tr + index] * fx) * (1 - fy) +
                    (grid[bl + index] * (1 - fx) + grid[br + index] * fx) * fy;
                if (weight > maximum) { maximum = weight; dominant = index; }
            }
            if (labels) labels[Math.floor(top / blockSize) * cellColumns + Math.floor(left / blockSize)] = dominant;
            const material = WORLD_SITE_MATERIALS[dominant].name;
            const family = material === 'Road' && !monastery ? 'soil'
                : sources[dominant].sourceApproved ? sources[dominant].sourceFamily : null;
            const cellX = Math.floor(left / 32), cellY = Math.floor(top / 32);
            const frame = family ? FRAMES[family][variantForCell(cellX, cellY, seed)] : null;
            for (let dy = 0; dy < blockHeight; dy++) for (let dx = 0; dx < blockWidth; dx++) {
                const x = left + dx, y = top + dy;
                const to = (y * width + x) * 4;
                if (frame) {
                    const from = ((frame[1] + y % 32) * atlas.width + frame[0] + x % 32) * 4;
                    pixels[to] = atlas.data[from];
                    pixels[to + 1] = atlas.data[from + 1];
                    pixels[to + 2] = atlas.data[from + 2];
                } else {
                    pixels[to] = fallback[dominant][0];
                    pixels[to + 1] = fallback[dominant][1];
                    pixels[to + 2] = fallback[dominant][2];
                }
                pixels[to + 3] = 255;
            }
        }
    }
    if (labels) paintQuietForestRoad(pixels, width, height, quietAtlas, labels, cellColumns, seed, worldSources);
    return { width, height, data: pixels, prototypeOnly: true,
        artSource: worldSources ? PIXEL32_WORLD.revision
            : quietAtlas ? PIXEL32_QUIET_ATLAS.revision : PIXEL32_ATLAS.revision };
}

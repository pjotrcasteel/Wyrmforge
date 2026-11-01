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
export function composeWorldSitePixel32Albedo(geography, width, height, atlas) {
    const preview = geography?.landscape?.elevation;
    if (!validAtlas(atlas) || !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 || width > 2048 || height > 3072 ||
        !Number.isInteger(preview?.columns) || !Number.isInteger(preview?.rows) ||
        preview.columns < 2 || preview.rows < 2 || preview.columns > 65 || preview.rows > 97 ||
        !Array.isArray(preview.samples) || preview.samples.length !== preview.columns * preview.rows)
        return null;

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
    return { width, height, data: pixels, prototypeOnly: true,
        artSource: PIXEL32_ATLAS.revision };
}

// WF32-P1k-H2 — proposed physical stone rise and caster inputs, source-only.
// A height texture or alpha mask alone cannot cast a G-engine shadow: authored
// occluder geometry must later be registered through the existing G contract.
import { Bitmap } from '../lib/painter.mjs';
import { PIXELS_PER_WORLD_UNIT } from './terrain-ecology-props-25d.mjs';
import { HARD_PAIRING_FAMILIES } from './terrain-hard-pairings.mjs';

export const HARD_PAIRING_RISE_PIXELS = Object.freeze({
    flagstone: 4, cobble: 7, brick: 5
});
const TONAL_BASELINES = Object.freeze({flagstone: 66, cobble: 74, brick: 61});
const HEIGHT_UNITS_PER_PIXEL = 16;
const MAX_REVIEW_RISE_PIXELS = 8;

/** Material rise candidates are separate from the tonal 0-255 relief values
 * used to derive normal maps. Their scale is explicitly unapproved art input.
 */
export function buildHardPairingRelief(field) {
    if (!field || !HARD_PAIRING_FAMILIES.includes(field.primary) ||
        !HARD_PAIRING_FAMILIES.includes(field.secondary) ||
        !Number.isInteger(field.width) || !Number.isInteger(field.height) ||
        !(field.sourceTags instanceof Uint8Array) ||
        !(field.originalIds instanceof Int32Array) ||
        !(field.heights instanceof Uint8Array) ||
        field.sourceTags.length !== field.width * field.height ||
        field.originalIds.length !== field.width * field.height ||
        field.heights.length !== field.width * field.height) {
        throw new TypeError('Expected an original source-authored hard pairing window');
    }

    const {width, height} = field;
    const elevationPixels = new Uint8Array(width * height);
    const surfaceHeightSixteenths = new Uint8Array(width * height);
    const heightmap = new Bitmap(width, height);
    const casterAlpha = new Bitmap(width, height);
    const visibleStones = new Map();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const tag = field.sourceTags[i];
            if (tag === 0) {
                if (field.originalIds[i] !== 0) {
                    throw new TypeError('Earth infill must not identify a hard stone');
                }
                heightmap.set(x, y, '#000000');
                continue;
            }
            if ((tag !== 1 && tag !== 2) || field.originalIds[i] <= 0) {
                throw new TypeError('Hard stone footprint has no valid source identity');
            }
            const material = tag === 1 ? field.primary : field.secondary;
            const rise = HARD_PAIRING_RISE_PIXELS[material];
            elevationPixels[i] = rise;
            // Existing authored tonal relief supplies only a small top-face
            // variation, never a replacement for physically measured height.
            // All values remain in a fixed world-pixel scale across windows.
            const tonalDetail = Math.min(12, Math.max(0,
                field.heights[i] - TONAL_BASELINES[material]));
            const subpixels = rise * HEIGHT_UNITS_PER_PIXEL + tonalDetail;
            surfaceHeightSixteenths[i] = subpixels;
            const gray = Math.round(255 * subpixels /
                (MAX_REVIEW_RISE_PIXELS * HEIGHT_UNITS_PER_PIXEL));
            heightmap.set(x, y, [gray, gray, gray, 255]);
            casterAlpha.set(x, y, [255, 255, 255, 255]);

            // Only candidate geometry metadata. Real G caster meshes must be
            // authored/batched by the lighting-owned integration after AR3.
            const key = tag + ':' + field.originalIds[i];
            let candidate = visibleStones.get(key);
            if (!candidate) {
                candidate = {sourceTag: tag, material, originalStoneId: field.originalIds[i],
                    risePixels: rise, worldRise: rise / PIXELS_PER_WORLD_UNIT,
                    pixelCount: 0, minX: x, minY: y, maxX: x, maxY: y,
                    // Exact raster occupancy, *not* a box collider or mesh.
                    spans: []};
                visibleStones.set(key, candidate);
            }
            candidate.pixelCount++;
            candidate.minX = Math.min(candidate.minX, x);
            candidate.minY = Math.min(candidate.minY, y);
            candidate.maxX = Math.max(candidate.maxX, x);
            candidate.maxY = Math.max(candidate.maxY, y);
            const last = candidate.spans.at(-1);
            if (last && last.y === y && last.endX === x - 1) {
                last.endX = x;
            } else {
                candidate.spans.push({y, startX: x, endX: x});
            }
        }
    }

    return {
        width, height, pixelsPerWorldUnit: PIXELS_PER_WORLD_UNIT,
        heightUnitsPerPixel: HEIGHT_UNITS_PER_PIXEL,
        elevationPixels, surfaceHeightSixteenths, heightmap, casterAlpha,
        candidateCasterFootprints: [...visibleStones.values()],
        status: 'SOURCE-ONLY CANDIDATE ELEVATION AND CASTER MASK; NO G GEOMETRY, LIVE SHADOWS OR PHYSICS'
    };
}

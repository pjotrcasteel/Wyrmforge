// WF32-P1k-H1 — source-only meetings between independent original hard materials.
// C# AR3 owns real material regions; shared G owns live normal/shadow rendering.
import { Bitmap } from '../lib/painter.mjs';
import { createWorldMasonryWindow, worldBoundaryMask, worldSoftPixel } from './terrain-world-variation.mjs';
import { TERRAIN_MATERIALS } from './terrain-material-grammar.mjs';

export const HARD_PAIRING_VERSION = 'wf32-hard-pairing-source.v1';
export const HARD_PAIRING_FAMILIES = Object.freeze(['flagstone', 'cobble', 'brick']);
const HALO_PIXELS = 64;

/** Remove complete original stone identities that cross the material boundary.
 * This intentionally leaves weathered earth in the contact seam; no stone face
 * is sliced into a straight half-tile. It is an art study, not site geometry.
 */
export function createHardPairingWindow(primary, secondary, {
    seed = 1387, state = 'worn', originX = 0, originY = 0,
    width = 256, height = 256, role = 'left', boundaryX = 128, boundaryY = 128,
    seamMaterial = 'soil'
} = {}) {
    if (!HARD_PAIRING_FAMILIES.includes(primary) ||
        !HARD_PAIRING_FAMILIES.includes(secondary) || primary === secondary) {
        throw new RangeError('Hard pairing requires two distinct source stone families');
    }
    const seam = TERRAIN_MATERIALS[seamMaterial];
    if (!seam || seam.kind !== 'soft') {
        throw new RangeError('Hard pairing seam must use existing soft ground');
    }
    const area = {seed, state, originX: originX - HALO_PIXELS, originY: originY - HALO_PIXELS,
        width: width + HALO_PIXELS * 2, height: height + HALO_PIXELS * 2};
    // These two pure functions retain their original color, stone ID and wear grammars.
    const a = createWorldMasonryWindow(primary, area);
    const b = createWorldMasonryWindow(secondary, area);
    const mask = worldBoundaryMask({
        type: role, originX: area.originX, originY: area.originY,
        width: area.width, height: area.height, boundaryX, boundaryY, seed
    });

    const blockedPrimary = new Set();
    const blockedSecondary = new Set();
    for (let i = 0; i < mask.length; i++) {
        if (!mask[i] && a.originalIds[i]) {
            blockedPrimary.add(a.originalIds[i]);
        }
        if (mask[i] && b.originalIds[i]) {
            blockedSecondary.add(b.originalIds[i]);
        }
    }

    const albedo = new Bitmap(width, height);
    const stoneIds = new Int32Array(width * height);
    const originalIds = new Int32Array(width * height);
    const sourceTags = new Uint8Array(width * height); // 0 earth seam; 1 primary; 2 secondary.
    const heights = new Uint8Array(width * height);
    const roughness = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const src = (y + HALO_PIXELS) * area.width + (x + HALO_PIXELS);
            const dst = y * width + x;
            const isPrimary = mask[src] === 1;
            const field = isPrimary ? a : b;
            const blocked = isPrimary ? blockedPrimary : blockedSecondary;
            const visible = field.stoneIds[src] > 0 && !blocked.has(field.originalIds[src]);
            if (visible) {
                albedo.set(x, y, field.albedo.get(x + HALO_PIXELS, y + HALO_PIXELS));
                stoneIds[dst] = field.stoneIds[src];
                originalIds[dst] = field.originalIds[src];
                sourceTags[dst] = isPrimary ? 1 : 2;
                heights[dst] = field.heights[src];
                roughness[dst] = field.roughness[src];
            } else {
                albedo.set(x, y, worldSoftPixel(seamMaterial, originX + x, originY + y, seed + 997));
                heights[dst] = seam.height;
                roughness[dst] = Math.round(seam.roughness * 255);
            }
        }
    }
    return {primary, secondary, seamMaterial, seed, state, role, boundaryX, boundaryY,
        originX, originY, width, height, albedo, stoneIds, originalIds, sourceTags, heights, roughness};
}

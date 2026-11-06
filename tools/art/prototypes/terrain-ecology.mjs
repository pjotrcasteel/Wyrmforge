// WF32-P1j — source-only, deterministic world-space ecological details.
// Extends the shared terrain grammar; C# remains authoritative for ecology and sites.
// No reference-pack pixels, runtime scene mutation, animated physics or custom shader.
import { Bitmap } from '../lib/painter.mjs';
import { createWorldBoundaryWindow, worldLightingMaps } from './terrain-world-variation.mjs';

export const ECOLOGY_VERSION = 'wf32-ecology.v1';
export const ECOLOGY_GRID = 20;
export const ECOLOGY_HALO = 32;
export const ECOLOGY_EDGE_GUARD = 9;
export const ECOLOGY_DETAILS = Object.freeze({
    mushroom: Object.freeze({ surface: 'soft', moisture: .58, shelter: .58, size: 7, relief: 12, roughness: 232 }),
    pebble: Object.freeze({ surface: 'soft', moisture: 0, shelter: 0, size: 6, relief: 10, roughness: 215 }),
    twig: Object.freeze({ surface: 'soft', moisture: 0, shelter: .25, size: 8, relief: 7, roughness: 238 }),
    leaf: Object.freeze({ surface: 'soft', moisture: .1, shelter: .30, size: 6, relief: 3, roughness: 229 }),
    root: Object.freeze({ surface: 'soft', moisture: .22, shelter: .51, size: 10, relief: 9, roughness: 240 }),
    moss: Object.freeze({ surface: 'hard', moisture: .53, shelter: .25, size: 7, relief: 6, roughness: 244 }),
    rubble: Object.freeze({ surface: 'hard', moisture: 0, shelter: 0, size: 8, relief: 13, roughness: 224 }),
});
const MATERIALS = Object.freeze({
    grass: Object.freeze(['mushroom', 'pebble', 'twig', 'leaf', 'root']),
    soil: Object.freeze(['mushroom', 'pebble', 'twig', 'leaf', 'root']),
    mud: Object.freeze(['pebble', 'twig', 'leaf']),
    flagstone: Object.freeze(['moss', 'rubble']),
    cobble: Object.freeze(['moss', 'rubble']),
    brick: Object.freeze(['moss', 'rubble']),
});
export const ECOLOGY_COMPATIBILITY = MATERIALS;
const PALETTE = Object.freeze({
    mushroom: ['#443d31', '#827866', '#aea185', '#d2c4a3'],
    pebble: ['#282d29', '#464e45', '#697064'],
    twig: ['#242922', '#4b4031', '#66533d'],
    leaf: ['#292c23', '#56523c', '#756849'],
    root: ['#272b24', '#4d4232', '#6b593e'],
    moss: ['#293c2b', '#3e5436', '#576c46'],
    rubble: ['#30332e', '#555a4c', '#777667'],
});
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function hash(x, y, seed) {
    let n = (Math.imul(x | 0, 0x9e3779b1) ^ Math.imul(y | 0, 0x85ebca6b) ^ seed) >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, scale, seed) {
    const u = x / scale, v = y / scale;
    const ix = Math.floor(u), iy = Math.floor(v);
    const sx = (u - ix) ** 2 * (3 - 2 * (u - ix));
    const sy = (v - iy) ** 2 * (3 - 2 * (v - iy));
    const a = hash(ix, iy, seed) * (1 - sx) + hash(ix + 1, iy, seed) * sx;
    const b = hash(ix, iy + 1, seed) * (1 - sx) + hash(ix + 1, iy + 1, seed) * sx;
    return a * (1 - sy) + b * sy;
}
function validateContext(context) {
    for (const name of ['moisture', 'shelter', 'wear', 'density']) {
        if (typeof context[name] !== 'number' || !Number.isFinite(context[name]) || context[name] < 0 || context[name] > 1)
            throw new RangeError(`${name} must be a 0..1 review coefficient`);
    }
}
function put(field, localX, localY, ink, height, roughness, drawMask) {
    if (localX < 0 || localY < 0 || localX >= field.width || localY >= field.height) return;
    const i = localY * field.width + localX;
    if (!drawMask[i]) return;
    field.albedo.set(localX, localY, ink);
    field.heights[i] = clamp(field.heights[i] + height, 0, 255);
    field.roughness[i] = roughness;
}
function stamp(field, detail, x, y, drawMask, flip) {
    const s = ECOLOGY_DETAILS[detail], p = PALETTE[detail];
    const add = (dx, dy, c, h=s.relief) => put(field, x + dx, y + dy, c, h, s.roughness, drawMask);
    const dx = n => flip ? -n : n;
    switch (detail) {
        case 'mushroom':
            add(0, 0, p[0], 1); add(0, -1, p[1]); add(0, -2, p[1]);
            for (let i = -2; i <= 2; i++) add(dx(i), -3, p[i === 0 ? 3 : 2]);
            add(dx(-1), -4, p[2]); add(dx(1), -4, p[2]);
            break;
        case 'pebble':
            for (let a = -2; a <= 2; a++) { add(dx(a), 0, p[1]); if (Math.abs(a) < 2) add(dx(a), -1, p[2]); }
            add(dx(1), 1, p[0]);
            break;
        case 'twig':
            for (let i = 0; i < 6; i++) add(dx(i - 3), Math.floor(i / 3), p[i % 3 === 0 ? 2 : 1], 3);
            add(dx(1), -1, p[1]); add(dx(2), -2, p[2]);
            break;
        case 'leaf':
            add(0, 0, p[0]); add(dx(-1), -1, p[1]); add(dx(0), -2, p[2]);
            add(dx(1), -1, p[1]); add(dx(2), -1, p[0]);
            break;
        case 'root':
            for (let i = 0; i < 7; i++) add(dx(i - 3), Math.floor(i * .5) - 1, p[i % 3 === 0 ? 2 : 1]);
            add(dx(0), -2, p[1]); add(dx(1), -3, p[2]); add(dx(-1), 2, p[0]);
            break;
        case 'moss':
            for (let yy = -2; yy <= 1; yy++) for (let xx = -2; xx <= 2; xx++)
                if ((xx * xx + yy * yy) <= (yy === -2 ? 2 : 6) && hash(xx, yy, x + y) > .13)
                    add(dx(xx), yy, p[hash(xx, yy, x) > .54 ? 2 : 1]);
            break;
        case 'rubble':
            add(dx(-2), 1, p[0]); add(dx(-2), 0, p[1]); add(dx(-1), -1, p[2]);
            add(0, -1, p[1]); add(dx(1), 0, p[2]); add(dx(2), 1, p[1]);
            break;
    }
}
function nearApprovedBoundary(field, x, y, centerIsStone) {
    // Guard transitions: don't clutter the explicitly owner-approved P1i blending.
    for (const [dx, dy] of [[-ECOLOGY_EDGE_GUARD, 0], [ECOLOGY_EDGE_GUARD, 0],
        [0, -ECOLOGY_EDGE_GUARD], [0, ECOLOGY_EDGE_GUARD],
        [-6, -6], [-6, 6], [6, -6], [6, 6]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= field.width || yy >= field.height) return true;
        if (Boolean(field.stoneIds[yy * field.width + xx]) !== centerIsStone) return true;
    }
    return false;
}
/** Apply optional ecological detail over an already-generated world surface.
 * All placement is based on global anchor cells, not on window boundaries.
 * Use a source window with an ECOLOGY_HALO and crop afterwards for overlap-safe output.
 */
export function decorateEcologyField(field, { seed = 1387, soft = 'grass', context = {} } = {}) {
    if (!field || !field.albedo || !field.stoneIds || !field.heights || !field.roughness)
        throw new TypeError('Expected a world surface with stable stone topology');
    if (!['grass', 'soil', 'mud'].includes(soft)) throw new RangeError('Expected a supported soft material');
    const c = { moisture: .65, shelter: .62, wear: .45, density: .65, ...context };
    validateContext(c);
    const copy = { ...field, albedo: field.albedo.clone(),
        heights: new Uint8Array(field.heights), roughness: new Uint8Array(field.roughness) };
    const placed = [];
    const originX = field.originX, originY = field.originY;
    const maxX = originX + field.width, maxY = originY + field.height;
    const drawMask = new Uint8Array(field.width * field.height);
    for (let cy = Math.floor(originY / ECOLOGY_GRID) - 1; cy <= Math.floor(maxY / ECOLOGY_GRID) + 1; cy++) {
        for (let cx = Math.floor(originX / ECOLOGY_GRID) - 1; cx <= Math.floor(maxX / ECOLOGY_GRID) + 1; cx++) {
            const gx = cx * ECOLOGY_GRID + 6 + Math.floor(hash(cx, cy, seed + 17) * 9);
            const gy = cy * ECOLOGY_GRID + 6 + Math.floor(hash(cx, cy, seed + 29) * 9);
            const x = gx - originX, y = gy - originY;
            if (x < 12 || y < 12 || x >= field.width - 12 || y >= field.height - 12) continue;
            const index = y * field.width + x, hard = Boolean(field.stoneIds[index]);
            if (nearApprovedBoundary(field, x, y, hard)) continue;
            const materials = MATERIALS[hard ? field.type : soft];
            if (!materials) continue;
            const localMoisture = clamp(.62 * c.moisture + .38 * noise(gx, gy, 105, seed + 191), 0, 1);
            const localShelter = clamp(.70 * c.shelter + .30 * noise(gx, gy, 160, seed + 233), 0, 1);
            const localWear = clamp(.69 * c.wear + .31 * noise(gx, gy, 90, seed + 269), 0, 1);
            const patch = noise(gx, gy, 70, seed + 313);
            // Uneven ecological pockets; a large monotone cell should not get a carpet of decals.
            const occurrence = (.07 + .30 * patch) * c.density * (hard ? .65 : 1.0);
            if (hash(cx, cy, seed + 337) > occurrence) continue;
            const possible = materials.filter(kind => {
                const spec = ECOLOGY_DETAILS[kind];
                if (localMoisture < spec.moisture || localShelter < spec.shelter) return false;
                if (kind === 'rubble' && localWear < .28) return false;
                if (kind === 'mushroom' && localWear > .85) return false;
                if (kind === 'moss' && localMoisture < .53) return false;
                return true;
            });
            if (!possible.length) continue;
            const kind = possible[Math.floor(hash(cx, cy, seed + 373) * possible.length)];
            // Restrict a glyph to the same kind of surface, keeping transitions pristine.
            drawMask.fill(0);
            for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
                const px = x + dx, py = y + dy, index = py * field.width + px;
                if (Boolean(field.stoneIds[index]) === hard &&
                    !nearApprovedBoundary(field, px, py, hard)) drawMask[index] = 1;
            }
            stamp(copy, kind, x, y, drawMask, hash(cx, cy, seed + 401) < .5);
            placed.push({ kind, x: gx, y: gy, material: hard ? field.type : soft });
        }
    }
    return { ...copy, detailPlacements: placed, ecologyVersion: ECOLOGY_VERSION };
}
/** Convenience for reproducible source-art visual inspection. The halo is mandatory
 * for identical overlapping windows and for detail glyphs crossing 32px cells.
 */
export function createEcologyReviewWindow(type = 'flagstone', soft = 'grass', options = {}) {
    const { seed = 1387, state = 'reclaimed', originX = 0, originY = 0,
        width = 256, height = 256, role = 'left', boundaryX = 128, boundaryY = 128,
        context = {} } = options;
    if (![originX, originY, width, height].every(n => Number.isInteger(n) && n % 32 === 0) ||
        width < 32 || height < 32 || width > 896 || height > 896)
        throw new RangeError('Ecology review requires 32px-aligned windows up to 896px');
    const halo = ECOLOGY_HALO;
    const base = createWorldBoundaryWindow(type, soft, { seed, state, role, boundaryX, boundaryY,
        originX: originX - halo, originY: originY - halo, width: width + halo * 2, height: height + halo * 2 });
    const decorated = decorateEcologyField(base, {seed, soft, context});
    const out = new Bitmap(width, height), stoneIds = new Int32Array(width * height),
        heights = new Uint8Array(width * height), roughness = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const src = (y + halo) * base.width + x + halo, dst = y * width + x;
        out.set(x, y, decorated.albedo.get(x + halo, y + halo));
        stoneIds[dst] = base.stoneIds[src];
        heights[dst] = decorated.heights[src]; roughness[dst] = decorated.roughness[src];
    }
    const details = decorated.detailPlacements.filter(d =>
        d.x >= originX && d.y >= originY && d.x < originX + width && d.y < originY + height);
    return {type, soft, seed, state, originX, originY, width, height, role,
        albedo: out, stoneIds, heights, roughness, detailPlacements: details,
        ecologyVersion: ECOLOGY_VERSION, lightingContract: 'existing shared G renderer / albedo-normal-roughness'};
}
export { worldLightingMaps };

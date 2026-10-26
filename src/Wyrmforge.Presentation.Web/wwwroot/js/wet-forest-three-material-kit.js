// Wet Forest vertical slice: one deterministic, gameplay-authoritative C# recipe,
// three source-art study families, and no new road or collision authority.
// Graphics-only mapping, suitable for a cached GPU albedo surface in the review page.
import { CELL, MATERIALS, GROUND_TILE_SIZE, buildGroundQuiltAtlas,
    drawReferenceGroundBoard, drawGroundMaterialTransitions, groundMaterialBoundaryPlan } from './arena-materials.js';

export const MATERIAL_IDS = Object.freeze({ grass: 0, mud: 1, earth: 3 });
export const MATERIAL_NAMES = Object.freeze(['Grass / moss', 'Wet mud', 'Trampled earth']);
const MAP_WIDTH = 960, MAP_HEIGHT = 1536;
const MAX_GRID = 65536;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = t => { const n = clamp(t, 0, 1); return n * n * (3 - 2 * n); };

function validPoint(p) {
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.width)
        && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && p.width > 0 && p.width <= 1;
}

export function validateWetForestRecipe(recipe) {
    if (!recipe || !Array.isArray(recipe.trail) || recipe.trail.length < 2
        || !Array.isArray(recipe.ground) || recipe.ground.length > 512
        || !Number.isFinite(recipe.siteX) || !Number.isFinite(recipe.siteY)
        || recipe.siteX < 0 || recipe.siteX > 1 || recipe.siteY < 0 || recipe.siteY > 1
        || recipe.trail.some(p => !validPoint(p))) return false;
    for (let i = 1; i < recipe.trail.length; i++)
        if (recipe.trail[i].y <= recipe.trail[i - 1].y) return false;
    return recipe.ground.every(p =>
        p && ['clearing', 'leafbed', 'moss', 'mud', 'puddle'].includes(p.kind)
        && Number.isFinite(p.x) && Number.isFinite(p.y)
        && Number.isFinite(p.radiusX) && Number.isFinite(p.radiusY)
        && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
        && p.radiusX > 0 && p.radiusY > 0 && p.radiusX <= 1 && p.radiusY <= 1);
}

// Interpolate existing C# points, without inventing separate roads or waypoints.
export function trailAt(recipe, fraction) {
    if (!validateWetForestRecipe(recipe)) return null;
    const points = recipe.trail, y = clamp(fraction, 0, 1);
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        if (y <= b.y || i === points.length - 2) {
            const t = smooth((y - a.y) / (b.y - a.y));
            return { x: a.x + (b.x - a.x) * t, width: a.width + (b.width - a.width) * t };
        }
    }
    return null;
}

function patchKind(p) {
    return p.kind === 'mud' || p.kind === 'puddle' ? MATERIAL_IDS.mud
        : p.kind === 'moss' ? MATERIAL_IDS.grass : MATERIAL_IDS.earth;
}

/** Pure material classification. No prop placement, navigation, collisions or new paths. */
export function threeMaterialPlan(recipe, seed, width = MAP_WIDTH, height = MAP_HEIGHT) {
    if (!validateWetForestRecipe(recipe) || !Number.isInteger(seed)
        || !Number.isInteger(width) || !Number.isInteger(height)
        || width < CELL || height < CELL || width > 8192 || height > 8192) return null;
    const columns = Math.ceil(width / CELL), rows = Math.ceil(height / CELL);
    if (columns * rows > MAX_GRID) return null;
    const board = new Uint8Array(columns * rows);
    const kinds = { grass: 0, earth: 0, mud: 0 }, recipeTrail = recipe.trail;
    // Cache the C# authored trail sampling once per raster row.
    const track = Array.from({ length: rows }, (_, row) =>
        trailAt(recipe, clamp((row * CELL + CELL / 2) / height, 0, 1)));
    for (let row = 0; row < rows; row++) {
        const y = (row * CELL + CELL / 2) / height;
        for (let col = 0; col < columns; col++) {
            const x = (col * CELL + CELL / 2) / width;
            let kind = MATERIAL_IDS.grass;
            // Later authored ground regions override earlier ones, as ordered by C#.
            for (const patch of recipe.ground) {
                const px = (x - patch.x) / patch.radiusX, py = (y - patch.y) / patch.radiusY;
                if (px * px + py * py <= 1) kind = patchKind(patch);
            }
            // Site footprint already exists in the C# recipe; no new site geometry.
            if (Math.hypot((x - recipe.siteX) / .08, (y - recipe.siteY) / .052) <= 1)
                kind = MATERIAL_IDS.earth;
            const distance = Math.abs(x - track[row].x);
            if (distance <= track[row].width / 2) kind = MATERIAL_IDS.earth;
            board[row * columns + col] = kind;
            if (kind === MATERIAL_IDS.grass) kinds.grass++;
            else if (kind === MATERIAL_IDS.mud) kinds.mud++;
            else kinds.earth++;
        }
    }
    return { board, columns, rows, width, height, counts: kinds,
        recipeTrailCount: recipeTrail.length, seed, authority: 'HuntArenaGenerator.GenerateWetForest',
        previewOnly: true, materialIds: MATERIAL_IDS };
}

// These are the SAME 900px source-backed image candidates from Wet Forest
// art PR #340, exported by its ORIGINAL generators from hash-locked paintings.
// They are still unapproved and contain painterly highlights (not neutral albedo).
const REVIEW_TILE_SIZE = 900;
const REVIEW_IDS = Object.freeze([0, 1, 3]);
const REVIEW_FAMILY = Object.freeze({
    0: ['grass-moss', 'grass-moss-ART-CANDIDATE-'],
    1: ['wet-mud', 'wet-mud-INDEPENDENT-ART-CANDIDATE-'],
    3: ['trampled-earth', 'trampled-earth-INDEPENDENT-ART-CANDIDATE-'],
});
const nonnegativeMod = (value, period) => ((value % period) + period) % period;
export const SOURCE_BACKED_VARIANTS = Object.freeze([1, 2, 3, 4, 5, 6]);
export const SOURCE_BACKED_SIZE = REVIEW_TILE_SIZE;

export function sourceBackedUrl(materialId, variant) {
    if (!REVIEW_FAMILY[materialId] || !SOURCE_BACKED_VARIANTS.includes(variant)) return null;
    const [family, prefix] = REVIEW_FAMILY[materialId];
    const num = String(variant).padStart(2, '0');
    return new URL('../art/environment/wet-forest-source-backed/v1/' +
        family + '-art-candidates/' + prefix + num + '.png', import.meta.url).href;
}

function copyOriginalArt(ctx, images, materialId, x, y, width, height, phase) {
    const art = images[materialId];
    if (!art) return false;
    const endX = x + width, endY = y + height;
    for (let py = y; py < endY;) {
        const sy = nonnegativeMod(py + phase, REVIEW_TILE_SIZE);
        const h = Math.min(REVIEW_TILE_SIZE - sy, endY - py);
        for (let px = x; px < endX;) {
            const sx = nonnegativeMod(px + phase, REVIEW_TILE_SIZE);
            const w = Math.min(REVIEW_TILE_SIZE - sx, endX - px);
            ctx.drawImage(art, sx, sy, w, h, px, py, w, h);
            px += w;
        }
        py += h;
    }
    return true;
}

// Visual-only contiguous pixel contacts between different C# material cells.
// This does NOT change the authoritative C# material board, roads or physics.
// Unlike the old independently jittered 8px rectangles, each 2px contact
// samples a low-frequency CONTINUOUS displacement in world coordinates, so a
// road boundary does not restart or jump at every cell edge.
const BOUNDARY_SPAN = 2;
const MAX_CONTACT = 5;
function contactShift(along, across, seed) {
    const phase = (seed | 0) * .017 + across * .041;
    const wave = 3.05 * Math.sin(along / 15 + phase) + 1.65 * Math.sin(along / 29 - phase * .37);
    return Math.max(-MAX_CONTACT, Math.min(MAX_CONTACT, Math.round(wave)));
}

export function sourceBackedBoundaryContacts(board, columns, rows, seed) {
    if (!board || !Number.isInteger(columns) || !Number.isInteger(rows)
        || columns <= 0 || rows <= 0 || board.length !== columns * rows
        || !Number.isInteger(seed) || !Array.from(board).every(x => REVIEW_IDS.includes(x))) return null;
    const contacts = [];
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
            const index = row * columns + col, a = board[index];
            const x = col * CELL, y = row * CELL;
            if (col + 1 < columns && board[index + 1] !== a) {
                const b = board[index + 1], boundary = x + CELL;
                for (let offset = 0; offset < CELL; offset += BOUNDARY_SPAN) {
                    const dy = y + offset;
                    const displacement = contactShift(dy, boundary, seed);
                    if (displacement > 0)
                        contacts.push({ material: a, x: boundary, y: dy,
                            width: displacement, height: BOUNDARY_SPAN });
                    else if (displacement < 0)
                        contacts.push({ material: b, x: boundary + displacement, y: dy,
                            width: -displacement, height: BOUNDARY_SPAN });
                }
            }
            if (row + 1 < rows && board[index + columns] !== a) {
                const b = board[index + columns], boundary = y + CELL;
                for (let offset = 0; offset < CELL; offset += BOUNDARY_SPAN) {
                    const dx = x + offset;
                    const displacement = contactShift(dx, boundary, seed);
                    if (displacement > 0)
                        contacts.push({ material: a, x: dx, y: boundary,
                            width: BOUNDARY_SPAN, height: displacement });
                    else if (displacement < 0)
                        contacts.push({ material: b, x: dx, y: boundary + displacement,
                            width: BOUNDARY_SPAN, height: -displacement });
                }
            }
        }
    return contacts;
}

/** Directly place pre-existing PR #340 artwork beneath authoritative C# region
 * boundaries. No synthetic recoloring, shading, noise or new world topology.
 * 16px cells are classification, NOT independent stamps of painted objects.
 * Images remain unapproved until owner inspects actual gameplay-scale captures.
 */
export function bakeSourceBackedThreeMaterialGround(plan, images, seed, canvasFactory, transition = 'organic') {
    if (!plan || plan.seed !== seed || !Number.isInteger(seed) || !images || !canvasFactory
        || !['organic', 'original'].includes(transition)
        || !plan.board || plan.board.length !== plan.columns * plan.rows
        || !Number.isInteger(plan.width) || !Number.isInteger(plan.height)
        || !REVIEW_IDS.every(i => images[i]?.width === REVIEW_TILE_SIZE && images[i]?.height === REVIEW_TILE_SIZE)
        || !Array.from(plan.board).every(i => REVIEW_IDS.includes(i))) return null;
    const canvas = canvasFactory();
    canvas.width = plan.width; canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    const phase = (Math.abs(seed) % 16) * 8;
    for (let row = 0; row < plan.rows; row++)
        for (let col = 0; col < plan.columns; col++) {
            const x = col * CELL, y = row * CELL;
            const w = Math.min(CELL, plan.width - x), h = Math.min(CELL, plan.height - y);
            if (w > 0 && h > 0)
                copyOriginalArt(ctx, images, plan.board[row * plan.columns + col], x, y, w, h, phase);
        }
    if (transition === 'organic') {
        // Draw ONLY pixels sampled from the same archived candidate images;
        // never alpha-blend painted leaves, pebbles or footprint landmarks.
        const contacts = sourceBackedBoundaryContacts(plan.board, plan.columns, plan.rows, seed);
        if (!contacts) return null;
        for (const c of contacts)
            copyOriginalArt(ctx, images, c.material, c.x, c.y, c.width, c.height, phase);
        return canvas;
    }
    // Old boundary compositor, kept solely for exact-seed A/B comparison.
    // Neither mode invents a new world path or infers transparency from RGB.
    for (const edge of groundMaterialBoundaryPlan(plan.board, plan.columns, plan.rows, seed)) {
        if (!REVIEW_IDS.includes(edge.a) || !REVIEW_IDS.includes(edge.b)) continue;
        const side = (Math.imul(edge.x + 1, 73856093) ^ Math.imul(edge.y + seed, 19349663)) >>> 0;
        const shift = side % 3;
        if (edge.vertical) {
            copyOriginalArt(ctx, images, edge.b, edge.x - 2 - shift, edge.y, 2, 8, phase);
            if (side % 4 < 2)
                copyOriginalArt(ctx, images, edge.a, edge.x + shift, edge.y + 2, 2, 4, phase);
        } else {
            copyOriginalArt(ctx, images, edge.b, edge.x, edge.y - 2 - shift, 8, 2, phase);
            if (side % 4 < 2)
                copyOriginalArt(ctx, images, edge.a, edge.x + 2, edge.y + shift, 4, 2, phase);
        }
    }
    return canvas;
}

// Provisional art-review parameters, distinct from authored material maps.
const ROUGHNESS = Object.freeze({
    [MATERIAL_IDS.grass]: .97,
    [MATERIAL_IDS.mud]: .47,
    [MATERIAL_IDS.earth]: .84,
});

export function previewMaterialRoughness(id) {
    return ROUGHNESS[id] ?? null;
}

/** Pack a provisional per-pixel roughness channel for the SAME G1 GPU mesh.
 * Three.js samples the GREEN channel from a non-color roughnessMap texture.
 * This deliberately avoids inventing additional road meshes or duplicating
 * the terrain recipe. Values are design hypotheses pending artist approval. */
export function bakeThreeMaterialRoughness(plan, canvasFactory) {
    if (!plan || !plan.board || plan.board.length !== plan.columns * plan.rows
        || !canvasFactory || !Number.isInteger(plan.width) || !Number.isInteger(plan.height))
        return null;
    const canvas = canvasFactory();
    canvas.width = plan.width; canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < plan.rows; row++)
        for (let col = 0; col < plan.columns; col++) {
            const value = previewMaterialRoughness(plan.board[row * plan.columns + col]);
            if (value === null) return null;
            // 1 physical roughness sample per semantic tile; no color/albedo re-bake.
            ctx.fillStyle = `rgb(0, ${Math.round(value * 255)}, 0)`;
            ctx.fillRect(col * CELL, row * CELL,
                Math.min(CELL, plan.width - col * CELL), Math.min(CELL, plan.height - row * CELL));
        }
    return canvas;
}

/** Reuse the *existing* six-swatch approved source/atlas. Only 3 surfaces are selected.
 * The cached canvas becomes the G1 shared renderer's albedo texture. Existing
 * baked highlights are temporary and NOT certified as neutral production maps. */
export function bakeThreeMaterialGround(plan, source, seed, canvasFactory) {
    if (!plan || plan.seed !== seed || !source || !canvasFactory) return null;
    const atlas = buildGroundQuiltAtlas(source, seed, canvasFactory, false);
    if (!atlas || !Array.from(plan.board).every(i => i === 0 || i === 1 || i === 3)) return null;
    const canvas = canvasFactory();
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    if (!drawReferenceGroundBoard(ctx, plan.board, atlas, plan.columns, plan.rows, seed)) return null;
    drawGroundMaterialTransitions(ctx, plan.board, atlas, plan.columns, plan.rows, seed);
    return canvas;
}

export const THREE_MATERIAL_REVIEW = Object.freeze({
    source: 'existing accepted Wet Forest 6-swatch painting',
    selected: [MATERIALS[0].id, MATERIALS[3].id, MATERIALS[1].id],
    tilePixels: CELL,
    atlasPixels: GROUND_TILE_SIZE,
    dynamicLighting: true,
    neutralAlbedoApproved: false,
    runtimeAdopted: false,
    roughnessProvisional: true,
    roughnessChannel: 'G / non-color texture / G1 shared renderer',
    sourceBackedTilePixels: REVIEW_TILE_SIZE,
    sourceCandidateVariantCount: SOURCE_BACKED_VARIANTS.length,
    sourceBackedPreviewApproved: false,
});

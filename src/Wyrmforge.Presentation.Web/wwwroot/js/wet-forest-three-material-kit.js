// Wet Forest vertical slice: one deterministic, gameplay-authoritative C# recipe,
// three already-accepted material families, and no new road or collision authority.
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

// Authored 256px modular material asset library, generated deterministically
// from tools/art/build_wet_forest_compact_materials.py for the STATIC app bundle.
// Existing six painting sources and the C# topology are left unmodified.
export const COMPACT_MATERIAL_SOURCE = Object.freeze({
    0: new URL('../art/environment/wet-forest-compact/v1/grass-moss.png', import.meta.url).href,
    1: new URL('../art/environment/wet-forest-compact/v1/wet-mud.png', import.meta.url).href,
    3: new URL('../art/environment/wet-forest-compact/v1/trampled-earth.png', import.meta.url).href,
});
export const COMPACT_TILE_SIZE = 256;
const COMPACT_INDEX = Object.freeze([0, 1, 3]);
const nonnegativeMod = (x, n) => ((x % n) + n) % n;

function drawCompactRegion(ctx, sources, index, x, y, width, height, phase) {
    const tile = sources[index];
    if (!tile || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const maxX = x + width, maxY = y + height;
    for (let py = y; py < maxY;) {
        const sy = nonnegativeMod(py + phase, COMPACT_TILE_SIZE);
        const h = Math.min(COMPACT_TILE_SIZE - sy, maxY - py);
        for (let px = x; px < maxX;) {
            const sx = nonnegativeMod(px + phase, COMPACT_TILE_SIZE);
            const w = Math.min(COMPACT_TILE_SIZE - sx, maxX - px);
            ctx.drawImage(tile, sx, sy, w, h, px, py, w, h);
            px += w;
        }
        py += h;
    }
    return true;
}

/** Three directly authored repeatable pixel materials. Draw once per seed.
 * Only approved C# terrain cells choose the base texture; edges borrow real
 * neighboring pixel clusters using existing canonical material boundaries.
 * No RGB alpha fade, stamp-based road authority, new collision or water plane. */
export function bakeCompactThreeMaterialGround(plan, images, seed, canvasFactory) {
    if (!plan || !images || !canvasFactory || !Number.isInteger(seed)
        || !plan.board || plan.board.length !== plan.columns * plan.rows
        || !Number.isInteger(plan.width) || !Number.isInteger(plan.height)
        || !COMPACT_INDEX.every(i => images[i]?.width === COMPACT_TILE_SIZE && images[i]?.height === COMPACT_TILE_SIZE)
        || !Array.from(plan.board).every(i => COMPACT_INDEX.includes(i))) return null;
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
                drawCompactRegion(ctx, images, plan.board[row * plan.columns + col], x, y, w, h, phase);
        }
    // Existing material boundaries provide small irregular snapped contacts
    // where earth meets moss/mud. These are RGB pixel-art source selections,
    // never semantic alterations, independently invented paths, or shader FX.
    for (const edge of groundMaterialBoundaryPlan(plan.board, plan.columns, plan.rows, seed)) {
        if (!COMPACT_INDEX.includes(edge.a) || !COMPACT_INDEX.includes(edge.b)) continue;
        const side = (Math.imul(edge.x + 1, 73856093) ^ Math.imul(edge.y + seed, 19349663)) >>> 0;
        const shift = side % 3;
        if (edge.vertical) {
            drawCompactRegion(ctx, images, edge.b, edge.x - 2 - shift, edge.y, 2, 8, phase);
            if (side % 4 < 2)
                drawCompactRegion(ctx, images, edge.a, edge.x + shift, edge.y + 2, 2, 4, phase);
        } else {
            drawCompactRegion(ctx, images, edge.b, edge.x, edge.y - 2 - shift, 8, 2, phase);
            if (side % 4 < 2)
                drawCompactRegion(ctx, images, edge.a, edge.x + 2, edge.y + shift, 4, 2, phase);
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
    compactTilePixels: COMPACT_TILE_SIZE,
    compactPreviewApproved: false,
});

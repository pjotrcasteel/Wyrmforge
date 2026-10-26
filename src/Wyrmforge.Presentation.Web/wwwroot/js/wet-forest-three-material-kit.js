// Wet Forest vertical slice: one deterministic, gameplay-authoritative C# recipe,
// three already-accepted material families, and no new road or collision authority.
// Graphics-only mapping, suitable for a cached GPU albedo surface in the review page.
import { CELL, MATERIALS, GROUND_TILE_SIZE, buildGroundQuiltAtlas,
    drawReferenceGroundBoard, drawGroundMaterialTransitions } from './arena-materials.js';

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
});

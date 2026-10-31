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

/**
 * Playable-Hunt-only projection of the original 900px paintings. The archived
 * artwork is a SOURCE canvas, not a 900-world-pixel tile: displaying it 1:1
 * produced giant leaves, boulders and hard-looking material islands on phones.
 * Sample at 0.28 world pixels per source pixel, using overlapping crops
 * without reflected neighbouring repeats.
 * Review/lab source art and C# terrain regions remain untouched.
 */
export const LIVE_SOURCE_TILE = 252;
export const LIVE_FEATHER_BANDS = Object.freeze([
    { radius: 12, alpha: .14 },
    { radius: 5, alpha: .36 },
]);

export function liveGroundPatchPlan(width, height, seed, material) {
    const patches = [];
    const hash = (col, row, channel) => {
        let n = (seed | 0) ^ Math.imul(col + 31, 0x85ebca6b) ^ Math.imul(row + 47, 0xc2b2ae35)
            ^ Math.imul(material + channel * 7, 0x9e3779b1);
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
    };
    for (let row = 0, y = -48; y < height; row++, y += 120)
        for (let col = 0, x = -48; x < width; col++, x += 120)
            patches.push({ x, y, sx: Math.floor(hash(col, row, 0) * 301), sy: Math.floor(hash(col, row, 1) * 301) });
    return patches;
}

function copyLiveScaledArt(ctx, images, material, width, height, seed, canvasFactory) {
    // Preserve the compact 0.28 source scale, without reflected neighbouring
    // copies. Overlapping independently sampled crops hide the source borders.
    const scratch = canvasFactory();
    scratch.width = scratch.height = 168;
    const sc = scratch.getContext('2d');
    for (const p of liveGroundPatchPlan(width, height, seed, material)) {
        sc.clearRect(0, 0, 168, 168);
        sc.globalCompositeOperation = 'source-over';
        sc.drawImage(images[material], p.sx, p.sy, 600, 600, 0, 0, 168, 168);
        sc.globalCompositeOperation = 'destination-in';
        for (const horizontal of [true, false]) {
            const mask = sc.createLinearGradient(0, 0, horizontal ? 168 : 0, horizontal ? 0 : 168);
            mask.addColorStop(0, 'rgba(255,255,255,0)');
            mask.addColorStop(48 / 168, 'white');
            mask.addColorStop(1, 'white');
            sc.fillStyle = mask;
            sc.fillRect(0, 0, 168, 168);
        }
        ctx.drawImage(scratch, p.x, p.y);
    }
}

/**
 * Two deliberately thin, seeded contact washes across material boundaries.
 * Both neighbouring archived paintings bleed 5px + 12px into each other.
 * These are optical feather bands only: the C# material board, trail, patches,
 * collisions and combat never change. Drawing is cached per terrain seed.
 */
function addLiveFeatherMask(ctx, plan, material, radius, seed) {
    let count = 0;
    for (let row = 0; row < plan.rows; row++) {
        const y = row * CELL, height = Math.min(CELL, plan.height - y);
        for (let col = 0; col < plan.columns; col++) {
            const x = col * CELL, width = Math.min(CELL, plan.width - x);
            const index = row * plan.columns + col, current = plan.board[index];
            if (col + 1 < plan.columns && current !== plan.board[index + 1]) {
                const neighbor = plan.board[index + 1], edge = x + CELL;
                for (let part = 0; part < height; part += 4) {
                    const span = Math.min(4, height - part);
                    const reach = clamp(radius + Math.round(contactShift(y + part, edge, seed) * .25),
                        2, Math.min(CELL - 1, radius + 2));
                    if (current === material) {
                        ctx.rect(edge, y + part, reach, span);
                        count++;
                    } else if (neighbor === material) {
                        ctx.rect(edge - reach, y + part, reach, span);
                        count++;
                    }
                }
            }
            if (row + 1 < plan.rows && current !== plan.board[index + plan.columns]) {
                const neighbor = plan.board[index + plan.columns], edge = y + CELL;
                for (let part = 0; part < width; part += 4) {
                    const span = Math.min(4, width - part);
                    const reach = clamp(radius + Math.round(contactShift(x + part, edge, seed) * .25),
                        2, Math.min(CELL - 1, radius + 2));
                    if (current === material) {
                        ctx.rect(x + part, edge, span, reach);
                        count++;
                    } else if (neighbor === material) {
                        ctx.rect(x + part, edge - reach, span, reach);
                        count++;
                    }
                }
            }
        }
    }
    return count;
}

export function bakeSourceBackedThreeMaterialGroundBatched(plan, images, seed, canvasFactory) {
    if (!plan || plan.seed !== seed || !Number.isInteger(seed) || !images || !canvasFactory
        || !plan.board || plan.board.length !== plan.columns * plan.rows
        || !Number.isInteger(plan.width) || !Number.isInteger(plan.height)
        || plan.width < CELL || plan.height < CELL || plan.width > 8192 || plan.height > 8192
        || plan.columns !== Math.ceil(plan.width / CELL) || plan.rows !== Math.ceil(plan.height / CELL)
        || !REVIEW_IDS.every(id => images[id]?.width === REVIEW_TILE_SIZE && images[id]?.height === REVIEW_TILE_SIZE)
        || !Array.from(plan.board).every(id => REVIEW_IDS.includes(id))) return null;
    const canvas = canvasFactory();
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.save !== 'function' || typeof ctx.clip !== 'function'
        || typeof ctx.translate !== 'function' || typeof ctx.scale !== 'function') return null;
    // Downsampling a painting with smoothing preserves fine detail instead of
    // producing aliased, over-sized blocks from 900px source pixels.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (const material of REVIEW_IDS) {
        ctx.save();
        ctx.beginPath();
        let rectangles = 0;
        for (let row = 0; row < plan.rows; row++) {
            const height = Math.min(CELL, plan.height - row * CELL);
            for (let col = 0; col < plan.columns;) {
                const start = col, id = plan.board[row * plan.columns + col];
                do col++; while (col < plan.columns && plan.board[row * plan.columns + col] === id);
                if (id !== material) continue;
                ctx.rect(start * CELL, row * CELL, Math.min(col * CELL, plan.width) - start * CELL, height);
                rectangles++;
            }
        }
        if (rectangles) {
            ctx.clip();
            copyLiveScaledArt(ctx, images, material, plan.width, plan.height, seed, canvasFactory);
        }
        ctx.restore();
    }

    // Unlike the original 2-5px binary contacts, these translucent,
    // overlapping washes hide rectangular cutouts and reduce harsh contrast.
    // The wider wash goes first, then a narrower, stronger contact pass.
    for (const { radius, alpha } of LIVE_FEATHER_BANDS) {
        for (const material of REVIEW_IDS) {
            ctx.save();
            ctx.beginPath();
            if (addLiveFeatherMask(ctx, plan, material, radius, seed)) {
                ctx.clip();
                ctx.globalAlpha = alpha;
                copyLiveScaledArt(ctx, images, material, plan.width, plan.height, seed, canvasFactory);
            }
            ctx.restore();
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

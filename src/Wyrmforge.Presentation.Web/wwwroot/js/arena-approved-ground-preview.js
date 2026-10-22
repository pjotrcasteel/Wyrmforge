// Lab-only adapter: approved six WyrmForge ground paintings on the EXISTING
// C# WetForest recipe (roads/sites/wet banks). No new biome/layout authority.
// Production Hunts deliberately never request this preview until visual approval.
import { CELL, GROUND_TILE_SIZE, MATERIALS,
    drawReferenceGroundBoard, drawGroundMaterialTransitions } from './arena-materials.js';

const WET_FOREST_TO_APPROVED = Object.freeze({
    loam: 'grass', moss: 'grass', mud: 'mud',
    leafbed: 'dirt', puddle: 'marsh',
    road: 'dirt', clearing: 'dirt',
});
const MATERIAL_INDEX = Object.freeze(Object.fromEntries(MATERIALS.map((item, i) => [item.id, i])));

// Reuse already classified WetForest tiles from the existing C#-owned recipe.
// The renderer may change a painted swatch; it must never move a trail, pond,
// site, obstacle, collectible, actor, or collidable footprint.
export function approvedWetForestMaterial(kind) {
    return WET_FOREST_TO_APPROVED[kind] ?? 'grass';
}

export function approvedWetForestBoard(tiles, width, height, baseCellSize = 12) {
    if (!Array.isArray(tiles) || !Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 0 || height <= 0 || width > 8192 || height > 8192) return null;
    const columns = Math.ceil(width / CELL), rows = Math.ceil(height / CELL);
    const sourceColumns = Math.ceil(width / baseCellSize);
    if (baseCellSize !== 12 || tiles.length < sourceColumns * Math.ceil(height / baseCellSize))
        return null;
    const board = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < columns; x++) {
            const sourceX = Math.min(sourceColumns - 1, Math.floor((x * CELL + CELL / 2) / baseCellSize));
            const sourceY = Math.min(Math.ceil(height / baseCellSize) - 1,
                Math.floor((y * CELL + CELL / 2) / baseCellSize));
            const material = approvedWetForestMaterial(tiles[sourceY * sourceColumns + sourceX]?.material);
            board[y * columns + x] = MATERIAL_INDEX[material];
        }
    return { board, columns, rows };
}

export function drawApprovedWetForestBase(ctx, tiles, atlas, seed, width, height) {
    if (!ctx || !atlas || atlas.width !== MATERIALS.length * GROUND_TILE_SIZE ||
        atlas.height !== GROUND_TILE_SIZE) return false;
    const result = approvedWetForestBoard(tiles, width, height);
    if (!result) return false;
    const { board, columns, rows } = result;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    const drawn = drawReferenceGroundBoard(ctx, board, atlas, columns, rows, seed);
    if (drawn) drawGroundMaterialTransitions(ctx, board, atlas, columns, rows, seed);
    ctx.restore();
    return drawn;
}

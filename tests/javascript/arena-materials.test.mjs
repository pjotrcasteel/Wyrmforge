import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    CELL, COLS, ROWS, MATERIALS, GROUND_TILE_SIZE, GROUND_ATLAS_URL,
    materialSampleBoard, paintGroundCells, drawReferenceGroundBoard,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js';

test('material studio starts with six standalone ground types, not an arena layout', () => {
    assert.deepEqual(MATERIALS.map(m => m.id),
        ['grass', 'mud', 'paving', 'dirt', 'scorched', 'marsh']);
    const board = materialSampleBoard();
    assert.equal(board.length, COLS * ROWS);
    for (let row = 0; row < ROWS; row++)
        assert.deepEqual([...board.slice(row * COLS, (row + 1) * COLS)],
            Array(COLS).fill(Math.floor(row * MATERIALS.length / ROWS)));
});

test('painting edits cells without altering collision or inventing props', () => {
    const board = materialSampleBoard();
    const before = board.slice();
    const changed = paintGroundCells(board, COLS, ROWS, 13 * CELL + 4, 20 * CELL + 4, 1, 3);
    assert.ok(changed > 10 && changed < 60);
    assert.equal(board[20 * COLS + 13], 1);
    assert.equal(board[0], before[0]);
    assert.equal(board.at(-1), before.at(-1));
    assert.equal(paintGroundCells(board, COLS, ROWS, -600, -600, 4, 2), 0);
    assert.equal(paintGroundCells(board, COLS, ROWS, 0, 0, 99, 1), 0);
    assert.notDeepEqual(board, before);
});

test('generated material atlas is a compact six-panel ground-only WebP', () => {
    const art = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/wet-forest-materials-painted.webp', import.meta.url));
    assert.equal(art.toString('ascii', 0, 4), 'RIFF');
    assert.equal(art.toString('ascii', 8, 12), 'WEBP');
    assert.ok(art.length > 7000 && art.length < 25000);
    assert.equal(GROUND_TILE_SIZE, 112);
    assert.match(GROUND_ATLAS_URL, /wet-forest-materials-painted\.webp$/);
});

test('painter samples a continuous world-aligned texture, never screenshot blocks', () => {
    const board = materialSampleBoard();
    const atlas = { width: GROUND_TILE_SIZE * MATERIALS.length, height: GROUND_TILE_SIZE };
    const calls = [];
    const ctx = { drawImage(...args) { calls.push(args); } };
    assert.equal(drawReferenceGroundBoard(ctx, board, atlas), true);
    assert.equal(calls.length, COLS * ROWS);
    for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++) {
            const [image,sx,sy,sw,sh,x,y,w,h] = calls[row * COLS + col];
            assert.equal(image, atlas);
            assert.equal(sx, board[row * COLS + col] * GROUND_TILE_SIZE +
                (col * CELL + (1441 % 7) * CELL) % GROUND_TILE_SIZE);
            assert.equal(sy, (row * CELL + (1441 % 7) * CELL) % GROUND_TILE_SIZE);
            assert.deepEqual([sw,sh,x,y,w,h],
                [CELL,CELL,col * CELL,row * CELL,CELL,CELL]);
        }
    assert.equal(drawReferenceGroundBoard(ctx, board, null), false);
    assert.equal(drawReferenceGroundBoard(ctx, board, { width: 320, height: 64 }), false);
});

test('iPhone touch drags work and previous procedural tile generators are not used', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor.css', import.meta.url), 'utf8');
    assert.match(page, /@page "\/arena-materials"/);
    assert.match(page, /initMaterialsLab/);
    assert.match(page, /Pick\(5\)/);
    assert.match(js, /'touchstart', preventScroll, \{ passive: false \}/);
    assert.match(js, /'touchmove', preventScroll, \{ passive: false \}/);
    assert.match(js, /setPointerCapture/);
    assert.match(css, /touch-action:none/);
    assert.doesNotMatch(js, /MATERIAL_REFERENCE_ATLAS|const palettes|function materialNoise|function drawGroundMaterialTile|drawMaterialBoard|drawArenaEnvironment/);
});

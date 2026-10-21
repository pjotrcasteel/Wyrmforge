import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    CELL, COLS, ROWS, MATERIALS, materialSampleBoard,
    paintGroundCells, materialNoise, drawGroundMaterialTile,
    drawMaterialBoard,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js';

test('new material lab starts as five plain labeled material strips, not a generated map', () => {
    assert.deepEqual(MATERIALS.map(m => m.id), ['grass', 'mud', 'paving', 'dirt', 'scorched']);
    const board = materialSampleBoard();
    assert.equal(board.length, COLS * ROWS);
    for (let row = 0; row < ROWS; row++) {
        const expected = Math.floor(row / 8);
        assert.deepEqual([...board.slice(row * COLS, (row + 1) * COLS)],
            Array(COLS).fill(expected));
    }
});

test('brush stamps arbitrary material spots on a plain ground canvas without geometry', () => {
    const board = materialSampleBoard();
    const reference = board.slice();
    const before = board[20 * COLS + 13];
    assert.equal(before, 2);
    const changed = paintGroundCells(board, COLS, ROWS, 13 * CELL + 4, 20 * CELL + 4, 1, 3);
    assert.ok(changed > 10 && changed < 60);
    assert.equal(board[20 * COLS + 13], 1);
    assert.equal(board[0], reference[0]);
    assert.equal(board[(ROWS - 1) * COLS], reference[(ROWS - 1) * COLS]);
    assert.equal(paintGroundCells(board, COLS, ROWS, -600, -600, 4, 2), 0);
    assert.equal(paintGroundCells(board, COLS, ROWS, 0, 0, 99, 1), 0);
    assert.notDeepEqual(board, reference);
});

test('real reference-image materials paint the same ground board, with no synthetic detail', () => {
    const rects = [];
    const ctx = {
        set fillStyle(value) { this.color = value; },
        fillRect(...values) { rects.push({ values, pattern: this.color }); },
    };
    const patterns = MATERIALS.map((m, i) => ({ material: m.id, sourceIndex: i }));
    assert.equal(drawGroundMaterialTile(ctx, 2, 4, 6, patterns), true);
    assert.deepEqual(rects[0], { values: [4 * CELL, 6 * CELL, CELL, CELL], pattern: patterns[2] });
    assert.equal(drawGroundMaterialTile(ctx, -1, 4, 6, patterns), false);
    assert.equal(drawGroundMaterialTile(ctx, 1, 4, 6, []), false);
    assert.equal(drawMaterialBoard(ctx, materialSampleBoard(), patterns), true);
    assert.equal(rects.length, COLS * ROWS + 1);
    assert.deepEqual(rects.at(-1).pattern, patterns[4]);
    assert.equal(materialNoise(1441, 2, 3), materialNoise(1441, 2, 3));

    const asset = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/reference-ground-atlas.webp', import.meta.url));
    assert.equal(asset.toString('ascii', 0, 4), 'RIFF');
    assert.equal(asset.toString('ascii', 8, 12), 'WEBP');
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js', import.meta.url), 'utf8');
    assert.match(js, /reference-ground-atlas\\.webp/);
    assert.match(js, /new Image\\(\\)/);
    assert.match(js, /createPattern\\(surface, 'repeat'\\)/);
    assert.doesNotMatch(js, /const palettes|stone-bevel|scorch-noise|drawArenaEnvironment/);
});

test('iPhone touch drags are owned by the new painter and remain separate from live arena', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor.css', import.meta.url), 'utf8');
    assert.match(page, /@page "\/arena-materials"/);
    assert.match(page, /initMaterialsLab/);
    assert.match(page, /canvas.*width="480".*height="640"/);
    assert.match(js, /'touchstart', preventScroll, \{ passive: false \}/);
    assert.match(js, /'touchmove', preventScroll, \{ passive: false \}/);
    assert.match(js, /setPointerCapture/);
    assert.match(css, /touch-action:none/);
    assert.doesNotMatch(js, /HuntArenaGenerator|RestrictMovement|DamagePropsInRadius|spawnMob|drawArenaEnvironment/);
});

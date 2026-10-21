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

test('five materials draw deterministic, bounded, crisp pixel details', () => {
    const calls = [];
    const ctx = {
        set fillStyle(value) { this.color = value; },
        fillRect(x, y, w, h) { calls.push({ x, y, w, h, color: this.color }); },
    };
    for (let i = 0; i < MATERIALS.length; i++) {
        const count = calls.length;
        assert.equal(drawGroundMaterialTile(ctx, i, 4, 6, 1441), true);
        const marks = calls.slice(count);
        assert.ok(marks.length >= 1, MATERIALS[i].id + ' should paint the tile');
        const textureStart = calls.length;
        for (let j = 0; j < 10; j++)
            drawGroundMaterialTile(ctx, i, 10 + j, 6, 1441);
        assert.ok(calls.length - textureStart > 13,
            MATERIALS[i].id + ' should show varied detail across neighboring tiles');
        assert.ok(marks.every(m => Number.isInteger(m.x) && Number.isInteger(m.y) &&
            m.w > 0 && m.h > 0 && m.x >= 4 * CELL && m.y >= 6 * CELL &&
            m.x + m.w <= 5 * CELL && m.y + m.h <= 7 * CELL));
    }
    assert.equal(drawGroundMaterialTile(ctx, -1, 4, 6, 1441), false);
    assert.equal(materialNoise(1441, 2, 3), materialNoise(1441, 2, 3));
    assert.notEqual(materialNoise(1441, 2, 3), materialNoise(1442, 2, 3));
    const many = [];
    drawMaterialBoard({ set fillStyle(_v) {}, fillRect(...args) { many.push(args); } },
        materialSampleBoard(), 1441);
    assert.ok(many.length > COLS * ROWS * 2);
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

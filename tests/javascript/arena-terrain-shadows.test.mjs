import test from 'node:test';
import assert from 'node:assert/strict';
import { cellShadow, shadowField, SHADOW_SAMPLES } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-shadows.js';

const columns = 12, rows = 12;
const flat = extra => ({ columns, rows, surface: new Array(columns * rows).fill(0), material: new Array(columns * rows).fill(0), fine: new Map(), ...extra });
const level = (levels, sx, sy) => levels?.[sy * SHADOW_SAMPLES + sx] ?? 0;
const total = levels => levels ? levels.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0) : 0;

test('open flat ground has no shadow at all', () => {
    const frame = flat();
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) assert.equal(cellShadow(frame, column, row, 0), null);
});

test('a cliff shades the ground to its south-east and nothing to its north-west', () => {
    const frame = flat();
    for (let c = 4; c < 8; c++) for (let r = 4; r < 6; r++) frame.surface[r * columns + c] = 16;
    const south = cellShadow(frame, 5, 6, 0);
    assert.ok(total(south) > 60, 'the strip in front of the cliff is dark');
    assert.ok(cellShadow(frame, 8, 6, 0) !== null, 'the shadow leans east');
    assert.equal(cellShadow(frame, 5, 2, 0), null, 'the ground behind and north-west of it is lit');
    assert.equal(cellShadow(frame, 2, 5, 0), null, 'the ground west of it is lit');
    const lengthIn = row => total(cellShadow(frame, 5, row, 0));
    assert.ok(lengthIn(6) >= lengthIn(7) && lengthIn(7) >= lengthIn(8), 'the shadow fades with distance');
    assert.equal(cellShadow(frame, 5, 11, 0), null, 'and ends');
});

test('a taller cliff casts a longer shadow', () => {
    const low = flat(), high = flat();
    for (let c = 4; c < 8; c++) { low.surface[4 * columns + c] = 8; high.surface[4 * columns + c] = 24; }
    assert.ok(total(cellShadow(high, 5, 6, 0)) > total(cellShadow(low, 5, 6, 0)));
});

test('a trunk casts a narrow shadow and a standing tree darkens a canopy-sized patch beside it', () => {
    const frame = flat({ trunks: new Map([[5 * columns + 5, 20]]) });
    frame.material[5 * columns + 5] = 4;
    const patch = cellShadow(frame, 5, 6, 0);
    assert.ok(patch, 'ground south of the trunk is shaded');
    assert.ok(total(patch) > 30, 'a good part of the cell is shaded');
    assert.ok(total(cellShadow(frame, 5, 9, 0)) < total(patch) / 2, 'the shadow ends within a few metres');
    assert.equal(cellShadow(frame, 5, 2, 0), null, 'nothing north of the tree');
    const stump = flat({ trunks: new Map([[5 * columns + 5, 4]]) });
    assert.ok(total(cellShadow(stump, 5, 6, 0)) < total(patch), 'a worn stump has no canopy shadow');
});

test('a boulder shades a little ground and excavation changes the shadow', () => {
    const frame = flat({ boulders: new Map([[5 * columns + 5, 16]]) });
    assert.ok(cellShadow(frame, 5, 5, 0) || cellShadow(frame, 6, 5, 0) || cellShadow(frame, 5, 6, 0));
    const wall = flat();
    for (let c = 4; c < 8; c++) wall.surface[4 * columns + c] = 16;
    const before = total(cellShadow(wall, 5, 5, 0));
    const dug = flat({ fine: new Map([[4 * columns + 5, { heights: new Array(64).fill(0) }]]) });
    for (let c = 4; c < 8; c++) dug.surface[4 * columns + c] = c === 5 ? 0 : 16;
    assert.ok(total(cellShadow(dug, 5, 5, 0)) < before, 'a column dug away no longer shades the ground behind it');
    assert.equal(shadowField(wall), shadowField(wall), 'cached on the frame');
});

test('shaped columns are shaded per microcolumn at their own height', () => {
    const frame = flat();
    for (let c = 4; c < 8; c++) frame.surface[4 * columns + c] = 16;
    const heights = new Array(64).fill(0);
    for (let i = 0; i < 8; i++) heights[i] = 16; // a ledge on the northern microrow
    const shaded = cellShadow(frame, 5, 5, heights);
    assert.ok(shaded && level(shaded, 3, 8) > 0, 'ground below a ledge is shaded');
    assert.equal(level(shaded, 3, 0), 0, 'the ledge top itself is lit');
});

test('shadow reuse distinguishes whole and fine surfaces and expires with the terrain frame', () => {
    const frame = flat();
    frame.surface[4 * columns + 5] = 16;
    const fineHeights = new Array(64).fill(16);
    const whole = cellShadow(frame, 5, 5, 0);
    assert.ok(total(whole) > 0);
    assert.equal(cellShadow(frame, 5, 5, fineHeights), null);
    assert.strictEqual(cellShadow(frame, 5, 5, 0), whole);
    assert.equal(cellShadow(flat(), 5, 5, 0), null);
});

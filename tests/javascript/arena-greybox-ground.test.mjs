import test from 'node:test';
import assert from 'node:assert/strict';
import { GREYBOX_GROUND_COLOR, drawGreyboxGround } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-greybox-ground.js';

const oneMetreGrid = {
    cellSizeMeters: 1,
    pixelsPerFace: 32,
    microcellsPerAxis: 8,
    microcellSizeMeters: .125,
    groundBaseMeters: 0,
    groundTopMeters: 1,
};

test('neutral one-metre ground draws exactly one untextured fill without a grid or walls', () => {
    const calls = [];
    const ctx = {
        fillStyle: null,
        fillRect: (...args) => calls.push(['fillRect', ...args]),
    };
    assert.equal(drawGreyboxGround(ctx, oneMetreGrid, 950, 1550), true);
    assert.equal(ctx.fillStyle, GREYBOX_GROUND_COLOR);
    assert.deepEqual(calls, [['fillRect', 0, 0, 950, 1550]]);
});

test('an absent greybox cannot silently select archived texture fallback', () => {
    const calls = [];
    const ctx = { fillRect: (...args) => calls.push(args) };
    assert.equal(drawGreyboxGround(ctx, null, 950, 1550), false);
    assert.deepEqual(calls, []);
});

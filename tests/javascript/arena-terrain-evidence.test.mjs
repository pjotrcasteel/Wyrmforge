import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTerrainPixels, compareFullTerrainFrame } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-evidence.js';

test('terrain pixel diff reports exact mismatch count, bounds and intensity without modifying either input', () => {
    const a = new Uint8ClampedArray([
        16, 32, 48, 255, 20, 30, 40, 255,
        6, 7, 8, 255, 33, 22, 11, 255
    ]);
    const b = a.slice();
    const before = a.slice();
    assert.deepEqual(compareTerrainPixels(a, b, 2), {
        mismatched: 0, total: 4, maxDelta: 0, bounds: null, first: []
    });
    b[4] = 250;
    b[12] = 10;
    const result = compareTerrainPixels(a, b, 2);
    assert.equal(result.mismatched, 2);
    assert.equal(result.maxDelta, 230);
    assert.deepEqual(result.bounds, { x0: 1, y0: 0, x1: 1, y1: 1 });
    assert.deepEqual(result.first.map(value => [value.x, value.y]), [[1, 0], [1, 1]]);
    assert.deepEqual(a, before, 'capturing must never modify the source texture');
    assert.throws(() => compareTerrainPixels(a, b.subarray(0, 12), 2), RangeError);
});

test('authoritative comparison is revision-scoped and detects dropped fine updates', () => {
    const block = { heights: new Array(64).fill(0), topsoil: 0, stoneTop: -8, wear: null };
    block.heights[10] = -3;
    const local = {
        revision: 7, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0],
        fine: new Map([[3, block]])
    };
    const server = { revision: 7, columns: 2, rows: 2,
        surface: [0, 0, 0, 0], material: [0, 0, 0, 0],
        fine: [{ index: 3, ...block }] };
    assert.equal(compareFullTerrainFrame(local, server).status, 'match');
    const future = { ...server, revision: 8 };
    assert.equal(compareFullTerrainFrame(local, future).status, 'revision-mismatch',
        'a future C# frame must not be interpreted as evidence of dropped updates');
    const changed = { ...server, fine: [{ ...server.fine[0], heights: new Array(64).fill(-2) }] };
    const result = compareFullTerrainFrame(local, changed);
    assert.equal(result.status, 'mismatch');
    assert.deepEqual(result.mismatchSamples.map(sample => sample.kind), ['fine']);
});

test('authoritative comparison accepts intentional tree/boulder mound presentation', () => {
    const local = {
        revision: 5, columns: 2, rows: 1,
        surface: [0, 0], material: [4, 2], fine: new Map()
    };
    const server = {
        revision: 5, columns: 2, rows: 1,
        surface: [15, 0], material: [4, 2], fine: []
    };
    assert.equal(compareFullTerrainFrame(local, server).status, 'match');
    assert.equal(compareFullTerrainFrame(local, null).status, 'unavailable');
});

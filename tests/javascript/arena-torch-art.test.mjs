import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTorches, torchLayers, drawTorch } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-torch-art.js';
import { mergeTerrainFrame } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';

const frame = { torches: [16 * 3 + 8, 16 * 10 + 8, 16 * 20 + 8, 16 * 40 + 8] };

test('torches are the C# posts converted from 1/16 cells to world units, cached on the frame', () => {
    const torches = collectTorches(frame);
    assert.equal(torches.length, 2);
    assert.deepEqual([torches[0].x, torches[0].y], [3.5 * 32, 10.5 * 32]);
    assert.equal(collectTorches(frame), torches, 'cached');
    assert.deepEqual(collectTorches({}), []);
});

test('only torches in or near the camera window become depth layers, sorted by their ground position', () => {
    const layers = torchLayers(frame, { x: 0, y: 200 }, 390, 400);
    assert.equal(layers.length, 1);
    assert.equal(layers[0].kind, 'torch');
    assert.equal(layers[0].depth, 10.5 * 32 + 2);
});

test('a torch draws a post and a flickering flame from fills only', () => {
    const fills = [];
    const ctx = { fillStyle: '', fillRect(x, y, w, h) { fills.push({ x, y, w, h, color: this.fillStyle }); } };
    const torch = collectTorches(frame)[0];
    drawTorch(ctx, torch, 0);
    const first = fills.length;
    assert.ok(first > 10);
    assert.ok(fills.some(f => f.color === '#ff9b39'), 'a hot flame');
    const before = JSON.stringify(fills);
    fills.length = 0;
    drawTorch(ctx, torch, 1 / 9);
    assert.notEqual(JSON.stringify(fills), before, 'the flame moves between frames');
});

test('the road line and torches arrive once and survive later terrain deltas', () => {
    const first = mergeTerrainFrame(null, { revision: 1, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0], fine: [], road: [8, 8, 24, 40], torches: [40, 40] });
    assert.deepEqual(first.road, [8, 8, 24, 40]);
    const later = mergeTerrainFrame(first, { revision: 2, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0], fine: [] });
    assert.deepEqual(later.road, [8, 8, 24, 40]);
    assert.deepEqual(later.torches, [40, 40]);
});

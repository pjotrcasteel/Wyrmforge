import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLOCK_INSET_COLOR, TERRAIN_MATERIAL, TERRAIN_PAD_UNITS, TerrainCanvasCache, blockInsetOverlayEnabled, drawBlockInsetOverlay, heightShade, influenceBandIndex, paintTerrain, terrainColors,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';
import { raisedActor } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-projection.js';

function recorder() {
    const calls = [];
    return {
        calls,
        fillStyle: '',
        save() {}, restore() {}, translate(x, y) { calls.push(['translate', x, y]); },
        fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h, this.fillStyle]); },
        clearRect() {},
        drawImage(...args) { calls.push(['drawImage', ...args.slice(1)]); },
    };
}

function frame(columns, rows, surface, material = null, revision = 1) {
    return { revision, columns, rows, surface, material: material ?? surface.map(() => TERRAIN_MATERIAL.Soil) };
}

test('influence bands follow the C# Fire profile bounds', () => {
    assert.equal(influenceBandIndex(0), 0);
    assert.equal(influenceBandIndex(0.24), 0);
    assert.equal(influenceBandIndex(0.25), 1);
    assert.equal(influenceBandIndex(0.54), 1);
    assert.equal(influenceBandIndex(0.55), 2);
    assert.equal(influenceBandIndex(0.85), 3);
    assert.equal(influenceBandIndex(Number.NaN), 0);
    assert.equal(influenceBandIndex(7), 3);
});

test('every material has a distinct top and darker front colour in each band', () => {
    for (let band = 0; band < 4; band++)
        for (const material of Object.values(TERRAIN_MATERIAL)) {
            const { top, front } = terrainColors(band, material);
            assert.match(top, /^#[0-9a-f]{6}$/);
            assert.notEqual(top, front);
        }
});

test('height shading is stepped in whole metres and symmetric around the floor', () => {
    assert.equal(heightShade('#808080', 0), '#808080');
    assert.equal(heightShade('#808080', 3), '#808080', 'under half a metre does not shift');
    assert.notEqual(heightShade('#808080', 8), '#808080');
    assert.ok(parseInt(heightShade('#808080', 8).slice(1, 3), 16) > 0x80);
    assert.ok(parseInt(heightShade('#808080', -8).slice(1, 3), 16) < 0x80);
});

test('a flat grid paints only 32x32 top faces', () => {
    const ctx = recorder();
    const painted = paintTerrain(ctx, frame(2, 2, [0, 0, 0, 0]), 0);
    assert.equal(painted, 4);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect');
    assert.deepEqual(rects.map(call => call.slice(1, 5)), [[0, 0, 32, 32], [32, 0, 32, 32], [0, 32, 32, 32], [32, 32, 32, 32]]);
});

test('a raised column lifts 32 px per metre and hangs a front face down to the floor in front of it', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 2, [8, 0]), 0);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1, 5));
    assert.deepEqual(rects[0], [0, -32, 32, 32], 'top face one metre up');
    assert.deepEqual(rects[1], [0, 0, 32, 32], 'front face: a full metre exposed');
    assert.deepEqual(rects[2], [0, 32, 32, 32], 'floor row behind the front');
});

test('a pit sinks its top face and the higher row behind it exposes the back wall', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 3, [0, -8, 0]), 0);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1, 5));
    assert.deepEqual(rects[0], [0, 0, 32, 32]);
    assert.deepEqual(rects[1], [0, 32, 32, 32], 'back wall of the pit, one metre exposed');
    assert.deepEqual(rects[2], [0, 64, 32, 32], 'pit floor sits a metre lower');
});

test('painting is offset by the padding so raised ground above row zero stays on the surface', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 1, [8]), 0);
    assert.deepEqual(ctx.calls[0], ['translate', 0, TERRAIN_PAD_UNITS]);
});

test('the cache repaints only when the revision or influence band changes', () => {
    const canvases = [];
    const cache = new TerrainCanvasCache((width, height) => {
        const ctx = recorder();
        const canvas = { width, height, getContext: () => ctx };
        canvases.push(canvas);
        return canvas;
    });
    const terrain = frame(2, 2, [0, 0, 0, 0], null, 5);
    assert.equal(cache.update(terrain, 0), true);
    assert.equal(cache.update(terrain, 0), false);
    assert.equal(cache.update({ ...terrain, revision: 6 }, 0), true);
    assert.equal(cache.update({ ...terrain, revision: 6 }, 2), true);
    assert.equal(cache.repaints, 3);
    assert.equal(canvases.length, 1, 'the offscreen surface is reused while the grid size is unchanged');
    assert.equal(cache.update(null, 0), false);
});

test('cache draw copies the visible window from the padded surface into world space', () => {
    const cache = new TerrainCanvasCache((width, height) => ({ width, height, getContext: () => recorder() }));
    cache.update(frame(4, 4, new Array(16).fill(0)), 0);
    const ctx = recorder();
    assert.equal(cache.draw(ctx, { x: 10, y: 20, width: 60, height: 50 }), true);
    assert.deepEqual(ctx.calls[0], ['drawImage', 10, 20 + TERRAIN_PAD_UNITS, 60, 50, 10, 20, 60, 50]);
    assert.equal(cache.draw(ctx, { x: 9999, y: 0, width: 10, height: 10 }), false);
});

test('raisedActor lifts the draw copy by z and leaves the ground position alone', () => {
    const actor = { x: 10, y: 100, z: 32, radius: 8 };
    const drawn = raisedActor(actor);
    assert.equal(drawn.y, 68);
    assert.equal(actor.y, 100, 'depth sorting keeps using the ground position');
    assert.equal(raisedActor({ x: 1, y: 2, z: 0 }).y, 2);
    assert.equal(raisedActor({ x: 1, y: 2 }).y, 2);
});

test('the block inset overlay is a debug toggle and off by default', () => {
    assert.equal(blockInsetOverlayEnabled(''), false);
    assert.equal(blockInsetOverlayEnabled('?hunt1=1'), false);
    assert.equal(blockInsetOverlayEnabled('?hunt1=1&blockInset=1'), true);
});

test('the inset overlay draws one one-pixel line inside each 32x32 face and one per exposed metre', () => {
    const ctx = Object.assign(recorder(), { strokeRect(x, y, w, h) { this.calls.push(['strokeRect', x, y, w, h, this.strokeStyle, this.lineWidth]); } });
    const outlined = drawBlockInsetOverlay(ctx, frame(1, 2, [16, 0]), { x: 0, y: 0, width: 32, height: 64 });
    const strokes = ctx.calls.filter(call => call[0] === 'strokeRect');
    assert.equal(outlined, strokes.length);
    assert.deepEqual(strokes[0].slice(1, 5), [0.5, -63.5, 31, 31], 'top face two metres up, inset by one pixel');
    assert.deepEqual(strokes.slice(1, 3).map(call => call.slice(1, 5)), [[0.5, -31.5, 31, 31], [0.5, 0.5, 31, 31]], 'two metres of front face');
    assert.ok(strokes.every(call => call[5] === BLOCK_INSET_COLOR && call[6] === 1));
});

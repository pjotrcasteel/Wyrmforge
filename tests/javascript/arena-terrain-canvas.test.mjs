import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLOCK_INSET_COLOR, BLOCK_TONE_STEP, blockTone, scaleHex, TERRAIN_MATERIAL, eraseTerrainOcclusion, occludingTerrainCells, repaintTerrainOcclusion, TERRAIN_PAD_UNITS, TerrainCanvasCache, blockInsetOverlayEnabled, drawBlockInsetOverlay, heightShade, influenceBandIndex, paintTerrain, terrainColors,
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

test('the palette is dark and gothic: earth is muted, fronts are deep, only lava is saturated', () => {
    const channels = hex => [16, 8, 0].map(shift => (parseInt(hex.slice(1), 16) >> shift) & 255);
    const luma = hex => { const [r, g, b] = channels(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const saturation = hex => { const c = channels(hex); return (Math.max(...c) - Math.min(...c)) / Math.max(...c); };
    for (let band = 0; band < 4; band++)
        for (const material of Object.values(TERRAIN_MATERIAL)) {
            const { top, front } = terrainColors(band, material);
            assert.ok(luma(front) <= luma(top) * 0.62, `band ${band} material ${material}: front must read as a deep side face`);
            assert.ok(luma(top) < 140 || material === TERRAIN_MATERIAL.Lava, `band ${band} material ${material}: no bright tops`);
            if (material !== TERRAIN_MATERIAL.Lava) assert.ok(saturation(top) < 0.3, `band ${band} material ${material}: earth stays muted`);
            else assert.ok(saturation(top) > 0.7, 'lava carries the colour');
        }
    // Each band is darker than the one before it for soil: the land is consumed toward the Wyrm.
    for (let band = 1; band < 4; band++)
        assert.ok(luma(terrainColors(band, TERRAIN_MATERIAL.Soil).top) < luma(terrainColors(band - 1, TERRAIN_MATERIAL.Soil).top));
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

test('only terrain south of the actor that is higher than its feet occludes it', () => {
    // 1 column x 6 rows: floor, floor, floor, 1 m rock, 1 m rock, floor.
    const terrain = frame(1, 6, [0, 0, 0, 8, 8, 0]);
    assert.deepEqual(occludingTerrainCells(terrain, 16, 40, 0, 12), [{ column: 0, row: 3 }, { column: 0, row: 4 }], 'rock in front of an actor on the floor');
    assert.deepEqual(occludingTerrainCells(terrain, 16, 5 * 32 + 8, 0, 12), [], 'behind the rock nothing is in front');
    assert.deepEqual(occludingTerrainCells(terrain, 16, 3 * 32 + 8, 32, 12), [], 'an actor standing on the rock is not hidden by it');
    assert.deepEqual(occludingTerrainCells(null, 16, 40, 0, 12), []);
    assert.deepEqual(occludingTerrainCells(terrain, Number.NaN, 40, 0, 12), []);
});

test('only a few rows ahead are considered and the actor width picks the columns', () => {
    const terrain = frame(3, 10, new Array(30).fill(0).map((_, i) => (i >= 24 ? 8 : 0)));
    assert.deepEqual(occludingTerrainCells(terrain, 48, 8, 0, 4), [], 'rock eight rows away is too far to hide the actor');
    const wide = frame(3, 3, [0, 0, 0, 0, 0, 0, 8, 8, 8]);
    assert.deepEqual(occludingTerrainCells(wide, 64, 40, 0, 20).map(cell => cell.column), [1, 2], 'x 64 +/- 20 spans columns 1 and 2');
});

test('the GPU path erases the covering faces and the Canvas path repaints them back to front', () => {
    const terrain = frame(1, 3, [0, 8, 0]);
    const cells = occludingTerrainCells(terrain, 16, 8, 0, 8);
    assert.deepEqual(cells, [{ column: 0, row: 1 }]);
    const erase = recorder();
    erase.globalCompositeOperation = 'source-over';
    const saved = [];
    erase.save = () => saved.push(erase.globalCompositeOperation);
    erase.restore = () => { erase.globalCompositeOperation = saved.pop(); };
    assert.equal(eraseTerrainOcclusion(erase, terrain, cells), 1);
    const rects = erase.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1, 5));
    assert.deepEqual(rects, [[0, 0, 32, 32], [0, 32, 32, 32]], 'top face lifted a metre, then the front face down to the floor');
    assert.equal(erase.globalCompositeOperation, 'source-over', 'the compositing mode is restored');
    assert.equal(eraseTerrainOcclusion(recorder(), terrain, []), 0);
    const repaint = recorder();
    assert.equal(repaintTerrainOcclusion(repaint, terrain, 0, cells), 1);
    assert.equal(repaint.calls.filter(call => call[0] === 'fillRect').length, 2);
});

test('open ground varies per 1 m block in three deterministic flat tones', () => {
    const tones = new Set();
    for (let row = 0; row < 12; row++) for (let column = 0; column < 12; column++) tones.add(blockTone(column, row));
    assert.deepEqual([...tones].sort(), [-1, 0, 1]);
    assert.equal(blockTone(5, 9), blockTone(5, 9));
    assert.equal(scaleHex('#808080', 1), '#808080');
    assert.equal(scaleHex('#808080', 1 + BLOCK_TONE_STEP), '#8c8c8c');
    assert.equal(scaleHex('#ffffff', 2), '#ffffff', 'channels clamp');
});

test('painted open ground uses more than one tone and every tone stays dark', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(12, 12, new Array(144).fill(0)), 0);
    const tops = new Set(ctx.calls.filter(call => call[0] === 'fillRect').map(call => call[5]));
    assert.equal(tops.size, 3);
});

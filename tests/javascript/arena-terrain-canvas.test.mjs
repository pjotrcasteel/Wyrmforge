import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLOCK_INSET_COLOR, BLOCK_TONE_STEP, MICRO_PER_COLUMN, mergeTerrainFrame, microHeight, microMaterial, DIRT_LOWER_FLOOR, DIRT_UPPER_FLOOR, GRASS_TOP, frontSegments, topFaceColor, groundStep, isBarePatch, isPebble, scaleHex, TERRAIN_MATERIAL, eraseTerrainOcclusion, occludingTerrainCells, repaintTerrainOcclusion, TERRAIN_PAD_UNITS, TerrainCanvasCache, blockInsetOverlayEnabled, drawBlockInsetOverlay, heightShade, influenceBandIndex, paintTerrain, terrainColors,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';
import { raisedActor } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-projection.js';

function recorder() {
    const calls = [], cues = [];
    return {
        calls, cues,
        fillStyle: '',
        save() {}, restore() {}, translate(x, y) { calls.push(['translate', x, y]); },
        // Translucent contact shadows and lip light are depth cues; they are asserted separately from the opaque faces.
        fillRect(x, y, w, h) { (String(this.fillStyle).startsWith('rgba(') ? cues : calls).push(['fillRect', x, y, w, h, this.fillStyle]); },
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
    const painted = paintTerrain(ctx, frame(2, 2, [0, 0, 0, 0]), 0, undefined, false);
    assert.equal(painted, 4);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect');
    assert.deepEqual(rects.map(call => call.slice(1, 5)), [[0, 0, 32, 32], [32, 0, 32, 32], [0, 32, 32, 32], [32, 32, 32, 32]]);
});

test('a raised column lifts 32 px per metre and hangs a front face down to the floor in front of it', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 2, [8, 0]), 0, undefined, false);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1, 5));
    assert.deepEqual(rects[0], [0, -32, 32, 32], 'top face one metre up');
    assert.deepEqual(rects[1], [0, 0, 32, 32], 'front face: a full metre exposed');
    assert.deepEqual(rects[2], [0, 32, 32, 32], 'floor row behind the front');
});

test('a pit sinks its top face and the higher row behind it exposes the back wall', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 3, [0, -8, 0]), 0, undefined, false);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1, 5));
    assert.deepEqual(rects[0], [0, 0, 32, 32]);
    assert.deepEqual(rects[1], [0, 32, 32, 16], 'back wall of the pit: upper dirt band');
    assert.deepEqual(rects[2], [0, 48, 32, 16], 'back wall of the pit: lower dirt band');
    assert.deepEqual(rects[3], [0, 64, 32, 32], 'pit floor sits a metre lower');
});

test('painting is offset by the padding so raised ground above row zero stays on the surface', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 1, [8]), 0, undefined, false);
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
    assert.equal(repaintTerrainOcclusion(repaint, terrain, 0, cells, false), 1);
    assert.equal(repaint.calls.filter(call => call[0] === 'fillRect').length, 2);
});

test('ground grain is deterministic, mostly neutral, spans five tone steps and keeps bare patches and pebbles rare', () => {
    const steps = new Map();
    let bare = 0, pebbles = 0;
    for (let gy = 0; gy < 60; gy++) for (let gx = 0; gx < 60; gx++) {
        const step = groundStep(gx, gy);
        steps.set(step, (steps.get(step) ?? 0) + 1);
        assert.equal(step, groundStep(gx, gy));
        if (isBarePatch(gx, gy)) bare++;
        if (isPebble(gx, gy)) pebbles++;
    }
    assert.deepEqual([...steps.keys()].sort((a, b) => a - b), [-2, -1, 0, 1, 2]);
    assert.ok(steps.get(0) > 3600 * .3, 'plain ground dominates');
    assert.ok(bare > 0 && bare < 3600 * .3 && pebbles > 0 && pebbles < 3600 * .03);
    assert.equal(scaleHex('#808080', 1), '#808080');
    assert.equal(scaleHex('#808080', 1 + BLOCK_TONE_STEP), '#8c8c8c');
    assert.equal(scaleHex('#ffffff', 2), '#ffffff', 'channels clamp');
});

test('painted open ground uses several flat tones and every tone stays dark', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(12, 12, new Array(144).fill(0)), 0);
    const tops = new Set(ctx.calls.filter(call => call[0] === 'fillRect').map(call => call[5]));
    assert.ok(tops.size >= 4 && tops.size <= 16, `${tops.size} tones`);
    for (const colour of tops) for (const shift of [16, 8, 0]) assert.ok(((parseInt(colour.slice(1), 16) >> shift) & 255) < 0xa0, colour);
});

test('undisturbed ground wears a grass cap in the green bands, and digging reveals dirt', () => {
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Soil, 0), GRASS_TOP[0]);
    assert.equal(topFaceColor(1, TERRAIN_MATERIAL.Soil, 0), GRASS_TOP[1], 'scorched grass is dry');
    assert.equal(topFaceColor(2, TERRAIN_MATERIAL.Soil, 0), terrainColors(2, TERRAIN_MATERIAL.Soil).top, 'no grass once the forest burns');
    const dug = topFaceColor(0, TERRAIN_MATERIAL.Soil, -2);
    assert.notEqual(dug, GRASS_TOP[0]);
    assert.ok(parseInt(dug.slice(1, 3), 16) > parseInt(dug.slice(5, 7), 16) * 1.5, 'dirt is red-brown, not green');
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Ash, 0), terrainColors(0, TERRAIN_MATERIAL.Ash).top, 'ash patches stay ash');
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Stone, 0), terrainColors(0, TERRAIN_MATERIAL.Stone).top);
});

test('a dug wall shows two dirt bands then stone, in order, covering exactly the exposed height', () => {
    const wall = frontSegments(0, TERRAIN_MATERIAL.Stone, 0, -16);
    assert.deepEqual(wall.map(segment => [segment.from, segment.to]), [[0, DIRT_UPPER_FLOOR], [DIRT_UPPER_FLOOR, DIRT_LOWER_FLOOR], [DIRT_LOWER_FLOOR, -16]]);
    assert.equal(new Set(wall.map(segment => segment.color)).size, 3, 'upper dirt, lower dirt and stone are three tones');
    const luma = hex => parseInt(hex.slice(1, 3), 16) * 0.2126 + parseInt(hex.slice(3, 5), 16) * 0.7152 + parseInt(hex.slice(5, 7), 16) * 0.0722;
    assert.ok(luma(wall[0].color) > luma(wall[1].color), 'the wall darkens with depth');
});

test('front segments tile the exposed span with no gap, whatever the heights', () => {
    for (const [top, bottom] of [[8, 0], [24, 0], [3, -1], [0, -3], [0, -30], [10, -10], [-2, -6], [-6, -20]]) {
        const segments = frontSegments(0, TERRAIN_MATERIAL.Soil, top, bottom);
        assert.equal(segments[0].from, top, 'starts at the top for ' + top + '->' + bottom);
        assert.equal(segments.at(-1).to, bottom, 'ends at the bottom for ' + top + '->' + bottom);
        for (let i = 1; i < segments.length; i++) assert.equal(segments[i].from, segments[i - 1].to);
    }
    assert.deepEqual(frontSegments(0, TERRAIN_MATERIAL.Soil, 0, 0), []);
    assert.deepEqual(frontSegments(0, TERRAIN_MATERIAL.Soil, -8, 0), [], 'a higher neighbour in front exposes nothing');
    assert.equal(frontSegments(3, TERRAIN_MATERIAL.Lava, 0, -16).length, 1, 'lava is one band');
    assert.equal(frontSegments(0, TERRAIN_MATERIAL.Stone, 24, 0).length, 1, 'a raised rock step keeps its own material');
});

const block = (heights, topsoil = 0, stoneTop = -8) => ({ heights, topsoil, stoneTop });

test('merging a delta frame adds, replaces and drops subdivided columns without mutating the old frame', () => {
    const first = mergeTerrainFrame(null, { revision: 5, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0],
        fine: [{ index: 1, heights: new Array(64).fill(-2), topsoil: 0, stoneTop: -8 }] });
    assert.equal(first.revision, 5);
    assert.equal(first.fine.size, 1);
    const second = mergeTerrainFrame(first, { revision: 9, columns: 2, rows: 2, surface: [0, -1, 0, 0], material: [0, 0, 0, 0],
        fine: [{ index: 2, heights: new Array(64).fill(-1), topsoil: 0, stoneTop: -8 }, { index: 1, heights: [], topsoil: 0, stoneTop: -8 }] });
    assert.deepEqual([...second.fine.keys()], [2], 'an empty block drops the overlay');
    assert.deepEqual([...first.fine.keys()], [1], 'the previous frame is untouched');
    assert.equal(second.revision, 9);
    assert.equal(mergeTerrainFrame(first, null), first, 'no news keeps the old frame');
    assert.equal(mergeTerrainFrame(undefined, null), null);
});

test('microcolumn height reads the overlay and falls back to the whole column', () => {
    const heights = new Array(64).fill(0); heights[3 * 8 + 5] = -6;
    const frame = { columns: 2, rows: 1, surface: [-2, 4], material: [0, 2], fine: new Map([[0, block(heights)]]) };
    assert.equal(microHeight(frame, 0, 0, 5, 3), -6);
    assert.equal(microHeight(frame, 0, 0, 0, 0), 0);
    assert.equal(microHeight(frame, 1, 0, 7, 7), 4, 'a whole column answers with its single height');
});

test('a microcolumn is stone at or below the stone line, otherwise its topsoil; rock and lava never change', () => {
    assert.equal(microMaterial(block([], 0, -8), 0), TERRAIN_MATERIAL.Soil);
    assert.equal(microMaterial(block([], 0, -8), -8), TERRAIN_MATERIAL.Stone);
    assert.equal(microMaterial(block([], 1, -8), -3), TERRAIN_MATERIAL.Ash);
    assert.equal(microMaterial(block([], 2, 16), 16), TERRAIN_MATERIAL.Stone);
    assert.equal(microMaterial(block([], 3, -8), -20), TERRAIN_MATERIAL.Lava);
});

test('a subdivided column paints 64 four-pixel microcolumn tops, round craters exposing dirt inside one block', () => {
    const heights = new Array(64).fill(0);
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) heights[y * 8 + x] = -3;
    const ctx = recorder();
    const terrain = { revision: 1, columns: 1, rows: 1, surface: [0], material: [0], fine: new Map([[0, block(heights)]]) };
    paintTerrain(ctx, terrain, 0, 0, false);
    const rects = ctx.calls.filter(call => call[0] === 'fillRect');
    const tops = rects.filter(call => call[3] === 4 && call[4] === 4);
    assert.equal(tops.length, 64, 'one 4x4 top per microcolumn');
    const pit = tops.find(call => call[1] === 2 * 4 && call[2] === 2 * 4 + 12);
    assert.ok(pit, 'a dug microcolumn sits 3 microcells (12 px) lower');
    const grass = tops.find(call => call[1] === 0 && call[2] === 0);
    assert.notEqual(grass[5], pit[5], 'grass on the rim, dirt in the bowl');
    const fronts = rects.filter(call => call[3] === 4 && call[4] !== 4);
    assert.ok(fronts.length >= 4, 'the bowl exposes strata on its inner wall');
});

test('whole columns behind a subdivided one draw their front per microcolumn', () => {
    const heights = new Array(64).fill(0);
    for (let x = 0; x < 8; x++) heights[x] = -4;
    const ctx = recorder();
    const terrain = { revision: 1, columns: 1, rows: 2, surface: [0, -1], material: [0, 0], fine: new Map([[1, block(heights)]]) };
    paintTerrain(ctx, terrain, 0, 0, false);
    const frontsOfFirst = ctx.calls.filter(call => call[0] === 'fillRect' && call[2] === 32 && call[3] === 4 && call[4] === 16 && call[1] < 32);
    assert.equal(frontsOfFirst.length, 8, 'eight 4 px wide front slices, one per microcolumn, each 16 px tall');
});

test('the inset overlay outlines a dug block per microcolumn at that microcolumn height', () => {
    const heights = new Array(64).fill(0); heights[0] = -3;
    const ctx = Object.assign(recorder(), { strokeRect(x, y, w, h) { this.calls.push(['strokeRect', x, y, w, h]); } });
    const terrain = { revision: 1, columns: 1, rows: 1, surface: [0], material: [0], fine: new Map([[0, { heights, topsoil: 0, stoneTop: -8 }]]) };
    const outlined = drawBlockInsetOverlay(ctx, terrain, { x: 0, y: 0, width: 32, height: 32 });
    const strokes = ctx.calls.filter(call => call[0] === 'strokeRect');
    assert.equal(outlined, 64, 'one outline per microcolumn');
    assert.equal(strokes.length, 64);
    assert.deepEqual(strokes[0].slice(1), [0.5, 12.5, 3, 3], 'the dug corner sits 3 microcells (12 px) lower');
    assert.deepEqual(strokes[1].slice(1), [4.5, 0.5, 3, 3]);
});

test('depth cues: a contact shadow at the foot of a raised face and a lit lip along its top edge, in whole microcells', () => {
    const ctx = recorder();
    paintTerrain(ctx, frame(1, 2, [8, 0]), 0, undefined, false);
    const shadows = ctx.cues.filter(call => call[5].includes('.34'));
    assert.equal(shadows.length, 1, 'a metre-tall face casts the strong contact shadow');
    assert.deepEqual(shadows[0].slice(1, 5), [0, 32, 32, 4], 'one microcell row at the foot of the face, the full width of the block');
    assert.ok(ctx.cues.some(call => call[5].includes('.2)') && call[2] === 36 && call[4] === 4), 'the second row is the softer step');
    const lips = ctx.cues.filter(call => call[5].includes('.12'));
    assert.deepEqual(lips.map(call => call.slice(1, 5)), [[0, -4, 32, 4]], 'the top edge above the drop is lit');
    const flat = recorder();
    paintTerrain(flat, frame(2, 2, [0, 0, 0, 0]), 0);
    assert.equal(flat.cues.length, 0, 'flat ground carries no cues');
    const gentle = recorder();
    paintTerrain(gentle, frame(1, 2, [1, 0]), 0);
    assert.equal(gentle.cues.length, 0, 'a one-step rise is too small to shade');
});

test('depth cues work per microcolumn inside a dug block: crater walls are shadowed where they rise', () => {
    const heights = new Array(64).fill(0);
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) heights[y * 8 + x] = -4;
    const ctx = recorder();
    paintTerrain(ctx, { revision: 1, columns: 1, rows: 1, surface: [0], material: [0], fine: new Map([[0, block(heights)]]) }, 0, 0, false);
    const shadowed = ctx.cues.filter(call => call[5].includes('.2)') && call[3] === 4 && call[4] === 4);
    assert.ok(shadowed.length >= 4, 'the floor microcells under the far wall are shadowed');
    for (const call of ctx.cues) assert.ok(call[3] % 4 === 0 && call[4] % 4 === 0, 'cues are whole microcells');
});

test('raised soil is grass-capped, not bare ground', () => {
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Soil, 5), GRASS_TOP[0]);
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Soil, 0), GRASS_TOP[0]);
    assert.notEqual(topFaceColor(0, TERRAIN_MATERIAL.Soil, -1), GRASS_TOP[0]);
});
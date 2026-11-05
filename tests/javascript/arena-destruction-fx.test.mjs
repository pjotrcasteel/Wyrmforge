import test from 'node:test';
import assert from 'node:assert/strict';
import { craterEvents, createDestructionFx, observeTerrain, heatStrength, heatColor, chipPosition, pruneDestructionFx, drawDestructionFx, drawBedrockGlow,
    fireZoneIntensity, drawFireZoneVignette, drawCrackGlow, paintGroundEmissive, FIRE_ZONE_EDGE_ALPHA, MAX_CHIPS, MAX_HEAT_SPOTS, HEAT_SECONDS } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-destruction-fx.js';
import { mergeTerrainFrame, crackCells, paintTerrain, TERRAIN_MATERIAL, crackPixels, CRACK_DARK, CRACK_HOT, topFaceColor, BEDROCK_MICROCELLS, BEDROCK_TOP } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';
import { readArenaDebugFlags } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-debug.js';

const whole = (columns, rows, height = 0) => ({ revision: 1, columns, rows, surface: new Array(columns * rows).fill(height),
    material: new Array(columns * rows).fill(0), fine: new Map(), changed: [] });
const bowl = (depth, cells = [[3, 3], [4, 3], [3, 4], [4, 4]]) => {
    const heights = new Array(64).fill(0);
    for (const [x, y] of cells) heights[y * 8 + x] = -depth;
    return { index: 1, heights, topsoil: 0, stoneTop: -8 };
};

function recorder() {
    const calls = [];
    return { calls, save() {}, restore() {}, fillRect(...a) { calls.push(['fillRect', ...a, this.fillStyle, this.globalAlpha]); },
        createRadialGradient(...a) { calls.push(['gradient', ...a]); return { addColorStop() {} }; } };
}

test('a merge records which fine blocks the delta touched', () => {
    const first = mergeTerrainFrame(null, { revision: 1, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [] });
    assert.deepEqual(first.changed, []);
    const next = mergeTerrainFrame(first, { revision: 2, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    assert.deepEqual(next.changed, [1]);
});

test('a crater event is centred on the microcolumns that got lower and sized by how many', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const [event] = craterEvents(previous, next);
    assert.equal(event.count, 4);
    assert.equal(event.depth, 12);
    assert.equal(event.x, 32 + 4 * 4, 'x is the centre of the 2x2 dug microcolumns inside block 1');
    assert.equal(event.y, 4 * 4 - (-3) * 4, 'y is the ground position raised by the (negative) height: 3 microcells deeper reads lower');
    assert.equal(event.stone, false, 'a shallow bowl exposes dirt');
    assert.equal(craterEvents(previous, mergeTerrainFrame(previous, { revision: 8, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(9)] }))[0].stone, true,
        'a bowl past the stone line exposes stone');
});

test('only microcolumns that got lower count: a repeated identical frame makes no crater', () => {
    const previous = whole(2, 1);
    const first = mergeTerrainFrame(previous, { revision: 2, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const again = mergeTerrainFrame(first, { revision: 3, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    assert.equal(craterEvents(first, again).length, 0);
    assert.equal(craterEvents(null, null).length, 0);
});

test('a crater heats the rock and throws deterministic chips, bounded in number and lifetime', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const a = createDestructionFx(), b = createDestructionFx();
    observeTerrain(a, previous, next, 10); observeTerrain(b, previous, next, 10);
    assert.equal(a.heat.length, 1);
    assert.ok(a.chips.length >= 4 && a.chips.length <= 16);
    assert.deepEqual(a.chips, b.chips, 'the same delta throws the same chips');
    assert.ok(a.chips.some(chip => chip.ember) && a.chips.some(chip => !chip.ember), 'embers and earth');
    for (let i = 0; i < 200; i++) observeTerrain(a, previous, mergeTerrainFrame(previous, { revision: 100 + i, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] }), 10);
    assert.ok(a.chips.length <= MAX_CHIPS && a.heat.length <= MAX_HEAT_SPOTS);
    assert.equal(pruneDestructionFx(a, 10 + HEAT_SECONDS + 1), false, 'everything expires');
});

test('reduced motion keeps a short heat glow and throws no chips', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const fx = createDestructionFx();
    observeTerrain(fx, previous, next, 0, true);
    assert.equal(fx.chips.length, 0);
    assert.ok(fx.heat[0].life < HEAT_SECONDS);
});

test('heat is brightest at impact and fades monotonically to nothing', () => {
    assert.equal(heatStrength(0), 1);
    assert.ok(heatStrength(1) > heatStrength(3) && heatStrength(3) > heatStrength(6));
    assert.equal(heatStrength(HEAT_SECONDS), 0);
    assert.equal(heatStrength(-1), 0);
});

test('chips arc upward then fall under gravity and always sit on the 4 px voxel grid', () => {
    const chip = { x: 0, y: 0, vx: 10, vy: -100, born: 0, life: 1 };
    assert.ok(chipPosition(chip, .1).y < 0, 'rising');
    assert.ok(chipPosition(chip, .9).y > chipPosition(chip, .4).y, 'falling later');
    for (const time of [0, .13, .37, .5, .91]) {
        const { x, y } = chipPosition(chip, time);
        assert.equal(Math.abs(x % 4), 0); assert.equal(Math.abs(y % 4), 0);
    }
});

test('the heat ramp has four whole colour steps and goes out', () => {
    const steps = new Set([.9, .6, .4, .2].map(heatColor));
    assert.equal(steps.size, 4, 'four distinct steps, nothing smooth in between');
    assert.equal(heatColor(.05), null);
    assert.equal(heatColor(.2), heatColor(.15), 'a step holds its colour across a range');
});

test('a crater is drawn as whole 4 px microcells with no gradient, only for what is on screen', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const fx = createDestructionFx();
    observeTerrain(fx, previous, next, 0);
    assert.equal(fx.heat[0].cells.length, 4, 'one hot cell per dug microcolumn');
    assert.ok(fx.heat[0].rim.length >= 8, 'the neighbouring microcolumns form the faint outer glow');
    const ctx = recorder();
    const drawn = drawDestructionFx(ctx, fx, .1, { x: 0, y: 0, width: 390, height: 844 });
    assert.ok(drawn > 4);
    assert.equal(ctx.calls.filter(call => call[0] === 'gradient').length, 0, 'no smooth gradients');
    const squares = ctx.calls.filter(call => call[0] === 'fillRect');
    assert.ok(squares.length > 0);
    for (const call of squares) {
        assert.equal(call[3], 4); assert.equal(call[4], 4);
        assert.equal(call[1] % 4, 0); assert.equal(call[2] % 4, 0);
    }
    const awayDrawn = drawDestructionFx(recorder(), fx, .1, { x: 5000, y: 5000, width: 390, height: 844 });
    assert.equal(awayDrawn, fx.chips.length, 'off-screen craters draw no heat cells, only the airborne chips remain');
});
test('fire-zone heat rises with the Wyrm Influence band, is silent in the wet land and is drawn as stepped rings', () => {
    assert.equal(fireZoneIntensity(0, 3), 0);
    for (let band = 1; band < 4; band++) assert.ok(FIRE_ZONE_EDGE_ALPHA[band] > FIRE_ZONE_EDGE_ALPHA[band - 1]);
    assert.ok(fireZoneIntensity(3, 1) > fireZoneIntensity(2, 1) && fireZoneIntensity(2, 1) > fireZoneIntensity(1, 1));
    assert.equal(fireZoneIntensity(3, 1, true), FIRE_ZONE_EDGE_ALPHA[3], 'reduced motion holds a steady glow');
    assert.ok(fireZoneIntensity(3, 2) < .3, 'stays a glow, never an overlay that hides the Hunt');
    const quiet = recorder();
    assert.equal(drawFireZoneVignette(quiet, 390, 844, 0, 1), 0);
    assert.equal(quiet.calls.length, 0);
    const hot = recorder();
    assert.ok(drawFireZoneVignette(hot, 390, 844, 3, 1) > 0);
    assert.equal(hot.calls.filter(call => call[0] === 'gradient').length, 0, 'no smooth gradient');
    const strips = hot.calls.filter(call => call[0] === 'fillRect');
    assert.equal(strips.length, 12, 'three rings of four strips');
    for (const call of strips) assert.ok(call[3] === 8 || call[4] === 8, 'every ring is exactly two microcells (8 px) thick');
});

// A small network like the C# generator produces: a main crack with a fork, in global microcells.
const network = () => [[10, 10, 11, 10, 12, 10, 12, 11, 12, 12, 13, 12, 14, 12], [12, 12, 12, 13, 12, 14]];

test('crack cells are whole microcells: each path cell is a core, every neighbour not on a crack is halo, shared cells are not doubled', () => {
    const cells = crackCells(network());
    const core = cells.filter(cell => cell.kind === 'core'), halo = cells.filter(cell => cell.kind === 'halo');
    assert.equal(core.length, 9, 'the fork shares the cell where it leaves the main crack');
    assert.equal(new Set(cells.map(cell => cell.y * 4096 + cell.x)).size, cells.length, 'no cell appears twice');
    const coreKeys = new Set(core.map(cell => cell.y * 4096 + cell.x));
    for (const cell of halo) {
        assert.ok(!coreKeys.has(cell.y * 4096 + cell.x));
        assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => coreKeys.has((cell.y + dy) * 4096 + cell.x + dx)), 'a halo touches the glowing core');
    }
    assert.deepEqual(crackCells([]), []);
    assert.deepEqual(crackCells(undefined), []);
    const same = network();
    assert.equal(crackCells(same), crackCells(same), 'cached per network');
});

test('crack glow is additive, only where the ground has cracked, drawn as 4 px cells on the block grid, skipping lava and dug blocks', () => {
    const terrain = { ...whole(8, 8), cracks: network() };
    const view = { x: 0, y: 0, width: 256, height: 256 };
    const draw = (band, frame = terrain) => { const ctx = Object.assign(recorder(), { globalCompositeOperation: 'source-over' }); return { ctx, cells: drawCrackGlow(ctx, frame, band, view, 1) }; };
    assert.equal(draw(0).cells, 0, 'no glow in the wet land');
    const scorched = draw(1), burning = draw(2), volcanic = draw(3);
    assert.ok(scorched.cells > 0 && burning.cells === scorched.cells);
    const colours = ctx => new Set(ctx.calls.filter(call => call[0] === 'fillRect').map(call => call[5]));
    assert.notDeepEqual([...colours(scorched.ctx)], [...colours(volcanic.ctx)], 'hotter bands glow in hotter colours');
    for (const call of volcanic.ctx.calls.filter(call => call[0] === 'fillRect')) {
        assert.equal(call[3], 4); assert.equal(call[4], 4); assert.equal(call[1] % 4, 0); assert.equal(call[2] % 4, 0);
    }
    const lava = { ...terrain, material: new Array(64).fill(TERRAIN_MATERIAL.Lava) };
    assert.equal(draw(3, lava).cells, 0, 'lava is already a light source');
    const dug = { ...terrain, fine: new Map(Array.from({ length: 64 }, (_, index) => [index, { heights: new Array(64).fill(BEDROCK_MICROCELLS), topsoil: 0, stoneTop: -8 }])) };
    assert.equal(draw(3, dug).cells, 0, 'cells dug down to bedrock lose their vein');
    const shaped = { ...terrain, fine: new Map(Array.from({ length: 64 }, (_, index) => [index, { heights: new Array(64).fill(3), topsoil: 0, stoneTop: -8 }])) };
    assert.ok(draw(3, shaped).cells > 0, 'shaped ground keeps its veins, drawn at the microcolumn height');
    assert.equal(drawCrackGlow(recorder(), { ...whole(8, 8), cracks: [] }, 3, view, 1), 0);
    assert.equal(drawCrackGlow(recorder(), null, 3, view, 1), 0);
    const far = Object.assign(recorder(), { globalCompositeOperation: 'source-over' });
    assert.equal(drawCrackGlow(far, terrain, 3, { x: 5000, y: 5000, width: 100, height: 100 }, 1), 0, 'off-screen cracks draw nothing');
});

test('a crack network survives merges and is raised ground-aware', () => {
    const first = mergeTerrainFrame(null, { revision: 1, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0], fine: [], cracks: network() });
    assert.equal(first.cracks.length, 2);
    const next = mergeTerrainFrame(first, { revision: 2, columns: 2, rows: 2, surface: [0, 0, 0, 0], material: [0, 0, 0, 0], fine: [] });
    assert.equal(next.cracks, first.cracks, 'later deltas carry no network and keep the first');
    const raised = { ...whole(8, 8, 8), cracks: network() };
    const ctx = Object.assign(recorder(), { globalCompositeOperation: 'source-over' });
    drawCrackGlow(ctx, raised, 3, { x: 0, y: 0, width: 256, height: 256 }, 1);
    assert.ok(ctx.calls.filter(call => call[0] === 'fillRect').every(call => call[2] < 10 * 4 + 4 * 4 - 32 + 4 * 4 + 40), 'cells sit on the raised top face, 32 px higher than at ground level');
});
test('bedrock reads smooth and dark and carries a faint voxel-aligned cold glow', () => {
    assert.equal(topFaceColor(0, TERRAIN_MATERIAL.Soil, BEDROCK_MICROCELLS), BEDROCK_TOP);
    assert.equal(topFaceColor(3, TERRAIN_MATERIAL.Stone, BEDROCK_MICROCELLS - 3), BEDROCK_TOP);
    assert.notEqual(topFaceColor(0, TERRAIN_MATERIAL.Soil, BEDROCK_MICROCELLS + 1), BEDROCK_TOP);
    const heights = new Array(64).fill(-10); heights[27] = BEDROCK_MICROCELLS;
    const frame = { columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: new Map([[1, { heights, topsoil: 0, stoneTop: -8 }]]) };
    const ctx = Object.assign(recorder(), { globalCompositeOperation: 'source-over' });
    const lit = drawBedrockGlow(ctx, frame, { x: 0, y: 0, width: 256, height: 400 }, 1);
    assert.equal(lit, 5, 'the bedrock cell and its four neighbours');
    const alphas = ctx.calls.filter(call => call[0] === 'fillRect').map(call => call[6]);
    assert.ok(Math.max(...alphas) < .2, 'faint, never competing with fire');
    for (const call of ctx.calls.filter(call => call[0] === 'fillRect')) { assert.equal(call[1] % 4, 0); assert.equal(call[2] % 4, 0); }
    assert.equal(drawBedrockGlow(recorder(), { ...frame, fine: new Map([[1, { heights: new Array(64).fill(-10), topsoil: 0, stoneTop: -8 }]]) }, { x: 0, y: 0, width: 256, height: 400 }, 1), 0, 'no bedrock, no glow');
});
test('the band debug flag accepts only 0 to 3', () => {
    assert.equal(readArenaDebugFlags('').band, null);
    assert.equal(readArenaDebugFlags('?band=3').band, 3);
    assert.equal(readArenaDebugFlags('?band=0').band, 0);
    assert.equal(readArenaDebugFlags('?band=4').band, null);
    assert.equal(readArenaDebugFlags('?band=x').band, null);
});

test('crack stages grow with stone wear and stage 3 shows a hot ember pixel', () => {
    assert.deepEqual(crackPixels(0), []);
    assert.deepEqual(crackPixels(undefined), []);
    assert.ok(crackPixels(1).length < crackPixels(2).length && crackPixels(2).length < crackPixels(3).length);
    assert.ok(crackPixels(2).every(pixel => pixel.color === CRACK_DARK));
    assert.ok(crackPixels(3).some(pixel => pixel.color === CRACK_HOT), 'about to break: it glows');
    for (const pixel of crackPixels(3)) assert.ok(pixel.x >= 0 && pixel.y >= 0 && pixel.x + pixel.w <= 4 && pixel.y + pixel.h <= 4, 'inside one 4 px microcolumn');
});

test('worn stone microcolumns are painted cracked and the wear survives a merge', () => {
    const heights = new Array(64).fill(0);
    const wear = new Array(64).fill(1);
    const merged = mergeTerrainFrame(null, { revision: 1, columns: 1, rows: 1, surface: [0], material: [2], fine: [{ index: 0, heights, topsoil: 2, stoneTop: -8, wear }] });
    assert.deepEqual(merged.fine.get(0).wear, wear);
    const ctx = Object.assign(recorder(), { translate() {} });
    const plain = Object.assign(recorder(), { translate() {} });
    const painted = paintTerrain(ctx, merged, 0, 0);
    paintTerrain(plain, { ...merged, fine: new Map([[0, { ...merged.fine.get(0), wear: null }]]) }, 0, 0);
    const cracked = (painted - plain.calls.length) / crackPixels(3).length;
    assert.ok(Number.isInteger(cracked) && cracked >= 16 && cracked <= 40, `cracks show on about two worn microcolumns in five, not on every one: ${cracked} of 64`);
    const hot = ctx.calls.filter(call => call[0] === 'fillRect' && call[5] === CRACK_HOT);
    assert.equal(hot.length, cracked, 'one point of wear means the next hit breaks it, so every shown crack carries its ember');
    assert.equal(mergeTerrainFrame(null, { revision: 1, columns: 1, rows: 1, surface: [0], material: [0], fine: [{ index: 0, heights, topsoil: 0, stoneTop: -8 }] }).fine.get(0).wear, null);
});
test('heat and debris can be drawn apart: the glow goes to the emissive map, the chips stay on the unlit overlay', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const fx = createDestructionFx();
    observeTerrain(fx, previous, next, 0);
    const view = { x: 0, y: 0, width: 390, height: 844 };
    const heat = drawDestructionFx(recorder(), fx, .1, view, 'heat');
    const chips = drawDestructionFx(recorder(), fx, .1, view, 'chips');
    assert.ok(heat > 0 && chips > 0);
    assert.equal(chips, fx.chips.length, 'only the airborne chips');
    assert.equal(heat + chips, drawDestructionFx(recorder(), fx, .1, view, 'all'));
});

test('the ground emissive map is an opaque black canvas with the glows drawn in world coordinates', () => {
    const created = [];
    const calls = [];
    globalThis.document = { createElement() {
        const canvas = { width: 0, height: 0, getContext() { return {
            setTransform: () => calls.push(['setTransform']), translate: (x, y) => calls.push(['translate', x, y]),
            save() {}, restore() {}, fillRect(...a) { calls.push(['fillRect', ...a, this.fillStyle]); } }; } };
        created.push(canvas); return canvas;
    } };
    try {
        const holder = {};
        const frame = { ...whole(8, 8), cracks: network() };
        const view = { x: 16, y: 8, width: 120, height: 200 };
        const first = paintGroundEmissive(holder, frame, null, 3, view, 1);
        assert.equal(first.canvas.width, 120); assert.equal(first.canvas.height, 200);
        assert.equal(calls.find(call => call[0] === 'fillRect')[5], '#000000', 'black background so only glowing cells are emissive');
        assert.deepEqual(calls.find(call => call[0] === 'translate'), ['translate', -16, -8], 'world cells land at their camera-relative pixels');
        assert.ok(first.seams > 0, 'the vein cells were drawn onto it');
        assert.equal(paintGroundEmissive(holder, frame, null, 3, view, 2).canvas, first.canvas, 'the canvas is reused between frames');
        assert.equal(created.length, 1);
    } finally { delete globalThis.document; }
});
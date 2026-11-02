import test from 'node:test';
import assert from 'node:assert/strict';
import { craterEvents, createDestructionFx, observeTerrain, heatStrength, chipPosition, pruneDestructionFx, drawDestructionFx,
    fireZoneIntensity, drawFireZoneVignette, drawVeinGlow, FIRE_ZONE_EDGE_ALPHA, MAX_CHIPS, MAX_HEAT_SPOTS, HEAT_SECONDS } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-destruction-fx.js';
import { mergeTerrainFrame, veinSegments, VEIN_CHANCE, paintTerrain, TERRAIN_MATERIAL } from
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

test('chips arc upward then fall under gravity', () => {
    const chip = { x: 0, y: 0, vx: 10, vy: -100, born: 0, life: 1 };
    assert.ok(chipPosition(chip, .1).y < 0, 'rising');
    assert.ok(chipPosition(chip, .9).y > chipPosition(chip, .4).y, 'falling later');
    assert.equal(chipPosition(chip, .5).x, 5);
});

test('drawing paints glow gradients and whole-pixel chips only for what is on screen', () => {
    const previous = whole(2, 1);
    const next = mergeTerrainFrame(previous, { revision: 7, columns: 2, rows: 1, surface: [0, 0], material: [0, 0], fine: [bowl(3)] });
    const fx = createDestructionFx();
    observeTerrain(fx, previous, next, 0);
    const ctx = recorder();
    const drawn = drawDestructionFx(ctx, fx, .1, { x: 0, y: 0, width: 390, height: 844 });
    assert.ok(drawn > 1);
    assert.equal(ctx.calls.filter(call => call[0] === 'gradient').length, 1);
    for (const call of ctx.calls.filter(call => call[0] === 'fillRect' && call[3] <= 3)) assert.ok(Number.isInteger(call[1]) && Number.isInteger(call[2]), 'chips are pixel aligned');
    const away = recorder();
    drawDestructionFx(away, fx, .1, { x: 5000, y: 5000, width: 390, height: 844 });
    assert.equal(away.calls.filter(call => call[0] === 'gradient').length, 0, 'off-screen craters draw no glow');
});

test('fire-zone heat rises with the Wyrm Influence band and is silent in the wet land', () => {
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
    assert.equal(hot.calls.filter(call => call[0] === 'fillRect').length, 1);
});

test('ember veins appear only in hot bands, are deterministic and stay inside the top face', () => {
    assert.deepEqual(veinSegments(4, 5, 0), []);
    assert.deepEqual(veinSegments(4, 5, 1), []);
    let hot = 0, burning = 0;
    for (let row = 0; row < 40; row++) for (let column = 0; column < 32; column++) {
        const volcanic = veinSegments(column, row, 3);
        assert.deepEqual(volcanic, veinSegments(column, row, 3));
        if (volcanic.length) hot++;
        if (veinSegments(column, row, 2).length) burning++;
        for (const piece of volcanic) assert.ok(piece.x >= 0 && piece.y >= 0 && piece.x + piece.w <= 32 && piece.y + piece.h <= 32);
    }
    const cells = 40 * 32;
    assert.ok(Math.abs(hot / cells - VEIN_CHANCE[3]) < .06, `volcanic share ${hot / cells}`);
    assert.ok(Math.abs(burning / cells - VEIN_CHANCE[2]) < .05, `burning share ${burning / cells}`);
    assert.ok(hot > burning);
});

test('vein glow is additive, only in hot bands, skips lava and dug blocks, and stays on screen', () => {
    const terrain = whole(8, 8);
    const view = { x: 0, y: 0, width: 256, height: 256 };
    const draw = (band, frame = terrain) => { const ctx = Object.assign(recorder(), { globalCompositeOperation: 'source-over' }); return { ctx, seams: drawVeinGlow(ctx, frame, band, view, 1) }; };
    assert.equal(draw(0).seams, 0);
    assert.equal(draw(1).seams, 0);
    const hot = draw(3);
    assert.ok(hot.seams > 0, 'volcanic ground glows');
    assert.ok(draw(2).seams <= hot.seams + 8);
    const lava = { ...terrain, material: new Array(64).fill(TERRAIN_MATERIAL.Lava) };
    assert.equal(draw(3, lava).seams, 0, 'lava is already a light source');
    const dug = { ...terrain, fine: new Map(Array.from({ length: 64 }, (_, index) => [index, { heights: new Array(64).fill(-1), topsoil: 0, stoneTop: -8 }])) };
    assert.equal(draw(3, dug).seams, 0, 'dug blocks carry their own crater heat instead');
    assert.equal(drawVeinGlow(recorder(), null, 3, view, 1), 0);
    for (const call of hot.ctx.calls.filter(call => call[0] === 'fillRect')) assert.ok(Number.isInteger(call[1]) && Number.isInteger(call[2]), 'pixel aligned');
});
test('the band debug flag accepts only 0 to 3', () => {
    assert.equal(readArenaDebugFlags('').band, null);
    assert.equal(readArenaDebugFlags('?band=3').band, 3);
    assert.equal(readArenaDebugFlags('?band=0').band, 0);
    assert.equal(readArenaDebugFlags('?band=4').band, null);
    assert.equal(readArenaDebugFlags('?band=x').band, null);
});

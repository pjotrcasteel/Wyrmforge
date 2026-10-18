import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEnemyTelegraph } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';
import { drawBlackIce, drawSplinterBloom, drawIceLance, drawPlayerChill, drawAvalancheWave, drawSnowCloud, drawRimeHusk, drawRimeArmor, isFrostTelegraph, FROST } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-frost-vfx.js';

function mockContext() {
    const calls = [];
    return new Proxy({ calls }, {
        get(target, key) {
            if (key in target) return target[key];
            return (...args) => calls.push([key, ...args]);
        },
        set(target, key, value) { calls.push(['set', key, value]); return true; },
    });
}

test('frost telegraph kinds are routed through the shared enemy telegraph entry point', () => {
    for (const kind of ['skitter', 'ice-lance', 'black-ice', 'flank-pounce', 'avalanche', 'rime-hymn', 'reknit', 'stillness', 'glass-step', 'shiver-cut', 'shiver-slash']) {
        assert.ok(isFrostTelegraph(kind));
        const ctx = mockContext();
        drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind, progress: .5, targetX: 120, targetY: 0, radius: 7 } });
        assert.ok(ctx.calls.length > 0, kind);
    }
    assert.equal(isFrostTelegraph('pounce'), false);
});

test('ice lance lane is drawn at the reported half-width and previews the bloom radius at its end', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 10, y: 10, telegraph: { kind: 'ice-lance', progress: .25, targetX: 310, targetY: 10, radius: 7 } });
    assert.deepEqual(ctx.calls.find(c => c[0] === 'strokeRect').slice(1), [0, -7, 300, 14]);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'arc').slice(1, 4), [300, 0, FROST.bloomRadius]);
});

test('black ice glaze and patch use the exact reported radius', () => {
    const glaze = mockContext();
    drawEnemyTelegraph(glaze, { x: 0, y: 0, telegraph: { kind: 'black-ice', progress: .4, targetX: 50, targetY: 60, radius: 52 } });
    assert.deepEqual(glaze.calls.find(c => c[0] === 'arc').slice(1, 4), [50, 60, 52]);
    const patch = mockContext();
    drawBlackIce(patch, { x: 5, y: 6, radius: 52, life: .5 }, 1);
    assert.deepEqual(patch.calls.find(c => c[0] === 'ellipse').slice(1, 4), [5, 6, 52]);
});

test('splinter bloom shows its exact ring while charging and fades after the burst', () => {
    const charging = mockContext();
    drawSplinterBloom(charging, { x: 1, y: 2, radius: 40, charge: .5, burst: false, fade: 0 });
    assert.deepEqual(charging.calls.find(c => c[0] === 'arc').slice(1, 4), [1, 2, 40]);
    const burst = mockContext();
    drawSplinterBloom(burst, { x: 1, y: 2, radius: 40, charge: 1, burst: true, fade: .5 });
    assert.ok(burst.calls.some(c => c[0] === 'fill'));
});

test('player chill draws one crystal per stack and nothing when warm', () => {
    const warm = mockContext();
    drawPlayerChill(warm, { x: 0, y: 0, radius: 14, chill: 0 });
    assert.equal(warm.calls.length, 0);
    const cold = mockContext();
    drawPlayerChill(cold, { x: 0, y: 0, radius: 14, chill: 3 });
    assert.equal(cold.calls.filter(c => c[0] === 'fill').length, 1 + 3);
});

test('ice lance renders without gradient support', () => {
    const ctx = mockContext();
    drawIceLance(ctx, { x: 100, y: 0, angle: 0, originX: 0, originY: 0 });
    assert.ok(ctx.calls.some(c => c[0] === 'fill'));
});

test('cairn sentinel brace marks exactly its front arc toward the reported facing', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 100, y: 100, telegraph: { kind: 'avalanche', progress: .5, targetX: 100, targetY: 270, radius: 170 } });
    const arc = ctx.calls.find(c => c[0] === 'arc');
    assert.deepEqual(arc.slice(1, 4), [100, 100, 170]);
    assert.ok(Math.abs(arc[4] - (Math.PI / 2 - FROST.braceHalfAngle)) < 1e-9);
    assert.ok(Math.abs(arc[5] - (Math.PI / 2 + FROST.braceHalfAngle)) < 1e-9);
});

test('avalanche wave is drawn at its live radius and snow clouds vanish when spent', () => {
    const wave = mockContext();
    drawAvalancheWave(wave, { x: 0, y: 0, radius: 80, maxRadius: 170, thickness: 22, progress: .5, angle: 0, halfAngle: FROST.braceHalfAngle });
    assert.deepEqual(wave.calls.find(c => c[0] === 'arc').slice(1, 4), [0, 0, 80]);
    const cloud = mockContext();
    drawSnowCloud(cloud, { x: 0, y: 0, radius: 46, life: 0 });
    assert.deepEqual(cloud.calls.find(c => c[0] === 'set' && c[1] === 'globalAlpha').slice(2), [0]);
});

const RED_EDGE = '226, 84, 74';
const strokes = ctx => ctx.calls.filter(c => c[0] === 'set' && c[1] === 'strokeStyle').map(c => c[2]);

test('cantor rites: the hymn is a cold support ring, the stillness verse is a red-edged hit, both at the reported radius', () => {
    const hymn = mockContext();
    drawEnemyTelegraph(hymn, { x: 0, y: 0, telegraph: { kind: 'rime-hymn', progress: .5, targetX: 30, targetY: 40, radius: 200 } });
    assert.deepEqual(hymn.calls.find(c => c[0] === 'arc').slice(1, 4), [30, 40, 200]);
    assert.ok(strokes(hymn).every(s => !s.includes(RED_EDGE)), 'a buff never wears the danger edge');
    const verse = mockContext();
    drawEnemyTelegraph(verse, { x: 0, y: 0, telegraph: { kind: 'stillness', progress: .5, targetX: 0, targetY: 0, radius: 130 } });
    assert.deepEqual(verse.calls.find(c => c[0] === 'arc').slice(1, 4), [0, 0, 130]);
    assert.ok(strokes(verse).some(s => s.includes(RED_EDGE)));
});

test('reknit threads from the cantor to the husk it is mending', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 10, y: 20, radius: 13, telegraph: { kind: 'reknit', progress: .5, targetX: 90, targetY: 80, radius: 14 } });
    assert.deepEqual(ctx.calls.find(c => c[0] === 'moveTo').slice(1), [10, 7]);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'lineTo').slice(1), [90, 80]);
    assert.ok(strokes(ctx).every(s => !s.includes(RED_EDGE)));
});

test('mirror wisp: glass step marks its landing and the shiver cut covers exactly the tested wedge', () => {
    const step = mockContext();
    drawEnemyTelegraph(step, { x: 0, y: 0, telegraph: { kind: 'glass-step', progress: .5, targetX: 50, targetY: 60, radius: 18 } });
    assert.deepEqual(step.calls.find(c => c[0] === 'moveTo').slice(1), [50, 42]);
    const cut = mockContext();
    drawEnemyTelegraph(cut, { x: 100, y: 100, telegraph: { kind: 'shiver-cut', progress: .5, targetX: 174, targetY: 100, radius: 74 } });
    const arc = cut.calls.find(c => c[0] === 'arc');
    assert.deepEqual(arc.slice(1, 4), [100, 100, 74]);
    assert.ok(Math.abs(arc[4] + FROST.cutHalfAngle) < 1e-9 && Math.abs(arc[5] - FROST.cutHalfAngle) < 1e-9);
    assert.ok(strokes(cut).some(s => s.includes(RED_EDGE)));
});

test('rime husks draw at their spot and rime armour only shows on armoured enemies', () => {
    const husk = mockContext();
    drawRimeHusk(husk, { x: 5, y: 6, life: .5 });
    assert.deepEqual(husk.calls.find(c => c[0] === 'ellipse').slice(1, 3), [5, 8]);
    const bare = mockContext();
    drawRimeArmor(bare, { x: 0, y: 0, radius: 11, rimeArmor: 0 });
    assert.equal(bare.calls.length, 0);
    const crusted = mockContext();
    drawRimeArmor(crusted, { x: 0, y: 0, radius: 11, rimeArmor: 1, opacity: 1 });
    assert.ok(crusted.calls.some(c => c[0] === 'stroke'));
});

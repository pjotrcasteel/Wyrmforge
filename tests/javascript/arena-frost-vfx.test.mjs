import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEnemyTelegraph } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';
import { drawBlackIce, drawSplinterBloom, drawIceLance, drawPlayerChill, isFrostTelegraph, FROST } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-frost-vfx.js';

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
    for (const kind of ['skitter', 'ice-lance', 'black-ice']) {
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

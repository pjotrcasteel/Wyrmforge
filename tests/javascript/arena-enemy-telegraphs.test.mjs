import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEnemyTelegraph, drawHostileProjectileGround, drawHostileProjectileEmber } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';

function mockContext() {
    const calls = [];
    const ctx = new Proxy({ calls }, {
        get(target, key) {
            if (key in target) return target[key];
            return (...args) => calls.push([key, ...args]);
        },
        set(target, key, value) { calls.push(['set', key, value]); return true; },
    });
    return ctx;
}

test('no telegraph draws nothing', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 0, y: 0 });
    drawEnemyTelegraph(ctx, null);
    assert.equal(ctx.calls.length, 0);
});

test('pounce lane spans from the hound to the locked landing point at the hound width', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 100, y: 50, telegraph: { kind: 'pounce', progress: .5, targetX: 250, targetY: 50, radius: 13 } });
    assert.deepEqual(ctx.calls.find(c => c[0] === 'translate'), ['translate', 100, 50]);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'rotate'), ['rotate', 0]);
    const rects = ctx.calls.filter(c => c[0] === 'fillRect');
    assert.deepEqual(rects[0], ['fillRect', 0, -13, 150, 26], 'full lane');
    assert.deepEqual(rects[1], ['fillRect', 0, -13, 75, 26], 'charge fill tracks progress');
});

test('lob mark is a circle of exactly the C# impact radius', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind: 'lob', progress: .25, targetX: 40, targetY: 60, radius: 34 } });
    const arcs = ctx.calls.filter(c => c[0] === 'arc');
    assert.deepEqual(arcs[0].slice(1, 4), [40, 60, 34]);
    assert.deepEqual(arcs[1].slice(1, 4), [40, 60, 8.5]);
});

test('embers keep their landing mark on the ground and fly at the reported height', () => {
    const ground = mockContext();
    const ember = { x: 10, y: 20, height: 30, targetX: 80, targetY: 90, radius: 34, progress: .5 };
    drawHostileProjectileGround(ground, ember);
    assert.deepEqual(ground.calls.find(c => c[0] === 'arc').slice(1, 4), [80, 90, 34]);
    assert.deepEqual(ground.calls.find(c => c[0] === 'ellipse').slice(1, 3), [10, 20]);
    const air = mockContext();
    drawHostileProjectileEmber(air, ember);
    assert.deepEqual(air.calls.find(c => c[0] === 'arc').slice(1, 3), [10, -10]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEnemyTelegraph, drawHostileProjectileGround, drawHostileProjectileEmber, drawShieldGuard, drawAshRemains, drawWraithRipple, SHIELD_HALF_ANGLE } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';

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

test('elite grave and echo blasts are ground marks only: no ember ball or shadow', () => {
    for (const style of ['grave', 'echo']) {
        const ground = mockContext();
        const blast = { x: 30, y: 40, height: 0, targetX: 30, targetY: 40, radius: 60, progress: .5, style };
        drawHostileProjectileGround(ground, blast);
        assert.deepEqual(ground.calls.find(c => c[0] === 'arc').slice(1, 4), [30, 40, 60]);
        assert.equal(ground.calls.filter(c => c[0] === 'ellipse').length, 0);
        const air = mockContext();
        drawHostileProjectileEmber(air, blast);
        assert.equal(air.calls.length, 0);
    }
});

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


test('bash wedge spans exactly the C# reach and shield arc toward the locked facing', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 10, y: 20, telegraph: { kind: 'bash', progress: .5, targetX: 76, targetY: 20, radius: 66 } });
    const arcs = ctx.calls.filter(c => c[0] === 'arc');
    assert.deepEqual(arcs[0], ['arc', 0, 0, 66, -SHIELD_HALF_ANGLE, SHIELD_HALF_ANGLE]);
    assert.deepEqual(arcs[1], ['arc', 0, 0, 33, -SHIELD_HALF_ANGLE, SHIELD_HALF_ANGLE]);
    assert.equal(SHIELD_HALF_ANGLE, Math.PI / 3);
});

test('heal tether links the priest to its locked ally and closes with the cast', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind: 'heal', progress: .25, targetX: 80, targetY: 0, radius: 8 } });
    assert.ok(ctx.calls.some(c => c[0] === 'lineTo' && c[1] === 80 && c[2] === 0));
    const ring = ctx.calls.find(c => c[0] === 'arc');
    assert.deepEqual(ring.slice(1, 4), [80, 0, 13]);
    assert.equal(ring[5] - ring[4], Math.PI / 2);
});

test('revive circle sits on the remains at the ritual radius', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind: 'revive', progress: 1, targetX: 40, targetY: 50, radius: 100 } });
    assert.deepEqual(ctx.calls.find(c => c[0] === 'arc').slice(1, 4), [40, 50, 100]);
});

test('shield guard draws only for a raised shield', () => {
    const none = mockContext();
    drawShieldGuard(none, { x: 0, y: 0, radius: 19, shieldFacing: null });
    drawShieldGuard(none, { x: 0, y: 0, radius: 19 });
    assert.equal(none.calls.length, 0);
    const ctx = mockContext();
    drawShieldGuard(ctx, { x: 5, y: 6, radius: 19, shieldFacing: Math.PI });
    assert.deepEqual(ctx.calls.find(c => c[0] === 'arc'), ['arc', 5, 6, 26, Math.PI - SHIELD_HALF_ANGLE, Math.PI + SHIELD_HALF_ANGLE]);
});

test('ash remains fade with their remaining life', () => {
    const fresh = mockContext();
    drawAshRemains(fresh, { x: 0, y: 0, life: 1 });
    const old = mockContext();
    drawAshRemains(old, { x: 0, y: 0, life: 0 });
    const alpha = ctx => ctx.calls.find(c => c[0] === 'set' && c[1] === 'globalAlpha')[2];
    assert.ok(alpha(fresh) > alpha(old));
    drawAshRemains(old, null);
});

test('wraith claw is the same locked wedge as the bash, at the C# reach, with its own cold fill', () => {
    const ctx = mockContext();
    drawEnemyTelegraph(ctx, { x: 10, y: 10, telegraph: { kind: 'claw', progress: .5, targetX: 10, targetY: 70, radius: 60 } });
    const arcs = ctx.calls.filter(c => c[0] === 'arc');
    assert.deepEqual(arcs[0].slice(1, 4), [0, 0, 60]);
    assert.ok(Math.abs(arcs[0][4] - (Math.PI / 2 - SHIELD_HALF_ANGLE)) < 1e-9);
    assert.deepEqual(arcs[1].slice(1, 4), [0, 0, 30], 'charge sweeps out with progress');
    assert.ok(ctx.calls.some(c => c[0] === 'set' && c[1] === 'fillStyle' && String(c[2]).startsWith('rgba(120, 190, 230')));
});

test('wraith ripples are faint while drifting and close onto the body while emerging', () => {
    const drifting = mockContext();
    drawWraithRipple(drifting, { x: 50, y: 60, emerging: false, progress: 0, radius: 12 }, 0);
    assert.equal(drifting.calls.filter(c => c[0] === 'ellipse').length, 2);
    assert.ok(!drifting.calls.some(c => c[0] === 'fill'));
    const rising = mockContext();
    drawWraithRipple(rising, { x: 50, y: 60, emerging: true, progress: 1, radius: 12 }, 0);
    const rings = rising.calls.filter(c => c[0] === 'ellipse');
    for (const [actual, expected] of rings[1].slice(1, 5).map((v, i) => [v, [50, 60, 16.8, 8.4][i]])) assert.ok(Math.abs(actual - expected) < 1e-9);
    drawWraithRipple(rising, null);
});

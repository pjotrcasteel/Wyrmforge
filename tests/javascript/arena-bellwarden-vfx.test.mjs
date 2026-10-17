import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBellWardenGround, drawBellWardenEntrance, drawBellWardenBar, BELL_SHOCKWAVE_THICKNESS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-bellwarden-vfx.js';
import { drawEnemyTelegraph, drawHostileProjectileGround, tollPulsePoints, BELL_TOLL } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';

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

const arcs = ctx => ctx.calls.filter(c => c[0] === 'arc');

test('nothing to draw without a warden or shockwaves', () => {
    const ctx = mockContext();
    drawBellWardenGround(ctx, null);
    drawBellWardenGround(ctx, { enemies: [] });
    drawBellWardenEntrance(ctx, null);
    drawBellWardenEntrance(ctx, { stage: 'fight' });
    drawBellWardenBar(ctx, null, 800);
    drawBellWardenBar(ctx, { stage: 'tolling' }, 800);
    assert.equal(ctx.calls.length, 0);
});

test('the tolling mark sits on the C# spot', () => {
    const ctx = mockContext();
    drawBellWardenGround(ctx, { bellWarden: { stage: 'tolling', x: 320, y: 180, progress: .5 } }, 0, true);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'translate'), ['translate', 320, 180]);
});

test('a charging shockwave shows the crater and its farthest reach, never the band', () => {
    const ctx = mockContext();
    drawBellWardenGround(ctx, { bellShockwaves: [{ x: 10, y: 20, radius: 95, impactRadius: 95, maxRadius: 300, charge: .5, expanding: false }] });
    const radii = arcs(ctx).map(c => c[3]);
    assert.ok(radii.includes(300));
    assert.ok(radii.includes(95));
    assert.ok(!ctx.calls.some(c => c[0] === 'set' && c[1] === 'lineWidth' && c[2] === BELL_SHOCKWAVE_THICKNESS));
});

test('an expanding shockwave draws the hurting band at its exact radius and thickness', () => {
    const ctx = mockContext();
    drawBellWardenGround(ctx, { bellShockwaves: [{ x: 0, y: 0, radius: 180, impactRadius: 95, maxRadius: 300, charge: 1, expanding: true }] });
    const radii = arcs(ctx).map(c => c[3]);
    assert.ok(radii.includes(180));
    assert.ok(radii.includes(180 - BELL_SHOCKWAVE_THICKNESS / 2));
    assert.ok(radii.includes(180 + BELL_SHOCKWAVE_THICKNESS / 2));
});

test('the bar names the crack and marks the half-health notch', () => {
    const ctx = mockContext();
    drawBellWardenBar(ctx, { stage: 'fight', healthRatio: .4, cracked: true }, 800);
    const texts = ctx.calls.filter(c => c[0] === 'fillText').map(c => c[1]);
    assert.ok(texts.some(t => t.startsWith('THE BELL WARDEN') && t.includes('CRACKED')));
});

test('toll lanes preview every pulse at the C# offsets, and the crack fans them into three lanes', () => {
    const enemy = { x: 100, y: 100 };
    const telegraph = { kind: 'bell-toll', progress: .5, targetX: 600, targetY: 100, radius: 40 };
    const points = tollPulsePoints(enemy, telegraph);
    assert.equal(points.length, BELL_TOLL.pulses);
    assert.ok(Math.abs(points[0].x - 170) < 1e-9 && Math.abs(points[5].x - (100 + 70 + 5 * 74)) < 1e-9);
    const one = mockContext();
    drawEnemyTelegraph(one, { ...enemy, telegraph });
    const fan = mockContext();
    drawEnemyTelegraph(fan, { ...enemy, telegraph: { ...telegraph, kind: 'bell-toll-fan' } });
    assert.equal(arcs(fan).length, arcs(one).length * 3);
});

test('smash, rally and crack telegraphs draw; live toll pulses use their mark only', () => {
    for (const kind of ['bell-smash', 'bell-rally', 'bell-crack']) {
        const ctx = mockContext();
        drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind, progress: .5, targetX: 40, targetY: 0, radius: 95 } });
        assert.ok(arcs(ctx).length > 0, kind);
    }
    const ctx = mockContext();
    drawHostileProjectileGround(ctx, { style: 'toll', x: 5, y: 5, targetX: 5, targetY: 5, radius: 40, progress: .5 });
    assert.ok(!ctx.calls.some(c => c[0] === 'ellipse'));
    assert.deepEqual(arcs(ctx)[0].slice(1, 4), [5, 5, 40]);
});

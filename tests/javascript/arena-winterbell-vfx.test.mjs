import test from 'node:test';
import assert from 'node:assert/strict';
import { drawWinterBellGround, drawWinterBellAir, drawWinterRing, isWinterBellTelegraph, WINTER_RING_THICKNESS, ICICLE_DROP_HEIGHT }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-winterbell-vfx.js';
import { drawBellWardenBar, bellVariant } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-bellwarden-vfx.js';
import { drawEnemyTelegraph } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';
import { ENEMY_KIND_COUNT } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-art.js';

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

test('nothing to draw on a road without the winter bell', () => {
    const ctx = mockContext();
    drawWinterBellGround(ctx, null);
    drawWinterBellGround(ctx, { enemies: [] });
    drawWinterBellAir(ctx, null);
    assert.equal(ctx.calls.length, 0);
});

test('a rolling ring is broken exactly at its open lanes, at the hurting thickness', () => {
    const half = 0.3;
    const gaps = [0, 2 * Math.PI / 3, -2 * Math.PI / 3];
    const ctx = mockContext();
    drawWinterRing(ctx, { x: 0, y: 0, radius: 200, maxRadius: 360, thickness: WINTER_RING_THICKNESS, charge: 1, gapAngles: gaps, gapHalfAngle: half });
    const bands = arcs(ctx).filter(c => c[3] === 200);
    assert.equal(bands.length, 3, 'one band arc per segment between lanes');
    for (const [, , , , from, to] of bands) {
        for (const gap of gaps) {
            for (const angle of [gap, gap + 2 * Math.PI]) assert.ok(!(angle > from && angle < to), 'no band crosses a lane');
        }
    }
    assert.ok(ctx.calls.some(c => c[0] === 'set' && c[1] === 'lineWidth' && c[2] === WINTER_RING_THICKNESS));
    // Lanes are lit out to the farthest reach.
    assert.equal(arcs(ctx).filter(c => c[3] === 360).length, 3);
});

test('a charging ring only gathers in the bell, it never draws a band', () => {
    const ctx = mockContext();
    drawWinterRing(ctx, { x: 0, y: 0, radius: 50, maxRadius: 360, thickness: 24, charge: .4, gapAngles: [0], gapHalfAngle: .3 });
    assert.ok(!ctx.calls.some(c => c[0] === 'set' && c[1] === 'lineWidth' && c[2] === 24));
});

test('scars draw along their C# segment and icicles mark then fall onto their spot', () => {
    const ground = mockContext();
    drawWinterBellGround(ground, {
        permafrostScars: [{ x1: 10, y1: 20, x2: 240, y2: 20, halfWidth: 15, life: 1 }],
        icicles: [{ x: 300, y: 100, radius: 40, progress: .5, fallen: false, fade: 0 }],
    });
    assert.deepEqual(ground.calls.find(c => c[0] === 'translate'), ['translate', 10, 20]);
    assert.ok(arcs(ground).some(c => c[1] === 300 && c[2] === 100 && c[3] === 40), 'the mark is the hit radius');

    const air = mockContext();
    drawWinterBellAir(air, { icicles: [{ x: 300, y: 100, radius: 40, progress: 0, fallen: false, fade: 0 }] });
    const tip = air.calls.filter(c => c[0] === 'lineTo').find(c => c[1] === 300);
    assert.equal(tip[2], 100 - ICICLE_DROP_HEIGHT, 'a fresh icicle hangs high above its mark');
    const fallen = mockContext();
    drawWinterBellAir(fallen, { icicles: [{ x: 300, y: 100, radius: 40, progress: 1, fallen: true, fade: .5 }] });
    assert.ok(fallen.calls.some(c => c[0] === 'stroke'));
});

test('every winter telegraph draws through the shared telegraph entry point', () => {
    for (const kind of ['winter-slam', 'winter-toll', 'winter-recall', 'winter-rime']) {
        assert.ok(isWinterBellTelegraph(kind));
        const ctx = mockContext();
        drawEnemyTelegraph(ctx, { x: 0, y: 0, telegraph: { kind, progress: .5, targetX: 40, targetY: 0, radius: 90 } });
        assert.ok(arcs(ctx).length + ctx.calls.filter(c => c[0] === 'ellipse').length > 0, kind);
    }
});

test('the winter variant has its own bar, its own phase name and its own sprite', () => {
    const ctx = mockContext();
    drawBellWardenBar(ctx, { stage: 'fight', healthRatio: .4, cracked: true, variant: 'winter' }, 800);
    const texts = ctx.calls.filter(c => c[0] === 'fillText').map(c => c[1]);
    assert.ok(texts.some(t => t.startsWith('THE BELL OF WINTER') && t.includes('DEEP WINTER')));
    assert.equal(bellVariant({ variant: 'winter' }).kind, 17);
    assert.equal(bellVariant({}).kind, 9, 'the fire Warden stays the default');
    assert.ok(ENEMY_KIND_COUNT > 17, 'kind 17 has a fallback palette');
});

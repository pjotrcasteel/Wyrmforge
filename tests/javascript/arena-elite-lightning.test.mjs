import test from 'node:test';
import assert from 'node:assert/strict';
import { drawLightningTrace, lightningBoltPath, lightningSeed, mulberry32 } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lightning-vfx.js';
import { drawEliteGround, drawEliteCrest, eliteColor, ELITE_COLORS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-elite-vfx.js';

function mockContext() {
    const calls = [];
    const target = { calls, globalAlpha: 1 };
    return new Proxy(target, {
        get(object, key) {
            if (key in object) return object[key];
            if (key === 'createRadialGradient') return (...args) => { calls.push([key, ...args]); return { addColorStop: () => {} }; };
            return (...args) => calls.push([key, ...args]);
        },
        set(object, key, value) { calls.push(['set', key, value]); if (key === 'globalAlpha') object.globalAlpha = value; return true; },
    });
}

const trace = { fromX: 10, fromY: 20, toX: 210, toY: 80, life: 0.12 };

test('the bolt keeps the exact C# endpoints and is no longer a straight line', () => {
    const points = lightningBoltPath(trace.fromX, trace.fromY, trace.toX, trace.toY, mulberry32(7));
    assert.deepEqual(points[0], { x: 10, y: 20 });
    assert.deepEqual(points.at(-1), { x: 210, y: 80 });
    assert.ok(points.length >= 17, 'subdivided');
    const length = Math.hypot(200, 60);
    const deviations = points.map(p => Math.abs((p.x - 10) * 60 - (p.y - 20) * 200) / length);
    assert.ok(Math.max(...deviations) > 4, 'jagged');
    assert.ok(Math.max(...deviations) < length * 0.4, 'stays near its segment');
});

test('the shape is deterministic per frame, flickers over time and holds still under reduced motion', () => {
    assert.equal(lightningSeed(trace, 1.0), lightningSeed(trace, 1.01));
    assert.notEqual(lightningSeed(trace, 1.0), lightningSeed(trace, 1.05));
    assert.equal(lightningSeed(trace, 1.0, true), lightningSeed(trace, 9.0, true));
});

test('drawing a trace layers glow, forks, a white core and an endpoint spark, fading with life', () => {
    const ctx = mockContext();
    const result = drawLightningTrace(ctx, trace, 0.5);
    assert.ok(result.forks.length >= 1);
    const strokes = ctx.calls.filter(c => c[0] === 'stroke').length;
    assert.equal(strokes, 3 + result.forks.length);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'arc').slice(1, 3), [210, 80]);
    const faded = mockContext();
    drawLightningTrace(faded, { ...trace, life: 0.06 }, 0.5);
    assert.ok(faded.calls.some(c => c[0] === 'set' && c[1] === 'strokeStyle' && c[2] === 'rgba(255, 255, 245, 0.5)'));
    const gone = mockContext();
    drawLightningTrace(gone, { ...trace, life: 0 }, 0.5);
    assert.equal(gone.calls.length, 0);
});

test('only elites get a ground sigil and crest, coloured by affix', () => {
    const plain = mockContext();
    drawEliteGround(plain, { x: 0, y: 0, radius: 12 });
    drawEliteCrest(plain, { x: 0, y: 0, radius: 12 });
    assert.equal(plain.calls.length, 0);
    const ctx = mockContext();
    drawEliteGround(ctx, { x: 50, y: 60, radius: 12, elite: 'Gravebound' }, 1);
    drawEliteCrest(ctx, { x: 50, y: 60, radius: 12, elite: 'Gravebound' }, 1, true);
    assert.ok(ctx.calls.some(c => c[0] === 'set' && c[1] === 'strokeStyle' && String(c[2]).includes(ELITE_COLORS.Gravebound)));
    assert.ok(ctx.calls.some(c => c[0] === 'moveTo' && c[1] === 50 && c[2] < 60 - 24), 'crest floats above the head');
});

test('every C# elite affix has its own colour', () => {
    const affixes = ['Gravebound', 'Packblood', 'EmberAnointer', 'CinderMarksman', 'Thornrunner', 'Oathshield', 'Drowncaller'];
    assert.equal(new Set(affixes.map(eliteColor)).size, affixes.length);
});

test('a submerged elite wraith shows no mark', () => {
    const ctx = mockContext();
    drawEliteGround(ctx, { x: 0, y: 0, radius: 12, elite: 'Drowncaller', opacity: 0 });
    drawEliteCrest(ctx, { x: 0, y: 0, radius: 12, elite: 'Drowncaller', opacity: 0 });
    assert.equal(ctx.calls.length, 0);
});

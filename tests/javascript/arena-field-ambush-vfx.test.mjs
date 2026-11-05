import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFieldAmbushTell, drawEmergeParticles, markUnit } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-field-ambush-vfx.js';

const recorder = () => {
    const calls = [];
    const ctx = new Proxy({}, {
        get: (target, key) => key === 'calls' ? calls : (...args) => { calls.push([key, ...args]); },
        set: (target, key, value) => { calls.push([`set:${String(key)}`, value]); return true; },
    });
    return ctx;
};
const ambush = progress => ({ progress, marks: [{ x: 100, y: 200, radius: 12 }, { x: 300, y: 260, radius: 10 }, { x: 180, y: 400, radius: 14 }] });

test('nothing is drawn without a running tell', () => {
    const ctx = recorder();
    assert.equal(drawFieldAmbushTell(ctx, null, 0), 0);
    assert.equal(drawFieldAmbushTell(ctx, { progress: .5, marks: [] }, 0), 0);
    assert.equal(ctx.calls.length, 0);
});

test('every mark gets hopping pebbles and no drawn cracks, rings or pit: the cleft is real terrain', () => {
    const early = recorder(), late = recorder();
    assert.equal(drawFieldAmbushTell(early, ambush(.1), 1), 3 * 7, 'seven pebbles per mark');
    drawFieldAmbushTell(late, ambush(.9), 1);
    for (const ctx of [early, late]) assert.equal(ctx.calls.filter(call => ['ellipse', 'arc', 'lineTo', 'stroke'].includes(call[0])).length, 0, 'no strokes of any kind');
    assert.ok(late.calls.filter(call => call[0] === 'fillRect').length > early.calls.filter(call => call[0] === 'fillRect').length, 'dust lifts in the second half');
});

test('the dirt thrown by an emerging enemy is deterministic, bursts early and thins out, and stops when it is out', () => {
    const at = progress => { const ctx = recorder(); return { ctx, drawn: drawEmergeParticles(ctx, 50, 60, 9, progress) }; };
    assert.equal(at(0).drawn, 0);
    assert.equal(at(1).drawn, 0);
    const burst = at(.2), later = at(.8);
    assert.equal(burst.drawn, 12 + 5);
    assert.deepEqual(burst.ctx.calls, at(.2).ctx.calls, 'the same moment is the same picture');
    const alpha = ctx => ctx.calls.filter(call => call[0] === 'set:globalAlpha').map(call => call[1]);
    assert.ok(alpha(burst.ctx)[0] > alpha(later.ctx)[0], 'chips fade as it climbs clear');
});
test('a mark keeps its own shape for the whole tell and reduced motion holds the pebbles still', () => {
    assert.equal(markUnit(100, 200, 1), markUnit(100, 200, 1));
    assert.notEqual(markUnit(100, 200, 1), markUnit(300, 260, 1));
    const a = recorder(), b = recorder();
    drawFieldAmbushTell(a, ambush(.5), 0.1, true);
    drawFieldAmbushTell(b, ambush(.5), 3.7, true);
    assert.deepEqual(a.calls, b.calls);
    const c = recorder(), d = recorder();
    drawFieldAmbushTell(c, ambush(.5), 0.1, false);
    drawFieldAmbushTell(d, ambush(.5), 0.17, false);
    assert.notDeepEqual(c.calls, d.calls, 'the pebbles hop with motion on');
});

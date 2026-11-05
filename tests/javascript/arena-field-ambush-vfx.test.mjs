import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFieldAmbushTell, markUnit } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-field-ambush-vfx.js';

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

test('every mark gets cracks, a closing ring and a pit, and the ring closes as the tell advances', () => {
    const early = recorder(), late = recorder();
    assert.ok(drawFieldAmbushTell(early, ambush(.1), 1) >= 3 * 7);
    drawFieldAmbushTell(late, ambush(.9), 1);
    const radii = ctx => ctx.calls.filter(call => call[0] === 'ellipse').map(call => call[3]);
    const ringRadius = ctx => Math.max(...radii(ctx));
    assert.ok(ringRadius(early) > ringRadius(late), 'the outer ring closes on the body');
    assert.ok(late.calls.filter(call => call[0] === 'fill').length > early.calls.filter(call => call[0] === 'fill').length, 'the last tenth flares');
});

test('a mark keeps its own shape for the whole tell and reduced motion holds the glow steady', () => {
    assert.equal(markUnit(100, 200, 1), markUnit(100, 200, 1));
    assert.notEqual(markUnit(100, 200, 1), markUnit(300, 260, 1));
    const a = recorder(), b = recorder();
    drawFieldAmbushTell(a, ambush(.5), 0.1, true);
    drawFieldAmbushTell(b, ambush(.5), 3.7, true);
    assert.deepEqual(a.calls, b.calls);
    const c = recorder(), d = recorder();
    drawFieldAmbushTell(c, ambush(.5), 0.1, false);
    drawFieldAmbushTell(d, ambush(.5), 0.17, false);
    assert.notDeepEqual(c.calls, d.calls, 'the glow pulses with motion on');
});

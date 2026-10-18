import test from 'node:test';
import assert from 'node:assert/strict';
import { installArtForTesting, resetArtForTesting } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/art-atlas.js';
import { drawBestiaryPortrait, portraitFrameName, portraitScale } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/bestiary-portraits.js';

function fakeCanvas(kind, unknown) {
    const calls = [];
    const ctx = new Proxy({ calls }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return (...args) => calls.push([prop, ...args]);
        },
        set(target, prop, value) { calls.push([`set:${String(prop)}`, value]); target[prop] = value; return true; },
    });
    return { width: 96, height: 96, dataset: { bestiaryKind: String(kind), unknown: String(unknown) }, getContext: () => ctx, ctx };
}

test('portrait uses the idle frame and the largest whole scale that fits', () => {
    assert.equal(portraitFrameName(6), 'enemy.6.0.normal');
    assert.equal(portraitFrameName('bad'), 'enemy.0.0.normal');
    assert.equal(portraitScale(20, 26, 96, 96), 3);
    assert.equal(portraitScale(200, 200, 96, 96), 1);
});

test('known creatures draw in colour, unmet ones as a silhouette', () => {
    installArtForTesting({ atlases: { actors: { frames: { 'enemy.2.0.normal': { x: 4, y: 8, w: 20, h: 20, ax: 10, ay: 18 } } } } }, { actors: {} });
    try {
        const known = fakeCanvas(2, false);
        assert.equal(drawBestiaryPortrait(known), true);
        const draw = known.ctx.calls.find(call => call[0] === 'drawImage');
        assert.deepEqual(draw.slice(2), [4, 8, 20, 20, 8, 8, 80, 80]);
        assert.ok(!known.ctx.calls.some(call => call[0] === 'set:globalCompositeOperation'));

        const unknown = fakeCanvas(2, true);
        drawBestiaryPortrait(unknown);
        assert.ok(unknown.ctx.calls.some(call => call[0] === 'set:globalCompositeOperation' && call[1] === 'source-in'));

        assert.equal(drawBestiaryPortrait(fakeCanvas(5, false)), false, 'missing frame keeps the empty frame');
    } finally {
        resetArtForTesting();
    }
});

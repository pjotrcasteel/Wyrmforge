import test from 'node:test';
import assert from 'node:assert/strict';
import { footDrop, footprint, drawFootprint, drawCastShadow, SHADOW_SKEW, SHADOW_SQUASH } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-grounding.js';

const recorder = () => {
    const calls = [];
    return new Proxy({}, {
        get: (target, key) => key === 'calls' ? calls : (...args) => { calls.push([key, ...args]); },
        set: (target, key, value) => { calls.push([`set:${String(key)}`, value]); return true; },
    });
};

test('a massive body plants its foot well below its centre and gets a footprint as wide as the body', () => {
    assert.ok(footDrop(60) >= 15, 'Ashfang stands in front of the middle of its footprint, not on it');
    assert.ok(footDrop(60) > footDrop(11));
    assert.equal(footprint(60).rx, 60);
    assert.ok(footprint(60).ry < footprint(60).rx / 2, 'the ground is foreshortened');
    assert.ok(footprint(2).rx >= 7, 'even a small body keeps a readable footprint');
});

test('the cast shadow is the silhouette laid flat from the feet and leaning away from the light, never mirrored art', () => {
    const ctx = recorder();
    drawCastShadow(ctx, { image: true }, { x: 160, y: 80, width: 80, height: 80 }, 40, 76, 100.4, 200.2, 2, 1);
    const call = name => ctx.calls.find(c => c[0] === name);
    assert.deepEqual(call('translate').slice(1), [100, 200], 'anchored on the feet in whole units');
    assert.deepEqual(call('transform').slice(1), [1, 0, -SHADOW_SKEW, -SHADOW_SQUASH, 0, 0], 'height becomes squashed length, top leans sideways');
    assert.ok(ctx.calls.some(c => c[0] === 'set:filter' && c[1] === 'brightness(0)'), 'it is the sprite itself, blackened');
    assert.deepEqual(call('drawImage').slice(2, 6), [160, 80, 80, 80]);
    assert.deepEqual(call('drawImage').slice(6), [-80, -152, 160, 160], 'the same 2x pixels, rooted at the feet');
    const flipped = recorder();
    drawCastShadow(flipped, {}, { x: 0, y: 0, width: 8, height: 8 }, 4, 8, 0, 0, 1, 1, -1);
    assert.equal(flipped.calls.find(c => c[0] === 'transform')[3], SHADOW_SKEW);
});

test('the footprint is a dark ellipse pair of the body size and is invisible with the body', () => {
    const ctx = recorder();
    drawFootprint(ctx, 10, 20, 40, 1);
    assert.equal(ctx.calls.filter(c => c[0] === 'ellipse').length, 2);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'ellipse').slice(1, 5), [10, 20, 40, 16]);
    const gone = recorder();
    drawFootprint(gone, 10, 20, 40, 0);
    assert.ok(gone.calls.filter(c => c[0] === 'set:globalAlpha').every(c => c[1] === 0));
});

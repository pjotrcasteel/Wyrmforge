import test from 'node:test';
import assert from 'node:assert/strict';
import { injectAuthoredSet, setAuthoredRenderMode, drawGrounded, hasEmissive, emissionIntensity } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-characters.js';

const recorder = () => {
    const calls = [];
    return new Proxy({}, {
        get: (target, key) => key === 'calls' ? calls : (...args) => { calls.push([key, ...args]); },
        set: (target, key, value) => { calls.push([`set:${String(key)}`, value]); return true; },
    });
};
const set = (glows = true) => ({
    manifest: { canvas: [80, 80], root: [40, 76], directions: ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'], actions: { idle: { framesPerDirection: 2 }, walk: { framesPerDirection: 2 } } },
    strips: new Map([['idle', { albedo: 'idle' }], ['walk', { albedo: 'walk' }]]),
    emissive: new Map(glows ? [['idle', { glow: 'idle' }]] : []),
});
const images = ctx => ctx.calls.filter(call => call[0] === 'drawImage').map(call => call[1]);

test('the Canvas path adds the glow over the sprite, only for actions that have a glow strip', () => {
    injectAuthoredSet('Test-Glow', set());
    setAuthoredRenderMode('overlay');
    const ctx = recorder();
    assert.equal(drawGrounded(ctx, 'Test-Glow', 'idle', 'S', 0, 100, 100, { radius: 12 }), true);
    assert.equal(images(ctx).length, 3, 'its cast shadow, the sprite, then its glow');
    assert.equal(images(ctx).at(-1).glow, 'idle');
    assert.ok(ctx.calls.some(call => call[0] === 'set:globalCompositeOperation' && call[1] === 'lighter'), 'the glow adds light instead of covering the sprite');
    const walk = recorder();
    drawGrounded(walk, 'Test-Glow', 'walk', 'S', 0, 100, 100, { radius: 12 });
    assert.deepEqual(images(walk).map(image => image.albedo), ['walk', 'walk'], 'only its shadow and sprite: no glow strip, no glow');
    assert.equal(hasEmissive('Test-Glow', 'idle'), true);
    assert.equal(hasEmissive('Test-Glow', 'walk'), false);
});

test('the GPU passes split the sprite from its glow: albedo paints shadows and sprite, emissive paints only the glow in the same place', () => {
    injectAuthoredSet('Test-Gpu', set());
    setAuthoredRenderMode('albedo');
    const albedo = recorder();
    drawGrounded(albedo, 'Test-Gpu', 'idle', 'S', 1, 100, 100, { radius: 12, scale: 2 });
    assert.ok(images(albedo).every(image => image.albedo), 'no glow texture in the albedo');
    setAuthoredRenderMode('emissive');
    const glow = recorder();
    assert.equal(drawGrounded(glow, 'Test-Gpu', 'idle', 'S', 1, 100, 100, { radius: 12, scale: 2 }), true);
    assert.deepEqual(images(glow).map(image => image.glow), ['idle']);
    assert.equal(glow.calls.some(call => call[0] === 'ellipse' || call[0] === 'transform'), false, 'no footprint or cast shadow in the emissive tile');
    const sprite = albedo.calls.filter(call => call[0] === 'drawImage').at(-1), light = glow.calls.find(call => call[0] === 'drawImage');
    assert.deepEqual(light.slice(2), sprite.slice(2), 'the glow is registered with the sprite pixel for pixel');
    assert.equal(drawGrounded(recorder(), 'Test-Gpu', 'walk', 'S', 0, 100, 100, { radius: 12 }), false, 'an action without a glow paints nothing in the emissive tile');
    setAuthoredRenderMode('overlay');
});

test('the second forms burn harder and a transformation swells the glow to its peak', () => {
    assert.equal(emissionIntensity('Ashfang-normal'), 1);
    assert.ok(emissionIntensity('Ashfang-enraged') > emissionIntensity('Ashfang-normal'));
    assert.ok(emissionIntensity('Bell-Warden-molten') > emissionIntensity('Bell-Warden-normal'));
    assert.ok(emissionIntensity('Reliquary-awakened') > emissionIntensity('Reliquary-normal'));
    assert.ok(emissionIntensity('Bell-Warden-normal', 1) > emissionIntensity('Bell-Warden-normal', .2));
    assert.ok(emissionIntensity('Bell-Warden-normal', 1) >= emissionIntensity('Bell-Warden-molten'), 'at the break it burns as hard as the form it becomes');
});

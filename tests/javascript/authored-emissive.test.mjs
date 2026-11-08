import test from 'node:test';
import assert from 'node:assert/strict';
import {
    injectAuthoredSet, setAuthoredRenderMode, drawGrounded, hasEmissive, enemyHasEmissivePose, emissionIntensity,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-characters.js';

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

test('voxel-grounded large enemies use the C# surface as their true sprite-foot and shadow anchor', () => {
    injectAuthoredSet('Test-Voxel-Warden', set(false));
    setAuthoredRenderMode('albedo');
    const placed = recorder();
    assert.equal(drawGrounded(placed, 'Test-Voxel-Warden', 'idle', 'S', 0, 100, 208,
        { radius: 40, terrainGrounded: true }), true);
    const sprite = placed.calls.filter(call => call[0] === 'drawImage').at(-1);
    // Manifest foot is y=76. No second downward offset may hide the legs under a ledge.
    assert.equal(sprite[7], 208 - 76);
    assert.equal(placed.calls.find(call => call[0] === 'translate')[2], 208,
        'contact shadow is attached to the C# height-projected foot');
    assert.equal(placed.calls.find(call => call[0] === 'ellipse')[2], 208,
        'footprint is on the same terrain contact');
    const legacy = recorder();
    drawGrounded(legacy, 'Test-Voxel-Warden', 'idle', 'S', 0, 100, 208, { radius: 40 });
    assert.ok(legacy.calls.filter(call => call[0] === 'drawImage').at(-1)[7] > sprite[7],
        'legacy flat presentation retains its intentional front-foot projection');
    setAuthoredRenderMode('emissive');
    const glowing = recorder();
    injectAuthoredSet('Test-Voxel-Warden-Glow', set());
    drawGrounded(glowing, 'Test-Voxel-Warden-Glow', 'idle', 'S', 0, 100, 208,
        { radius: 40, terrainGrounded: true });
    assert.equal(glowing.calls.find(call => call[0] === 'drawImage')[7], sprite[7],
        'emissive strips line up with the grounded albedo instead of floating in front of it');
    setAuthoredRenderMode('overlay');
});

test('the enemy emissive fast path skips unlit poses without suppressing authored action glow', () => {
    injectAuthoredSet('Test-Pose-Glow', set());
    const state = { enemies: new Map([[42, { name: 'Test-Pose-Glow', action: 'walk', emerge: false }]]) };
    assert.equal(enemyHasEmissivePose(state, 42), false, 'unlit walking never needs an emissive scratch canvas');
    state.enemies.get(42).action = 'idle';
    assert.equal(enemyHasEmissivePose(state, 42), true, 'loaded glowing actions still render');
    state.enemies.get(42).emerge = true;
    assert.equal(enemyHasEmissivePose(state, 42), false, 'emergence never draws an emissive pose');
    state.enemies.get(42).emerge = false;
    assert.equal(enemyHasEmissivePose(state, 999), false, 'missing pose does not allocate a canvas');
    assert.equal(enemyHasEmissivePose(null, 42), false);
});

test('Fire enemy glow manifests only target real actions and do not constrain future authored emission', async () => {
    const { readFileSync } = await import('node:fs');
    const { ENEMY_CHARACTERS } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-characters.js');
    for (const [kind, name] of ENEMY_CHARACTERS) {
        if (kind > 6) continue;
        const manifest = JSON.parse(readFileSync(new URL(
            `../../src/Wyrmforge.Presentation.Web/wwwroot/art/characters/${name}/manifest.json`, import.meta.url), 'utf8'));
        const actions = new Set(Object.keys(manifest.actions));
        assert.ok((manifest.emissive ?? []).every(action => actions.has(action)),
            `${name}: newly added glow strips must name real actions so the conditional GPU upload remains correct`);
    }
});

test('the second forms burn harder and a transformation swells the glow to its peak', () => {
    assert.equal(emissionIntensity('Ashfang-normal'), 1);
    assert.ok(emissionIntensity('Ashfang-enraged') > emissionIntensity('Ashfang-normal'));
    assert.ok(emissionIntensity('Bell-Warden-molten') > emissionIntensity('Bell-Warden-normal'));
    assert.ok(emissionIntensity('Reliquary-awakened') > emissionIntensity('Reliquary-normal'));
    assert.ok(emissionIntensity('Bell-Warden-normal', 1) > emissionIntensity('Bell-Warden-normal', .2));
    assert.ok(emissionIntensity('Bell-Warden-normal', 1) >= emissionIntensity('Bell-Warden-molten'), 'at the break it burns as hard as the form it becomes');
});
test('each kind pulls itself out of the ground its own way and a Wraith sinks instead of fading', async () => {
    const { RISE_STYLES, riseEmerged, riseShake, wraithSink } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-characters.js');
    for (const style of Object.values(RISE_STYLES)) {
        assert.equal(riseEmerged(style, 0), 0);
        assert.equal(riseEmerged(style, 1), 1, 'every rise ends fully out');
        assert.equal(riseShake(style, 1, 3), 0, 'no strain once it is out');
        let last = -1;
        for (let p = 0; p <= .8; p += .05) { const value = riseEmerged(style, p); assert.ok(value >= last - 1e-9, 'it never sinks back while climbing'); last = value; }
    }
    assert.notEqual(riseEmerged(RISE_STYLES.Penitent, .5), riseEmerged(RISE_STYLES['Mire-Hound'], .5), 'the kinds rise differently');
    assert.ok(riseEmerged(RISE_STYLES['Mire-Hound'], .9) > 1 - 1e-9, 'the hound throws itself clear at the end');
    assert.equal(wraithSink(1), 0);
    assert.equal(wraithSink(.25), .75);
    assert.equal(wraithSink(undefined), 0);
});

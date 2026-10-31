import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lighting01Requested, lighting01FixtureSpecs, submitLighting01Surfaces,
    submitLighting01Fixtures } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/g5-world-composition.js';

const fixture = { id: 'wet-forest:torch:91', kind: 'torch', x: .42, y: .59, height: 28 };
const environment = { wetForest: { lightFixtures: [fixture] } };
const frame = { version: 1, time: 3, lights: [{ id: fixture.id, ownerId: fixture.id,
    type: 'point', enabled: true, position: [399, 914.5, 28],
    color: '#ffac65', intensity: 14, range: 240, castsShadow: false }] };

test('Lighting 0.1 is opt-in only when the existing Hunt GPU backend is also selected', () => {
    assert.equal(lighting01Requested(new URLSearchParams('arenaGpu=1&lighting01=1')), true);
    for (const query of ['', 'arenaGpu=1', 'lighting01=1', 'arenaGpu=0&lighting01=1'])
        assert.equal(lighting01Requested(new URLSearchParams(query)), false, query);
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(arena, /state\.lighting01 = lighting01Requested\(params\)/);
    assert.match(arena, /if \(gpu\) gpu\.begin\(ctx, camera, width, height\)/);
    assert.match(arena, /submitLighting01Fixtures\(gpu, snapshot\.environment, state\.sharedLightingFrame/);
    assert.match(arena, /gpu\.render\(ctx, state\.sharedLightingFrame\)/);
});

test('fixed fixture location must match its C# emitter in the current frame', () => {
    assert.deepEqual(lighting01FixtureSpecs(environment, frame, 950, 1550),
        [{ id: fixture.id, x: 399, y: 914.5, height: 28, color: '#ffac65' }]);
    const tallFrame = { ...frame, lights: [{ ...frame.lights[0], position: [425.88, 1244.9, 28] }] };
    assert.deepEqual(lighting01FixtureSpecs(environment, tallFrame, 1014, 2110),
        [{ id: fixture.id, x: 425.88, y: 1244.9, height: 28, color: '#ffac65' }]);
    assert.deepEqual(lighting01FixtureSpecs(environment, { ...frame, lights: [] }, 950, 1550), []);
    assert.deepEqual(lighting01FixtureSpecs(environment, { ...frame, lights: [{ ...frame.lights[0], enabled: false }] }, 950, 1550), []);
    assert.deepEqual(lighting01FixtureSpecs(environment, { ...frame, lights: [{ ...frame.lights[0], ownerId: 'other' }] }, 950, 1550), []);
    assert.deepEqual(lighting01FixtureSpecs(environment, { ...frame, lights: [{ ...frame.lights[0], position: [99, 914.5, 28] }] }, 950, 1550), []);
    assert.deepEqual(lighting01FixtureSpecs(null, frame, 950, 1550), []);
});

test('future AR/WF32 authored surfaces submit typed resources to the SAME GPU world', () => {
    const received = [];
    const world = { submitSurface: (...args) => received.push(args) };
    const material = { id: 'm', albedo: 'atlas', normal: 'normal-atlas', roughness: .75 };
    const renderable = { id: 'rooted-tree-0', ownerId: 'tree-0', geometry: 'trunk', material: 'm',
        castsShadow: true, receivesShadow: true, receivesLight: true };
    assert.equal(submitLighting01Surfaces(world, [{ renderable, material }]), 1);
    assert.deepEqual(received, [[renderable, material]]);
    assert.throws(() => submitLighting01Surfaces(world, [{ renderable, material }, { renderable, material }]), /unique IDs/);
    assert.equal(received.length, 1, 'Invalid composition cannot half-submit its objects');
    assert.throws(() => submitLighting01Surfaces(world, [{ renderable, material: { id: 'wrong' } }]), /matching materials/);
    assert.throws(() => submitLighting01Surfaces(null, []), /shared HuntGpuWorld/);
});

test('G5 fixture captures a 16x24 pixel-aligned light receiver, never creates a JS light', () => {
    const captures = [];
    const originalDocument = globalThis.document;
    try {
        globalThis.document = { createElement: () => ({ width: 0, height: 0,
            getContext: () => ({ imageSmoothingEnabled: true, fillRect() {}, set fillStyle(_) {} }) }) };
        const world = { capture: (...args) => captures.push(args) };
        assert.equal(submitLighting01Fixtures(world, environment, frame, { x: 12, y: 20 }, 950, 1550), 1);
        assert.equal(captures.length, 1);
        assert.equal(captures[0][0], `lighting01:fixture:${fixture.id}`);
        assert.deepEqual(captures[0].slice(2, 6), [399 - 12 - 8, 914.5 - 20 - 23, 16, 24]);
        assert.equal(captures[0][7], false, 'Decorative G5 torch uses the reduced/no-wedge caster tier');
        assert.equal(captures[0][8].material.emissionIntensity, .3);
        assert.equal(captures[0][8].material.emission, '#ffac65');
    } finally { globalThis.document = originalDocument; }
});

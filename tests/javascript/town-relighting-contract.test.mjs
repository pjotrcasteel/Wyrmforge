import test from 'node:test';
import assert from 'node:assert/strict';
import { townArtToUv, townUvToArt, compileTownLightingSnapshot, TOWN_ART_SIZE }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { selectLights } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const material = { id: 'stone', color: '#ffffff', emission: '#000000', roughness: .85,
    metalness: 0, specular: .15, alphaCutoff: .5, emissionIntensity: 0,
    reflection: 'off', albedo: 'town-author-approved-neutral-paving' };
const layer = (id, extra = {}) => ({ id, ownerId: id, geometry: 'authored-plane', material: 'stone',
    artBounds: [700, 380, 80, 80], position: [0, 0, 0], rotation: [0, 0, 0],
    scale: [1, 1, 1], castsShadow: false, receivesShadow: true, ...extra });
const fixture = (id, extra = {}) => ({ id, ownerId: id, type: 'point', enabled: true,
    artAnchor: [760, 420], position: [0, 0, 2], direction: [0, 0, -1], color: '#ff8844',
    intensity: 2, range: 7, coneAngle: .6, penumbra: .3,
    priority: 3, castsShadow: true, ...extra });
const manifest = () => ({
    version: 1, artSize: [...TOWN_ART_SIZE], materials: [{ ...material }],
    layers: [
        layer('paving'),
        layer('smith-active', { when: { key: 'forgeUnlocked', equals: true } }),
        layer('smith-vacant', { when: { key: 'forgeUnlocked', equals: false } }),
    ],
    fixtures: [fixture('gate-lantern'), fixture('forge', { when: { key: 'forgeUnlocked', equals: true } })],
});

test('approved 1672x941 Town pixel coordinates round-trip without inventing a camera', () => {
    assert.deepEqual(townArtToUv(0, 0), [0, 1]);
    assert.deepEqual(townArtToUv(1672, 941), [1, 0]);
    for (const pixel of [[4, 20], [836, 470.5], [1672, 941]]) {
        const restored = townUvToArt(...townArtToUv(...pixel));
        assert.ok(restored.every((value, i) => Math.abs(value - pixel[i]) < 1e-9));
    }
    assert.throws(() => townArtToUv(1673, 0), RangeError);
    assert.throws(() => townUvToArt(0, -0.01), TypeError);
});

test('same generic G1/G3 engine receives active and vacant 2.5D layers without changing progression', () => {
    const m = manifest(), state = { forgeUnlocked: false };
    const vacant = compileTownLightingSnapshot(m, { state, mode: 'night' });
    assert.deepEqual(vacant.objects.map(o => o.id), ['paving', 'smith-vacant']);
    assert.deepEqual(selectLights(vacant).map(o => o.id), ['gate-lantern']);
    state.forgeUnlocked = true;
    const active = compileTownLightingSnapshot(m, { state, mode: 'day' });
    assert.deepEqual(active.objects.map(o => o.id), ['paving', 'smith-active']);
    assert.deepEqual(selectLights(active).map(o => o.id), ['forge', 'gate-lantern']);
    assert.ok(active.environment.ambient > vacant.environment.ambient);
    assert.equal(m.fixtures[1].enabled, true, 'compiler never mutates registered C#-owned fixture metadata');
});

test('zero-light inspector turns off every registered local emitter and world emission', () => {
    const zero = compileTownLightingSnapshot(manifest(), { state: { forgeUnlocked: true }, mode: 'zero' });
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(selectLights(zero), []);
    assert.equal(zero.objects.length, 2, 'zero light must darken world surfaces instead of deleting them');
});

test('2.5D world layers require authored material geometry rather than collision polygons or inferred height', () => {
    const m = manifest();
    m.layers[0] = layer('paving', { castsShadow: true });
    assert.throws(() => compileTownLightingSnapshot(m, { state: { forgeUnlocked: false } }), /authored occluder/);
    m.layers[0].occluderGeometry = 'approved-well-caster';
    assert.equal(compileTownLightingSnapshot(m, { state: { forgeUnlocked: false } }).objects[0].occluderGeometry,
        'approved-well-caster');
    m.layers[0].artBounds = [1600, 900, 100, 100];
    assert.throws(() => compileTownLightingSnapshot(m, { state: { forgeUnlocked: false } }), RangeError);
});

test('invalid or missing Town unlock state is never assumed unlocked', () => {
    assert.throws(() => compileTownLightingSnapshot(manifest()), /authoritative town state/);
    const m = manifest();
    m.fixtures[0].when = { key: 'forgeUnlocked', equals: 'yes' };
    assert.throws(() => compileTownLightingSnapshot(m, { state: { forgeUnlocked: true } }), /boolean equals/);
    assert.throws(() => compileTownLightingSnapshot({ ...m, artSize: [1280, 720] }), /manifest/);
});

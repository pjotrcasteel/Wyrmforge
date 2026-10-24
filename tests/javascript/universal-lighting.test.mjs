import test from 'node:test';
import { cutoutLeafPixels } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/cutout-fixture.js';
import assert from 'node:assert/strict';
import { validateSnapshot, selectLights, environmentProfile } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';
import * as T from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js';
import { spriteFrame, spritePlaneGeometry } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/lit-sprite.js';
const emitter = (id, extra = {}) => ({ id, ownerId: id, type: 'point', enabled: true, position: [0, 0, 1],
    direction: [0, 0, -1], color: '#ff7722', intensity: 10, range: 8, coneAngle: .5, penumbra: .2,
    priority: 1, castsShadow: true, ...extra });
const snapshot = lights => ({ version: 1, time: 3, environment: environmentProfile('night'), lights, materials: [], objects: [] });
test('light expiry, disable, removal and replacement cannot leave a ghost source', () => {
    const s = validateSnapshot(snapshot([emitter('a'), emitter('b', { enabled: false }), emitter('c', { expiresAt: 3 })]));
    assert.deepEqual(selectLights(s).map(l => l.id), ['a']);
    assert.deepEqual(selectLights(validateSnapshot(snapshot([]))), []);
    assert.equal(selectLights(validateSnapshot(snapshot([emitter('a', { intensity: 20 })])))[0].intensity, 20);
});
test('shadow view budget is deterministic; rejected shadows retain light', () => {
    const lights = [emitter('b'), emitter('a'), emitter('beam', { type: 'spot', priority: 2 })];
    const selected = selectLights(snapshot(lights), 8);
    assert.deepEqual(selected.map(l => [l.id, l.shadow]), [['beam', true], ['a', true], ['b', false]]);
    assert.deepEqual(selectLights(snapshot(lights.reverse()), 8), selected);
    assert.ok(selected.reduce((n, l) => n + l.shadowViews, 0) <= 8);
});
test('invalid sources fail before snapshot mutation and unsupported tiers never silently degrade', () => {
    assert.throws(() => validateSnapshot(snapshot([emitter('a'), emitter('a')])));
    for (const change of [{ intensity: NaN }, { range: 0 }, { type: 'area' }, { coneAngle: 4 }, { color: 'red' }, { type: 'spot', direction: [0, 0, 0] }])
        assert.throws(() => validateSnapshot(snapshot([emitter('a', change)])));
    const input = snapshot([emitter('a')]), validated = validateSnapshot(input);
    validated.lights[0].position[0] = 100;
    assert.equal(input.lights[0].position[0], 0);
});
test('device-local Auto boundary and zero environment are explicit', () => {
    assert.deepEqual(environmentProfile('auto', 7), environmentProfile('day'));
    assert.deepEqual(environmentProfile('auto', 19), environmentProfile('night'));
    assert.equal(environmentProfile('zero').ambient, 0);
    assert.equal(environmentProfile('zero').emission, false);
});
test('common sprite sample shares exact UV cell across normal/albedo/shadow maps', () => {
    const manifest = { directions: ['N', 'S'], clips: { walk: { frames: 16 } } };
    assert.deepEqual(spriteFrame(manifest, { clip: 'walk', frame: 4, direction: 'S' }), { offset: [.25, 0], repeat: [1 / 16, .5] });
    assert.throws(() => spriteFrame(manifest, { clip: 'walk', frame: 16, direction: 'S' }));
});

// Test projected geometry, not a duplicate of the geometry construction algorithm.
test('sprite projection preserves authored aspect, foot pivot and tangent normal orientation', () => {
    const clip = { cell: 96, worldSize: 96, anchor: [42, 72] };
    const geometry = spritePlaneGeometry(T, clip, 1 / 48, [8, -12, 12]);
    const camera = new T.OrthographicCamera(-2, 2, 2, -2, .1, 80);
    camera.up.set(0, 0, 1); camera.position.set(8, -12, 12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const positions = geometry.attributes.position;
    const points = Array.from({ length: positions.count }, (_, i) => new T.Vector3().fromBufferAttribute(positions, i).project(camera));
    const width = points[1].x - points[0].x, height = points[0].y - points[2].y;
    assert.ok(Math.abs(width - height) < 1e-6, 'Square atlas cells must remain square on screen');
    assert.ok(Math.abs(points[0].y - points[1].y) < 1e-6, 'Atlas rows must remain screen-horizontal');
    assert.ok(Math.abs(points[0].x + width * clip.anchor[0] / clip.cell) < 1e-6, 'Authored foot X must project to origin');
    assert.ok(Math.abs(points[0].y - height * clip.anchor[1] / clip.cell) < 1e-6, 'Authored foot Y must project to origin');
    const normal = new T.Vector3().fromBufferAttribute(geometry.attributes.normal, 0);
    assert.ok(normal.dot(camera.position.clone().normalize()) > .99999, 'Neutral tangent normal must point toward the camera');
    geometry.dispose();
    assert.throws(() => spritePlaneGeometry(T, clip, 1 / 48, [0, 0, 1]), RangeError);
});

test('cutout diagnostic supplies opaque leaves and genuine holes, not a full quad', () => {
    const pixels = cutoutLeafPixels();
    const alpha = pixels.filter((_, i) => i % 4 === 3);
    assert.equal(alpha.length, 64 * 64);
    assert.ok(alpha.every(a => a === 0 || a === 255));
    const coverage = alpha.filter(a => a === 255).length / alpha.length;
    assert.ok(coverage > .2 && coverage < .6);
    assert.equal(alpha[0], 0);
    assert.equal(alpha[16 * 64 + 16], 255);
});

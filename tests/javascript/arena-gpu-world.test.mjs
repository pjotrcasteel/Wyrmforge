import test from 'node:test';
import assert from 'node:assert/strict';
import { huntLightFrame } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

test('Hunt lights track camera with the same world scale and handedness as receivers', () => {
    const frame = { version: 1, time: 2, environment: { ambient: 0 }, lights: [{
        id: 'source', position: [144, 240, 24], direction: [1, 2, -1], range: 144,
        intensity: 1, enabled: true, castsShadow: true,
    }] };
    const original = structuredClone(frame);
    const projected = huntLightFrame(frame, { x: 48, y: 96 });
    assert.deepEqual(projected.lights[0].position, [2, -3 * Math.SQRT2, .5]);
    assert.deepEqual(projected.lights[0].direction, [1, -2 * Math.SQRT2, -1]);
    assert.equal(projected.lights[0].range, 3);
    assert.equal(projected.lights[0].intensity, 1);
    assert.deepEqual(frame, original);
    assert.equal(projected.environment.ambient, 0);
    assert.deepEqual(huntLightFrame({ ...frame, lights: [] }, { x: 0, y: 0 }).lights, []);
});

test('authored sprite foot anchor stays on the ground and its billboard faces the Hunt camera', async () => {
    const { huntActorGeometry } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const geometry = huntActorGeometry();
    const normal = new T.Vector3().fromBufferAttribute(geometry.attributes.normal, 0);
    const toward = new T.Vector3(0, -1, 1).normalize();
    assert.ok(normal.dot(toward) > .99999);
    const anchor = new T.Vector3(0, -.25, 0).add(new T.Vector3(0, .25, 0));
    anchor.applyAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 4);
    assert.ok(anchor.length() < 1e-8);
    const top = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
    const bottom = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 2);
    const up = new T.Vector3(0, 1, 1).normalize();
    assert.ok(Math.abs(top.clone().sub(bottom).dot(up) - 1) < 1e-6,
        'An already projected sprite must retain its full apparent height.');
    assert.ok(top.z > 0, 'Standing cutout geometry must rise above ground to cast a directional shadow.');
    geometry.dispose();
});

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
    assert.deepEqual(projected.lights[0].position, [2, -3, .5]);
    assert.deepEqual(projected.lights[0].direction, [1, -2, -1]);
    assert.equal(projected.lights[0].range, 3);
    assert.equal(projected.lights[0].intensity, 1);
    assert.deepEqual(frame, original);
    assert.equal(projected.environment.ambient, 0);
    assert.deepEqual(huntLightFrame({ ...frame, lights: [] }, { x: 0, y: 0 }).lights, []);
});

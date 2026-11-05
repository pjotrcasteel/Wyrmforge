import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js';
import { HUNT_PROJECTIONS, huntLightFrame, huntSurfaceRenderable, huntCaptureSilhouetteCaster, huntSolidVolumeCaster,
    alignHuntActorBillboards } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

const UNIT = 48;
const WIDTH = 390, HEIGHT = 844;

// The same camera the live adapter builds in HuntGpuWorld.render and LightingEngine.render.
function huntCamera(profile) {
    const halfWidth = WIDTH / UNIT / 2;
    const halfHeight = halfWidth * HEIGHT / WIDTH * profile.verticalScale;
    const camera = new T.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, .1, 80);
    camera.up.set(0, 0, 1);
    const centerY = -HEIGHT * profile.groundY / UNIT / 2;
    camera.position.set(WIDTH / UNIT / 2, centerY - 30, 30);
    camera.lookAt(WIDTH / UNIT / 2, centerY, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    return camera;
}

function toScreen(camera, point) {
    const ndc = new T.Vector3(...point).project(camera);
    return { x: (ndc.x + 1) / 2 * WIDTH, y: (1 - ndc.y) / 2 * HEIGHT };
}

// A world point in source pixels (x, ground y, height z) as the adapter places geometry.
const geometryPoint = (profile, x, y, z) => [x / UNIT, -y * profile.groundY / UNIT, z * profile.groundY / UNIT];

for (const name of ['legacy', 'metric']) {
    test(`${name} projection lands geometry on screenX = x, screenY = y - z`, () => {
        const profile = HUNT_PROJECTIONS[name];
        const camera = huntCamera(profile);
        for (const [x, y, z] of [[100, 300, 0], [100, 300, 32], [250, 520, 64], [10, 40, 16]]) {
            const screen = toScreen(camera, geometryPoint(profile, x, y, z));
            assert.ok(Math.abs(screen.x - x) < 1e-6, `x ${screen.x} vs ${x}`);
            assert.ok(Math.abs(screen.y - (y - z)) < 1e-6, `y ${screen.y} vs ${y - z}`);
        }
    });

    test(`${name} projection draws a 1 m block as a 32 x 32 top plus a 32 x 32 front`, () => {
        const profile = HUNT_PROJECTIONS[name];
        const camera = huntCamera(profile);
        const corner = (x, y, z) => toScreen(camera, geometryPoint(profile, x, y, z));
        const topNW = corner(64, 128, 32), topSE = corner(96, 160, 32);
        const baseSW = corner(64, 160, 0);
        assert.ok(Math.abs(topSE.x - topNW.x - 32) < 1e-6 && Math.abs(topSE.y - topNW.y - 32) < 1e-6, 'top face is 32 x 32');
        assert.ok(Math.abs(baseSW.y - corner(64, 160, 32).y - 32) < 1e-6, 'front face is 32 px tall');
    });
}

test('the metric profile keeps the world 1:1:1 and only squeezes the camera frustum', () => {
    assert.equal(HUNT_PROJECTIONS.metric.groundY, 1);
    assert.ok(Math.abs(HUNT_PROJECTIONS.metric.verticalScale * HUNT_PROJECTIONS.legacy.groundY - 1) < 1e-12);
    assert.equal(HUNT_PROJECTIONS.legacy.verticalScale, 1);
    assert.throws(() => { HUNT_PROJECTIONS.metric.groundY = 2; }, TypeError);
});

test('metric lights sit at the same screen pixel as the geometry they illuminate; legacy light heights were off', () => {
    const light = { id: 'torch', position: [200, 400, 32], direction: [0, 0, 0], range: 96, intensity: 1, enabled: true };
    const screenOf = (profile, position) => toScreen(huntCamera(profile), position);
    const metric = HUNT_PROJECTIONS.metric, legacy = HUNT_PROJECTIONS.legacy;
    const metricLight = huntLightFrame({ lights: [light] }, { x: 0, y: 0 }, null, metric).lights[0].position;
    const legacyLight = huntLightFrame({ lights: [light] }, { x: 0, y: 0 }, null, legacy).lights[0].position;
    const expected = 400 - 32;
    assert.ok(Math.abs(screenOf(metric, metricLight).y - expected) < 1e-6, 'metric light lands at y - z');
    assert.ok(Math.abs(screenOf(legacy, legacyLight).y - expected) > 8, 'the legacy light height is not metric (known GH-A defect)');
});

test('default profile is the legacy one so existing callers are unchanged', () => {
    const legacy = HUNT_PROJECTIONS.legacy;
    const explicit = huntSurfaceRenderable('a', 10, 20, 96, 96, true, {}, legacy);
    assert.deepEqual(huntSurfaceRenderable('a', 10, 20, 96, 96, true), explicit);
    assert.deepEqual(huntCaptureSilhouetteCaster(10, 20, 96, 96), huntCaptureSilhouetteCaster(10, 20, 96, 96, .75, undefined, legacy));
    const volume = { x: 0, y: 0, width: 32, depth: 32, height: 32 };
    assert.deepEqual(huntSolidVolumeCaster(volume), huntSolidVolumeCaster(volume, legacy));
});

test('metric casters and ground planes use unstretched ground depth and unscaled heights', () => {
    const metric = HUNT_PROJECTIONS.metric;
    const volume = huntSolidVolumeCaster({ x: 0, y: 0, width: 32, depth: 32, height: 32 }, metric);
    assert.deepEqual(volume.occluderScale, [32 / UNIT, 32 / UNIT, 32 / UNIT], 'a 1 m block is a unit cube');
    const caster = huntCaptureSilhouetteCaster(0, 0, 96, 96, 1, undefined, metric);
    assert.equal(caster.occluderScale[1], 96 / UNIT, 'an upright silhouette is as tall in the world as on the screen');
    const ground = huntSurfaceRenderable('ground', 0, 0, 96, 96, false, {}, metric);
    assert.equal(ground.scale[1], 96 / UNIT, 'ground planes keep one world unit per source pixel');
});

test('upright billboards project as one world unit per screen pixel in the metric camera', () => {
    const metric = HUNT_PROJECTIONS.metric;
    const camera = huntCamera(metric);
    const descriptor = huntSurfaceRenderable('actor', 100, 200, 96, 96, true, {}, metric);
    const mesh = new T.Object3D();
    alignHuntActorBillboards([descriptor], { objects: new Map([['actor', { mesh }]]), camera }, true);
    const top = new T.Vector3(0, 1, 0).multiply(new T.Vector3(...descriptor.scale)).applyQuaternion(mesh.quaternion)
        .add(new T.Vector3(...descriptor.position));
    const base = new T.Vector3(...descriptor.position);
    const rise = toScreen(camera, base.toArray()).y - toScreen(camera, top.toArray()).y;
    assert.ok(Math.abs(rise - 96) < 1e-6, `billboard rises ${rise} px`);
    assert.ok(Math.abs(new T.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion).y + 1) < 1e-9, 'it faces the viewer');
});

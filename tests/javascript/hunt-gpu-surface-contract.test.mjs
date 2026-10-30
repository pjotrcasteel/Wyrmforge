import test from 'node:test';
import assert from 'node:assert/strict';
import { huntSurfaceMaterial, huntSurfaceRenderable } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';
import { validateSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

test('existing Hunt captures preserve their billboard and flat-ground defaults', () => {
    const actor = huntSurfaceRenderable('actor', 10, 20, 96, 96, true);
    const ground = huntSurfaceRenderable('ground', 10, 20, 96, 96, false);
    assert.deepEqual([actor.geometry, actor.castsShadow, actor.receivesShadow, actor.receivesLight],
        ['hunt-billboard', true, true, true]);
    assert.deepEqual([ground.geometry, ground.castsShadow, ground.receivesShadow, ground.receivesLight],
        ['hunt-plane', false, true, true]);
    assert.equal(actor.position[0], 58 / 48);
    assert.equal(huntSurfaceMaterial('actor').albedo, 'actor');
});

test('any authored asset can supply independent shape, casting, shading and normal channels', () => {
    const material = huntSurfaceMaterial('site-tree', {
        color: '#234567', albedo: 'tree-albedo', normal: 'tree-normal',
        roughnessMap: 'tree-roughness', alphaCutoff: .5, roughness: .72,
    }, false);
    const object = huntSurfaceRenderable('site-tree', 0, 0, 120, 90, false, {
        ownerId: 'site-1', geometry: 'authored-tree', occluderGeometry: 'tree-branches',
        castsShadow: true, receivesShadow: true, receivesLight: true, standing: false,
        position: [2, -3, 0], scale: [1, 2, 3], rotation: [0, 0, 0],
    });
    const snapshot = { version: 1, time: 0,
        environment: { ambient: 0, color: '#ffffff', exposure: 1, emission: false },
        lights: [], materials: [material], objects: [object] };
    const validated = validateSnapshot(snapshot);
    assert.equal(validated.objects[0].geometry, 'authored-tree');
    assert.equal(validated.objects[0].occluderGeometry, 'tree-branches');
    assert.equal(validated.objects[0].castsShadow, true);
    assert.equal(validated.objects[0].ownerId, 'site-1');
    assert.equal(validated.materials[0].normal, 'tree-normal');
    assert.equal(validated.materials[0].roughnessMap, 'tree-roughness');
    assert.deepEqual(validated.objects[0].position, [2, -3, 0]);
    assert.deepEqual(snapshot, validated, 'Generic descriptor validation never mutates input');
});

test('geometry and shadow roles do not depend on being an actor or using Canvas captures', () => {
    const receiver = huntSurfaceRenderable('stone-surface', 0, 0, 128, 128, true, {
        geometry: 'stone-mesh', standing: false, castsShadow: false, receivesShadow: true,
    });
    assert.equal(receiver.geometry, 'stone-mesh');
    assert.equal(receiver.castsShadow, false);
    assert.equal(receiver.receivesShadow, true);
    const flatColor = huntSurfaceMaterial('semantic-ground', { color: '#225522' }, false);
    assert.equal(flatColor.albedo, undefined, 'Flat-color geography must not require an image');
    assert.equal(flatColor.color, '#225522');
    assert.equal(flatColor.emission, '#000000');
    assert.equal(huntSurfaceMaterial('t', { id: 'bad-override' }).id, 't', 'IDs are resource authority');
});

test('preloaded GPU resources stay registered without texture-capture repainting', async () => {
    const { HuntGpuWorld } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const registrations = [];
    const fake = { engine: {
        registerTexture: (...args) => registrations.push(['texture', ...args]),
        registerGeometry: (...args) => registrations.push(['geometry', ...args]),
    }, objects: [], materials: [] };
    const tex = { isTexture: true, needsUpdate: false };
    const geometry = { isBufferGeometry: true };
    HuntGpuWorld.prototype.registerAssetTexture.call(fake, 'albedo', tex);
    HuntGpuWorld.prototype.registerAssetGeometry.call(fake, 'tree-geometry', geometry);
    assert.equal(tex.needsUpdate, true);
    assert.deepEqual(registrations, [['texture', 'albedo', tex, true], ['geometry', 'tree-geometry', geometry]]);
    assert.throws(() => HuntGpuWorld.prototype.registerAssetTexture.call(fake, 'bad', {}), TypeError);
    assert.throws(() => HuntGpuWorld.prototype.registerAssetGeometry.call(fake, 'bad', {}), TypeError);

    const surface = huntSurfaceRenderable('tree-1', 0, 0, 48, 48, true,
        { geometry: 'tree-geometry', ownerId: 'tree' });
    const descriptor = huntSurfaceMaterial('foliage', { albedo: 'albedo', normal: 'tree-normal' }, false);
    surface.material = descriptor.id;
    HuntGpuWorld.prototype.submitSurface.call(fake, surface, descriptor);
    HuntGpuWorld.prototype.submitSurface.call(fake, { ...surface, id: 'tree-2' }, descriptor);
    assert.equal(fake.objects.length, 2);
    assert.equal(fake.materials.length, 1, 'Shared authored materials must not duplicate per actor');
    assert.throws(() => HuntGpuWorld.prototype.submitSurface.call(fake, surface,
        { ...descriptor, color: '#112233' }), TypeError);
});

test('only changed Canvas pixels trigger shared GPU texture uploads', async () => {
    const { HuntGpuWorld } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const allMaterials = [];
    const engine = {
        objects: new Map(), textures: new Map(),
        camera: { up: { set() {} }, position: { set() {} }, lookAt() {},
            quaternion: { source: 'active-camera' } },
        apply(snapshot) {
            engine.objects = new Map(snapshot.objects.map(object => {
                const material = snapshot.materials.find(value => value.id === object.material);
                const map = material.albedo ? { needsUpdate: false } : null;
                const normalMap = material.normal ? { needsUpdate: false } : null;
                const mesh = { material: { map, normalMap },
                    quaternion: { copy(value) {
                        assert.equal(value, engine.camera.quaternion,
                            'Standing sprite must face the actual GPU camera.');
                    } } };
                allMaterials.push({ id: object.id, mesh });
                return [object.id, { mesh }];
            }));
        },
        render() {},
    };
    const ctx = { canvas: { width: 320, height: 568 },
        save() {}, setTransform() {}, drawImage() {}, restore() {} };
    const world = { engine, canvas: {}, camera: { x: 0, y: 0 }, width: 320, height: 568,
        used: new Set(['repainted']), layers: new Map([
            ['repainted', { pixels: { width: 96, height: 64 }, texture: { dispose() {} } }],
        ]), dirtyTextures: new Set(['repainted']),
        materials: [
            huntSurfaceMaterial('repainted'),
            huntSurfaceMaterial('static', { albedo: 'authored', normal: 'normal' }, false),
        ], objects: [
            huntSurfaceRenderable('repainted', 0, 0, 96, 64, true),
            huntSurfaceRenderable('static', 96, 0, 96, 64, true),
        ] };
    const frame = { version: 1, time: 0, lights: [],
        environment: { ambient: 0, color: '#ffffff', exposure: 1, emission: false } };
    HuntGpuWorld.prototype.render.call(world, ctx, frame);
    assert.equal(engine.objects.get('repainted').mesh.material.map.needsUpdate, true);
    assert.equal(engine.objects.get('static').mesh.material.map.needsUpdate, false);
    assert.equal(engine.objects.get('static').mesh.material.normalMap.needsUpdate, false);
    assert.deepEqual(world.lastFrameUploads, { dynamicTextures: 1, dynamicPixels: 96 * 64 });
    assert.deepEqual(world.lastFrameTopUploads, [{ id: 'repainted', width: 96, height: 64, pixels: 96 * 64 }]);
    assert.equal(world.dirtyTextures.size, 0);
    HuntGpuWorld.prototype.render.call(world, ctx, frame);
    assert.equal(engine.objects.get('repainted').mesh.material.map.needsUpdate, false,
        'An unchanged source must not be uploaded on the next frame');
    assert.deepEqual(world.lastFrameUploads, { dynamicTextures: 0, dynamicPixels: 0 });
    assert.deepEqual(world.lastFrameTopUploads, [], 'Static authored maps must not show up as per-frame uploads');
    assert.equal(world.submissionCpu.frames, 2, 'GPU submission timing tracks actual rendered frames');
    assert.ok(Number.isFinite(world.submissionCpu.lastMs) && world.submissionCpu.lastMs >= 0);
    assert.ok(world.submissionCpu.meanMs >= 0);
    assert.ok(world.submissionCpu.peakMs >= world.submissionCpu.lastMs);
});

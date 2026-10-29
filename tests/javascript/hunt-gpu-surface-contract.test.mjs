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

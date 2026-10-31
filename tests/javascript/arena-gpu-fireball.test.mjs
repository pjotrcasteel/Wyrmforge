import test from 'node:test';
import assert from 'node:assert/strict';
import { fireballGpuSurface, submitGpuFireballs } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-fireball.js';
import { installFireballV5ForTesting, resetFireballV5ForTesting } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-fireball-v5.js';
import { HuntGpuWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';
import { validateSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const frame = { version: 1, time: 1, lights: [],
    environment: { ambient: 0, color: '#ffffff', exposure: 1, emission: false } };

test('authoritative Fireball pose selects the exact authored atlas cell without Canvas transforms', () => {
    const projectile = { spell: 1, radius: 14, x: 200, y: 300, angle: 0,
        fireballSourceId: 13, combination: null };
    const before = structuredClone(projectile);
    const surface = fireballGpuSurface(projectile, { x: 0, y: 0 }, 0, 0);
    assert.ok(surface);
    assert.equal(surface.id, 'hunt-fireball:13');
    assert.equal(surface.geometry, 'art:projectile-camera-facing');
    assert.equal(surface.material, 'art:fireball-v5:surface');
    assert.deepEqual(surface.frame, { offset: [13 / 16, 0], repeat: [1 / 16, 1] });
    assert.ok(Math.abs(surface.position[0] - 173 / 48) < 1e-9, 'Artist-placed sprite anchor');
    assert.deepEqual(surface.scale, [120 / 48, 72 / 48, 1]);
    assert.equal(surface.castsShadow, false);
    assert.equal(surface.receivesShadow, false);
    assert.equal(surface.receivesLight, true);
    assert.deepEqual(projectile, before, 'Presentation projection cannot modify simulation');

    const moved = fireballGpuSurface({ ...projectile, angle: Math.PI / 2 }, { x: 48, y: 96 }, 0, 0);
    assert.ok(Math.abs(moved.position[0] - (200 - 48) / 48) < 1e-9);
    assert.ok(Math.abs(moved.position[1] + (273 - 96) * Math.SQRT2 / 48) < 1e-9);
    assert.notDeepEqual(moved.rotation, surface.rotation);
    assert.deepEqual(fireballGpuSurface(projectile, { x: 0, y: 0 }, 0, 2, true).frame,
        { offset: [0, 0], repeat: [1 / 16, 1] });
    assert.equal(fireballGpuSurface({ ...projectile, spell: 2 }, { x: 0, y: 0 }, 0, 0), null);
    assert.equal(fireballGpuSurface({ ...projectile, combination: 0 }, { x: 0, y: 0 }, 0, 0), null);
});

test('art atlas registers once, shares one GPU material, and never invents lighting sources', () => {
    installFireballV5ForTesting({ width: 1920, height: 72 }, { width: 1920, height: 72 });
    try {
        const textures = new Map();
        const geometries = new Map();
        const world = { width: 390, height: 844, objects: [], materials: [],
            engine: { textures, geometries },
            registerAssetTexture(id, texture) { assert.ok(texture.isTexture); textures.set(id, texture); },
            registerAssetGeometry(id, geometry) { assert.ok(geometry.isBufferGeometry); geometries.set(id, geometry); },
            submitSurface: HuntGpuWorld.prototype.submitSurface };
        const projectiles = [
            { spell: 1, x: 190, y: 320, radius: 9, fireballSourceId: 1 },
            { spell: 1, x: 250, y: 380, radius: 9, fireballSourceId: 2 },
            { spell: 2, x: 280, y: 330, radius: 9 },
        ];
        const passed = submitGpuFireballs(world, projectiles, { x: 0, y: 0 }, 0);
        assert.equal(passed.size, 2);
        assert.ok(passed.has(projectiles[0]) && passed.has(projectiles[1]));
        assert.equal(world.objects.length, 2);
        assert.equal(world.materials.length, 1);
        assert.equal(textures.size, 2);
        assert.equal(geometries.size, 1);
        assert.equal(world.materials[0].blendMode, 'alpha');
        assert.equal(world.materials[0].emissiveMap, 'art:fireball-v5:emissive');
        assert.equal(world.materials[0].albedo, 'art:fireball-v5:albedo');
        assert.doesNotThrow(() => validateSnapshot({ ...frame, objects: world.objects, materials: world.materials }));

        world.materials = []; world.objects = [];
        submitGpuFireballs(world, [projectiles[0]], { x: 0, y: 0 }, 0.1);
        assert.equal(textures.size, 2, 'Static GPU sheets must never upload each frame');
        assert.equal(geometries.size, 1);
        assert.equal(world.objects.length, 1);
    } finally {
        resetFireballV5ForTesting();
    }
});

test('missing authored sheets retain Canvas instead of synthesizing a GPU impostor', () => {
    resetFireballV5ForTesting();
    const world = { width: 390, height: 844 };
    assert.equal(submitGpuFireballs(world, [{ spell: 1, x: 20, y: 20 }], { x: 0, y: 0 }, 0).size, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { singleMaterialGroundBoard, groundReviewSnapshot } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/ground-only-review.js';
import { validateSnapshot } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const mapping = [['grass', 0], ['mud', 1], ['dirt', 3], ['marsh', 5]];
test('ground foundation starts with one uniform approved material and no old paving/scorched pixels', () => {
    for (const [name, index] of mapping) {
        const board = singleMaterialGroundBoard(name, 24, 24);
        assert.equal(board.length, 576);
        assert.ok(board.every(value => value === index));
    }
    assert.throws(() => singleMaterialGroundBoard('paving'), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('scorched'), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('trees'), /Invalid/);
});

test('single ground receives G1 lighting and has no scene props, fake normals, glow or collision', () => {
    for (const [name] of mapping) {
        const snapshot = validateSnapshot(groundReviewSnapshot(name, 'fire'));
        assert.deepEqual(snapshot.objects.map(o => o.id), ['ground']);
        assert.deepEqual(snapshot.materials.map(m => m.id), ['wet-forest-ground']);
        assert.equal(snapshot.objects[0].geometry, 'ground-plane');
        assert.equal(snapshot.objects[0].receivesLight, true);
        assert.equal(snapshot.objects[0].castsShadow, false);
        assert.equal(snapshot.objects[0].occluderGeometry, undefined);
        assert.equal(snapshot.materials[0].normal, undefined);
        assert.equal(snapshot.materials[0].roughnessMap, undefined);
        assert.equal(snapshot.materials[0].emissionIntensity, 0);
        assert.equal(snapshot.materials[0].albedo, 'wet-forest-'+name);
        assert.ok(snapshot.lights.some(l => l.id === 'fireball'));
    }
});

test('light-off ground obeys existing total-black world visibility contract', () => {
    const zero = validateSnapshot(groundReviewSnapshot('grass', 'zero'));
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(zero.lights, []);
    assert.equal(zero.objects.length, 1);
    const moon = validateSnapshot(groundReviewSnapshot('grass', 'moon'));
    assert.equal(moon.lights.length, 1);
    assert.equal(moon.lights[0].id, 'moon');
    const neutral = validateSnapshot(groundReviewSnapshot('grass', 'neutral'));
    assert.deepEqual(neutral.lights.map(l => l.id), ['studio-inspection']);
});

test('moving Fireball changes world light position without mutating material artwork', () => {
    const first = groundReviewSnapshot('dirt', 'fire', 0);
    const last = groundReviewSnapshot('dirt', 'fire', 1);
    assert.notDeepEqual(first.lights.find(l => l.id === 'fireball').position,
        last.lights.find(l => l.id === 'fireball').position);
    assert.deepEqual(first.materials, last.materials);
    assert.deepEqual(first.objects, last.objects);
    assert.throws(() => groundReviewSnapshot('grass', 'fire', 2), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('grass', -1, 3), /Invalid/);
});

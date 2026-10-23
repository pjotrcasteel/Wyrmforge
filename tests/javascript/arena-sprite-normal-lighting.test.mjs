import test from 'node:test';
import assert from 'node:assert/strict';
import { shadeTreeCameraNormals } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-sprite-normal-lighting.js';

test('True camera-space normals make bark facing Fireball brighter while opposite faces stay dark', () => {
    const original = new Uint8ClampedArray([110, 70, 45, 255, 110, 70, 45, 255]);
    const normals = new Uint8ClampedArray([
        255, 128, 128, 255, // face points right
        0, 128, 128, 255,   // face points left
    ]);
    const torchOnRight = { dirX: -1, dirY: 0, intensity: .95 };
    const torchOnLeft = { dirX: 1, dirY: 0, intensity: .95 };
    const right = shadeTreeCameraNormals(original, normals, torchOnRight, .90);
    const left = shadeTreeCameraNormals(original, normals, torchOnLeft, .90);
    assert.ok(right[0] > right[4] + 30, 'Right-facing bark should catch fire from the right');
    assert.ok(left[4] > left[0] + 30, 'Opposite bark should brighten when the Fireball crosses over');
    assert.equal(right[3], 255);
    assert.equal(left[7], 255);
    assert.deepEqual(Array.from(original), [110, 70, 45, 255, 110, 70, 45, 255],
        'Original editable art is never modified');
});

test('Night and absence of fire produce dark opaque bark without filling transparent sprite cells', () => {
    const original = new Uint8ClampedArray([180, 100, 40, 0, 180, 100, 40, 255]);
    const normals = new Uint8ClampedArray([128, 128, 255, 0, 128, 128, 255, 255]);
    const result = shadeTreeCameraNormals(original, normals, null, .90);
    assert.deepEqual(Array.from(result.slice(0, 4)), [0, 0, 0, 0]);
    assert.ok(result[4] < 50);
    assert.equal(result[7], 255);
    assert.deepEqual(result, shadeTreeCameraNormals(original, normals, null, .90));
    const buffer = new Uint8ClampedArray(original.length);
    assert.equal(shadeTreeCameraNormals(original, normals, null, .90, buffer), buffer);
    assert.equal(shadeTreeCameraNormals(original, new Uint8ClampedArray(3), null), null);
});

test('Normals missing at alpha edges never punch physical holes into original source art', () => {
    const original = new Uint8ClampedArray([200, 150, 120, 180]);
    const normals = new Uint8ClampedArray([0, 0, 0, 0]);
    const lit = shadeTreeCameraNormals(original, normals,
        { dirX: 0, dirY: 0, intensity: 1 }, .90);
    assert.equal(lit[3], 180);
    assert.ok(lit[0] > 0);
    assert.ok(lit[0] <= 255);
});

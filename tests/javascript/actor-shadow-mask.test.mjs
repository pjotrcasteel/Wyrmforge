import test from 'node:test';
import assert from 'node:assert/strict';
import { planarCasterVertices } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/actor-shadow-mask.js';

test('explicit alpha-mask caster follows the same authored cell pivot and source-pixel size', () => {
    const cell = 4, rgba = new Uint8ClampedArray(cell * cell * 4);
    rgba[(1 * cell + 1) * 4] = 255;
    rgba[(1 * cell + 2) * 4] = 255;
    const vertices = planarCasterVertices(rgba, cell, [2, 3], 192);
    assert.equal(vertices.length, 36);
    const x = [], z = [];
    for (let i = 0; i < vertices.length; i += 3) { x.push(vertices[i]); z.push(vertices[i+2]); assert.equal(vertices[i+1], 0); }
    assert.equal(Math.min(...x), -1);
    assert.equal(Math.max(...x), 1);
    assert.equal(Math.min(...z), 1);
    assert.equal(Math.max(...z), 2);
});
test('caster never invents triangles for empty or transparent authored frames', () => {
    const cell = 8, rgba = new Uint8Array(cell * cell * 4);
    assert.equal(planarCasterVertices(rgba, cell, [4, 6], 96).length, 0);
    assert.throws(() => planarCasterVertices(rgba, 7, [4, 6], 96));
});
test('caster geometry uses alpha-source mask channel rather than sprite color', () => {
    const pixels = new Uint8Array(4*4*4);
    pixels.fill(127);
    pixels[(2*4+2)*4] = 255;
    assert.ok(planarCasterVertices(pixels, 4, [2, 3], 96).length > 0);
    // Input is packed grayscale caster PNG, where red and alpha are independent;
    // no albedo luminance or guessed normal is ever consulted.
    assert.equal(planarCasterVertices(pixels, 4, [2, 3], 96, 3).length, 0);
});

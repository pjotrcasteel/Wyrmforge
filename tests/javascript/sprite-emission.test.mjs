import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPaletteEmission } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/sprite-emission.js';

test('emission mask contains only authored glowing pixels and retains their alpha', () => {
    const pixels = new Uint8ClampedArray([
        255, 251, 211, 255, // Ashling hot eye center
        255, 100, 12, 180,  // smaller ember eye rim
        75, 42, 35, 255,    // normal body color
        255, 251, 211, 0,  // invisible source pixel must never glow
    ]);
    const emission = extractPaletteEmission(pixels, ['#fffbd3', '#ff640c']);
    assert.deepEqual([...emission], [
        255, 251, 211, 255,
        255, 100, 12, 180,
        0, 0, 0, 0,
        0, 0, 0, 0,
    ]);
    assert.deepEqual([...pixels.slice(0, 4)], [255, 251, 211, 255], 'Original atlas remains untouched');
});

test('emission palette rejects invalid descriptors and malformed RGBA data', () => {
    assert.throws(() => extractPaletteEmission([255, 30], ['#ff0000']), TypeError);
    assert.throws(() => extractPaletteEmission([255, 30, 0, 255], ['red']), TypeError);
    assert.deepEqual([...extractPaletteEmission([], [])], []);
});

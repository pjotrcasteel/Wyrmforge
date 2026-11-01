import test from 'node:test';
import assert from 'node:assert/strict';
import { composeWorldSiteStrataPixels, insetStrokeRgb } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-strata-grid.js';

function pixel(data, width, x, y) {
    return [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
}

test('XYZ review uses true 32px pitch with one inset pixel on EACH adjacent block', () => {
    const source = {
        tilePixels: 32, columns: 2, rows: 1,
        surfaceMaterialIds: [1, 2], // dark C# grass, light C# road
        bodyMaterialIds: [0, 0],
        surfaceZ: [2, 3],
    };
    const pixels = composeWorldSiteStrataPixels(source, 64, 32);
    assert.ok(pixels);
    assert.equal(pixels.length, 64 * 32 * 4);
    // Both edges are INSIDE their own 32px tile. Together x31 + x32 are 2px.
    assert.deepEqual(pixel(pixels, 64, 31, 14), [255, 255, 255, 255]);
    assert.deepEqual(pixel(pixels, 64, 32, 14), [0, 0, 0, 255]);
    assert.deepEqual(pixel(pixels, 64, 30, 14), [60, 103, 73, 255]);
    assert.deepEqual(pixel(pixels, 64, 33, 14), [175, 145, 112, 255]);
    // Horizontal edges occupy y0/y31, while the content remains 30px inside.
    assert.deepEqual(pixel(pixels, 64, 10, 0), [255, 255, 255, 255]);
    assert.deepEqual(pixel(pixels, 64, 10, 1), [60, 103, 73, 255]);
    assert.deepEqual(pixel(pixels, 64, 10, 31), [255, 255, 255, 255]);
});

test('dark tiles get literal white and bright tiles literal black from luminance', () => {
    assert.deepEqual(insetStrokeRgb([0, 0, 0]), [255, 255, 255]);
    assert.deepEqual(insetStrokeRgb([255, 255, 255]), [0, 0, 0]);
    assert.deepEqual(insetStrokeRgb([60, 103, 73]), [255, 255, 255]);
    assert.deepEqual(insetStrokeRgb([175, 145, 112]), [0, 0, 0]);
    assert.deepEqual(insetStrokeRgb([165, 187, 200]), [0, 0, 0]);
});

test('full-sized 950x1550 site keeps 32px cells and clips the outer partial faces', () => {
    const columns = 30, rows = 49;
    const count = columns * rows;
    const pixels = composeWorldSiteStrataPixels({
        tilePixels: 32, columns, rows,
        surfaceMaterialIds: Array(count).fill(4),
        bodyMaterialIds: Array(count).fill(4),
        surfaceZ: Array(count).fill(0),
    }, 950, 1550);
    assert.ok(pixels);
    assert.equal(pixels.length, 950 * 1550 * 4);
    assert.equal(pixel(pixels, 950, 948, 1548)[3], 255);
    assert.equal(pixel(pixels, 950, 949, 1548)[0], insetStrokeRgb([114, 128, 136])[0]);
    assert.equal(pixel(pixels, 950, 948, 1549)[0], insetStrokeRgb([114, 128, 136])[0]);
});

test('missing C# data or a non-32px tile is never rendered as a guessed grid', () => {
    assert.equal(composeWorldSiteStrataPixels({
        tilePixels: 16, columns: 1, rows: 1,
        surfaceMaterialIds: [1], bodyMaterialIds: [0], surfaceZ: [0],
    }, 16, 16), null);
    assert.equal(composeWorldSiteStrataPixels({
        tilePixels: 32, columns: 1, rows: 1,
        surfaceMaterialIds: [1], bodyMaterialIds: [], surfaceZ: [0],
    }, 32, 32), null);
});

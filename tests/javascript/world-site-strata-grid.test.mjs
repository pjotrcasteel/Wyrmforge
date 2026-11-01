import test from 'node:test';
import assert from 'node:assert/strict';
import { composeWorldSiteStrataPixels, drawWorldSiteStrataGrid, insetStrokeRgb } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-strata-grid.js';

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

test('a C# mutation revision invalidates a previously cached 32px soil face', () => {
    const previous = globalThis.document;
    const pixels = [];
    try {
        globalThis.document = {
            createElement() {
                return {
                    width: 0, height: 0,
                    getContext() {
                        return {
                            createImageData(width, height) {
                                return { data: new Uint8ClampedArray(width * height * 4) };
                            },
                            putImageData(image) { pixels.push(image.data); },
                        };
                    },
                };
            },
        };
        const ctx = { save() {}, restore() {}, drawImage() {} };
        const face = {
            siteId: 'xyz-cache-revision-test', worldSeed: 19,
            tilePixels: 32, columns: 1, rows: 1, revision: 0,
            surfaceMaterialIds: [1], bodyMaterialIds: [0], surfaceZ: [2],
        };
        assert.equal(drawWorldSiteStrataGrid(ctx, face, 32, 32), true);
        assert.equal(pixels.length, 1);
        assert.deepEqual(pixel(pixels[0], 32, 15, 15), [60, 103, 73, 255]);
        // Identical site+revision reuses the same cached pixels without re-baking.
        assert.equal(drawWorldSiteStrataGrid(ctx, face, 32, 32), true);
        assert.equal(pixels.length, 1);
        const excavated = { ...face, revision: 1, surfaceMaterialIds: [4], bodyMaterialIds: [4], surfaceZ: [1] };
        assert.equal(drawWorldSiteStrataGrid(ctx, excavated, 32, 32), true);
        assert.equal(pixels.length, 2);
        assert.deepEqual(pixel(pixels[1], 32, 15, 15), [114, 128, 136, 255]);
    } finally {
        if (previous === undefined) delete globalThis.document;
        else globalThis.document = previous;
    }
});

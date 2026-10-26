import test from 'node:test';
import assert from 'node:assert/strict';
import { neutralizeTownPavingPixels } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-neutral-albedo.js';

function fixture(width = 160, height = 40) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4, texture = x % 8 < 4 ? -13 : 13;
        // Identical authored stone-joint microtexture, under wildly different
        // broad daylight illumination at left/right. A small warm area mimics
        // light painted into the reference panorama.
        const base = (x < width / 2 ? 80 : 174) + texture;
        pixels[offset] = base + (x > 100 ? 18 : 0);
        pixels[offset + 1] = base;
        pixels[offset + 2] = base - (x > 100 ? 15 : 0);
        pixels[offset + 3] = (x < 4 || x >= width - 4) ? 0 : 255;
    }
    return pixels;
}

function mean(data, width, x0, x1) {
    let sum = 0, count = 0;
    for (let y = 0; y < 40; y++) for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        sum += data[i + 1]; count++;
    }
    return sum / count;
}

test('neutral Town paving reduces broad painted illumination without erasing stone detail', () => {
    const source = fixture();
    const candidate = neutralizeTownPavingPixels(source, 160, 40, { radius: 16, strength: .8 });
    const originalGap = mean(source, 160, 105, 145) - mean(source, 160, 15, 55);
    const derivedGap = mean(candidate.data, 160, 105, 145) - mean(candidate.data, 160, 15, 55);
    assert.ok(Math.abs(derivedGap) < Math.abs(originalGap) * .9,
        'Broad illumination difference must reduce materially');
    const microBefore = source[(20 * 160 + 6) * 4 + 1] - source[(20 * 160 + 3) * 4 + 1];
    const microAfter = candidate.data[(20 * 160 + 6) * 4 + 1] -
        candidate.data[(20 * 160 + 3) * 4 + 1];
    assert.ok(Math.abs(microAfter) >= Math.abs(microBefore) * .6,
        'Original stone grain and mortar seams must remain visible');
    assert.ok(candidate.coverage > 5500 && candidate.alteredPixels > 2000);
    assert.equal(candidate.data[3], 0);
    assert.equal(candidate.data[candidate.data.length - 1], 0);
    assert.deepEqual(source, fixture(), 'Original approved-source pixels are never mutated');
});

test('candidate neutral albedo is deterministic, bounded, and supports original-art QA rollback', () => {
    const source = fixture();
    const first = neutralizeTownPavingPixels(source, 160, 40);
    const second = neutralizeTownPavingPixels(source, 160, 40);
    assert.deepEqual(first.data, second.data);
    assert.ok(first.meanGain > .68 && first.meanGain < 1.52);
    const off = neutralizeTownPavingPixels(source, 160, 40, { strength: 0, warmth: 0 });
    assert.deepEqual(off.data, source, 'Original artwork remains selectable with zero neutralization');
});

test('invalid source dimensions and non-finite or unsafe illumination settings fail closed', () => {
    const source = fixture();
    for (const options of [{ strength: -1 }, { strength: 1.01 }, { warmth: -1 },
        { radius: 0 }, { radius: 129 }, { warmth: NaN }])
        assert.throws(() => neutralizeTownPavingPixels(source, 160, 40, options), TypeError);
    assert.throws(() => neutralizeTownPavingPixels(source, 159, 40), TypeError);
    assert.throws(() => neutralizeTownPavingPixels(new Uint8Array(source), 160, 40), TypeError);
    const clear = new Uint8ClampedArray(12 * 12 * 4);
    const empty = neutralizeTownPavingPixels(clear, 12, 12);
    assert.deepEqual(empty.data, clear);
    assert.equal(empty.coverage, 0);
});

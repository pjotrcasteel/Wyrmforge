import test from 'node:test';
import assert from 'node:assert/strict';
import { createHardPairingWindow } from '../../tools/art/prototypes/terrain-hard-pairings.mjs';
import { buildHardPairingRelief, HARD_PAIRING_RISE_PIXELS } from
    '../../tools/art/prototypes/terrain-hard-pairing-relief.mjs';
import { buildHardPairingReview } from '../../tools/art/prototypes/build-hard-pairing-review.mjs';

const config = {seed: 2111, state: 'worn', originX: 0, originY: 0,
    width: 128, height: 128, role: 'left', boundaryX: 64, boundaryY: 64};

test('physical rise candidate follows material tags, authored tonal detail and actual pixel masks', () => {
    const field = createHardPairingWindow('flagstone', 'cobble', config);
    const originalTags = field.sourceTags.slice();
    const originalHeights = field.heights.slice();
    const relief = buildHardPairingRelief(field);
    assert.equal(relief.pixelsPerWorldUnit, 48);
    assert.equal(relief.heightUnitsPerPixel, 16);
    assert.equal(relief.heightmap.width, 128);
    assert.equal(relief.casterAlpha.height, 128);
    assert.match(relief.status, /NO G GEOMETRY, LIVE SHADOWS OR PHYSICS/);

    for (let i = 0; i < field.sourceTags.length; i++) {
        const tag = field.sourceTags[i];
        const x = i % field.width, y = Math.floor(i / field.width);
        if (tag === 0) {
            assert.equal(relief.elevationPixels[i], 0);
            assert.equal(relief.surfaceHeightSixteenths[i], 0);
            assert.deepEqual(relief.heightmap.get(x, y), [0, 0, 0, 255]);
            assert.equal(relief.casterAlpha.alpha(x, y), 0);
            continue;
        }
        const material = tag === 1 ? field.primary : field.secondary;
        const rise = HARD_PAIRING_RISE_PIXELS[material];
        assert.equal(relief.elevationPixels[i], rise);
        assert.ok(relief.surfaceHeightSixteenths[i] >= rise * 16);
        assert.ok(relief.surfaceHeightSixteenths[i] <= rise * 16 + 12);
        const pixel = relief.heightmap.get(x, y);
        assert.equal(pixel[0], Math.round(relief.surfaceHeightSixteenths[i] * 255 / 128));
        assert.deepEqual(pixel.slice(1), [pixel[0], pixel[0], 255]);
        assert.equal(relief.casterAlpha.alpha(x, y), 255);
    }
    assert.deepEqual(field.sourceTags, originalTags);
    assert.deepEqual(field.heights, originalHeights);
});

test('candidate footprints provide exact row spans, preserving stone identity without false box casters', () => {
    const field = createHardPairingWindow('cobble', 'brick', config);
    const relief = buildHardPairingRelief(field);
    const seen = new Uint8Array(field.width * field.height);
    let spanPixels = 0;
    for (const caster of relief.candidateCasterFootprints) {
        const rise = HARD_PAIRING_RISE_PIXELS[caster.material];
        assert.equal(caster.risePixels, rise);
        assert.equal(caster.worldRise, rise / relief.pixelsPerWorldUnit);
        assert.ok(caster.pixelCount > 0);
        let count = 0;
        for (const {y, startX, endX} of caster.spans) {
            assert.ok(startX <= endX);
            assert.ok(startX >= caster.minX && endX <= caster.maxX);
            assert.ok(y >= caster.minY && y <= caster.maxY);
            for (let x = startX; x <= endX; x++) {
                const i = y * field.width + x;
                assert.equal(seen[i], 0, 'A source pixel must belong to one stone only');
                seen[i] = 1;
                assert.equal(field.sourceTags[i], caster.sourceTag);
                assert.equal(field.originalIds[i], caster.originalStoneId);
                count++;
            }
        }
        assert.equal(count, caster.pixelCount);
        spanPixels += count;
    }
    assert.equal(spanPixels, field.sourceTags.filter(Boolean).length);
    for (let i = 0; i < seen.length; i++) {
        assert.equal(seen[i], field.sourceTags[i] === 0 ? 0 : 1);
    }
});

test('elevation is unchanged across overlapping world-coordinate review windows', () => {
    const west = buildHardPairingRelief(createHardPairingWindow('brick', 'flagstone',
        {...config, width: 256, boundaryX: 192}));
    const east = buildHardPairingRelief(createHardPairingWindow('brick', 'flagstone',
        {...config, width: 256, boundaryX: 192, originX: 128}));
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            const a = y * 256 + x + 128, b = y * 256 + x;
            assert.equal(west.elevationPixels[a], east.elevationPixels[b]);
            assert.equal(west.surfaceHeightSixteenths[a], east.surfaceHeightSixteenths[b]);
            assert.deepEqual(west.heightmap.get(x + 128, y), east.heightmap.get(x, y));
            assert.equal(west.casterAlpha.alpha(x + 128, y), east.casterAlpha.alpha(x, y));
        }
    }
});

test('source-only height/caster candidates reject mismatched arrays and false identities', () => {
    const field = createHardPairingWindow('flagstone', 'brick', config);
    assert.throws(() => buildHardPairingRelief(null), TypeError);
    assert.throws(() => buildHardPairingRelief({...field, heights: new Uint8Array(3)}), TypeError);
    assert.throws(() => buildHardPairingRelief({...field, originalIds: new Int32Array(2)}), TypeError);
    const invalidTag = {...field, sourceTags: field.sourceTags.slice()};
    invalidTag.sourceTags[0] = 3;
    assert.throws(() => buildHardPairingRelief(invalidTag), TypeError);
    const invalidId = {...field, originalIds: field.originalIds.slice()};
    const stoneIndex = field.sourceTags.findIndex(Boolean);
    invalidId.originalIds[stoneIndex] = 0;
    assert.throws(() => buildHardPairingRelief(invalidId), TypeError);
});

test('review adds height and mask diagnostics without claiming physically rendered shadows', () => {
    const review = buildHardPairingReview();
    assert.deepEqual(review.manifest.relief.risePixels, HARD_PAIRING_RISE_PIXELS);
    assert.equal(review.manifest.relief.pixelsPerWorldUnit, 48);
    assert.ok(review.manifest.relief.representativeCasterFootprints > 0);
    assert.equal(review.relief.heightmap.width, 256);
    assert.equal(review.relief.casterAlpha.height, 192);
    assert.match(review.manifest.limitations, /No AR3 placement.*cast shadows/);
});

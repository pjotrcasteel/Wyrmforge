import test from 'node:test';
import assert from 'node:assert/strict';
import { Bitmap } from '../../tools/art/lib/painter.mjs';
import { HARD_PAIRING_FAMILIES, HARD_PAIRING_VERSION,
    createHardPairingWindow } from '../../tools/art/prototypes/terrain-hard-pairings.mjs';
import { buildHardPairingReview } from '../../tools/art/prototypes/build-hard-pairing-review.mjs';
import { createWorldMasonryWindow, worldBoundaryMask,
    worldLightingMaps, cutWorldInto32 } from '../../tools/art/prototypes/terrain-world-variation.mjs';

const settings = {seed: 2111, state: 'reclaimed', originX: 0, originY: 0,
    width: 128, height: 128, role: 'left', boundaryX: 64, boundaryY: 64};

for (const [primary, secondary] of [
    ['flagstone', 'cobble'], ['cobble', 'brick'], ['brick', 'flagstone']
]) {
    test(`${primary}/${secondary} has genuine source material faces and a non-clipped seam`, () => {
        const result = createHardPairingWindow(primary, secondary, settings);
        assert.equal(result.albedo.width, 128);
        assert.equal(result.albedo.height, 128);
        assert.equal(result.sourceTags.length, 128 * 128);
        for (const tag of [0, 1, 2]) {
            assert.ok(result.sourceTags.includes(tag), `Missing ${tag} source material`);
        }
        assert.ok(result.stoneIds.some(id => id > 0));

        // The 64px world halo contains every source stone crossing this boundary.
        const margin = 64;
        const area = {...settings, originX: -margin, originY: -margin,
            width: settings.width + margin * 2, height: settings.height + margin * 2};
        const a = createWorldMasonryWindow(primary, area);
        const b = createWorldMasonryWindow(secondary, area);
        const mask = worldBoundaryMask({type: settings.role, ...area,
            boundaryX: settings.boundaryX, boundaryY: settings.boundaryY});
        const blocked = [new Set(), new Set()];
        for (let i = 0; i < mask.length; i++) {
            if (!mask[i]) {
                blocked[0].add(a.originalIds[i]);
            } else {
                blocked[1].add(b.originalIds[i]);
            }
        }
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const dst = y * 128 + x;
                const src = (y + margin) * area.width + x + margin;
                const tag = result.sourceTags[dst];
                if (!tag) {
                    assert.equal(result.stoneIds[dst], 0);
                    continue;
                }
                assert.equal(mask[src], tag === 1 ? 1 : 0);
                assert.ok(!blocked[tag - 1].has(result.originalIds[dst]),
                    'A stone from one material crosses the other material boundary');
                assert.equal(result.stoneIds[dst], (tag === 1 ? a : b).stoneIds[src]);
            }
        }
    });
}

test('overlapping windows have identical world-coordinate source colors and material tags', () => {
    const opts = {...settings, width: 256, boundaryX: 192};
    const west = createHardPairingWindow('flagstone', 'cobble', opts);
    const east = createHardPairingWindow('flagstone', 'cobble', {...opts, originX: 128});
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            assert.deepEqual(west.albedo.get(x + 128, y), east.albedo.get(x, y));
            assert.equal(west.sourceTags[y * 256 + x + 128], east.sourceTags[y * 256 + x]);
            assert.equal(west.stoneIds[y * 256 + x + 128], east.stoneIds[y * 256 + x]);
            assert.equal(west.heights[y * 256 + x + 128], east.heights[y * 256 + x]);
        }
    }
});

test('inner-corner material pairing stays continuous through vertically overlapping 32px windows', () => {
    const opts = {...settings, width: 256, height: 256, role: 'inner-se',
        boundaryX: 160, boundaryY: 160};
    const north = createHardPairingWindow('cobble', 'brick', opts);
    const south = createHardPairingWindow('cobble', 'brick', {...opts, originY: 128});
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 256; x++) {
            assert.deepEqual(north.albedo.get(x, y + 128), south.albedo.get(x, y));
            assert.equal(north.sourceTags[(y + 128) * 256 + x], south.sourceTags[y * 256 + x]);
            assert.equal(north.originalIds[(y + 128) * 256 + x], south.originalIds[y * 256 + x]);
            assert.equal(north.roughness[(y + 128) * 256 + x], south.roughness[y * 256 + x]);
        }
    }
});

test('pairing atlases preserve existing source-art normal and roughness map contracts', () => {
    const field = createHardPairingWindow('brick', 'cobble', {...settings,
        role: 'outer-se', seamMaterial: 'mud'});
    const maps = worldLightingMaps(field);
    for (const layer of [maps.albedo, maps.normal, maps.roughnessMap]) {
        const reconstructed = new Bitmap(field.width, field.height);
        for (const {col, row, tile} of cutWorldInto32(layer)) {
            reconstructed.blit(tile, col * 32, row * 32);
        }
        assert.deepEqual(reconstructed.data, layer.data);
    }
    assert.ok(maps.roughnessMap.data.every((v, i) => i % 4 !== 3 || v === 255));
});

test('hard pairing leaves source fields unchanged and rejects invalid source or topology', () => {
    assert.equal(HARD_PAIRING_VERSION, 'wf32-hard-pairing-source.v1');
    assert.deepEqual(HARD_PAIRING_FAMILIES, ['flagstone', 'cobble', 'brick']);
    const before = createWorldMasonryWindow('flagstone', settings);
    createHardPairingWindow('flagstone', 'cobble', settings);
    const after = createWorldMasonryWindow('flagstone', settings);
    assert.deepEqual(before.albedo.data, after.albedo.data);
    assert.deepEqual(before.stoneIds, after.stoneIds);
    assert.throws(() => createHardPairingWindow('flagstone', 'flagstone'), RangeError);
    assert.throws(() => createHardPairingWindow('grass', 'cobble'), RangeError);
    assert.throws(() => createHardPairingWindow('brick', 'mud'), RangeError);
    assert.throws(() => createHardPairingWindow('brick', 'cobble', {
        ...settings, seamMaterial: 'flagstone'}), RangeError);
    assert.throws(() => createHardPairingWindow('brick', 'cobble', {
        ...settings, width: 127}), RangeError);
    assert.throws(() => createHardPairingWindow('brick', 'cobble', {
        ...settings, role: 'fictional'}), RangeError);
});

test('native and 3x art reviews contain all six authentic pair directions', () => {
    const result = buildHardPairingReview();
    assert.equal(result.scene.width, 768);
    assert.equal(result.scene.height, 448);
    assert.equal(result.enlarged.width, 2304);
    assert.equal(result.enlarged.height, 1344);
    assert.equal(result.manifest.panels.length, 6);
    assert.equal(result.manifest.nativePixelScale, 1);
    assert.match(result.manifest.status, /NOT A LIVE HUNT SCREENSHOT/);
    for (const panel of result.manifest.panels) {
        assert.ok(panel.stonePixelsPrimary > 0);
        assert.ok(panel.stonePixelsSecondary > 0);
        assert.ok(panel.infillPixels > 0);
    }
    assert.deepEqual(result.scene.get(270, 280), result.enlarged.get(810, 840));
    assert.equal(result.representative.normal.width, 256);
    assert.equal(result.representative.roughnessMap.height, 192);
});

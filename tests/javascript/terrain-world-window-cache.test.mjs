import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldArtWindowCache } from '../../tools/art/prototypes/terrain-world-window-cache.mjs';
import { createWorldBoundaryWindow, createWorldMasonryWindow,
    worldLightingMaps } from '../../tools/art/prototypes/terrain-world-variation.mjs';

const masonryOptions = {seed: 1781, state: 'collapsed', originX: 64, originY: 32,
    width: 32, height: 32};
const boundaryOptions = {seed: 2211, state: 'reclaimed', originX: 0, originY: 0,
    width: 32, height: 32, role: 'inner-nw', boundaryX: 16, boundaryY: 16};

function assertSameField(actual, expected) {
    assert.deepEqual(actual.albedo.data, expected.albedo.data);
    assert.deepEqual(actual.stoneIds, expected.stoneIds);
    assert.deepEqual(actual.heights, expected.heights);
    assert.deepEqual(actual.roughness, expected.roughness);
    if (expected.originalIds) {
        assert.deepEqual(actual.originalIds, expected.originalIds);
    }
    assert.notStrictEqual(actual.albedo.data, expected.albedo.data);
    assert.notStrictEqual(actual.stoneIds, expected.stoneIds);
}

test('cached masonry is byte-identical to the authoritative uncached world source', () => {
    const cache = createWorldArtWindowCache();
    const uncached = createWorldMasonryWindow('flagstone', masonryOptions);
    const first = cache.masonry('flagstone', masonryOptions);
    const again = cache.masonry('flagstone', {
        height: 32, width: 32, originY: 32, originX: 64, state: 'collapsed', seed: 1781
    });
    assertSameField(first, uncached);
    assertSameField(again, uncached);
    assert.equal(cache.stats().hits, 1);
    assert.equal(cache.stats().misses, 1);
    assert.equal(cache.stats().entries, 1);
});

test('hard/soft boundary cache preserves whole-stone blending and G map inputs', () => {
    const cache = createWorldArtWindowCache();
    const expected = createWorldBoundaryWindow('cobble', 'soil', boundaryOptions);
    const first = cache.boundary('cobble', 'soil', boundaryOptions);
    const repeated = cache.boundary('cobble', 'soil', boundaryOptions);
    assertSameField(first, expected);
    assertSameField(repeated, expected);
    assert.deepEqual(worldLightingMaps(repeated).normal.data,
        worldLightingMaps(expected).normal.data);
    assert.equal(cache.stats().hits, 1);
});

test('caller mutations can never leak into subsequent cached art or alternate callers', () => {
    const cache = createWorldArtWindowCache();
    const original = createWorldMasonryWindow('brick', masonryOptions);
    const writable = cache.masonry('brick', masonryOptions);
    writable.albedo.set(0, 0, '#ff00ff');
    writable.stoneIds.fill(-1);
    writable.originalIds.fill(-2);
    writable.heights.fill(0);
    writable.roughness.fill(0);
    const clean = cache.masonry('brick', masonryOptions);
    assertSameField(clean, original);

    const boundary = cache.boundary('flagstone', 'grass', boundaryOptions);
    boundary.albedo.set(0, 0, '#ff00ff');
    boundary.stoneIds.fill(-7);
    assertSameField(cache.boundary('flagstone', 'grass', boundaryOptions),
        createWorldBoundaryWindow('flagstone', 'grass', boundaryOptions));
});

test('LRU retention is bounded by entry count and evicts least recently accessed window', () => {
    const cache = createWorldArtWindowCache({maxEntries: 2, maxBytes: 1_000_000});
    const at = originX => ({...masonryOptions, originX});
    cache.masonry('cobble', at(0));
    cache.masonry('cobble', at(32));
    cache.masonry('cobble', at(0)); // Refresh first entry.
    cache.masonry('cobble', at(64)); // Evict originX=32.
    assert.deepEqual({hits: cache.stats().hits, misses: cache.stats().misses,
        evictions: cache.stats().evictions, entries: cache.stats().entries},
    {hits: 1, misses: 3, evictions: 1, entries: 2});
    cache.masonry('cobble', at(32));
    assert.equal(cache.stats().misses, 4);
    assert.ok(cache.stats().bytesUsed <= cache.stats().maxBytes);
    cache.clear();
    assert.equal(cache.stats().bytesUsed, 0);
    assert.equal(cache.stats().entries, 0);
    assert.equal(cache.stats().hits, 0);
});

test('oversize windows are generated correctly but never retained', () => {
    const cache = createWorldArtWindowCache({maxEntries: 2, maxBytes: 10_000});
    const first = cache.masonry('flagstone', masonryOptions);
    assertSameField(first, createWorldMasonryWindow('flagstone', masonryOptions));
    cache.masonry('flagstone', masonryOptions);
    assert.equal(cache.stats().hits, 0);
    assert.equal(cache.stats().misses, 2);
    assert.equal(cache.stats().entries, 0);
    assert.equal(cache.stats().bytesUsed, 0);
});

test('keys separate seed, world origin, boundary role, neighbor and wear state', () => {
    const cache = createWorldArtWindowCache();
    cache.boundary('flagstone', 'grass', boundaryOptions);
    cache.boundary('flagstone', 'soil', boundaryOptions);
    cache.boundary('flagstone', 'grass', {...boundaryOptions, role: 'outer-nw'});
    cache.boundary('flagstone', 'grass', {...boundaryOptions, seed: 3});
    cache.boundary('flagstone', 'grass', {...boundaryOptions, originX: 32});
    cache.boundary('flagstone', 'grass', {...boundaryOptions, state: 'broken'});
    assert.equal(cache.stats().misses, 6);
    assert.equal(cache.stats().entries, 6);
});

test('cache preserves original validity rules and rejects unsafe capacity settings', () => {
    assert.throws(() => createWorldArtWindowCache({maxEntries: 0}), RangeError);
    assert.throws(() => createWorldArtWindowCache({maxBytes: -1}), RangeError);
    assert.throws(() => createWorldArtWindowCache({maxBytes: Number.MAX_VALUE}), RangeError);
    const cache = createWorldArtWindowCache();
    assert.throws(() => cache.masonry('unknown', masonryOptions), RangeError);
    assert.throws(() => cache.masonry('brick', {...masonryOptions, width: 63}), RangeError);
    assert.throws(() => cache.boundary('brick', 'cobble', boundaryOptions), RangeError);
    assert.throws(() => cache.boundary('brick', 'mud', null), TypeError);
    assert.equal(cache.stats().entries, 0);
});

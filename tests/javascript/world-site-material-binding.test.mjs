import test from 'node:test';
import assert from 'node:assert/strict';
import {
    WORLD_SITE_MATERIALS, worldSiteMaterialName, normalizeWorldSiteMaterialWeights,
    sampleWorldSiteMaterialWeights, worldSiteMaterialCacheKey, worldSiteSourceBindings,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-material-binding.js';

const world = { siteId: 'mountain-4', worldSeed: 1742, landscape: {
    kind: 'mountain-pass', elevation: { columns: 2, rows: 2, samples: [] } } };
const sample = (material, weight) => ({ material, ...Object.fromEntries(
    WORLD_SITE_MATERIALS.map(spec => [spec.weight, spec.name === material ? weight : 0])) });

test('AR4-A1 preserves all seven C# WorldSiteSurfaceId / weight bindings in enum order', () => {
    assert.deepEqual(WORLD_SITE_MATERIALS.map(spec => spec.name),
        ['Soil', 'Grass', 'Road', 'Mud', 'Rock', 'ShallowWater', 'GlacialIce']);
    assert.deepEqual(WORLD_SITE_MATERIALS.map(spec => spec.weight),
        ['soilWeight', 'grassWeight', 'roadWeight', 'mudWeight', 'rockWeight', 'waterWeight', 'iceWeight']);
    for (const spec of WORLD_SITE_MATERIALS) {
        assert.equal(worldSiteMaterialName(spec.id), spec.name);
        assert.equal(worldSiteMaterialName(spec.name), spec.name);
        assert.equal(normalizeWorldSiteMaterialWeights(sample(spec.name, 2))[spec.name], 1);
    }
    assert.equal(worldSiteMaterialName(7), null);
    assert.equal(worldSiteMaterialName('bogus'), null);
});

test('AR4-A1 normalizes valid weights without mutating server samples', () => {
    const incoming = { ...sample('Soil', 2), grassWeight: 3, mudWeight: -1 };
    const original = { ...incoming };
    const result = normalizeWorldSiteMaterialWeights(incoming);
    assert.equal(result.Soil, .4);
    assert.equal(result.Grass, .6);
    assert.equal(result.Mud, 0);
    assert.equal(Object.values(result).reduce((a, b) => a + b), 1);
    assert.deepEqual(incoming, original);
    assert.ok(Object.isFrozen(result));
});

test('AR4-A1 uses semantic dominant fallback for missing or damaged texture weights', () => {
    assert.equal(normalizeWorldSiteMaterialWeights({ material: 4 }).Rock, 1);
    assert.equal(normalizeWorldSiteMaterialWeights({ material: 'ShallowWater', waterWeight: NaN }).ShallowWater, 1);
    assert.equal(normalizeWorldSiteMaterialWeights({ material: 123 }).Soil, 1);
    assert.equal(normalizeWorldSiteMaterialWeights(null), null);
});

test('AR4-A1 visual interpolation only samples immutable C# site-space weights', () => {
    const preview = { columns: 2, rows: 2, samples: [
        sample('Soil', 1), sample('Grass', 1), sample('Road', 1), sample('Rock', 1),
    ] };
    const center = sampleWorldSiteMaterialWeights(preview, .5, .5);
    assert.equal(center.Soil, .25);
    assert.equal(center.Grass, .25);
    assert.equal(center.Road, .25);
    assert.equal(center.Rock, .25);
    assert.equal(sampleWorldSiteMaterialWeights(preview, 0, 0).Soil, 1);
    assert.equal(sampleWorldSiteMaterialWeights(preview, 2, -1).Grass, 1);
    assert.deepEqual(sampleWorldSiteMaterialWeights(preview, .5, .5), center);
    assert.equal(sampleWorldSiteMaterialWeights({ columns: 2, rows: 2, samples: [] }, 0, 0), null);
    assert.equal(sampleWorldSiteMaterialWeights(preview, NaN, 0), null);
});

test('AR4-A1 source approvals expose unavailable classes rather than invented textures', () => {
    const defaultBindings = worldSiteSourceBindings(world);
    assert.deepEqual(defaultBindings.map(binding => binding.sourceApproved),
        [true, true, false, true, false, false, false]);
    assert.equal(defaultBindings[2].sourceFamily, 'soil');
    assert.equal(defaultBindings[4].sourceFamily, null);
    assert.equal(defaultBindings[5].sourceGate, 'water-not-approved');
    const monastery = worldSiteSourceBindings({ landscape: { kind: 'mountain-monastery' } });
    assert.equal(monastery[2].sourceFamily, 'flagstone');
    assert.equal(monastery[2].sourceApproved, false, 'whole-stone boundaries cannot be faked by pixel alpha');
});

test('AR4-A1 cache identity is anchored to site, grid, source revision, not the camera', () => {
    const a = worldSiteMaterialCacheKey(world, 390, 700, 'wf32-p1i-v1');
    assert.equal(a, worldSiteMaterialCacheKey({ ...world }, 390, 700, 'wf32-p1i-v1'));
    assert.notEqual(a, worldSiteMaterialCacheKey({ ...world, worldSeed: 1743 }, 390, 700, 'wf32-p1i-v1'));
    assert.notEqual(a, worldSiteMaterialCacheKey(world, 390, 700, 'wf32-p1j-v2'));
    assert.notEqual(a, worldSiteMaterialCacheKey(world, 320, 568, 'wf32-p1i-v1'));
    assert.equal(worldSiteMaterialCacheKey(null, 390, 700), null);
});

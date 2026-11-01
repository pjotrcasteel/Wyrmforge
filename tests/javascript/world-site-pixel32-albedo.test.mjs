import test from 'node:test';
import assert from 'node:assert/strict';
import { PIXEL32_ATLAS, composeWorldSitePixel32Albedo } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-pixel32-albedo.js';

const names = ['Soil', 'Grass', 'Road', 'Mud', 'Rock', 'ShallowWater', 'GlacialIce'];
const weights = ['soilWeight', 'grassWeight', 'roadWeight', 'mudWeight', 'rockWeight', 'waterWeight', 'iceWeight'];
const sample = material => ({ material, ...Object.fromEntries(
    weights.map((key, index) => [key, names[index] === material ? 1 : 0])) });
const site = (material, kind = 'forest-fork', seed = 1387) => ({
    siteId: 'review-test', worldSeed: seed, landscape: { kind,
        elevation: { columns: 2, rows: 2, samples: Array(4).fill(sample(material)) } },
});

function atlas() {
    const { width, height } = PIXEL32_ATLAS;
    const data = new Uint8ClampedArray(width * height * 4);
    // Every 32px source frame has a different exact RGB and an unmistakable x/y pixel gradient.
    for (const [originX, originY, family] of [
        [67, 67, 30], [100, 67, 30], [133, 67, 30],
        [100, 34, 60], [133, 34, 60], [166, 34, 60],
        [199, 34, 90], [1, 67, 90], [34, 67, 90],
    ]) for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const p = ((originY + y) * width + originX + x) * 4;
        data[p] = family;
        data[p + 1] = x;
        data[p + 2] = y;
        data[p + 3] = 255;
    }
    return { width, height, data };
}

const pixel = (result, x, y) => [...result.data.slice((y * result.width + x) * 4,
    (y * result.width + x) * 4 + 4)];

test('AR4-B candidate uses exact original 32px source pixels at 1:1 world phase, without RGB blur', () => {
    for (const [material, red] of [['Soil', 30], ['Grass', 60], ['Mud', 90]]) {
        const result = composeWorldSitePixel32Albedo(site(material), 65, 69, atlas());
        assert.equal(result.prototypeOnly, true);
        assert.deepEqual(pixel(result, 0, 0), [red, 0, 0, 255]);
        assert.deepEqual(pixel(result, 13, 21), [red, 13, 21, 255]);
        assert.deepEqual(pixel(result, 34, 63), [red, 2, 31, 255]);
        assert.deepEqual(pixel(result, 64, 68), [red, 0, 4, 255]);
    }
});

test('AR4-B candidate is deterministic across camera and seed, with nonrepeating adjacent cell variants', () => {
    const source = atlas();
    // Each variant is separated in a full atlas by its 32px RGB marker.
    for (const [originX, originY, family] of [[67, 67, 30], [100, 67, 30], [133, 67, 30]])
        source.data[(originY * source.width + originX) * 4] = family + (originX === 67 ? 0 : originX === 100 ? 1 : 2);
    const a = composeWorldSitePixel32Albedo(site('Soil'), 96, 96, source);
    const b = composeWorldSitePixel32Albedo(site('Soil'), 96, 96, source);
    assert.deepEqual(a.data, b.data);
    assert.notEqual(pixel(a, 0, 0)[0], pixel(a, 32, 0)[0]);
    assert.notEqual(pixel(a, 0, 0)[0], pixel(a, 0, 32)[0]);
});

test('AR4-B candidate keeps all seven C# materials and does not counterfeit unapproved stone', () => {
    const source = atlas();
    assert.equal(pixel(composeWorldSitePixel32Albedo(site('Road'), 4, 4, source), 0, 0)[0], 30,
        'an ordinary road only borrows approved soil pixels for an explicitly provisional study');
    assert.deepEqual(pixel(composeWorldSitePixel32Albedo(site('Road', 'mountain-monastery'),
        4, 4, source), 0, 0), [158, 139, 105, 255],
    'monastery flagstone has a separate, still-unapproved whole-stone source gate');
    assert.deepEqual(pixel(composeWorldSitePixel32Albedo(site('Rock'), 4, 4, source), 0, 0),
        [80, 96, 108, 255]);
    assert.deepEqual(pixel(composeWorldSitePixel32Albedo(site('ShallowWater'), 4, 4, source), 0, 0),
        [75, 112, 124, 255]);
    assert.deepEqual(pixel(composeWorldSitePixel32Albedo(site('GlacialIce'), 4, 4, source), 0, 0),
        [171, 190, 202, 255]);
});

test('AR4-B candidate rejects missing, malformed and geographically invalid inputs', () => {
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 64, 64, null), null);
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 64, 64,
        { ...atlas(), width: 256 }), null);
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 2049, 1, atlas()), null);
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 1, 3073, atlas()), null);
    assert.equal(composeWorldSitePixel32Albedo({ ...site('Grass'), landscape: null }, 4, 4, atlas()), null);
    assert.equal(composeWorldSitePixel32Albedo({ ...site('Grass'),
        landscape: { elevation: { columns: 2, rows: 2, samples: [] } } }, 4, 4, atlas()), null);
});

test('AR4-B candidate follows only C# sample weights and keeps boundaries on 4px visual clusters', () => {
    const mixed = site('Grass');
    mixed.landscape.elevation.samples[1] = sample('Soil');
    mixed.landscape.elevation.samples[3] = sample('Soil');
    const result = composeWorldSitePixel32Albedo(mixed, 64, 32, atlas());
    assert.equal(pixel(result, 0, 8)[0], 60);
    assert.equal(pixel(result, 63, 8)[0], 30);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++)
        assert.ok([30, 60].includes(pixel(result, x, y)[0]), 'never color-interpolate C# materials');
});

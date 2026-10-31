import test from 'node:test';
import assert from 'node:assert/strict';
import { composeWorldSiteNeutralAlbedo, stitchWorldSiteSourceBands, worldSiteMaterialModeEnabled } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-neutral-albedo.js';

const image = (r, g, b, width = 32, height = 32) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index++) {
        data.set([r, g, b, 255], index * 4);
    }
    return { width, height, data };
};
const sources = {
    soil: image(100, 30, 20),
    grass: image(10, 200, 40),
    mud: image(20, 30, 180),
};
const sample = weights => ({
    material: 0,
    soilWeight: 0, grassWeight: 0, roadWeight: 0, mudWeight: 0,
    rockWeight: 0, waterWeight: 0, iceWeight: 0, ...weights,
});
const site = samples => ({ siteId: 'forest-4', worldSeed: 1337, landscape: {
    kind: 'forest-fork', elevation: { columns: 2, rows: 2, samples } } });

test('AR4-A2 composes pure source pixels from C# material influences with native 32px source', () => {
    const geography = site(Array.from({ length: 4 }, () => sample({ soilWeight: .5, grassWeight: .5 })));
    const result = composeWorldSiteNeutralAlbedo(geography, 32, 32, sources);
    assert.ok(result);
    assert.deepEqual([...result.data.slice(0, 4)], [55, 115, 30, 255]);
    assert.deepEqual([...result.data.slice(-4)], [55, 115, 30, 255]);
    assert.deepEqual(composeWorldSiteNeutralAlbedo(geography, 32, 32, sources), result);
});

test('AR4-A2 does not paint fake stone, ice, water or shadows where source is not approved', () => {
    const rock = site(Array.from({ length: 4 }, () => sample({ rockWeight: 1 })));
    const result = composeWorldSiteNeutralAlbedo(rock, 32, 32, sources);
    assert.deepEqual([...result.data.slice(0, 4)], [80, 96, 108, 255], 'rock uses explicit neutral fallback');
    assert.ok(result.data.every((pixel, index) => index % 4 === 3 ? pixel === 255 : pixel >= 0));
});

test('AR4-A2 returns control to existing semantic view when source is missing, invalid or too small', () => {
    const geography = site(Array.from({ length: 4 }, () => sample({ grassWeight: 1 })));
    assert.equal(composeWorldSiteNeutralAlbedo(geography, 32, 32, null), null);
    assert.equal(composeWorldSiteNeutralAlbedo(geography, 32, 32, { ...sources, grass: null }), null);
    assert.equal(composeWorldSiteNeutralAlbedo(geography, 33, 32, sources), null, 'undersized art never repeats');
    assert.equal(composeWorldSiteNeutralAlbedo(geography, 32, 32, { ...sources, soil: { width: 32, height: 32 } }), null);
    assert.equal(composeWorldSiteNeutralAlbedo(geography, 0, 32, sources), null);
    assert.equal(composeWorldSiteNeutralAlbedo(null, 32, 32, sources), null);
});

test('AR4-A2 composite changes only with the server-owned sample lattice', () => {
    const grass = sample({ grassWeight: 1 });
    const mud = sample({ mudWeight: 1 });
    const geography = site([grass, mud, mud, grass]);
    const actual = composeWorldSiteNeutralAlbedo(geography, 32, 32, sources);
    assert.notDeepEqual([...actual.data.slice(0, 3)], [...actual.data.slice(31 * 4, 31 * 4 + 3)]);
    assert.notDeepEqual([...actual.data.slice(0, 3)], [...actual.data.slice(31 * 32 * 4, 31 * 32 * 4 + 3)]);
    assert.deepEqual(geography.landscape.elevation.samples, [grass, mud, mud, grass], 'never mutates C# source');
});

test('AR4-A2 material review is explicitly opt-in, not the normal Hunt or AR3 semantic view', () => {
    const old = globalThis.location;
    try {
        globalThis.location = { search: '' };
        assert.equal(worldSiteMaterialModeEnabled(), false);
        globalThis.location = { search: '?arenaTerrain=semantic' };
        assert.equal(worldSiteMaterialModeEnabled(), false);
        globalThis.location = { search: '?arenaTerrain=materials' };
        assert.equal(worldSiteMaterialModeEnabled(), true);
    } finally {
        if (old === undefined) delete globalThis.location;
        else globalThis.location = old;
    }
});

test('AR4-A2 stitches original absolute-world source windows without a 256px repeat or phase reset', () => {
    const top = image(45, 60, 75, 32, 800);
    const bottom = image(140, 110, 90, 32, 768);
    const source = stitchWorldSiteSourceBands([top, bottom]);
    assert.equal(source.width, 32);
    assert.equal(source.height, 1568);
    assert.deepEqual([...source.data.slice(0, 4)], [45, 60, 75, 255]);
    assert.deepEqual([...source.data.slice(799 * 32 * 4, 799 * 32 * 4 + 4)], [45, 60, 75, 255]);
    assert.deepEqual([...source.data.slice(800 * 32 * 4, 800 * 32 * 4 + 4)], [140, 110, 90, 255]);
    assert.deepEqual([...source.data.slice(1567 * 32 * 4, 1567 * 32 * 4 + 4)], [140, 110, 90, 255]);
    assert.equal(stitchWorldSiteSourceBands([top, image(0, 0, 0, 32, 800)]), null);
    assert.equal(stitchWorldSiteSourceBands([top]), null);
});

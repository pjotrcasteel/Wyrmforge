import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PIXEL32_ATLAS, PIXEL32_QUIET_ATLAS, composeWorldSitePixel32Albedo } from
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

test('AR4-B source32 atlas has its exact #429 blob fingerprint, dimensions and original frame padding', () => {
    const base = '../../src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/prototype32/';
    const png = readFileSync(new URL(base + 'atlas.png', import.meta.url));
    const manifest = JSON.parse(readFileSync(new URL(base + 'manifest.json', import.meta.url), 'utf8'));
    const gitSha = createHash('sha1').update(`blob ${png.length}\0`).update(png).digest('hex');
    assert.equal(gitSha, '99924850581f7d5218a25ba0b59553aa438c866e');
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), PIXEL32_ATLAS.width);
    assert.equal(png.readUInt32BE(20), PIXEL32_ATLAS.height,
        'the bottom 1px atlas padding must not be trimmed');
    assert.equal(manifest.version, 'wf-original-32.v2');
    assert.equal(manifest.status, 'prototype-only');
    assert.equal(manifest.tilePixels, 32);
    assert.equal(Object.keys(manifest.frames).length, 22);
    for (const frame of Object.values(manifest.frames)) {
        assert.equal(frame.w, 32);
        assert.equal(frame.h, 32);
        assert.ok(frame.x >= 1 && frame.y >= 1);
        assert.ok(frame.x + frame.w < PIXEL32_ATLAS.width);
        assert.ok(frame.y + frame.h < PIXEL32_ATLAS.height);
    }
});

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

function quietAtlas() {
    const { width, height } = PIXEL32_QUIET_ATLAS;
    const data = new Uint8ClampedArray(width * height * 4);
    const manifest = JSON.parse(readFileSync(new URL(
        '../../src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-quiet/manifest.json',
        import.meta.url), 'utf8'));
    const marks = new Map();
    for (const [name, frame] of Object.entries(manifest.frames)) {
        const mark = name.startsWith('grass.') ? 120 + Number(name.split('.')[1])
            : name.startsWith('road.') ? 200 + Number(name.split('.')[1])
            : name.startsWith('edge.') ? 80 + ['left','right','up','down']
                .indexOf(name.split('-')[1])
            : 60 + ['nw','ne','sw','se'].indexOf(name.split('-')[1]);
        marks.set(name, mark);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
            const i = ((frame.y + y) * width + frame.x + x) * 4;
            data[i] = mark;
            data[i + 1] = x;
            data[i + 2] = y;
            data[i + 3] = 255;
        }
    }
    return { width, height, data, marks };
}

test('AR4-B quiet preview owns an independently authored reproducible source atlas, leaving #429 pristine', () => {
    const base = '../../src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-quiet/';
    const png = readFileSync(new URL(base + 'atlas.png', import.meta.url));
    const manifest = JSON.parse(readFileSync(new URL(base + 'manifest.json', import.meta.url), 'utf8'));
    const gitSha = createHash('sha1').update(`blob ${png.length}\0`).update(png).digest('hex');
    assert.equal(gitSha, '849fb1f79d78de84759675f46b586df730a3a1cd');
    assert.equal(png.readUInt32BE(16), PIXEL32_QUIET_ATLAS.width);
    assert.equal(png.readUInt32BE(20), PIXEL32_QUIET_ATLAS.height);
    assert.equal(manifest.revision, PIXEL32_QUIET_ATLAS.revision);
    assert.equal(manifest.tilePixels, 32);
    assert.equal(manifest.approved, false);
    assert.equal(Object.keys(manifest.frames).length, 18);
    for (const frame of Object.values(manifest.frames)) {
        assert.equal(frame.w, 32);
        assert.equal(frame.h, 32);
        assert.ok(frame.x + 32 <= PIXEL32_QUIET_ATLAS.width);
        assert.ok(frame.y + 32 <= PIXEL32_QUIET_ATLAS.height);
    }
});

test('AR4-B quiet study has distinct 32px grass/path and authored 4px transition banks without RGB blur', () => {
    const quiet = quietAtlas();
    const forest = composeWorldSitePixel32Albedo(site('Grass'), 96, 64, atlas(), quiet);
    assert.equal(forest.artSource, PIXEL32_QUIET_ATLAS.revision);
    assert.ok(pixel(forest, 12, 12)[0] >= 120 && pixel(forest, 12, 12)[0] <= 125);
    const road = composeWorldSitePixel32Albedo(site('Road'), 96, 64, atlas(), quiet);
    assert.ok(pixel(road, 12, 12)[0] >= 200 && pixel(road, 12, 12)[0] <= 203);

    const mixed = site('Grass');
    mixed.landscape.elevation.samples[1] = sample('Road');
    mixed.landscape.elevation.samples[3] = sample('Road');
    const crossing = composeWorldSitePixel32Albedo(mixed, 64, 32, atlas(), quiet);
    assert.equal(pixel(crossing, 30, 10)[0], quiet.marks.get('edge.grass-left'));
    assert.equal(pixel(crossing, 33, 10)[0], quiet.marks.get('edge.grass-left'));
    assert.deepEqual(pixel(crossing, 30, 10).slice(1), [14, 10, 255]);
    assert.equal(pixel(crossing, 24, 10)[0] >= 120, true, 'interior remains authored grass');
    assert.equal(pixel(crossing, 40, 10)[0] >= 200, true, 'interior remains authored road');
});

test('AR4-B quiet study never changes C# monastery paving or draws without its source', () => {
    const source = atlas(), quiet = quietAtlas();
    assert.equal(composeWorldSitePixel32Albedo(site('Road', 'mountain-monastery'),
        8, 8, source, quiet).artSource, PIXEL32_QUIET_ATLAS.revision);
    assert.deepEqual(pixel(composeWorldSitePixel32Albedo(site('Road', 'mountain-monastery'),
        8, 8, source, quiet), 0, 0), [158, 139, 105, 255]);
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 32, 32,
        source, { ...quiet, width: 495 }), null);
    const a = composeWorldSitePixel32Albedo(site('Grass'), 64, 64, source, quiet);
    const b = composeWorldSitePixel32Albedo(site('Grass'), 64, 64, source, quiet);
    assert.deepEqual(a.data, b.data);
    assert.equal(composeWorldSitePixel32Albedo(site('Grass'), 32, 32,
        source).artSource, PIXEL32_ATLAS.revision, 'original source32 mode unchanged');
});

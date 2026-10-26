import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTerritoryStoryPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js';
import {
    wetForestVariantForSeed, liveWetForestArtworkGeneration,
    liveWetForestMaterialDiagnostics, liveWetForestMaterialPlan,
    preloadLiveWetForestMaterials, drawLiveWetForestMaterialBase,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-live-wet-forest-materials.js';

const recipe = Object.freeze({
    trail: [
        { x: .45, y: 0, width: .14 }, { x: .55, y: .5, width: .15 },
        { x: .5, y: 1, width: .14 },
    ],
    ground: [{ kind: 'mud', x: .2, y: .3, radiusX: .1, radiusY: .2 }],
    site: 'abandoned-camp', siteX: .55, siteY: .5,
});
const tiles = () => Array.from({ length: 16 }, (_, i) => ({
    x: i % 4 * 12, y: Math.floor(i / 4) * 12,
    material: ['moss', 'road', 'mud', 'puddle', 'loam', 'leafbed', 'clearing'][i % 7],
}));

test('real 12px WetForest material plan maps to EXACTLY the three archived sources', () => {
    const source = tiles(), original = structuredClone(source);
    const result = liveWetForestMaterialPlan(source, 1204, 48, 48);
    assert.equal(result.seed, 1204);
    assert.deepEqual(result, liveWetForestMaterialPlan(source, 1204, 48, 48));
    assert.deepEqual(source, original);
    assert.equal(result.columns, 3);
    assert.equal(result.rows, 3);
    assert.ok([...new Set(result.board)].every(id => [0, 1, 3].includes(id)));
    assert.ok([...new Set(result.board)].includes(3));
    assert.ok([...new Set(result.board)].includes(1));
    assert.equal(liveWetForestMaterialPlan(source.slice(1), 1204, 48, 48), null);
    assert.equal(liveWetForestMaterialPlan(source, 1204, 8192, 8192), null);
    assert.equal(liveWetForestMaterialPlan(source.map(t => ({ ...t, material: 'invented' })), 1204, 48, 48), null);
    assert.deepEqual(liveWetForestMaterialPlan(source, 1205, 48, 48)?.board, result.board);
});

test('normal Hunts use the same C# recipe visuals but retain generatorPreview=false and existing gates', () => {
    const scene = createTerritoryStoryPlan({
        seed: 1204, biome: 'River valley', stage: 2, district: 'causeway',
        habitat: 'WetForest', generatorPreview: false, wetForest: recipe, props: [],
        element: 'fire', corruption: .3,
    }, 950, 1550);
    assert.equal(scene.wetForest, recipe);
    assert.equal(scene.generatorPreview, false);
    assert.equal(scene.landmarks.length, 0);
    const read = path => readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/' + path, import.meta.url), 'utf8');
    const real = read('arena.js');
    const ground = read('arena-wet-forest-art.js');
    const environ = read('arena-environment.js');
    const adapter = read('arena-live-wet-forest-materials.js');
    assert.match(real, /drawArenaEnvironment\(ctx, snapshot\.environment/);
    assert.match(ground, /drawLiveWetForestMaterialBase\(ctx, tiles, seed, width, height\)/);
    assert.match(environ, /liveWetForestArtworkGeneration\(\)/);
    assert.match(adapter, /bakeSourceBackedThreeMaterialGround/);
    assert.doesNotMatch(adapter, /new (?:WebGLRenderer|LightingEngine)|Math\.random|generatorPreview/);
});

test('actual live fallback switches to the original PR340 paintings once decoded, only one ground bake per seed', async () => {
    const oldImage = globalThis.Image;
    const requested = [];
    globalThis.Image = class {
        width = 900;
        height = 900;
        set src(value) {
            requested.push(value);
            queueMicrotask(() => this.onload?.());
        }
    };
    try {
        const seed = 1204;
        assert.equal(wetForestVariantForSeed(seed), 5);
        assert.equal(wetForestVariantForSeed(null), null);
        const first = liveWetForestArtworkGeneration();
        const calls = [];
        const ctx = {
            save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
            set imageSmoothingEnabled(v) { assert.equal(v, false); },
            drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) {
                assert.equal(image.width, 900);
                assert.equal(image.height, 900);
                assert.ok(sx >= 0 && sy >= 0 && sx + sw <= 900 && sy + sh <= 900);
                calls.push([image, sx, sy, sw, sh, dx, dy, dw, dh]);
            },
        };
        assert.equal(drawLiveWetForestMaterialBase(ctx, tiles(), seed, 48, 48), false,
            'The playable arena must render the existing fallback until the real painting loads.');
        assert.equal(liveWetForestMaterialDiagnostics(seed).status, 'loading');
        assert.equal(await preloadLiveWetForestMaterials(seed), true);
        assert.equal(requested.length, 3, 'Exactly one grass, mud and soil PNG per level, not 18 uploads.');
        assert.ok(requested.every(url => /-ART-CANDIDATE-05\.png$|-INDEPENDENT-ART-CANDIDATE-05\.png$/.test(url)));
        assert.equal(liveWetForestArtworkGeneration(), first + 1);
        assert.equal(liveWetForestMaterialDiagnostics(seed).status, 'source-backed');
        assert.equal(drawLiveWetForestMaterialBase(ctx, tiles(), seed, 48, 48), true);
        assert.ok(calls.length > 9, 'The live floor must contain the original paintings and organic contacts.');
        const { drawWetForestGround } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-art.js');
        let painterDraws = 0;
        const sourceOnlyContext = {
            ...ctx,
            set fillStyle(_value) {},
            fillRect() { throw new Error('Old synthetic ground/site details must not cover the PR340 paintings.'); },
            drawImage(...args) { painterDraws++; ctx.drawImage(...args); },
        };
        drawWetForestGround(sourceOnlyContext, {
            wetForest: { site: 'broken-wagon', siteX: .5, siteY: .5,
                trail: [{ x: .5, y: 0, width: .18 }, { x: .5, y: 1, width: .18 }],
                ground: [] },
            seed, width: 48, height: 48, forestProps: [], corruption: 0, element: 'fire',
        });
        assert.ok(painterDraws > 0, 'The playable floor must paint actual archived art without new stamps.');
        const original = calls.slice();
        calls.length = 0;
        assert.equal(drawLiveWetForestMaterialBase(ctx, tiles(), seed, 48, 48), true);
        assert.deepEqual(calls, original, 'The live floor must be deterministic for the same seed.');
        assert.equal(requested.length, 3, 'Cached materials must not trigger per-frame fetches.');
    } finally {
        globalThis.Image = oldImage;
    }
});

test('unavailable archived art does not break the playable level or silently draw new pixels', async () => {
    const oldImage = globalThis.Image;
    globalThis.Image = class {
        width = 50;
        height = 50;
        set src(_url) { queueMicrotask(() => this.onload?.()); }
    };
    try {
        const seed = 1205;
        assert.equal(await preloadLiveWetForestMaterials(seed), false);
        assert.equal(liveWetForestMaterialDiagnostics(seed).status, 'fallback-error');
        assert.equal(drawLiveWetForestMaterialBase({}, tiles(), seed, 48, 48), false);
    } finally {
        globalThis.Image = oldImage;
    }
});

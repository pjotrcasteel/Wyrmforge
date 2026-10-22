import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approvedWetForestMaterial, approvedWetForestBoard, drawApprovedWetForestBase }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-approved-ground-preview.js';
import { MATERIALS, GROUND_TILE_SIZE } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js';

test('approved Wet Forest swatches map existing semantic C# terrain without inventing locations', () => {
    assert.deepEqual(
        ['loam', 'moss', 'mud', 'leafbed', 'puddle', 'road', 'clearing'].map(approvedWetForestMaterial),
        ['grass', 'grass', 'mud', 'dirt', 'marsh', 'dirt', 'dirt']);
    assert.equal(approvedWetForestMaterial('unknown'), 'grass');
    const tiles = [
        { x: 0, y: 0, material: 'loam' }, { x: 12, y: 0, material: 'mud' },
        { x: 24, y: 0, material: 'road' }, { x: 0, y: 12, material: 'puddle' },
        { x: 12, y: 12, material: 'leafbed' }, { x: 24, y: 12, material: 'clearing' },
        { x: 0, y: 24, material: 'moss' }, { x: 12, y: 24, material: 'moss' },
        { x: 24, y: 24, material: 'loam' },
    ];
    const first = approvedWetForestBoard(tiles, 36, 36);
    assert.deepEqual(first, approvedWetForestBoard(tiles, 36, 36));
    assert.deepEqual([...first.board], [0, 3, 3, 0, 0, 0, 0, 0, 0]);
    assert.equal(first.columns, 3);
    assert.equal(first.rows, 3);
    assert.equal(approvedWetForestBoard([], 36, 36), null);
    assert.equal(approvedWetForestBoard(tiles, 0, 36), null);
    assert.equal(approvedWetForestBoard(tiles, 36, 36, 16), null);
});

test('approved floor paints with the same accepted seamless atlas and transition algorithm', () => {
    const tiles = Array.from({ length: 9 }, (_, i) =>
        ({ x: i % 3 * 12, y: Math.floor(i / 3) * 12, material: i === 2 ? 'mud' : 'moss' }));
    const atlas = { width: MATERIALS.length * GROUND_TILE_SIZE, height: GROUND_TILE_SIZE };
    const operations = [];
    const ctx = {
        globalAlpha: 1, save() { operations.push('save'); }, restore() { operations.push('restore'); },
        beginPath() {}, rect(x, y, w, h) { operations.push(['rect', x, y, w, h]); },
        clip() { operations.push('clip'); },
        drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) {
            assert.equal(image, atlas, 'Never sample unrelated textures or produce scenery');
            assert.ok(sx >= 0 && sx + sw <= atlas.width);
            assert.ok(sy >= 0 && sy + sh <= atlas.height);
            operations.push(['paint', dx, dy, dw, dh]);
        },
    };
    assert.equal(drawApprovedWetForestBase(ctx, tiles, atlas, 1204, 36, 36), true);
    assert.deepEqual(operations.filter(x => x === 'save' || x === 'restore'), ['save', 'save', 'restore', 'restore']);
    assert.ok(operations.some(x => Array.isArray(x) && x[0] === 'rect' && x[3] === 36));
    assert.ok(operations.filter(x => Array.isArray(x) && x[0] === 'paint').length > 9,
        'Accepted ground transitions must be rendered as well as material samples');
    assert.equal(drawApprovedWetForestBase(ctx, tiles, { width: 0, height: 0 }, 1204, 36, 36), false);
});

test('approved ground preview remains opt-in to the playable C# Arena Lab only', () => {
    const read = filename => readFileSync(
        new URL('../../src/Wyrmforge.Presentation.Web/' + filename, import.meta.url), 'utf8');
    const js = read('wwwroot/js/arena-lab.js');
    const razor = read('Pages/ArenaLab.razor');
    const renderer = read('wwwroot/js/arena-environment.js');
    const territory = read('wwwroot/js/arena-territory-art.js');
    assert.match(js, /approvedGround: false/);
    assert.match(js, /if \(!state\.options\.approvedGround/);
    assert.match(js, /frame\?\.environment\?\.habitat !== 'WetForest'/);
    assert.match(js, /drawArenaEnvironment\(ctx, frame\.environment, ww, wh, state\.clock, groundAtlas\)/);
    assert.match(razor, /ArenaEnvironmentState\.Create\(seed, node, generatorPreview: true\)/);
    assert.match(razor, /@bind="approvedGroundPreview"/);
    assert.match(razor, /"import", "\.\/js\/arena-lab\.js"/);
    assert.match(js, /arena-environment\.js\?v=20261022-approved-ground-preview-1/);
    assert.match(territory, /drawWetForestGround\(ctx, plan, approvedAtlas\)/);
    assert.match(renderer, /approvedAtlas \? 'approvedGroundPreview' : 'canonicalGround'/);
    const hunt = read('wwwroot/js/arena.js');
    assert.match(hunt, /drawArenaEnvironment\(ctx, snapshot\.environment, worldWidth, worldHeight, visualSeconds\)/);
    assert.doesNotMatch(hunt, /approvedGroundPreview/);
});

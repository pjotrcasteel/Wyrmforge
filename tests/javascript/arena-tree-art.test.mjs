import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectTrees, treeLayers, canopyKindForBand, treeSpriteName, useForestKit, TREE_MIN_TRUNK_MICROCELLS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-tree-art.js';
import { TERRAIN_MATERIAL, mergeTerrainFrame, TRUNK_MOUND_MICROCELLS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';

const manifest = JSON.parse(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/forest/forest-kit.json', import.meta.url), 'utf8'));

const frame = () => {
    const columns = 8, rows = 8, surface = new Array(64).fill(0), material = new Array(64).fill(0);
    surface[2 * 8 + 3] = 20; material[2 * 8 + 3] = TERRAIN_MATERIAL.Wood;
    surface[5 * 8 + 6] = 4; material[5 * 8 + 6] = TERRAIN_MATERIAL.Wood; // a trunk worn to a stump
    surface[6 * 8 + 1] = 12; material[6 * 8 + 1] = TERRAIN_MATERIAL.Stone;
    surface[1 * 8 + 1] = 1; material[1 * 8 + 1] = TERRAIN_MATERIAL.Wood; // worn away: nothing left to draw
    return { columns, rows, surface, material };
};

test('a standing tree is a Wood column of at least a metre, a stump is what a worn trunk leaves, rock is neither', () => {
    const trees = collectTrees(frame(), 0);
    assert.equal(trees.length, 2);
    const [standing, stump] = trees;
    assert.deepEqual([standing.standing, standing.x, standing.depth, standing.heightPx], [true, 3.5 * 32, 3 * 32, 80]);
    assert.equal(stump.standing, false);
    assert.match(standing.name, /^tree\.\w+\.live\.\d$/);
    assert.match(stump.name, /^stump\.\w+\.live$/);
    assert.ok(20 >= TREE_MIN_TRUNK_MICROCELLS);
});

test('the art follows the Wyrm Influence band and is cached per frame', () => {
    assert.deepEqual([0, 1, 2, 3].map(canopyKindForBand), ['live', 'dry', 'dead', 'charred']);
    const f = frame();
    assert.equal(collectTrees(f, 0), collectTrees(f, 0), 'cached');
    assert.match(collectTrees(f, 3)[0].name, /\.charred\.0$/);
    assert.match(collectTrees(f, 3)[1].name, /^stump\.\w+\.charred$/);
});

test('a tree keeps its shape while its trunk wears down', () => {
    for (let hash = 1; hash < 4000; hash += 7)
        assert.equal(treeSpriteName('live', hash).split('.')[1], treeSpriteName('live', hash, false).split('.')[1]);
});

test('every sprite name the generator can ask for exists in the generated kit', () => {
    for (let hash = 0; hash < 200000; hash += 37) for (const kind of ['live', 'dry', 'dead', 'charred']) {
        assert.ok(manifest.sprites[treeSpriteName(kind, hash)], treeSpriteName(kind, hash));
        assert.ok(manifest.sprites[treeSpriteName(kind, hash, false)], treeSpriteName(kind, hash, false));
    }
});

test('only trees near the camera become depth layers, and none before the kit has loaded', () => {
    const f = frame();
    useForestKit(null);
    assert.equal(treeLayers(f, 0, { x: 0, y: 0 }, 390, 700).length, 0);
    useForestKit({ sprites: manifest.sprites, image: {} });
    const near = treeLayers(f, 0, { x: 0, y: 0 }, 390, 700);
    assert.equal(near.length, 2);
    assert.equal(near[0].kind, 'tree');
    assert.ok([256, 384].includes(near[0].tree.captureSize));
    assert.equal(treeLayers(f, 0, { x: 5000, y: 5000 }, 390, 700).length, 0);
});

test('the terrain draws a tree as a low mound while the real trunk height stays available', () => {
    const merged = mergeTerrainFrame(null, { revision: 1, columns: 8, rows: 8, surface: frame().surface, material: frame().material, fine: [] });
    assert.equal(merged.surface[2 * 8 + 3], TRUNK_MOUND_MICROCELLS);
    assert.equal(merged.trunks.get(2 * 8 + 3), 20);
    assert.equal(merged.surface[6 * 8 + 1], 12, 'rock keeps its height');
    const trees = collectTrees(merged, 0);
    assert.equal(trees[0].standing, true);
    assert.equal(trees[0].heightPx, 80);
    const worn = mergeTerrainFrame(merged, { revision: 2, columns: 8, rows: 8, surface: Object.assign(frame().surface, { [2 * 8 + 3]: 6 }), material: frame().material,
        fine: [{ index: 2 * 8 + 3, heights: new Array(64).fill(6), topsoil: TERRAIN_MATERIAL.Wood, stoneTop: -32 }] });
    assert.equal(worn.trunks.get(2 * 8 + 3), 6);
    assert.equal(worn.fine.get(2 * 8 + 3).heights[0], TRUNK_MOUND_MICROCELLS);
});

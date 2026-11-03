import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boulderParts, collectBoulders, treeLayers, drawTree, useForestKit } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-tree-art.js';
import { TERRAIN_MATERIAL, mergeTerrainFrame, TRUNK_MOUND_MICROCELLS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-canvas.js';

const manifest = JSON.parse(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/forest/forest-kit.json', import.meta.url), 'utf8'));

const incoming = (heights = {}) => {
    const columns = 8, rows = 8, surface = new Array(64).fill(0), material = new Array(64).fill(0);
    for (const [index, height] of Object.entries(heights)) { surface[index] = height; material[index] = TERRAIN_MATERIAL.Boulder; }
    surface[1 * 8 + 1] = 12; material[1 * 8 + 1] = TERRAIN_MATERIAL.Stone;
    return { revision: 1, columns, rows, surface, material, fine: [] };
};

test('a boulder shrinks through the rock sprites as its column is worn down, and every sprite exists in the kit', () => {
    const names = [24, 18, 10, 6, 3].map(height => boulderParts(0, height, 12345)?.name);
    assert.match(names[0], /^rock\.tall/);
    assert.match(names[1], /^rock\.tall/);
    assert.match(names[2], /^rock\.big/);
    assert.match(names[3], /^rock\.lump/);
    assert.match(names[4], /^rock\.(flat|pebble)/);
    assert.equal(boulderParts(0, 1, 5), null, 'rubble draws nothing: the terrain tile is all that is left');
    assert.ok(boulderParts(0, 24, 5).extra, 'the tallest are two rocks piled');
    for (let hash = 0; hash < 5000; hash += 7) for (const band of [0, 1, 2, 3]) for (const height of [2, 4, 8, 14, 20, 28]) {
        const parts = boulderParts(band, height, hash);
        assert.ok(manifest.sprites[parts.name], parts.name);
        if (parts.extra) assert.ok(manifest.sprites[parts.extra.name], parts.extra.name);
    }
});

test('the terrain keeps a boulder as a low stone mound and hands its real height to the sprite layer', () => {
    const merged = mergeTerrainFrame(null, incoming({ 19: 20, 28: 8 }));
    assert.equal(merged.surface[19], TRUNK_MOUND_MICROCELLS);
    assert.equal(merged.material[19], TERRAIN_MATERIAL.Stone, 'painted as stone');
    assert.equal(merged.surface[1 * 8 + 1], 12, 'cliff rock is untouched');
    assert.deepEqual([...merged.boulders], [[19, 20], [28, 8]]);
    const rocks = collectBoulders(merged, 0);
    assert.equal(rocks.length, 2);
    assert.equal(rocks[0].heightPx, 80);
    const worn = mergeTerrainFrame(merged, { ...incoming({ 19: 6, 28: 8 }), revision: 2 });
    assert.match(collectBoulders(worn, 0)[0].name, /^rock\.lump/);
    assert.equal(collectBoulders(merged, 0), collectBoulders(merged, 0), 'cached');
});

test('boulders become depth layers once the kit is there, and a flipped rock mirrors around its foot', () => {
    const merged = mergeTerrainFrame(null, incoming({ 19: 24, 28: 10 }));
    useForestKit({ sprites: manifest.sprites, image: { tag: 'atlas' } });
    const layers = treeLayers(merged, 0, { x: 0, y: 0 }, 390, 700).filter(layer => layer.tree.key.startsWith?.('r'));
    assert.equal(layers.length, 2);
    assert.ok(layers.every(layer => [160, 256, 384].includes(layer.tree.captureSize)));
    const calls = [];
    const ctx = { drawImage: (...args) => calls.push(['draw', ...args]), save: () => calls.push(['save']), restore: () => calls.push(['restore']),
        translate: (...args) => calls.push(['translate', ...args]), scale: (...args) => calls.push(['scale', ...args]) };
    assert.equal(drawTree(ctx, { name: 'rock.big.0.grey', x: 100, footY: 100, flip: true }), true);
    assert.deepEqual(calls.find(call => call[0] === 'scale'), ['scale', -1, 1]);
    assert.equal(drawTree(ctx, { name: 'rock.nope', x: 0, footY: 0 }), false);
    useForestKit(null);
});

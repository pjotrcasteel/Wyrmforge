import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTileSet, TILE, TILE_VARIANTS, variantFor } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-tiles.js';

const KINDS = ['grassTop', 'dirtTop', 'ashTop', 'stoneTop', 'grassSide', 'dirtSide', 'stoneSide', 'lavaTop', 'lavaSide', 'grassDryTop', 'mudTop', 'rubbleTop', 'woodTop', 'woodSide', 'stoneLipSide'];

test('every band makes every tile kind, 64 x 64, fully opaque, in several variants', () => {
    for (let band = 0; band < 4; band++) {
        const set = generateTileSet(band);
        for (const kind of KINDS) {
            assert.equal(set[kind].length, TILE_VARIANTS, `${band}/${kind}`);
            for (const tile of set[kind]) {
                assert.equal(tile.data.length, TILE * TILE * 4);
                for (let i = 3; i < tile.data.length; i += 4) assert.equal(tile.data[i], 255, `${band}/${kind} has an unpainted pixel`);
            }
        }
    }
});

test('tiles are deterministic, differ between variants and are never a single flat colour', () => {
    const a = generateTileSet(0), b = generateTileSet(0);
    for (const kind of KINDS) {
        assert.deepEqual([...a[kind][0].data], [...b[kind][0].data], kind);
        assert.notDeepEqual([...a[kind][0].data], [...a[kind][1].data], `${kind} variants differ`);
        const colours = new Set();
        for (let i = 0; i < a[kind][0].data.length; i += 4) colours.add(`${a[kind][0].data[i]},${a[kind][0].data[i + 1]},${a[kind][0].data[i + 2]}`);
        assert.ok(colours.size >= 4 && colours.size <= 40, `${kind}: ${colours.size} colours is a hand-pixelled ramp, not flat and not a photo`);
    }
});

test('ground tiles stay dark and gothic: nothing but fire is bright', () => {
    for (let band = 0; band < 4; band++) {
        const set = generateTileSet(band);
        // Lava glows by design and charred wood carries ember cracks: fire is the one bright thing.
        for (const kind of KINDS.filter(name => !name.startsWith('lava') && !(band >= 2 && name.startsWith('wood')))) for (const tile of set[kind]) for (let i = 0; i < tile.data.length; i += 4)
            assert.ok(Math.max(tile.data[i], tile.data[i + 1], tile.data[i + 2]) < 0x9a, `${band}/${kind} pixel too bright`);
    }
});

test('the variant of a column is a stable hash that uses every variant', () => {
    const seen = new Set();
    for (let row = 0; row < 20; row++) for (let column = 0; column < 20; column++) {
        assert.equal(variantFor(column, row), variantFor(column, row));
        seen.add(variantFor(column, row));
    }
    assert.equal(seen.size, TILE_VARIANTS);
});

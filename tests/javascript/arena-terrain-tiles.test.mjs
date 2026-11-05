import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTileSet, TILE, MEGA, TEXTURE, variantFor } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-tiles.js';

const KINDS = ['grassTop', 'dirtTop', 'ashTop', 'stoneTop', 'slabTop', 'pathTop', 'grassSide', 'dirtSide', 'stoneSide', 'stoneGrassSide', 'stoneLipSide', 'lavaTop', 'lavaSide', 'grassDryTop', 'mudTop', 'rubbleTop'];
const TOPS = ['grassTop', 'dirtTop', 'ashTop', 'stoneTop', 'slabTop', 'pathTop', 'grassDryTop', 'mudTop', 'rubbleTop', 'lavaTop'];
const SETS = [0, 1, 2, 3].map(band => generateTileSet(band));

test('every band makes every kind as one opaque, seamless texture four blocks (256 px) across', () => {
    assert.equal(TEXTURE, TILE * MEGA);
    for (const [band, set] of SETS.entries())
        for (const kind of KINDS) {
            assert.equal(set[kind].length, 1, `${band}/${kind}`);
            const tile = set[kind][0];
            assert.equal(tile.width, TEXTURE); assert.equal(tile.height, TEXTURE);
            assert.equal(tile.data.length, TEXTURE * TEXTURE * 4);
            for (let i = 3; i < tile.data.length; i += 4) assert.equal(tile.data[i], 255, `${band}/${kind} has an unpainted pixel`);
        }
});

test('textures are deterministic, differ from each other and are never a single flat colour', () => {
    const again = generateTileSet(0);
    for (const kind of KINDS) {
        assert.deepEqual([...SETS[0][kind][0].data.subarray(0, 4096)], [...again[kind][0].data.subarray(0, 4096)], kind);
        const colours = new Set();
        for (let i = 0; i < SETS[0][kind][0].data.length; i += 4) colours.add(`${SETS[0][kind][0].data[i]},${SETS[0][kind][0].data[i + 1]},${SETS[0][kind][0].data[i + 2]}`);
        assert.ok(colours.size >= 4 && colours.size <= 80, `${kind}: ${colours.size} colours is a hand-pixelled ramp, not flat and not a photo`);
    }
    assert.notDeepEqual([...SETS[0].grassTop[0].data.subarray(0, 4096)], [...SETS[0].dirtTop[0].data.subarray(0, 4096)]);
});

test('ground textures stay dark and gothic: nothing but fire is bright', () => {
    for (const [band, set] of SETS.entries())
        for (const kind of KINDS.filter(name => !name.startsWith('lava')))
            for (let i = 0; i < set[kind][0].data.length; i += 4)
                assert.ok(Math.max(set[kind][0].data[i], set[kind][0].data[i + 1], set[kind][0].data[i + 2]) < 0x9a, `${band}/${kind} pixel too bright`);
});

test('textures wrap without a seam: the join is no rougher than the inside of the texture', () => {
    const luma = (data, x, y) => { const i = (y * TEXTURE + x) * 4; return data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114; };
    for (const kind of TOPS.filter(name => name !== 'lavaTop')) {
        const data = SETS[0][kind][0].data;
        let seam = 0, inside = 0;
        for (let y = 0; y < TEXTURE; y++) {
            seam += Math.abs(luma(data, TEXTURE - 1, y) - luma(data, 0, y));
            inside += Math.abs(luma(data, 100, y) - luma(data, 101, y)) + Math.abs(luma(data, 150, y) - luma(data, 151, y));
        }
        for (let x = 0; x < TEXTURE; x++) seam += Math.abs(luma(data, x, TEXTURE - 1) - luma(data, x, 0));
        assert.ok(seam / (2 * TEXTURE) <= inside / (2 * TEXTURE) * 1.6 + 2, `${kind}: the wrap seam shows`);
    }
});

test('there is no per-block variant: every block samples the same texture at its own position', () => {
    for (let row = 0; row < 6; row++) for (let column = 0; column < 6; column++) assert.equal(variantFor(column, row), 0);
});
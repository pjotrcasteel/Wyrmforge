import test from 'node:test';
import assert from 'node:assert/strict';
import { FACE_PIXELS, TERRAIN_ART_SCALE, ART_PIXELS_PER_METER, UNITS_PER_METER } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-projection.js';
import { TILE, TEXTURE, generateTileSet } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-tiles.js';
import { scale2x, scaleManifest, spriteSource } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/forest-kit.js';
import { prepareHuntGpuScratch } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js';
import { HuntGpuWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

test('terrain art is 64 native pixels per metre: tiles, world grid and art scale agree', () => {
    assert.equal(UNITS_PER_METER, 32, 'C# world units stay 32 per metre');
    assert.equal(TERRAIN_ART_SCALE, 2);
    assert.equal(ART_PIXELS_PER_METER, 64);
    assert.equal(TILE, FACE_PIXELS * TERRAIN_ART_SCALE, 'a tile is one block face at the art scale');
    const tile = generateTileSet(0).stoneTop[0];
    assert.equal(tile.data.length, TEXTURE * TEXTURE * 4);
});

const rgba = values => { const data = new Uint8ClampedArray(values.length * 4); values.forEach((v, i) => { data[i * 4] = v; data[i * 4 + 3] = 255; }); return data; };

test('scale2x doubles the image, keeps flat areas flat and rounds a stair corner without inventing colours', () => {
    const flat = scale2x(rgba([7, 7, 7, 7]), 2, 2);
    assert.equal(flat.length, 4 * 4 * 4);
    for (let i = 0; i < 16; i++) assert.equal(flat[i * 4], 7);
    // A 2 x 2 block of 1 in the corner of a field of 0: the block's outer corner pixel is cut, as a hand-drawn enlargement would.
    const out = scale2x(rgba([0, 0, 0, 0, 1, 1, 0, 1, 1]), 3, 3);
    const at = (x, y) => out[(y * 6 + x) * 4];
    assert.equal(at(2, 2), 0, 'top-left sub-pixel of the corner block takes the field colour');
    assert.equal(at(3, 3), 1);
    assert.equal(at(5, 5), 1);
    assert.deepEqual([...new Set(Array.from({ length: 36 }, (_, i) => out[i * 4]))].sort(), [0, 1]);
    const lone = scale2x(rgba([0, 0, 0, 0, 1, 0, 0, 0, 0]), 3, 3);
    assert.deepEqual([lone[(2 * 6 + 2) * 4], lone[(2 * 6 + 3) * 4], lone[(3 * 6 + 2) * 4], lone[(3 * 6 + 3) * 4]], [1, 1, 1, 1], 'an isolated pixel stays a solid block');
});

test('an enlarged kit keeps sprite sizes in world units and adds the atlas rectangle', () => {
    const sprites = scaleManifest({ a: { x: 10, y: 20, w: 8, h: 12, ax: 4, ay: 11 } }, 2);
    assert.deepEqual(spriteSource(sprites.a), [20, 40, 16, 24]);
    assert.equal(sprites.a.w, 8, 'the sprite still occupies 8 world units');
    assert.deepEqual(spriteSource({ x: 1, y: 2, w: 3, h: 4 }), [1, 2, 3, 4], 'a plain kit reads its own rectangle');
});

test('a scaled scratch layer is allocated at pixel density and drawn in world units', () => {
    const calls = [];
    const ctx = { setTransform: () => calls.push('reset'), clearRect: (...a) => calls.push(['clear', ...a]), save: () => calls.push('save'),
        scale: (...a) => calls.push(['scale', ...a]), translate: (...a) => calls.push(['translate', ...a]), restore() {}, imageSmoothingEnabled: true };
    const canvas = { width: 0, height: 0, getContext: () => ctx };
    prepareHuntGpuScratch(canvas, 160, 100, 200, 2);
    assert.deepEqual([canvas.width, canvas.height], [320, 320]);
    assert.deepEqual(calls.slice(-3), ['save', ['scale', 2, 2], ['translate', -100, -200]], 'world units are scaled to pixels, then the layer origin is applied');
    assert.throws(() => prepareHuntGpuScratch(canvas, 160, 0, 0, 0), RangeError);
});

test('GPU layers reuse a capture only at the same pixel density', () => {
    const layer = { pixels: { width: 320, height: 320 }, revision: 'r' };
    const world = { layers: new Map([['tree', layer]]) };
    const reuse = (scale) => HuntGpuWorld.prototype.canReuseCapture.call(world, 'tree', 'r', 160, 160, scale);
    assert.equal(reuse(2), true);
    assert.equal(reuse(1), false, 'a 1x request must not reuse a 2x texture');
});

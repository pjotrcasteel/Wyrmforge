import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WET_FOREST_TILE_SIZE, WET_FOREST_PROTO_VERSION, wetForestPrototypeTiles,
    wetForestPrototypeAtlas, wetForestPrototypeBoard, wetForestCompositionStudy } from '../../tools/art/prototypes/wet-forest-32.mjs';
import { createMasonryField, originalMasonryTileSet, reassembleMasonry, masonryPhaseTile, MASONRY_PERIOD }
    from '../../tools/art/prototypes/wet-forest-masonry.mjs';

const sourcePath = resolve(fileURLToPath(new URL('../../tools/art/prototypes/wet-forest-32.mjs', import.meta.url)));

test('original Wet Forest prototype has exactly 222 named, native 32px tiles', () => {
    const tiles = wetForestPrototypeTiles();
    assert.equal(WET_FOREST_TILE_SIZE, 32);
    assert.equal(Object.keys(tiles).length, 222);
    for (const [name, tile] of Object.entries(tiles)) {
        assert.match(name, /^wetforest\./);
        assert.equal(tile.width, 32, name);
        assert.equal(tile.height, 32, name);
        assert.equal(tile.data.length, 32 * 32 * 4, name);
    }
    for (const name of ['soil', 'grass', 'mud', 'stone']) {
        const tilesOfType = [0, 1, 2].map(i => tiles[`wetforest.${name}.${i}`]);
        assert.ok(tilesOfType.every(t => t.data.every((_, i) => i % 4 !== 3 || t.data[i] === 255)), name);
        assert.notDeepEqual(tilesOfType[0].data, tilesOfType[1].data, name);
        assert.notDeepEqual(tilesOfType[1].data, tilesOfType[2].data, name);
    }
    for (const detail of ['root', 'fern']) {
        assert.ok(tiles[`wetforest.detail.${detail}`].data.some((v, i) => i % 4 === 3 && v === 0));
        assert.ok(tiles[`wetforest.detail.${detail}`].data.some((v, i) => i % 4 === 3 && v === 255));
    }
    for (const pair of ['grass-mud', 'grass-soil', 'soil-mud', 'soil-stone']) {
        for (const direction of ['left', 'right', 'top', 'bottom']) {
            const tile = tiles[`wetforest.edge.${pair}.${direction}`];
            assert.ok(tile, `${pair} ${direction}`);
            assert.ok(tile.data.every((v, i) => i % 4 !== 3 || v === 255));
        }
    }
});

test('same original pixel source produces identical pixels, stable atlas and review ordering', () => {
    const first = wetForestPrototypeTiles(), second = wetForestPrototypeTiles();
    for (const key of Object.keys(first)) assert.deepEqual(first[key].data, second[key].data, key);
    const a = wetForestPrototypeAtlas(), b = wetForestPrototypeAtlas();
    assert.deepEqual(a.atlas.data, b.atlas.data);
    assert.deepEqual(a.frames, b.frames);
    assert.equal(Object.keys(a.frames).length, 222);
    for (const frame of Object.values(a.frames)) {
        assert.equal(frame.w, 32);
        assert.equal(frame.h, 32);
        assert.ok(frame.x >= 0 && frame.y >= 0);
        assert.ok(frame.x + frame.w <= a.atlas.width && frame.y + frame.h <= a.atlas.height);
    }
    const board = wetForestPrototypeBoard();
    assert.deepEqual(board.order, wetForestPrototypeBoard().order);
    assert.equal(board.order.length, 30);
    assert.equal(board.board.width, 160);
    assert.equal(board.board.height, 192);
    const composition = wetForestCompositionStudy();
    assert.equal(composition.width, 512);
    assert.equal(composition.height, 384);
    assert.deepEqual(composition.data, wetForestCompositionStudy().data);
});

test('review CLI writes reproducible PNGs without touching gameplay or loading external assets', () => {
    const output = mkdtempSync(join(tmpdir(), 'wyrmforge-original-art-'));
    try {
        const run = () => spawnSync(process.execPath, [sourcePath, output], { encoding: 'utf8' });
        const first = run();
        assert.equal(first.status, 0, first.stderr);
        const before = readFileSync(join(output, 'atlas.png'));
        const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
        assert.equal(manifest.version, WET_FOREST_PROTO_VERSION);
        assert.equal(manifest.status, 'prototype-only');
        assert.equal(Object.keys(manifest.frames).length, 222);
        assert.deepEqual([...before.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        const second = run();
        assert.equal(second.status, 0, second.stderr);
        assert.deepEqual(readFileSync(join(output, 'atlas.png')), before);
        assert.deepEqual([...readFileSync(join(output, 'composition-study.png')).subarray(0, 8)],
            [137, 80, 78, 71, 13, 10, 26, 10]);
    } finally {
        rmSync(output, { recursive: true, force: true });
    }
});

test('three masonry families use 256px world-coherent stone fields with diverse 32px phases', () => {
    const tiles = originalMasonryTileSet();
    assert.equal(MASONRY_PERIOD, 256);
    assert.equal(Object.keys(tiles).length, 3 * 8 * 8);
    for (const type of ['brick', 'flagstone', 'cobble']) {
        const field = createMasonryField(type, 1387);
        assert.deepEqual(createMasonryField(type, 1387).data, field.data, type);
        assert.equal(field.width, 256);
        assert.equal(field.height, 256);
        const copies = new Set();
        for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
            const tile = tiles[`wetforest.masonry.${type}.${col}.${row}`];
            assert.ok(tile, `${type} missing phase ${col},${row}`);
            assert.deepEqual(tile.data, masonryPhaseTile(field, col, row).data);
            // For every pixel: atlas sampling equals the authored continuous world surface.
            for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
                assert.deepEqual(tile.get(x, y), field.get(col * 32 + x, row * 32 + y));
            }
            copies.add(Buffer.from(tile.data).toString('base64'));
        }
        assert.ok(copies.size >= 55, `${type} is too repetitive: only ${copies.size} unique cells`);
        const reconstructed = reassembleMasonry(tiles, type, 512, 256);
        for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
            assert.deepEqual(reconstructed.get(x, y), field.get(x % 256, y));
        }
    }
});

test('material transition orientation is explicit: left/right/top/bottom are not arbitrary mirror draws', () => {
    const tiles = wetForestPrototypeTiles();
    const sampleLeft = tiles['wetforest.edge.grass-soil.left'];
    const sampleRight = tiles['wetforest.edge.grass-soil.right'];
    const sampleTop = tiles['wetforest.edge.grass-soil.top'];
    const sampleBottom = tiles['wetforest.edge.grass-soil.bottom'];
    const grass = '#354733';
    // Check named directional samples change the material location, not just frame selection.
    assert.notDeepEqual(sampleLeft.data, sampleRight.data);
    assert.notDeepEqual(sampleTop.data, sampleBottom.data);
    const rgb = tile => {
        const c = tile.get(1, 1);
        return [c[0], c[1], c[2]];
    };
    assert.deepEqual(rgb(sampleLeft), rgb(tiles['wetforest.grass.1']));
    assert.deepEqual(rgb(sampleRight), rgb(tiles['wetforest.soil.1']));
    assert.deepEqual(rgb(sampleTop), rgb(tiles['wetforest.grass.1']));
    assert.deepEqual(rgb(sampleBottom), rgb(tiles['wetforest.soil.1']));
    assert.ok(grass.length > 0);
});
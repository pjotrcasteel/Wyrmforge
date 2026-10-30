import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WET_FOREST_TILE_SIZE, WET_FOREST_PROTO_VERSION, wetForestPrototypeTiles,
    wetForestPrototypeAtlas, wetForestPrototypeBoard } from '../../tools/art/prototypes/wet-forest-32.mjs';

const sourcePath = resolve(fileURLToPath(new URL('../../tools/art/prototypes/wet-forest-32.mjs', import.meta.url)));

test('original Wet Forest prototype has exactly 16 named, native 32px tiles', () => {
    const tiles = wetForestPrototypeTiles();
    assert.equal(WET_FOREST_TILE_SIZE, 32);
    assert.equal(Object.keys(tiles).length, 16);
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
    assert.ok(tiles['wetforest.detail.fern'].data.some((v, i) => i % 4 === 3 && v === 0));
});

test('same original pixel source produces identical pixels, stable atlas and review ordering', () => {
    const first = wetForestPrototypeTiles(), second = wetForestPrototypeTiles();
    for (const key of Object.keys(first)) assert.deepEqual(first[key].data, second[key].data, key);
    const a = wetForestPrototypeAtlas(), b = wetForestPrototypeAtlas();
    assert.deepEqual(a.atlas.data, b.atlas.data);
    assert.deepEqual(a.frames, b.frames);
    assert.equal(Object.keys(a.frames).length, 16);
    for (const frame of Object.values(a.frames)) {
        assert.equal(frame.w, 32);
        assert.equal(frame.h, 32);
        assert.ok(frame.x >= 0 && frame.y >= 0);
        assert.ok(frame.x + frame.w <= a.atlas.width && frame.y + frame.h <= a.atlas.height);
    }
    assert.deepEqual(wetForestPrototypeBoard().order, wetForestPrototypeBoard().order);
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
        assert.equal(Object.keys(manifest.frames).length, 16);
        assert.deepEqual([...before.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        const second = run();
        assert.equal(second.status, 0, second.stderr);
        assert.deepEqual(readFileSync(join(output, 'atlas.png')), before);
    } finally {
        rmSync(output, { recursive: true, force: true });
    }
});

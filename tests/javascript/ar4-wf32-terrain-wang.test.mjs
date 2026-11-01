import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { encodePng } from '../../tools/art/lib/png.mjs';
import { TILE, REVISION, PALETTE, WANG_STENCILS, STRESS_CORNERS,
    wangMask, validateWangEdges, buildAr4BWangAtlas, buildAr4BStressBoard }
    from '../../tools/art/prototypes/ar4-wf32-terrain-wang.mjs';

test('B1 source grammar has 16 complete, 4px-native authored corner stencils', () => {
    assert.equal(TILE, 32);
    assert.equal(WANG_STENCILS.length, 16);
    for (const [bits, rows] of WANG_STENCILS.entries()) {
        assert.equal(rows.length, 8);
        for (const row of rows) assert.match(row, /^[R.]{8}$/);
        assert.equal(wangMask(bits, 0, 0), Boolean(bits & 1));
        assert.equal(wangMask(bits, 31, 0), Boolean(bits & 2));
        assert.equal(wangMask(bits, 31, 31), Boolean(bits & 4));
        assert.equal(wangMask(bits, 0, 31), Boolean(bits & 8));
    }
});

test('all 16x16 east/west and north/south Wang-compatible edges match', () => {
    assert.equal(validateWangEdges(), true);
    for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
        if (Boolean(a & 2) === Boolean(b & 1) && Boolean(a & 4) === Boolean(b & 8))
            for (let y = 0; y < 32; y++) assert.equal(wangMask(a, 31, y), wangMask(b, 0, y));
        if (Boolean(a & 8) === Boolean(b & 1) && Boolean(a & 4) === Boolean(b & 2))
            for (let x = 0; x < 32; x++) assert.equal(wangMask(a, x, 31), wangMask(b, x, 0));
    }
});

test('variant atlas holds 8 authored interiors per surface and 16x8 edge families', () => {
    const { atlas, manifest } = buildAr4BWangAtlas();
    assert.equal(manifest.revision, REVISION);
    assert.equal(manifest.approved, false);
    assert.equal(manifest.tilePixels, 32);
    assert.equal(Object.keys(manifest.frames).length, 16 + 2 + 16 * 8);
    assert.deepEqual(manifest.wangCornerBitOrder, ['NW', 'NE', 'SE', 'SW']);
    assert.deepEqual(manifest.families, ['grass', 'earth', 'mud']);
    const boxes = [];
    for (const [name, frame] of Object.entries(manifest.frames)) {
        assert.equal(frame.w, 32, name);
        assert.equal(frame.h, 32, name);
        assert.ok(frame.x >= 0 && frame.y >= 0, name);
        assert.ok(frame.x + 32 <= atlas.width && frame.y + 32 <= atlas.height, name);
        assert.ok(!boxes.some(b => frame.x < b.x + 32 && frame.x + 32 > b.x &&
            frame.y < b.y + 32 && frame.y + 32 > b.y), name + ' overlaps');
        boxes.push(frame);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++)
            assert.equal(atlas.data[((frame.y+y) * atlas.width + frame.x+x) * 4 + 3], 255, name);
    }
    assert.ok(Object.keys(PALETTE).includes('earth'));
});

test('stress scene deliberately exposes corners, junctions and narrow transitions', () => {
    assert.equal(STRESS_CORNERS.length, 15);
    assert.ok(STRESS_CORNERS.every(row => row.length === 21));
    const board = buildAr4BStressBoard();
    const boardAgain = buildAr4BStressBoard();
    assert.deepEqual([board.width, board.height], [640, 448]);
    assert.equal(createHash('sha256').update(board.data).digest('hex'),
        createHash('sha256').update(boardAgain.data).digest('hex'));
    const enlarged = buildAr4BStressBoard({scale:3});
    assert.deepEqual([enlarged.width, enlarged.height], [1920, 1344]);
    for (const [x, y] of [[0,0], [13,17], [107,203], [639,447]])
        assert.deepEqual(Array.from(enlarged.get(x*3+1, y*3+2)), Array.from(board.get(x, y)));
    assert.throws(() => buildAr4BStressBoard({scale:0}), /scale/);
});

test('encoded review board is a real lossless PNG with no AI/gameplay claim', () => {
    const board = buildAr4BStressBoard();
    const bytes = encodePng(board.width, board.height, board.data);
    assert.equal(Buffer.from(bytes).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(Buffer.from(bytes).readUInt32BE(20), 448);
    assert.throws(() => wangMask(16, 0, 0), RangeError);
});

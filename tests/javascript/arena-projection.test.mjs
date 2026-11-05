import test from 'node:test';
import assert from 'node:assert/strict';
import {
    UNITS_PER_METER, FACE_PIXELS, MICROCELL_UNITS, groundToScreen, screenToGround, depthKey, blockTopRect,
    blockFrontRect, terrainRowDepth, pixelSnap, visibleColumnRange, visibleRowRange, metersToUnits,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-projection.js';

test('one metre is one 32 pixel face and one microcell is exactly four pixels', () => {
    assert.equal(UNITS_PER_METER, 32);
    assert.equal(FACE_PIXELS, 32);
    assert.equal(MICROCELL_UNITS, 4);
    assert.equal(metersToUnits(3), 96);
});

test('one metre of height moves exactly 32 pixels up the screen and round-trips', () => {
    assert.deepEqual(groundToScreen(100, 400, 0), { x: 100, y: 400 });
    assert.deepEqual(groundToScreen(100, 400, 32), { x: 100, y: 368 });
    assert.deepEqual(groundToScreen(100, 400, -32), { x: 100, y: 432 });
    assert.deepEqual(screenToGround(100, 368, 32), { x: 100, y: 400 });
});

test('depth uses the ground feet position, not the raised screen position', () => {
    const onPlateau = { y: 400, radius: 12, z: 96 };
    const onFloor = { y: 405, radius: 12, z: 0 };
    assert.ok(depthKey(onPlateau) < depthKey(onFloor), 'sorting ignores height so a raised actor is not drawn in front by mistake');
});

test('a top face is a 32x32 square lifted by its height in whole four-pixel steps', () => {
    assert.deepEqual(blockTopRect(3, 5, 0), { x: 96, y: 160, width: 32, height: 32 });
    assert.deepEqual(blockTopRect(3, 5, 8), { x: 96, y: 128, width: 32, height: 32 });
    assert.deepEqual(blockTopRect(3, 5, -4), { x: 96, y: 176, width: 32, height: 32 });
});

test('the front face is exposed only where the next row is lower and is 32 pixels per metre tall', () => {
    assert.equal(blockFrontRect(2, 4, 8, 8), null);
    assert.equal(blockFrontRect(2, 4, 8, 12), null);
    assert.deepEqual(blockFrontRect(2, 4, 8, 0), { x: 64, y: 128, width: 32, height: 32 });
    assert.deepEqual(blockFrontRect(2, 4, 24, 0), { x: 64, y: 160 - 96, width: 32, height: 96 });
    assert.equal(blockFrontRect(2, 4, 4, 0).height, 16, 'a half-metre step shows a 16 pixel face');
});

test('a front face meets the top face of the column in front of it without a gap', () => {
    const rise = 16;
    const top = blockTopRect(1, 3, rise);
    const front = blockFrontRect(1, 3, rise, 0);
    assert.equal(front.y, top.y + top.height);
    assert.equal(front.y + front.height, terrainRowDepth(3) , 'the face ends on the ground line of its own row');
});

test('terrain rows draw back to front by their front edge', () => {
    assert.equal(terrainRowDepth(0), 32);
    assert.ok(terrainRowDepth(4) < terrainRowDepth(5));
});

test('pixel snapping honours the device pixel ratio', () => {
    assert.equal(pixelSnap(10.4), 10);
    assert.equal(pixelSnap(10.4, 2), 10.5);
    assert.equal(pixelSnap(10.74, 2), 10.5);
});

test('visible ranges are clamped and raised columns can reach into the view from below', () => {
    assert.deepEqual(visibleColumnRange(0, 390, 32), { first: 0, last: 13 });
    assert.deepEqual(visibleColumnRange(900, 390, 32), { first: 27, last: 31 });
    const flat = visibleRowRange(320, 700, 60);
    const raised = visibleRowRange(320, 700, 60, 24);
    assert.ok(raised.last > flat.last);
    assert.equal(visibleRowRange(1800, 700, 60).last, 59);
});

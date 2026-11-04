import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveArenaCamera, resolveMonasteryArtReviewCamera, exitGuidePosition } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-camera.js';

test('roaming camera follows the hunter without altering canonical world coordinates', () => {
    const world = { width: 1200, height: 2100 };
    assert.deepEqual(resolveArenaCamera(world, { x: 600, y: 1050 }, 390, 844), { x: 405, y: 628, width: 1200, height: 2100 });
    const east = resolveArenaCamera(world, { x: 1100, y: 1050 }, 390, 844);
    assert.equal(east.x, 810);
    assert.equal(east.y, 628);
    assert.equal(1100 - east.x, 290);
    assert.deepEqual(resolveArenaCamera(null, { x: 10, y: 10 }, 390, 844), { x: 0, y: 0, width: 390, height: 844 });
});

test('opt-in monastery review camera frames the real C# building outlines without moving the player', () => {
    const world = { width: 1014, height: 2110 };
    const geography = { landscape: { kind: 'mountain-monastery', obstacles: [
        { kind: 'monastery-hall', outline: [
            { x: .4, y: .2 }, { x: .6, y: .2 }, { x: .6, y: .3 }, { x: .4, y: .3 },
        ] },
        { kind: 'cliff-face', outline: [
            { x: .1, y: .1 }, { x: .2, y: .1 }, { x: .2, y: .2 },
        ] },
    ] } };
    const camera = resolveMonasteryArtReviewCamera(world, geography, 390, 844);
    assert.equal(camera.landmarkCount, 1);
    assert.equal(camera.focusX, 507);
    assert.equal(camera.focusY, 527.5);
    assert.equal(camera.x, 312);
    assert.equal(camera.y, 105.5);
    assert.deepEqual(resolveArenaCamera(world, { x: 507, y: 1500 }, 390, 844),
        { x: 312, y: 1078, width: 1014, height: 2110 },
        'The unchanged gameplay-follow camera is independent from spectator framing.');
    assert.equal(resolveMonasteryArtReviewCamera(world, { landscape: { kind: 'mountain-pass' } }, 390, 844), null);
    assert.equal(resolveMonasteryArtReviewCamera(world, { landscape: { kind: 'mountain-monastery',
        obstacles: [{ kind: 'monastery-hall', outline: [{ x: 1.5, y: .1 }] }] } }, 390, 844), null);
});

test('opened exit is indicated while distant and disappears from compass once in view', () => {
    const world = { width: 1200, height: 2100 };
    const camera = resolveArenaCamera(world, { x: 600, y: 1050 }, 390, 844);
    const exit = { x: 600, y: 210, radius: 37 };
    const guide = exitGuidePosition(exit, camera, 390, 844);
    assert.ok(guide, 'Offscreen exit must always have a guide');
    assert.equal(guide.y, 152);
    assert.equal(guide.x, 195);
    assert.ok(guide.distance > 400);

    const near = resolveArenaCamera(world, { x: 600, y: 320 }, 390, 844);
    assert.equal(exitGuidePosition(exit, near, 390, 844), null, 'Do not cover a visible exit with another marker.');
    assert.equal(exitGuidePosition(null, camera, 390, 844), null);
});

test('arena paints world entities through translated camera but restores HUD transform', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const status = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-performance.js', import.meta.url), 'utf8');
    assert.match(arena, /resolveArenaCamera\(snapshot\.world, snapshot\.player, width, height\)/);
    assert.match(arena, /ctx\.translate\(-camera\.x, -camera\.y\)/);
    assert.match(arena, /ctx\.restore\(\);\s*const battleActive/);
    assert.match(arena, /drawExitGuide\(ctx, snapshot\.exit, camera/);
    assert.match(status, /enemy\.x - camera\.x/);
});

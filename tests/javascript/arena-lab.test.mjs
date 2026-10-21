import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worldClickPoint, arenaLabInput, panArenaLabCamera } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js';

test('Arena Lab translates viewport taps into the authoritative world frame', () => {
    const camera = { x: 280, y: 440, width: 950, height: 1550 };
    assert.deepEqual(worldClickPoint(40, 60, camera), { x: 320, y: 500 });
    assert.deepEqual(worldClickPoint(-400, 3000, camera), { x: 0, y: 1550 });
});

test('Arena Lab pan is bounded by world edges and does not depend on player movement', () => {
    const camera = { x: 300, y: 400, width: 950, height: 1550 };
    assert.deepEqual(panArenaLabCamera(camera, 65, -90, 390, 600),
        { x: 235, y: 490, width: 950, height: 1550 });
    assert.deepEqual(panArenaLabCamera(camera, 10000, -10000, 390, 600),
        { x: 0, y: 950, width: 950, height: 1550 });
    assert.deepEqual(panArenaLabCamera(camera, -10000, 10000, 390, 600),
        { x: 560, y: 0, width: 950, height: 1550 });
});

test('Arena Lab owns iPhone touch drags without scrolling the page or auto-scrolling on canvas focus', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaLab.razor.css', import.meta.url), 'utf8');
    assert.match(js, /bind\(canvas, 'touchstart', blockPageScroll, \{ passive: false \}\)/);
    assert.match(js, /bind\(canvas, 'touchmove', blockPageScroll, \{ passive: false \}\)/);
    assert.match(js, /if \(event\.cancelable\) event\.preventDefault\(\)/);
    assert.match(js, /event\.pointerType !== 'touch'.*focus\(\{ preventScroll: true \}\)/);
    assert.match(css, /\.arena-stage\{touch-action:none\}/);
});

test('Arena Lab diagonal movement never exceeds actual unit speed', () => {
    const diagonal = arenaLabInput(1, 1);
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
    assert.deepEqual(arenaLabInput(0, -0.5), { x: 0, y: -0.5 });
});

test('Arena Lab reuses real game renderer, mage atlas and collision snapshots', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js', import.meta.url), 'utf8');
    const razor = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaLab.razor', import.meta.url), 'utf8');
    assert.match(js, /drawArenaEnvironment\(ctx, frame\.environment/);
    assert.match(js, /getArenaCloisterElevations\(frame\.environment/);
    assert.match(js, /drawMage\(ctx, player/);
    assert.match(js, /drawCollision\(ctx, frame\.environment/);
    assert.match(razor, /ArenaEnvironmentState\.Create\(seed, node, generatorPreview: true\)/);
    assert.match(razor, /environment!?.RestrictMovement\(player, candidate/);
    assert.match(razor, /environment\.DamagePropsInRadius\(point/);
    assert.match(razor, /environment\.TryDamageProp\(point/);
    assert.doesNotMatch(razor, /localStorage|SaveProgress|GrantEssence/);
});

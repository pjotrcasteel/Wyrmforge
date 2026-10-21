import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worldClickPoint, arenaLabInput } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js';

test('Arena Lab translates viewport taps into the authoritative world frame', () => {
    const camera = { x: 280, y: 440, width: 950, height: 1550 };
    assert.deepEqual(worldClickPoint(40, 60, camera), { x: 320, y: 500 });
    assert.deepEqual(worldClickPoint(-400, 3000, camera), { x: 0, y: 1550 });
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

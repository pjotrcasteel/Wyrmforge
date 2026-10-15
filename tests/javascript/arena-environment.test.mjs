import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTerrainPlan, drawArenaEnvironment } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const scene = { seed: 1204, biome: 'Ashen caldera', element: 'fire', stage: 6, landmark: 'The dragon\'s scorched approach',
    supplies: [{ kind: 'health', x: .83, y: .61, open: true }] };

test('terrain drawing plan is seeded, stable and offers different biome identities', () => {
    const first = createTerrainPlan(scene, 390, 700);
    const second = createTerrainPlan(scene, 390, 700);
    const ridge = createTerrainPlan({ ...scene, biome: 'Broken ridge' }, 390, 700);
    assert.deepEqual(first, second);
    assert.equal(first.biome, 'ash');
    assert.equal(first.element, 'fire');
    assert.ok(first.scars.length > 3);
    assert.ok(first.proximity > 0);
    const early = createTerrainPlan({ ...scene, stage: 1 }, 390, 700);
    assert.ok(early.scars.length < first.scars.length);
    assert.equal(early.proximity, 0);
    const frost = createTerrainPlan({ ...scene, element: 'frost' }, 390, 700);
    assert.equal(frost.element, 'frost');
    assert.equal(frost.scars.length, first.scars.length);
    assert.equal(ridge.biome, 'ridge');
    assert.equal(first.rubble.length, Math.min(260, Math.ceil(390 * 700 / 900)));
    assert.equal(first.remains.length, 10);
    assert.ok(first.remains.every(item => item.x >= 9 && item.x <= 381));
});

test('scenery stays deterministic across viewport sizes without altering supplies', () => {
    const small = createTerrainPlan(scene, 320, 568);
    const big = createTerrainPlan(scene, 1280, 720);
    assert.ok(small.trailWidth >= 55);
    assert.ok(big.trailWidth > small.trailWidth);
    assert.ok(big.rubble.length <= 260);
    assert.equal(scene.supplies.length, 1);
    assert.equal(scene.supplies[0].x, .83);
});

test('missing environment has a safe fallback and game renders real arena scenery', () => {
    assert.equal(drawArenaEnvironment({}, null, 390, 700), false);
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(arena, /drawArenaEnvironment\(ctx, snapshot\.environment/);
    assert.match(arena, /drawArenaExit\(ctx, snapshot\.exit/);
    const markup = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor', import.meta.url), 'utf8');
    assert.match(markup, /TRAIL VANQUISHED/);
    assert.match(markup, /Follow the illuminated passage north/);
});
\n
test('opened healing caches use their own stone-and-herb silhouette, not an XP diamond', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(source, /if \(opened && !experience\) \{\s*drawOpenHealingCache\(ctx\)/);
    assert.match(source, /function drawOpenHealingCache\(ctx\)/);
    assert.match(source, /drawSupply\(ctx, supply/);
});

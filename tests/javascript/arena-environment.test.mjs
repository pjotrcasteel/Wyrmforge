import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTerrainPlan, drawArenaEnvironment, habitatTint, createDestructibleLayers } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';
import { createTerritoryStoryPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js';

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

test('opened healing caches use their own stone-and-herb silhouette, not an XP diamond', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(source, /if \(opened && !experience\) \{\s*drawOpenHealingCache\(ctx\)/);
    assert.match(source, /function drawOpenHealingCache\(ctx\)/);
    assert.match(source, /drawSupply\(ctx, supply/);
});


test('performance telemetry remains opt-in and never obscures ordinary combat', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(arena, /new URLSearchParams\(window\.location\.search\)\.get\('perf'\) !== '1'/);
});

test('habitats carry a distinct restrained wash, and the plan keeps the habitat', () => {
    const habitats = ['WetForest', 'OpenField', 'DesertedVillage', 'MonasteryGrounds', 'FloodedCloister', 'ScorchedApproach', 'Lair'];
    const tints = habitats.map(habitatTint);
    assert.equal(new Set(tints).size, habitats.length);
    for (const tint of tints) assert.ok(Number(tint.match(/,([.\d]+)\)$/)[1]) <= .15, 'tints must not hide telegraphs');
    assert.equal(habitatTint('Outskirts'), null);
    assert.equal(habitatTint(undefined), null);
    assert.equal(createTerrainPlan({ ...scene, habitat: 'WetForest' }, 390, 700).habitat, 'WetForest');
});

test('forest recipes preserve wide play space and use C# Wyrm corruption', () => {
    const early = createTerritoryStoryPlan({ ...scene, habitat: 'WetForest', corruption: 0 }, 950, 1550);
    const late = createTerritoryStoryPlan({ ...scene, habitat: 'WetForest', corruption: 1 }, 950, 1550);
    const earlyTerrain = createTerrainPlan({ ...scene, habitat: 'WetForest', corruption: 0 }, 950, 1550);
    const lateTerrain = createTerrainPlan({ ...scene, habitat: 'WetForest', corruption: 1 }, 950, 1550);
    assert.equal(early.habitat, 'WetForest');
    assert.equal(early.corruption, 0);
    assert.ok(late.wounds.length > early.wounds.length);
    assert.ok(lateTerrain.scars.length > earlyTerrain.scars.length);
    assert.ok(earlyTerrain.trailWidth < 950 / 2, 'terrain must not be one narrow closed corridor');
});

test('authoritative props become depth-sorted actors without mutating scenery', () => {
    const props = [{ id: 1, kind: 'barrel', x: .8, y: .42, radius: 13, healthFraction: 1 }];
    const sceneWithProps = { ...scene, props };
    const layers = createDestructibleLayers(sceneWithProps, 950, 1550);
    assert.equal(layers.length, 1);
    assert.equal(layers[0].kind, 'masonry');
    assert.equal(layers[0].style, 'destructible');
    assert.equal(layers[0].depth, .42 * 1550);
    assert.equal(sceneWithProps.props[0].healthFraction, 1);
    assert.deepEqual(createDestructibleLayers({ ...scene, props: [] }, 950, 1550), []);
});

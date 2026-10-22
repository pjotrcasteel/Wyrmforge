import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTerritoryStoryPlan, territoryBiome } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js';
import { createTerrainPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const landscape = { seed: 47861, biome: 'Ashen caldera', element: 'fire', stage: 6, landmark: "The dragon's scorched approach" };
const width = 1100;
const height = 2100;

test('same route and seed produce stable large-scale environmental identity without combat RNG', () => {
    const first = createTerritoryStoryPlan(landscape, width, height);
    const second = createTerritoryStoryPlan(landscape, width, height);
    const other = createTerritoryStoryPlan({ ...landscape, seed: 47862 }, width, height);
    assert.deepEqual(first, second);
    assert.notDeepEqual(first, other);
    assert.equal(first.landmarks.length, 3);
    assert.equal(first.patches.length, 42);
    assert.equal(first.landmarks[1].kind, 'forge');
    assert.ok(first.landmarks[1].title.includes('FORGE'));
    assert.ok(first.patches.every(patch => patch.x > 0 && patch.x < width && patch.y >= 0 && patch.y <= height));
});

test('frost territories read as their own snow biome, never as a Cinder ridge or cloister', () => {
    for (const name of ['Snowbound vale', 'Rimewall heights', 'Glacier basin']) assert.equal(territoryBiome(name), 'snow', name);
    assert.equal(territoryBiome('Broken ridge'), 'ridge');
    assert.equal(territoryBiome('Ashen caldera'), 'ash');
    assert.equal(territoryBiome(undefined), 'valley');
    const scene = createTerritoryStoryPlan({ ...landscape, biome: 'Rimewall heights', element: 'frost', district: 'sanctuary' }, width, height);
    assert.equal(scene.biome, 'snow');
    assert.ok(scene.landmarks.every(site => ['cairnstack', 'icefall', 'sledge'].includes(site.kind)));
    assert.equal(scene.cloister, null, 'no monastery floor under the snow');
    const open = createTerritoryStoryPlan({ ...landscape, biome: 'Snowbound vale', element: 'frost' }, width, height);
    assert.deepEqual(open.landmarks.map(site => site.kind).sort(), ['cairnstack', 'icefall', 'sledge']);
    assert.equal(createTerrainPlan({ ...landscape, biome: 'Glacier basin' }, width, height).biome, 'snow');
});

test('distinct biomes contain distinct recognizable ruined sites and terrain materials', () => {
    const scenes = [
        createTerritoryStoryPlan({ ...landscape, biome: 'Ashen caldera' }, width, height),
        createTerritoryStoryPlan({ ...landscape, biome: 'Broken ridge' }, width, height),
        createTerritoryStoryPlan({ ...landscape, biome: 'River valley' }, width, height),
    ];
    assert.deepEqual(scenes.map(scene => scene.landmarks[1].kind), ['forge', 'ossuary', 'waystation']);
    assert.equal(new Set(scenes.map(scene => scene.landmarks.map(site => site.kind).join('|'))).size, 3);
    assert.equal(new Set(scenes.map(scene => scene.biome)).size, 3);
    for (const scene of scenes) {
        assert.ok(scene.landmarks.every(site => site.x > 0 && site.x < width && site.y > 0 && site.y < height));
        // Every territory has a landmark adjacent to, but outside, the central spawn position.
        const nearSpawn = scene.landmarks[1];
        assert.ok(Math.abs(nearSpawn.x - width / 2) >= width * .10);
        assert.ok(Math.abs(nearSpawn.y - height / 2) < height * .04);
    }
});

test('elemental wounds intensify toward Wyrm without changing place layout', () => {
    const early = createTerritoryStoryPlan({ ...landscape, stage: 1 }, width, height);
    const late = createTerritoryStoryPlan({ ...landscape, stage: 8 }, width, height);
    assert.equal(early.wounds.length, 8);
    assert.equal(late.wounds.length, 36);
    assert.equal(early.corruption, 0);
    assert.equal(late.corruption, 1);
    assert.deepEqual(early.landmarks, late.landmarks, 'Corruption changes visual severity without moving important landmarks.');
    for (const element of ['fire', 'frost', 'storm', 'arcane']) {
        assert.equal(createTerritoryStoryPlan({ ...landscape, element }, width, height).element, element);
    }
});

test('original place language is integrated into existing cached world texture and preserves gates', () => {
    const plan = createTerrainPlan(landscape, width, height);
    assert.ok(plan.story);
    assert.equal(plan.story.width, width);
    assert.equal(plan.story.height, height);
    const script = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(script, /drawTerritoryGround\(ctx, plan\.story, approvedAtlas\)/);
    assert.match(script, /drawTerritoryLandmarks\(ctx, plan\.story\)/);
    assert.match(script, /drawTerritoryMotes\(ctx, environment/);
    assert.match(script, /for \(const barrier of environment\.barriers/);
    assert.match(script, /for \(const supply of environment\.supplies/);
});

test('Wet Forest follows an authoritative location recipe with no cloned old landmarks', () => {
    const wetForest = { site: 'forgotten-graves', siteX: .34, siteY: .45,
        trail: Array.from({length: 9}, (_, i) => ({x:.31 + .04*Math.sin(i), y:i/8, width:.13})),
        ground: [{kind:'puddle',x:.21,y:.28,radiusX:.04,radiusY:.02}] };
    const env = { ...landscape, habitat: 'WetForest', generatorPreview: true, corruption: 0, wetForest };
    const plan = createTerritoryStoryPlan(env, width, height);
    assert.equal(plan.wetForest.site, 'forgotten-graves');
    assert.equal(plan.landmarks.length, 0);
    assert.equal(plan.cloister, null);
    assert.equal(plan.patches.length, 0);
    assert.equal(plan.wounds.length, 0);
    assert.deepEqual(plan, createTerritoryStoryPlan(env, width, height));
    assert.notDeepEqual(plan, createTerritoryStoryPlan({...env,
        wetForest: {...wetForest, site:'abandoned-camp'}}, width, height));
});

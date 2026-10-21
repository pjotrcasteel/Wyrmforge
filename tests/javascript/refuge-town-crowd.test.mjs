import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const scene = 'src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor';
const art = 'src/Wyrmforge.Presentation.Web/wwwroot/art/town';

test('real Refuge scene retains the art and renders depth-sorted, larger ambient townspeople', () => {
    const markup = source(scene);
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(markup, /<div class="refuge-town-crowd" aria-hidden="true">/);
    assert.match(markup, /@foreach \(var person in crowd\.Citizens\)/);
    assert.match(markup, /style="@CitizenStyle\(person, occluded\)"/);
    assert.match(markup, /crowd\.Navigation\.IsBodyOccluded\(person\.Position\)/);
    assert.match(markup, /data-town-citizen-occluded/);
    assert.doesNotMatch(markup, /refuge-town-foreground/, 'Do not paint a polygon over half a citizen');
    assert.match(markup, /art\/town\/night-navigation\.json/);
    assert.match(markup, /visibility:\{\(occluded \? "hidden" : "visible"\)\}/);
    assert.match(css, /\.refuge-town-crowd\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-citizen\s*\{[^}]*pointer-events:none/s);
    assert.doesNotMatch(css, /\.refuge-town-foreground\s*\{/);
    assert.match(css, /width:0\.957%;height:3\.188%/);
    assert.match(css, /\.refuge-town-spot \{z-index:3\}/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(markup, /crowdStop\.Cancel\(\)/);
    assert.ok(markup.includes('art/town/night-active.webp?v=140'), 'Keep approved nighttime artwork unchanged');
});

test('navigation is authored to the actual artwork pixel size with a real well collider and occluder', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    assert.equal(map.width, 1672);
    assert.equal(map.height, 941);
    assert.ok(map.obstacles.find(x => x.id === 'central-well')?.footprint.length >= 8);
    assert.equal(map.occluders.find(x => x.id === 'well-foreground')?.artwork, 'art/town/night-active.webp?v=140');
    assert.ok(map.walkable.length > 0);
    assert.ok(map.destinations.length >= 7);
});

test('painted well, pillars and garden walls have independent collider ids', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const colliders = new Set(map.obstacles.map(prop => prop.id));
    for (const landmark of ['central-well', 'west-gate-banner-base', 'east-gate-banner-base',
        'west-lower-lamp-pillar', 'east-lower-lamp-pillar', 'west-garden-wall', 'east-garden-wall']) {
        assert.ok(colliders.has(landmark), `Scenery is non-traversable: ${landmark}`);
    }
    assert.ok(map.clearance >= 10, 'Footprints need clearance for NPC body width');
    for (const id of ['well-foreground', 'west-gate-banner-foreground', 'east-gate-banner-foreground',
        'west-lower-pillar-foreground', 'east-lower-pillar-foreground']) {
        const foreground = map.occluders.find(part => part.id === id);
        assert.ok(foreground?.clip.length >= 5, `Missing foreground depth coverage: ${id}`);
        assert.equal(foreground.artwork, 'art/town/night-active.webp?v=140');
    }

    assert.ok(map.occluders.find(part => part.id === 'well-foreground').clip.some(point => point.y < 365),
        'The well occluder must cover the roof above the earlier visible floating rectangles');

    const markup = source(scene);
    assert.match(markup, /night-navigation\.json\?v=\{AppBuildInfo\.Version\}/,
        'Updated mobile clients must not use cached stale nav polygons');
});

test('new right-hand planter extends across the screenshot-reported collision edge', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const planter = map.obstacles.find(obstacle => obstacle.id === 'east-lower-planter-inset');
    assert.ok(planter?.footprint.length >= 4);
    assert.ok(planter.footprint.some(point => point.x < 900 && point.y >= 680));
    assert.match(source('src/Wyrmforge.Application/World/TownNavigationMap.cs'),
        /public bool IsBodyOccluded\(/);
});

test('dynamic props invalidate C# routes and navigation prevents shortcutting through solid scenery', () => {
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const nav = source('src/Wyrmforge.Application/World/TownNavigationMap.cs');
    assert.match(nav, /public void SetObstacle\(TownFootprint footprint\)/);
    assert.match(nav, /public bool RemoveObstacle\(string id\)/);
    assert.match(nav, /public bool TryFindPath\(/);
    assert.match(nav, /PriorityQueue<int, float>/);
    assert.match(nav, /IsSegmentWalkable/);
    assert.match(simulation, /citizen\.PathRevision != _navigation\.Revision/);
    assert.match(simulation, /_navigation\.TryFindPath/);
    assert.doesNotMatch(simulation, /Random\.Shared|DateTime|RandomNumberGenerator/);
});

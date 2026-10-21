import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const scene = 'src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor';
const actors = 'src/Wyrmforge.Presentation.Web/Features/Forge/RefugeTownActors.razor';
const art = 'src/Wyrmforge.Presentation.Web/wwwroot/art/town';

test('painted Refuge stays static while only its NPC actor subtree repaints', () => {
    const markup = source(scene);
    const actorMarkup = source(actors);
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(markup, /<RefugeTownActors Crowd="crowd" ShowGeometry="showTownGeometry"/);
    assert.match(actorMarkup, /<div class="refuge-town-crowd" aria-hidden="true">/);
    assert.match(actorMarkup, /@foreach \(var person in Crowd\.Citizens\)/);
    assert.match(actorMarkup, /@if \(person\.IsPresent\)/);
    assert.match(actorMarkup, /style="@CitizenStyle\(person\)"/);
    assert.match(actorMarkup, /new PeriodicTimer\(TimeSpan\.FromMilliseconds\(100\)\)/);
    assert.match(actorMarkup, /crowdStop\.Cancel\(\)/);
    assert.doesNotMatch(markup, /StateHasChanged|PeriodicTimer/,
        'Static town and debug polygons must not be rerendered at every NPC tick');
    assert.doesNotMatch(actorMarkup, /refuge-town-geometry-solid|refuge-town-night-base/,
        'The moving layer must not own static SVG or large paintings');
    assert.match(css, /\.refuge-town-crowd\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-citizen\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-geometry-feet-layer\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /width:0\.957%;height:3\.188%/);
    assert.match(css, /\.refuge-town-spot \{z-index:3\}/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(markup, /loadingStop\.Cancel\(\)/);
    assert.ok(markup.includes('art/town/night-active.webp?v=140'));
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
    assert.equal(map.clearance, 10, 'Collision radius is the NPC feet, not its visible body width');
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
    assert.ok(planter.footprint.every(point => point.x >= 970), 'Do not block the open paving beside the planter');
    assert.match(source('src/Wyrmforge.Application/World/TownNavigationMap.cs'),
        /public bool IsBodyOccluded\(/);
});

test('debug geometry displays actual solid town buildings in red only after URL opt-in', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const markup = source(scene);
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    for (const id of ['arcane-nexus-building', 'blacksmith-building', 'codex-building',
        'hall-of-fame-building', 'world-gate-west-tower', 'world-gate-east-tower']) {
        assert.ok(map.obstacles.find(obstacle => obstacle.id === id)?.footprint.length >= 4,
            `Missing solid building geometry: ${id}`);
    }
    assert.match(markup, /showTownGeometry && crowd is not null/,
        'Normal players should never receive a visible geometry overlay');
    assert.match(markup, /townGeometry=1/,
        'The debug view should be reachable through an explicit URL parameter');
    assert.match(markup, /@foreach \(var obstacle in crowd\.Navigation\.Obstacles\)/,
        'Debug areas must come from the actual NPC collision model');
    assert.match(markup, /class="refuge-town-geometry-solid"/);
    assert.match(markup, /class="refuge-town-geometry-walkable"/);
    assert.ok(map.occluders.find(part => part.id === 'world-gate-arch-roof'),
        'Roof is a visual object, not solid ground');
    assert.ok(!map.obstacles.some(obstacle => obstacle.id === 'world-gate-arch-roof'));
    assert.match(markup, /class="refuge-town-geometry-visual"/);
    assert.match(source(actors), /data-town-feet="@person.Id"/);
    assert.match(source(actors), /r="@Crowd.Navigation.FootRadius"/);

    assert.match(css, /\.refuge-town-geometry-debug\s*\{[^}]*pointer-events:none/s,
        'Debug artwork must not intercept swipes or building taps');
    assert.match(css, /fill:rgba\(235,36,40,\.32\)/, 'Solid shapes must be translucent red');
    assert.match(css, /refuge-town-geometry-walkable/, 'Show paved routing area for comparison');
});

test('debug geometry stays label-free and residents have authored four connected exits', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const markup = source(scene);
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const exits = map.destinations.filter(destination => destination.isExit);
    assert.deepEqual(exits.map(exit => exit.id).sort(), [
        'east-street-exit', 'south-street-exit', 'west-street-exit', 'world-gate-exit'
    ]);
    assert.ok(exits.find(exit => exit.id === 'world-gate-exit').y < 300,
        'Gate exit must be inside the arch, not beside the stairs');
    assert.match(source(actors), /@if \(person\.IsPresent\)/);
    assert.doesNotMatch(markup, /refuge-town-geometry-legend|refuge-town-geometry-label/,
        'No explanatory overlay should block the town scenery');
    assert.match(simulation, /citizen\.AwaySeconds/);
    assert.match(simulation, /citizen\.IsReturning/);
    assert.match(simulation, /citizen\.DepartureCount\+\+/);
    assert.match(simulation, /_navigation\.Destinations\[citizen\.CurrentNode\]\.IsExit/);
    assert.ok(map.walkable.some(surface => surface.id === 'world-gate-stairs'));
    assert.ok(map.walkable.some(surface => surface.id === 'west-market-approach'));
    assert.ok(map.walkable.some(surface => surface.id === 'east-market-approach'));
    assert.ok(map.obstacles.some(obstacle => obstacle.id === 'east-terrace-inner-planter'));
    assert.ok(map.obstacles.some(obstacle => obstacle.id === 'east-foreground-parapet-garden'));
});

test('marked well noticeboard and east stair planting physically block only NPC feet', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    for (const id of ['well-noticeboard-post', 'east-stair-railing-planter']) {
        assert.ok(map.obstacles.find(obstacle => obstacle.id === id)?.footprint.length >= 4,
            `Screenshot-grounded collider missing: ${id}`);
    }
    const front = map.obstacles.find(obstacle => obstacle.id === 'east-foreground-parapet-garden');
    assert.ok(front.footprint.some(point => point.x < 900),
        'The front garden ground footprint must reach its marked west edge.');
});

test('NPC routing avoids expensive polygon resampling on every animation tick', () => {
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const navigation = source('src/Wyrmforge.Application/World/TownNavigationMap.cs');
    assert.doesNotMatch(simulation, /!_navigation\.IsSegmentWalkable\(citizen\.Position/,
        'A path is only invalidated by geometry revision or exhausted waypoints');
    assert.match(navigation, /_cachedGridCells/);
    assert.match(navigation, /_cachedGridEdges/);
    assert.match(navigation, /_cachedRevision != Revision/);
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

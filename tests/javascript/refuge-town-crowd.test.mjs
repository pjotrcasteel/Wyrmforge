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
    assert.match(actorMarkup, /class="refuge-town-crowd"/);
    assert.match(actorMarkup, /@foreach \(var person in Crowd\.Citizens\)/);
    assert.match(actorMarkup, /style="@CitizenStyle\(person\)"/);
    assert.match(actorMarkup, /new PeriodicTimer\(TimeSpan\.FromMilliseconds\(100\)\)/);
    assert.match(actorMarkup, /crowdStop\.CancelAsync\(\)/);
    assert.doesNotMatch(markup, /PeriodicTimer/,
        'The whole painted town must not own an NPC animation timer');
    assert.match(markup, /GeometryChanged="OnGeometryChanged"/);
    assert.match(actorMarkup, /await GeometryChanged\.InvokeAsync\(\)/,
        'Rare obstacle revisions must still update red geometry while NPCs animate');
    assert.doesNotMatch(actorMarkup, /refuge-town-geometry-solid|refuge-town-night-base/,
        'The moving layer must not own static SVG or large paintings');
    assert.match(css, /\.refuge-town-crowd\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-citizen\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-geometry-feet-layer\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /width:0\.957%;height:3\.188%/);
    assert.match(css, /\.refuge-town-spot \{z-index:11002\}/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(markup, /loadingStop\.Cancel\(\)/);
    assert.ok(markup.includes('art/town/night-active.webp?v=140'));
});

test('every painted foreground draws between citizens using actual feet depth', () => {
    const markup = source(scene);
    const actor = source(actors);
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    const map = JSON.parse(source(art + '/night-navigation.json'));
    assert.equal(map.occluders.length, 9);
    assert.equal(map.occluders.find(part => part.id === 'well-foreground').depthY, 572);
    assert.equal(map.occluders.find(part => part.id === 'noticeboard-foreground').depthY, 522);
    assert.equal(map.occluders.find(part => part.id === 'hall-terrace-foliage-foreground').depthY, 830);
    assert.equal(map.occluders.find(part => part.id === 'nexus-low-terrace-railing-foreground').depthY, 458);
    assert.ok(!map.obstacles.some(part => part.id === 'nexus-low-terrace-railing-foreground'));
    assert.ok(map.walkable.some(part => part.id === 'nexus-front-paved-terrace'));
    assert.ok(map.obstacles.some(part => part.id === 'blacksmith-anvil-and-crates-ground'));
    assert.ok(!map.obstacles.some(part => part.id === 'hall-terrace-foliage-foreground'),
        'Painted overhanging trees must never become solid collisions.');
    assert.match(markup, /@foreach \(var foreground in crowd\.Navigation\.Occluders\)/);
    assert.match(markup, /class="refuge-town-scenery-foreground"/);
    assert.match(markup, /data-town-foreground-layer="@foreground\.Id"/);
    assert.match(markup, /clipPath id="@maskId" clipPathUnits="userSpaceOnUse"/);
    assert.match(markup, /foreground\.Id == "well-foreground"/);
    assert.match(markup, /foreground\.Id == "noticeboard-foreground"/);
    assert.match(markup, /foreground\.DepthY \* 10f/);
    assert.match(markup, /preserveAspectRatio="none" href="@foreground\.Artwork"/);
    assert.match(actor, /CitizenStyle\(person\)/);
    assert.match(actor, /citizen\.Position\.Y \* 10f/);
    assert.doesNotMatch(actor, /PlaceholderDepth/,
        'An NPC behind the well must not vanish or jump in front of painted masonry.');
    assert.match(actor, /data-town-feet-y="@person\.Position\.Y"/);
    assert.match(actor, /@if \(person\.IsPresent\)/);
    assert.match(actor, /new PeriodicTimer\(TimeSpan\.FromMilliseconds\(100\)\)/);
    assert.match(css, /\.refuge-town-crowd\s*\{[^}]*z-index:auto/s);
    assert.match(css, /refuge-town-scenery-foreground\s*\{[^}]*pointer-events:none/s);
    assert.doesNotMatch(actor, /IsBehindWell|IsBehindNoticeboard/);
});

test('well rear walkers are rendered and a debug-only footpath scan exposes the real navigation model', () => {
    const actor = source(actors);
    const town = source(scene);
    const model = source('src/Wyrmforge.Application/World/TownNavigationMap.cs');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(actor, /@if \(person\.IsPresent\)/);
    assert.doesNotMatch(actor, /PlaceholderDepth|depth >= 0/);
    assert.match(model, /public string DebugWalkabilityScanPath\(/);
    assert.match(model, /if \(!IsWalkable\(new TownPoint\(x, y\)\)\) continue/);
    assert.match(town, /townWalkScan=1/);
    assert.match(town, /walkScanPath = crowd\.Navigation\.DebugWalkabilityScanPath\(\)/);
    assert.match(town, /data-town-walk-scan="true"/);
    assert.match(css, /\.refuge-town-walk-scan\s*\{[^}]*pointer-events:none/s);
    assert.doesNotMatch(actor, /DebugWalkabilityScanPath/,
        'Computing the static diagnostic scan during NPC motion would destroy iPhone performance.');
});

test('opt-in FPS and AI profiling is separate from geometry and has no normal gameplay overhead', () => {
    const markup = source(scene);
    const actorsMarkup = source(actors);
    const script = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-performance.js');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(markup, /townMetrics=1/);
    assert.match(markup, /@if \(showTownMetrics\)/);
    assert.match(markup, /id="refuge-town-performance"/);
    assert.match(markup, /ShowMetrics="showTownMetrics"/);
    assert.match(actorsMarkup, /if \(!firstRender \|\| !ShowMetrics\) return/);
    assert.match(actorsMarkup, /"import", "\.\/js\/refuge-performance\.js"/);
    assert.match(actorsMarkup, /Stopwatch\.GetElapsedTime\(began\)/);
    assert.match(actorsMarkup, /measuredTicks >= 10/);
    assert.match(script, /requestAnimationFrame\(frame\)/);
    assert.match(script, /Math\.ceil\(frameTimes\.length \* 0\.95\)/);
    assert.match(script, /cancelAnimationFrame\(frameHandle\)/);
    assert.match(css, /refuge-town-performance\s*\{[^}]*pointer-events:none/s);
});

test('two work anchors per unlocked building reuse one 100ms simulation with three roaming residents', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const grouped = Object.groupBy(map.destinations.filter(d => d.buildingId), d => d.buildingId);
    for (const building of ['build', 'forge', 'codex', 'legends']) {
        assert.equal(grouped[building]?.length, 2, `Two workstations expected at ${building}`);
        assert.ok(grouped[building].every(d => typeof d.x === 'number' && !!d.activity));
    }
    assert.match(simulation, /Math\.Max\(citizenCount, workerStops \+ 3\)/);
    assert.match(simulation, /public int AssignedWorkers/);
    assert.match(simulation, /private void EnsureWorkerCoverage/);
    assert.match(source(actors), /new PeriodicTimer\(TimeSpan\.FromMilliseconds\(100\)\)/);
});

test('Refuge session max never decreases in subsequent faster intervals', async () => {
    const script = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-performance.js');
    const { startRefugePerformance } = await import('data:text/javascript;base64,' + Buffer.from(script).toString('base64'));
    const previousDocument = globalThis.document;
    const previousRaf = globalThis.requestAnimationFrame;
    const previousCancel = globalThis.cancelAnimationFrame;
    const output = { textContent: '' };
    let callback;
    let cancelled = false;
    globalThis.document = { querySelector: () => output };
    globalThis.requestAnimationFrame = frame => { callback = frame; return 1; };
    globalThis.cancelAnimationFrame = () => { cancelled = true; };
    try {
        const monitor = startRefugePerformance('#refuge-town-performance');
        monitor.update({ total: 14, present: 14, workers: 8, away: 0, stepMax: 32 });
        for (let ms = 100; ms <= 1100; ms += 100) callback(ms);
        assert.match(output.textContent, /NPC 14\/14/);
        assert.match(output.textContent, /max 100\.0ms/);
        assert.match(output.textContent, /32\.0ms max/);
        for (let ms = 1120; ms <= 2120; ms += 20) callback(ms);
        assert.match(output.textContent, /max 100\.0ms/,
            'Subsequent shorter frame windows must not lower the recorded maximum');
        monitor.dispose();
        assert.equal(output.textContent, '');
        assert.equal(cancelled, true);
    } finally {
        globalThis.document = previousDocument;
        globalThis.requestAnimationFrame = previousRaf;
        globalThis.cancelAnimationFrame = previousCancel;
    }
    const actors = source('src/Wyrmforge.Presentation.Web/Features/Forge/RefugeTownActors.razor');
    assert.match(actors, /measuredMaxMilliseconds = Math\.Max\(measuredMaxMilliseconds, spent\)/);
    assert.doesNotMatch(actors, /measuredMaxMilliseconds = 0;/);
});

test('NPC stress override is bounded at fourteen residents and optional', () => {
    const markup = source(scene);
    assert.match(markup, /townNpcCount=/);
    assert.match(markup, /requestedCount is >= 7 and <= 14/);
    assert.match(markup, /requestedCount : 7/);
    assert.match(markup, /citizenCount: citizenCount/);
});

test('blue marked left stair planter is part of real blocking map', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const left = map.obstacles.find(area => area.id === 'west-stair-railing-planter');
    assert.ok(left?.footprint.length >= 6);
    assert.ok(left.footprint.some(point => point.x >= 700 && point.y >= 730));
    for (const name of ['nexus-forecourt', 'blacksmith-forecourt',
        'blacksmith-terrace-stairs', 'codex-forecourt', 'hall-forecourt']) {
        assert.ok(map.walkable.some(area => area.id === name), `Missing side-route ${name}`);
    }
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

    const canopy = map.occluders.find(part => part.id === 'well-foreground');
    const noticeboard = map.occluders.find(part => part.id === 'noticeboard-foreground');
    assert.ok(canopy.clip.some(point => point.y <= 389 && point.x > 810),
        'The well canopy must be masked at the actual painted roof, not over the paving');
    assert.ok(noticeboard.clip.some(point => point.y <= 414 && point.x < 800),
        'The noticeboard must have a separate compact silhouette');
    assert.ok(noticeboard.clip.every(point => point.x >= 700 && point.x < 815),
        'The noticeboard foreground cannot hide actors on the exposed paved ring');

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
    assert.doesNotMatch(markup, /refuge-town-geometry-legend|refuge-town-geometry-label/,
        'No explanatory overlay should block the town scenery');
    assert.match(simulation, /citizen\.AwaySeconds/);
    assert.match(simulation, /citizen\.IsReturning/);
    assert.match(simulation, /citizen\.DepartureCount\+\+/);
    assert.match(simulation, /if \(reached\.IsExit\)/);
    assert.match(simulation, /citizen\.DepartingSouth = true/);
    assert.match(simulation, /citizen\.IsPresent = false/);
    assert.match(simulation, /reached\.Id == "world-gate-exit"/);
    assert.ok(map.walkable.some(surface => surface.id === 'world-gate-stairs'));
    assert.ok(map.walkable.some(surface => surface.id === 'west-market-approach'));
    assert.ok(map.walkable.some(surface => surface.id === 'east-market-approach'));
    assert.ok(map.obstacles.some(obstacle => obstacle.id === 'east-terrace-inner-planter'));
    assert.ok(map.obstacles.some(obstacle => obstacle.id === 'east-foreground-parapet-garden'));
    assert.ok(map.obstacles.some(obstacle => obstacle.id === 'east-foreground-flowerbed-edge'));
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

test('clear paved segments use geometric boundary visibility before dense 2px sampling', () => {
    const nav = source('src/Wyrmforge.Application/World/TownNavigationMap.cs');
    assert.match(nav, /CanSeeAcrossUnchangedFloor\(a, b\)/);
    assert.match(nav, /if \(CanSeeAcrossUnchangedFloor\(a, b\)\) return true;/);
    assert.match(nav, /CrossesFloorBoundary/);
    assert.match(nav, /DistanceToSegmentSquared/);
    assert.match(nav, /_cachedObstacles\.Any/);
    assert.match(nav, /_geometryRevision == Revision/);
    assert.match(nav, /MathF\.Min\(2f, CellSize \/ 8f\)/,
        'Near an obstacle, keep the original two-pixel collision sampling');
});

test('NPC routing avoids expensive polygon resampling on every animation tick', () => {
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const navigation = source('src/Wyrmforge.Application/World/TownNavigationMap.cs');
    const forwardMovement = simulation.split('private void Move(')[1].split('private bool HasNeighbourAt(')[0];
    assert.doesNotMatch(forwardMovement, /!_navigation\.IsSegmentWalkable\(citizen\.Position/,
        'Normal walking must not resample full segments; short sidesteps are checked separately');
    assert.match(navigation, /_cachedGridCells/);
    assert.match(navigation, /_cachedGridEdges/);
    assert.match(navigation, /if \(_cachedRevision == Revision\) return/);
});

test('crowded pedestrians can sidestep without a new A* route', () => {
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    assert.match(simulation, /TrySidestep\(citizen, dx, dy, distance, step\)/);
    assert.match(simulation, /_navigation\.IsSegmentWalkable\(citizen\.Position, candidate\)/);
    assert.match(simulation, /HasNeighbourAt\(citizen, candidate\)/);
    const passing = simulation.split('private bool TrySidestep(')[1].split('private void ChooseNextStop(')[0];
    assert.doesNotMatch(passing, /TryPath\(|TryFindPath\(/,
        'Steering around a citizen must not trigger A* or invalidate the cached destination');
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

test('Phase 1 geometry inspector switches real town layers without editing geometry or crowd AI', () => {
    const view = source(scene);
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(view, /@if \(showTownGeometry\)\s*\{\s*<div class="refuge-town-geometry-toolbar"/);
    assert.match(view, /data-town-geometry-layer="@geometryLayer"/);
    for (const layer of ['All', 'Walkable', 'Blocked', 'Occlusion']) {
        assert.ok(view.includes('data-town-layer-select="' + layer + '"'), layer + ' switch missing');
        assert.ok(view.includes('ShowLayer(TownGeometryLayer.' + layer + ')'), layer + ' control inactive');
    }
    for (const layer of ['Walkable', 'Blocked', 'Occlusion']) {
        assert.ok(view.includes('geometryLayer is TownGeometryLayer.All or TownGeometryLayer.' + layer),
            layer + ' should render only its selected authored polygons');
    }
    assert.match(css, /refuge-town-geometry-toolbar\s*\{[^}]*position:fixed/s);
    assert.match(css, /refuge-town-geometry-toolbar button\[aria-pressed="true"\]/);
    assert.match(css, /refuge-town-geometry-debug\[data-town-geometry-layer="Walkable"\]/);
});

test('screenshot-reviewed Refuge geometry separates walkable pavement from marked solid scenery', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const contains = (points, p) => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[i], b = points[j];
            if ((a.y > p.y) !== (b.y > p.y) &&
                p.x < ((b.x - a.x) * (p.y - a.y) / (b.y - a.y)) + a.x) inside = !inside;
        }
        return inside;
    };
    const isOpen = p => map.walkable.some(x => contains(x.points, p)) &&
        !map.obstacles.some(x => contains(x.footprint, p));
    for (const p of [
        { x: 66, y: 419 }, { x: 145, y: 424 }, { x: 755, y: 386 },
        { x: 905, y: 384 }, { x: 600, y: 844 },
        { x: 1250, y: 901 }, { x: 1450, y: 909 }
    ]) assert.ok(isOpen(p), `Blue paving at (${p.x},${p.y}) must remain walkable`);
    for (const p of [
        { x: 506, y: 613 }, { x: 523, y: 570 },
        { x: 1250, y: 463 }, { x: 1090, y: 604 },
        { x: 1365, y: 824 }, { x: 1610, y: 846 }
    ]) assert.ok(!isOpen(p), `Red scenery at (${p.x},${p.y}) must block walking`);
    assert.ok(map.walkable.some(x => x.id === 'hall-southern-paved-road'));
    assert.ok(map.obstacles.some(x => x.id === 'forge-hanging-sign-ground'));
    assert.match(source(scene), /id="refuge-town-unblocked-mask"/,
        'Walk layer must not paint cyan over the solid footprints');
});

test('reviewed well and bush footprints are real obstacles in both All and Walk debug views', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const ids = ['west-plaza-bushes-ground', 'well-rear-east-shelter-ground'];
    for (const id of ids) assert.ok(map.obstacles.some(o => o.id === id), id + ' missing');
    const sceneMarkup = source(scene);
    assert.match(sceneMarkup, /geometryLayer is TownGeometryLayer.All or TownGeometryLayer.Walkable/);
    assert.match(sceneMarkup, /<g mask="url\(#refuge-town-unblocked-mask\)">/,
        'All debug mode must not paint turquoise walkable paving through blocked bushes.');
});

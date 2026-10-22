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
    assert.equal(map.occluders.length, 11);
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
    assert.match(markup, /"well-foreground" or "noticeboard-foreground"/);
    assert.match(markup, /data-town-cutout="@cutout.Id"/);
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
    assert.match(view, /@if \(showTownGeometry && !showTownV2\)\s*\{\s*<div class="refuge-town-geometry-toolbar"/);
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

test('west bush polygon sits over actual painted hedge left of the banner, not on the plaza paving', () => {
    const map = JSON.parse(source(`${art}/night-navigation.json`));
    const bush = map.obstacles.find(x => x.id === 'west-plaza-bushes-ground');
    assert.ok(bush);
    assert.ok(Math.min(...bush.footprint.map(p => p.x)) <= 530);
    assert.ok(Math.max(...bush.footprint.map(p => p.x)) >= 590);
    assert.ok(Math.max(...bush.footprint.map(p => p.y)) >= 765);
    assert.ok(map.walkable.some(x => x.id === 'forge-lower-street-paved-link'));
});

test('Phase 2 route inspector displays the real active NPC path only when explicitly selected', () => {
    const sceneMarkup = source(scene);
    const actorMarkup = source(actors);
    const crowd = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(sceneMarkup, /data-town-layer-select="Route"/);
    assert.match(sceneMarkup, /ShowRoutes="@\(showTownGeometry && geometryLayer == TownGeometryLayer.Route\)"/);
    assert.match(actorMarkup, /ShowRoutes && Crowd\.InspectActiveRoute\(RouteCitizenId\)/);
    assert.match(actorMarkup, /data-town-route-citizen="@route.CitizenId"/);
    assert.match(actorMarkup, /class="refuge-town-route-line" points="@RoutePoints\(route\)"/);
    assert.match(crowd, /citizen\.Path\.Skip\(citizen\.PathIndex\)\.ToArray\(\)/);
    assert.match(css, /\.refuge-town-route-debug\s*\{[^}]*pointer-events:none/s);
});

test('route inspector Next control cycles a chosen moving citizen without changing navigation', () => {
    const sceneMarkup = source(scene);
    const actorMarkup = source(actors);
    const crowd = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    assert.match(sceneMarkup, /data-town-route-next="true"/);
    assert.match(sceneMarkup, /@onclick="SelectNextRoute"/);
    assert.match(sceneMarkup, /geometryLayer == TownGeometryLayer.Route\)\s*\{\s*<button[^>]*data-town-route-next/s);
    assert.match(sceneMarkup, /RouteCitizenId="selectedRouteCitizenId"/);
    assert.match(actorMarkup, /Crowd\.InspectActiveRoute\(RouteCitizenId\)/);
    assert.match(crowd, /public int\? InspectNextWalkingCitizenId\(int\? afterCitizenId\)/);
    assert.match(crowd, /return first;/);
});

test('approved town well is cropped to separate transparent PNG layers rather than a giant covering SVG', () => {
    const markup = source(scene);
    const cutouts = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    for (const id of ['noticeboard-panel', 'noticeboard-supports', 'well-roof', 'well-supports', 'well-front-rim', 'nexus-terrace-parapet', 'nexus-terrace-bushes', 'nexus-stairs-shrubs'])
        assert.ok(cutouts.includes('id: "' + id + '"'), id + ' needs its own silhouette');
    assert.match(cutouts, /canvas\.toDataURL\("image\/png"\)/);
    assert.match(cutouts, /context\.globalCompositeOperation = "destination-in"/);
    assert.match(cutouts, /context\.fill\(new Path2D\(cutout\.path\)\)/);
    assert.match(markup, /"nexus-low-terrace-railing-foreground"\) continue;/);
    assert.match(markup, /data-town-cutout="@cutout.Id"/);
    assert.match(css, /refuge-town-png-cutout\s*\{[^}]*visibility:hidden/s);
});

test('Route-mode taps select the nearest currently moving citizen without blocking ordinary town hotspots', () => {
    const markup = source(scene);
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    assert.match(markup, /public Task SelectTownRouteCitizen\(int id\)/);
    assert.match(markup, /\[JSInvokable\]/);
    assert.match(js, /data-town-layer-select\]\[aria-pressed='true'/);
    assert.match(js, /data-town-citizen-state="walking"/);
    assert.match(js, /e\.stopImmediatePropagation\(\)/);
    assert.match(js, /dotnet\.invokeMethodAsync\("SelectTownRouteCitizen", chosen\)/);
    assert.match(js, /scene\.addEventListener\("pointermove", move, \{ passive: true \}\)/);
});

test('All, Walk, Block and Cover are tap-to-inspect, without affecting gameplay clicks', () => {
    const markup = source(scene);
    const cutouts = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(markup, /data-town-geometry-selection="true"/);
    assert.match(cutouts, /const polygonContains = \(polygon, point\) =>/);
    assert.match(cutouts, /mode === "Walkable"/);
    assert.match(cutouts, /mode === "Blocked"/);
    assert.match(cutouts, /mode === "Occlusion"/);
    assert.match(cutouts, /e\.target\.closest\("\.refuge-town-spot"\)/);
    assert.match(cutouts, /selected\.dataset\.townSelected = "true"/);
    assert.match(cutouts, /output\.textContent = type \+ " · " \+ id/);
    assert.match(css, /refuge-town-geometry-selection\s*\{[^}]*pointer-events:none/s);
});

test('Nexus parapet occlusion follows physical stonework, not the paved terrace', () => {
    const nav = JSON.parse(source(`${art}/night-navigation.json`));
    const foreground = nav.occluders.find(x => x.id === 'nexus-low-terrace-railing-foreground');
    assert.ok(foreground);
    assert.ok(Math.min(...foreground.clip.map(p => p.y)) >= 400);
    assert.ok(Math.max(...foreground.clip.map(p => p.y)) <= 470);
    const cutouts = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    assert.match(cutouts, /id: "nexus-terrace-parapet"/);
    assert.match(cutouts, /Only the raised parapet, not the entire walkable Nexus terrace/);
    assert.match(source(scene), /"nexus-low-terrace-railing-foreground"\) continue;/);
});

test('Nexus stair planting is a foot collider while the foreground draws only its leaves', () => {
    const n = JSON.parse(source(`${art}/night-navigation.json`));
    const blockers = ['nexus-terrace-front-bushes-ground', 'nexus-stairs-planter-ground'];
    const covers = ['nexus-terrace-bushes-foreground', 'nexus-stairs-shrubs-foreground'];
    for (const id of blockers) assert.ok(n.obstacles.some(x => x.id === id), id);
    for (const id of covers) assert.ok(n.occluders.some(x => x.id === id), id);
    for (const id of covers) assert.ok(!n.obstacles.some(x => x.id === id), 'Cover cannot be used as foot collision');
    const code = source(scene);
    const cutouts = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    for (const id of ['nexus-terrace-bushes', 'nexus-stairs-shrubs'])
        assert.ok(cutouts.includes('id: "' + id + '"'), id + ' must be an alpha silhouette');
    assert.match(code, /"nexus-terrace-bushes-foreground" or "nexus-stairs-shrubs-foreground"/);
});

test('V2 is isolated behind a URL flag and uses an authored pixel mask without V1 polygons', () => {
    const sceneCode = source(scene);
    const v2 = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const mask = source(art + '/nexus-v2-walk-mask.svg');
    assert.match(sceneCode, /"townV2=1"/);
    assert.match(sceneCode, /<canvas class="refuge-town-v2-canvas"/);
    assert.match(sceneCode, /crowd is not null && !showTownV2/);
    assert.match(v2, /getImageData\(0, 0, WIDTH, HEIGHT\)/);
    assert.match(v2, /FOOT_RADIUS = 8/);
    assert.match(v2, /requestAnimationFrame/);
    const executable = v2.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(executable, /night-navigation\.json|TownCrowd|Occluders/);
    assert.match(mask, /width="1672" height="941"/);
    assert.match(mask, /Nexus/i);
    assert.match(v2, /usingLegacyNavigation: false/);
});

test('Town V2 iPhone staircase correction isolates physical treads from foreground leaves', () => {
    const code = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const sceneCode = source(scene);
    const ground = source(art + '/nexus-v2-walk-mask.svg');
    const foliage = source(art + '/nexus-v2-foliage-mask.svg');
    assert.match(ground, /former broad white band ran onto staircase SIDE/);
    assert.match(ground, /staircase.*treads|stone staircase|stone stair/);
    assert.match(foliage, /no staircase, paving or wall pixels may be replayed/);
    assert.match(code, /STAIR_MASONRY = \{ x: 530, y: 432 \}/);
    assert.match(code, /STAIR_TREAD = \{ x: 500, y: 440 \}/);
    assert.match(code, /PLANT_BASE = \{ x: 445, y: 443 \}/);
    assert.match(code, /FOLIAGE = \{ x: 418, y: 412, width: 42, height: 29, depthY: 438 \}/);
    assert.match(code, /x \+ width > 465 \|\| y \+ height > 445/);
    assert.match(code, /destination-in/);
    assert.match(code, /toDataURL\("image\/png"\)/);
    assert.match(code, /const staircaseAndPlaza = planRoute\(state\.nav, START, PLAZA_END\)/);
    assert.doesNotMatch(code, /BEHIND_SHRUB/);
    assert.match(code, /stairAreaOccluded/);
    assert.match(sceneCode, /data-town-v2-depth-toggle="true"/);
    assert.match(code, /depthToggle\.removeEventListener/);
    const executable = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(executable, /night-navigation\.json|TownCrowd|\.Occluders|CUTOUTS/);
});

test('Town V2 Phase 3 extends the raster route into the open west plaza, not the well', () => {
    const code = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const mask = source(art + '/nexus-v2-walk-mask.svg');
    assert.match(mask, /Phase 3, still one NPC/);
    assert.match(mask, /M 575 492 C 609 510 627 536 645 558/);
    assert.match(code, /STAIR_EXIT = \{ x: 575, y: 492 \}/);
    assert.match(code, /PLAZA_END = \{ x: 681, y: 623 \}/);
    assert.match(code, /PLAZA_STONE = \{ x: 650, y: 565 \}/);
    assert.match(code, /WELL_BASE = \{ x: 735, y: 550 \}/);
    assert.match(code, /WEST_PLANTER = \{ x: 560, y: 612 \}/);
    assert.match(code, /Math\.hypot\(p\.x - PLAZA_END\.x, p\.y - PLAZA_END\.y\) <= 16/);
    assert.match(code, /w\.plazaVisits\+\+/);
    assert.match(code, /plazaVisits: entry\.plazaVisits/);
    assert.match(code, /plaza route cuts across an unwalkable pixel/);
    assert.match(code, /if \(w\.showMask\) \{[\s\S]*w\.route\.forEach/);
    assert.match(code, /ctx\.save\(\);\s*ctx\.translate\(w\.position/);
    assert.doesNotMatch(code, /BEHIND_SHRUB|night-navigation\.json[^\n]*import/);
});

test('Town V2 Phase 4 walks in FRONT of the well with explicit masonry keepouts', () => {
    const code = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const ground = source(art + '/nexus-v2-walk-mask.svg');
    const foliage = source(art + '/nexus-v2-foliage-mask.svg');
    assert.match(ground, /Phase 4 correction: iPhone at x822,y624/);
    assert.match(ground, /M 681 623 C 703 606 717 590 742 585/);
    assert.match(ground, /stroke-width="30"/);
    assert.match(ground, /M 727 511 L 745 497 L 906 497/);
    assert.match(ground, /M 746 462 L 773 462 L 783 492/);
    assert.match(code, /WELL_FRONT_MID = \{ x: 820, y: 582 \}/);
    assert.match(code, /WELL_FRONT_END = \{ x: 974, y: 614 \}/);
    assert.match(code, /NOTICEBOARD_POST = \{ x: 762, y: 495 \}/);
    assert.match(code, /WELL_RIM = \{ x: 920, y: 551 \}/);
    assert.match(code, /const staircaseAndPlaza = planRoute\(state\.nav, START, PLAZA_END\)/);
    assert.match(code, /const approach = planRoute\(state\.nav, PLAZA_END, WELL_FRONT_MID\)/);
    assert.match(code, /const frontage = planRoute\(state\.nav, WELL_FRONT_MID, WELL_FRONT_END\)/);
    assert.match(code, /nearWellFrames: entry\.nearWellFrames/);
    assert.match(code, /nearestWellFootY: entry\.nearestWellFootY/);
    assert.match(code, /Town V2 walker remains too far below the front of the well/);
    assert.match(code, /wellFrontVisits: entry\.wellFrontVisits/);
    assert.match(code, /wellRimExcluded:/);
    assert.match(code, /noticeboardExcluded:/);
    assert.match(code, /wellForegroundRequired: entry\.rearMode/);
    assert.match(code, /Town V2 route bypassed previously approved stairs\/plaza/);
    assert.match(code, /Town V2 plaza route cuts across an unwalkable pixel/);
    assert.match(foliage, /V2 depth ONLY: planted leaf tips/);
    assert.doesNotMatch(code, /night-navigation\.json[^\n]*import|CUTOUTS/);
});

test('V2 well foreground correction must physically approach the stone base, not a distant arc', () => {
    const ground = source(art + '/nexus-v2-walk-mask.svg');
    const code = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    assert.match(ground, /front edge \(y~582\)/i);
    assert.match(ground, /C 776 579 805 581 852 582/);
    assert.doesNotMatch(ground, /C 710 630 741 635 782 632/);
    assert.match(code, /FRONT_VISUAL_CONTACT_MAX_Y = 590/);
    assert.match(code, /w\.position\.x >= 760 && w\.position\.x <= 920/);
    assert.match(code, /w\.nearWellFrames\+\+/);
    assert.match(code, /Math\.min\(w\.nearestWellFootY, w\.position\.y\)/);
    assert.match(code, /closeWellFrontRoute:/);
});

test('Town V2 rear-of-well trial uses independent alpha PNGs and preserves approved front', () => {
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const ground = source(art + '/nexus-v2-walk-mask.svg');
    const well = source(art + '/nexus-v2-well-foreground.svg');
    const sign = source(art + '/nexus-v2-noticeboard-foreground.svg');
    assert.match(ground, /Phase 5 is an opt-in REAR test route/);
    assert.match(ground, /M 575 492 C 610 492 651 486 680 469/);
    assert.match(ground, /M 681 623 C 703 606 717 590 742 585/);
    assert.match(well, /M818 439 L823 426/);
    assert.match(sign, /M731 454 L731 449/);
    assert.match(js, /new URLSearchParams\(window\.location\.search\)\.get\("townRoute"\) === "rear"/);
    assert.match(js, /buildArchitectureCutout/);
    assert.match(js, /destination-in/);
    assert.match(js, /canvas\.toDataURL\("image\/png"\)/);
    assert.match(js, /STAIR_EXIT, REAR_ENTRY/);
    assert.match(js, /REAR_END = \{ x: 852, y: 452 \}/);
    assert.match(js, /state\.route = \[\.\.\.entryRoute, \.\.\.rearRoute\.slice\(1\)\]/);
    assert.match(js, /const staircaseAndPlaza = planRoute\(state\.nav, START, PLAZA_END\)/);
    assert.match(js, /wellOcclusionFrames: entry\.wellOcclusionFrames/);
    assert.match(js, /noticeOcclusionFrames: entry\.noticeOcclusionFrames/);
    assert.match(js, /if \(w\.lastWellOccluded && w\.showDepth\)/);
    assert.match(js, /if \(w\.lastNoticeOccluded && w\.showDepth\)/);
    assert.match(js, /Town V2 plaza route cuts across an unwalkable pixel/);
    const executable = js.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(executable, /night-navigation\.json[^\n]*import|CUTOUTS|TownCrowd/);
});

test('V2 rear alpha extracts the current approved masks with a transparent perimeter', () => {
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const well = source(art + '/nexus-v2-well-foreground.svg');
    const sign = source(art + '/nexus-v2-noticeboard-foreground.svg');
    assert.match(js, /WELL_CUTOUT = \{ x: 810, y: 392, width: 130, height: 160/);
    assert.match(js, /NOTICE_CUTOUT = \{ x: 721, y: 411, width: 93, height: 139/);
    assert.match(js, /for \(let x = 0; x < width; x\+\+\)/);
    assert.match(js, /for \(let y = 0; y < height; y\+\+\)/);
    assert.match(js, /if \(opaquePixels < 120 \|\| clippedEdge\)/);
    assert.match(js, /wellDepthEdgesClear: entry\.wellCutout\?\.edgeTransparent === true/);
    assert.match(js, /noticeDepthEdgesClear: entry\.noticeCutout\?\.edgeTransparent === true/);
});
test('Town V2 well and noticeboard alpha avoid the garden wall and paving', () => {
    const code = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    const well = source(art + '/nexus-v2-well-foreground.svg');
    const sign = source(art + '/nexus-v2-noticeboard-foreground.svg');
    assert.match(code, /wellDepthEdgesClear:/);
    assert.match(code, /noticeDepthEdgesClear:/);
    assert.match(well, /Garden walls, planters, flowers, and all paving stay transparent/);
    assert.match(well, /Actual small well's round masonry ring/);
    assert.match(sign, /timber noticeboard alone/);
    assert.doesNotMatch(well, /M 769 528 Q 808 523/);
    assert.match(well, /M818 439 L823 426/);
    assert.match(sign, /M731 454 L731 449/);
});

test('V2 noticeboard PNG alpha traces only wood: no upper cobbles or lower flowerbeds', () => {
    const svg = source(art + '/nexus-v2-noticeboard-foreground.svg');
    const paths = [...svg.matchAll(/<path fill="#fff" d="([^"]+)"\s*\/>/g)].map(match => {
        const values = [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(value => Number(value[0]));
        assert.equal(values.length % 2, 0);
        return Array.from({ length: values.length / 2 }, (_, i) => ({ x: values[i * 2], y: values[i * 2 + 1] }));
    });
    assert.equal(paths.length, 3, 'Board + precisely two timber supports; never a pasted rectangular floor');
    const contains = (polygon, point) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i], b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y) &&
                point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x)
                inside = !inside;
        }
        return inside;
    };
    const rightPost = paths[2];
    // Screenshot at world feet (800,444): the actor's upper body overlaps
    // this narrow vertical timber. The post must cover that overlap, not
    // adjacent paving; unlike the old lower-leg-only alpha, it starts at the cap.
    for (const [x, y] of [[803, 441], [803, 460], [803, 487], [803, 512]]) {
        assert.equal(contains(rightPost, { x, y }), true,
            `Right timber missing at ${x},${y}; rear NPC would paint over the post`);
    }
    for (const [x, y] of [[792, 441], [811, 441], [790, 475], [812, 514], [803, 428]]) {
        assert.equal(contains(rightPost, { x, y }), false,
            `Right post includes non-wood foreground at ${x},${y}`);
    }
    const walkerOverlapsRightPost = Array.from({ length: 31 }, (_, y) => y + 414)
        .some(y => Array.from({ length: 13 }, (_, x) => x + 794)
            .some(x => contains(rightPost, { x, y })));
    assert.equal(walkerOverlapsRightPost, true,
        'The rear walker at (800,444) must overlap real foreground timber');
    const covered = (x, y) => paths.some(path => contains(path, { x, y }));
    for (const [x, y] of [[740, 430], [760, 428], [795, 423], [755, 512], [780, 506]])
        assert.equal(covered(x, y), false, `Cobble or flowerbed pixel ${x},${y} cannot cover the NPC`);
    for (const [x, y] of [[760, 470], [795, 470], [736, 518], [800, 510]])
        assert.equal(covered(x, y), true, `Board or timber support pixel ${x},${y} must hide the rear NPC`);
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-v2-nexus.js');
    assert.match(js, /w.lastNoticeOccluded = w.rearMode && overlapsFoliage\(w.position, w.noticeCutout\)/);
    assert.match(js, /ctx.drawImage\(w.noticeCutout.image, w.noticeCutout.x, w.noticeCutout.y\)/);
    assert.doesNotMatch(js, /buildDebugOverlay/);
});

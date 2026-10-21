import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWetForestTilePlan, createWetForestMaterialEdges, createWetForestSurfaceDetails,
    createWetForestTrailImprints, createWetForestGladeMargins,
    createWetForestScorchPlan, createWetForestOldPaving, drawWetForestGround, wetForestTrailAt } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-art.js';
import { wetForestTreeFireState } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-vegetation.js';

const recipe = {
    site: 'forgotten-graves', siteX: .68, siteY: .47,
    trail: Array.from({ length: 9 }, (_, i) => ({
        x: .29 + Math.sin(i * .7) * .14, y: i / 8, width: .10 + .025 * (i % 3),
    })),
    ground: [
        { kind: 'clearing', x: .68, y: .47, radiusX: .08, radiusY: .05 },
        { kind: 'puddle', x: .22, y: .21, radiusX: .046, radiusY: .024 },
        { kind: 'moss', x: .81, y: .76, radiusX: .06, radiusY: .05 },
        { kind: 'leafbed', x: .61, y: .66, radiusX: .04, radiusY: .03 },
    ],
};

const size = { width: 950, height: 1550 };
const make = (seed, change = recipe) => createWetForestTilePlan(change, seed, size.width, size.height);

test('Wet Forest material tiles are stable by seed, but different seeds vary the woodland', () => {
    const a = make(1204);
    const b = make(1204);
    const c = make(1205);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok(a.length > 9500 && a.length < 11500);
    const materials = new Set(a.map(t => t.material));
    for (const material of ['loam', 'moss', 'mud', 'leafbed', 'puddle', 'road', 'clearing'])
        assert.ok(materials.has(material), material);
    assert.ok(a.every(t => t.x % 12 === 0 && t.y % 12 === 0 && t.variation >= 0 && t.variation <= 3));
});

test('the organic C# trail remains visibly connected throughout the entire tile scene', () => {
    const tiles = make(3312);
    const rows = new Map();
    for (const tile of tiles) {
        if (!rows.has(tile.y)) rows.set(tile.y, []);
        if (tile.material === 'road') rows.get(tile.y).push(tile.x);
    }
    for (const [y, roads] of rows) {
        const center = wetForestTrailAt(recipe.trail, (y + 6) / size.height).x * size.width;
        assert.ok(roads.some(x => Math.abs(x + 6 - center) < 20), 'Missing route at y=' + y);
    }
    assert.ok(rows.size >= 129);
});

test('all four site identities use the same material floor without inventing solid scenery', () => {
    for (const site of ['forgotten-graves', 'abandoned-camp', 'ruined-waystone', 'broken-wagon']) {
        const tiles = make(3312, { ...recipe, site });
        assert.ok(tiles.some(t => t.material === 'clearing' && Math.abs(t.x - size.width * recipe.siteX) < 38 &&
            Math.abs(t.y - size.height * recipe.siteY) < 24), site);
        assert.ok(tiles.some(t => t.material === 'road' && Math.abs(t.x - size.width * .45) < 24 &&
            Math.abs(t.y - size.height * recipe.siteY) < 36), 'Site branch missing in ' + site);
    }
});

test('the painter is restricted to the Wet Forest Lab and never writes gameplay state', () => {
    const ground = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-art.js', import.meta.url), 'utf8');
    const territory = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js', import.meta.url), 'utf8');
    const environment = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(territory, /if \(plan\.wetForest\) return drawWetForestGround\(ctx, plan\)/);
    assert.match(environment, /if \(plan\.story\.wetForest\) drawWetForestDressing/);
    assert.match(ground, /const CELL = 12/);
    assert.doesNotMatch(ground, /DamagePropsInRadius|RestrictMovement|Math\.random|setInterval|new Image\(/);
    assert.equal(wetForestTrailAt([{ x: .4, y: 0, width: .1 }], .5).x, .4);
    assert.deepEqual(createWetForestTilePlan(null, 1, 950, 1550), []);
});

test('Gothic Wet Forest floor paints sparse dark material detail without a full-screen darkness layer', () => {
    const calls = [];
    let color = '';
    const ctx = {
        save() {}, restore() {},
        set fillStyle(value) { color = value; },
        set globalAlpha(_value) {},
        fillRect(x, y, width, height) { calls.push({ x, y, width, height, color }); },
    };
    drawWetForestGround(ctx, { wetForest: recipe, seed: 1204, width: 120, height: 180, corruption: 0 });
    assert.ok(calls.length > 150, 'Render both ground cells and sparse soil detail');
    assert.ok(calls.every(c => c.width > 0 && c.height > 0 && c.width <= 25 && c.height <= 13),
        'No painter-owned all-scene dark overlay, only local pixel materials and site traces');
    const colors = new Set(calls.map(c => c.color));
    assert.ok(colors.has('#252c25'), 'Subdued wet loam should be present');
    assert.ok(!colors.has('#546a51'), 'Old bright foliage palette must not leak into floor');
});

test('Wet Forest material boundaries are seeded, sparse and painted inside the physical floor only', () => {
    const tiles = make(1204);
    const edges = createWetForestMaterialEdges(tiles, 1204, size.width, size.height);
    assert.deepEqual(edges, createWetForestMaterialEdges(tiles, 1204, size.width, size.height));
    assert.notDeepEqual(edges, createWetForestMaterialEdges(make(1205), 1205, size.width, size.height));
    assert.ok(edges.length > 50 && edges.length < tiles.length * 8);
    assert.ok(edges.every(mark => mark.x >= 0 && mark.y >= 0 &&
        mark.x + mark.width <= size.width && mark.y + mark.height <= size.height));
    assert.ok(edges.every(mark => mark.width <= 4 && mark.height <= 4),
        'Each stitched edge must remain small sediment pixels, never a wall or full tile');
    const road = tiles.filter(tile => tile.material === 'road').map(tile => [tile.x, tile.y]);
    assert.ok(road.length > 200, 'Road must survive unchanged');
});

test('semantic terrain has bounded 2px mud striation and wet reflections without extra collision', () => {
    const tiles = make(1204);
    const details = createWetForestSurfaceDetails(tiles, 1204, size.width, size.height);
    assert.deepEqual(details, createWetForestSurfaceDetails(tiles, 1204, size.width, size.height));
    assert.notDeepEqual(details, createWetForestSurfaceDetails(tiles, 3312, size.width, size.height));
    assert.ok(details.length > 1000 && details.length < tiles.length,
        'A few detail strokes per patch, not millions of per-frame pixel operations');
    assert.ok(details.every(m => m.width >= 2 && m.width <= 6 && m.height >= 2 &&
        m.height <= 4 && m.x >= 0 && m.y >= 0 &&
        m.x + m.width <= size.width && m.y + m.height <= size.height &&
        m.alpha > 0 && m.alpha <= 1));
    for (const material of ['puddle', 'road', 'clearing', 'moss', 'leafbed'])
        assert.ok(details.some(m => m.material === material), 'Missing own terrain vocabulary: ' + material);
});

test('fire ground traces grow only at real C# tree feet and match their seeded char state', () => {
    const props = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1, kind: i % 2 ? 'pine' : 'dead-tree',
        x: .15 + i % 10 * .07, y: .12 + Math.floor(i / 10) * .14, radius: 12,
    }));
    const none = createWetForestScorchPlan(props, 1204, 950, 1550, 0, 'fire');
    const frost = createWetForestScorchPlan(props, 1204, 950, 1550, 1, 'frost');
    const late = createWetForestScorchPlan(props, 1204, 950, 1550, 1, 'fire');
    assert.deepEqual(none, []);
    assert.deepEqual(frost, []);
    assert.ok(late.length > 150 && late.length < 1400);
    assert.deepEqual(late, createWetForestScorchPlan(props, 1204, 950, 1550, 1, 'fire'));
    assert.ok(late.some(m => m.color === '#bb7131'), 'Late fire influence should split a few real tree roots, not flood the map');
    assert.ok(late.every(m => m.width <= 8 && m.height <= 4 && m.alpha <= .78 &&
        m.x >= 0 && m.y >= 0 && m.x + m.width <= 950 && m.y + m.height <= 1550));
    const ids = new Set(props.map(prop => prop.id));
    assert.ok(late.every(m => ids.has(m.treeId)));
    assert.ok(late.every(m => {
        const tree = props.find(prop => prop.id === m.treeId);
        return wetForestTreeFireState(tree.kind, tree.id, 1204, 1, 'fire') !== 'healthy' &&
            Math.abs(m.x - tree.x * 950) <= 40 && Math.abs(m.y - tree.y * 1550) <= 25;
    }), 'Do not spread random orange blobs or invented hazards through the combat glades');
    assert.deepEqual(createWetForestScorchPlan([], 1204, 950, 1550, 1, 'fire'), []);
});

test('the new floor uses real physical props from the Lab snapshot, never independent obstacles', () => {
    const territory = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js', import.meta.url), 'utf8');
    const floor = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-art.js', import.meta.url), 'utf8');
    assert.match(territory, /forestProps: environment\.props \?\? \[\]/);
    assert.match(floor, /plan\.forestProps, seed, width, height/);
    assert.doesNotMatch(floor, /IsBlocked|TryProjectileCollision|DamagePropsInRadius|Math\.random|requestAnimationFrame/);
});

test('wide, open glades have seeded organic soil margins, not invisible round walls', () => {
    const scene = { ...recipe, ground: [
        ...recipe.ground,
        { kind: 'clearing', x: .52, y: .5, radiusX: .17, radiusY: .105 },
    ] };
    const marks = createWetForestGladeMargins(scene, 1204, size.width, size.height);
    const same = createWetForestGladeMargins(scene, 1204, size.width, size.height);
    assert.deepEqual(marks, same);
    assert.notDeepEqual(marks, createWetForestGladeMargins(scene, 1205, size.width, size.height));
    assert.ok(marks.length > 40 && marks.length < 100);
    assert.ok(marks.every(m => m.width <= 8 && m.height === 2 && m.x >= 0 &&
        m.y >= 0 && m.x + m.width <= size.width && m.y + m.height <= size.height));
    assert.deepEqual(scene.ground, [
        ...recipe.ground,
        { kind: 'clearing', x: .52, y: .5, radiusX: .17, radiusY: .105 },
    ], 'No new combat geometry, hidden walls or smaller fighting spaces');
});

test('winding physical C# trail keeps intermittent seeded hoof and wagon traces', () => {
    const marks = createWetForestTrailImprints(recipe, 1204, size.width, size.height);
    assert.ok(marks.length > 80 && marks.length < 340);
    assert.deepEqual(marks, createWetForestTrailImprints(recipe, 1204, size.width, size.height));
    assert.notDeepEqual(marks, createWetForestTrailImprints(recipe, 1205, size.width, size.height));
    assert.ok(marks.every(m => {
        const centre = wetForestTrailAt(recipe.trail, m.y / size.height).x * size.width;
        return Math.abs(m.x - centre) < 50 && m.width <= 8 && m.height === 2 &&
            m.x >= 0 && m.y >= 0 && m.x + m.width <= size.width;
    }));
    assert.deepEqual(createWetForestTrailImprints(null, 1204, size.width, size.height), []);
});

test('worn flagstone paving winds the full Wet Forest world without creating walls', () => {
    const old = { ...recipe, site: 'abandoned-camp', siteX: .68, siteY: .47 };
    const marks = createWetForestOldPaving(old, 1441, size.width, size.height);
    assert.ok(marks.length > 500 && marks.length < 3000, 'Full route should have irregular stone patches');
    assert.deepEqual(marks, createWetForestOldPaving(old, 1441, size.width, size.height));
    assert.notDeepEqual(marks, createWetForestOldPaving(old, 1442, size.width, size.height));
    const quarters = new Set(marks.map(m => Math.min(3, Math.floor(m.y / (size.height / 4)))));
    assert.deepEqual([...quarters].sort(), [0, 1, 2, 3], 'Old paving must extend through all four quarters');
    assert.ok(marks.every(m => {
        const trail = wetForestTrailAt(old.trail, m.y / size.height);
        const halfWidth = Math.min(70, Math.max(44, trail.width * size.width * .53));
        return Math.abs(m.x - trail.x * size.width) <= halfWidth + 44 &&
            m.x >= 0 && m.y >= 0 && m.x + m.width <= size.width &&
            m.y + m.height <= size.height && m.width <= 20 && m.height <= 8 &&
            m.alpha <= .78 && m.alpha > 0;
    }), 'Flat stones are bounded and follow the real C# winding road, not a fake transverse barrier');
    assert.ok(marks.some(m => m.color === '#626458' || m.color === '#53574c'));
    // The original world, collision, loot and route recipe do not change with visual paving.
    assert.deepEqual(old, { ...recipe, site: 'abandoned-camp', siteX: .68, siteY: .47 });
    assert.deepEqual(createWetForestOldPaving(null, 1441, size.width, size.height), []);
    assert.deepEqual(createWetForestOldPaving(old, 1441, 0, size.height), []);
});

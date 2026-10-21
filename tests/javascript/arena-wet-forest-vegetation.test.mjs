import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    wetForestTreeFrame, createWetForestRootVeins, createWetForestUnderstory,
    drawWetForestRootVeins, drawWetForestTreeAccents,
    createWetForestTreeArtPlan, drawWetForestTreeArt, wetForestTreeFireState,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-vegetation.js';
import { createDestructibleLayers } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const props = [
    { id: 1, kind: 'pine', x: .23, y: .42, radius: 12 },
    { id: 2, kind: 'dead-tree', x: .65, y: .72, radius: 12 },
    { id: 3, kind: 'fallen-log', x: .31, y: .66, radius: 39 },
    { id: 4, kind: 'moss-rock', x: .74, y: .34, radius: 17 },
];
const roots = props.map(prop => ({ ...prop, x: Math.round(prop.x * 950 / 2) * 2, y: Math.round(prop.y * 1550 / 2) * 2 }));

test('only author-approved existing frames are selected for real forest trees', () => {
    const frames = new Set();
    for (let id = 1; id <= 36; id++) {
        const pine = wetForestTreeFrame('pine', id, 1204);
        const dead = wetForestTreeFrame('dead-tree', id, 1204);
        assert.match(pine, /^prop\.pine\.[abc]$/);
        assert.match(dead, /^prop\.deadtree\.[ab]$/);
        assert.equal(pine, wetForestTreeFrame('pine', id, 1204));
        frames.add(pine);
        frames.add(dead);
    }
    assert.ok(frames.size >= 4, 'Use multiple genuinely different existing tree silhouettes');
    assert.equal(wetForestTreeFrame('fallen-log', 3, 1204), null);
    assert.equal(wetForestTreeFrame('pine-snow', 3, 1204), null);
});

test('baked veins and groundcover are bounded, deterministic, and linked to physical prop IDs', () => {
    const a = createWetForestRootVeins(1204, roots);
    const b = createWetForestRootVeins(1204, roots);
    const c = createWetForestRootVeins(1205, roots);
    const growth = createWetForestUnderstory(1204, roots);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok(a.length > 15 && a.length < 70);
    assert.ok(growth.length > 10 && growth.length < 45);
    assert.ok(a.every(mark => [1, 2, 3].includes(mark.id)));
    assert.ok(growth.every(mark => props.some(prop => prop.id === mark.id)));
    assert.ok(a.every(mark => mark.x % 2 === 0 && mark.y % 2 === 0 && mark.width <= 6));
    assert.ok(growth.every(mark => mark.x % 2 === 0 && mark.y % 2 === 0));
});

test('moving one C# tree moves only that tree ground detailing, never creates another prop', () => {
    const moved = roots.map(root => root.id === 1 ? { ...root, x: root.x + 80 } : root);
    for (const painter of [createWetForestRootVeins, createWetForestUnderstory]) {
        const first = painter(55, roots);
        const changed = painter(55, moved);
        assert.notDeepEqual(first.filter(x => x.id === 1), changed.filter(x => x.id === 1));
        assert.deepEqual(first.filter(x => x.id !== 1), changed.filter(x => x.id !== 1));
    }
    assert.deepEqual(roots.map(root => root.id), props.map(prop => prop.id));
});

test('both real sprite and physical collider preserve depth, with detail limited to generator-preview Wet Forest', () => {
    const forest = { seed: 1204, generatorPreview: true, habitat: 'WetForest', props };
    const layers = createDestructibleLayers(forest, 950, 1550);
    assert.deepEqual(layers.map(layer => layer.prop.id), [1, 2, 3, 4]);
    assert.ok(layers.every(layer => layer.wetForest && layer.forestSeed === 1204));
    assert.ok(layers.every(layer => layer.depth === layer.prop.y * 1550));
    const regular = createDestructibleLayers({ ...forest, generatorPreview: false }, 950, 1550);
    assert.ok(regular.every(layer => !layer.wetForest));
    const frost = createDestructibleLayers({ ...forest, habitat: 'FrozenRoad' }, 950, 1550);
    assert.ok(frost.every(layer => !layer.wetForest));
});

test('accents draw only pixel-scaled rectangles and never generate geometry or alter authoritative props', () => {
    const calls = [];
    const ctx = {
        save() {}, restore() {},
        fillRect(...args) { calls.push(args); },
        set fillStyle(_value) {}, set globalAlpha(_value) {},
    };
    const before = structuredClone(props);
    drawWetForestTreeAccents(ctx, 'pine', 1, 1204, 400, 580);
    drawWetForestTreeAccents(ctx, 'dead-tree', 2, 1204, 400, 580);
    drawWetForestRootVeins(ctx, createWetForestRootVeins(1204, roots), createWetForestUnderstory(1204, roots));
    assert.ok(calls.length > 40);
    assert.ok(calls.every(([x, y, w, h]) => Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0));
    assert.deepEqual(props, before);
    const count = calls.length;
    drawWetForestTreeAccents(ctx, 'moss-rock', 4, 1204, 400, 580);
    assert.equal(calls.length, count);
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-vegetation.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Math\.random|TryDamageProp|RestrictMovement|DamagePropsInRadius|SetPhase/);
});

test('new Lab-only tree silhouettes are crisp, asymmetric, seeded, and safely inside cached blit bounds', () => {
    const pine = createWetForestTreeArtPlan('pine', 1, 1441);
    const dead = createWetForestTreeArtPlan('dead-tree', 2, 1441);
    assert.ok(pine.shapes.length > 45);
    assert.ok(dead.shapes.length > 35);
    for (const plan of [pine, dead]) {
        assert.ok(plan.shapes.every(item => item.x % 2 === 0 && item.y % 2 === 0));
        assert.ok(plan.shapes.every(item => item.x >= -56 && item.x + item.w <= 56 &&
            item.y >= -118 && item.y + item.h <= 10), 'All art fits one 112x128 transparent image.');
    }
    assert.deepEqual(pine, createWetForestTreeArtPlan('pine', 1, 1441));
    assert.notDeepEqual(pine, createWetForestTreeArtPlan('pine', 5, 1441));
    assert.notDeepEqual(dead, createWetForestTreeArtPlan('dead-tree', 2, 1442));
    assert.equal(createWetForestTreeArtPlan('moss-rock', 4, 1441), null);
});

test('tree art fallback draws C#-anchored opaque pixel rectangles, without any atlas mutation', () => {
    const rects = [];
    const ctx = { save() {}, restore() {}, set fillStyle(_) {},
        fillRect(...args) { rects.push(args); }, imageSmoothingEnabled: true };
    assert.equal(drawWetForestTreeArt(ctx, 'pine', 1, 1441, 412, 556), true);
    assert.ok(rects.length > 45);
    assert.ok(rects.every(([x, y, w, h]) => Number.isFinite(x) && Number.isFinite(y) &&
        w >= 2 && h >= 2 && x > 350 && x < 470 && y > 430 && y < 565));
    assert.equal(drawWetForestTreeArt(ctx, 'barrel', 20, 1441, 412, 556), false);
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(source, /if \(layer\.wetForest && drawWetForestTreeArt\(/);
});

test('Wet Forest Lab woodland silhouettes remain physically grounded and use restrained Gothic values', () => {
    const pine = createWetForestTreeArtPlan('pine', 1, 1204);
    const oldPine = createWetForestTreeArtPlan('pine', 2, 1204);
    assert.notDeepEqual(pine.shapes, oldPine.shapes, 'Canopies should be seed-and-prop-specific');
    const canopy = pine.shapes.filter(s => s.y < -25);
    assert.ok(canopy.length > 25, 'Do not replace the physical tree with abstract fog or a filter');
    for (const shape of canopy) {
        assert.match(shape.color, /^#[0-9a-f]{6}$/);
        const channels = [1, 3, 5].map(i => parseInt(shape.color.slice(i, i + 2), 16));
        assert.ok(Math.max(...channels) <= 90, 'No luminous toy-green crown highlights');
    }
    assert.equal(pine.id, 1);
    assert.equal(pine.kind, 'pine');
});

test('fire trees evolve monotonically from chosen-route percentage, never by arbitrary stage count', () => {
    const ranks = { healthy: 0, charred: 1, burning: 2, 'split-glowing': 3 };
    const stages = new Set();
    for (let id = 1; id <= 80; id++) {
        let previous = 0;
        for (const progress of [0, .10, .25, .4, .55, .7, .85, 1]) {
            const state = wetForestTreeFireState('pine', id, 1204, progress, 'fire');
            assert.ok(ranks[state] >= previous, 'Fire must never reverse the same tree\'s damage');
            previous = ranks[state];
            stages.add(state);
            assert.equal(state, wetForestTreeFireState('pine', id, 1204, progress, 'fire'));
        }
        assert.equal(wetForestTreeFireState('pine', id, 1204, 1, 'frost'), 'healthy');
        assert.equal(wetForestTreeFireState('pine', id, 1204, 1, 'arcane'), 'healthy');
    }
    assert.deepEqual(stages, new Set(['healthy', 'charred', 'burning', 'split-glowing']));
    assert.equal(wetForestTreeFireState('crate', 2, 1204, 1, 'fire'), 'healthy');
});

test('fire variants are different physical silhouettes with local embers, never global scene tint', () => {
    for (const state of ['charred', 'burning', 'split-glowing']) {
        let chosen = null;
        for (let id = 1; id < 90 && !chosen; id++)
            if (wetForestTreeFireState('pine', id, 1204, 1, 'fire') === state) chosen = id;
        assert.ok(chosen !== null, 'Expected reproducible ' + state + ' tree');
        const base = createWetForestTreeArtPlan('pine', chosen, 1204, 0, 'fire');
        const damaged = createWetForestTreeArtPlan('pine', chosen, 1204, 1, 'fire');
        assert.equal(base.fireState, 'healthy');
        assert.equal(damaged.fireState, state);
        assert.notDeepEqual(damaged.shapes, base.shapes);
        assert.ok(damaged.shapes.every(shape => shape.x >= -56 && shape.x + shape.w <= 56 &&
            shape.y >= -118 && shape.y + shape.h <= 10), 'All charred and hot pixels fit the cached physical tree sprite');
    }
});

test('burning tree ember flicker stays near its own C# foot and does not affect pathfinding', () => {
    let id = 1;
    while (wetForestTreeFireState('pine', id, 1204, 1, 'fire') !== 'burning') id++;
    const rects = [];
    const ctx = { save() {}, restore() {}, set fillStyle(_value) {}, imageSmoothingEnabled: true,
        fillRect(...args) { rects.push(args); } };
    assert.equal(drawWetForestTreeArt(ctx, 'pine', id, 1204, 400, 600, 1, 'fire', 2), true);
    const first = rects.slice(-4);
    rects.length = 0;
    drawWetForestTreeArt(ctx, 'pine', id, 1204, 400, 600, 1, 'fire', 4);
    const second = rects.slice(-4);
    assert.notDeepEqual(first, second, 'Only tiny ember motes animate; cached bark/canopy stay fixed');
    assert.ok(first.every(([x, y, w, h]) => x >= 388 && x <= 412 && y >= 502 && y <= 577 && w === 2 && h === 2));
    const forest = { seed: 1204, generatorPreview: true, habitat: 'WetForest',
        element: 'fire', corruption: .91, props };
    const layers = createDestructibleLayers(forest, 950, 1550, 4);
    assert.ok(layers.every(layer => layer.fireInfluence === .91 && layer.seconds === 4));
    assert.deepEqual(layers.map(layer => layer.prop.id), props.map(prop => prop.id));
    assert.ok(createDestructibleLayers({ ...forest, generatorPreview: false }, 950, 1550)
        .every(layer => !layer.wetForest), 'Normal Hunt sprite atlas and collision must remain unchanged');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    wetForestTreeFrame, createWetForestRootVeins, createWetForestUnderstory,
    drawWetForestRootVeins, drawWetForestTreeAccents,
    createWetForestTreeArtPlan, drawWetForestTreeArt,
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

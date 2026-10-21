import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWetForestStoryArtPlan, drawWetForestStoryArt } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-sites.js';
import { createDestructibleLayers } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const kinds = ['grave-marker', 'waystone', 'camp-remains', 'broken-cart', 'fallen-log'];
const props = kinds.map((kind, i) => ({ id: i + 1, kind, x: .2 + i * .12, y: .15 + i * .11, radius: 19, healthFraction: 1 }));

test('each authentic human-history sprite belongs to exactly one physically authoritative C# prop', () => {
    const copies = structuredClone(props);
    const layers = createDestructibleLayers({ generatorPreview: true, habitat: 'WetForest', seed: 1204, props }, 950, 1550);
    for (const [i, layer] of layers.entries()) {
        const plan = createWetForestStoryArtPlan(layer.prop, 1204);
        assert.equal(plan.id, props[i].id);
        assert.equal(plan.kind, props[i].kind);
        assert.ok(plan.marks.length >= 10, 'Physically readable pixel study for ' + props[i].kind);
        assert.ok(plan.marks.every(mark => mark.w >= 2 && mark.h >= 2 &&
            mark.x % 2 === 0 && mark.y % 2 === 0), 'Crisp 2px plan for ' + plan.kind);
        assert.equal(layer.depth, layer.prop.y * 1550);
        assert.deepEqual(plan, createWetForestStoryArtPlan(props[i], 1204));
    }
    assert.deepEqual(props, copies, 'Drawing must not mutate authoritative environment props');
    assert.equal(createWetForestStoryArtPlan({ id: 99, kind: 'pine' }, 1204), null);
});

test('weathered shapes vary by seed/ID and use no magical neon accents', () => {
    const first = createWetForestStoryArtPlan(props[0], 1204);
    const second = createWetForestStoryArtPlan(props[0], 1441);
    const third = createWetForestStoryArtPlan({ ...props[0], healthFraction: .3 }, 1204);
    assert.notDeepEqual(first, third, 'Visible chisel cracks can follow actual C# health');
    assert.ok(first.marks.every(s => /^#[0-9a-f]{6}$/.test(s.color)));
    assert.ok(kinds.some((kind, i) => ![1204, 1441, 3312].every(seed =>
        JSON.stringify(createWetForestStoryArtPlan(props[i], seed)) === JSON.stringify(createWetForestStoryArtPlan(props[i], 1204)))));
    assert.ok(second.marks.length >= 10);
});

test('world-foot draw uses only pixel rects for the supplied prop and returns false for unsupported kinds', () => {
    const calls = [];
    const ctx = { save() {}, restore() {}, set fillStyle(_value) {},
        fillRect(...args) { calls.push(args); } };
    for (const prop of props)
        assert.equal(drawWetForestStoryArt(ctx, prop, 1204, 400, 620), true);
    assert.ok(calls.length > 70);
    assert.ok(calls.every(([x, y, w, h]) => x >= 340 && x <= 458 && y >= 558 && y <= 632 && w >= 2 && h >= 2));
    const count = calls.length;
    assert.equal(drawWetForestStoryArt(ctx, { id: 8, kind: 'barrel' }, 1204, 400, 620), false);
    assert.equal(calls.length, count);
    const code = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-sites.js', import.meta.url), 'utf8');
    const renderer = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(renderer, /if \(layer\.wetForest && drawWetForestStoryArt\(/);
    assert.doesNotMatch(code, /Math\.random|DamagePropsInRadius|RestrictMovement|SetPhase|requestAnimationFrame/);
});

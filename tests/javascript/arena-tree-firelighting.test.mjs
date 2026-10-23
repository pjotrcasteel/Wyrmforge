import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { treeFirelightPlan, treeProjectedSilhouettePlan, makeTreeLightingAssets,
    drawTreeCastShadow, drawFirelitTree } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-tree-firelighting.js';
import { calibrationEmitters } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lighting-calibration.js';

const foot = Object.freeze({ x: 415, y: 755 });
const height = 235;

test('Real Fireball position changes the projected shadow direction, not a fixed ellipse', () => {
    const before = treeFirelightPlan(foot, height, [{ x: 315, y: 685, radius: 250, relief: .99, altitude: 46 }]);
    const after = treeFirelightPlan(foot, height, [{ x: 515, y: 685, radius: 250, relief: .99, altitude: 46 }]);
    assert.ok(before && after);
    const left = treeProjectedSilhouettePlan(foot, height, before);
    const right = treeProjectedSilhouettePlan(foot, height, after);
    assert.ok(left.skewX < 0, 'Emitter on left projects actual canopy silhouette to right');
    assert.ok(right.skewX > 0, 'Emitter on right projects actual canopy silhouette to left');
    assert.notEqual(left.skewX, right.skewX);
    assert.ok(left.opacity > .2 && left.opacity < .82);
    assert.equal(left.x, foot.x);
    assert.equal(right.y, foot.y);
});

test('Source-driven shadows disappear immediately when fire goes out or moves far away', () => {
    assert.equal(treeFirelightPlan(foot, height, []), null);
    assert.equal(treeFirelightPlan(foot, height,
        [{ x: 900, y: 755, radius: 40, relief: 1 }]), null);
    assert.equal(treeProjectedSilhouettePlan(foot, height, null), null);
    const flame = calibrationEmitters({ fireball: true, progress: .5, torch: false });
    assert.ok(treeFirelightPlan(foot, height, flame));
    const plan = treeFirelightPlan(foot, height, flame);
    assert.deepEqual(treeFirelightPlan(foot, height, flame), plan);
    assert.deepEqual(foot, { x: 415, y: 755 });
});

test('Shadow remains bounded for a low Fireball near a tall tree', () => {
    const plan = treeFirelightPlan(foot, height, [{
        x: foot.x + 30, y: foot.y - 20, radius: 400, relief: 1, altitude: 1,
    }]);
    const shadow = treeProjectedSilhouettePlan(foot, height, plan);
    assert.ok(shadow.opacity <= .82);
    assert.ok(shadow.blur >= 2 && shadow.blur <= 5);
    assert.ok(Math.abs(shadow.skewX) <= 1.38);
    assert.ok(Number.isFinite(shadow.scaleY));
    assert.equal(treeFirelightPlan({ x: NaN, y: 3 }, height, []), null);
    assert.equal(treeProjectedSilhouettePlan(foot, -1, plan), null);
});

function painter() {
    const operations = [];
    const stops = { addColorStop(offset, color) { operations.push(['stop', offset, color]); } };
    return {
        operations,
        save() { operations.push('save'); },
        restore() { operations.push('restore'); },
        clearRect(...values) { operations.push(['clear', ...values]); },
        translate(...values) { operations.push(['translate', ...values]); },
        transform(...values) { operations.push(['transform', ...values]); },
        drawImage(...values) { operations.push(['image', ...values.slice(1)]); },
        fillRect(...values) { operations.push(['fill', ...values]); },
        createLinearGradient(...values) { operations.push(['linear', ...values]); return stops; },
        createRadialGradient(...values) { operations.push(['radial', ...values]); return stops; },
        set filter(value) { operations.push(['filter', value]); },
        get filter() { return 'none'; },
        set globalAlpha(value) { operations.push(['alpha', value]); },
        set globalCompositeOperation(value) { operations.push(['composite', value]); },
        set imageSmoothingEnabled(value) { operations.push(['smoothing', value]); },
        set fillStyle(value) { operations.push(['color', typeof value === 'string' ? value : 'gradient']); },
    };
}

test('Unapproved source alpha is the sole cast-shadow mask, not an invented oval', () => {
    const contexts = [];
    const doc = { createElement() {
        const ctx = painter();
        const canvas = { width: 0, height: 0, getContext() { return ctx; } };
        contexts.push({ canvas, ctx });
        return canvas;
    } };
    const assets = makeTreeLightingAssets({}, { x: 0, y: 0, width: 400, height: 600,
        footInsetPixels: 20 }, height, doc);
    assert.ok(assets);
    assert.equal(contexts.length, 3);
    assert.ok(contexts[1].ctx.operations.some(op => op[0] === 'composite' && op[1] === 'source-in'));
    assert.ok(contexts[1].ctx.operations.some(op => op[0] === 'color' && op[1] === '#040608'));
    const ctx = painter();
    const light = treeFirelightPlan(foot, height, [
        { x: 480, y: 600, radius: 218, relief: .99, altitude: 46, color: [255,139,66] },
    ]);
    const plan = treeProjectedSilhouettePlan(foot, height, light);
    assert.equal(drawTreeCastShadow(ctx, assets, plan), true);
    assert.ok(ctx.operations.some(op => op[0] === 'transform'));
    assert.ok(ctx.operations.some(op => op[0] === 'image'));
    assert.equal(ctx.operations.at(-1), 'restore');
    assert.equal(drawFirelitTree(ctx, assets, foot, light, .9), true);
    const tree = contexts[2].ctx.operations;
    assert.ok(tree.some(op => op[0] === 'composite' && op[1] === 'source-atop'));
    assert.ok(tree.some(op => op[0] === 'linear'));
    assert.equal(ctx.operations.at(-1), 'restore');
    assert.equal(drawTreeCastShadow(ctx, assets, null), false);
});

test('L4 render order is black-lit ground, true silhouette, then directionally shaded opaque tree', () => {
    const lab = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lighting-lab.js',
        import.meta.url), 'utf8');
    const order = ['drawGothicNight(ctx', 'drawTreeCastShadow(ctx', 'drawFirelitTree(ctx', 'drawCalibrationEmitterCores(ctx'];
    let last = -1;
    for (const marker of order) {
        const found = lab.indexOf(marker);
        assert.ok(found > last, `${marker} must follow previous lighting phase`);
        last = found;
    }
    assert.doesNotMatch(lab, /drawContactShadow\(ctx, projectedShadowPlan/);
    assert.match(lab, /state\.images\[slot\] = \{ image, crop, assets \}/);
});

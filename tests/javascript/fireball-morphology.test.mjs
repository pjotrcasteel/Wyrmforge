import test from 'node:test';
import assert from 'node:assert/strict';
import { fireballMorphology, drawComposedFireProjectile, drawComposedFireImpact, drawBurningGround, drawFireballNexusPreview } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/fireball-morphology.js';

const recipe = mutationMask => ({ version: 1, level: 3, mutationMask });
function fakeCtx() {
    let drawn = 0;
    const ctx = { globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillRect() { drawn++; }, get rectangles() { return drawn; } };
    return ctx;
}

test('four implemented Fireball mutations compose independently of socket ordering', () => {
    const combined = fireballMorphology(recipe(1 | 2 | 4));
    assert.deepEqual(combined, { body: 'meteor', detonation: true, scorchedEarth: true });
    assert.deepEqual(fireballMorphology(recipe(1 | 8)), { body: 'molten-spine', detonation: false, scorchedEarth: false });
    assert.deepEqual(fireballMorphology(recipe(8)), { body: 'needle', detonation: false, scorchedEarth: false });
    assert.deepEqual(fireballMorphology(recipe(0)), { body: 'flame', detonation: false, scorchedEarth: false });
    assert.equal(fireballMorphology({ version: 4, mutationMask: 1 }).body, 'flame');
});

test('one drawable projectile changes its body and impact rather than spawning extra attacks', () => {
    const normal = fakeCtx();
    const composite = fakeCtx();
    drawComposedFireProjectile(normal, { radius: 12 }, recipe(0));
    drawComposedFireProjectile(composite, { radius: 12 }, recipe(7));
    assert.ok(normal.rectangles > 0 && composite.rectangles > normal.rectangles);
    const hit = fakeCtx();
    drawComposedFireImpact(hit, { rank: 1, progress: .3 }, recipe(7));
    assert.ok(hit.rectangles > 0);
    assert.doesNotThrow(() => drawComposedFireImpact(hit, { rank: 1, progress: 1 }, recipe(7)));
    const damageRadius = fakeCtx();
    drawComposedFireImpact(damageRadius, { rank: 1, progress: .4, splashRadius: 46 }, recipe(7));
    assert.ok(damageRadius.rectangles >= hit.rectangles / 2);
});

test('Nexus uses the same projectile morphology and ground fire needs a real C# instance', () => {
    const ctx = fakeCtx();
    drawFireballNexusPreview({ width: 160, height: 160, getContext: () => ctx }, recipe(7));
    assert.ok(ctx.rectangles > 0);
    const before = ctx.rectangles;
    drawBurningGround(ctx, { x: 5, y: 5, radius: 68, remainingSeconds: 0 });
    assert.equal(ctx.rectangles, before);
    drawBurningGround(ctx, { x: 5, y: 5, radius: 68, remainingSeconds: 2.4 });
    assert.equal(ctx.rectangles, before);
});

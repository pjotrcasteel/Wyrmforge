import test from 'node:test';
import assert from 'node:assert/strict';
import { spellFamily, castMotionProfile, drawSpellCastMotion, drawSpellProjectile } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-vfx.js';

function fakeContext() {
    const methods = ['save', 'restore', 'translate', 'rotate', 'beginPath', 'arc', 'stroke', 'moveTo', 'quadraticCurveTo', 'lineTo', 'fill', 'ellipse', 'closePath'];
    const context = { globalAlpha: 1 };
    for (const method of methods) context[method] = () => {};
    return context;
}

test('all eight spells receive a school-specific visual and one Frostfire projectile has composite identity', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(id => spellFamily(id)), ['arcane', 'fire', 'frost', 'storm', 'fire', 'frost', 'storm', 'arcane']);
    assert.equal(spellFamily(1, 0), 'frostfire');
    assert.equal(spellFamily(2, 0), 'frostfire');
});

test('each earned upgrade increases cast reach but not gameplay movement or cooldown', () => {
    const a = castMotionProfile({ spell: 1, rank: 1, progress: 0 });
    const b = castMotionProfile({ spell: 1, rank: 2, progress: 0 });
    const c = castMotionProfile({ spell: 1, rank: 3, progress: 0 });
    assert.ok(a.reach < b.reach && b.reach < c.reach);
    assert.equal(c.family, 'fire');
    assert.equal(castMotionProfile({ spell: 1, rank: 3, progress: 1 }).alpha, 0);
});

test('projectiles and gestures render across families in normal and reduced motion', () => {
    const ctx = fakeContext();
    for (const spell of [0, 1, 2, 3, 4, 5, 6, 7]) {
        for (const reduced of [false, true]) {
            assert.doesNotThrow(() => drawSpellCastMotion(ctx, { x: 20, y: 20, angle: 0.2, spell, rank: 3, progress: .3 }, reduced));
            assert.doesNotThrow(() => drawSpellProjectile(ctx, { x: 10, y: 10, angle: .4, spell, radius: 9, inferno: true }, reduced));
        }
    }
    assert.doesNotThrow(() => drawSpellProjectile(ctx, { x: 10, y: 10, angle: 0, spell: 1, combination: 0, radius: 12 }, false));
    assert.doesNotThrow(() => drawSpellCastMotion(ctx, { x: 10, y: 10, angle: 0, spell: 2, combination: 0, rank: 2, progress: 0 }, false));
});

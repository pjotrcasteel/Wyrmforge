import test from 'node:test';
import assert from 'node:assert/strict';
import { wizardAnchor, wizardAnchorWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/wizard-anchors.js';
import { wizardProjectileVisualPosition } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-vfx.js';

const player = { x: 100, y: 100 };
const wizard = { direction: 'E', action: 'cast', frame: 3 };

test('all eight Wizard directions have finite distinct hand and crystal anchors', () => {
    for (const direction of ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']) {
        const hand = wizardAnchor(direction, 'hand', 'cast', 3);
        const crystal = wizardAnchor(direction, 'crystal', 'cast', 3);
        assert.ok(Number.isFinite(hand.x) && Number.isFinite(hand.y));
        assert.ok(Number.isFinite(crystal.x) && Number.isFinite(crystal.y));
        assert.notDeepEqual(hand, crystal);
    }
});

test('projectile starts visually at casting hand and converges to authoritative coordinates', () => {
    const hand = wizardAnchorWorld(player, wizard, 'hand');
    const atOrigin = wizardProjectileVisualPosition({ x: 100, y: 100, angle: 0 }, player, wizard);
    assert.deepEqual(atOrigin, hand);
    const near = wizardProjectileVisualPosition({ x: 118, y: 100, angle: 0 }, player, wizard);
    assert.ok(near.x > 118 && near.x < hand.x + 18);
    assert.equal(wizardProjectileVisualPosition({ x: 136, y: 100, angle: 0 }, player, wizard), null);
});

test('never redirect old, backward or off-axis projectiles', () => {
    assert.equal(wizardProjectileVisualPosition({ x: 150, y: 100, angle: 0 }, player, wizard), null);
    assert.equal(wizardProjectileVisualPosition({ x: 98, y: 100, angle: 0 }, player, wizard), null);
    assert.equal(wizardProjectileVisualPosition({ x: 105, y: 120, angle: 0 }, player, wizard), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { wizardAnchor, wizardAnchorWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/wizard-anchors.js';
import { wizardProjectileVisualPosition } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-vfx.js';

const player = { x: 100, y: 100 };
const wizard = { direction: 'E', action: 'cast', frame: 3 };
const cast = { spell: 1, angle: 0, progress: .2, x: 100, y: 100 };

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
    const atOrigin = wizardProjectileVisualPosition({ x: 100, y: 100, angle: 0, spell: 1 }, player, wizard, cast);
    assert.deepEqual(atOrigin, hand);
    const near = wizardProjectileVisualPosition({ x: 118, y: 100, angle: 0, spell: 1 }, player, wizard, cast);
    assert.ok(near.x > 118 && near.x < hand.x + 18);
    assert.equal(wizardProjectileVisualPosition({ x: 136, y: 100, angle: 0, spell: 1 }, player, wizard, cast), null);
});

test('never redirect old, backward or off-axis projectiles', () => {
    assert.equal(wizardProjectileVisualPosition({ x: 150, y: 100, angle: 0, spell: 1 }, player, wizard, cast), null);
    assert.equal(wizardProjectileVisualPosition({ x: 98, y: 100, angle: 0, spell: 1 }, player, wizard, cast), null);
    assert.equal(wizardProjectileVisualPosition({ x: 105, y: 120, angle: 0, spell: 1 }, player, wizard, cast), null);
});

test('nearby unrelated projectile is never snapped to the Wizard hand', () => {
    assert.equal(wizardProjectileVisualPosition({ x: 105, y: 100, angle: 0, spell: 2 }, player, wizard, cast), null);
    assert.equal(wizardProjectileVisualPosition({ x: 105, y: 100, angle: Math.PI, spell: 1 }, player, wizard, cast), null);
    assert.equal(wizardProjectileVisualPosition({ x: 105, y: 100, angle: 0, spell: 1 }, player, wizard, null), null);
});

test('only an active cast pose with finite data can attach a projectile', () => {
    const projectile = { x: 105, y: 100, angle: 0, spell: 1 };
    assert.equal(wizardProjectileVisualPosition(projectile, player, { ...wizard, action: 'walk' }, cast), null);
    assert.equal(wizardProjectileVisualPosition(projectile, player, wizard, { ...cast, progress: 1 }), null);
    assert.equal(wizardProjectileVisualPosition(projectile, player, wizard, { ...cast, progress: NaN }), null);
    assert.equal(wizardProjectileVisualPosition({ ...projectile, angle: NaN }, player, wizard, cast), null);
    assert.equal(wizardProjectileVisualPosition({ ...projectile, x: Infinity }, player, wizard, cast), null);
});

test('moving Wizard does not launch from a hand facing away from the shot', () => {
    const projectile = { x: 105, y: 100, angle: 0, spell: 1 };
    assert.equal(wizardProjectileVisualPosition(projectile, player,
        { ...wizard, direction: 'W' }, cast), null);
    assert.equal(wizardProjectileVisualPosition(projectile, player,
        { ...wizard, direction: 'N' }, cast), null);
    assert.ok(wizardProjectileVisualPosition(projectile, player,
        { ...wizard, direction: 'NE' }, cast));
});

test('moving away from the cast origin cannot pull an in-flight projectile to the current hand', () => {
    const projectile = { x: 110, y: 100, angle: 0, spell: 1 };
    assert.equal(wizardProjectileVisualPosition(projectile, { x: 125, y: 100 },
        wizard, cast), null);
    assert.ok(wizardProjectileVisualPosition(projectile, { x: 103, y: 100 },
        wizard, cast));
    assert.equal(wizardProjectileVisualPosition(projectile, player, wizard,
        { ...cast, x: NaN }), null);
});

test('unverified frame bobbing cannot shift spell or crystal anchors', () => {
    for (const direction of ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']) {
        for (const kind of ['hand', 'crystal']) {
            const idle = wizardAnchor(direction, kind, 'idle', 0);
            for (const action of ['walk_start', 'walk', 'walk_stop', 'cast']) {
                for (let frame = 0; frame < 8; frame++) {
                    assert.deepEqual(wizardAnchor(direction, kind, action, frame), idle);
                }
            }
        }
    }
});

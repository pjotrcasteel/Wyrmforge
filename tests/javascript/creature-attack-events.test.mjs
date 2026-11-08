import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreatureAttackTracker, collectCreatureAttackEvents } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/creature-attack-events.js';

const enemy = (entityId, progress, kind = 0, attackKind = 'hollow-grasp') => ({
    entityId, kind, telegraph: { kind: attackKind, progress },
});
const frame = (enemies, paused = false) => ({ enemies, paused });

test('Hollowed windup emits once per telegraph, not every render frame', () => {
    const tracker = createCreatureAttackTracker();
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([])), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(12, 0.1)])),
        [{ type: 'hollow-attack-windup', entityId: 12, attackKind: 'hollow-grasp' }]);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(12, 0.5)])), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(12, 0.8)])), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([])), []);
    assert.equal(collectCreatureAttackEvents(tracker, frame([enemy(12, 0.1)])).length, 1);
});

test('same-count replacement and multiple attackers preserve entity identity', () => {
    const tracker = createCreatureAttackTracker();
    collectCreatureAttackEvents(tracker, frame([enemy(1, 0.2)]));
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(2, 0.1), enemy(3, 0.1)])),
        [{ type: 'hollow-attack-windup', entityId: 2, attackKind: 'hollow-grasp' },
            { type: 'hollow-attack-windup', entityId: 3, attackKind: 'hollow-grasp' }]);
});

test('non-Hollowed, non-attack tells and invalid identity are silent', () => {
    const tracker = createCreatureAttackTracker();
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([
        enemy(1, 0.2, 2), enemy(2, 0.2, 0, 'heal'), enemy(0, 0.2),
        enemy(3, Number.NaN),
    ])), []);
});

test('pause and end suppress playback without replay on resume', () => {
    const tracker = createCreatureAttackTracker();
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(4, 0.1)], true)), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(4, 0.2)])), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, { ...frame([enemy(5, 0.1)]), ended: true }), []);
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(5, 0.3)])), []);
});

test('telegraph progress reset signals a new attack from the same creature', () => {
    const tracker = createCreatureAttackTracker();
    collectCreatureAttackEvents(tracker, frame([enemy(7, 0.9, 0, 'hollow-grasp')]));
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([enemy(7, 0.05, 0, 'hollow-grasp')])),
        [{ type: 'hollow-attack-windup', entityId: 7, attackKind: 'hollow-grasp' }]);
});

test('Hollowed contact has no authoritative telegraph and cannot invent an attack cue', () => {
    const tracker = createCreatureAttackTracker();
    assert.deepEqual(collectCreatureAttackEvents(tracker, frame([
        { entityId: 11, kind: 0, x: 10, y: 10, hitFlash: false },
        enemy(12, 0.3, 0, 'bash'),
    ])), []);
});

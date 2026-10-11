import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundEventTracker, collectSoundEvents } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-events.js';

const frame = (overrides = {}) => ({
    hud: { health: 100, maxHealth: 100, kills: 0 },
    paused: false,
    ended: false,
    projectiles: [],
    lightning: [],
    elementalImpacts: [],
    powerBurst: null,
    dragon: null,
    ...overrides,
});
const track = (frames) => {
    const tracker = createSoundEventTracker();
    return frames.map(([time, snapshot]) => collectSoundEvents(tracker, snapshot, time));
};

test('first frame and paused frames never produce surprise sounds', () => {
    const result = track([[0, frame()], [50, frame({ paused: true, hud: { health: 50, maxHealth: 100, kills: 5 } })],
        [100, frame({ hud: { health: 40, maxHealth: 100, kills: 5 } })]]);
    assert.deepEqual(result, [[], [], []]);
});

test('real health damage plays hurt with cooldown, not after max-health changes', () => {
    const result = track([[0, frame()], [100, frame({ hud: { health: 90, maxHealth: 100, kills: 0 } })],
        [180, frame({ hud: { health: 80, maxHealth: 100, kills: 0 } })],
        [700, frame({ hud: { health: 115, maxHealth: 120, kills: 0 } })]]);
    assert.deepEqual(result, [[], ['hurt'], [], []]);
});

test('casts and distinct elements map to their correct sound families', () => {
    for (const [spell, expected] of [[0, 'arcane'], [1, 'fire'], [2, 'frost'], [3, 'lightning']]) {
        const result = track([[0, frame()], [300, frame({ projectiles: [{ spell }] })]]);
        assert.ok(result[1].includes(expected));
    }
});

test('snapshot events trigger at transitions and throttle crowded combat', () => {
    const tracker = createSoundEventTracker();
    const initial = frame();
    assert.deepEqual(collectSoundEvents(tracker, initial, 0), []);
    const battle = frame({ hud: { health: 90, maxHealth: 100, kills: 3 }, powerBurst: { radius: 20 },
        lightning: [{}], elementalImpacts: [{}], dragon: { x: 20 } });
    const events = collectSoundEvents(tracker, battle, 100);
    assert.ok(['hurt', 'power-burst', 'wyrm', 'enemy-down', 'lightning'].every(event => events.includes(event)));
    assert.ok(!events.includes('impact'), 'kill frame should not add a redundant impact');
    assert.deepEqual(collectSoundEvents(tracker, battle, 150), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ hud: { health: 90, maxHealth: 100, kills: 3 } }), 200), []);
    assert.deepEqual(collectSoundEvents(tracker, battle, 400).includes('power-burst'), false);
    assert.deepEqual(collectSoundEvents(tracker, frame(), 800).includes('hurt'), false);
    assert.equal(collectSoundEvents(tracker, battle, 900).includes('power-burst'), true);
});

test('defeat, pause and resume do not replay combat sounds', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame(), 0);
    assert.deepEqual(collectSoundEvents(tracker, frame({ ended: true, hud: { health: 0, maxHealth: 100, kills: 5 } }), 100), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ paused: true }), 300), []);
    assert.deepEqual(collectSoundEvents(tracker, frame(), 400), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundEventTracker, collectSoundEvents, collectBurningGroundTransitions } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-events.js';

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


test('Hollowed and Ashling deaths come from exact Kind and EntityId, not generic kill guesses', () => {
    const tracker = createSoundEventTracker();
    const kill = (kills, deathBursts) => frame({ hud: { health: 100, maxHealth: 100, kills }, deathBursts });
    assert.deepEqual(collectSoundEvents(tracker, kill(0, []), 0), []);
    const hollow = { entityId: 51, kind: 0, progress: 0.1 };
    assert.deepEqual(collectSoundEvents(tracker, kill(1, [hollow]), 100), ['hollow-death']);
    assert.deepEqual(collectSoundEvents(tracker, kill(1, [hollow]), 150), []);
    assert.deepEqual(collectSoundEvents(tracker, kill(1, []), 240), []);
    const ashling = { entityId: 52, kind: 2, progress: 0.02 };
    assert.deepEqual(collectSoundEvents(tracker, kill(2, [ashling]), 800), ['ashling-death']);
    const other = { entityId: 53, kind: 1 };
    assert.deepEqual(collectSoundEvents(tracker, kill(3, [other]), 1500), ['enemy-down']);
});

test('hit flashes make one restrained grunt per impact, not an endless sound every frame', () => {
    const tracker = createSoundEventTracker();
    const make = (hitFlash, kind = 0, id = 71) => frame({
        enemies: [{ entityId: id, kind, x: 400, y: 400, hitFlash }],
    });
    assert.deepEqual(collectSoundEvents(tracker, make(false), 0), []);
    assert.deepEqual(collectSoundEvents(tracker, make(true), 120), ['hollow-hit']);
    assert.deepEqual(collectSoundEvents(tracker, make(true), 220), []);
    assert.deepEqual(collectSoundEvents(tracker, make(false), 300), []);
    assert.deepEqual(collectSoundEvents(tracker, make(true), 800), ['hollow-hit']);
    assert.deepEqual(collectSoundEvents(tracker, make(false, 2), 1100), []);
    assert.deepEqual(collectSoundEvents(tracker, make(true, 2), 1200), ['ashling-hit']);
});

test('only nearby creatures occasionally vocalize; pauses and offscreen packs remain silent', () => {
    const tracker = createSoundEventTracker();
    const proximity = (x, kind = 0, paused = false) => frame({
        player: { x: 10, y: 10 },
        enemies: [{ entityId: 3, kind, x, y: 10, hitFlash: false }],
        paused,
    });
    assert.deepEqual(collectSoundEvents(tracker, proximity(55), 0), []);
    assert.deepEqual(collectSoundEvents(tracker, proximity(55), 100), ['hollow-approach']);
    assert.deepEqual(collectSoundEvents(tracker, proximity(55), 400), []);
    assert.deepEqual(collectSoundEvents(tracker, proximity(900), 8000), []);
    assert.deepEqual(collectSoundEvents(tracker, proximity(55, 2, true), 8200), []);
    assert.deepEqual(collectSoundEvents(tracker, proximity(55, 2), 8300), []);
    assert.deepEqual(collectSoundEvents(tracker, proximity(55, 2), 9000), ['ashling-approach']);
});


test('scripted or revived Ashling death still emits when the kill counter is unchanged', () => {
    const tracker = createSoundEventTracker();
    const initial = frame({ hud: { health: 100, maxHealth: 100, kills: 7 } });
    assert.deepEqual(collectSoundEvents(tracker, initial, 0), []);
    const ashling = { entityId: 901, kind: 2, progress: 0.03 };
    const dying = frame({ hud: { health: 100, maxHealth: 100, kills: 7 }, deathBursts: [ashling] });
    assert.deepEqual(collectSoundEvents(tracker, dying, 180), ['ashling-death']);
    assert.deepEqual(collectSoundEvents(tracker, dying, 220), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ hud: { health: 100, maxHealth: 100, kills: 7 } }), 260), []);
});


test('elemental impact snapshots trigger the correct spell recording independent of recent casts', () => {
    for (const [spell, expected] of [[0, 'arcane'], [1, 'fire'], [2, 'frost'], [3, 'lightning'],
        [4, 'fire'], [5, 'frost'], [6, 'lightning'], [7, 'arcane']]) {
        const tracker = createSoundEventTracker();
        collectSoundEvents(tracker, frame({ projectiles: [{ spell: 3 }] }), 0);
        const impact = frame({ elementalImpacts: [{ x: 50, y: 51, spell, progress: .05 }] });
        assert.deepEqual(collectSoundEvents(tracker, impact, 500), [expected + '-impact'],
            'SpellId ' + spell + ' should use its own impact, not the preceding Lightning cast');
    }
});

test('unknown SpellId retains generic physical impact and kills do not double the sound', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame(), 0);
    assert.deepEqual(collectSoundEvents(tracker,
        frame({ elementalImpacts: [{ spell: 99 }] }), 100), ['impact']);
    collectSoundEvents(tracker, frame(), 220);
    assert.deepEqual(collectSoundEvents(tracker,
        frame({ hud: { health: 100, maxHealth: 100, kills: 1 },
            elementalImpacts: [{ spell: 1 }] }), 450), ['enemy-down']);
});


test('same-length impact replacement is recognized and persistent animation is not replayed', () => {
    const tracker = createSoundEventTracker();
    const first = frame({ elementalImpacts: [{ x: 12, y: 30, spell: 1, progress: 0.04 }] });
    assert.deepEqual(collectSoundEvents(tracker, first, 0), []);
    assert.deepEqual(collectSoundEvents(tracker,
        frame({ elementalImpacts: [{ x: 12, y: 30, spell: 1, progress: 0.24 }] }), 100), []);
    const second = frame({ elementalImpacts: [{ x: 12, y: 30, spell: 2, progress: 0.03 }] });
    assert.deepEqual(collectSoundEvents(tracker, second, 380), ['frost-impact']);
    assert.deepEqual(collectSoundEvents(tracker, second, 420), []);
    const reset = frame({ elementalImpacts: [{ x: 12, y: 30, spell: 2, progress: 0.01 }] });
    assert.deepEqual(collectSoundEvents(tracker, reset, 620), ['frost-impact']);
});

test('simultaneous different elemental impact records are kept distinct', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame(), 0);
    const simultaneous = frame({ elementalImpacts: [
        { x: 10, y: 15, spell: 1, progress: 0.02 },
        { x: 40, y: 15, spell: 3, progress: 0.05 },
    ] });
    assert.deepEqual(collectSoundEvents(tracker, simultaneous, 250), ['fire-impact', 'lightning-impact']);
    assert.deepEqual(collectSoundEvents(tracker,
        frame({ elementalImpacts: [
            { x: 10, y: 15, spell: 1, progress: 0.2 },
            { x: 40, y: 15, spell: 3, progress: 0.2 },
        ] }), 300), []);
});


test('real Fireball projectile launch triggers one flight cue without a timeout', () => {
    const results = track([[0, frame()], [300, frame({ projectiles: [{ spell: 1 }] })],
        [320, frame({ projectiles: [{ spell: 1 }] })], [400, frame({ projectiles: [] })],
        [760, frame({ projectiles: [{ spell: 1 }] })]]);
    assert.deepEqual(results, [[], ['fire', 'fire-flight'], [], [], ['fire', 'fire-flight']]);
});

test('registered ground-fire creates one audio onset per stable patch ID, not per frame', () => {
    const tracker = createSoundEventTracker();
    assert.deepEqual(collectSoundEvents(tracker, frame({ essenceBursts: [{ x: 3, y: 9 }] }), 0), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ burningGrounds: [{ id: 11 }] }), 100), ['fire-burning']);
    assert.deepEqual(collectSoundEvents(tracker, frame({ burningGrounds: [{ id: 11 }] }), 400), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ burningGrounds: [] }), 600), []);
    assert.deepEqual(collectSoundEvents(tracker, frame({ burningGrounds: [{ id: 12 }] }), 1000), ['fire-burning']);
});

test('pause and resume never re-trigger a ground patch that already exists', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame(), 0);
    collectSoundEvents(tracker, frame({ paused: true, burningGrounds: [{ id: 20 }] }), 100);
    assert.deepEqual(collectSoundEvents(tracker, frame({ burningGrounds: [{ id: 20 }] }), 400), []);
});


test('stable projectile IDs detect a new launch when another projectile disappears in the same frame', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame({ projectiles: [{ id: 1, spell: 2 }] }), 0);
    assert.deepEqual(collectSoundEvents(tracker, frame({ projectiles: [{ id: 2, spell: 1 }] }), 400),
        ['fire', 'fire-flight']);
    assert.deepEqual(collectSoundEvents(tracker, frame({ projectiles: [{ id: 2, spell: 1 }] }), 500), []);
});

test('stable projectile IDs detect a launch despite a decreasing projectile count', () => {
    const tracker = createSoundEventTracker();
    collectSoundEvents(tracker, frame({ projectiles: [{ id: 1, spell: 2 }, { id: 2, spell: 2 }] }), 0);
    assert.deepEqual(collectSoundEvents(tracker, frame({ projectiles: [{ id: 3, spell: 1 }] }), 400),
        ['fire', 'fire-flight']);
});


test('burning ground lifecycle follows real patch identity and remaining duration', () => {
    const tracker = createSoundEventTracker();
    assert.deepEqual(collectBurningGroundTransitions(tracker, frame()), []);
    assert.deepEqual(collectBurningGroundTransitions(tracker,
        frame({ burningGrounds: [{ id: 12, remainingSeconds: 3.4 }] })),
        [{ type: 'start', id: 12, remainingSeconds: 3.4 }]);
    assert.deepEqual(collectBurningGroundTransitions(tracker,
        frame({ burningGrounds: [{ id: 12, remainingSeconds: 0.8 }, { id: 13, remainingSeconds: 2 }] })),
        [{ type: 'update', id: 12, remainingSeconds: 0.8 }, { type: 'start', id: 13, remainingSeconds: 2 }]);
    assert.deepEqual(collectBurningGroundTransitions(tracker,
        frame({ burningGrounds: [{ id: 13, remainingSeconds: 1.5 }] })),
        [{ type: 'update', id: 13, remainingSeconds: 1.5 }, { type: 'stop', id: 12, remainingSeconds: 0 }]);
    assert.deepEqual(collectBurningGroundTransitions(tracker, frame()),
        [{ type: 'stop', id: 13, remainingSeconds: 0 }]);
});


test('burning-ground transitions ignore invalid and expired patches', () => {
    const tracker = createSoundEventTracker();
    assert.deepEqual(collectBurningGroundTransitions(tracker, frame({ burningGrounds: [
        { id: 0, remainingSeconds: 2 }, { id: 3, remainingSeconds: 0 },
        { id: 4, remainingSeconds: -1 }, { id: 5, remainingSeconds: Number.NaN },
        { id: 6, remainingSeconds: 0.5 },
    ] })), [{ type: 'start', id: 6, remainingSeconds: 0.5 }]);
    assert.deepEqual(collectBurningGroundTransitions(tracker, frame({ burningGrounds: [
        { id: 6, remainingSeconds: 0 },
    ] })), [{ type: 'stop', id: 6, remainingSeconds: 0 }]);
});

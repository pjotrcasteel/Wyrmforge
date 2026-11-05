import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    DIRECTIONS, ENEMY_CHARACTERS, CAST_RELEASE_AT, pickDirection, pickDirectionFromAngle, frameAtTime, frameAtPhase, clipDuration,
    createAuthoredState, updateAuthoredEnemies, updateAuthoredWizard, corpsePose, CORPSE_SECONDS,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/authored-characters.js';

const manifestOf = name => JSON.parse(readFileSync(new URL(`../../src/Wyrmforge.Presentation.Web/wwwroot/art/characters/${name}/manifest.json`, import.meta.url), 'utf8'));
const manifests = new Map(['Hollowed', 'Mire-Hound', 'Wizard'].map(name => [name, manifestOf(name)]));

test('every shipped strip matches its manifest: cell width times frames, eight direction rows, in the documented order', () => {
    const sizeOf = png => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
    for (const [name, manifest] of manifests) {
        assert.deepEqual(manifest.directions, DIRECTIONS);
        for (const [key, spec] of Object.entries(manifest.actions)) {
            const png = readFileSync(new URL(`../../src/Wyrmforge.Presentation.Web/wwwroot/art/characters/${name}/${spec.image.split('/').pop()}`, import.meta.url));
            const { width, height } = sizeOf(png);
            assert.equal(width, manifest.canvas[0] * spec.framesPerDirection, `${name} ${key} width`);
            assert.equal(height, manifest.canvas[1] * 8, `${name} ${key} height`);
            assert.equal(spec.durationsMs.length, spec.framesPerDirection);
        }
    }
});

test('the C# enemy kinds with authored sets are the first seven, each with its primary strip', () => {
    assert.deepEqual([...ENEMY_CHARACTERS.keys()], [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(ENEMY_CHARACTERS.get(0), 'Hollowed');
});

test('facing: eight sectors with hysteresis, and screen y grows downward (south)', () => {
    assert.equal(pickDirection(1, 0), 'E');
    assert.equal(pickDirection(0, 1), 'S');
    assert.equal(pickDirection(-1, -1), 'NW');
    assert.equal(pickDirection(0, 0, 'W'), 'W', 'no movement keeps the facing');
    // 10 degrees past the E/SE boundary (22.5) is still E for a creature already facing E; 30 degrees flips.
    assert.equal(pickDirectionFromAngle(30 * Math.PI / 180, 'E'), 'SE', '30 degrees from E is a clear SE');
    assert.equal(pickDirectionFromAngle(25 * Math.PI / 180, 'E'), 'E', 'inside the hysteresis band the facing holds');
    assert.equal(pickDirectionFromAngle(NaN, 'N'), 'N');
});

test('clips: one-shots hold their last frame, loops wrap, phase weights by authored durations', () => {
    const clip = [100, 300, 100];
    assert.equal(clipDuration(clip), 500);
    assert.deepEqual(frameAtTime(clip, 0), { index: 0, done: false });
    assert.deepEqual(frameAtTime(clip, 150), { index: 1, done: false });
    assert.deepEqual(frameAtTime(clip, 500), { index: 2, done: true });
    assert.deepEqual(frameAtTime(clip, 650, true), { index: 1, done: false });
    assert.equal(frameAtPhase(clip, .1), 0);
    assert.equal(frameAtPhase(clip, .5), 1);
    assert.equal(frameAtPhase(clip, 1.9), 2, 'phase wraps');
});

const enemy = (over = {}) => ({ kind: 0, entityId: 7, x: 100, y: 100, radius: 11, hitFlash: false, frozen: false, ...over });
const snap = (enemies, over = {}) => ({ enemies, player: { x: 400, y: 400, radius: 12 }, deathBursts: [], paused: false, ended: false, hud: { seconds: 1 }, ...over });
const step = (state, snapshot, seconds) => updateAuthoredEnemies(state, snapshot, manifests, seconds);

test('an enemy idles while still, walks while it moves, and keeps its walk phase across a facing change', () => {
    const state = createAuthoredState();
    step(state, snap([enemy()]), 0);
    step(state, snap([enemy()]), .05);
    assert.equal(state.enemies.get(7).action, 'idle');
    let x = 100, t = .05;
    for (let i = 0; i < 6; i++) { x += 3; t += .05; step(state, snap([enemy({ x })]), t); }
    const walking = state.enemies.get(7);
    assert.equal(walking.action, 'walk');
    assert.equal(walking.direction, 'E');
    const phase = walking.phase;
    t += .05; step(state, snap([enemy({ x, y: 103 })]), t);
    assert.equal(state.enemies.get(7).direction, 'S', 'a clear turn changes the row');
    assert.ok(state.enemies.get(7).phase >= phase, 'the gait did not restart');
    for (let i = 0; i < 6; i++) { t += .05; step(state, snap([enemy({ x, y: 103 })]), t); }
    assert.equal(state.enemies.get(7).action, 'idle', 'it settles when it stops');
});

test('a telegraphed attack scrubs the windup to the contact frame and plays the release once the telegraph ends', () => {
    const state = createAuthoredState();
    const hound = telegraph => enemy({ kind: 1, entityId: 9, telegraph });
    step(state, snap([hound(null)]), 0);
    step(state, snap([hound({ kind: 'pounce', progress: .1, targetX: 300, targetY: 100, radius: 10 })]), .05);
    let pose = state.enemies.get(9);
    assert.equal(pose.action, 'lunging_bite');
    assert.equal(pose.frame, 0);
    assert.equal(pose.direction, 'E', 'turns toward the committed target');
    step(state, snap([hound({ kind: 'pounce', progress: .95, targetX: 300, targetY: 100, radius: 10 })]), .1);
    pose = state.enemies.get(9);
    assert.equal(pose.frame, 1, 'the frame before contact at the end of the windup (contact is frame 2)');
    step(state, snap([hound(null)]), .15);
    pose = state.enemies.get(9);
    assert.equal(pose.action, 'lunging_bite');
    assert.equal(pose.frame, 2, 'contact the moment the telegraph ends');
    let t = .15;
    while (state.enemies.get(9).action === 'lunging_bite' && t < 2) { t += .05; step(state, snap([hound(null)]), t); }
    assert.ok(t > .4 && t < 1.2, 'the remaining frames play out in about the authored time');
    assert.notEqual(state.enemies.get(9).action, 'lunging_bite');
});

test('a touching Hollowed claws once per swing and a C# hit flash plays the hit clip only when it is not mid-attack', () => {
    const state = createAuthoredState();
    const touching = over => enemy({ x: 395, y: 400, ...over });
    step(state, snap([touching()]), 0);
    step(state, snap([touching()]), .05);
    assert.equal(state.enemies.get(7).action, 'claw_swipe');
    step(state, snap([touching({ hitFlash: true })]), .1);
    assert.equal(state.enemies.get(7).action, 'claw_swipe', 'a hit does not interrupt the swing');
    const calm = createAuthoredState();
    step(calm, snap([enemy()]), 0);
    step(calm, snap([enemy({ hitFlash: true })]), .05);
    assert.equal(calm.enemies.get(7).action, 'hit');
    step(calm, snap([enemy({ hitFlash: true })]), .1);
    assert.equal(calm.enemies.get(7).action, 'hit', 'a held flash is one hit, not a new one each frame');
});

test('paused or frozen enemies do not advance, and a reset clock starts the state over', () => {
    const state = createAuthoredState();
    step(state, snap([enemy()]), 0);
    step(state, snap([enemy({ x: 104 })]), .05);
    const frame = state.enemies.get(7).phase;
    step(state, snap([enemy({ x: 108 })], { paused: true }), .1);
    assert.equal(state.enemies.get(7).phase, frame);
    step(state, snap([enemy()], { hud: { seconds: 0 } }), .02);
    assert.equal(state.clock, 0, 'a new Hunt starts from zero');
});

test('a C# death burst leaves one corpse that plays the death clip, holds it, and fades', () => {
    const state = createAuthoredState();
    step(state, snap([enemy({ x: 100, y: 100 })]), 0);
    const burst = { x: 100, y: 100, kind: 0, entityId: 7, bodyRadius: 11, progress: 0 };
    step(state, snap([], { deathBursts: [burst] }), .05);
    assert.equal(state.corpses.size, 1);
    step(state, snap([], { deathBursts: [burst] }), .1);
    assert.equal(state.corpses.size, 1, 'the same burst does not leave a second body');
    const corpse = [...state.corpses.values()][0];
    const manifest = manifests.get('Hollowed');
    assert.equal(corpsePose(state, corpse, manifest).frame, 0);
    state.clock = corpse.started + 3;
    const late = corpsePose(state, corpse, manifest);
    assert.equal(late.frame, manifest.actions.death.framesPerDirection - 1);
    assert.equal(late.alpha, 1);
    state.clock = corpse.started + CORPSE_SECONDS - .5;
    assert.equal(corpsePose(state, corpse, manifest).alpha, .5);
});

test('the wizard: idle, walk start, walk, walk stop, and a cast that reaches its release frame at the C# release point', () => {
    const state = createAuthoredState(), manifest = manifests.get('Wizard');
    let t = 0, x = 400;
    const frame = (cast = null, over = {}) => ({ player: { x, y: 400, radius: 12, ...over }, castMotion: cast, paused: false, ended: false });
    updateAuthoredWizard(state, frame(), manifest, t);
    t += .05; updateAuthoredWizard(state, frame(), manifest, t);
    assert.equal(state.wizard.action, 'idle');
    t += .05; x += 4; updateAuthoredWizard(state, frame(), manifest, t);
    assert.equal(state.wizard.action, 'walk_start');
    assert.equal(state.wizard.direction, 'E');
    for (let i = 0; i < 10; i++) { t += .05; x += 4; updateAuthoredWizard(state, frame(), manifest, t); }
    assert.equal(state.wizard.action, 'walk', 'the start clip hands over to the loop');
    for (let i = 0; i < 5; i++) { t += .05; updateAuthoredWizard(state, frame(), manifest, t); }
    assert.equal(state.wizard.action, 'walk_stop');
    for (let i = 0; i < 10; i++) { t += .05; updateAuthoredWizard(state, frame(), manifest, t); }
    assert.equal(state.wizard.action, 'idle');
    assert.equal(state.wizard.direction, 'E', 'it keeps its facing at rest');

    const release = manifest.actions.cast.directions.S.events[0].localFrame;
    const cast = progress => ({ progress, angle: Math.PI / 2, spell: 0 });
    t += .05; updateAuthoredWizard(state, frame(cast(.02)), manifest, t);
    assert.equal(state.wizard.action, 'cast');
    assert.equal(state.wizard.direction, 'S', 'turns to the committed aim');
    assert.ok(state.wizard.frame < release);
    t += .05; updateAuthoredWizard(state, frame(cast(CAST_RELEASE_AT + .01)), manifest, t);
    assert.equal(state.wizard.frame, release, 'the release pose lands on the C# release');
    t += .05; updateAuthoredWizard(state, frame(cast(.99)), manifest, t);
    assert.equal(state.wizard.frame, manifest.actions.cast.framesPerDirection - 1);
});

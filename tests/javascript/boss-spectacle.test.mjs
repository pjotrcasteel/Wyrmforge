import test from 'node:test';
import assert from 'node:assert/strict';
import { drawTransformation, drawTransformations, transformingEnemies, transformationPalette } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-transformation-vfx.js';
import { selectAshfangMotion, ACTION_TIMING } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/ashfang-sprites.js';
import { ashfangFirePlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/ashfang-vfx.js';

const recorder = () => {
    const calls = [];
    return new Proxy({}, {
        get: (target, key) => key === 'calls' ? calls : (...args) => { calls.push([key, ...args]); },
        set: (target, key, value) => { calls.push([`set:${String(key)}`, value]); return true; },
    });
};
const boss = (extra = {}) => ({ kind: 9, entityId: 5, x: 100, y: 120, radius: 30, invulnerable: true, telegraph: { kind: 'bell-crack', progress: .5 }, ...extra });

test('only enemies C# marks invulnerable get a transformation, at the progress of their telegraph', () => {
    const snapshot = { enemies: [boss(), { kind: 0, x: 0, y: 0, radius: 10 }, boss({ entityId: 6, telegraph: null })] };
    const found = transformingEnemies(snapshot);
    assert.equal(found.length, 2);
    assert.equal(found[0].progress, .5);
    assert.equal(found[1].progress, .5, 'no telegraph reads as the middle of the change');
    assert.equal(drawTransformations(recorder(), { enemies: [{ kind: 0, x: 0, y: 0, radius: 9 }] }, 1), 0);
});

test('the change is deterministic, builds toward a white break, and reduced motion holds it still', () => {
    const at = (p, seconds, reduced = false) => { const ctx = recorder(); return { ctx, drawn: drawTransformation(ctx, boss(), p, seconds, reduced) }; };
    assert.deepEqual(at(.4, 2).ctx.calls, at(.4, 2).ctx.calls);
    assert.ok(at(.95, 2).drawn > at(.4, 2).drawn, 'the break adds its ring');
    const fills = ctx => ctx.calls.filter(call => call[0] === 'fillRect').length;
    assert.ok(fills(at(.4, 2).ctx) > 60, 'rings, sparks, embers, shards and shell');
    assert.ok(fills(at(.4, 2, true).ctx) < fills(at(.4, 2).ctx), 'reduced motion draws fewer particles');
    assert.deepEqual(at(.4, 1, true).ctx.calls, at(.4, 9, true).ctx.calls, 'reduced motion does not depend on the clock');
    assert.notDeepEqual(at(.4, 1).ctx.calls, at(.4, 1.3).ctx.calls, 'it moves with motion on');
    assert.equal(at(.4, 2).ctx.calls.filter(call => ['arc', 'ellipse', 'stroke'].includes(call[0])).length, 0);
});

test('frost bosses change in pale light, fire bosses in ember', () => {
    assert.notEqual(transformationPalette({ kind: 17 }).core, transformationPalette({ kind: 9 }).core);
    assert.equal(transformationPalette({ kind: 18 }), transformationPalette({ kind: 17 }));
});

const dragonAt = extra => ({ school: 1, entityId: 1, x: 100, y: 100, directionX: 1, directionY: 0, attackTargetX: 300, attackTargetY: 100, flightStage: 'ground',
    action: 'claw_combo', actionPhase: 'windup', actionProgress: .5, health: 10, maxHealth: 10, radius: 60, ...extra });
const motion = dragon => selectAshfangMotion({ dragon, hunt: { stage: 2 }, player: { x: 300, y: 100 } }, null, .05);

test('the new Ashfang actions play their own strips at their own contact points', () => {
    for (const action of ['claw_combo', 'tail_left', 'tail_right', 'breath_sweep']) {
        const windup = motion(dragonAt({ action, actionPhase: 'windup', actionProgress: 1 }));
        assert.equal(windup.clip, action);
        assert.ok(Math.abs(windup.progress - ACTION_TIMING[action][0]) < 1e-9, `${action} reaches contact at the end of its wind-up`);
        const recover = motion(dragonAt({ action, actionPhase: 'recover', actionProgress: 1 }));
        assert.ok(Math.abs(recover.progress - 1) < 1e-9);
    }
    const stagger = motion(dragonAt({ action: 'stagger', actionPhase: 'recover', actionProgress: .4 }));
    assert.equal(stagger.clip, 'stagger');
    assert.equal(stagger.progress, .4, 'the stagger plays straight through its recovery');
});

test('a sweeping breath keeps its stance on the first aim while its flame follows the beam', () => {
    const sweep = dragonAt({ action: 'breath_sweep', actionPhase: 'strike', actionProgress: .5, directionX: 0, directionY: 1, attackTargetX: 300, attackTargetY: 100 });
    assert.ok(['E', 'SE', 'NE'].includes(motion(sweep).direction), 'it faces the aim it began with, not the sweeping beam');
    const plan = ashfangFirePlan({ dragon: { ...sweep, phase: 2 } }, { mouth: { x: 110, y: 90 } });
    assert.equal(plan.range, 360);
    assert.equal(plan.halfAngle, .3);
    assert.deepEqual(plan.direction, { x: 0, y: 1 }, 'the flame follows the beam');
    assert.equal(ashfangFirePlan({ dragon: { ...sweep, action: 'claw_combo' } }, { mouth: { x: 0, y: 0 } }), null);
});

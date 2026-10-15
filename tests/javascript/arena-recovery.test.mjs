import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawRecoveryGuide, recoveryGuidePlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-recovery.js';

const camera = { x: 250, y: 240, width: 950, height: 1550 };
const base = {
    player: { x: 500, y: 700 },
    hud: { health: 48, maxHealth: 100 },
    environment: { supplies: [
        { kind: 'health', x: .5, y: .82, open: true },
        { kind: 'experience', x: .7, y: .16, open: true },
    ] },
};

test('only a wounded hunter receives a guide toward an unlocked offscreen health cache', () => {
    const plan = recoveryGuidePlan(base, camera, 390, 700);
    assert.ok(plan);
    assert.ok(plan.angle > 1.4 && plan.angle < 2);
    assert.ok(plan.distance > 500);
    assert.equal(recoveryGuidePlan({ ...base, hud: { health: 90, maxHealth: 100 } }, camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, hud: { health: 66, maxHealth: 100 } }, camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, exit: { x: 100, y: 100 } }, camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, extraction: { x: 100 } }, camera, 390, 700), null);
});

test('sealed, collected, and onscreen health caches never produce a duplicate navigation marker', () => {
    assert.equal(recoveryGuidePlan({ ...base, environment: { supplies: [{ kind: 'health', x: .5, y: .82, open: false }] } },
        camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, environment: { supplies: [{ kind: 'experience', x: .5, y: .82, open: true }] } },
        camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, environment: { supplies: [] } }, camera, 390, 700), null);
    assert.equal(recoveryGuidePlan({ ...base, environment: { supplies: [{ kind: 'health', x: .5, y: .42, open: true }] } },
        camera, 390, 700), null);
    assert.equal(recoveryGuidePlan(null, camera, 390, 700), null);
});

test('scratch marks are presentation only and respect reduced motion', () => {
    const calls = [];
    const ctx = { save: () => calls.push('save'), restore: () => calls.push('restore'),
        translate: () => calls.push('translate'), rotate: () => calls.push('rotate'),
        beginPath: () => calls.push('begin'), moveTo: () => calls.push('move'),
        lineTo: () => calls.push('line'), stroke: () => calls.push('stroke') };
    assert.equal(drawRecoveryGuide(ctx, base, camera, 390, 700, 3, true), true);
    assert.equal(calls.filter(x => x === 'stroke').length, 6);
    calls.length = 0;
    assert.equal(drawRecoveryGuide(ctx, { ...base, hud: { health: 95, maxHealth: 100 } },
        camera, 390, 700, 3, true), false);
    assert.deepEqual(calls, []);
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(arena, /drawRecoveryGuide\(ctx, snapshot, camera, width, height, visualSeconds, state\.reducedMotion\.matches\)/);
});

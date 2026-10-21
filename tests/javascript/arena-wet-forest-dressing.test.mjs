import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWetForestDressingPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-dressing.js';

const props = [{ id: 1, kind: 'pine', x: .21, y: .36, radius: 12 },
    { id: 2, kind: 'fallen-log', x: .72, y: .66, radius: 39 }];

test('gritty forest decoration is deterministic and entirely independent of combat RNG', () => {
    const first = createWetForestDressingPlan(1441, props);
    const repeated = createWetForestDressingPlan(1441, props);
    const another = createWetForestDressingPlan(1442, props);
    assert.deepEqual(first, repeated);
    assert.notDeepEqual(first, another);
    assert.equal(first.roots.length, 2);
    assert.deepEqual(first.roots.map(r => r.kind), ['pine', 'fallen-log']);
    assert.ok(first.litter.length > 550 && first.litter.length < 1900);
});

test('changing physical prop positions only changes the grounded root marks', () => {
    const relocated = props.map(p => ({ ...p, x: p.x + .08 }));
    const before = createWetForestDressingPlan(1441, props);
    const after = createWetForestDressingPlan(1441, relocated);
    assert.deepEqual(before.litter, after.litter);
    assert.notDeepEqual(before.roots, after.roots);
    assert.equal(after.roots[0].x, Math.round(relocated[0].x * 950 / 2) * 2);
});

test('the Wet Forest lab uses correct creature kinds and distance-driven sprites, not timer loops', () => {
    const lab = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaLab.razor', import.meta.url), 'utf8');
    assert.match(lab, /updateEnemyMotions\(state\.enemyMotion/);
    assert.match(lab, /enemyFacing\(state\.enemyMotion, mob\.id\)/);
    assert.match(lab, /drawWetForestActorContact\(ctx, mob\.x, mob\.y/);
    assert.match(page, /new LabMob\(1, 0,/);
    assert.match(page, /new LabMob\(2, 2,/);
    assert.doesNotMatch(lab, /Math\.floor\(state\.clock \* 6\) % 4/);
});

test('ground dressing is baked, contact detail remains below actors, and no fake collision is created', () => {
    const renderer = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    const dressing = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-wet-forest-dressing.js', import.meta.url), 'utf8');
    assert.match(renderer, /if \(plan\.story\.wetForest\) drawWetForestDressing\(ctx, plan\.story, plan\.forestProps/);
    assert.match(dressing, /Baked ground texture is deterministic/);
    assert.doesNotMatch(dressing, /RestrictMovement|DamagePropsInRadius|TryDamageProp|SetPhase/);
});

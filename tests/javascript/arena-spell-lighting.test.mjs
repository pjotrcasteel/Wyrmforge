import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpellLights, sampleSpellLight, drawSpellLightSpill, spellLightProfile, castLightEnvelope } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-lighting.js';

const cast = { x: 90, y: 90, angle: 0, spell: 1, rank: 2, progress: .2 };
const projectile = { x: 115, y: 90, spell: 1, rank: 2, radius: 6 };

test('light identities follow actual spell school and single frostfire synergy, not a generic glow', () => {
    assert.deepEqual(['arcane', 'fire', 'frost', 'storm'], [0, 1, 2, 3].map(spell => spellLightProfile(spell).family));
    const mixed = spellLightProfile(1, 0);
    assert.equal(mixed.family, 'frostfire');
    assert.notDeepEqual(mixed.center, spellLightProfile(1).center);
    assert.notDeepEqual(mixed.edge, spellLightProfile(2).edge);
});

test('actual cast projectile and impact world positions generate distinct lights, with earned Surge growing radius and intensity', () => {
    const snapshot = { castMotion: cast, projectiles: [projectile],
        elementalImpacts: [{ x: 190, y: 90, spell: 2, rank: 3, progress: .24 }] };
    const light = buildSpellLights(snapshot, 1, true);
    assert.equal(light.length, 3);
    assert.ok(light.some(x => x.type === 'cast' && x.x > 90));
    assert.ok(light.some(x => x.type === 'projectile' && x.x === 115));
    assert.ok(light.some(x => x.type === 'impact' && x.x === 190));
    const normal = buildSpellLights({ projectiles: [projectile] }, 1, true)[0];
    const surged = buildSpellLights({ projectiles: [{ ...projectile, surge: true }] }, 1, true)[0];
    assert.ok(surged.radius > normal.radius);
    assert.ok(surged.strength > normal.strength);
    assert.ok(sampleSpellLight([normal], 115, 90).intensity > (sampleSpellLight([normal], 200, 90)?.intensity ?? 0));
    assert.equal(sampleSpellLight([normal], 400, 400), null);
});

test('storm flickers, frost remains steady, and reduced motion freezes school variations', () => {
    const storm = { projectiles: [{ ...projectile, spell: 3 }] };
    const frost = { projectiles: [{ ...projectile, spell: 2 }] };
    assert.notEqual(buildSpellLights(storm, 0, false)[0].strength, buildSpellLights(storm, .06, false)[0].strength);
    assert.equal(buildSpellLights(frost, 0, false)[0].strength, buildSpellLights(frost, .06, false)[0].strength);
    assert.deepEqual(buildSpellLights(storm, 0, true), buildSpellLights(storm, .06, true));
});

test('mobile lighting is capped and culls lights outside the world-space camera', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ ...projectile, x: 200 + i * 11 }));
    const lights = buildSpellLights({ projectiles: many }, 3, true);
    assert.equal(lights.length, 6);
    const onlyVisible = buildSpellLights({ projectiles: many }, 3, true,
        { x: 90, y: 0, width: 30, height: 700 });
    assert.ok(onlyVisible.length < 6, 'Offscreen light sources do not exhaust the visible-source budget.');
    assert.ok(onlyVisible.every(light => light.x - light.radius <= 120));
    let count = 0;
    const ctx = {
        save() {}, restore() {},
        createRadialGradient() { return { addColorStop() {} }; },
        fillRect() { count++; },
    };
    const visible = drawSpellLightSpill(ctx, lights, { x: 0, y: 0, width: 390, height: 700 });
    assert.equal(visible, count);
    assert.ok(count < many.length);
    assert.equal(drawSpellLightSpill(ctx, lights, { x: 5000, y: 5000, width: 390, height: 700 }), 0);
    assert.equal(drawSpellLightSpill(ctx, [], { x: 0, y: 0, width: 390, height: 700 }), 0);
});

test('staff-tip light grows through windup, peaks on release, and fades through follow-through', () => {
    assert.ok(castLightEnvelope(.05) < castLightEnvelope(.24));
    assert.equal(castLightEnvelope(.32), 1);
    assert.ok(castLightEnvelope(.88) < castLightEnvelope(.5));
    const base = { spell: 1, rank: 3, x: 100, y: 100, angle: 0 };
    const winding = buildSpellLights({ castMotion: { ...base, progress: .1 } }, 0, true)[0];
    const released = buildSpellLights({ castMotion: { ...base, progress: .32 } }, 0, true)[0];
    const finishing = buildSpellLights({ castMotion: { ...base, progress: .9 } }, 0, true)[0];
    assert.ok(released.strength > winding.strength);
    assert.ok(released.strength > finishing.strength);
    assert.notEqual(winding.x, released.x, 'Light follows the actual authored staff grip.');
});

test('boss windup/fire and impact lights remain finite and recover safely from missing presentation fields',()=>{
    const dragon={school:1,x:100,y:100,directionX:1,directionY:0,action:'breath',actionPhase:'windup',actionProgress:.5,flightStage:'ground'};
    for(const actionPhase of ['windup','strike']){
        const lights=buildSpellLights({dragon:{...dragon,actionPhase},ashfangEffects:[{kind:'meteor',x:170,y:120,radius:45,progress:.05}]});
        assert.equal(lights.length,2);assert(lights.every(l=>Number.isFinite(l.strength)&&Number.isFinite(l.radius)));
        assert(lights.some(l=>l.type==='boss-fire'&&l.strength>=0&&l.strength<=.32));
    }
    const partial=buildSpellLights({dragon:{...dragon,actionProgress:undefined,directionX:undefined}});
    assert(partial.every(l=>Number.isFinite(l.x)&&Number.isFinite(l.strength)));
});

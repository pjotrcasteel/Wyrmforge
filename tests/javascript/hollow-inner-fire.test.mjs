import test from 'node:test';
import assert from 'node:assert/strict';
import { hollowAttackFireEnvelope, hollowFireEmitters, hollowFireCanvasLights,
    HOLLOW_FIRE_COLOR, HOLLOW_FIRE_MAX_LIGHTS } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-inner-fire.js';
import { withHollowFractureLightingFrame } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-fracture.js';
import { validateSnapshot, selectLights } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const enemy = (entityId, values = {}) => ({
    kind: 0, entityId, x: entityId * 30, y: 200, radius: 11, healthRatio: 1, opacity: 1, ...values,
});
const state = (...poses) => ({
    entities: new Map(poses.map((pose, index) => [index + 1,
        { attackAt: null, age: .3, clip: 'walk', ...pose }])),
});

function gpuFrame(mode='night') {
    return {
        version: 1, time: 5,
        lights: [],
        objects: [],materials: [],
        environment: { ambient: mode === 'zero' ? 0 : .012,
            emission: mode !== 'zero', color: '#808080', exposure: 1 },
    };
}

test('actual Hollowed body is a dim internal fire source through the ONE lighting engine', () => {
    const output = hollowFireEmitters([enemy(1)], state(), 5, true);
    assert.equal(output.length, 1);
    const e = output[0];
    assert.equal(e.id, 'hollow-inner-fire:1');
    assert.equal(e.ownerId, 'hollowed:1');
    assert.equal(e.type, 'point');
    assert.equal(e.color, HOLLOW_FIRE_COLOR);
    assert.equal(e.enabled, true);
    assert.equal(e.castsShadow, false);
    assert.equal(e.priority, 1);
    assert.ok(e.intensity > 0 && e.intensity <= .10);
    assert.ok(e.range >= 26 && e.range <= 150);
    const validated = validateSnapshot(withHollowFractureLightingFrame(gpuFrame(), output));
    assert.equal(selectLights(validated).length, 1);
    assert.equal(validated.lights[0].id, e.id);
});

test('source-authored attack produces a stronger fiery burst then falls back to its original ember', () => {
    const durations = [.05, .37, .67, 1.26];
    const envelope = durations.map(age => hollowAttackFireEnvelope({ clip:'attack', age, attackAt: 0 }));
    assert.ok(envelope[0] < envelope[1]);
    assert.equal(envelope[1], 1);
    assert.ok(envelope[2] >= envelope[3]);
    assert.equal(hollowAttackFireEnvelope({ clip:'walk', age:.37, attackAt:0 }), 0);
    assert.equal(hollowAttackFireEnvelope({ clip:'attack', age:2, attackAt:0 }), 0);
    const idle = hollowFireEmitters([enemy(1)], state(), 5, true)[0];
    const attack = hollowFireEmitters([enemy(1)], state({clip:'attack', age:.37, attackAt:0}), 5, true)[0];
    assert.equal(attack.id, idle.id, 'Attack increases the same emitter, never adds a second lighting system.');
    assert.ok(attack.intensity > idle.intensity * 4);
    assert.ok(attack.range > idle.range);
    assert.equal(attack.priority, 3);
    assert.ok(attack.intensity <= .60);
});

test('frozen bodies dim, and all fire motion is deterministic with reduced motion enabled', () => {
    const bodies=[enemy(1,{frozen:true}),enemy(2)];
    const ps=state({clip:'attack',age:.37,attackAt:0},{clip:'walk'});
    const a=hollowFireEmitters(bodies,ps,5,true),b=hollowFireEmitters(bodies,ps,8,true);
    assert.deepEqual(a,b);
    assert.ok(a[0].intensity > a[1].intensity, 'Active attack has visual priority even when frozen.');
    const c=hollowFireEmitters(bodies,ps,5,false);
    assert.ok(c[0].intensity <= .60);
});

test('only living, actual Hollowed produce light; dead enemies and Ashlings never do', () => {
    const ps=state({},{},{},{},{},{});
    const bodies=[enemy(1,{healthRatio:0}),enemy(2,{opacity:0}),
        enemy(3,{kind:2}),enemy(4,{x:NaN}),enemy(5,{radius:0}),enemy(6)];
    const sources=hollowFireEmitters(bodies,ps,6,true);
    assert.deepEqual(sources.map(x=>x.id),['hollow-inner-fire:6']);
    assert.deepEqual(hollowFireEmitters(bodies,{entities:new Map()},6),[]);
    assert.deepEqual(hollowFireEmitters(bodies,ps,NaN),[]);
});

test('large hordes stay within mobile GPU budget and do not illuminate offscreen actors', () => {
    const bodies=Array.from({length:22},(_,i)=>enemy(i+1));
    const poses=state(...bodies.map(()=>({})));
    const sources=hollowFireEmitters(bodies,poses,1,true);
    assert.equal(sources.length,HOLLOW_FIRE_MAX_LIGHTS);
    assert.equal(new Set(sources.map(x=>x.id)).size,sources.length);
    assert.deepEqual(hollowFireEmitters(bodies,poses,1,true,{x:5,y:160,width:30,height:100})
        .map(x=>x.id),['hollow-inner-fire:1','hollow-inner-fire:2']);
});

test('zero-light diagnostics stay BLACK in GPU and legacy Canvas compatibility view', () => {
    const zero=gpuFrame('zero');
    const lights=hollowFireEmitters([enemy(1)],state(),1,true);
    assert.strictEqual(withHollowFractureLightingFrame(zero,lights),zero);
    assert.deepEqual(hollowFireCanvasLights(lights,zero),[]);
    const live=gpuFrame();
    const canvas=hollowFireCanvasLights(lights,live);
    assert.equal(canvas.length,1);
    assert.equal(canvas[0].family,'fire');
    assert.equal(canvas[0].strength,lights[0].intensity);
    assert.equal(canvas[0].radius,lights[0].range);
    assert.deepEqual(hollowFireCanvasLights(lights,null),[]);
    assert.deepEqual(hollowFireCanvasLights([],live),[]);
});

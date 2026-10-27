import test from 'node:test';
import assert from 'node:assert/strict';
import { huntLightFrame } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

test('Hunt lights track camera with the same world scale and handedness as receivers', () => {
    const frame = { version: 1, time: 2, environment: { ambient: 0 }, lights: [{
        id: 'source', position: [144, 240, 24], direction: [1, 2, -1], range: 144,
        intensity: 1, enabled: true, castsShadow: true,
    }] };
    const original = structuredClone(frame);
    const projected = huntLightFrame(frame, { x: 48, y: 96 });
    assert.deepEqual(projected.lights[0].position, [2, -3 * Math.SQRT2, .5]);
    assert.deepEqual(projected.lights[0].direction, [1, -2 * Math.SQRT2, -1].map(v => v / Math.sqrt(10)));
    assert.equal(projected.lights[0].range, 3);
    assert.equal(projected.lights[0].intensity, 1);
    assert.deepEqual(frame, original);
    assert.equal(projected.environment.ambient, 0);
    assert.deepEqual(huntLightFrame({ ...frame, lights: [] }, { x: 0, y: 0 }).lights, []);
});

test('authored sprite foot anchor stays on the ground and its billboard faces the Hunt camera', async () => {
    const { huntActorGeometry } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const geometry = huntActorGeometry();
    const normal = new T.Vector3().fromBufferAttribute(geometry.attributes.normal, 0);
    const toward = new T.Vector3(0, -1, 1).normalize();
    assert.ok(normal.dot(toward) > .99999);
    const anchor = new T.Vector3(0, -.25, 0).add(new T.Vector3(0, .25, 0));
    anchor.applyAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 4);
    assert.ok(anchor.length() < 1e-8);
    const top = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
    const bottom = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 2);
    const up = new T.Vector3(0, 1, 1).normalize();
    assert.ok(Math.abs(top.clone().sub(bottom).dot(up) - 1) < 1e-6,
        'An already projected sprite must retain its full apparent height.');
    assert.ok(top.z > 0, 'Standing cutout geometry must rise above ground to cast a directional shadow.');
    geometry.dispose();
});

test('same-depth walls keep distinct stable GPU IDs and crop their own footprints', async () => {
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const left = { kind: 'masonry', depth: 325, width: 1000, height: 1000,
        barrier: { kind: 'ruin', x: 0, y: .3, width: .38, height: .025 } };
    const right = { ...left, barrier: { ...left.barrier, x: .62 } };
    const a = huntLayerCapture(left, { x: 500, y: 800 });
    const b = huntLayerCapture(right, { x: 500, y: 800 });
    assert.notEqual(a.id, b.id, 'Shared depth is not a unique material identity.');
    assert.deepEqual(a, huntLayerCapture(left, { x: 10, y: 20 }));
    assert.ok(a.x <= 0 && a.x + a.size >= 380);
    assert.ok(a.y <= 300 && a.y + a.size >= 325);
    assert.ok(b.x <= 620 && b.x + b.size >= 1000);
});

test('prop and dead-boss GPU resources stay at their own world positions', async () => {
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const player = { x: 20, y: 30 };
    const prop = huntLayerCapture({ kind: 'masonry', width: 1000, height: 1500,
        prop: { id: 7, x: .8, y: .6, radius: 16 } }, player);
    assert.equal(prop.id, 'hunt-prop:7');
    assert.equal(prop.x + prop.size / 2, 800);
    assert.equal(prop.y + prop.size * .75, 900);
    const death = huntLayerCapture({ kind: 'dragonDeath', depth: 600 }, player, { id: 9, x: 700, y: 600, radius: 60 });
    assert.equal(death.id, 'hunt-dragonDeath:9');
    assert.equal(death.x + death.size / 2, 700);
    assert.equal(death.y + death.size * .75, 600);
});


test('Generic directional emitters preserve orientation and unit length across camera movement', () => {
    for (const direction of [[1,0,0],[0,1,0],[0,0,-1],[.3,.4,-.5],[0,0,0]]) {
        const frame={ lights:[{id:'arbitrary-emitter',position:[10,20,30],direction,range:120,intensity:2,expiresAt:4}] };
        const a=huntLightFrame(frame,{x:0,y:0}).lights[0];
        const b=huntLightFrame(frame,{x:300,y:-200}).lights[0];
        assert.deepEqual(a.direction,b.direction);
        assert.ok(Math.abs(Math.hypot(...a.direction)-(Math.hypot(...direction)>0?1:0))<1e-12);
        assert.equal(a.expiresAt,4);
        assert.equal(a.id,'arbitrary-emitter');
    }
});


test('Offscreen sources cannot consume the budget needed by visible explosions', async () => {
    const { selectLights } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js');
    const source=(id,x,type='point')=>({id,type,position:[x,100,24],direction:[0,0,-1],range:80,intensity:1,enabled:true,priority:0,castsShadow:false});
    const frame={time:0,lights:[...Array.from({length:12},(_,i)=>source('a-distant-'+i,2000+i)),source('z-explosion',200)]};
    const original=structuredClone(frame);
    const visible=huntLightFrame(frame,{x:0,y:0},{width:390,height:844});
    assert.deepEqual(selectLights(visible,6,8).map(l=>l.id),['z-explosion']);
    assert.deepEqual(frame,original);
    frame.lights=[source('spill',-79),source('outside',-81),source('sun',2000,'directional')];
    assert.deepEqual(huntLightFrame(frame,{x:0,y:0},{width:390,height:844}).lights.map(l=>l.id),['spill','sun']);
    assert.deepEqual(huntLightFrame(frame,{x:1900,y:0},{width:390,height:844}).lights.map(l=>l.id),['sun']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { HOLLOW_RUN, sampleHollowRun }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-motion.js';
import { readFileSync } from 'node:fs';

const profile=JSON.parse(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/animation-profile.json',import.meta.url)));
const pose=()=>({age:0,distance:0,visualDistance:0,runSpeed:null,lastSampleAge:null,lastMove:-1});

test('run stride maps C# 52 units/s to the no-cape 25fps, 16 pose authoring cadence',()=>{
    assert.equal(profile.locomotion.frames,HOLLOW_RUN.frames);
    assert.equal(profile.locomotion.stride,HOLLOW_RUN.stride);
    assert.equal(HOLLOW_RUN.referenceSpeed/HOLLOW_RUN.stride*HOLLOW_RUN.frames,HOLLOW_RUN.sourceFps);
});

test('prediction bridges repeated renderer frames without creating gameplay movement',()=>{
    const p=pose();
    p.age=.05;
    const first=sampleHollowRun(p,2.6,.05,true);
    assert.ok(first.moving);
    assert.ok(first.distance>0);
    const authoritative=p.distance;
    const before=p.visualDistance;
    for(let i=0;i<3;i++){
        p.age+=1/60;
        sampleHollowRun(p,0,1/60,true);
    }
    assert.equal(p.distance,authoritative);
    assert.ok(p.visualDistance>before,'smooth playback continues between simulation samples');
    assert.ok(p.visualDistance<=authoritative+p.runSpeed*HOLLOW_RUN.predictionSeconds+1e-8,
        'visual prediction cannot run arbitrarily ahead of the authoritative motion');
});

test('one second of base-speed C# displacement yields approximately 25 authored frames, irrespective of render Hz',()=>{
    for(const hz of [30,60,120]){
        const p=pose(),renderStep=1/hz;
        let previousSample=0;
        for(let i=1;i<=hz;i++){
            const t=i*renderStep;
            p.age=t;
            const tick=Math.floor(t/.05+1e-6);
            const distance=tick>previousSample?(tick-previousSample)*52*.05:0;
            if(tick>previousSample)previousSample=tick;
            sampleHollowRun(p,distance,renderStep,true);
        }
        const frames=p.visualDistance/HOLLOW_RUN.stride*16;
        assert.ok(frames>23&&frames<28,`render ${hz}Hz produced ${frames} frames`);
        assert.ok(Math.abs(p.distance-52)<.0001);
    }
});

test('paused/frozen and stale snapshots do not invent perpetual movement',()=>{
    const p=pose();p.age=.05;sampleHollowRun(p,2.6,.05,true);
    const before=p.visualDistance;
    for(let i=0;i<10;i++)sampleHollowRun(p,0,.05,false);
    assert.equal(p.visualDistance,before);
    p.age=.4;
    const stopped=sampleHollowRun(p,0,.05,true);
    assert.equal(stopped.moving,false);
    assert.equal(stopped.distance,0);
});

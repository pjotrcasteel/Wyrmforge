import test from 'node:test';
import assert from 'node:assert/strict';
import {replayUnifiedClaw} from '../../tools/animation/replay_unified_claw.mjs';

const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const directions=['E','SE','S','SW','W','NW','N','NE'];
const sourceSample={contacts:[{id:'support',x:0,y:0}],com:[0,0],balance:'supported'};
function fixture(sourceTravel=-.1){
    const velocity=Object.fromEntries(directions.map(d=>[d,{x:sourceTravel,y:0}]));
    return {schemaVersion:2,coordinateSpace:'actor-xy-ground-z-up',unitsPerPixel:1,maxRootOffset:1,
        rig:{bones:[{id:'root',length:1,rest:identity},{id:'limb',parent:'root',length:1,rest:identity}],
            semantics:{root:'root'},contacts:[{id:'support',bone:'limb',surface:'foot'}]},
        facing:{directions,transition:'row'},
        locomotion:{clip:'walk',frames:4,fps:4,stride:4,samples:Array(4).fill(sourceSample),stanceVelocityByDirection:velocity},
        actions:{attack:{clip:'attack-travel',frames:12,fps:6,commitUntil:1,mode:'fullBody',priority:10,
            samples:Array(12).fill(sourceSample),
            poseGrid:{phaseFrames:4,actionFrames:3,order:'action-major',phaseSampling:'nearest',actionSampling:'nearest',
                travel:'facing-projection',stanceVelocityByDirection:velocity}}}};
}
test('moving claw replay spans all eight headings, 15–120Hz, four gait phases and three real motion paths',()=>{
    const r=replayUnifiedClaw(fixture());
    assert.equal(r.samples,384);
    assert.equal(r.sourceClawGatePassed,true);
    assert.equal(r.runtimeAccepted,false);
    assert.deepEqual(new Set(r.results.map(x=>x.path)),new Set(['forward','lateral','crossing']));
    assert.ok(r.results.every(x=>x.completed&&x.committedFacing&&x.attackSamples>0));
});
test('moving lateral root travel is measured and rejects unsupported source-ground contact',()=>{
    const r=replayUnifiedClaw(fixture(-30),{rates:[15,60],entryPhases:[0],
        paths:['lateral','crossing']});
    assert.equal(r.sourceClawGatePassed,false);
    assert.ok(r.results.some(x=>x.peakNativeSlip>1&&x.correctionSaturated));
    assert.equal(r.runtimeAccepted,false);
});
test('claw replay refuses missing pose grids or invalid render rates and motion paths',()=>{
    const p=fixture();delete p.actions.attack.poseGrid;
    assert.throws(()=>replayUnifiedClaw(p),TypeError);
    assert.throws(()=>replayUnifiedClaw(fixture(),{rates:[0]}),RangeError);
    assert.throws(()=>replayUnifiedClaw(fixture(),{rates:[]}),RangeError);
    assert.throws(()=>replayUnifiedClaw(fixture(),{entryPhases:[]}),RangeError);
    assert.throws(()=>replayUnifiedClaw(fixture(),{entryPhases:[1]}),RangeError);
    assert.throws(()=>replayUnifiedClaw(fixture(),{paths:['teleport']}),RangeError);
});

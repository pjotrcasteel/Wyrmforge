import test from 'node:test';
import assert from 'node:assert/strict';
import {replayUnifiedTurns} from '../../tools/animation/replay_unified_baked.mjs';

const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const directions=['E','SE','S','SW','W','NW','N','NE'];
const sourceSample=x=>({contacts:[{id:'support',x,y:0}],com:[0,0],balance:'supported'});
function fixture(pivotContact=0){
    const rest=sourceSample(0),bad=sourceSample(pivotContact);
    return {schemaVersion:2,coordinateSpace:'actor-xy-ground-z-up',unitsPerPixel:1,maxRootOffset:1,
        rig:{bones:[{id:'root',length:1,rest:identity},{id:'limb',parent:'root',length:1,rest:identity}],
            semantics:{root:'root'},contacts:[{id:'support',bone:'limb',surface:'foot'}]},
        facing:{directions,transition:'source-pivot'},
        locomotion:{clip:'walk',frames:4,fps:4,stride:4,samples:Array(4).fill(rest),
            stanceVelocityByDirection:Object.fromEntries(directions.map(d=>[d,{x:-0.1,y:0}]))},
        pivots:{
            positive:{clip:'pivot-right',frames:4,fps:8,facingStep:1,samples:Array(4).fill(bad)},
            negative:{clip:'pivot-left',frames:4,fps:8,facingStep:-1,samples:Array(4).fill(rest)}
        },actions:{}};
}

test('real controller replay samples all entry phases, facings and 15–120Hz without claiming rendered approval',()=>{
    const result=replayUnifiedTurns(fixture());
    assert.equal(result.samples,8*2*4*4);
    assert.equal(result.runtimeAccepted,false);
    assert.equal(result.sourceRuntimeGatePassed,true);
    assert.ok(result.results.every(s=>s.completed&&s.turnFrames>0&&s.peakNativeSlip<=1));
    assert.deepEqual(new Set(result.results.map(s=>s.entryPhase)),new Set([0,.25,.5,.75]));
});

test('one actual pivot with displaced source contact fails across gait phase, not hidden by root correction',()=>{
    const result=replayUnifiedTurns(fixture(4),{rates:[15,60],
        targets:[{from:'E',to:'SE'}]});
    assert.equal(result.sourceRuntimeGatePassed,false);
    assert.ok(result.results.every(s=>s.peakNativeSlip>1&&s.correctionSaturated));
    assert.equal(result.runtimeAccepted,false);
});

test('replay requires both authored pivot directions and rejects bad sampling',()=>{
    const noPivot=fixture();delete noPivot.pivots.negative;
    assert.throws(()=>replayUnifiedTurns(noPivot),TypeError);
    assert.throws(()=>replayUnifiedTurns(fixture(),{rates:[0]}),RangeError);
    assert.throws(()=>replayUnifiedTurns(fixture(),{entryPhases:[1]}),RangeError);
});

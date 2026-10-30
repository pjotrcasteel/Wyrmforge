import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseHuntContact} from '../../tools/animation/diagnose_hunt_contact.mjs';

const sample=(time,clip,slip,travel=0)=>({
    simulationTimeSeconds:time,
    hollow:{entities:[{entityId:5,observedDistance:travel,
        foundation:{clip,maxNativeMarkerSlip:slip}}]}
});

test('actual C# native clip diagnosis retains exact per-clip failures and movement evidence',()=>{
    const result=diagnoseHuntContact([
        sample(0,'walk',.2),
        sample(.1,'walk',1.3,3),
        sample(.2,'attack-travel',7,6),
        sample(.3,'attack-travel',.5,9),
        sample(.4,'pivot',101,12)]);
    assert.equal(result.totalSamples,5);
    assert.equal(result.violations,3);
    assert.equal(result.allClipsWithinNativePixel,false);
    assert.equal(result.completedAcceptance,false);
    assert.deepEqual(result.clips.map(c=>[c.clip,c.samples,c.violations,c.worstNativeMarkerSlip]),[
        ['pivot',1,1,101],['attack-travel',2,1,7],['walk',2,1,1.3]]);
    assert.equal(result.clips.find(c=>c.clip==='pivot').cumulativeObservedTravel,3);
    assert.equal(result.clips.find(c=>c.clip==='attack-travel').movingSamples,2);
    assert.equal(result.clips.find(c=>c.clip==='walk').firstViolationSeconds,.1);
});

test('an empty or malformed contact sample never yields a false green',()=>{
    assert.throws(()=>diagnoseHuntContact([]),TypeError);
    assert.throws(()=>diagnoseHuntContact([{simulationTimeSeconds:1,hollow:{entities:[]}}]),TypeError);
    assert.throws(()=>diagnoseHuntContact([sample(0,'walk',0)],0),TypeError);
    assert.throws(()=>diagnoseHuntContact([sample(0,'walk',0),{hollow:{entities:[]}}]),TypeError);
    assert.throws(()=>diagnoseHuntContact([{simulationTimeSeconds:0,hollow:{entities:[{
        entityId:null,foundation:{clip:'walk',maxNativeMarkerSlip:0}}]}}]),TypeError);
});

test('one-pixel contact requirement is inclusive; browser preview proof remains unapproved',()=>{
    const r=diagnoseHuntContact([sample(0,'walk',1)]);
    assert.equal(r.allClipsWithinNativePixel,true);
    assert.equal(r.violations,0);
    assert.equal(r.physicalDevice,false);
    assert.equal(r.sourceLitReviewOnly,true);
    assert.equal(r.completedAcceptance,false);
});

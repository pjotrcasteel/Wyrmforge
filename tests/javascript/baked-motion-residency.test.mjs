import test from 'node:test';
import assert from 'node:assert/strict';
import {planBakedMotionResidency} from '../../tools/animation/plan_baked_motion_residency.mjs';

const directions=['E','SE','S','SW','W','NW','N','NE'];
function fixture(crop=[40,35,65,70]){
    const clip=(frames)=>({frames,cell:96,columns:Math.min(frames,32),crop,anchor:[48,72],worldSize:93});
    return {schemaVersion:2,directions,clips:{
        walk:clip(16),'attack-travel':clip(128),pivot:clip(8),'pivot-negative':clip(8)
    }};
}
test('real three-map projected memory never overrides 64MiB limit or asserts approval',()=>{
    const r=planBakedMotionResidency(fixture());
    assert.equal(r.runtimeAccepted,false);
    assert.equal(r.budgetBytes,64*1024*1024);
    assert.equal(r.options.length,10);
    assert.deepEqual(new Set(r.options.map(x=>x.actionVariants)),new Set([3]));
    assert.ok(r.originalPlusOneLateralBytes>r.originalDecodedBytes);
    assert.ok(r.options.every(x=>!x.actualSourceClipsExist&&!x.contactAndVisualAccepted));
    assert.ok(r.options.every(x=>x.withinMemoryLimit===(x.remainingBytes>=0)));
    assert.ok(r.options.every(x=>x.proposedTotalDecodedBytes===r.nonActionDecodedBytes+3*x.proposedClawBytes));
});
test('more authored pose samples monotonically increase projected same-crop residency',()=>{
    const r=planBakedMotionResidency(fixture());
    for(const phase of [8,16]){
        const options=r.options.filter(x=>x.gaitPhases===phase);
        for(let i=1;i<options.length;i++){
            assert.ok(options[i].proposedTotalDecodedBytes>=options[i-1].proposedTotalDecodedBytes);
        }
    }
});
test('optimistic source-crop estimate does not hide a truly oversized texture library',()=>{
    const r=planBakedMotionResidency(fixture([0,0,96,96]));
    assert.equal(r.originalWithinBudget,false);
    assert.equal(r.originalPlusOneLateralFits,false);
    assert.ok(r.options.some(x=>!x.withinMemoryLimit));
});
test('planner rejects absent real atlas or malformed measured source crop',()=>{
    assert.throws(()=>planBakedMotionResidency(null),TypeError);
    const broken=fixture();delete broken.clips['attack-travel'];
    assert.throws(()=>planBakedMotionResidency(broken),TypeError);
    const invalid=fixture();invalid.clips['attack-travel'].crop=[0,0,0,0];
    assert.throws(()=>planBakedMotionResidency(invalid),RangeError);
});

test('native measured 68x63 crop can accommodate a five-stage layout only as an UNAPPROVED memory study',()=>{
    const r=planBakedMotionResidency(fixture([14,21,82,84]));
    const five=r.options.find(x=>x.gaitPhases===8&&x.actionStages===5);
    const six=r.options.find(x=>x.gaitPhases===8&&x.actionStages===6);
    assert.equal(five.framesPerDirection,40);
    assert.equal(five.proposedColumns*five.proposedRowsPerDirection,40);
    assert.equal(five.proposedTotalDecodedBytes,62512128);
    assert.equal(five.withinMemoryLimit,true);
    assert.equal(six.withinMemoryLimit,false);
    assert.equal(r.additionalLateralWalkAndTransitionCostIncluded,false);
    assert.equal(five.actualSourceClipsExist,false);
});

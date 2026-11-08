import test from 'node:test';
import assert from 'node:assert/strict';
import { Bitmap } from '../../tools/art/lib/painter.mjs';
import { createDegradedMasonrySurface, buildDegradedLightingMaps,
    DEGRADATION_STATES, DEGRADATION_STATE_ORDER } from '../../tools/art/prototypes/terrain-hard-degradation.mjs';
import { classifyStoneInstances, blendWorldPatch, makeBoundaryMask, cutReviewInto32 } from '../../tools/art/prototypes/terrain-material-grammar.mjs';

const TYPES=['flagstone','cobble','brick'];

for (const type of TYPES) {
    test(`${type}: all five degradation states have monotonic complete-stone loss and stable original geometry`, () => {
        let previousMissing=-1, previousSource=null;
        for(const state of DEGRADATION_STATE_ORDER){
            const surface=createDegradedMasonrySurface(type,{seed:1781,state});
            assert.equal(surface.stoneIds.length,256*256);
            assert.ok(surface.stats.total>=20);
            assert.ok(surface.stats.missing>=previousMissing,`${type}/${state}: missing stones must not reappear`);
            assert.ok(surface.stats.missing+surface.stats.fractured+surface.stats.retained===surface.stats.total);
            assert.ok(surface.stats.removedPixels>=0);
            assert.ok(surface.height.every(h=>h>=0&&h<256));
            if(previousSource)assert.deepEqual(surface.originalIds,previousSource,`${type}: original topology changed between states`);
            previousSource=surface.originalIds;
            previousMissing=surface.stats.missing;
            const duplicate=createDegradedMasonrySurface(type,{seed:1781,state});
            assert.deepEqual(surface.albedo.data,duplicate.albedo.data);
            assert.deepEqual(surface.stoneIds,duplicate.stoneIds);
        }
    });
    test(`${type}: broken / collapsed retain organic partial pieces without cutting tiles`, () => {
        for(const state of ['broken','collapsed','reclaimed']) {
            const surface=createDegradedMasonrySurface(type,{seed:1781,state});
            assert.ok(surface.stats.missing>0,`${type}/${state} should have missing stones`);
            assert.ok(surface.stats.fractured>0,`${type}/${state} should have half-broken stones`);
            assert.ok(surface.stats.fracturePixels>20);
            const topology=classifyStoneInstances(surface.albedo,surface.stoneIds);
            assert.ok(topology.components.length>0);
            const mask=makeBoundaryMask('left',1781);
            const soil=new Bitmap(256,256);
            soil.rect(0,0,256,256,'#2e2b23');
            const edge=blendWorldPatch(surface.albedo,soil,mask,{policy:'whole-stone-erosion',stoneInstances:topology});
            for(const stone of topology.components) {
                const keep=stone.points.every(i=>mask[i]===1);
                for(const i of stone.points)assert.equal(edge.owner[i],Number(keep),`${type}/${state}: cut surviving stone`);
            }
        }
    });
    test(`${type}: degraded lighting maps reproduce pixel-perfect across 32px cells`, () => {
        const surface=createDegradedMasonrySurface(type,{seed:391,state:'collapsed'});
        const maps=buildDegradedLightingMaps(surface);
        assert.ok(new Set(surface.height).size>4);
        assert.ok(new Set(surface.roughness).size>4);
        assert.ok(new Set(maps.normal.data.filter((_,i)=>i%4===0)).size>1);
        for(const map of [maps.albedo,maps.normal,maps.roughnessMap]){
            const reassembled=new Bitmap(256,256);
            for(const {col,row,tile} of cutReviewInto32(map)) reassembled.blit(tile,col*32,row*32);
            assert.deepEqual(reassembled.data,map.data);
        }
        assert.ok(maps.roughnessMap.data.every((v,i)=>i%4!==3||v===255));
    });
}

test('generic degradation profiles preserve meaningful progression and validation', () => {
    assert.deepEqual(Object.keys(DEGRADATION_STATES),['intact','worn','broken','collapsed','reclaimed']);
    let previous=0;
    for(const state of DEGRADATION_STATE_ORDER){
        assert.ok(DEGRADATION_STATES[state].missing>=previous);
        previous=DEGRADATION_STATES[state].missing;
    }
    assert.throws(()=>createDegradedMasonrySurface('granite'),RangeError);
    assert.throws(()=>createDegradedMasonrySurface('brick',{state:'magic'}),RangeError);
});

import { createDegradedBoundaryReview } from '../../tools/art/prototypes/terrain-hard-degradation.mjs';
test('reclaimed edge respects whole-survivor stone removal across all three generic hard/soft pairs', () => {
    for (const [type,soft] of [['flagstone','grass'],['cobble','soil'],['brick','mud']]) {
        const review=createDegradedBoundaryReview({type,soft,state:'reclaimed',seed:91,direction:'top'});
        assert.equal(review.maps.albedo.width,256);
        assert.deepEqual(review.maps.albedo.data,review.albedo.data);
        assert.ok(review.topology.components.length>10);
        for (const stone of review.topology.components){
            const keep=stone.points.every(i=>review.mask[i]===1);
            for(const i of stone.points) assert.equal(review.owner[i], Number(keep),`${type} sliced stone ${stone.id}`);
        }
        assert.notDeepEqual(review.maps.normal.data,review.maps.albedo.data);
    }
});

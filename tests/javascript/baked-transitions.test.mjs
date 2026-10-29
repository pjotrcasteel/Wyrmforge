import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditBakedTransitions} from '../../tools/animation/audit_baked_transitions.mjs';

const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/review/',import.meta.url);
const profile=name=>JSON.parse(readFileSync(new URL(`${name}/profile.json`,root),'utf8'));

test('nine-heading actual source must never be promoted without stop, pivot and claw content',()=>{
    const result=auditBakedTransitions(profile('animation-foundation-sprite-motion'));
    assert.equal(result.runtimeAccepted,false);
    assert.equal(result.contactPassed,false,'faster curves must retain the known one-native-pixel failure');
    assert.deepEqual(result.missingSource,{groundedStart:true,groundedStop:true,weightBearingTurn:true,movingClaw:true});
    assert.ok(result.results.some(r=>r.name==='stationary-turn'&&r.unsupportedTurnSamples>0));
    assert.ok(result.results.some(r=>r.name==='fast-curve-chase'&&r.maxNativeMarkerSlip>1));
    assert.ok(result.results.some(r=>r.name==='stop-restart'&&!r.stopFrame.authoringProvided));
    assert.ok(result.results.every(r=>Number.isFinite(r.maxNativeMarkerSlip)&&r.maxNativeMarkerSlip>=0));
});

test('compact stride remains separate, preserving independent transition gates',()=>{
    const result=auditBakedTransitions(profile('animation-foundation-sprite-compact-motion'),{rates:[30],speeds:[30]});
    assert.equal(result.runtimeAccepted,false);
    assert.equal(result.results.length,4);
    assert.equal(result.missingSource.groundedStop,true);
    assert.equal(result.missingSource.movingClaw,true);
});

test('a walk-only material probe cannot pass a full animation lifecycle',()=>{
    const result=auditBakedTransitions(profile('animation-foundation-sprite-materials'),{rates:[15],speeds:[30]});
    assert.equal(result.runtimeAccepted,false);
    assert.equal(result.results.length,4);
    assert.equal(result.missingSource.weightBearingTurn,true);
});

test('invalid sampling must fail before making acceptance claims',()=>{
    assert.throws(()=>auditBakedTransitions(profile('animation-foundation-sprite-motion'),{rates:[0],speeds:[30]}),RangeError);
    assert.throws(()=>auditBakedTransitions(profile('animation-foundation-sprite-motion'),{rates:[30],speeds:[Infinity]}),RangeError);
});

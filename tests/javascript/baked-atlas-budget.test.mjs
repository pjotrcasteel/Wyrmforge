import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditBakedAtlasBudget,DEFAULT_BAKED_TEXTURE_BUDGET} from '../../tools/animation/check_baked_atlas_budget.mjs';

const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/review/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(`${name}/manifest.json`,root),'utf8'));

test('nine source-authored headings leave only a measured margin for action materials',()=>{
    const report=auditBakedAtlasBudget(read('animation-foundation-sprite-motion'),{requiredMaps:['normal','emissive']});
    assert.equal(report.clips.length,9);
    assert.equal(report.decodedBytes,57480192); // 54.8174 MiB, source crop and eight views
    assert.equal(report.remainingBytes,DEFAULT_BAKED_TEXTURE_BUDGET-57480192);
    assert.equal(report.overBudget,false);
    assert.ok(report.clips.every(c=>c.textureCount===3));
});

test('the separately exported single-walk GPU material pack has no duplicate albedo charge',()=>{
    const manifest=read('animation-foundation-sprite-materials');
    const actual=auditBakedAtlasBudget(manifest);
    const planned=auditBakedAtlasBudget(manifest,{requiredMaps:['normal','emissive']});
    assert.equal(actual.decodedBytes,6094848);
    assert.equal(planned.decodedBytes,actual.decodedBytes);
    assert.equal(actual.clips[0].textureCount,3);
    assert.equal(manifest.decodedTextureBytes,actual.decodedBytes);
});

test('a hypothetical large whole-body claw cannot hide beyond the 64 MiB combined gate',()=>{
    const manifest=read('animation-foundation-sprite-motion');
    const walk=manifest.clips.walk;
    manifest.clips['hypothetical-128-frame-claw']={...walk,frames:128,columns:16};
    const report=auditBakedAtlasBudget(manifest,{requiredMaps:['normal','emissive']});
    assert.equal(report.overBudget,true);
    assert.ok(report.remainingBytes<0);
});

test('invalid source crops, malformed maps and incomplete facing sets fail before budget publication',()=>{
    const manifest=read('animation-foundation-sprite-walk');
    assert.throws(()=>auditBakedAtlasBudget(manifest,{requiredMaps:['metallic']}),TypeError);
    const badCrop=structuredClone(manifest);badCrop.clips.walk.crop=[0,0,999,96];
    assert.throws(()=>auditBakedAtlasBudget(badCrop),RangeError);
    const badViews=structuredClone(manifest);badViews.directions.pop();
    assert.throws(()=>auditBakedAtlasBudget(badViews),TypeError);
    assert.throws(()=>auditBakedAtlasBudget(manifest,{maxDecodedBytes:0}),TypeError);
});

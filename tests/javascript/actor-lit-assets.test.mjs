import test from 'node:test';
import assert from 'node:assert/strict';
import { litActorSample } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/actor-asset-contract.js';

const original = { directions: ['N','NE','E','SE','S','SW','W','NW'], clips: {
    walk: {image:'walk.png', frames:16, cell:96, anchor:[48,72], worldSize:93},
    attack: {image:'attack.png', frames:22, cell:128, anchor:[64,86], worldSize:108.8},
    death: {image:'death.png', frames:28, cell:128, anchor:[64,86], worldSize:108.8},
} };
const materials = { schemaVersion:1, actorId:'sample', directions:[...original.directions],
    material:{roughness:.91,metalness:0,specular:.12},clips:Object.fromEntries(
        Object.entries(original.clips).map(([name,clip])=>[name,{
            albedo:clip.image, normal:`${name}-normal.png`,depth:`${name}-depth.png`,
            caster:`${name}-caster.png`,emissive:`${name}-emissive.png`,
            frames:clip.frames,cell:clip.cell,anchor:[...clip.anchor],worldSize:clip.worldSize,
            castShadow:true,receiveShadow:true,shadowQuality:'planar-mask-only'
        }])) };
test('one UV sample synchronizes every map across all directions and every clip frame',()=>{
    for(const direction of original.directions)
        for(const [clip,meta] of Object.entries(original.clips))
            for(let frame=0;frame<meta.frames;frame++){
                const x=litActorSample(original,materials,{direction,clip,frame});
                assert.equal(x.clip,clip);
                assert.equal(x.frameIndex,frame);
                assert.equal(x.images.normal,`${clip}-normal.png`);
                assert.equal(x.images.caster,`${clip}-caster.png`);
                assert.equal(x.images.depth,`${clip}-depth.png`);
                assert.equal(x.images.emissive,`${clip}-emissive.png`);
                assert.deepEqual(x.frame.repeat,[1/meta.frames,1/8]);
                assert.equal(x.castShadow,true);
            }
});
test('walk attack death interruption never retains a stale normal/depth/caster atlas',()=>{
    const snapshots=['walk','attack','walk','attack','death','death'];
    for(const [index,clip] of snapshots.entries()){
        const sample=litActorSample(original,materials,{clip,direction:'S',frame:Math.min(index,original.clips[clip].frames-1)});
        for(const name of ['normal','depth','caster','emissive']) assert.ok(sample.images[name].startsWith(clip+'-'));
    }
});
test('reject missing maps, mismatched anchors, invalid direction or frame index',()=>{
    assert.throws(()=>litActorSample(original,materials,{clip:'walk',direction:'INVALID',frame:0}));
    assert.throws(()=>litActorSample(original,materials,{clip:'death',direction:'S',frame:28}));
    const corrupt=structuredClone(materials);
    corrupt.clips.attack.anchor=[0,0];
    assert.throws(()=>litActorSample(original,corrupt,{clip:'attack',direction:'S',frame:0}));
    const missing=structuredClone(materials);
    delete missing.clips.death.caster;
    assert.throws(()=>litActorSample(original,missing,{clip:'death',direction:'S',frame:0}));
});

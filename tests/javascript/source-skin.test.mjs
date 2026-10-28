import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSourceSkinSurface as validate,sampleSourceSkinSurface as sample,sourceSkinPoseMatrices as matrices,multiplySourceMatrices as multiply,invertSourceMatrix as invert} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/source-skin-pose.js';
import {decodeSourceSkinGeometry as decode} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/source-skin-assets.js';
import {solveSupportedSourcePose as repose} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js';
import {createSkinnedRenderable,applySourceSkinPose,validateSkinPose} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/source-skin.js';
import * as T from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js';
const data=()=>JSON.parse(readFileSync(new URL('../fixtures/animation/compact-source-skin.json',import.meta.url)));
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
test('compact source surfaces interpolate the complete rig and retain gait/claw endpoint identity',()=>{
 const s=validate(data()),copy=JSON.stringify(s);
 for(const phase of [0,.01,.17,.37,.5,.83,.999]){
  const walk=sample(s,{clip:'walk',gaitPhase:phase});
  for(const progress of [0,.13,.5,.83,1]){
   const pose=sample(s,{clip:'attack-travel',gaitPhase:phase,actionProgress:progress});
   for(const b of s.bones){
    const actual=pose.sourceBones[b.id];assert.ok(Math.abs(distance(actual.head,actual.tail)-b.length)<1e-5);
    if(progress===0||progress===1)assert.ok(distance(actual.head,walk.sourceBones[b.id].head)<1e-5);
   }
  }
 }
 assert.equal(JSON.stringify(s),copy);
 const q=sample(s,{clip:'walk',gaitPhase:-.17}),p=sample(s,{clip:'walk',gaitPhase:.83});for(const name of Object.keys(q.sourceBones))assert.ok(distance(q.sourceBones[name].head,p.sourceBones[name].head)<1e-12);
});
test('source quaternion sign does not change the interpolated skeleton or skin',()=>{
 const s=validate(data()),flipped=structuredClone(s);
 for(const c of Object.values(flipped.clips))for(const pose of c.poses)for(let i=0;i<pose.length;i+=10)for(let q=3;q<7;q++)pose[i+q]*=-1;
 for(const phase of [.13,.71]){
  const a=sample(s,{clip:'attack-travel',gaitPhase:phase,actionProgress:.37}),b=sample(flipped,{clip:'attack-travel',gaitPhase:phase,actionProgress:.37});
  for(const name of Object.keys(a.sourceBones))assert.ok(distance(a.sourceBones[name].head,b.sourceBones[name].head)<1e-12);
 }
});
test('source surface rejects malformed hierarchy, absent support, forged dimensions and singular matrices',()=>{
 for(const change of [s=>s.bones[1].parent=1,s=>s.bones[0].rest[0]=0,s=>s.contacts[0].end='absent',s=>s.contactCycles.pop(),s=>s.clips.walk.poses[0][3]=NaN,s=>s.clips['attack-travel'].poseGrid.phaseFrames=3,s=>s.massWeights.absent=1,s=>s.clips.walk.poses[0][7]=0]){
  const s=data();change(s);assert.throws(()=>validate(s));
 }
 const s=validate(data());assert.throws(()=>sample(s,{clip:'__proto__',gaitPhase:0}));assert.throws(()=>sample(s,{clip:'walk',gaitPhase:Infinity}));
});
test('corrected skin matrices preserve the real source bind roll and complete body translation',()=>{
 const s=validate(data()),base=sample(s,{clip:'walk',gaitPhase:0});
 const targets=Object.fromEntries(Object.entries(base.sourceContacts).map(([id,c])=>[id,{point:[...c.sourceContact],planted:c.planted}]));
 const posed=repose(base,targets,{massWeights:s.massWeights,rootBone:s.rootBone,...s.authoringEnvelope,minimumSupportMargin:s.minimumSupportMarginMetres}),m=matrices(s,base,posed);
 for(const [i,b] of s.bones.entries()){
  assert.ok(distance(Array.from(m.slice(i*16+12,i*16+15)),posed.sourceBones[b.id].head)<1e-6);
  const product=multiply(invert(b.rest),b.rest);for(let j=0;j<16;j++)assert.ok(Math.abs(product[j]-([0,5,10,15].includes(j)?1:0))<1e-10);
 }
});
function geometryFixture(){
 const s=validate(data()),attributes={},arrays={position:new Float32Array([0,0,0,1,0,0,0,1,0]),normal:new Float32Array([0,0,1,0,0,1,0,0,1]),uv:new Float32Array([0,0,1,0,0,1]),skinIndex:new Uint16Array(12),skinWeight:new Float32Array([.2,0,0,0,.2,0,0,0,.2,0,0,0]),skinIndex2:new Uint16Array([1,0,0,0,1,0,0,0,1,0,0,0]),skinWeight2:new Float32Array([.8,0,0,0,.8,0,0,0,.8,0,0,0]),sourceEmission:new Float32Array([0,1,.5]),index:new Uint32Array([0,1,2])};
 let offset=0;
 for(const [name,array] of Object.entries(arrays)){
  offset=Math.ceil(offset/4)*4;const itemSize=name==='position'||name==='normal'?3:name==='uv'?2:name.startsWith('skin')?4:1;
  attributes[name]={offset,bytes:array.byteLength,component:array instanceof Float32Array?'f':array instanceof Uint16Array?'H':'I',itemSize,count:array.length/itemSize};offset+=array.byteLength;
 }
 const buffer=new ArrayBuffer(offset);for(const [name,array] of Object.entries(arrays))new Uint8Array(buffer,attributes[name].offset,array.byteLength).set(new Uint8Array(array.buffer));
 const manifest={version:1,sourceSignature:s.sourceSignature,sourceBlendSha256:s.sourceBlendSha256,vertices:3,triangles:1,influenceSets:2,attributes};
 return {s,buffer,manifest};
}
test('source skin decoder preserves both influence sets and rejects partial, overlapping or unbound geometry',()=>{
 const {s,buffer,manifest}=geometryFixture(),a=decode(manifest,buffer,s);assert.equal(a.skinIndex2.array[0],1);assert.ok(Math.abs(a.skinWeight2.array[0]-.8)<1e-7);
 for(const change of [m=>m.sourceSignature='wrong',m=>m.attributes.normal.offset=0,m=>m.attributes.position.count=4,m=>m.attributes.index.bytes=8]){const m=structuredClone(manifest);change(m);assert.throws(()=>decode(m,buffer,s));}
 const invalid=buffer.slice(0);new Float32Array(invalid,manifest.attributes.skinWeight.offset,12)[0]=.8;assert.throws(()=>decode(manifest,invalid,s),/sum to one/);
 const missing=buffer.slice(0);new Uint16Array(missing,manifest.attributes.skinIndex2.offset,12)[0]=500;assert.throws(()=>decode(manifest,missing,s),/influence/);
});
test('shared GPU skin resources keep entity skeletons separate and patch lit/normal/caster shaders for eight weights',()=>{
 const {s,buffer,manifest}=geometryFixture(),a=decode(manifest,buffer,s),g=new T.BufferGeometry();
 for(const [name,item] of Object.entries(a))if(name==='index')g.setIndex(new T.BufferAttribute(item.array,1));else g.setAttribute(name,new T.BufferAttribute(item.array,item.itemSize));
 const binding={bones:s.bones,influenceSets:2,motionRadius:.42};
 const one=createSkinnedRenderable(T,g,new T.MeshPhysicalMaterial(),binding),two=createSkinnedRenderable(T,g,new T.MeshPhysicalMaterial(),binding);
 const posed=new Float32Array(s.bones.flatMap(b=>{const m=[...b.rest];m[12]+=1;return m;}));
 applySourceSkinPose(one,posed);one.mesh.updateMatrixWorld(true);one.skeleton.update();two.mesh.updateMatrixWorld(true);two.skeleton.update();
 assert.ok(Math.abs(one.skeleton.boneMatrices[12]-1)<1e-6);assert.ok(Math.abs(two.skeleton.boneMatrices[12])<1e-6);assert.notEqual(one.bones[0],two.bones[0]);
 for(const material of [one.mesh.material,one.mesh.customDepthMaterial,one.mesh.customDistanceMaterial]){
  const shader={vertexShader:'#include <begin_vertex>\n#include <skinbase_vertex>\n#include <skinnormal_vertex>\n#include <skinning_vertex>',fragmentShader:'#include <emissivemap_fragment>'};material.onBeforeCompile(shader,null);
  assert.match(shader.vertexShader,/skinWeight2\.w/);assert.match(shader.vertexShader,/boneMatW2 \* skinVertex/);
  if(material===one.mesh.material){assert.match(shader.vertexShader,/sourceEmissionFactor/);assert.match(shader.fragmentShader,/totalEmissiveRadiance \*= sourceEmissionFactor/);}
 }
 assert.throws(()=>validateSkinPose(binding,new Float32Array(16)),/Complete/);const bad=posed.slice();bad[0]=0;assert.throws(()=>applySourceSkinPose(one,bad),/invertible/);
 for(const r of [one,two]){r.mesh.material.dispose();r.mesh.customDepthMaterial.dispose();r.mesh.customDistanceMaterial.dispose();r.skeleton.dispose();}g.dispose();
});

test('inspection shader cache preserves the influence-set contract across different skinned content',async()=>{
 const {LightingEngine}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/engine.js');
 const engine=Object.create(LightingEngine.prototype);engine.debugView='normals';engine.inspectionObject='actor';
 const {s,buffer,manifest}=geometryFixture(),attributes=decode(manifest,buffer,s),keys=[];
 for(const sets of [2,3,4]){
  const g=new T.BufferGeometry();for(const [name,item] of Object.entries(attributes))if(name==='index')g.setIndex(new T.BufferAttribute(item.array,1));else g.setAttribute(name,new T.BufferAttribute(item.array,item.itemSize));
  for(let set=3;set<=sets;set++){g.setAttribute('skinIndex'+set,new T.BufferAttribute(new Uint16Array(manifest.vertices*4),4));g.setAttribute('skinWeight'+set,new T.BufferAttribute(new Float32Array(manifest.vertices*4),4));}
  const resource=createSkinnedRenderable(T,g,new T.MeshPhysicalMaterial(),{bones:s.bones,influenceSets:sets}),debug=engine.debugMaterial({id:'actor',mesh:resource.mesh});keys.push(debug.customProgramCacheKey());
  const shader={vertexShader:'#include <begin_vertex>\n#include <skinbase_vertex>\n#include <skinnormal_vertex>\n#include <skinning_vertex>',fragmentShader:'#include <emissivemap_fragment>\n#include <opaque_fragment>'};debug.onBeforeCompile(shader,null);
  assert.match(shader.vertexShader,new RegExp('skinWeight'+sets+'\\.w'));assert.match(shader.fragmentShader,/outgoingLight = normal/);
  debug.dispose();resource.mesh.material.dispose();resource.mesh.customDepthMaterial.dispose();resource.mesh.customDistanceMaterial.dispose();resource.skeleton.dispose();g.dispose();
 }
 assert.equal(new Set(keys).size,3);
});

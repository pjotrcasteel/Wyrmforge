import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {blendMotion} from './blend_motion.mjs';
const states=['cleaned','hurt','critical'].map(s=>JSON.parse(readFileSync(new URL(`./mage-${s}-motion.json`,import.meta.url))));
const base=states[0];let maxLengthError=0,maxLegDisplacement=0;
for(const data of states){
 assert.equal(data.duration,base.duration);assert.equal(data.fps,base.fps);
 assert.deepEqual(data.stride,base.stride);assert.deepEqual(data.contacts,base.contacts);
 assert.deepEqual(data.frames.map(f=>f.slice(0,11)),base.frames.map(f=>f.slice(0,11)));
}
for(const a of states)for(const b of states)for(let step=0;step<=20;step++){
 const mixed=blendMotion(a,b,step/20);
 mixed.frames.forEach((frame,i)=>{
  for(const [p,c] of base.bones){
   const length=f=>Math.hypot(...f[c].map((v,k)=>v-f[p][k]));
   maxLengthError=Math.max(maxLengthError,Math.abs(length(frame)-length(base.frames[i])));
  }
  for(let j=0;j<11;j++)maxLegDisplacement=Math.max(maxLegDisplacement,Math.hypot(...frame[j].map((v,k)=>v-base.frames[i][j][k])));
 });
}
assert(maxLengthError<3e-6);assert(maxLegDisplacement<1e-8);
const report={states:3,directedStatePairs:9,blendWeightsPerPair:21,framesPerWeight:32,equalDuration:true,equalStride:true,equalContacts:true,maxLengthErrorMeters:maxLengthError,maxRootOrLegDisplacementMeters:maxLegDisplacement,scope:'Art preview only; no gameplay files modified'};
writeFileSync(new URL('./visual-injury-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);

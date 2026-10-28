import test from 'node:test';
import assert from 'node:assert/strict';
import {solveTwoBoneContact as solve} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const chain=()=>({root:[0,0,0],target:[.15,0,-.3],pole:[0,-.4,-.1],upperLength:.25,lowerLength:.23,limits:[8,145]});
test('sparse source contact solve preserves both lengths, bend side, and reusable output',()=>{
 const input=chain(),copy=structuredClone(input),out={middle:[0,0,0],flexDegrees:0};
 assert.equal(solve(input,out),out);assert.deepEqual(input,copy);
 assert.ok(Math.abs(distance(input.root,out.middle)-input.upperLength)<1e-12);
 assert.ok(Math.abs(distance(input.target,out.middle)-input.lowerLength)<1e-12);
 assert.ok(out.middle[1]<0);assert.ok(out.flexDegrees>=8&&out.flexDegrees<=145);
 const first=[...out.middle];input.pole[1]*=-1;solve(input,out);assert.ok(out.middle[1]>0);
 assert.ok(Math.abs(first[0]-out.middle[0])<1e-12);assert.ok(Math.abs(first[2]-out.middle[2])<1e-12);
});
test('scaled and translated source chains remain geometrically equivalent',()=>{
 const c=chain(),first=solve(c),shift=[5,-7,2],scale=60;
 const transform=p=>p.map((v,i)=>v*scale+shift[i]);
 const result=solve({...c,root:transform(c.root),target:transform(c.target),pole:transform(c.pole),upperLength:c.upperLength*scale,lowerLength:c.lowerLength*scale});
 assert.ok(distance(result.middle,transform(first.middle))<1e-10);assert.ok(Math.abs(result.flexDegrees-first.flexDegrees)<1e-10);
});
test('singular reach, unsupported joint range, absent input and non-finite source chains fail explicitly',()=>{
 for(const change of [{target:[0,0,-1]},{target:[0,0,0]},{pole:[0,0,0]},{limits:[8,10]},{upperLength:0},{root:null},{target:[NaN,0,0]},{limits:[145,8]}])assert.throws(()=>solve({...chain(),...change}));
});
test('deterministic chain set preserves lengths across unequal segments and safe flexion ranges',()=>{
 let seed=17;const next=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
 for(let i=0;i<300;i++){
  const a=.1+next()*.4,b=.1+next()*.4,flex=15+next()*120;
  const reach=Math.sqrt(a*a+b*b+2*a*b*Math.cos(flex*Math.PI/180));
  const root=[next(),next(),next()],target=[root[0]+reach,root[1],root[2]],pole=[root[0],root[1]-1,root[2]];
  const out=solve({root,target,pole,upperLength:a,lowerLength:b,limits:[8,145]});
  assert.ok(Math.abs(distance(root,out.middle)-a)<1e-12);assert.ok(Math.abs(distance(target,out.middle)-b)<1e-12);assert.ok(Math.abs(out.flexDegrees-flex)<1e-10);assert.ok(out.middle[1]<root[1]);
 }
});
test('same sparse solver reproduces both knees in sixteen independently evaluated Blender source poses',async()=>{
 const {readFileSync}=await import('node:fs');
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/animation/source-contact-chains.json',import.meta.url),'utf8'));
 assert.equal(fixture.samples.length,32);
 for(const input of fixture.samples){
  const out=solve(input);const tolerance=Math.max(input.upperLength,input.lowerLength)*64*2**-23;
  assert.ok(distance(out.middle,input.expectedMiddle)<tolerance,`source joint mismatch ${distance(out.middle,input.expectedMiddle)} > Float32 accumulation bound ${tolerance}`);
 }
});
test('source contact regions map their actual segment endpoints to the solved pose without changing source data',async()=>{
 const {retargetSourceContactRegion:retarget}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const c=chain(),middle=solve(c).middle;
 const input={...c,upper:{head:c.root,tail:middle},lower:{head:middle,tail:c.target},end:{head:c.target},sourceContact:[.15,0,-.33],targetContact:[.17,.01,-.33],projection:[60,0,0,64,0,0,-60,32],maxCorrection:.03};
 const copy=structuredClone(input),r=retarget(input),project=p=>[p[0]*60+64,-p[2]*60+32];
 const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
 for(const [matrix,from,to] of [[r.upperTransform,c.root,c.root],[r.upperTransform,middle,r.middle],[r.lowerTransform,middle,r.middle],[r.lowerTransform,c.target,r.ankle],[r.endTransform,input.sourceContact,input.targetContact]])assert.ok(Math.hypot(...apply(matrix,project(from)).map((v,i)=>v-project(to)[i]))<1e-10);
 assert.deepEqual(input,copy);assert.throws(()=>retarget({...input,maxCorrection:.001}),/budget/);
 assert.throws(()=>retarget({...input,projection:[1]}),/projection/);
});

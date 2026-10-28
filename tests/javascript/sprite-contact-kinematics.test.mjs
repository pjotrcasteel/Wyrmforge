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
test('calibrated ground inverse preserves actual source projection and rejects edge-on input',async()=>{
 const {sourceGroundPointFromPixel:inverse}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const p=[0,-60,0,64,-34,0,-51,62],point=[.17,-.1,-.5];const pixel=[p[0]*point[0]+p[1]*point[1]+p[2]*point[2]+p[3],p[4]*point[0]+p[5]*point[1]+p[6]*point[2]+p[7]];
 assert.ok(distance(inverse(pixel,-.5,p),point)<1e-12);assert.throws(()=>inverse(pixel,-.5,[1,0,0,0,2,0,0,0]),/singular/);
});
test('generic contact cycles keep real stance anchors fixed through arbitrary world movement and source swing lifts',async()=>{
 const {updateGroundContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 for(const ids of [['foot-L','foot-R'],['palm-L','palm-R'],['paw-a','paw-b','paw-c','paw-d']]){
  const patterns=ids.map((id,i)=>({id,phaseOffset:i/ids.length,stanceFraction:.62,neutral:{x:i%2?2:-2,y:0}})),state={},last=new Map();
  for(let frame=0;frame<=180;frame++){
   const t=frame/60,v=t<1.5?{x:20,y:0}:{x:0,y:20},world=t<1.5?{x:20*t,y:0}:{x:30,y:20*(t-1.5)};
   const out=update(state,patterns,{timestamp:t,phaseCycles:t,world,velocity:v,stride:20,nominalPhaseRate:1});
   for(const [id,target] of Object.entries(out.targets)){
    assert.ok(target.lift>=0&&target.lift<=1);
    if(target.planted&&last.get(id)?.planted)assert.deepEqual([target.x,target.y],[last.get(id).x,last.get(id).y]);
    if(target.planted)assert.equal(target.lift,0);
    last.set(id,structuredClone(target));
   }
  }
 }
});
test('contact replay, frozen transport and actual anatomy remain deterministic and explicit',async()=>{
 const {updateGroundContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const patterns=[{id:'only-palm',phaseOffset:0,stanceFraction:1,neutral:{x:0,y:0}}],state={},intent=(t,extra={})=>({timestamp:t,phaseCycles:0,world:{x:0,y:0},velocity:{x:0,y:0},stride:20,nominalPhaseRate:1,...extra});
 const a=update(state,patterns,intent(0));assert.equal(a.targets['only-palm'].planted,true);
 const b=update(state,patterns,intent(1,{frozen:true,world:{x:3,y:0}}));assert.equal(b.transported,true);assert.equal(b.targets['only-palm'].planted,false);assert.equal(b.targets['only-palm'].x,3);
 const c=update(state,patterns,intent(2,{world:{x:3,y:0}}));assert.equal(c.targets['only-palm'].x,3);assert.equal(c.targets['only-palm'].planted,true);
 assert.throws(()=>update(state,patterns,intent(1)),/replay seek/);
 assert.throws(()=>update(state,[{...patterns[0],id:'ghost-foot'}],intent(3)),/anatomy/);
});
test('pelvis/body reaction can move a real chain root while preserving its world contact and segment lengths',async()=>{
 const {retargetSourceContactRegion:retarget}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const c=chain(),middle=solve(c).middle,rootTarget=[.01,.005,0],input={...c,upper:{head:c.root,tail:middle},lower:{head:middle,tail:c.target},end:{head:c.target},sourceContact:[.15,0,-.33],targetContact:[.15,0,-.33],rootTarget,maxRootCorrection:.02,projection:[60,0,0,64,0,0,-60,32],maxCorrection:.03};
 const r=retarget(input);assert.ok(Math.abs(distance(rootTarget,r.middle)-c.upperLength)<1e-12);assert.ok(Math.abs(distance(r.middle,r.ankle)-c.lowerLength)<1e-12);assert.deepEqual(r.ankle,c.target);
 for(const budget of [NaN,Infinity,-1])assert.throws(()=>retarget({...input,maxRootCorrection:budget}),/budget/);
 assert.notDeepEqual(r.upperTransform,[1,0,0,1,0,0]);assert.throws(()=>retarget({...input,maxRootCorrection:0}),/pelvis correction/);
});
test('support scheduling at rest cannot consume frozen time or reset to another anatomy',async()=>{
 const {updateGroundContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const p=[{id:'palm',phaseOffset:0,stanceFraction:.62,neutral:{x:0,y:0}}],s={},base={timestamp:0,phaseCycles:.8,world:{x:0,y:0},velocity:{x:0,y:0},stride:20,nominalPhaseRate:1,initialTargets:{palm:{x:3,y:4}}};
 const a=update(s,p,base);assert.deepEqual([a.targets.palm.x,a.targets.palm.y],[3,4]);
 assert.throws(()=>update(s,p,{...base,timestamp:1,phaseCycles:.9,frozen:true}),/support phase/);
});
test('actual corrected sole chains produce shared compositor parts and preserve projected world anchors',async()=>{
 const {readFileSync}=await import('node:fs');
 const {sampleSourceContactRegions:sample}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/animation/actual-sole-region-chains.json',import.meta.url)));
 for(const [direction,frames] of Object.entries(fixture.frames))for(let index=0;index<frames.length;index++){
  const frame=frames[index],targets=Object.create(null),p=frame.projection,world={x:123.25,y:-7.75},pixelScale=93/96;
  for(const [id,c] of Object.entries(frame.sourceContacts)){
   const point=c.sourceContact;
   targets[id]={x:world.x+(p[0]*point[0]+p[1]*point[1]+p[2]*point[2]+p[3]-64)*pixelScale,y:world.y+(p[4]*point[0]+p[5]*point[1]+p[6]*point[2]+p[7]-88)*pixelScale,z:point[2],planted:true};
  }
  const options={world,pixelScale,anchor:[64,88],maxCorrection:.001};
  const result=sample(frame,{clip:'walk',frame:index,direction},targets,options);
  assert.equal(result.parts.length,frame.completeRegions.length);
  for(const contact of result.contacts)assert.ok(contact.slip<1e-11);
  const missing=structuredClone(targets);delete missing[Object.keys(missing)[0]];assert.throws(()=>sample(frame,{clip:'walk',frame:index,direction},missing,options),/Missing actual support/);
 }
});
test('actual footprint hull distinguishes loaded area, unstable lean and degenerate line/point support',async()=>{
 const {measureSourceSupport:measure}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const feet=[[-.1,-.1],[.1,-.1],[.1,.1],[-.1,.1],[0,0],[-.1,-.1]];
 assert.deepEqual(measure(feet,[0,0]),{hull:[[-.1,-.1],[.1,-.1],[.1,.1],[-.1,.1]],dimension:2,margin:.1,staticallySupported:true});
 const lean=measure(feet,[.3,.3]);assert.equal(lean.staticallySupported,false);assert.ok(Math.abs(lean.margin+Math.sqrt(.08))<1e-12);
 assert.equal(measure([[0,0],[1,0]],[.5,0]).staticallySupported,false);
 assert.equal(measure([[0,0]],[0,0]).dimension,0);
 assert.throws(()=>measure([[NaN,0]],[0,0]),/Finite actual/);
});

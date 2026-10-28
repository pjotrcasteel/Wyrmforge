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

test('source support epochs survive clip/facing changes and frozen transport without another clock',async()=>{
 const {updateSourceContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const frame={projection:[10,0,0,64,0,10,0,88],sourceContacts:{palm:{sourceContact:[.1,.2,-.5],planted:true}}};
 const state={},intent={timestamp:0,world:{x:100,y:200},pixelScale:2,anchor:[64,88]};
 assert.deepEqual(update(state,frame,intent).palm,{x:102,y:204,z:-.5,planted:true,transported:false,supportActive:true});
 const turned=structuredClone(frame);turned.projection=[0,-10,0,64,10,0,0,88];
 assert.deepEqual(update(state,turned,{...intent,timestamp:1,world:{x:103,y:201}}).palm,state.targets.palm);
 assert.equal(state.targets.palm.x,102);assert.equal(state.targets.palm.y,204);
 const frozen=update(state,turned,{...intent,timestamp:2,world:{x:106,y:201},frozen:true}).palm;
 assert.equal(frozen.x,105);assert.equal(frozen.planted,false);assert.equal(frozen.transported,true);
 const resumed=update(state,turned,{...intent,timestamp:3,world:{x:106,y:201}}).palm;
 assert.equal(resumed.x,105);assert.equal(resumed.planted,true);
 turned.sourceContacts.palm.planted=false;
 const swing=update(state,turned,{...intent,timestamp:4,world:{x:106,y:201}}).palm;
 assert.equal(swing.x,102);assert.equal(swing.y,203);assert.equal(swing.planted,false);
 turned.sourceContacts.palm.planted=true;
 const landing=update(state,turned,{...intent,timestamp:5,world:{x:107,y:201}}).palm;
 assert.equal(landing.x,103);assert.equal(landing.y,203);
 const before=structuredClone(state);
 assert.throws(()=>update(state,turned,{...intent,timestamp:4}),/replay seek/);
 assert.deepEqual(JSON.parse(JSON.stringify(state)),before);
 delete turned.sourceContacts.palm.planted;
 assert.throws(()=>update(state,turned,{...intent,timestamp:6}),/Explicit authored/);
});

test('real sole source targets drive the same regional solver under arbitrary bounded root displacement',async()=>{
 const {updateSourceContactTargets:update,sampleSourceContactRegions:sample}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const {readFileSync}=await import('node:fs');
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/animation/actual-sole-region-chains.json',import.meta.url)));
 for(const [direction,frames] of Object.entries(fixture.frames)){
  const frame=structuredClone(frames[0]);for(const c of Object.values(frame.sourceContacts))c.planted=true;
  const state={},base={timestamp:0,world:{x:123,y:456},pixelScale:93/96,anchor:[64,88]},options={...base,maxCorrection:.02};
  const initial=update(state,frame,base),copy=structuredClone(initial);
  for(let i=1;i<=20;i++){
   const intent={...base,timestamp:i/60,world:{x:123+Math.sin(i)*.1,y:456+Math.cos(i)*.1}};
   const targets=update(state,frame,intent);
   assert.deepEqual({...targets},copy);
   const result=sample(frame,{clip:'walk',frame:0,direction},targets,{...options,world:intent.world});
   assert.ok(result.contacts.every(c=>c.slip<1e-10));
  }
  const intent={...base,timestamp:1,world:{x:153,y:456}};
  assert.throws(()=>sample(frame,{clip:'walk',frame:0,direction},update(state,frame,intent),{...options,world:intent.world}),/budget|Unreachable/);
 }
});

test('continuous landing phase prevents accumulated quantization drift in actual eight-view sole chains at 15–120Hz',async()=>{
 const {readFileSync}=await import('node:fs');
 const {createSpriteAnimationState:create,updateSpriteAnimation:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js');
 const {updateSourceContactTargets:targets,sampleSourceContactRegions:sample}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const f=JSON.parse(readFileSync(new URL('../fixtures/animation/continuous-sole-contacts.json',import.meta.url)));
 for(const frames of Object.values(f.frames))for(const frame of frames)Object.assign(frame,f.sourcePoses[frame.sourcePoseIndex]);
 for(const direction of f.profile.facing.directions)for(const hz of [15,30,60,120]){
  const s=create(),support={},v=f.profile.locomotion.stanceVelocityByDirection[direction],length=Math.hypot(v.x,v.y),speed=30,prior={};
  for(let i=0;i<=hz*2;i++){
   const t=i/hz,world={x:-v.x/length*speed*t,y:-v.y/length*speed*t};
   const pose=update(s,f.profile,{entityId:17,timestamp:t,travel:speed*t,world,direction,moving:true});
   const frame=f.frames[direction][pose.frame],options={timestamp:t,world,pixelScale:93/96,anchor:f.anchor,phaseOffset:pose.sourcePhaseOffset,maxCorrection:f.maxCorrectionMetres};
   const anchors=targets(support,frame,options),result=sample(frame,pose,anchors,options);
   for(const c of result.contacts){
    assert.ok(c.slip<1e-10,`${direction}/${hz}: source projected contact drift`);
    if(c.planted&&prior[c.id]?.planted)assert.deepEqual(c.target,prior[c.id].target);
    prior[c.id]=c;
   }
  }
 }
});

test('bounded phase-body translation carries swing geometry and pole with the real chain while retained support stays fixed',async()=>{
 const {retargetSourceContactRegion:retarget,updateSourceContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const c=chain(),middle=solve(c).middle,shift=[.005,-.004,0],plus=p=>p.map((v,i)=>v+shift[i]);
 const r=retarget({...c,pole:plus(c.pole),upper:{head:c.root,tail:middle},lower:{head:middle,tail:c.target},end:{head:c.target},sourceContact:[.15,0,-.33],targetContact:plus([.15,0,-.33]),rootTarget:plus(c.root),maxRootCorrection:.01,maxCorrection:.01,projection:[60,0,0,64,0,0,-60,32]});
 assert.ok(distance(r.middle,plus(middle))<1e-12);assert.ok(distance(r.ankle,plus(c.target))<1e-12);
 const frame={projection:[10,0,0,64,0,10,0,88],sourceContacts:{support:{sourceContact:[.1,.2,-.5],planted:true},swing:{sourceContact:[-.1,.2,-.45],planted:false}}};
 const intent={timestamp:0,world:{x:100,y:200},pixelScale:2,anchor:[64,88],phaseOffset:{x:.3,y:-.2},translateSwing:true},state={};
 const a=update(state,frame,intent);assert.equal(a.swing.x,98.3);assert.equal(a.swing.y,203.8);const anchor={...a.support};
 const b=update(state,frame,{...intent,timestamp:1,world:{x:100.1,y:200},phaseOffset:{x:.2,y:.1}});assert.deepEqual(b.support,anchor);assert.equal(b.swing.x,98.3);assert.equal(b.swing.y,204.1);
 const legacy=update({},frame,{...intent,translateSwing:false});assert.equal(legacy.swing.x,98);assert.equal(legacy.swing.y,204);
});

test('whole-body source reposing supports lateral/backward steps with fixed anatomy and recomputed mass',async()=>{
 const {readFileSync}=await import('node:fs');
 const {solveSupportedSourcePose:repose}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const f=JSON.parse(readFileSync(new URL('../fixtures/animation/supported-source-pose.json',import.meta.url)));
 const original=JSON.stringify(f);
 for(const heading of [-180,-90,-45,0,45,90,180]){
  const a=heading*Math.PI/180,targets=Object.fromEntries(Object.entries(f.frame.sourceContacts).map(([id,c])=>[id,{point:[c.sourceContact[0]-Math.sin(a)*c.sourceContact[1],Math.cos(a)*c.sourceContact[1],c.sourceContact[2]],planted:c.planted}]));
  const r=repose(f.frame,targets,{massWeights:f.massWeights,rootBone:f.rootBone,...f.authoringEnvelope,minimumSupportMargin:f.minimumSupportMarginMetres});
  assert.ok(r.sourceRepose.support.margin>=f.minimumSupportMarginMetres);
  assert.ok(Math.hypot(...r.sourceRepose.bodyShift)<=f.authoringEnvelope.maxBodyTranslation);
  for(const [id,c] of Object.entries(r.sourceContacts))assert.deepEqual(c.sourceContact,targets[id].point);
  for(const [name,b] of Object.entries(r.sourceBones))assert.ok(Math.abs(distance(b.head,b.tail)-distance(f.frame.sourceBones[name].head,f.frame.sourceBones[name].tail))<1e-6);
  const mass=Object.values(f.massWeights).reduce((a,b)=>a+b,0),center=[0,0,0];
  for(const [name,w] of Object.entries(f.massWeights))for(let axis=0;axis<3;axis++)center[axis]+=(r.sourceBones[name].head[axis]+r.sourceBones[name].tail[axis])*w/(2*mass);
  assert.deepEqual(r.massCenter,center);assert.deepEqual(r.sourceBones[f.rootBone],f.frame.sourceBones[f.rootBone]);
 }
 assert.equal(JSON.stringify(f),original,'source metadata is immutable');
});

test('whole-body source reposing rejects missing support, forged mass, excursions and unbounded body motion',async()=>{
 const {readFileSync}=await import('node:fs');
 const {solveSupportedSourcePose:repose}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const f=JSON.parse(readFileSync(new URL('../fixtures/animation/supported-source-pose.json',import.meta.url)));
 const targets=Object.fromEntries(Object.entries(f.frame.sourceContacts).map(([id,c])=>[id,{point:[...c.sourceContact],planted:c.planted}]));
 const options={massWeights:f.massWeights,rootBone:f.rootBone,...f.authoringEnvelope,minimumSupportMargin:f.minimumSupportMarginMetres};
 const none=structuredClone(targets);for(const t of Object.values(none))t.planted=false;
 assert.throws(()=>repose(f.frame,none,options),/no actual ground support/);
 assert.throws(()=>repose(f.frame,targets,{...options,maxBodyTranslation:Infinity}),/bounded authoring/);
 assert.throws(()=>repose(f.frame,targets,{...options,massWeights:{absent:1}}),/segment masses/);
 const far=structuredClone(targets);Object.values(far)[0].point[0]+=10;
 assert.throws(()=>repose(f.frame,far,options),/excursion/);
 const lateral=structuredClone(targets);Object.values(lateral)[1].planted=false;
 assert.throws(()=>repose(f.frame,lateral,{...options,maxBodyTranslation:0}),/translation envelope/);
 assert.throws(()=>repose(f.frame,{},options),/support target/);
});

test('source support reposing has no species/bone-name dependency or phantom absent arm',async()=>{
 const {readFileSync}=await import('node:fs');
 const {solveSupportedSourcePose:repose}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const f=JSON.parse(readFileSync(new URL('../fixtures/animation/supported-source-pose.json',import.meta.url)));
 const names=Object.fromEntries(Object.keys(f.frame.sourceBones).map((name,i)=>[name,'generic-'+i]));
 // Remove an actually non-supporting limb from anatomy and its mass model.
 for(const name of ['upper_arm.L','forearm.L','hand.L']){delete f.frame.sourceBones[name];delete f.massWeights[name];}
 f.frame.sourceBones=Object.fromEntries(Object.entries(f.frame.sourceBones).map(([name,b])=>[names[name],b]));
 f.massWeights=Object.fromEntries(Object.entries(f.massWeights).map(([name,w])=>[names[name],w]));
 f.frame.sourceContacts=Object.fromEntries(Object.values(f.frame.sourceContacts).map((c,i)=>['palm-'+i,{...c,upper:names[c.upper],middle:names[c.middle],end:names[c.end]}]));
 const targets=Object.fromEntries(Object.entries(f.frame.sourceContacts).map(([id,c])=>[id,{point:[...c.sourceContact],planted:c.planted}]));
 const r=repose(f.frame,targets,{massWeights:f.massWeights,rootBone:names[f.rootBone],...f.authoringEnvelope,minimumSupportMargin:0});
 assert.deepEqual(Object.keys(r.sourceContacts),['palm-0','palm-1']);assert.equal(Object.keys(r.sourceBones).length,Object.keys(f.frame.sourceBones).length);
 for(const name of ['upper_arm.L','forearm.L','hand.L'])assert.equal(Object.hasOwn(r.sourceBones,names[name]),false);
});

test('holding the lifecycle phase at rest cannot move an existing swing landing using wall time',async()=>{
 const {updateGroundContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const patterns=[{id:'palm',phaseOffset:0,stanceFraction:.6,neutral:{x:0,y:0}}],state={};
 const input={timestamp:0,phaseCycles:.7,world:{x:0,y:0},velocity:{x:1,y:0},stride:1,nominalPhaseRate:1};
 update(state,patterns,input);
 const before=structuredClone(state.targets);
 const out=update(state,patterns,{...input,timestamp:5,velocity:{x:0,y:0}});
 assert.deepEqual(JSON.parse(JSON.stringify(out.targets)),before);
 assert.equal(out.plannedLandings.length,0);assert.equal(state.timestamp,5);
});

test('the selected source phase owns stance boundaries while continuous phase owns travel rate',async()=>{
 const {updateGroundContactTargets:update}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js');
 const state={},patterns=[{id:'paw',phaseOffset:0,stanceFraction:.62,neutral:{x:0,y:0}}];
 const input={timestamp:0,phaseCycles:.61,sourcePhaseCycles:.625,world:{x:0,y:0},velocity:{x:1,y:0},stride:1,nominalPhaseRate:1};
 const first=update(state,patterns,input);assert.equal(first.targets.paw.planted,false,'source frame already lifted this contact');
 const landed=update(state,patterns,{...input,timestamp:.38,phaseCycles:.99,sourcePhaseCycles:1,world:{x:.38,y:0}});
 assert.equal(landed.targets.paw.planted,true,'source frame landed before its nearest-frame continuous phase');
 assert.equal(state.phaseCycles,.99);assert.equal(state.sourcePhaseCycles,1);
 assert.throws(()=>update(state,patterns,{...input,timestamp:.4,phaseCycles:1,sourcePhaseCycles:.9375}),/replay seek/);
});

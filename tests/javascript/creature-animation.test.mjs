import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js',import.meta.url),'utf8');
const {validateCreatureRigProfile:validate,serializeAnimationData:serialize,createSpriteAnimationState:create,updateSpriteAnimation:update}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function fixture(surface='foot'){
 const sample={contacts:[{id:'support',x:0,y:0}],com:[0,0],balance:'supported'};
 return {schemaVersion:2,coordinateSpace:'actor-xy-ground-z-up',unitsPerPixel:1,maxRootOffset:.5,
 rig:{bodyPlan:surface==='palm'?'hand-supported':'generic',bones:[{id:'root',length:1,rest:identity},{id:'limb',parent:'root',length:1,rest:identity}],semantics:{root:'root'},contacts:[{id:'support',bone:'limb',surface}]},
 facing:{directions:['E','SE','S','SW','W','NW','N','NE']},
 locomotion:{clip:'walk',frames:4,fps:4,stride:4,samples:Array(4).fill(sample)},
 pivot:{clip:'step-turn',frames:4,fps:8,samples:Array(4).fill(sample)},
 actions:{strike:{clip:'strike',frames:4,fps:4,priority:10,commitUntil:.8,samples:Array(4).fill(sample)},death:{clip:'death',frames:4,fps:4,priority:100,terminal:true,hold:true,samples:Array(4).fill(sample)}}};
}
const intent=(timestamp=0,extra={})=>({entityId:'actor-17',timestamp,travel:0,world:{x:0,y:0},direction:'S',moving:false,...extra});
const strike=(sequence=0)=>({name:'strike',token:`claw-${sequence}`,sequence});
test('one API validates biped, actual palm crawler and non-Hollowed paw descriptors',()=>{
 for(const surface of ['foot','palm','paw'])assert.equal(validate(fixture(surface)).schemaVersion,2);
 const p=fixture();p.rig.absentBones=['arm-left'];assert.equal(validate(p),p);
 p.rig.contacts.push({id:'ghost',bone:'arm-left',surface:'palm'});assert.throws(()=>validate(p),/invalid contact/);
});
test('invalid hierarchy, bind, unsupported pose, independent upper body and forged version fail',()=>{
 for(const mutate of [p=>p.schemaVersion=3,p=>p.coordinateSpace='unknown',p=>p.rig.bones[1].parent='absent',p=>p.rig.bones[1].rest=[1],p=>p.locomotion.samples[0]={contacts:[]},p=>p.actions.strike.mode='regions',p=>p.maxRootOffset=2]){
  const p=structuredClone(fixture());mutate(p);assert.throws(()=>validate(p),TypeError);
 }
});
test('target crossing and repeated action cannot reset committed strike',()=>{
 const p=validate(fixture()),s=create();update(s,p,intent(0,{action:strike()}));
 let a=update(s,p,intent(.5,{direction:'N',action:strike(1)}));
 assert.equal(a.actionToken,'claw-0');assert.equal(a.frame,2);assert.equal(a.direction,'S');
 a=update(s,p,intent(.75,{direction:'N',action:strike()}));assert.equal(a.actionToken,'claw-0');assert.equal(a.frame,3);
});
test('freeze drops queued attack, resume does not catch up and terminal death wins',()=>{
 const p=validate(fixture()),s=create();update(s,p,intent(0,{action:strike()}));update(s,p,intent(.5));
 const frozen=update(s,p,intent(5,{frozen:true,action:strike(1),direction:'N'}));assert.equal(frozen.frame,2);
 const resume=update(s,p,intent(6));assert.equal(resume.frame,2);
 const death=update(s,p,intent(7,{frozen:true,action:{name:'death',token:'dead',sequence:2}}));assert.equal(death.clip,'death');
 assert.equal(update(s,p,intent(8,{action:strike(3)})).clip,'death');
});
test('action sequence rejects old duplicates after completion; death holds',()=>{
 const p=fixture(),s=create();update(s,p,intent(0,{action:strike(4)}));update(s,p,intent(2));
 assert.equal(update(s,p,intent(2.1,{action:strike(4)})).clip,'walk');
 assert.equal(update(s,p,intent(2.2,{action:strike(2)})).clip,'walk');
});
test('turn consumes authored support-step cycles, at most one facing per step',()=>{
 const p=fixture(),s=create();update(s,p,intent());
 assert.equal(update(s,p,intent(.25,{direction:'N'})).direction,'S');
 assert.equal(update(s,p,intent(.5,{direction:'N'})).direction,'SE');
 assert.equal(update(s,p,intent(1,{direction:'N'})).direction,'E');
});
test('15/30/60/120 Hz sample the same absolute action and distance phases',()=>{
 const results=[];
 for(const fps of [15,30,60,120]){
  const p=fixture(),s=create();update(s,p,intent(0,{action:strike()}));
  for(let i=1;i<=fps;i++)update(s,p,intent(i/fps,{travel:i/fps*4,moving:true}));
  results.push([s.sample.clip,s.sample.frame,Number(s.phase.toFixed(8)),s.sample.seed]);
 }
 assert.ok(results.every(r=>JSON.stringify(r)===JSON.stringify(results[0])),JSON.stringify(results));
});
test('contact solver reports real slip when authoritative motion exceeds bounded correction',()=>{
 const p=fixture(),s=create();update(s,p,intent());
 const a=update(s,p,intent(.1,{world:{x:2,y:0},travel:2,moving:true}));
 assert.equal(a.rootOffset.x,-.5);assert.equal(a.debug.maxSlip,1.5);assert.equal(a.debug.correctionSaturated,true);
});
test('replay serialization stable; entity reuse, time reversal and non-finite inputs rejected',()=>{
 assert.equal(serialize({b:1,a:{z:3,c:2}}),serialize({a:{c:2,z:3},b:1}));
 const p=fixture(),s=create();update(s,p,intent(1));
 assert.throws(()=>update(s,p,intent(0)),RangeError);
 assert.throws(()=>update(s,p,intent(1,{entityId:20})),TypeError);
 assert.throws(()=>serialize({x:Infinity}),TypeError);
});
test('reduced-motion samples declared static pose without changing gameplay input',()=>{
 const p=fixture(),s=create(),i=intent(.1,{reducedMotion:true,action:strike()});const copy=structuredClone(i);
 assert.equal(update(s,p,i).frame,0);assert.deepEqual(i,copy);
});
test('duplicate token with a different sequence cannot restart completed action',()=>{
 const p=fixture(),s=create();update(s,p,intent(0,{action:strike()}));update(s,p,intent(2));
 const a=update(s,p,intent(2.1,{action:{...strike(),sequence:100}}));assert.equal(a.clip,'walk');
});
test('reusable JSON examples validate and sample without a species branch',()=>{
 for(const name of ['generic-quadruped','hand-crawler','one-arm-biped']){
  const p=validate(JSON.parse(readFileSync(new URL(`../fixtures/animation/${name}.json`,import.meta.url),'utf8')));
  const s=create();assert.equal(update(s,p,intent()).clip,'rest');
 }
});

test('singular, reflected and non-affine binds are rejected before authoring/runtime',()=>{
 for(const mutate of [m=>m[0]=0,m=>m[0]=-1,m=>m[15]=0]){
  const p=structuredClone(fixture());mutate(p.rig.bones[1].rest);assert.throws(()=>validate(p),/bind/);
 }
});
test('scaled bodies use proportional stride and bounded contact correction',()=>{
 const p=fixture(),s=create();update(s,p,intent(0,{scale:2}));
 const a=update(s,p,intent(.25,{scale:2,travel:2,moving:true,world:{x:3,y:0}}));
 assert.equal(a.phase,.25);assert.equal(Math.abs(a.rootOffset.x),1);
 assert.throws(()=>update(s,p,intent(.3,{scale:0})),RangeError);
});

test('whole-body pose grid samples independent distance and committed action clocks',()=>{
 const p=structuredClone(fixture()),s=create();
 p.actions.strike.poseGrid={phaseFrames:4,actionFrames:3,order:'action-major',phaseSampling:'nearest',actionSampling:'nearest'};
 p.actions.strike.frames=12;p.actions.strike.fps=3;
 p.actions.strike.samples=Array.from({length:12},()=>({contacts:[{id:'support',x:0,y:0}],balance:'supported'}));
 validate(p);update(s,p,intent(0,{action:strike()}));
 let a=update(s,p,intent(.5,{travel:1,moving:true,direction:'N',action:strike(1)}));
 assert.equal(a.actionToken,'claw-0');assert.equal(a.actionProgress,.5);assert.equal(a.frame,5);assert.equal(a.direction,'S');
 a=update(s,p,intent(.5,{travel:2,moving:true}));assert.equal(a.frame,6);assert.equal(a.actionProgress,.5);
 a=update(s,p,intent(.75,{travel:2,moving:false}));assert.equal(a.frame,10);assert.equal(a.actionProgress,.75);
 assert.equal(update(s,p,intent(1,{travel:2})).actionToken,null,'grid duration is actionFrames/fps, not total packed poses/fps');
});
test('pose grid freeze and replay preserve both clocks at variable render FPS',()=>{
 const p=structuredClone(fixture());p.actions.strike.poseGrid={phaseFrames:4,actionFrames:4,order:'action-major',phaseSampling:'nearest',actionSampling:'nearest'};
 p.actions.strike.frames=16;p.actions.strike.samples=Array(16).fill(p.actions.strike.samples[0]);
 const results=[];
 for(const fps of [15,30,60,120]){
  const s=create();update(s,p,intent(0,{action:strike()}));
  for(let i=1;i<=fps/3;i++)update(s,p,intent(i/fps,{travel:i/fps*2,moving:true}));
  const before=structuredClone(s.sample);const freeze=update(s,p,intent(8,{frozen:true,travel:2/3}));
  assert.equal(freeze.frame,before.frame);assert.equal(update(s,p,intent(9,{travel:2/3})).frame,before.frame);
  results.push([s.sample.frame,Number(s.sample.actionProgress.toFixed(8)),Number(s.sample.phase.toFixed(8))]);
 }
 assert.ok(results.every(r=>JSON.stringify(r)===JSON.stringify(results[0])),JSON.stringify(results));
});
test('pose grid rejects incomplete, ambiguous and fractional sample layouts',()=>{
 for(const change of [g=>g.phaseFrames=3,g=>g.actionFrames=1,g=>g.order='phase-major',g=>g.phaseSampling='interpolated',g=>g.actionFrames=2.5]){
  const p=structuredClone(fixture());p.actions.strike.poseGrid={phaseFrames:2,actionFrames:2,order:'action-major',phaseSampling:'nearest',actionSampling:'nearest'};
  change(p.actions.strike.poseGrid);assert.throws(()=>validate(p),/pose grid/);
 }
});

test('actual source-derived grid plants raster contact landmarks under forward and reversed C# root motion',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/travel-grid-source.json',import.meta.url),'utf8')));
 for(const fps of [15,30,60,120])for(const reverse of [false,true]){
  const s=create();let maximum=0;
  for(let i=0;i<fps*1.3;i++){
   const t=i/fps,travel=t*46.53,x=reverse&&t>.55?.55*46.53-(t-.55)*46.53:travel;
   const a=update(s,p,intent(t,{travel,world:{x,y:0},moving:true,direction:reverse&&t>.55?'W':'E',action:strike()}));
   assert.equal(a.actionToken,'claw-0');assert.equal(a.direction,'E');
   assert.equal(a.debug.correctionSaturated,false,`${fps}Hz saturated at ${t}`);
   assert.ok(Math.hypot(a.rootOffset.x,a.rootOffset.y)<=p.maxRootOffset+1e-10);
   maximum=Math.max(maximum,a.debug.maxSlip);
  }
  assert.ok(maximum<p.unitsPerPixel/4,`${fps}Hz reverse=${reverse}: ${maximum} > quarter source pixel`);
 }
});
test('forward-only source grid reports lateral drift; projection cannot claim arbitrary-direction grounding',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/travel-grid-source.json',import.meta.url),'utf8'))),s=create();
 update(s,p,intent(0,{direction:'E',action:strike()}));
 const a=update(s,p,intent(.2,{travel:6,world:{x:0,y:6},direction:'S',moving:true,action:strike()}));
 assert.equal(a.direction,'E');assert.equal(a.actionToken,'claw-0');assert.equal(a.debug.correctionSaturated,true);
 assert.ok(a.debug.maxSlip>p.unitsPerPixel/4);
});
test('optional sparse chains require present connected source bones, explicit bind space and valid poles/limits',()=>{
 const p=structuredClone(fixture());p.rig.bones.push({id:'middle',parent:'limb',length:1,rest:identity},{id:'end',parent:'middle',length:1,rest:identity});
 const contact=p.rig.contacts[0];contact.bone='end';contact.chain={upper:'limb',middle:'middle',end:'end',pole:[0,-1,0],restContactPoint:[0,0,0],limits:[8,145],bindSpace:'rig-source'};
 assert.equal(validate(p),p);
 for(const change of [{upper:'ghost'},{middle:'root'},{end:'limb'},{bindSpace:'world'},{pole:[0,NaN,0]},{limits:[145,8]}]){
  const invalid=structuredClone(p);Object.assign(invalid.rig.contacts[0].chain,change);assert.throws(()=>validate(invalid),/chain/);
 }
});
test('source bind conversion declares units and rejects reflection, skew and unsupported up axes',()=>{
 const p=structuredClone(fixture());p.rig.sourceSpace={coordinateSpace:'blender-armature-xyz-metres',toActor:[0,-60,0,0,60,0,0,0,0,0,60,30,0,0,0,1]};assert.equal(validate(p),p);
 for(const change of [m=>m[10]=-60,m=>m[0]=1,m=>m[5]=20,m=>m[15]=0,m=>m[8]=10]){const invalid=structuredClone(p);change(invalid.rig.sourceSpace.toActor);assert.throws(()=>validate(invalid),/bind transform/);}
});
test('canonical profile/replay serialization rejects non-JSON values, cycles and accessor side effects',()=>{
 const cycle={};cycle.self=cycle;const sparse=[];sparse.length=1;let accessed=false;const accessor={get value(){accessed=true;return 1;}};
 for(const value of [undefined,{x:undefined},NaN,Infinity,()=>1,1n,Symbol('x'),new Date(),cycle,sparse,accessor])assert.throws(()=>serialize(value),TypeError);
 assert.equal(accessed,false);const shared={x:2};assert.equal(serialize({b:shared,a:shared}),'{"a":{"x":2},"b":{"x":2}}');
 assert.deepEqual(JSON.parse(serialize(Object.assign(Object.create(null),{z:1,a:2}))),{a:2,z:1});
});
test('reserved contact and action names cannot become inherited contacts or unregistered actions',()=>{
 const p=structuredClone(fixture());p.rig.contacts[0].id='__proto__';for(const spec of [p.locomotion,p.pivot,...Object.values(p.actions)])for(const sample of spec.samples)sample.contacts[0].id='__proto__';
 validate(p);const s=create();const a=update(s,p,intent(0,{action:{name:'constructor',token:'unknown',sequence:0}}));
 assert.equal(a.clip,'walk');assert.equal(a.debug.maxSlip,0);assert.ok(Object.hasOwn(a.debug.contacts,'__proto__'));
 assert.throws(()=>update(s,p,intent(.1,{action:{name:'strike',token:{},sequence:1}})),/Action requires/);
});
test('non-finite source timing, strides, mass projections and malformed facing labels fail at load',()=>{
 for(const mutate of [p=>p.locomotion.fps=Infinity,p=>p.locomotion.stride=Infinity,p=>p.locomotion.samples[0].com=[NaN,0],p=>p.facing.directions[0]={},p=>p.rig.bones[0].limits='unbounded']){
  const p=structuredClone(fixture());mutate(p);assert.throws(()=>validate(p),TypeError);
 }
});
test('projected contact metadata matches independently exported saved-rig screen markers, without a second facing rotation',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/projected-contact-source.json',import.meta.url),'utf8')));
 for(const marker of p.sourceEvidence.projectedMarkerChecks){
  const sample=p.locomotion.facingSamples[marker.direction][marker.frame].contacts.find(c=>c.id===marker.id);
  const expected=marker.markerPixel128.map((v,i)=>(v-p.sourceEvidence.sourceCanvasAnchor128[i])*p.sourceEvidence.nativePixelScale);
  assert.ok(Math.hypot(sample.x-expected[0],sample.y-expected[1])<64*2**-23*128*p.unitsPerPixel);
 }
 const s=create(),a=update(s,p,intent(0,{direction:'S'}));
 for(const c of p.locomotion.facingSamples.S[0].contacts)assert.ok(Math.hypot(a.debug.contacts[c.id].x-c.x,a.debug.contacts[c.id].y-c.y)<1e-10);
 assert.ok(p.locomotion.strideByDirection.S<p.locomotion.strideByDirection.E,'camera foreshortening must be calibrated rather than ignored');
});
test('actual projected source grid contacts remain planted in S/E/diagonal source travel and reversal at 15–120Hz',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/projected-contact-source.json',import.meta.url),'utf8')));
 for(const fps of [15,30,60,120])for(const direction of ['S','E','NE','SW'])for(const reverse of [false,true]){
  const s=create(),v=p.actions.strike.poseGrid.stanceVelocityByDirection[direction],length=Math.hypot(v.x,v.y);let max=0;
  for(let i=0;i<=fps*1.2;i++){
   const t=i/fps,travel=t*46.53,position=reverse&&t>.55?.55*46.53-(t-.55)*46.53:travel;
   const a=update(s,p,intent(t,{direction,travel,world:{x:-v.x/length*position,y:-v.y/length*position},moving:true,action:strike()}));
   assert.equal(a.debug.correctionSaturated,false,`${direction}/${fps}Hz`);max=Math.max(max,a.debug.maxSlip);
  }
  assert.ok(max<p.unitsPerPixel/4,`${direction}/${fps}Hz reverse=${reverse}: ${max}`);
 }
});
test('projected source data requires all eight calibrated facing rows and finite positive strides',()=>{
 const p=JSON.parse(readFileSync(new URL('../fixtures/animation/projected-contact-source.json',import.meta.url),'utf8'));
 for(const change of [p=>delete p.locomotion.facingSamples.S,p=>p.locomotion.contactSpace='actor-local',p=>p.locomotion.strideByDirection.S=0,p=>p.actions.strike.poseGrid.stanceVelocityByDirection.S={x:NaN,y:0}]){
  const invalid=structuredClone(p);change(invalid);assert.throws(()=>validate(invalid),/projected/);
 }
});

test('pause/freeze retains the entire source pose when facing intent changes between unequal clips',()=>{
 for(const flag of ['paused','frozen']){
  const p=fixture(),s=create();p.pivot={...p.pivot,frames:1,samples:[p.pivot.samples[0]]};
  update(s,p,intent(0,{moving:true}));const before=update(s,p,intent(.2,{travel:3,moving:true}));assert.equal(before.clip,'walk');assert.equal(before.frame,3);
  const held=update(s,p,intent(2,{travel:3,direction:'N',[flag]:true}));
  assert.equal(held.clip,before.clip);assert.equal(held.frame,before.frame);assert.equal(held.direction,before.direction);
  const death=update(s,p,intent(3,{travel:3,[flag]:true,action:{name:'death',token:'dead',sequence:4}}));assert.equal(death.clip,'death');
 }
});

test('moving action exits on its signed support phase and consumes the final sample displacement at every render rate',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/travel-grid-source.json',import.meta.url))));
 for(const hz of [15,30,60,120])for(const reverse of [false,true]){
  const s=create(),speed=30,end=p.actions.strike.poseGrid.actionFrames/p.actions.strike.fps+1e-8;
  const at=t=>{const x=reverse&&t>.5?speed*(1-t):speed*t;return intent(t,{travel:speed*t,world:{x,y:0},direction:'E',moving:true,action:strike()});};
  update(s,p,at(0));
  for(let i=1;i/hz<end-2e-8;i++)update(s,p,at(i/hz));
  const sample=update(s,p,at(end)),x=at(end).world.x,expected=((x/p.locomotion.stride)%1+1)%1;
  assert.equal(sample.actionToken,null);
  assert.ok(Math.abs(sample.phase-expected)<1e-12,`${hz}Hz reverse=${reverse}: ${sample.phase} != ${expected}`);
 }
});

test('calibrated locomotion continues signed root travel after recovery instead of consuming unsigned path length',()=>{
 const p=validate(JSON.parse(readFileSync(new URL('../fixtures/animation/projected-contact-source.json',import.meta.url))));
 for(const direction of ['S','E','SE'])for(const hz of [15,30,60,120]){
  const s=create(),v=p.locomotion.stanceVelocityByDirection[direction],length=Math.hypot(v.x,v.y),speed=30;
  for(let i=0;i<=hz*2;i++){
   const t=i/hz,signed=t<=.5?speed*t:speed*(1-t),world={x:-v.x/length*signed,y:-v.y/length*signed};
   const pose=update(s,p,intent(t,{world,travel:speed*t,direction,moving:true,action:strike()}));
   if(t>1.4){assert.equal(pose.actionToken,null);assert.ok(Math.abs(pose.phase-((signed/length%1+1)%1))<1e-12);}
  }
 }
});

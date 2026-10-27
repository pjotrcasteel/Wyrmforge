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

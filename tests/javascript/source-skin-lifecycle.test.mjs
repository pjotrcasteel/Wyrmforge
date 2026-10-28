import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';
import {updateSourceSkinSupport} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/source-skin-support.js';
const pack=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/review/animation-foundation-skin/',import.meta.url);
const profile=validateCreatureRigProfile(JSON.parse(readFileSync(new URL('profile.json',pack)))),surface=JSON.parse(readFileSync(new URL('poses.json',pack)));
test('real source idle starts in double support and settles after sideways stop without enlarging the source envelope',()=>{
 for(const id of [1,10,20,32]){
  const state=createSpriteAnimationState(),contacts={};let travel=0,last;
  for(let i=0;i<=180;i++){
   const t=i/60,x=30*Math.max(0,Math.min(t-.3,1)),previous=30*Math.max(0,Math.min(t-1/60-.3,1));travel+=Math.abs(x-previous);
   const intent={entityId:id,timestamp:t,travel,world:{x,y:0},direction:'S',moving:x!==previous};
   const sample=updateSpriteAnimation(state,profile,intent),posed=updateSourceSkinSupport(contacts,surface,profile,sample,intent);
   assert.ok(posed.debug.maxSlip<1e-8);assert.ok(posed.debug.support.margin>=surface.minimumSupportMarginMetres);
   assert.ok(Math.hypot(...posed.sourcePose.sourceRepose.bodyShift)<=surface.authoringEnvelope.maxBodyTranslation);
   if(i===0||i===180)assert.ok(Object.values(posed.sourcePose.sourceContacts).every(c=>c.planted));
   if(i>170)assert.equal(sample.contactPhase,last);last=sample.contactPhase;
  }
 }
});
test('source claw retains yaw through crossing target, freeze holds matrices, and reduced motion reports transported support',()=>{
 const state=createSpriteAnimationState(),contacts={};
 const input=(t,extra={})=>({entityId:5,timestamp:t,travel:0,world:{x:0,y:0},direction:'S',moving:false,...extra});
 const take=intent=>updateSourceSkinSupport(contacts,surface,profile,updateSpriteAnimation(state,profile,intent),intent);
 const a=take(input(0,{action:{name:'attack',token:'claw',sequence:0}}));
 const b=take(input(.5,{direction:'N'}));assert.equal(b.sourceSupport.yaw,a.sourceSupport.yaw);assert.equal(b.actionToken,'claw');
 const frozen=take(input(5,{frozen:true,direction:'N'}));assert.deepEqual(frozen.skinPose,b.skinPose);
 take(input(6));const reduced=take(input(6.1,{reducedMotion:true}));assert.equal(reduced.debug.transported,true);assert.equal(reduced.debug.maxSlip,null);assert.ok(Object.values(reduced.sourcePose.sourceContacts).every(c=>!c.planted));
});

// Actual baked-profile adapter lifecycle; image/renderer proof is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const pack=new URL('../art/review/animation-foundation-sprite-walk/',root);
const profile=JSON.parse(readFileSync(new URL('profile.json',pack),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('manifest.json',pack),'utf8'));
function variantProfile(){
 const p=structuredClone(profile),v=structuredClone(p.locomotion);v.clip='metadata-heading';
 for(const value of Object.values(v.stanceVelocityByDirection)){
  const {x,y}=value;value.x=x*Math.cos(.1)-y*Math.sin(.1);value.y=x*Math.sin(.1)+y*Math.cos(.1);
 }
 p.locomotion.motionVariants=[v];return p;
}

test('bounded full-body motion selection retains one gait phase and the frozen source clip',()=>{
 const p=variantProfile();validateCreatureRigProfile(p);const state=createSpriteAnimationState();
 const v=p.locomotion.motionVariants[0].stanceVelocityByDirection.E;
 const intent={entityId:9,timestamp:0,travel:0,world:{x:0,y:0},direction:'E',moving:true,velocity:{x:-v.x,y:-v.y}};
 const first=updateSpriteAnimation(state,p,intent);assert.equal(first.clip,'metadata-heading');
 const next=updateSpriteAnimation(state,p,{...intent,timestamp:.1,travel:Math.hypot(v.x,v.y)*.1,world:{x:-v.x*.1,y:-v.y*.1}});
 assert.ok(Math.abs(next.phase-.1)<1e-8);assert.equal(next.baseClip,'metadata-heading');
 const frozen=updateSpriteAnimation(state,p,{...intent,timestamp:.2,travel:Math.hypot(v.x,v.y)*.1,world:{x:-v.x*.1,y:-v.y*.1},paused:true,direction:'W'});
 assert.equal(frozen.clip,next.clip);assert.equal(frozen.frame,next.frame);assert.equal(frozen.phase,next.phase);
});

test('motion libraries reject changed contact schedules, incomplete vectors and incompatible playback',()=>{
 for(const mutate of [p=>p.locomotion.motionVariants[0].samples[0].contacts.pop(),p=>delete p.locomotion.motionVariants[0].stanceVelocityByDirection.N,p=>p.locomotion.motionVariants[0].fps++,p=>p.facing.transition='source-pivot']){
  const p=variantProfile();mutate(p);assert.throws(()=>validateCreatureRigProfile(p));
 }
});
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const stub=uri(`export function createCreatureAnimationAssets(){return {ready:()=>true,manifest:${JSON.stringify(manifest)},profile:${JSON.stringify(profile)},draw:()=>false};}`);
const source=readFileSync(new URL('hollow-sprites.js',root),'utf8')
 .replace(/new URL\('\.\.\/art\/[^']+',\s*import.meta.url\)/g,"new URL('https://example.test/')")
 .replace(/from '(\.\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(p==='./creature-animation-assets.js'?stub:uri(readFileSync(new URL(p,root),'utf8'))));
const before=globalThis.location;globalThis.location={search:'?animationFoundation=sprite-walk'};
const mod=await import(uri(source));globalThis.location=before;
const snapshot=(time,x)=>({simulationTimeSeconds:time,hud:{seconds:Math.floor(time)},enemies:[{entityId:5,kind:0,x:0,y:0,radius:11}],player:{x,y:0,radius:9}});

test('walk-only baked proof preserves the existing attack instead of claiming an unrendered pose',()=>{
 const state=mod.createHollowState();mod.updateHollowSprites(state,snapshot(0,8),0);
 const actor=state.entities.get(5);assert.equal(actor.foundationSample,null);assert.equal(actor.foundationCue,undefined);
 mod.updateHollowSprites(state,snapshot(.2,8),.2);assert.equal(actor.foundationSample,null);
 for(let i=5;i<=35;i++)mod.updateHollowSprites(state,snapshot(i*.05,200),i*.05);
 assert.equal(actor.foundationSample.clip,'walk');assert.equal(actor.foundationSample.skinPose,undefined);assert.equal(actor.foundationSample.parts,undefined);
 assert.equal(actor.foundationError??null,null);
});

test('sprite proof contains genuine complete eight-facing atlas data and no live-skin or region declaration',()=>{
 assert.equal(manifest.representation,'baked-full-body-sprites');assert.equal(manifest.skin,undefined);assert.equal(manifest.regions,undefined);
 assert.equal(manifest.productionReady,false);assert.equal(manifest.reviewLightingOnly,true);
 assert.equal(manifest.directions.length,8);assert.equal(new Set(manifest.rowSha256.walk).size,8);
 assert.equal(manifest.clips.walk.frames,16);assert.deepEqual(profile.actions,{});
 const hash=path=>createHash('sha256').update(readFileSync(new URL(path,pack))).digest('hex');
 assert.equal(hash('walk.png'),manifest.clips.walk.sha256);assert.equal(hash('profile.json'),manifest.profileSha256);
});

test('an explicit row-switch profile preserves gait phase and starts new facing contacts without missing pivot art',()=>{
 assert.equal(profile.facing.transition,'row');const state=createSpriteAnimationState();
 const first=updateSpriteAnimation(state,profile,{entityId:5,timestamp:0,travel:0,world:{x:0,y:0},direction:'S',moving:true});
 for(const [i,direction] of ['E','N','W','S'].entries()){
  const sample=updateSpriteAnimation(state,profile,{entityId:5,timestamp:(i+1)*.1,travel:0,world:{x:0,y:0},direction,moving:true});
  assert.equal(sample.direction,direction);assert.equal(sample.phase,first.phase);assert.ok(sample.debug.maxSlip<1e-8);
 }
});

test('locomotion chooses the measured source direction instead of an equal-screen-angle label',()=>{
 assert.equal(profile.facing.selection,'projected-motion');const state=createSpriteAnimationState();
 updateSpriteAnimation(state,profile,{entityId:5,timestamp:0,travel:0,world:{x:0,y:0},direction:'NE',moving:true});
 const sample=updateSpriteAnimation(state,profile,{entityId:5,timestamp:.1,travel:3,world:{x:1,y:-2.75},direction:'NE',moving:true});
 assert.equal(sample.direction,'N','The source NE forward vector is about 29 degrees on screen; this observed 70-degree motion is closer to source N.');
});

test('projected locomotion selection does not override a new committed action intent',()=>{
 // This metadata-only action tests ownership, not a rendered claw asset.
 const configured={...profile,actions:{attack:{...profile.locomotion,clip:'test-claw',mode:'fullBody',priority:10,commitUntil:1}}};
 const state=createSpriteAnimationState();
 updateSpriteAnimation(state,configured,{entityId:5,timestamp:0,travel:0,world:{x:0,y:0},direction:'N',moving:true});
 const cue={name:'attack',token:'test-commit',sequence:0};
 const began=updateSpriteAnimation(state,configured,{entityId:5,timestamp:.1,travel:3,world:{x:0,y:-3},direction:'E',moving:true,action:cue});
 assert.equal(began.direction,'E');assert.equal(began.actionToken,cue.token);
 const held=updateSpriteAnimation(state,configured,{entityId:5,timestamp:.2,travel:6,world:{x:0,y:-6},direction:'W',moving:true,action:cue});
 assert.equal(held.direction,'E');assert.equal(held.actionToken,cue.token);
});

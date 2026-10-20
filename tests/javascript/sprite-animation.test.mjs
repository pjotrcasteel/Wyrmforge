import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js',import.meta.url),'utf8');
const {createSpriteAnimationState,updateSpriteAnimation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const profile={locomotion:{clip:'stride',frames:8,stride:20},actions:{
 swipe:{clip:'swipe',frames:12,fps:12,mode:'regions',supportRegion:'body',region:'appendage',priority:10},
 pounce:{clip:'leap',frames:6,fps:6,mode:'fullBody',priority:20},
 death:{clip:'collapse',frames:10,fps:10,mode:'fullBody',priority:100,hold:true}}};
const input=extra=>({deltaSeconds:.1,distance:1,moving:true,direction:'SE',...extra});

test('profile facing turns through neighboring rows while both clips retain phase',()=>{
 const turning={...profile,facing:{directions:['E','SE','S','SW','W','NW','N','NE'],degreesPerSecond:360}};
 const state=createSpriteAnimationState();
 updateSpriteAnimation(state,turning,input({direction:'E',action:{name:'swipe',token:1}}));
 const directions=[];
 for(let i=0;i<5;i++)directions.push(updateSpriteAnimation(state,turning,input({direction:'W',action:{name:'swipe',token:1}})).direction);
 assert.deepEqual(directions,['NE','N','N','NW','W']);
 assert.equal(state.action.token,1);assert.ok(state.sample.frame>=5);assert.ok(state.phase>.29);
 const angle=state.facingAngle;
 updateSpriteAnimation(state,turning,input({direction:'S',frozen:true}));assert.equal(state.facingAngle,angle);assert.equal(state.sample.direction,'W');
});
test('locomotion keeps advancing under an independent moving action and returns without restart',()=>{
 const state=createSpriteAnimationState();
 let sample=updateSpriteAnimation(state,profile,input({action:{name:'swipe',token:1}}));
 assert.equal(sample.layered,true);const phases=[];
 for(let i=0;i<14;i++){sample=updateSpriteAnimation(state,profile,input({}));phases.push(sample.baseFrame);}
 assert.ok(new Set(phases).size>3);assert.equal(sample.clip,'stride');assert.ok(Math.abs(state.phase-.75)<1e-6);
 assert.equal(sample.baseFrame,6);
});
test('direction changes carry phase, frozen/paused clocks stop and duplicate signals do not restart',()=>{
 const state=createSpriteAnimationState();let sample;
 for(let i=0;i<4;i++)sample=updateSpriteAnimation(state,profile,input({action:{name:'swipe',token:1}}));
 const frame=sample.frame,phase=state.phase;
 sample=updateSpriteAnimation(state,profile,input({frozen:true,direction:'NW',action:{name:'swipe',token:1}}));
 assert.equal(sample.frame,frame);assert.equal(state.phase,phase);assert.equal(sample.direction,'NW');
 sample=updateSpriteAnimation(state,profile,input({paused:true}));assert.equal(sample.frame,frame);assert.equal(state.phase,phase);
});
test('a nonhumanoid profile uses head and body regions; stationary and pounce policies keep full poses',()=>{
 const snake={locomotion:{clip:'slither',frames:5,stride:12},actions:{bite:{clip:'bite',frames:4,fps:8,mode:'regions',supportRegion:'coils',region:'head'}}};
 const state=createSpriteAnimationState();const sample=updateSpriteAnimation(state,snake,input({action:{name:'bite',token:4}}));
 assert.equal(sample.baseRegion,'coils');assert.equal(sample.actionRegion,'head');assert.equal(sample.layered,true);
 assert.equal(updateSpriteAnimation(state,snake,input({moving:false,distance:0})).layered,false);
 const leap=updateSpriteAnimation(createSpriteAnimationState(),profile,input({action:{name:'pounce',token:1}}));assert.equal(leap.layered,false);assert.equal(leap.clip,'leap');
});
test('authoritative progress sets action frame while death overrides and holds against lower priorities',()=>{
 const state=createSpriteAnimationState();
 let sample=updateSpriteAnimation(state,profile,input({action:{name:'swipe',token:1,progress:.5}}));assert.equal(sample.frame,6);
 sample=updateSpriteAnimation(state,profile,input({action:{name:'death',token:2}}));assert.equal(sample.clip,'collapse');assert.equal(sample.layered,false);
 for(let i=0;i<20;i++)sample=updateSpriteAnimation(state,profile,input({action:{name:'swipe',token:3}}));
 assert.equal(sample.clip,'collapse');assert.equal(sample.frame,9);
});

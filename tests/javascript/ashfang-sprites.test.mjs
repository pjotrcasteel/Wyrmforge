import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const anim=data(readFileSync(new URL('sprite-animation.js',root),'utf8'));
const rig=data(readFileSync(new URL('rigged-sprites.js',root),'utf8').replace("'./sprite-animation.js'",JSON.stringify(anim)));
const source=readFileSync(new URL('ashfang-sprites.js',root),'utf8').replace("'./rigged-sprites.js'",JSON.stringify(rig)).replace("new URL('../art/ashfang/runtime-001/',import.meta.url)","new URL('https://example.test/art/ashfang/runtime-001/')");
const m=await import(data(source));
const dragon={entityId:7,school:1,x:0,y:0,radius:60,attackElapsed:-1,directionX:1,directionY:0};
const snapshot={dragon,player:{x:100,y:0},hunt:{stage:2},hud:{seconds:1}};
test('C# entrance, phase, cone warning and strike select their own authored motions',()=>{
 const select=s=>m.selectAshfangMotion({...snapshot,...s},null,.05);
 assert.equal(select({hunt:{stage:1,entranceBeat:1}}).hidden,true);
 assert.equal(select({hunt:{stage:1,entranceBeat:2,entranceBeatProgress:.5}}).clip,'fly');
 assert.equal(select({hunt:{stage:1,entranceBeat:3,entranceBeatProgress:.5}}).clip,'land');
 assert.equal(select({hunt:{stage:3,stageProgress:.3}}).clip,'roar');
 const warning=select({dragon:{...dragon,telegraphProgress:.7},dragonBreath:{directionX:0,directionY:-1}});
 assert.equal(warning.clip,'breath_start');assert.equal(warning.progress,.7);assert.equal(warning.direction,'N');
 assert.equal(select({dragon:{...dragon,attackElapsed:.1}}).clip,'breath_loop');
 assert.equal(select({dragon:{...dragon,attackElapsed:.3}}).clip,'breath_end');
 assert.equal(select({dragon:{...dragon,school:2}}),null);
});
test('Movement survives repeated bridge snapshots and pause/freeze preserve the pose',()=>{
 const state=m.createAshfangState();m.updateAshfang(state,snapshot,0);m.updateAshfang(state,{...snapshot,dragon:{...dragon,x:4}},.05);
 assert.equal(state.entity.clip,'walk');m.updateAshfang(state,{...snapshot,dragon:{...dragon,x:4}},.07);assert.equal(state.entity.clip,'walk');
 const pose=JSON.stringify(state.entity);m.updateAshfang(state,{...snapshot,paused:true},.1);assert.equal(JSON.stringify(state.entity),pose);
 m.updateAshfang(state,{...snapshot,dragon:{...dragon,frozen:true}},.15);assert.equal(JSON.stringify(state.entity),pose);
 m.updateAshfang(state,{...snapshot,dragon:{...dragon,x:20}},.2);assert.equal(state.entity.clip,'run');
});
test('Only simulation defeat creates a body; reset and different lineage do not',()=>{
 const state=m.createAshfangState();m.updateAshfang(state,snapshot,0);m.updateAshfang(state,{...snapshot,dragon:null},.1);assert.equal(state.death,null);
 m.updateAshfang(state,{...snapshot,dragon:null,dragonDefeat:{...dragon,health:0}},.2);assert.equal(state.death.id,7);assert.ok(state.death.age>0);
 const age=state.death.age;m.updateAshfang(state,{...snapshot,dragon:null,dragonDefeat:{...dragon,health:0},presentationPaused:true},.3);assert.equal(state.death.age,age);
 m.updateAshfang(state,{...snapshot,dragon:null,dragonDefeat:{...dragon,school:2}},.4);assert.equal(state.death,null);
});

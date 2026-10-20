import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/',import.meta.url);
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const controller=uri(readFileSync(new URL('js/sprite-animation.js',root),'utf8'));
const {createRiggedSpriteRenderer}=await import(uri(readFileSync(new URL('js/rigged-sprites.js',root),'utf8').replace("'./sprite-animation.js'",JSON.stringify(controller))));
const profile=JSON.parse(readFileSync(new URL('art/enemies/ashling-rigged/animation-profile.json',root)));
const renderer=createRiggedSpriteRenderer({kind:2,base:new URL('https://example.test/ashling/'),fallbackProfile:profile});
const snap=(x=20,options={})=>({enemies:[{entityId:7,kind:2,x,y:20,radius:8}],player:{x:200,y:200,radius:9},deathBursts:[],...options});
test('launch preserves planted anchor, carries gait phase and follows target without restarting',()=>{
 const state=renderer.createState();renderer.update(state,snap(20,{player:{x:30,y:20,radius:9}}),0);
 const p=state.entities.get(7),token=p.attackAt;
 for(let i=1;i<=4;i++)renderer.update(state,snap(20+i,{player:{x:20+i,y:5,radius:9}}),i*.05);
 assert.equal(p.clip,'attack');assert.equal(p.drawX,20);assert.ok(p.animation.phase>0);assert.equal(p.attackAt,token);assert.notEqual(p.direction,'E');
 for(let i=5;i<=10;i++)renderer.update(state,snap(20+i),i*.05);
 assert.ok(p.drawX>20);const landed=p.drawX;
 for(let i=11;i<=13;i++)renderer.update(state,snap(20+i),i*.05);
 assert.equal(p.drawX,landed);assert.equal(p.layered,false);
 for(let i=14;i<=22;i++)renderer.update(state,snap(20+i),i*.05);
 assert.equal(p.clip,'walk');assert.equal(p.drawX,p.x);assert.ok(p.animation.phase>0);
});
test('pause and freeze hold action, phase, facing and visible anchor',()=>{
 const state=renderer.createState();renderer.update(state,snap(20,{player:{x:30,y:20,radius:9}}),0);renderer.update(state,snap(22),.1);
 const before=renderer.diagnostics(state).entities;
 renderer.update(state,snap(22,{paused:true}),.2);assert.deepEqual(renderer.diagnostics(state).entities,before);
 const frozen=snap(22);frozen.enemies[0].frozen=true;renderer.update(state,frozen,.3);assert.deepEqual(renderer.diagnostics(state).entities,before);
});
test('authoritative death interrupts launch, holds corpse and survives pause; despawn creates none',()=>{
 const state=renderer.createState();renderer.update(state,snap(),0);renderer.update(state,snap(20,{enemies:[]}),.1);assert.equal(state.corpses.size,0);
 renderer.update(state,snap(),.2);const dead=snap(20,{enemies:[],deathBursts:[{entityId:7,kind:2,x:20,y:20,bodyRadius:8}]});
 for(let i=3;i<28;i++)renderer.update(state,dead,i*.1);
 assert.equal(state.corpses.size,1);assert.equal(renderer.diagnostics(state).corpses[0].frame,27);
 const clock=state.clock;renderer.update(state,{...dead,paused:true},2.8);assert.equal(state.clock,clock);
 renderer.update(state,snap(20,{enemies:[]}),0);assert.equal(state.corpses.size,0);
});
test('runtime atlases preserve approved bytes and consistent native scale with different cells',()=>{
 const m=JSON.parse(readFileSync(new URL('art/enemies/ashling-rigged/manifest.json',root)));
 for(const[name,c]of Object.entries(m.clips)){
  const bytes=readFileSync(new URL('art/enemies/ashling-rigged/'+c.image,root));assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,12),c.hash);
  const animation=name==='walk'?'movement':name;assert.deepEqual(bytes,readFileSync(new URL(`../../${c.sourceExport}/ashling-${animation}.png`,import.meta.url)));
  assert.equal(bytes.readUInt32BE(16),c.cell*c.frames);assert.equal(bytes.readUInt32BE(20),c.cell*8);assert.equal(c.worldSize/c.cell,.85);
  assert.equal(c.anchor[0]-m.clips.walk.anchor[0],(c.cell-96)/2);assert.equal(c.anchor[1]-m.clips.walk.anchor[1],(c.cell-96)/2);
 }
});

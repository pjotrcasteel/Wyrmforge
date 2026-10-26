import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/',import.meta.url);
const moduleUri=name=>'data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('js/'+name,root),'utf8')).toString('base64');
const source=readFileSync(new URL('js/hollow-sprites.js',root),'utf8').replace("new URL('../art/enemies/hollow-rigged/', import.meta.url)","new URL('https://example.test/art/enemies/hollow-rigged/')")
 .replace("'./sprite-animation.js'",JSON.stringify(moduleUri('sprite-animation.js'))).replace("'./sprite-layer-compositor.js'",JSON.stringify(moduleUri('sprite-layer-compositor.js')))
 .replace("'./hollow-injury-variants.js'",JSON.stringify(moduleUri('hollow-injury-variants.js')))
 .replace("'./hollow-arm-variants.js'",JSON.stringify(moduleUri('hollow-arm-variants.js')))
 .replace("'./hollow-motion.js'",JSON.stringify(moduleUri('hollow-motion.js')))
 .replace("'./hollow-variation.js'",JSON.stringify(moduleUri('hollow-variation.js')))
 .replace("'./hollow-death.js'",JSON.stringify(moduleUri('hollow-death.js')))
 .replace("'./hollow-injury-death.js'",JSON.stringify(moduleUri('hollow-injury-death.js')));
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const enemy=(values={})=>({entityId:7,kind:0,x:20,y:20,radius:11,...values});
const snapshot=(values={})=>({enemies:[enemy()],player:{x:200,y:200,radius:9},deathBursts:[],...values});
function advance(state,snap,start,end){for(let t=start;t<=end+.0001;t+=.05)mod.updateHollowSprites(state,snap,t);}

test('all eight real facings and boundary hysteresis, no mirroring',()=>{
 for(const [dx,dy,dir] of [[0,-1,'N'],[1,-1,'NE'],[1,0,'E'],[1,1,'SE'],[0,1,'S'],[-1,1,'SW'],[-1,0,'W'],[-1,-1,'NW']])
  assert.equal(mod.hollowDirection(dx,dy),dir);
 assert.equal(mod.hollowDirection(1,.45,'E'),'E');
 assert.equal(mod.hollowDirection(0,0,'NW'),'NW');
});
test('walk follows travelled distance and survives duplicate render snapshots',()=>{
 const state=mod.createHollowState();mod.updateHollowSprites(state,snapshot(),0);
 const moved=snapshot({enemies:[enemy({x:25})]});mod.updateHollowSprites(state,moved,.05);
 const frame=state.entities.get(7).frame;assert.ok(frame>0);
 mod.updateHollowSprites(state,moved,.066);assert.equal(state.entities.get(7).frame,frame);
 advance(state,moved,.1,.3);assert.equal(state.entities.get(7).frame,state.entities.get(7).idleFrame);
 mod.updateHollowSprites(state,snapshot({enemies:[]}),.35);assert.equal(state.entities.size,0);assert.equal(state.corpses.size,0);
});
test('contact only drives presentation; attack freezes and recovers',()=>{
 const state=mod.createHollowState();const contact=snapshot({player:{x:38,y:20,radius:9}});
 mod.updateHollowSprites(state,contact,0);assert.equal(state.entities.get(7).clip,'attack');assert.equal(state.entities.get(7).direction,'E');
 advance(state,contact,.05,.5);const frame=state.entities.get(7).frame;assert.ok(frame>=5);
 advance(state,{...contact,enemies:[enemy({frozen:true})]},.55,.9);assert.equal(state.entities.get(7).frame,frame);
 advance(state,snapshot(),.95,2);assert.equal(state.entities.get(7).clip,'walk');
 assert.deepEqual(contact.player,{x:38,y:20,radius:9});assert.equal(contact.enemies[0].x,20);
});

test('an active attack follows a changed target direction without restarting',()=>{
 const state=mod.createHollowState();mod.updateHollowSprites(state,snapshot({player:{x:38,y:20,radius:9}}),0);
 advance(state,snapshot({player:{x:38,y:20,radius:9}}),.05,.3);
 const pose=state.entities.get(7),token=pose.attackAt,frame=pose.frame;
 advance(state,snapshot({player:{x:20,y:2,radius:9}}),.35,.6);
 assert.equal(pose.direction,'N');assert.equal(pose.attackAt,token);assert.ok(pose.frame>frame);
 const frozen=snapshot({enemies:[enemy({frozen:true})],player:{x:2,y:20,radius:9}});
 advance(state,frozen,.65,.8);assert.equal(pose.direction,'N');
});
test('only authoritative Hollow deaths collapse then hold before fading; paused clock stops',()=>{
 const state=mod.createHollowState();mod.updateHollowSprites(state,snapshot(),0);
 const death={entityId:7,kind:0,x:20,y:20,bodyRadius:11};
 const dead=snapshot({enemies:[],deathBursts:[death]});advance(state,dead,.05,2.4);
 assert.equal(state.corpses.size,1);assert.ok(mod.hollowDiagnostics(state).corpses[0].age>2);
 assert.equal(mod.hollowDiagnostics(state).corpses[0].frame,23);
 const age=state.clock;advance(state,{...dead,paused:true},2.45,3);assert.equal(state.clock,age);
 advance(state,snapshot({enemies:[]}),3.05,5);assert.equal(state.corpses.size,0);
});
test('packed runtime assets preserve approved source bytes and cache hashes',()=>{
 const m=JSON.parse(readFileSync(new URL('art/enemies/hollow-rigged/manifest.json',root)));
 for(const [name,c] of Object.entries(m.clips)){
  const png=readFileSync(new URL('art/enemies/hollow-rigged/'+c.image,root));
  assert.equal(png.readUInt32BE(16),c.cell*c.frames);assert.equal(png.readUInt32BE(20),c.cell*8);
  assert.equal(createHash('sha256').update(png).digest('hex').slice(0,12),c.hash);
  const revision=name==='walk'?'movement-eight-directions-v1':name==='attack'?'attack-eight-directions-v2':'death-eight-directions-v4';
  const file=name==='walk'?'hollow-movement.png':`hollow-${name}.png`;
  assert.deepEqual(png,readFileSync(new URL(`../../art/source/enemies/hollow/rigged-poc/exports/${revision}/${file}`,import.meta.url)));
  assert.equal(c.worldSize/c.cell,93/96);
 }
});
test('stable injury appearance is presentation-only and survives attack, death and pause',()=>{
 const state=mod.createHollowState();
 const injury=enemy({entityId:4});
 mod.updateHollowSprites(state,snapshot({enemies:[injury]}),0);
 assert.equal(state.entities.get(4).injuryVariant,'broken-leg-left');
 assert.equal(state.entities.get(4).deathInjury,'broken-leg-left');
 const position={x:injury.x,y:injury.y,radius:injury.radius};
 const contact=snapshot({enemies:[injury],player:{x:38,y:20,radius:9}});
 mod.updateHollowSprites(state,contact,.05);
 assert.equal(state.entities.get(4).clip,'attack');
 assert.equal(state.entities.get(4).injuryVariant,'broken-leg-left');
 advance(state,contact,.1,.4);
 const p=state.entities.get(4);
 const frame=p.frame;
 mod.updateHollowSprites(state,{...contact,enemies:[{...injury,frozen:true}]},.45);
 assert.equal(p.frame,frame);
 advance(state,snapshot({enemies:[injury]}),.5,2);
 assert.equal(p.clip,'walk');
 assert.deepEqual(position,{x:20,y:20,radius:11});
 const killed=snapshot({enemies:[],deathBursts:[{entityId:4,kind:0,x:20,y:20,bodyRadius:11}]});
 // Corpse must retain the actual injured silhouette after the live actor despawns.

 mod.updateHollowSprites(state,killed,2.05);
 assert.equal(mod.hollowDiagnostics(state).corpses.length,1);
});

test('nearest-neighbor renderer selects an actual direction row and original pivot',async()=>{
 const m=JSON.parse(readFileSync(new URL('art/enemies/hollow-rigged/manifest.json',root)));
 const originalFetch=globalThis.fetch,originalImage=globalThis.Image;
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('layers.json')?JSON.parse(readFileSync(new URL('art/enemies/hollow-rigged/layers.json',root))):String(url).endsWith('animation-profile.json')?JSON.parse(readFileSync(new URL('art/enemies/hollow-rigged/animation-profile.json',root))):m});
 globalThis.Image=class {set src(url){const c=Object.values(m.clips).find(c=>url.includes(c.image));this.naturalWidth=c.cell*c.frames;this.naturalHeight=c.cell*8;queueMicrotask(()=>this.onload());}};
 try{
  assert.equal(await mod.preloadHollowSprites(),true);
  const state=mod.createHollowState();mod.updateHollowSprites(state,snapshot(),0);state.entities.get(7).direction='NW';
  const calls=[];const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args);}};
  assert.equal(mod.drawHollowEnemy(ctx,enemy(),state),true);assert.equal(ctx.imageSmoothingEnabled,false);
  assert.equal(calls[0][2],96*7);assert.ok(Math.abs(calls[0][6]-(20-72/96*93*state.entities.get(7).visualScale))<1e-9);
  assert.equal(mod.drawHollowEnemy(ctx,enemy({kind:1}),state),false);
 }finally{globalThis.fetch=originalFetch;globalThis.Image=originalImage;}
});

test('every Hollowed uses a source-derived no-cape atlas for walk/attack and the corpse never reverts to cape',async()=>{
 const originals={fetch:globalThis.fetch,Image:globalThis.Image};
 const basePath='art/enemies/hollow-rigged/';
 const baseManifest=JSON.parse(readFileSync(new URL(basePath+'manifest.json',root)));
 const armsManifest=JSON.parse(readFileSync(new URL(basePath+'arms/manifest.json',root)));
 const injuriesManifest=JSON.parse(readFileSync(new URL(basePath+'injuries/manifest.json',root)));
 const layers=JSON.parse(readFileSync(new URL(basePath+'layers.json',root)));
 const animationProfile=JSON.parse(readFileSync(new URL(basePath+'animation-profile.json',root)));
 try {
  globalThis.fetch=async url=>{
   const path=String(url);
   const data=path.includes('/arms/')?armsManifest:path.includes('/injuries/')?injuriesManifest:
    path.endsWith('layers.json')?layers:path.endsWith('animation-profile.json')?animationProfile:baseManifest;
   return {ok:true,json:async()=>data};
  };
  globalThis.Image=class {
   set src(url){
    this.url=String(url);
    const path=this.url;
    const clips=path.includes('/arms/')?Object.values(armsManifest.clips).flatMap(x=>Object.values(x)):
     path.includes('/injuries/')?Object.values(injuriesManifest.clips):Object.values(baseManifest.clips);
    const entry=clips.find(x=>path.includes('/'+x.image+'?'));
    assert.ok(entry,'unexpected sprite source: '+path);
    this.naturalWidth=entry.cell*entry.frames;this.naturalHeight=entry.cell*8;
    queueMicrotask(()=>this.onload());
   }
  };
  const isolated=await import('data:text/javascript;base64,'+Buffer.from(source+String.fromCharCode(10)+'// no-cape regression').toString('base64'));
  assert.equal(await isolated.preloadHollowSprites(),true);
  assert.equal(isolated.hollowDiagnostics(isolated.createHollowState()).capeFreeReady,true);
  for(let id=0;id<12;id++){
   const e=enemy({entityId:id});
   const state=isolated.createHollowState();
   isolated.updateHollowSprites(state,snapshot({enemies:[e]}),0);
   const calls=[];
   const ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args);}};
   assert.equal(isolated.drawHollowEnemy(ctx,e,state),true);
   assert.equal(calls.length,1);
   assert.ok(calls[0][0].url.includes('/arms/')||calls[0][0].url.includes('/injuries/'),'caped base atlas used');
   state.entities.get(id).clip='attack';
   assert.equal(isolated.drawHollowEnemy(ctx,e,state),true);
   assert.ok(calls[1][0].url.includes('/arms/')||calls[1][0].url.includes('/injuries/'),'caped base attack used');
   isolated.updateHollowSprites(state,snapshot({enemies:[],deathBursts:[{entityId:id,kind:0,x:20,y:20,bodyRadius:11}]}),.1);
   isolated.drawHollowCorpses(ctx,state);
   assert.ok(calls[2][0].url.includes('/arms/'),'caped death atlas used');
  }
 } finally {globalThis.fetch=originals.fetch;globalThis.Image=originals.Image;}
});

test('a real Hollow death renders authored 3D frames, not a rotated walking sprite, in all facings',async()=>{
 const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
 const artPath=name=>new URL('art/enemies/hollow-rigged/'+name,root);
 const base=JSON.parse(readFileSync(artPath('manifest.json')));
 const arms=JSON.parse(readFileSync(artPath('arms/manifest.json')));
 const injury=JSON.parse(readFileSync(artPath('injuries/manifest.json')));
 const death=JSON.parse(readFileSync(artPath('death/manifest.json')));
 const layers=JSON.parse(readFileSync(artPath('layers.json')));
 const animation=JSON.parse(readFileSync(artPath('animation-profile.json')));
 try{
  globalThis.fetch=async url=>{
   const path=String(url);
   const body=path.includes('/arms/')?arms:path.includes('/injuries/')?injury:
    path.includes('/death/')?death:path.endsWith('layers.json')?layers:
    path.endsWith('animation-profile.json')?animation:base;
   return {ok:true,json:async()=>body};
  };
  globalThis.Image=class {
   set src(url){
    this.url=String(url);
    const path=this.url;
    const clips=path.includes('/arms/')?Object.values(arms.clips).flatMap(x=>Object.values(x)):
     path.includes('/injuries/')?Object.values(injury.clips):
     path.includes('/death/')?Object.values(death.clips).map(c=>({...c,cell:death.cell,frames:death.frames})):Object.values(base.clips);
    const clip=clips.find(c=>path.includes('/'+c.image+'?'));
    assert.ok(clip,'unexpected clip URL: '+path);
    this.naturalWidth=clip.cell*clip.frames;
    this.naturalHeight=clip.cell*8;
    queueMicrotask(()=>this.onload());
   }
  };
  const isolated=await import('data:text/javascript;base64,'+
    Buffer.from(source+String.fromCharCode(10)+'// skeletal death integration').toString('base64'));
  assert.equal(await isolated.preloadHollowSprites(),true);
  assert.equal(isolated.hollowDiagnostics(isolated.createHollowState()).skeletalDeathReady,true);
  for(const facing of ['N','NE','E','SE','S','SW','W','NW']){
   const e=enemy({entityId:128,x:20,y:20});
   const state=isolated.createHollowState();
   isolated.updateHollowSprites(state,snapshot({enemies:[e]}),0);
   state.entities.get(128).direction=facing;
   const dead=snapshot({enemies:[],deathBursts:[{entityId:128,kind:0,x:20,y:20,bodyRadius:11}]});
   isolated.updateHollowSprites(state,dead,.05);
   const calls=[];
   const ctx={globalAlpha:1,save(){},restore(){},rotate(){throw Error('death must use skeletal frames');},
    translate(){throw Error('death must not move with 2D transforms');},
    drawImage(...values){calls.push(values);}};
   isolated.drawHollowCorpses(ctx,state);
   assert.equal(calls.length,1);
   assert.ok(calls[0][0].url.includes('/death/'+death.clips[isolated.hollowDiagnostics(state).corpses[0].deathVariant].image+'?'),
    'must draw selected 3D death clip');
   assert.equal(calls[0][1],0);
   assert.equal(calls[0][2],death.directions.indexOf(facing)*128);
   isolated.updateHollowSprites(state,{...dead,deathBursts:[]},1.05);
   isolated.drawHollowCorpses(ctx,state);
   assert.ok(calls.at(-1)[1]>0,'death pose must advance with time');
  }
 }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

// Adapter lifecycle tests with a ready-asset test double; not rendered art proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const uri=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const profile=JSON.parse(readFileSync(new URL('../fixtures/animation/travel-grid-source.json',import.meta.url),'utf8'));
profile.actions.attack=profile.actions.strike;delete profile.actions.strike;
const stub=uri(`export function createCreatureAnimationAssets(){return {ready:()=>true,get manifest(){return globalThis.__anRegionUpdate?{regions:{maxCorrectionMetres:.02}}:{};},updateRegions(state,sample,intent){return globalThis.__anRegionUpdate(state,sample,intent);},profile:${JSON.stringify(profile)},draw:()=>false};}`);
const source=readFileSync(new URL('hollow-sprites.js',root),'utf8')
 .replace(/new URL\('\.\.\/art\/[^']+',\s*import.meta.url\)/g,"new URL('https://example.test/')")
 .replace(/from '(\.\/[^']+)'/g,(_,path)=>'from '+JSON.stringify(path==='./creature-animation-assets.js'?stub:uri(readFileSync(new URL(path,root),'utf8'))));
const previous=globalThis.location;globalThis.location={search:'?animationFoundation=1'};
const mod=await import(uri(source));globalThis.location=previous;
const snapshot=(time,extra={})=>({simulationTimeSeconds:time,hud:{seconds:Math.floor(time)},enemies:[{entityId:5,kind:0,x:0,y:0,radius:11}],player:{x:8,y:0,radius:9},...extra});
const pose=state=>state.entities.get(5).foundationSample;
test('candidate cue uses C# sample time and cannot restart from duplicate render samples or legacy age',()=>{
 const s=mod.createHollowState();mod.updateHollowSprites(s,snapshot(0),0);const token=pose(s).actionToken;
 for(let i=1;i<=20;i++)mod.updateHollowSprites(s,snapshot(.1),i*.1);
 assert.equal(pose(s).actionToken,token);assert.ok(Math.abs(pose(s).actionProgress-.075)<1e-12);
 mod.updateHollowSprites(s,snapshot(1.4),2.1);assert.equal(pose(s).actionToken,null);
 mod.updateHollowSprites(s,snapshot(1.45),2.2);assert.notEqual(pose(s).actionToken,token);
});
test('freeze/resume and a crossing target preserve the same committed visual cue without changing snapshot facts',()=>{
 const s=mod.createHollowState();mod.updateHollowSprites(s,snapshot(0),0);mod.updateHollowSprites(s,snapshot(.1),.1);const token=pose(s).actionToken,progress=pose(s).actionProgress;
 const frozen=snapshot(.8,{enemies:[{entityId:5,kind:0,x:0,y:0,radius:11,frozen:true}],player:{x:-8,y:0,radius:9}}),copy=structuredClone(frozen);
 mod.updateHollowSprites(s,frozen,.8);assert.equal(pose(s).actionProgress,progress);assert.deepEqual(frozen,copy);
 mod.updateHollowSprites(s,snapshot(.9,{player:{x:-8,y:0,radius:9}}),.9);assert.equal(pose(s).actionProgress,progress);
 mod.updateHollowSprites(s,snapshot(1,{player:{x:-8,y:0,radius:9}}),1);assert.equal(pose(s).actionToken,token);assert.equal(pose(s).direction,'E');assert.ok(pose(s).actionProgress>progress);
});

test('actual adapter wires C# sample placement to regional support and exposes failure without restarting its action',t=>{
 t.after(()=>delete globalThis.__anRegionUpdate);
 const calls=[];globalThis.__anRegionUpdate=(state,sample,intent)=>{calls.push({state,sample,intent});return sample;};
 const s=mod.createHollowState();mod.updateHollowSprites(s,snapshot(0),0);
 const token=pose(s).actionToken;
 mod.updateHollowSprites(s,snapshot(.1),.1);
 assert.equal(calls.length,2);assert.equal(calls[0].state,calls[1].state);assert.equal(calls[1].intent.timestamp,.1);assert.deepEqual(calls[1].intent.world,{x:0,y:0});assert.equal(calls[1].intent.maxCorrection,.02);
 globalThis.__anRegionUpdate=()=>{throw new RangeError('Unreachable source support');};
 mod.updateHollowSprites(s,snapshot(.2),.2);assert.equal(pose(s),null);assert.match(s.entities.get(5).foundationError,/Unreachable source support/);
 globalThis.__anRegionUpdate=(state,sample)=>sample;
 mod.updateHollowSprites(s,snapshot(.3),.3);assert.equal(pose(s).actionToken,token);assert.equal(s.entities.get(5).foundationError,null);
});

// Actual baked-profile adapter lifecycle; image/renderer proof is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const pack=new URL('../art/review/animation-foundation-sprite-walk/',root);
const profile=JSON.parse(readFileSync(new URL('profile.json',pack),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('manifest.json',pack),'utf8'));
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

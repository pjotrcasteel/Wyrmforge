import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=readFileSync(new URL('creature-animation-assets.js',root),'utf8')
 .replace("'./sprite-animation.js'",JSON.stringify(uri(readFileSync(new URL('sprite-animation.js',root),'utf8'))))
 .replace("'./lighting/lit-sprite.js'",JSON.stringify(uri(readFileSync(new URL('lighting/lit-sprite.js',root),'utf8'))));
const {createCreatureAnimationAssets:create}=await import(uri(source));
const bytes=new Uint8Array([1,2,3]),hash=createHash('sha256').update(bytes).digest('hex');
const profile=JSON.parse(readFileSync(new URL('../fixtures/animation/generic-quadruped.json',import.meta.url),'utf8'));
const item={image:'rest.png',sha256:hash,cell:32,frames:2,worldSize:32,anchor:[16,24]};
const manifest={schemaVersion:2,directions:['N','NE','E','SE','S','SW','W','NW'],clips:{rest:item},sourceSignature:'fixture'};
function mock(t,change=()=>{},fixtureProfile=profile){
 const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
 const m=structuredClone(manifest);change(m);
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('profile')?structuredClone(fixtureProfile):m,arrayBuffer:async()=>bytes.buffer});
 globalThis.Image=class{naturalWidth=64;naturalHeight=256;set src(value){if(value)queueMicrotask(()=>this.onload());}};
 t.after(()=>{globalThis.fetch=oldFetch;globalThis.Image=oldImage;});return m;
}
test('non-Hollowed 2-frame/32px profile loads atomically and exposes existing lighting frame binding',async t=>{
 mock(t);const a=create(new URL('https://example.test/'));assert.equal(await a.preload(),true);
 assert.equal(a.stats.textures,1);assert.equal(a.stats.decodedBytes,64*256*4);
 const render=a.renderDescriptor({clip:'rest',frame:1,direction:'S'});assert.deepEqual(render.frame.repeat,[.5,.125]);assert.equal(render.productionAccepted,false);
 a.dispose();assert.equal(a.ready(),false);assert.equal(a.stats.textures,0);
});
test('tampered bytes fail without publishing a partly loaded pack and retain meaningful error',async t=>{
 mock(t,m=>m.clips.rest.sha256='0'.repeat(64));const a=create(new URL('https://example.test/'));
 assert.equal(await a.preload(),false);assert.equal(a.ready(),false);assert.match(a.error,/hash mismatch/);
});
test('profile mismatch and memory budget fail before decoding',async t=>{
 const m=mock(t,m=>m.clips.rest.frames=3);const a=create(new URL('https://example.test/'));assert.equal(await a.preload(),false);assert.match(a.error,/Profile\/atlas mismatch/);
 m.clips.rest.frames=2;const b=create(new URL('https://example.test/'),{maxDecodedBytes:1});assert.equal(await b.preload(),false);assert.match(b.error,/budget/);
});
test('cropped multi-row atlas loads and draws at the original source pixel scale and anchor',async t=>{
 mock(t,m=>Object.assign(m.clips.rest,{columns:1,crop:[4,2,28,30]}));
 globalThis.Image=class{naturalWidth=24;naturalHeight=448;set src(value){if(value)queueMicrotask(()=>this.onload());}};
 const a=create(new URL('https://example.test/'));assert.equal(await a.preload(),true);assert.equal(a.stats.decodedBytes,24*448*4);
 const sample={clip:'rest',frame:1,direction:'S',rootOffset:{x:1,y:2}};
 const draw=[];const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){draw.push(args.slice(1));}};
 assert.equal(a.draw(ctx,sample,100,200,11),true);assert.deepEqual(draw[0],[0,252,24,28,89,180,24,28]);
 assert.deepEqual(a.renderDescriptor(sample).frame,{offset:[0,.375],repeat:[1,1/16]});
});

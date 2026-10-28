import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteLayerCompositor} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-layer-compositor.js';
function setup(t,maxTiles=2){
 const previous=globalThis.Path2D;globalThis.Path2D=class{rect(){}};t.after(()=>{globalThis.Path2D=previous;});
 const calls=[];const frame={attachment:[8,8],regions:{torso:[[1,2,3]],shin:[[8,4,2]],foot:[[12,5,3]]}};
 const metadata={canvasSize:16,directions:['S'],clips:{walk:{S:[frame,frame]}}};
 const ctx={clearRect(){},save(){},restore(){},clip(){},translate(){},transform(...args){calls.push(['transform',...args]);},drawImage(...args){calls.push(['source',...args.slice(1)]);}};
 const makeCanvas=()=>({getContext:()=>ctx});
 const compositor=createSpriteLayerCompositor(metadata,{walk:{cell:16,frames:2}},new Map([['walk',{}]]),{maxTiles,makeCanvas});
 const part=(region,transform=[1,0,0,1,0,0])=>({clip:'walk',frame:1,direction:'S',region,transform});
 return {compositor,calls,part};
}
test('one compositor renders source-bound semantic parts in supplied depth order and caches transforms',t=>{
 const {compositor:c,calls,part}=setup(t);
 const pose={parts:[part('foot',[1,0,0,1,2,-1]),part('shin'),part('torso')]};
 const tile=c.compose(pose);assert.equal(calls.length,6);assert.deepEqual(calls[0],['transform',1,0,0,1,2,-1]);
 assert.equal(c.compose(structuredClone(pose)),tile);assert.equal(calls.length,6);assert.equal(c.stats.hits,1);
 pose.parts[0].transform[4]=3;c.compose(pose);assert.equal(c.stats.misses,2);assert.equal(c.stats.tiles,2);
 pose.parts[0].transform[4]=4;c.compose(pose);assert.equal(c.stats.evictions,1);assert.equal(c.stats.allocatedTiles,2);assert.equal(c.estimatedBytes(),2*16*16*4);
});
test('semantic part rendering rejects singular/reflected transforms, absent regions and absent source frames',t=>{
 const {compositor:c,part}=setup(t);
 for(const transform of [[0,0,0,0,0,0],[-1,0,0,1,0,0],[1,0,0,1,Infinity,0],[1]])assert.throws(()=>c.compose({parts:[part('foot',transform)]}),/transform/);
 assert.throws(()=>c.compose({parts:[part('ghost-hand')]}),/Unknown sprite region/);
 assert.throws(()=>c.compose({parts:[{...part('foot'),frame:99}]}),/source pose/);
 assert.throws(()=>c.compose({parts:[]}),/nonempty/);
});
test('legacy two-region samples retain shared attachment join and full-pose cache behavior',t=>{
 const {compositor:c,calls}=setup(t);const pose={direction:'S',baseClip:'walk',baseFrame:0,clip:'walk',frame:1,baseRegion:'shin',actionRegion:'torso',useBasePose:false};
 c.compose(pose);assert.equal(calls.filter(x=>x[0]==='source').length,2);
 c.compose({...pose,useBasePose:true});assert.equal(calls.filter(x=>x[0]==='source').length,3);
});
test('invalid part leaves the existing cache and canvas state untouched',t=>{
 const {compositor:c,calls,part}=setup(t,1),pose={parts:[part('torso')]};const tile=c.compose(pose),before=structuredClone(c.stats),n=calls.length;
 assert.throws(()=>c.compose({parts:[part('foot'),part('ghost-hand')]}),/Unknown sprite region/);
 assert.deepEqual(c.stats,before);assert.equal(calls.length,n);assert.equal(c.compose(pose),tile);
});
test('complete unchanged source regions draw original pixels once; partial sets cannot restore an absent region',t=>{
 const previous=globalThis.Path2D;globalThis.Path2D=class{rect(){}};t.after(()=>{globalThis.Path2D=previous;});
 let draws=0;const frame={completeRegions:['body','foot'],regions:{body:[],foot:[]}},ctx={clearRect(){},save(){},restore(){},clip(){},transform(){},drawImage(){draws++;}};
 const c=createSpriteLayerCompositor({canvasSize:16,directions:['S'],clips:{rest:{S:[frame]}}},{rest:{cell:16,frames:1}},new Map([['rest',{}]]),{makeCanvas:()=>({getContext:()=>ctx})});
 const part=region=>({clip:'rest',frame:0,direction:'S',region,transform:[1,0,0,1,0,0]});
 c.compose({parts:[part('body'),part('foot')]});assert.equal(draws,1);
 c.compose({parts:[part('body')]});assert.equal(draws,2);
 c.compose({parts:[part('body'),part('body')]});assert.equal(draws,4,'a duplicate is not a complete body/foot set');
});

test('cropped atlas rectangles retain their original padded region coordinates and native pixel scale',t=>{
 const previous=globalThis.Path2D;globalThis.Path2D=class{rect(){}};t.after(()=>{globalThis.Path2D=previous;});
 const calls=[],ctx={clearRect(){},save(){},restore(){},clip(){},transform(){},drawImage(...args){calls.push(args.slice(1));}};
 const frame={regions:{foot:[[20,30,4]]}};
 const c=createSpriteLayerCompositor({canvasSize:128,directions:['S'],clips:{walk:{S:[frame]}}},{walk:{cell:96,frames:1}},new Map([['walk',{}]]),{makeCanvas:()=>({getContext:()=>ctx}),sourceRectangle:()=>({source:[0,0,48,64],destination:[40,32,48,64]})});
 c.compose({parts:[{clip:'walk',frame:0,direction:'S',region:'foot',transform:[1,0,0,1,0,0]}]});
 assert.deepEqual(calls,[[0,0,48,64,40,32,48,64]]);
});

test('world cancellation noise reuses semantic cache while actual source-pixel corrections stay distinct',t=>{
 const {compositor:c,calls,part}=setup(t),pose={parts:[part('foot',[1,0,0,1,.1,.2])]};
 const tile=c.compose(pose),count=calls.length;
 assert.equal(c.compose({parts:[part('foot',[1+1e-13,0,0,1,.1+1e-13,.2])]}),tile);assert.equal(calls.length,count);
 c.compose({parts:[part('foot',[1,0,0,1,.1+1/256,.2])]});assert.ok(calls.length>count);
});

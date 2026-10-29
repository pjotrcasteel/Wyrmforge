import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/ashfang-vfx.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const dragon={school:1,x:100,y:200,directionX:1,directionY:0,action:'breath',actionPhase:'strike',actionProgress:.4,flightStage:'ground'};
const sockets={mouth:{x:180,y:175}};
test('Mouth fire follows actual committed cone and socket, with preparation/recovery separated',()=>{
 const fire=m.ashfangFirePlan({dragon},sockets);assert.deepEqual(fire.mouth,sockets.mouth);assert.deepEqual(fire.end,{x:440,y:200});assert.equal(fire.range,340);assert.equal(fire.halfAngle,.4);
 for(const stage of ['windup','recover'])assert.equal(m.ashfangFirePlan({dragon:{...dragon,actionPhase:stage}},sockets).stage,stage);
 assert.equal(m.ashfangFirePlan({dragon:{...dragon,action:'claw_right'}},sockets),null);
 assert.equal(m.ashfangFirePlan({dragon:{...dragon,flightStage:'overhead'}},sockets),null);
 assert.equal(m.ashfangFirePlan({dragon:{...dragon,frozen:true}},sockets),null);
 assert.equal(m.ashfangFirePlan({dragon},null),null);
});
test('Rendering effects does not advance snapshots; reduced motion preserves exact warning boundaries',()=>{
 const draws=[];const ctx={globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1,save(){},restore(){},beginPath(){},arc(...a){draws.push(['arc',...a]);},fill(){},stroke(){},fillRect(){},moveTo(){},lineTo(){},closePath(){},createRadialGradient(){return {addColorStop(){}};}};
 const s={dragon,ashfangEffects:[{id:7,kind:'meteor',x:80,y:100,radius:48,progress:.1}],huntHazards:[{x:80,y:100,radius:48,progress:.7,fromAbove:true,armed:true}]};const original=JSON.stringify(s);
 for(const reduced of [false,true]){m.drawAshfangWarning(ctx,s.huntHazards[0],reduced);m.drawAshfangGroundEffects(ctx,s,reduced);m.drawAshfangAirEffects(ctx,{...s,dragon:{...dragon,action:"claw_right"}},sockets,reduced);}
 assert.equal(JSON.stringify(s),original);assert(draws.every(a=>a[3]===48));assert.equal(m.ashfangVfxDiagnostics(s,sockets).rainWarnings,1);assert.equal(m.ashfangVfxDiagnostics(s,sockets).effects,1);
});

test('fire raster uses stable ember ramps and advects coherently without repeated vector diamonds',()=>{
 const a=m.ashfangFlameRaster(3),b=m.ashfangFlameRaster(3),c=m.ashfangFlameRaster(4);
 assert.deepEqual(a.pixels,b.pixels);assert.notDeepEqual(a.pixels,c.pixels);
 assert(a.width<128&&a.height<128);let visible=0,empty=0;
 const allowed=new Set(['116,55,52','190,96,60','222,128,63','239,167,78','243,206,120','247,228,172']);
 for(let i=0;i<a.pixels.length;i+=4)if(a.pixels[i+3]){visible++;assert(allowed.has([...a.pixels.slice(i,i+3)].join(',')));}else empty++;
 assert(visible>500&&empty>500,'fire has a connected plume with readable dark gaps');
});

// Repeatable Node microbenchmark, not a phone/rendering performance claim.
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const file=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js',import.meta.url);
const {createSpriteAnimationState:create,updateSpriteAnimation:update}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(file)).toString('base64'));
const p=JSON.parse(readFileSync(process.argv[2],'utf8'));
const count=Number(process.argv[3]??500),frames=600;
function run(profile){
 const states=Array.from({length:count},()=>create());
 const input={timestamp:0,travel:0,world:{x:0,y:0},deltaSeconds:1/60,distance:0,moving:false,direction:'S'};
 for(let i=0;i<count;i++){input.entityId=i;update(states[i],profile,input);}
 global.gc?.();const heap=process.memoryUsage().heapUsed,times=[];
 for(let f=1;f<=frames;f++){
  input.timestamp=f/60;
  const start=performance.now();
  for(let i=0;i<count;i++){input.entityId=i;update(states[i],profile,input);}
  times.push(performance.now()-start);
 }
 global.gc?.();times.sort((a,b)=>a-b);
 return {actors:count,frames,meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[Math.floor(times.length*.95)],retainedHeapDelta:process.memoryUsage().heapUsed-heap};
}
const v1={locomotion:{clip:'walk',frames:16,stride:p.locomotion.stride},actions:{}};
console.log(JSON.stringify({environment:'Node CPU only; stationary contact sampling; no GPU/cache/phone claim',baseline:run(v1),contactV2:run(p)},null,2));

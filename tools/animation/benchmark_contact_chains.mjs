// CPU-only sparse chain cost; not a phone/GPU/full-renderer acceptance result.
import {performance} from 'node:perf_hooks';
import {solveTwoBoneContact} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js';
const actors=500,chains=Array.from({length:actors*2},()=>({input:{root:[0,0,0],target:[.15,0,-.3],pole:[0,-.4,-.1],upperLength:.25,lowerLength:.23,limits:[8,145]},output:{middle:[0,0,0],flexDegrees:0}}));
const frames=600,times=[];
for(let f=0;f<frames;f++){
 const start=performance.now();
 for(let i=0;i<chains.length;i++){const {input,output}=chains[i];input.target[0]=.15+.03*Math.sin(f/60+i/100);solveTwoBoneContact(input,output);}
 times.push(performance.now()-start);
}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({environment:'Node CPU only; two sparse chains per actor; validation included; pooled outputs; no mobile/rendering claim',actors,chainsPerActor:2,frames,meanMs:times.reduce((a,b)=>a+b)/frames,p95Ms:times[Math.floor(frames*.95)]},null,2));

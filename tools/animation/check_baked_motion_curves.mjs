import fs from 'node:fs';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';
const p=validateCreatureRigProfile(JSON.parse(fs.readFileSync(process.argv[2]+'/profile.json')));
const results=[];
for(const rate of [.1,.3,.6,1.2,2.4])for(const hz of [15,30,60,120])for(const speed of [30,60]){
 const state=createSpriteAnimationState();let x=0,y=0,maxSlip=0,switches=0,last=null;
 for(let i=0;i<=hz*8;i++){
  const t=i/hz,v={x:Math.cos(t*rate)*speed,y:Math.sin(t*rate)*speed};
  if(i){x=speed/rate*Math.sin(t*rate);y=speed/rate*(1-Math.cos(t*rate));}
  const s=updateSpriteAnimation(state,p,{entityId:1,timestamp:t,travel:speed*t,world:{x,y},velocity:v,direction:'E',moving:true});
  maxSlip=Math.max(maxSlip,s.debug.maxSlip);const key=s.clip+':'+s.direction;if(last&&last!==key)switches++;last=key;
 }
 results.push({rate,hz,speed,maxNativeSlip:maxSlip/p.unitsPerPixel,switches});
}
console.log(JSON.stringify({runtimeAccepted:false,measurement:'source markers on curved C#-style root paths; not raster proof',results},null,2));
if(results.some(r=>r.maxNativeSlip>1))process.exitCode=1;

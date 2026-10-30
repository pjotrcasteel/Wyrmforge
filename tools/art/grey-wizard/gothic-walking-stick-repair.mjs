// Source repair: complete hanging sleeve and explicitly paint occluded robe strip.
import {project as old,poses,idle,transform as oldTransform,sourceContacts,staffPoint,staffGrip} from './gothic-walking-stick-project.mjs';
export {poses,idle,sourceContacts};
export const project={...old,id:'grey-wizard-fire-southeast-walking-stick-v008',outputDirectory:'gothic-southeast-v008-repair',
 cleanIslandsMaxPixels:6,
 masks:old.masks.map(m=>m.name==='arm-staff'?{name:m.name,polygon:[[66,46],[75,48],[78,55],[75,68],[71,80],[65,96],[59,97],[52,93],[49,83],[49,69],[50,59],[58,51]]}:m),
 underpaint:[{name:'robe-under-staff',polygon:[[55,70],[65,70],[66,121],[59,127],[54,111]],owner:'staff',sampleOffset:[7,0]}],
 drawOrder:['robe-under-staff',...old.drawOrder],
 status:'repair of rejected v007 sleeve/occlusion artifacts; source review only'};
const clamp=x=>Math.max(0,Math.min(1,x));
export function transform(name,x,y,p){
 if(name==='arm-staff'){
  const q=oldTransform('torso',x,y,p),grip=staffPoint(...staffGrip,p),base=oldTransform('torso',...staffGrip,p);
  const blend=clamp((75-x)/17)*(y<=64?clamp((y-47)/17):clamp((96-y)/32));
  return [q[0]+(grip[0]-base[0])*blend,q[1]+(grip[1]-base[1])*blend];
 }
 return oldTransform(name==='robe-under-staff'?'cloak-left':name,x,y,p);
}

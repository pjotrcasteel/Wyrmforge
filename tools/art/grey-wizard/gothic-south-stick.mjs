// South-view walking-stick source authoring. No runtime physics/game authority.
import {project as old,poses as oldPoses} from './gothic-project.mjs';
export const project={...old,id:'grey-wizard-fire-south-walking-stick-v010',outputDirectory:'gothic-south-v010-stick',cleanIslandsMaxPixels:6,
 masks:old.masks.map(m=>m.name==='arm-staff'?{name:m.name,polygon:[[20,33],[27,36],[28,48],[24,66],[22,85],[16,98],[9,100],[6,90],[6,72],[5,60],[9,46],[16,36]]}:m),
 underpaint:[{name:'sleeve-under-staff',polygon:[[8,60],[16,60],[16,81],[8,81]],owner:'staff',sampleOffset:[8,0]},
 {name:'robe-under-staff',polygon:[[10,82],[16,82],[16,110],[10,110]],owner:'staff',sampleOffset:[8,0]}],
 drawOrder:['sleeve-under-staff','robe-under-staff',...old.drawOrder],
 status:'south walking-stick source review; live locomotion/material/phone acceptance open'};
// Tip dy, projected shaft angle; plant7..15 stays at y152 under root[0,2i].
export const staffKeys=[[-11,-.02],[-13,-.015],[-13,-.01],[-10,0],[-6,.01],[0,.02],[6,.02],[8,.02],
 [6,.015],[4,.01],[2,.005],[0,0],[-2,-.005],[-4,-.01],[-6,-.015],[-8,-.02]];
export const poses=oldPoses.map((p,i)=>{const q=[...p];q[9]=0;q[10]=0;if(i>=8){q[0]-=.3;q[1]-=.15;}return [...q,...staffKeys[i]];});
export const idle=Array(15).fill(0);
const clamp=x=>Math.max(0,Math.min(1,x));
const rotate=(x,y,cx,cy,a)=>{const dx=x-cx,dy=y-cy;return [cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a)];};
export const staffTip=[13.5,130],staffGrip=[11,52];
export function staffPoint(x,y,p){const q=rotate(x,y,...staffTip,p[14]??0);return [q[0],q[1]+(p[13]??0)];}
export function transform(name,x,y,p){
 const [bx,by,lx,ly,la,rx,ry,ra,free,, ,beard,hem]=p;
 let dx=bx,dy=by;
 if(name==='boot-left'||name==='boot-right'){
  const left=name==='boot-left',q=rotate(x,y,left?24:48,125,left?la:ra);
  return [q[0]+(left?lx:rx),q[1]+(left?ly:ry)];
 }
 if(name==='staff'||name==='staff-hand')return staffPoint(x,y,p);
 if(name==='arm-staff'||name==='sleeve-under-staff'){
  const grip=staffPoint(...staffGrip,p),blend=clamp((26-x)/15)*(y<=52?clamp((y-35)/17):clamp((102-y)/50));
  dx+=(grip[0]-staffGrip[0]-bx)*blend;dy+=(grip[1]-staffGrip[1]-by)*blend;
 }else if(name==='arm-free'){
  const bend=clamp((y-44)/34);dx+=free*.22*bend;dy+=free*bend;
 }else if(name==='beard'){
  const tip=clamp((y-31)/17);dx+=beard*tip;dy+=Math.abs(beard)*tip*.25;
 }else if(name==='cloak-left'||name==='cloak-right'||name==='robe-under-staff'){
  const left=name!=='cloak-right',f=left?ly:ry,knee=clamp((y-66)/45),edge=clamp((y-100)/23);
  dx+=(left?lx:rx)*.5*knee+(left?hem:-hem)*edge;
  dy=by*(1-edge*.5)+f*.3*knee;
 }else if(name==='torso'){
  const low=clamp((y-70)/52),side=(x-36)/28;dx+=hem*low*.3;
  dy=by*(1-low*.5)+(ly*(1-side)+ry*(1+side))*.075*low;
 }else if(name==='head-hair'||name==='hat')dx-=beard*.15;
 return [x+dx,y+dy];
}
export function sourceContacts(warp,layers){
 const records=[];
 for(const[name,start]of [['boot-left',0],['boot-right',8]]){
  const soles=[];for(let i=start;i<start+8;i++){const q=warp(layers[name],name,poses[i]).opaqueBounds();soles.push(q.y+q.h-1+2*i);}
  records.push({name,frames:[start,start+7],sourceRasterSoleWorldY:soles,maxSpreadNativePixels:Math.max(...soles)-Math.min(...soles)});
 }
 const tips=[],raster=[];
 for(let i=7;i<16;i++){
  const tip=staffPoint(...staffTip,poses[i]);tips.push({x:tip[0]+20,y:tip[1]+10+2*i});
  const b=warp(layers.staff,'staff',poses[i]),q=b.opaqueBounds(),bottom=q.y+q.h-1,xs=[];
  for(let x=0;x<b.width;x++)if(b.alpha(x,bottom))xs.push(x);
  raster.push({x:xs.reduce((a,b)=>a+b,0)/xs.length,y:bottom+2*i});
 }
 const spread=values=>Math.max(...['x','y'].map(k=>Math.max(...values.map(p=>p[k]))-Math.min(...values.map(p=>p[k]))));
 const gripError=Math.max(...poses.map(p=>{const a=transform('staff',...staffGrip,p),b=transform('staff-hand',...staffGrip,p);return Math.hypot(a[0]-b[0],a[1]-b[1]);}));
 if(spread(tips)>1e-8||gripError>1e-8)throw Error('South staff contact detached');
 records.push({name:'staff-tip',frames:[7,15],sourceWorldTipXY:tips,sourceRasterBottomXY:raster,maxSpreadNativePixels:spread(raster),analyticalDrift:spread(tips),staffHandGripError:gripError,recoveryFrames:[0,6],scope:'source-only contact under root[0,2i]; live C# fitting not accepted'});
 return records;
}

// Offline revision of SE: one planted support and one lifted recovery per stride.
import {project as previous,poses as previousPoses,transform as previousTransform,sourceContacts as bootContacts} from './gothic-southeast-project.mjs';
export const project={...previous,id:'grey-wizard-fire-southeast-walking-stick-v007',outputDirectory:'gothic-southeast-v007-stick',
 status:'walking-stick source-motion revision; live stride/material/phone acceptance open'};
// Tip travel is relative to root [i,i]. Frames7..15 share world tip [13,13].
// Recovery lifts the tip clear, advances it, then lowers it into the next plant.
export const staffKeys=[
 [-3,-4,-.06],[-3,-6,-.03],[-2,-7,0],[0,-6,.03],
 [2,-4,.06],[4,0,.09],[6,4,.11],[6,6,.11],
 [5,5,.10],[4,4,.08],[3,3,.06],[2,2,.035],
 [1,1,.01],[0,0,-.015],[-1,-1,-.04],[-2,-2,-.06],
];
export const poses=previousPoses.map((old,i)=>{
 const p=[...old];p[9]=0;p[10]=0;
 // Slight transfer toward the right-hand support, without moving either stance foot.
 if(i>=8){p[0]+=[.2,.4,.6,.6,.5,.4,.2,0][i-8];p[1]-=.2;}
 return [...p,...staffKeys[i]];
});
export const idle=Array(16).fill(0);
export const staffTip=[59.5,133],staffGrip=[58,64];
export function staffPoint(x,y,p){
 const dx=x-staffTip[0],dy=y-staffTip[1],a=p[15]??0;
 return [staffTip[0]+dx*Math.cos(a)-dy*Math.sin(a)+(p[13]??0),
         staffTip[1]+dx*Math.sin(a)+dy*Math.cos(a)+(p[14]??0)];
}
const clamp=x=>Math.max(0,Math.min(1,x));
export function transform(name,x,y,p){
 if(name==='staff'||name==='staff-hand')return staffPoint(x,y,p);
 const q=previousTransform(name,x,y,p);
 if(name==='arm-staff'){
  const target=staffPoint(...staffGrip,p),base=previousTransform('torso',...staffGrip,p);
  const blend=clamp((75-x)/17)*clamp((y-47)/17);
  q[0]+=(target[0]-base[0])*blend;q[1]+=(target[1]-base[1])*blend;
 }
 return q;
}
export function sourceContacts(warp,layers){
 const contacts=bootContacts(warp,layers),tips=[],raster=[];
 for(let i=7;i<16;i++){
  const q=staffPoint(...staffTip,poses[i]);tips.push({x:q[0]+i,y:q[1]+i});
  const b=warp(layers.staff,'staff',poses[i]),bounds=b.opaqueBounds(),bottom=bounds.y+bounds.h-1;
  const xs=[];for(let x=0;x<b.width;x++)if(b.alpha(x,bottom))xs.push(x);
  raster.push({x:xs.reduce((a,b)=>a+b,0)/xs.length+i,y:bottom+i});
 }
 const spread=points=>Math.max(...['x','y'].map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))));
 const gripError=Math.max(...poses.map(p=>{
  const a=transform('staff',...staffGrip,p),b=transform('staff-hand',...staffGrip,p);
  return Math.hypot(a[0]-b[0],a[1]-b[1]);
 }));
 if(spread(tips)>1e-8||gripError>1e-8)throw Error('Walking-stick contact/grip detached');
 contacts.push({name:'staff-tip',frames:[7,15],sourceWorldTipXY:tips,
  sourceRasterBottomXY:raster,maxSpreadNativePixels:spread(raster),analyticalDrift:spread(tips),
  staffHandGripError:gripError,recoveryFrames:[0,6],maxRecoveryLiftNativePixels:6,
  scope:'source-only contact, not C# world fitting, collision or a new physics solver'});
 return contacts;
}

// Northeast native source: cloak embroidery belongs to the same deforming cloth.
import {poses as eastPoses} from './gothic-east-project.mjs';
export const project={id:'grey-wizard-fire-northeast-walk-v014',outputDirectory:'gothic-northeast-v014',source:'gothic-directions-v005/NE.png',
 sourceCell:[160,160],exportCell:160,offset:[0,0],sourcePivot:[78,136],direction:'NE',frames:16,fps:12,
 paletteSize:96,bleed:2,cleanIslandsMaxPixels:6,sourceStride:Math.hypot(16,16),rootPerFrame:[1,-1],walkingStick:true,
 noBleedLayers:['boot-left','boot-right'],noBleedBelowSourceY:124,protectStaffFootprint:true,
 staffGroundPlacement:{root:[78,136],rightOffset:[8.25,8.25],forwardOffset:[14.25,-14.25],tip:[100.5,130]},
 status:'NE source motion and embroidery review; not live locomotion/material/phone acceptance',
 clothReviewCrop:[52,62,89,107],
 masks:[
  {name:'boot-left',polygon:[[80,128],[91,128],[95,131],[100,133],[101,139],[91,143],[79,142],[76,137],[77,131]]},
  {name:'boot-right',polygon:[[60,123],[69,123],[75,126],[75,131],[69,133],[59,133],[57,129]]},
  {name:'staff-hand',polygon:[[104,59],[112,59],[114,63],[114,67],[111,70],[104,70],[102,66],[102,62]]},
  {name:'staff',polygon:[[112,26],[119,26],[122,39],[119,47],[115,55],[114,64],[114,74],[108,88],[108,102],[106,117],[104,132],[98,132],[99,115],[99,100],[101,87],[102,72],[104,55],[103,42],[105,34],[108,27]]},
  {name:'hat',polygon:[[61,13],[86,13],[93,22],[94,27],[103,28],[104,34],[93,40],[78,43],[61,42],[59,36]]},
  {name:'beard',polygon:[[88,40],[95,39],[98,44],[98,54],[95,57],[91,52]]},
  {name:'head-hair',polygon:[[69,38],[89,36],[95,40],[93,47],[85,51],[70,47],[66,43]]},
  {name:'arm-staff',polygon:[[92,60],[102,60],[110,63],[112,70],[108,81],[102,89],[95,90],[88,82],[88,70]]},
  {name:'cloak-left',polygon:[[64,52],[83,54],[89,63],[88,84],[87,105],[83,120],[75,129],[61,132],[48,127],[43,118],[44,105],[50,89],[57,67]]},
  {name:'cloak-right',polygon:[[91,86],[99,86],[101,103],[99,119],[96,127],[88,125],[86,109]]},
 ],
 occludedLegs:[
  {name:'boot-left',polygon:[[82,111],[89,111],[91,134],[78,134]],donor:[82,132,5,3],garmentAboveY:129},
  {name:'boot-right',polygon:[[62,109],[68,109],[71,129],[59,129]],donor:[63,127,6,3],garmentAboveY:124},
 ],
 drawOrder:['boot-right','boot-left','torso','cloak-left','cloak-right','head-hair','beard','hat','arm-staff','staff','staff-hand'],
};
// Staff dx/dy/pitch. Plant7..15 cancels source root[i,-i]; recovery clears ground.
export const staffKeys=[[-3,2,.045],[-3,0,.04],[-2,-3,.025],[0,-6,0],[2,-8,-.025],[4,-8,-.055],[6,-8,-.08],[6,-6,-.08],
 [5,-5,-.065],[4,-4,-.05],[3,-3,-.03],[2,-2,-.015],[1,-1,0],[0,0,.015],[-1,1,.03],[-2,2,.04]];
export const poses=eastPoses.map((old,i)=>{
 const p=old.slice(0,9);p[0]*=.7;p[1]*=.7;
 p[2]*=2/3;p[5]*=2/3;p[3]*=.7;p[6]*=.7;p[4]*=.65;p[7]*=.65;
 return [...p,...staffKeys[i]];
});
export const idle=Array(12).fill(0);
export const staffTip=[100.5,130],staffGrip=[109,64];
const clamp=x=>Math.max(0,Math.min(1,x));
const rotate=(x,y,cx,cy,a)=>{const dx=x-cx,dy=y-cy;return [cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a)];};
export function staffPoint(x,y,p){const q=rotate(x,y,...staffTip,p[11]);return[q[0]+p[9],q[1]+p[10]];}
export function transform(name,x,y,p){
 const[bx,by,near,nLift,nPitch,far,fLift,fPitch,lag]=p;
 if(name==='boot-left'||name==='boot-right'){
  const n=name==='boot-left',f=n?near:far,q=rotate(x,y,n?84:65,n?134:128,n?nPitch:fPitch);
  return[q[0]+f,q[1]-f-(n?nLift:fLift)];
 }
 if(name==='staff'||name==='staff-hand')return staffPoint(x,y,p);
 let dx=bx,dy=by;
 if(name==='arm-staff'){
  const target=staffPoint(...staffGrip,p),blend=clamp((x-91)/18)*(y<=65?clamp((y-59)/6):clamp((92-y)/27));
  dx+=(target[0]-staffGrip[0]-bx)*blend;dy+=(target[1]-staffGrip[1]-by)*blend;
 }else if(name==='cloak-left'||name==='cloak-right'){
  const low=clamp((y-59)/70),f=name==='cloak-left'?far:near;
  dx+=f*.2*low+lag*low;dy=by*(1-low*.4)-f*.12*low;
 }else if(name==='torso')dx+=lag*.2*clamp((y-82)/45);
 else if(name==='beard'){dx-=lag*.3*clamp((y-42)/14);dy+=Math.abs(lag)*.1;}
 return[x+dx,y+dy];
}
export function sourceContacts(warp,layers){
 const records=[];
 for(const[name,start]of [['boot-left',0],['boot-right',8]]){
  const points=[];for(let i=start;i<start+8;i++){const q=warp(layers[name],name,poses[i]).opaqueBounds();points.push({x:q.x+q.w-1+i,y:q.y+q.h-1-i});}
  records.push({name,frames:[start,start+7],sourceRasterSoleWorldXY:points,maxSpreadNativePixels:spread(points)});
 }
 const tips=[],raster=[];
 for(let i=7;i<16;i++){
  const tip=staffPoint(...staffTip,poses[i]);tips.push({x:tip[0]+i,y:tip[1]-i});
  const b=warp(layers.staff,'staff',poses[i]),q=b.opaqueBounds(),bottom=q.y+q.h-1,xs=[];
  for(let x=0;x<b.width;x++)if(b.alpha(x,bottom))xs.push(x);
  raster.push({x:xs.reduce((a,b)=>a+b,0)/xs.length+i,y:bottom-i});
 }
 const gripError=Math.max(...poses.map(p=>{const a=transform('staff',...staffGrip,p),b=transform('staff-hand',...staffGrip,p);return Math.hypot(a[0]-b[0],a[1]-b[1]);}));
 if(spread(tips)>1e-8||gripError>1e-8)throw Error('NE support/grip detached');
 records.push({name:'staff-tip',frames:[7,15],sourceWorldTipXY:tips,sourceRasterBottomXY:raster,maxSpreadNativePixels:spread(raster),analyticalDrift:spread(tips),staffHandGripError:gripError,scope:'source-only under root[i,-i], same ground plane with explicit forward/right offset, not C# fit'});
 return records;
}
function spread(points){return Math.max(...['x','y'].map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))));}

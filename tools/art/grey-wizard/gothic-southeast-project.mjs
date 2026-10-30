// Editable native SE source and explicit 16-key pose authoring. Offline only.
export const project={
 id:'grey-wizard-fire-southeast-gothic-v006',source:'gothic-directions-v005/SE.png',
 outputDirectory:'gothic-southeast-v006',sourceCell:[160,160],exportCell:160,
 offset:[0,0],sourcePivot:[90,136],paletteSize:96,bleed:2,direction:'SE',
 frames:16,fps:12,sourceStride:Math.hypot(16,16),
 status:'diagonal source-motion study; not live stride, material or artistic acceptance',
 masks:[
  {name:'boot-left',polygon:[[69,125],[79,125],[84,129],[87,135],[87,143],[75,144],[68,139],[67,132]]},
  {name:'boot-right',polygon:[[96,120],[104,120],[112,125],[114,132],[101,135],[95,130]]},
  {name:'staff-hand',polygon:[[54,59],[61,59],[63,64],[61,68],[54,68],[53,63]]},
  {name:'staff',polygon:[[54,28],[60,28],[64,37],[62,44],[60,51],[62,67],[63,81],[64,98],[64,115],[61,139],[57,139],[58,118],[59,100],[59,82],[56,70],[54,53],[54,43],[52,37]]},
  {name:'hat',polygon:[[63,13],[98,13],[104,36],[100,41],[88,45],[72,45],[62,42],[62,37]]},
  {name:'beard',polygon:[[85,45],[94,44],[96,49],[95,56],[91,68],[87,63],[85,54]]},
  {name:'head-hair',polygon:[[76,38],[94,36],[99,43],[98,50],[94,54],[83,51],[76,46]]},
  {name:'arm-staff',polygon:[[67,46],[75,48],[77,54],[73,64],[69,72],[62,78],[58,72],[61,64],[61,56]]},
  {name:'arm-free',polygon:[[98,48],[106,52],[109,63],[114,73],[116,83],[111,88],[106,85],[104,75],[99,68]]},
  {name:'cloak-left',polygon:[[67,74],[78,72],[78,87],[76,103],[78,119],[73,130],[65,134],[59,131],[53,129],[49,120],[44,116],[46,107],[53,95],[59,85]]},
  {name:'cloak-right',polygon:[[99,82],[108,85],[111,96],[116,110],[119,121],[111,120],[105,116],[99,123],[97,108]]},
 ],
 drawOrder:['boot-right','boot-left','torso','cloak-left','cloak-right','arm-staff','arm-free','head-hair','beard','hat','staff','staff-hand'],
};
// Each row: body sway/bob, near step/lift/angle, far step/lift/angle,
// free arm, staff hand, staff angle, beard lag, hem lag.
// SE root guide [i,i]; stance step drops by1 per frame on BOTH screen axes.
export const poses=[
 [-.3,0,4,0,0,-4,0,-.03, .6,-.4,-.006, .2,-.4],
 [-.4,.3,3,0,0,-4,1,-.04, .3,-.5,-.005, .3,-.3],
 [-.5,.6,2,0,0,-3,2,-.04, 0,-.6,-.004, .4,-.1],
 [-.4,.7,1,0,0,-2,3,-.03,-.3,-.5,-.002, .3, .1],
 [-.3,.5,0,0,0, 0,3,-.02,-.5,-.3, 0,    .2, .3],
 [-.1,.2,-1,0,0,2,2,-.01,-.6, 0, .002, 0, .4],
 [ 0,-.1,-2,0,0,3,1,0,  -.5, .2, .004,-.2, .3],
 [ .2,-.1,-3,0,0,4,0,0, -.3, .4, .005,-.3, .2],
 [ .3,0,-4,0,-.03,4,0,0,-.6, .4, .006,-.2, .4],
 [ .4,.3,-4,1,-.04,3,0,0,-.3, .5, .005,-.3, .3],
 [ .5,.6,-3,2,-.04,2,0,0, 0, .6, .004,-.4, .1],
 [ .4,.7,-2,3,-.03,1,0,0, .3, .5, .002,-.3,-.1],
 [ .3,.5,0,3,-.02,0,0,0, .5, .3, 0,   -.2,-.3],
 [ .1,.2,2,2,-.01,-1,0,0,.6, 0,-.002, 0,-.4],
 [ 0,-.1,3,1,0,-2,0,0,  .5,-.2,-.004, .2,-.3],
 [-.2,-.1,4,0,0,-3,0,0, .3,-.4,-.005, .3,-.2],
];
export const idle=Array(13).fill(0);
const clamp=x=>Math.max(0,Math.min(1,x));
function rotate(x,y,cx,cy,a){const dx=x-cx,dy=y-cy;return [cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a)];}
export function transform(name,x,y,p){
 const [sway,bob,near,liftN,aN,far,liftF,aF,free,hand,angle,beard,hem]=p;
 let dx=-sway,dy=sway+bob;
 if(name==='boot-left'||name==='boot-right'){
  const n=name==='boot-left',f=n?near:far,lift=n?liftN:liftF;
  const q=rotate(x,y,n?76:103,n?130:125,n?aN:aF);
  return [q[0]+f,q[1]+f-lift];
 }
 if(name==='staff'){const q=rotate(x,y,58,64,angle);return [q[0]-sway+hand*.3,q[1]+sway+bob+hand];}
 if(name==='staff-hand')return [x-sway+hand*.3,y+sway+bob+hand];
 if(name==='arm-staff'){const bend=clamp((75-x)/17)*clamp((y-47)/17);dx+=hand*.3*bend;dy+=hand*bend;}
 else if(name==='arm-free'){const f=clamp((y-52)/32);dx+=free*.5*f;dy+=free*f;}
 else if(name==='beard'){const tip=clamp((y-48)/20);dx+=beard*tip;dy+=Math.abs(beard)*tip*.2;}
 else if(name==='cloak-left'||name==='cloak-right'){
  const n=name==='cloak-left',low=clamp((y-79)/49),edge=clamp((y-111)/22),f=n?near:far;
  dx+=f*.3*low+hem*edge;dy=(sway+bob)*(1-edge*.5)+f*.25*low;
 }else if(name==='torso'){const low=clamp((y-79)/48),side=clamp((x-72)/30);dx+=hem*.25*low;dy+=(near*(1-side)+far*side)*.15*low;}
 else if(name==='hat'||name==='head-hair')dx-=beard*.1;
 return [x+dx,y+dy];
}
export function sourceContacts(warp,layers){
 return [['boot-left',0],['boot-right',8]].map(([name,start])=>{
  const soles=[];for(let i=start;i<start+8;i++){
   const q=warp(layers[name],name,poses[i]).opaqueBounds();
   soles.push({x:q.x+q.w-1+i,y:q.y+q.h-1+i});
  }
  return {name,frames:[start,start+7],sourceRasterSoleWorldXY:soles,maxSpreadNativePixels:Math.max(...['x','y'].map(k=>Math.max(...soles.map(p=>p[k]))-Math.min(...soles.map(p=>p[k]))))};
 });
}

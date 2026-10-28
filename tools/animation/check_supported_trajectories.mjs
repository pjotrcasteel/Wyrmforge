// Synthetic C#-style motion inputs to the existing source support primitives.
// Source/skin study only; never actual Hunt, raster or physical-phone evidence.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const {updateGroundContactTargets:schedule,updateSourceContactTargets:follow,solveSupportedSourcePose:solve,sourcePoseRegionTransforms:transforms}=await import(pathToFileURL(root+'/src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js'));
const source=JSON.parse(fs.readFileSync(process.argv[2])),out=process.argv[3];
const sourceFollow=process.argv.includes('--source-follow');
const speed=46.53/60,stride=source.clips.walk.spec.strideMetres,grid=source.clips['attack-travel'].spec.poseGrid;
const actionDuration=grid.actionFrames/source.clips['attack-travel'].spec.fps,duration=4;
const clamp=(t,a,b)=>Math.max(a,Math.min(b,t));
const scenarios=[
 {id:'forward',world:t=>[0,-speed*t]},
 {id:'sideways',world:t=>[speed*t,0]},
 {id:'diagonal',world:t=>[speed*t/Math.SQRT2,-speed*t/Math.SQRT2]},
 {id:'backward',world:t=>[0,speed*t]},
 {id:'reverse',world:t=>[0,-speed*(t<=1.2?t:2.4-t)]},
 {id:'corner',world:t=>[speed*Math.max(0,t-1.2),-speed*Math.min(t,1.2)]},
 {id:'arc',world:t=>[speed*(1-Math.cos(t)), -speed*Math.sin(t)]},
 {id:'pass-by',world:t=>[.2*Math.sin(t*2),-speed*t]},
 {id:'start-stop',world:t=>[0,-speed*(clamp(t-.4,0,1)+Math.max(0,t-2.1))]},
 {id:'acceleration',world:t=>[0,-speed*(t<=1?t*t/2:t-.5)]},
 {id:'slow',world:t=>[0,-speed*.25*t]},
 {id:'freeze-resume',world:t=>[0,-speed*(t<=1?t:t<1.6?1:t-.6)],frozen:t=>t>1&&t<=1.6,clock:t=>t<=1?t:t<1.6?1:t-.6}
];
const results=[],poses=[];
for(const scenario of scenarios)for(const hz of [15,30,60,120]){
 const state={},prior=new Map();let previous=scenario.world(0),travel=0,signedPhase=0,axis=[0,-1],maximumSlip=0,maximumShift=0,minimumMargin=Infinity,failure=null,count=0;
 for(let tick=0;tick<=duration*hz;tick++){
  const t=tick/hz,world=scenario.world(t),delta=world.map((n,i)=>n-previous[i]);travel+=Math.hypot(...delta);
  const observed=tick?delta:scenario.world(1/hz).map((n,i)=>n-world[i]),distance=Math.hypot(...observed);
  if(distance>1e-9){const sign=tick&&observed[0]*axis[0]+observed[1]*axis[1]<-1e-9?-1:1;axis=observed.map(n=>n/distance*sign);if(tick)signedPhase+=sign*distance/stride;}
  const phaseCycles=sourceFollow?signedPhase:travel/stride,phase=(phaseCycles%1+1)%1,clock=scenario.clock?.(t)??t,progress=(clock-.7)/actionDuration;
  const clip=progress>=0&&progress<1?'attack-travel':'walk',spec=source.clips[clip].spec;
  const phases=spec.poseGrid?.phaseFrames??spec.frames,index=(clip==='attack-travel'?Math.min(grid.actionFrames-1,Math.floor(progress*(grid.actionFrames-1)+.5))*phases:0)+Math.floor(phase*phases+.5)%phases;
  const initialVelocity=scenario.world(1/hz).map((n,i)=>(n-world[i])*hz);
  const frame=source.clips[clip].frames[index],velocity={x:tick?delta[0]*hz:initialVelocity[0],y:tick?delta[1]*hz:initialVelocity[1]};
  const patterns=source.contactCycles.map(c=>({id:c.id,phaseOffset:c.phaseOffset,stanceFraction:c.stanceFraction,neutral:{x:c.neutral[0],y:c.neutral[1]}}));
  const initialTargets=Object.fromEntries(Object.entries(frame.sourceContacts).map(([id,c])=>[id,{x:world[0]+c.sourceContact[0],y:world[1]+c.sourceContact[1]}]));
  try{
   let targets;
   if(sourceFollow){
    const directed={projection:[1,0,0,0,0,1,0,0],sourceContacts:Object.fromEntries(Object.entries(frame.sourceContacts).map(([id,c])=>{
     const neutral=source.contactCycles.find(p=>p.id===id).neutral,step=c.sourceContact[1]-neutral[1];
     return [id,{...c,sourceContact:[neutral[0]-axis[0]*step,neutral[1]-axis[1]*step,c.sourceContact[2]]}];
    }))};
    const error=(phase-(index%phases)/phases+1.5)%1-.5;
    const anchors=follow(state,directed,{timestamp:t,world:{x:world[0],y:world[1]},pixelScale:1,anchor:[0,0],phaseOffset:{x:-axis[0]*stride*error,y:-axis[1]*stride*error},frozen:scenario.frozen?.(t)??false});
    targets=Object.fromEntries(Object.entries(anchors).map(([id,c])=>[id,{point:[c.x-world[0],c.y-world[1],c.z],planted:c.planted}]));
   }else{
   const planned=schedule(state,patterns,{timestamp:t,phaseCycles,sourcePhaseCycles:Math.floor(phaseCycles*phases+.5)/phases,world:{x:world[0],y:world[1]},velocity,stride,nominalPhaseRate:Math.max(speed/stride,1e-6),initialTargets:Math.hypot(velocity.x,velocity.y)>1e-9?undefined:initialTargets,frozen:scenario.frozen?.(t)??false});
   targets=Object.fromEntries(Object.entries(planned.targets).map(([id,c])=>{
    const pattern=source.contactCycles.find(p=>p.id===id);
    return [id,{point:[c.x-world[0],c.y-world[1],pattern.neutral[2]+c.lift*pattern.liftMetres],planted:c.planted}];
   }));
   }
   const posed=solve(frame,targets,{massWeights:source.massWeights,rootBone:source.rootBone,...source.authoringEnvelope,minimumSupportMargin:source.minimumSupportMarginMetres});
   for(const [id,c] of Object.entries(posed.sourceContacts)){
    const point=c.sourceContact.map((n,i)=>n+(world[i]??0)),old=prior.get(id);
    if(c.planted&&old?.planted)maximumSlip=Math.max(maximumSlip,Math.hypot(...point.map((n,i)=>n-old.point[i])));
    prior.set(id,{point,planted:c.planted});
   }
   maximumShift=Math.max(maximumShift,Math.hypot(...posed.sourceRepose.bodyShift));minimumMargin=Math.min(minimumMargin,posed.sourceRepose.support.margin);count++;
   if(hz===30)poses.push({heading:scenario.id,sequence:scenario.id,timestamp:t,world,clip,index,bodyShift:posed.sourceRepose.bodyShift,sourceBones:posed.sourceBones,sourceContacts:posed.sourceContacts,massCenter:posed.massCenter,
    rasterTransformsByDirection:source.projectionByDirection?Object.fromEntries(Object.entries(source.projectionByDirection).map(([direction,p])=>[direction,transforms(frame,posed,p)])):null});
  }catch(e){failure={tick,time:t,clip,index,message:e.message,details:e.sourcePoseFailure??null};break;}
  previous=world;
 }
 results.push({scenario:scenario.id,hz,count,maximumSlip,maximumBodyShift:maximumShift,minimumMargin,failure});
}
const report={sourceStudyOnly:true,runtimeAccepted:false,sourceFollow,measurement:'synthetic authoritative root trajectories through shared contact schedule and coupled source support',results};
fs.writeFileSync(out,JSON.stringify({...report,poses}));fs.writeFileSync(out+'.summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(results.some(r=>r.failure||r.maximumSlip>1e-9))process.exitCode=1;

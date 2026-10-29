// Replay actual packed poses through the same public lifecycle/contact bridge.
// This measures source-chain support, not raster pixels or physical-device cost.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const {createSpriteAnimationState:create,updateSpriteAnimation:update,validateCreatureRigProfile:validate}=await import(pathToFileURL(root+'/src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js'));
const {updateSourceContactTargets:targets,sampleSourceContactRegions:solve,sourceGroundPointFromPixel:inverse}=await import(pathToFileURL(root+'/src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js'));
const pack=path.resolve(process.argv[2]);
const profile=validate(JSON.parse(fs.readFileSync(pack+'/profile.json'))),manifest=JSON.parse(fs.readFileSync(pack+'/manifest.json'));
if(!manifest.regions){
 const results=[],between=process.argv.includes('--between');
 for(const [row,direction] of manifest.directions.entries())for(const hz of [15,30,60,120])for(const speed of [30,60]){
  const state=create(),v=profile.locomotion.stanceVelocityByDirection[direction],next=profile.locomotion.stanceVelocityByDirection[manifest.directions[(row+1)%manifest.directions.length]];
  const axis=between?{x:-(v.x+next.x),y:-(v.y+next.y)}:{x:-v.x,y:-v.y},length=Math.hypot(axis.x,axis.y),velocity={x:axis.x/length*speed,y:axis.y/length*speed};
  let maxSlip=0,saturated=0;
  for(let i=0;i<=hz*2;i++){
   const time=i/hz,sample=update(state,profile,{entityId:1,timestamp:time,travel:speed*time,world:{x:velocity.x*time,y:velocity.y*time},velocity,direction,moving:true});
   maxSlip=Math.max(maxSlip,sample.debug.maxSlip);if(sample.debug.correctionSaturated)saturated++;
  }
  results.push({direction,hz,speed,maxMarkerSlipWorldPixels:maxSlip,maxMarkerSlipNativePixels:maxSlip/profile.unitsPerPixel,correctionSaturatedSamples:saturated});
 }
 const report={measurement:'unsnapped baked full-frame source markers through the shared controller; no regional warp or live skin',motion:between?'midway between adjacent source headings':'constant measured source-forward headings',runtimeAccepted:false,results};
 console.log(JSON.stringify(report,null,2));process.exitCode=results.some(r=>r.maxMarkerSlipNativePixels>1)?1:0;
}else{
const regions=JSON.parse(fs.readFileSync(pack+'/'+manifest.regions.metadata));
if(regions.sourcePoses)for(const views of Object.values(regions.clips))for(const frames of Object.values(views))for(const frame of frames)Object.assign(frame,regions.sourcePoses[frame.sourcePoseIndex]);
const results=[];
for(const direction of manifest.directions)for(const hz of [15,30,60,120])for(const attack of [false,true]){
 const state=create(),contacts={},v=profile.locomotion.stanceVelocityByDirection[direction],speed=30,length=Math.hypot(v.x,v.y),velocity={x:-v.x/length*speed,y:-v.y/length*speed};let maxSlip=0,failed=null;
 for(let i=0;i<=hz*2;i++){
  const time=i/hz,world={x:velocity.x*time,y:velocity.y*time},intent={entityId:1,timestamp:time,travel:speed*time,world,direction,moving:true,action:attack?{name:'attack',token:'claw',sequence:0}:null};
  try{
   const sample=update(state,profile,intent),frame=regions.clips[sample.clip][direction][sample.frame],spec=manifest.clips[sample.clip],pixelScale=spec.worldSize/spec.cell;
   const t=targets(contacts,frame,{timestamp:time,world,phaseOffset:sample.sourcePhaseOffset,translateSwing:Boolean(manifest.regions.continuousPhaseBody),pixelScale,anchor:regions.anchor});
   const offset=sample.sourcePhaseOffset??{x:0,y:0},p=frame.projection;
   const bodyOffset=manifest.regions.continuousPhaseBody?inverse([p[3]+offset.x/pixelScale,p[7]+offset.y/pixelScale],0,p):[0,0,0];
   const r=solve(frame,sample,t,{world,pixelScale,anchor:regions.anchor,maxCorrection:manifest.regions.maxCorrectionMetres,maxRootCorrection:manifest.regions.maxRootCorrectionMetres,bodyOffset});
   if(frame.balance==='supported'&&!r.support?.staticallySupported)throw new RangeError('Authored mass proxy is outside actual source support');
   maxSlip=Math.max(maxSlip,...r.contacts.map(c=>c.slip));
  }catch(e){failed={time,message:e.message,requiredCorrectionMetres:e.requiredCorrectionMetres};break;}
 }
 results.push({direction,hz,attack,maxSlip,failed});
}
console.log(JSON.stringify({measurement:'actual packed source chains through shared lifecycle; constant source-forward motion',results},null,2));
if(results.some(r=>r.failed))process.exitCode=1;
}

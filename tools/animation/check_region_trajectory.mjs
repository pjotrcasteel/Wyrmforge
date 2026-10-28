import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {sampleSourceContactRegions:sample,updateGroundContactTargets:update}=await import(pathToFileURL(root+'/src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js').href);
const metadata=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]??'artifacts/shoulder-contact-regions/contact-regions.json')));
const results=[];
for(const direction of metadata.exportedDirections){
 const frames=metadata.clips.walk[direction],first=frames[0],p=first.projection,pixelScale=93/96,proj=v=>({x:(p[0]*v[0]+p[1]*v[1]+p[2]*v[2]+p[3]-64)*pixelScale,y:(p[4]*v[0]+p[5]*v[1]+p[6]*v[2]+p[7]-88)*pixelScale});
 const stride=.36,velocity={x:-p[1]*stride*pixelScale,y:-p[5]*stride*pixelScale},state={},patterns=Object.entries(first.sourceContacts).map(([id,c],i)=>{const q=i*.5,point=proj(c.sourceContact);return {id,phaseOffset:q,stanceFraction:.62,neutral:{x:point.x-velocity.x*(.31-q),y:point.y-velocity.y*(.31-q)}};});
 let maxSlip=0,failed=null;
 for(let i=0;i<=240;i++){
  const t=i/120,world={x:velocity.x*t,y:velocity.y*t},out=update(state,patterns,{timestamp:t,phaseCycles:t,world,velocity,stride:Math.hypot(velocity.x,velocity.y),nominalPhaseRate:1});
  const frameIndex=Math.floor(t%1*16),frame=frames[frameIndex],targets=Object.fromEntries(Object.entries(out.targets).map(([id,v])=>[id,{...v,z:-.5+v.lift*.055}]));
  try{const r=sample(frame,{clip:'walk',frame:frameIndex,direction},targets,{world,pixelScale,anchor:[64,88],maxCorrection:.15});maxSlip=Math.max(maxSlip,...r.contacts.map(c=>c.slip));}catch(e){failed={t,frame:frameIndex,message:e.message};break;}
 }
 results.push({direction,maxSlip,failed});
}

const report={sourceQCOnly:true,runtimeIntegrated:false,trajectory:'two one-second authored strides at 120Hz; calibrated source-forward root motion',results};
console.log(JSON.stringify(report,null,2));
if(results.some(r=>r.failed||r.maxSlip>1e-9))process.exitCode=1;

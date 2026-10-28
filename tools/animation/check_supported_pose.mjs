// Independent source-heading study through the shared full-body solver.
// No browser, game motion, raster/material or owner acceptance is implied.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const {solveSupportedSourcePose:solve}=await import(pathToFileURL(root+'/src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-contact-kinematics.js'));
const source=JSON.parse(fs.readFileSync(process.argv[2])),out=process.argv[3],results=[],poses=[];
for(const heading of [-180,-135,-90,-45,0,45,90,135,180])for(const [clip,data] of Object.entries(source.clips)){
 let failure=null,maximumBodyShift=0,minimumMargin=Infinity,count=0;
 for(const [index,frame] of data.frames.entries()){
  const targets=Object.create(null),angle=heading*Math.PI/180;
  for(const [id,c] of Object.entries(frame.sourceContacts)){
   // Keep the source's anatomical stance lane; rotate only its actual stride.
   const point=c.sourceContact,step=point[1],neutralX=point[0];
   targets[id]={point:[neutralX-Math.sin(angle)*step,Math.cos(angle)*step,point[2]],planted:c.planted};
  }
  try{
   const posed=solve(frame,targets,{massWeights:source.massWeights,rootBone:source.rootBone,...source.authoringEnvelope,minimumSupportMargin:source.minimumSupportMarginMetres});
   maximumBodyShift=Math.max(maximumBodyShift,Math.hypot(...posed.sourceRepose.bodyShift));minimumMargin=Math.min(minimumMargin,posed.sourceRepose.support.margin);count++;
   poses.push({heading,clip,index,bodyShift:posed.sourceRepose.bodyShift,sourceBones:posed.sourceBones,sourceContacts:posed.sourceContacts,massCenter:posed.massCenter});
  }catch(e){failure={index,message:e.message};break;}
 }
 results.push({heading,clip,count,maximumBodyShift,minimumMargin,failure});
}
const report={sourceStudyOnly:true,runtimeAccepted:false,results};
fs.writeFileSync(out,JSON.stringify({...report,poses}));fs.writeFileSync(out+'.summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(results.some(r=>r.failure))process.exitCode=1;

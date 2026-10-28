// Measures actual complete-pose endpoints, not just mathematical plant anchors.
import fs from 'node:fs';
const study=JSON.parse(fs.readFileSync(process.argv[2])),old=new Map(),steps=[];
const {groundBasis:b,heightProjection:h,groundZ:z}=study.profileSourceSupport;
const project=(p,pose)=>{
 const cos=Math.cos(pose.yaw),sin=Math.sin(pose.yaw),x=cos*p[0]-sin*p[1],y=sin*p[0]+cos*p[1];
 return [pose.world[0]+b[0]*x+b[1]*y+h[0]*(p[2]-z),pose.world[1]+b[2]*x+b[3]*y+h[1]*(p[2]-z)];
};
for(const pose of study.poses){
 const previous=old.get(pose.sequence),points={pelvis:project(pose.sourceBones.pelvis.head,pose)};
 for(const [id,c] of Object.entries(pose.sourceContacts))points[id]=project(c.sourceContact,pose);
 if(previous){
  const dt=pose.timestamp-previous.pose.timestamp;
  for(const [id,p] of Object.entries(points)){
   const nativePixels=Math.hypot(...p.map((n,i)=>n-previous.points[id][i]))*96/93;
   steps.push({scenario:pose.sequence,time:pose.timestamp,id,dt,nativePixels,nativePixelsPerSecond:nativePixels/dt,planted:id==='pelvis'?null:pose.sourceContacts[id].planted&&previous.pose.sourceContacts[id].planted});
  }
 }
 old.set(pose.sequence,{pose,points});
}
const report={sourceStudyOnly:true,visualAccepted:false,measurement:'projected complete-pose pelvis and actual sole landmark; native source pixels',samples:steps.length,
 largestPelvisSteps:steps.filter(s=>s.id==='pelvis').sort((a,b)=>b.nativePixels-a.nativePixels).slice(0,12),largestSwingSteps:steps.filter(s=>s.id!=='pelvis'&&!s.planted).sort((a,b)=>b.nativePixels-a.nativePixels).slice(0,12),maximumRetainedProjectedSoleDrift:Math.max(...steps.filter(s=>s.planted).map(s=>s.nativePixels))};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

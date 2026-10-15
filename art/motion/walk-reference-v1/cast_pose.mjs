const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const unit=a=>mul(a,1/Math.hypot(...a));
function elbowFor(shoulder,elbow,wrist,target){
 const upper=Math.hypot(...sub(elbow,shoulder)),lower=Math.hypot(...sub(wrist,elbow));
 const vector=sub(target,shoulder),distance=Math.hypot(...vector),axis=unit(vector);
 if(distance>=upper+lower||distance<=Math.abs(upper-lower))throw Error('Unreachable cast wrist');
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
 let bend=sub(sub(elbow,shoulder),mul(axis,dot(sub(elbow,shoulder),axis)));
 if(Math.hypot(...bend)<1e-7){const basis=Math.abs(axis[0])<.9?[1,0,0]:[0,0,1];bend=sub(basis,mul(axis,dot(basis,axis)));}
 return add(add(shoulder,mul(axis,along)),mul(unit(bend),Math.sqrt(Math.max(0,upper*upper-along*along))));
}
export function castEnvelope(cast){
 if(!cast||cast.seconds<0||cast.seconds>=.65)return 0;
 const fade=Math.max(0,Math.min(1,(cast.seconds-.4)/.25));
 return Math.exp(-cast.seconds*(cast.look.settleRate??8))*(1-fade*fade*(3-2*fade));
}
export function applyCastPose(frame,data,cast){
 if(!cast||cast.seconds<0||cast.seconds>.65)return frame;
 const result=frame.map(p=>[...p]),ids=Object.fromEntries(data.jointNames.map((n,i)=>[n,i]));
 const envelope=castEnvelope(cast),weight=cast.look.weight;
 const angle=-cast.look.recoilDegrees*Math.PI/180*envelope*weight,c=Math.cos(angle),s=Math.sin(angle),root=result[0];
 for(let i=11;i<result.length;i++){
  const d=sub(result[i],root);result[i]=add(root,[d[0],d[1]*c-d[2]*s,d[1]*s+d[2]*c]);
 }
 const solveArm=(side,target)=>{
  const shoulder=result[ids[side+'clavicle']],elbow=result[ids[side+'humerus']],wrist=result[ids[side+'radius']];
  const reach=Math.hypot(...sub(elbow,shoulder))+Math.hypot(...sub(wrist,elbow));
  const vector=sub(target,shoulder),distance=Math.hypot(...vector);
  const reachable=distance>reach*.98?add(shoulder,mul(vector,reach*.98/distance)):target;
  result[ids[side+'humerus']]=elbowFor(shoulder,elbow,wrist,reachable);
  const delta=sub(reachable,wrist);
  for(const n of ['radius','wrist','hand','fingers','thumb'])result[ids[side+n]]=add(result[ids[side+n]],delta);
 };
 const shoulder=result[ids.lclavicle],wrist=result[ids.lradius];
 const offset=[...cast.look.releaseWrist];
 offset[0]+=(cast.look.sweep??0)*Math.sin(Math.min(1,cast.seconds/.22)*Math.PI)*envelope;
 const desired=add(shoulder,offset);
 solveArm('l',add(mul(wrist,1-envelope),mul(desired,envelope)));
 solveArm('r',add(result[ids.rradius],[.02*envelope,.12*envelope,.07*envelope]));
 return result;
}

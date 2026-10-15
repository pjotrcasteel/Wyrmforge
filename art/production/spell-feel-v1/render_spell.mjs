import {drawView,resolveViewPose} from '../../motion/walk-reference-v1/render.mjs';
import {resolveSpellLook} from './spell_profiles.mjs';
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=x=>Math.max(0,Math.min(1,x));
function line(ctx,points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
function diamond(ctx,x,y,length,width,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+length,y);ctx.lineTo(x,y-width);ctx.lineTo(x-length,y);ctx.lineTo(x,y+width);ctx.closePath();ctx.fill();}
function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function impactEffect(ctx,x,y,look,age,radius){
 const p=clamp(age/.42),fade=1-p;
 ctx.save();ctx.globalAlpha=fade;
 if(look.school==='Arcane'){
  // Inward collapse: dense contact point, separated phase fragments.
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.4,r=radius*(1-p*.82);diamond(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r*.65,2+look.rank,1.5,look.color);}
  if(age<.12)circle(ctx,x,y,(3+look.rank*1.5)*(1-age/.12),look.highlight);
 }else if(look.school==='Fire'){
  // One expanding combustion beat, then upward-cooling embers.
  for(let i=0;i<7;i++){
   const a=i*2.399,r=radius*Math.sqrt(p+.025),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.65-p*12;
   diamond(ctx,px,py,(3+look.rank)*(1-p),2*(1-p),i%2?look.color:look.highlight);
  }
  if(age<.065){circle(ctx,x,y,7*look.weight,look.color);circle(ctx,x,y,3,look.highlight);}
 }else if(look.school==='Frost'){
  // Crystal fracture: angular splinters, never the fire burst recolored.
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+.16,r=radius*(.35+p*.65),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7;
   line(ctx,[[x+Math.cos(a)*r*.4,y+Math.sin(a)*r*.28],[px,py]],look.color,2);
   diamond(ctx,px,py,3+look.rank,1.5,look.highlight);
  }
 }else{
  // A dry electrical contact snap with a short afterglow.
  if(age<.09){line(ctx,[[x-5,y+9],[x+1,y],[x-2,y-8]],look.highlight,2);circle(ctx,x,y,2.5,look.color);}
 }
 ctx.restore();
}
export function drawSpellPanel(ctx,data,options){
 const {x,y,width=320,height=190,spellId,rank,seconds}=options,look=resolveSpellLook({spellId,rank,combinationId:options.combinationId??null});
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.fillStyle='#152321';ctx.fillRect(x,y,width,height);
 const castSeconds=seconds%1.6;
 drawView(ctx,data,(seconds/data.duration)%1,{x:x+2,y:y+15,width:160,height:height-20,yaw:75,pitch:25,sprite:true,cast:{look,seconds:castSeconds}});
 // Capture origin on release: a projectile never follows the later moving hand.
 const launchSeconds=seconds-castSeconds;
 const launch=resolveViewPose(data,(launchSeconds/data.duration)%1,{x:x+2,y:y+15,width:160,height:height-20,yaw:75,pitch:25,cast:{look,seconds:0}});
 const from=launch.project(launch.joint.lhand),to=[x+width-37,from[1]+8];
 const projectileSpeed={orb:246,flame:198,shard:300,needle:336,lance:264,dart:312}[look.shape]+(rank-1)*12;
 const arrivalSeconds=look.shape==='chain'||look.shape==='ball'?0:(to[0]-from[0])/projectileSpeed;
 // A quiet target silhouette makes contact and after-effects visible.
 ctx.fillStyle='#3a4441';ctx.beginPath();ctx.ellipse(to[0],to[1]+7,8,18,0,0,Math.PI*2);ctx.fill();
 const t=castSeconds,w=look.weight;
 // Local release accent starts on the cast event, without delaying projectile or damage.
 if(t<.10){ctx.globalAlpha=(1-t/.10)*.8;circle(ctx,from[0],from[1],(4+rank)*(.3+t*6),look.highlight);ctx.globalAlpha=1;}
 if(look.shape==='chain'||look.shape==='ball'){
  const count=(look.shape==='chain'?2:3)+rank-1;
  if(t<.15){
   const points=[[from[0],from[1]]];
   for(let i=1;i<=count;i++)points.push([lerp(from[0],to[0],i/count),to[1]+Math.sin(i*2.7)*12]);
   for(const p of points.slice(1)){ctx.fillStyle='#3a4441';ctx.beginPath();ctx.ellipse(p[0],p[1]+6,5,11,0,0,Math.PI*2);ctx.fill();}
   const jagged=[points[0]];
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];jagged.push([lerp(a[0],b[0],.35),lerp(a[1],b[1],.35)-8],[lerp(a[0],b[0],.7),lerp(a[1],b[1],.7)+6],b);}
   ctx.globalAlpha=1-t/.15;line(ctx,jagged,look.color,3*w);line(ctx,jagged,look.highlight,1.1);
   if(look.shape==='ball')for(const p of points.slice(1))circle(ctx,p[0],p[1],3.5*w,look.highlight);
   if(rank===3&&look.shape==='chain')line(ctx,[points[1],[points[1][0]+18,points[1][1]-17],[points[1][0]+37,points[1][1]-10]],look.color,2);
   ctx.globalAlpha=1;
  }
  if(t<.18)impactEffect(ctx,to[0],to[1],look,t,7);
 }else{
  const speed=projectileSpeed;
  const distance=to[0]-from[0],arrival=distance/speed,p=clamp(t/arrival),px=lerp(from[0],to[0],p),py=lerp(from[1],to[1],p);
  if(t<arrival){
   if(look.shape==='orb'){
    line(ctx,[[px-12-rank*4,py],[px,py]],look.color,rank===1?2:4);
    circle(ctx,px,py,rank===3?7:5,look.color);circle(ctx,px+1,py-1,2.3,look.highlight);
    if(rank===3){const angle=t*12;diamond(ctx,px+Math.cos(angle)*5,py+Math.sin(angle)*3,2,1,look.highlight);}
    if(rank>1)line(ctx,[[px-18,py-3],[px-9,py-3]],look.highlight,1);
   }else if(look.shape==='flame'){
    ctx.fillStyle='#733a2a';ctx.beginPath();ctx.moveTo(px+6,py);ctx.lineTo(px-21,py-7*w);ctx.lineTo(px-13,py);ctx.lineTo(px-24,py+6*w);ctx.closePath();ctx.fill();
    diamond(ctx,px,py,9*w,4*w,look.color);diamond(ctx,px+2,py,5,2,look.highlight);
    if(look.combinationId==='Frostfire'){
     for(const [dx,dy] of [[-5,-6],[4,-5],[-4,6]])diamond(ctx,px+dx,py+dy,3,1.5,'#a9e3ee');
    }
    for(let i=0;i<3;i++)circle(ctx,px-12-i*8,py+Math.sin(t*16+i)*4,1.2,look.color);
   }else if(look.shape==='shard'||look.shape==='lance'){
    const length=look.shape==='lance'?17:10;diamond(ctx,px,py,length,3+rank*.6,look.color);line(ctx,[[px-length+3,py],[px+length-2,py]],look.highlight,1.1);
    if(look.combinationId==='Frostfire')circle(ctx,px,py,2,'#ed9455');
    if(rank>1)line(ctx,[[px-20,py+3],[px-11,py+3]],look.color,1);
   }else{
    const length=look.shape==='needle'?11:8;diamond(ctx,px,py,length,2,look.highlight);line(ctx,[[px-26,py],[px-9,py]],look.color,rank);
    if(look.shape==='dart'&&rank>1)diamond(ctx,px-16,py,3,3,look.color);
   }
  }else if(t-arrival<.36){
   const age=t-arrival;
   if(look.combinationId==='Frostfire'){
    ctx.save();ctx.globalAlpha=1-clamp(age/.36);line(ctx,[[to[0]-5,to[1]+12],[to[0]-5,to[1]-10],[to[0]+6,to[1]-13]],'#b2e6ed',2);ctx.restore();
   }
   if(look.shape==='flame'&&rank===3){
    const radius=56*.55;impactEffect(ctx,to[0],to[1],look,age,radius);
   }else if(look.shape==='shard'&&rank===3){
    impactEffect(ctx,to[0],to[1],look,age,82*.38);
   }else if(look.shape==='dart'){
    ctx.globalAlpha=1-age/.36;diamond(ctx,to[0],to[1],7*w,9*w,look.color);diamond(ctx,to[0],to[1],4,6,'#152321');ctx.globalAlpha=1;
   }else impactEffect(ctx,to[0],to[1],look,age,8+rank*3);
  }
 }
 ctx.restore();ctx.fillStyle='#d7ddcc';ctx.font='13px sans-serif';ctx.fillText(`${look.combinationId??spellId.replace(/([a-z])([A-Z])/g,'$1 $2')} · ${['I','II','III'][rank-1]}`,x+10,y+19);
 ctx.fillStyle='#92aaa1';ctx.font='11px sans-serif';ctx.fillText(look.rankSignature,x+10,y+height-8);
 return {look,castSeconds,arrivalSeconds,launch:from,target:to};
}

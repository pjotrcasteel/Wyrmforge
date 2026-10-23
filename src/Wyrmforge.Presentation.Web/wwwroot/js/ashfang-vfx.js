// Ashfang's authored combat effects. All timing/regions come from C# snapshots.
// Fixed ember/ash ramps and snapped geometry match the native character pixels.
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const P={coal:'#17151b',ash:'#45434a',smoke:'#62616a',red:'#743734',ember:'#be603c',fire:'#de803f',hot:'#efa74e',core:'#f7e4ac',bone:'#b7b4aa'};
function rand(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);}
function block(ctx,x,y,w,h=w){ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function disc(ctx,x,y,r,color,alpha=1){ctx.fillStyle=color;ctx.globalAlpha*=alpha;for(let j=-r;j<=r;j+=3){const width=Math.sqrt(Math.max(0,r*r-j*j))*2;block(ctx,x-width/2,y+j,width,3);}ctx.globalAlpha/=alpha||1;}
function polygon(ctx,points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
function ring(ctx,x,y,r,color,alpha=1,segments=40){ctx.fillStyle=color;const old=ctx.globalAlpha;ctx.globalAlpha*=alpha;for(let i=0;i<segments;i++){const a=i/segments*TAU;block(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r,3,2);}ctx.globalAlpha=old;}

export function ashfangFirePlan(snapshot,sockets){
 const d=snapshot?.dragon;if(Number(d?.school)!==1||d.flightStage&&d.flightStage!=='ground'||d.frozen||!sockets?.mouth)return null;
 if(d.action!=='breath'||!['windup','strike','recover'].includes(d.actionPhase))return null;
 const dx=Number(d.directionX)||0,dy=Number(d.directionY)||0;
 return {stage:d.actionPhase,progress:clamp(d.actionProgress),mouth:sockets.mouth,root:{x:d.x,y:d.y},end:{x:d.x+dx*340,y:d.y+dy*340},direction:{x:dx,y:dy},halfAngle:.4,range:340};
}
export function ashfangVfxDiagnostics(snapshot,sockets){const fire=ashfangFirePlan(snapshot,sockets);return {fireStage:fire?.stage??null,effects:(snapshot?.ashfangEffects??[]).length,rainWarnings:(snapshot?.huntHazards??[]).filter(h=>h.fromAbove&&h.armed!==false).length,landingWarnings:(snapshot?.huntHazards??[]).filter(h=>h.effectKind==='landing').length};}

export function drawAshfangWarning(ctx,h,reducedMotion=false){
 const r=h.radius,p=clamp(h.progress),alpha=h.armed===false?.22:1;
 ctx.save();ctx.globalAlpha*=alpha;
 // A fixed outer rim is the exact damage boundary. Inward coals show time,
 // so the player's escape distance never changes as the warning expires.
 ctx.fillStyle='rgba(116,55,52,.12)';ctx.beginPath();ctx.arc(h.x,h.y,r,0,TAU);ctx.fill();
 ring(ctx,h.x,h.y,r,P.hot,.75,Math.max(24,Math.round(r*1.7)));
 ring(ctx,h.x,h.y,Math.max(3,r*(1-p)),P.ember,.4,24);
 for(let i=0;i<8;i++){const a=i/8*TAU;const x=h.x+Math.cos(a)*(r-6),y=h.y+Math.sin(a)*(r-6);block(ctx,x,y,3,3);}
 if(h.effectKind==='landing'){
  for(let side=-1;side<=1;side+=2)polygon(ctx,[[h.x+side*10,h.y-10],[h.x+side*(r*.45),h.y-30],[h.x+side*18,h.y+17]],P.ash);
 }
 ctx.restore();
}

export function drawAshfangGroundEffects(ctx,snapshot,reducedMotion=false){
 for(const e of snapshot.ashfangEffects??[]){
  const p=clamp(e.progress),r=e.radius;
  ctx.save();
  if(e.kind==='meteor'||e.kind==='cinder'){
   const life=1-p;
   // The cooled mark is explicitly dark, never another unexplained damage zone.
   ctx.globalAlpha=.45*life;disc(ctx,e.x,e.y,Math.max(6,r*.65),P.coal);
   ctx.globalAlpha=.38*life;
   for(let i=0;i<12;i++){const a=rand(e.id*41+i)*TAU,reach=r*(.2+rand(i+e.id)*.5);ctx.fillStyle=i%3?P.red:P.ember;block(ctx,e.x+Math.cos(a)*reach,e.y+Math.sin(a)*reach,2+(i%2));}
  }
  if(e.kind==='landing'||e.kind==='pounce'||e.kind==='roar'){
   ring(ctx,e.x,e.y,r*(.25+.75*p),P.bone,(1-p)*.55,reducedMotion?20:45);
   ctx.globalAlpha=(1-p)*.28;disc(ctx,e.x,e.y,r*(.3+.35*p),P.coal);
  }
  ctx.restore();
 }
}

function smoke(ctx,x,y,size,opacity,seed){
 ctx.save();ctx.globalAlpha*=opacity;
 const points=[];for(let i=0;i<8;i++){const a=i/8*TAU,rad=size*(.75+rand(seed+i)*.3);points.push([x+Math.cos(a)*rad,y+Math.sin(a)*rad*.7]);}
 polygon(ctx,points,P.ash);ctx.restore();
}
function flame(ctx,f,reducedMotion){
 const {mouth:m,end,direction:d,progress:p}=f;
 if(f.stage==='windup'){
  const heat=clamp((p-.25)/.75);
  if(!heat)return;
  ctx.save();ctx.globalAlpha=heat*.7;disc(ctx,m.x,m.y,4+heat*8,P.red);disc(ctx,m.x,m.y,2+heat*3,P.hot);
  for(let i=0;i<(reducedMotion?3:7);i++){const a=i/7*TAU,reach=(1-p)*22;ctx.fillStyle=P.ember;block(ctx,m.x+Math.cos(a)*reach,m.y+Math.sin(a)*reach,2);}
  ctx.restore();return;
 }
 if(f.stage==='recover'){
  for(let i=0;i<(reducedMotion?1:4);i++)smoke(ctx,m.x+d.x*(12+i*8),m.y-8-p*24-i*6,5+i*2,(1-p)*.26,i);
  return;
 }
 const envelope=Math.min(1,.45+p/.1,.45+(1-p)/.1),length=Math.hypot(end.x-m.x,end.y-m.y),nx=-d.y,ny=d.x;
 ctx.save();ctx.globalAlpha=.35*envelope;
 // Restrained diffuse fire light beneath the stream; never a full-screen wash.
 const glow=ctx.createRadialGradient(m.x,m.y,4,m.x,m.y,80);glow.addColorStop(0,'#de803f');glow.addColorStop(1,'rgba(116,55,52,0)');ctx.fillStyle=glow;ctx.fillRect(m.x-80,m.y-80,160,160);
 ctx.globalAlpha=.93*envelope;
 const slices=reducedMotion?16:42;
 for(let i=slices-1;i>=0;i--){
  const t=i/(slices-1),x=m.x+(end.x-m.x)*t,y=m.y+(end.y-m.y)*t;
  const width=5+Math.tan(f.halfAngle)*340*t*.78;
  const jitter=reducedMotion?0:Math.sin(i*1.8+p*48)*(2+7*t);
  const depth=length/slices+5,alongX=(end.x-m.x)/length,alongY=(end.y-m.y)/length;
  const left=[x+nx*(width+jitter),y+ny*(width+jitter)],right=[x-nx*(width-jitter),y-ny*(width-jitter)];
  polygon(ctx,[left,[left[0]+alongX*depth,left[1]+alongY*depth],[right[0]+alongX*depth,right[1]+alongY*depth],right],i%4===0?P.red:P.ember);
  const inner=width*(.32+.1*Math.sin(i+p*25));
  polygon(ctx,[[x+nx*inner,y+ny*inner],[x+alongX*depth+nx*inner,y+alongY*depth+ny*inner],[x+alongX*depth-nx*inner,y+alongY*depth-ny*inner],[x-nx*inner,y-ny*inner]],i%3===0?P.hot:P.fire);
  if(t<.55){ctx.fillStyle=P.core;block(ctx,x+nx*jitter*.3,y+ny*jitter*.3,3+4*(1-t),3);}
 }
 ctx.globalAlpha=.65*envelope;
 for(let i=0;i<(reducedMotion?5:18);i++){const t=(p*2+i*.071)%1,spread=(rand(i)-.5)*110*t;ctx.fillStyle=i%3?P.ember:P.hot;block(ctx,m.x+(end.x-m.x)*t+nx*spread,m.y+(end.y-m.y)*t+ny*spread-5,2+i%2);}
 ctx.restore();
}
function impact(ctx,e,reducedMotion){
 const p=clamp(e.progress),isFire=e.kind==='meteor'||e.kind==='cinder';
 ctx.save();
 if(isFire){
  const burst=clamp(p/.23),fade=clamp(1-p/.28);
  if(fade>0){
   const r=e.radius*(.25+burst*.75);ctx.globalAlpha=fade*.9;
   const count=reducedMotion?9:21;
   for(let i=0;i<count;i++){const a=i/count*TAU,reach=r*(.45+rand(i+e.id)*.55);ctx.fillStyle=i%3===0?P.hot:P.fire;block(ctx,e.x+Math.cos(a)*reach,e.y+Math.sin(a)*reach,4+(1-burst)*8,3+(1-burst)*9);}
   ctx.globalAlpha=fade*.75;disc(ctx,e.x,e.y,r*.22,P.core);
  }
  if(p<.52)for(let i=0;i<(reducedMotion?2:6);i++)smoke(ctx,e.x+(rand(i+e.id)-.5)*e.radius,e.y-p*70-i*4,6+p*17,clamp(1-p/.52)*.3,e.id+i);
 }else if(e.kind==='claw_right'){
  const a=Math.atan2(e.directionY,e.directionX)+Math.PI*.28;
  for(let i=0;i<3;i++){
   const offset=(i-1)*8,len=20+50*clamp(p/.6);ctx.strokeStyle=i===1?P.bone:P.ember;ctx.lineWidth=2;ctx.globalAlpha=1-p;
   ctx.beginPath();ctx.moveTo(Math.round(e.x-Math.cos(a)*len-Math.sin(a)*offset),Math.round(e.y-Math.sin(a)*len+Math.cos(a)*offset-10));ctx.lineTo(Math.round(e.x+Math.cos(a)*len*.5-Math.sin(a)*offset),Math.round(e.y+Math.sin(a)*len*.5+Math.cos(a)*offset));ctx.stroke();
  }
 }else if(e.kind==='bite'){
  for(let i=0;i<8;i++){const a=i/8*TAU,d=5+p*22;ctx.globalAlpha=1-p;ctx.fillStyle=i%2?P.bone:P.ash;block(ctx,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,3);}
 }else{
  const count=reducedMotion?8:24;
  for(let i=0;i<count;i++){const a=i/count*TAU,reach=e.radius*(.2+p*.8),h=Math.sin(p*Math.PI)*(5+rand(e.id+i)*20);ctx.globalAlpha=(1-p)*.6;ctx.fillStyle=i%4===0?P.bone:P.ash;block(ctx,e.x+Math.cos(a)*reach,e.y+Math.sin(a)*reach-h,2+i%4,2+i%3);}
  if(e.kind!=='roar')for(let i=0;i<(reducedMotion?3:9);i++){const a=i/9*TAU;smoke(ctx,e.x+Math.cos(a)*e.radius*p,e.y+Math.sin(a)*e.radius*p-p*8,4+p*12,(1-p)*.32,e.id+i);}
 }
 ctx.restore();
}
export function drawAshfangAirEffects(ctx,snapshot,sockets,reducedMotion=false){
 const fire=ashfangFirePlan(snapshot,sockets);if(fire)flame(ctx,fire,reducedMotion);
 for(const h of snapshot.huntHazards??[]){
  if(!h.fromAbove||h.armed===false)continue;
  const p=clamp(h.progress),height=(1-p)*230;
  const x=h.x+height*.12,y=h.y-height;
  ctx.save();ctx.globalAlpha=.8;
  // Faceted falling coal with a bright leading tip and a broken ember tail.
  for(let i=5;i>0;i--){ctx.globalAlpha=(1-i/7)*.6;ctx.fillStyle=i%2?P.red:P.ember;block(ctx,x+i*3,y-i*10,7-i,8);}
  ctx.globalAlpha=1;polygon(ctx,[[x-7,y-12],[x+4,y-17],[x+8,y-3],[x+1,y+8],[x-6,y+2]],P.red);polygon(ctx,[[x-4,y-6],[x+3,y-9],[x+5,y],[x,y+7]],P.fire);ctx.fillStyle=P.core;block(ctx,x,y+1,3,5);ctx.restore();
 }
 for(const e of snapshot.ashfangEffects??[])impact(ctx,e,reducedMotion);
 // Small body vents only during the actual enraged battle; anatomy stays clear.
 const d=snapshot.dragon;
 if(d?.phase===2&&snapshot.hunt?.stage===2&&d.flightStage==='ground'&&sockets?.chest){
  const p=Number(d.actionProgress)||0;
  for(const [i,key] of ['chest','wingLeft','wingRight'].entries()){const s=sockets[key];if(!s)continue;smoke(ctx,s.x,s.y-8-p*12,4,(1-p)*.18,i);ctx.fillStyle=P.ember;block(ctx,s.x+2,s.y-7-p*10,2,2);}
 }
}

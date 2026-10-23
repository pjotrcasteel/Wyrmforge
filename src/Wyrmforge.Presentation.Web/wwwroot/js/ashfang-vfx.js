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
const flameFrames=new Map();
function hash(x,y){let v=Math.imul(x,374761393)^Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const a=hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx,b=hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx;return a*(1-fy)+b*fy;}
export function ashfangFlameRaster(frame=0){
 const width=99,height=112,pixels=new Uint8ClampedArray(width*height*4);
 const colors=[[116,55,52],[190,96,60],[222,128,63],[239,167,78],[243,206,120],[247,228,172]];
 for(let y=0;y<height;y++){
  const t=y/(height-1),span=1.5+t*47;
  for(let x=0;x<width;x++){
   const cross=x-(width-1)/2;
   const curl=(noise(y/13,frame*.17)-.5)*span*.48;
   const central=1-Math.abs((cross+curl)/span);if(central<-.12)continue;
   const flow=y/7-frame*.74;
   const broad=noise(x/7,flow),fine=noise(x/2.7+31,y/4-frame*1.1);
   const heat=central*.53+(broad-.5)*.48+(fine-.5)*.20+.32-t*.09;
   if(heat<.22)continue;
   const index=heat>.88&&t<.22?5:heat>.74?4:heat>.58?3:heat>.43?2:heat>.32?1:0;
   const alpha=clamp((heat-.22)*3.8)*clamp((1-t)*7)*(index<2?.72:.96);
   const offset=(y*width+x)*4;pixels[offset]=colors[index][0];pixels[offset+1]=colors[index][1];pixels[offset+2]=colors[index][2];pixels[offset+3]=Math.round(alpha*255);
  }
 }
 return {width,height,pixels};
}
function flameTexture(frame){
 if(flameFrames.has(frame))return flameFrames.get(frame);
 const raster=ashfangFlameRaster(frame),canvas=document.createElement('canvas');canvas.width=raster.width;canvas.height=raster.height;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(raster.width,raster.height);data.data.set(raster.pixels);ctx.putImageData(data,0,0);
 flameFrames.set(frame,canvas);while(flameFrames.size>4)flameFrames.delete(flameFrames.keys().next().value);return canvas;
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
 const envelope=Math.min(1,.45+p/.1,.45+(1-p)/.1),length=Math.hypot(end.x-m.x,end.y-m.y);
 const angle=Math.atan2(end.y-m.y,end.x-m.x)-Math.PI/2;
 const texture=flameTexture(reducedMotion?4:Math.floor(p*12));
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.9*envelope;
 ctx.translate(m.x,m.y);ctx.rotate(angle);
 ctx.drawImage(texture,-148,0,296,length);
 ctx.restore();ctx.save();
 const nx=-(end.y-m.y)/length,ny=(end.x-m.x)/length;
 for(let i=0;i<(reducedMotion?2:6);i++){
  const t=.65+rand(i)*.35,side=(i%2?1:-1),spread=Math.tan(f.halfAngle)*340*t;
  smoke(ctx,m.x+(end.x-m.x)*t+nx*spread*.8*side,m.y+(end.y-m.y)*t+ny*spread*.8*side-7,6+9*t,envelope*.20,i);
 }
 ctx.globalAlpha=.7*envelope;
 for(let i=0;i<(reducedMotion?4:15);i++){const t=(p*2+i*.071)%1,spread=(rand(i)-.5)*100*t;ctx.fillStyle=i%4?P.ember:P.hot;block(ctx,m.x+(end.x-m.x)*t+nx*spread,m.y+(end.y-m.y)*t+ny*spread-5,2+i%2);}

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

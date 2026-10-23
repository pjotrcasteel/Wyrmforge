// Source-authored Ashfang pixels; snapshots own attacks, positions and defeat.
import { spriteDirection } from './rigged-sprites.js';
const base=new URL('../art/ashfang/runtime-001/',import.meta.url);
let manifest,loading;const textures=new Map(),errors=new Set();const MAX_TEXTURES=8;
export function createAshfangState(){return {entity:null,death:null,last:null,lastHud:0,clock:0};}
export function isAshfang(dragon){return Number(dragon?.school)===1;}
function texture(clip,direction){
 const spec=manifest?.clips[clip]?.facings[direction];if(!spec)return null;
 const key=clip+'/'+direction;
 if(textures.has(key)){const image=textures.get(key);textures.delete(key);textures.set(key,image);return image;}
 const image=new Image();image.onload=()=>{if(image.naturalWidth!==spec.width||image.naturalHeight!==spec.height)errors.add(key);};image.onerror=()=>errors.add(key);image.src=new URL(spec.image+'?v='+spec.hash,base).href;textures.set(key,image);
 while(textures.size>MAX_TEXTURES)textures.delete(textures.keys().next().value);
 return image;
}
export function preloadAshfang(){return loading??=fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('Ashfang bundle unavailable');return r.json();}).then(async m=>{manifest=m;const im=texture('idle','SE');await im.decode();return true;}).catch(()=>false);}
export function selectAshfangMotion(snapshot,previous,dt){
 const dragon=snapshot.dragon,hunt=snapshot.hunt,breath=snapshot.dragonBreath;
 if(!isAshfang(dragon))return null;
 const same=previous?.id===dragon.entityId;
 const dx=same?dragon.x-previous.x:0,dy=same?dragon.y-previous.y:0;
 const moved=Math.hypot(dx,dy),speed=dt>0?moved/dt:0;
 let direction=previous?.direction??'SE',clip='idle',progress=null;
 if(hunt?.stage===1){
  if(hunt.entranceBeat===1)return {clip:'idle',direction,hidden:true};
  clip=hunt.entranceBeat===2?'fly':'land';progress=hunt.entranceBeatProgress;
  direction=spriteDirection(dx,dy,direction);
 }else if(hunt?.stage===3){clip='roar';progress=hunt.stageProgress;direction=spriteDirection(snapshot.player.x-dragon.x,snapshot.player.y-dragon.y,direction);}
 else if(dragon.action&&dragon.action!=='idle'&&dragon.actionPhase!=='ready'){
  direction=spriteDirection(dragon.directionX,dragon.directionY,direction);
  const phase=dragon.actionProgress;
  if(dragon.action==='breath'){clip=dragon.actionPhase==='windup'?'breath_start':dragon.actionPhase==='strike'?'breath_loop':'breath_end';progress=phase;}
  else {clip=dragon.action;const hit=clip==='pounce'?.3:clip==='bite'?.45:.48,end=clip==='pounce'?.68:.6;progress=dragon.actionPhase==='windup'?phase*hit:dragon.actionPhase==='strike'?hit+phase*(end-hit):end+phase*(1-end);}
 }
 else if(breath){clip='breath_start';progress=dragon.telegraphProgress;direction=spriteDirection(breath.directionX,breath.directionY,direction);}
 else if(dragon.attackElapsed>=0&&dragon.attackElapsed<.22){clip='breath_loop';direction=spriteDirection(dragon.directionX,dragon.directionY,direction);progress=null;}
 else if(dragon.attackElapsed>=.22&&dragon.attackElapsed<.48){clip='breath_end';direction=spriteDirection(dragon.directionX,dragon.directionY,direction);progress=(dragon.attackElapsed-.22)/.26;}
 else if((moved>.001&&moved<80)||(same&&previous.motionAge<.12)){clip=(speed||previous.speed)>85?'run':'walk';direction=spriteDirection(dx,dy,direction);}
 else direction=spriteDirection(snapshot.player.x-dragon.x,snapshot.player.y-dragon.y,direction);
 return {clip,direction,progress,hidden:false};
}
// Short authored start/stop bridges own the support legs. Transitions consume
// the early warning, never postpone the simulation strike. No alpha ghosting.
export function advanceAshfangGraph(previous,desired,clock){
 if(!previous||desired.hidden)return {...desired,graph:null};
 const locomotion=c=>c==='walk'||c==='run';
 if(previous.graph){
  const g=previous.graph,age=clock-g.at;
  if(g.target===desired.clip&&age>=g.duration&&g.clip.endsWith('_stop')&&locomotion(desired.clip)){const clip=desired.clip+'_start';return {...desired,clip,progress:0,graph:{clip,target:desired.clip,at:clock,duration:.18}};}
  if(g.target===desired.clip&&age<g.duration)return {...desired,clip:g.clip,progress:age/g.duration,graph:g};
 }
 if(locomotion(previous.clip)&&desired.clip!==previous.clip){
  const bridge=previous.clip+'_stop',duration=.16;
  // Interrupt only inside the safe beginning of a windup; phase breaks,
  // entrance and the actual strike always take precedence.
  if(desired.clip==='idle'||locomotion(desired.clip)||(desired.progress!=null&&desired.progress<.1&&['bite','claw_right','pounce','breath_start'].includes(desired.clip)))
   return {...desired,clip:bridge,progress:0,graph:{clip:bridge,target:desired.clip,at:clock,duration}};
 }
 if(locomotion(desired.clip)&&!locomotion(previous.clip)&&!previous.graph){
  const bridge=desired.clip+'_start';return {...desired,clip:bridge,progress:0,graph:{clip:bridge,target:desired.clip,at:clock,duration:.18}};
 }
 return {...desired,graph:null};
}
export function updateAshfang(state,snapshot,seconds,reducedMotion=false){
 if(seconds<state.last||Number(snapshot.hud?.seconds??0)<state.lastHud)Object.assign(state,createAshfangState());
 const dt=state.last==null?0:Math.max(0,Math.min(.1,seconds-state.last));state.last=seconds;state.lastHud=Number(snapshot.hud?.seconds??0);
 if(!snapshot.paused&&!snapshot.ended&&!snapshot.dragon?.frozen)state.clock+=dt;
 const dragon=snapshot.dragon,old=state.entity;
 if(isAshfang(dragon)){
  if(snapshot.paused||dragon.frozen){if(old)return;}
  const desired=selectAshfangMotion(snapshot,old,dt);
  const sample=advanceAshfangGraph(old,desired,state.clock),changed=!old||old.clip!==sample.clip||old.id!==dragon.entityId;
  const moved=old&&Math.hypot(dragon.x-old.x,dragon.y-old.y)>.001;
  const distance=old?Math.hypot(dragon.x-old.x,dragon.y-old.y):0;
  const stride=manifest?.clips[desired.clip]?.travelPerCycle;
  const gaitPhase=(old?.gaitPhase??0)+(stride&&distance<80?distance/(stride*manifest.worldCell/22*(dragon.radius/60)):0);
  if(!sample.graph&&(sample.clip==='walk'||sample.clip==='run'))sample.progress=gaitPhase%1;
  state.entity={...sample,gaitPhase,motionAge:moved?0:(old?.motionAge??1)+dt,speed:moved&&dt>0?Math.hypot(dragon.x-old.x,dragon.y-old.y)/dt:old?.speed??0,id:dragon.entityId,x:dragon.x,y:dragon.y,radius:dragon.radius,at:changed?state.clock:old.at,frozen:dragon.frozen,reducedMotion};state.death=null;
 }else state.entity=null;
 const dead=snapshot.dragonDefeat;
 if(isAshfang(dead)){
  if(!state.death||state.death.id!==dead.entityId)state.death={id:dead.entityId,x:dead.x,y:dead.y,radius:dead.radius,direction:old?.direction??spriteDirection(dead.directionX,dead.directionY,'SE'),age:0};
  // Reward choices pause gameplay immediately on victory; the authored collapse
  // still completes behind that overlay. Explicit lab pause freezes it.
  if(!snapshot.presentationPaused)state.death.age+=dt;
 }else state.death=null;
}
function sampleFrame(state,p,death=false){
 const clip=death?'death':p.clip,spec=manifest?.clips[clip];if(!spec)return null;
 const frames=spec.facings[p.direction]?.frames;if(!frames)return null;
 const age=death?p.age:state.clock-p.at;
 const phase=p.progress!=null?p.progress:spec.loop?(age%spec.duration)/spec.duration:Math.min(1,age/spec.duration);
 const index=p.reducedMotion?(death?frames.length-1:0):Math.min(frames.length-1,Math.floor(Math.max(0,phase)*frames.length));
 return {clip,index,frame:frames[index]};
}
function drawBody(ctx,state,p,death=false){
 if(!p||p.hidden)return false;const sample=sampleFrame(state,p,death);if(!sample)return false;
 const im=texture(sample.clip,p.direction);if(!im?.complete||!im.naturalWidth||errors.has(sample.clip+'/'+p.direction))return false;
 const f=sample.frame,scale=manifest.worldCell/manifest.cell*(p.radius/manifest.tierIRadius),[sx,sy,w,h]=f.rect;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=death?Math.max(0,Math.min(1,8-p.age)):1;if(p.frozen)ctx.filter='sepia(1) saturate(1.6) hue-rotate(135deg)';
 ctx.drawImage(im,sx,sy,w,h,Math.round(p.x-f.pivot[0]*scale),Math.round(p.y-f.pivot[1]*scale),w*scale,h*scale);ctx.restore();
 state.lastDraw={clip:sample.clip,frame:sample.index,direction:p.direction,worldCell:manifest.worldCell*(p.radius/manifest.tierIRadius)};return true;
}
export function drawAshfang(ctx,state){return drawBody(ctx,state,state.entity);}
export function drawAshfangDeath(ctx,state){return drawBody(ctx,state,state.death,true);}
export function drawAshfangFire(ctx,state,snapshot,reducedMotion){
 const p=state.entity,d=snapshot.dragon;
 if(!p||!d||(d.action&&d.action!=='breath')||snapshot.hunt?.stage!==2||d.attackElapsed<0||d.attackElapsed>=.22||snapshot.dragonBreath||d.frozen)return;
 const sample=sampleFrame(state,p);if(!sample)return;
 const f=sample.frame,scale=manifest.worldCell/512*(p.radius/60),x=p.x+(f.mouth[0]-f.pivot[0])*scale,y=p.y+(f.mouth[1]-f.pivot[1])*scale;
 const ex=d.x+d.directionX*340,ey=d.y+d.directionY*340,age=d.attackElapsed;
 // Brief deterministic pixel embers acknowledge the C# cone strike. The
 // ground telegraph still shows the exact authoritative origin and range.
 ctx.save();ctx.imageSmoothingEnabled=false;
 const count=reducedMotion?9:25;
 for(let i=0;i<count;i++){const t=i/count,spread=Math.sin(i*7.3)*18*t,px=x+(ex-x)*t-d.directionY*spread,py=y+(ey-y)*t+d.directionX*spread;ctx.fillStyle=i%3?'#de803f':'#f7e4ac';ctx.globalAlpha=(1-age/.22)*(1-t*.6);const size=Math.max(2,Math.round(9*(1-t)));ctx.fillRect(Math.round(px),Math.round(py),size,size);}
 ctx.restore();
}
export function ashfangDiagnostics(state){return {ready:!!manifest,textures:textures.size,maxTextures:MAX_TEXTURES,errors:[...errors],entity:state.entity,death:state.death,lastDraw:state.lastDraw,worldCell:manifest?.worldCell};}

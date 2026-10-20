// Presentation only: C# remains authoritative for movement, contact damage and death.
const base = new URL('../art/enemies/hollow-rigged/', import.meta.url);
const rows = ['N','NE','E','SE','S','SW','W','NW'];
const headings = ['E','SE','S','SW','W','NW','N','NE'];
const textures = new Map();
let manifest, loading;
export function preloadHollowSprites() {
    return loading ??= fetch(new URL('manifest.json',base)).then(r=>{
        if(!r.ok)throw new Error('Hollow manifest unavailable');return r.json();
    }).then(async data=>{
        const decoded=await Promise.all(Object.entries(data.clips).map(([name,clip])=>new Promise(resolve=>{
            const image=new Image();
            image.onload=()=>{const ready=image.naturalWidth===clip.cell*clip.frames&&image.naturalHeight===clip.cell*8;
                if(ready)textures.set(name,image);resolve(ready);};
            image.onerror=()=>resolve(false);image.src=new URL(`${clip.image}?v=${clip.hash}`,base).href;
        })));
        if(decoded.every(Boolean))manifest=data;
        return hollowSpritesReady();
    }).catch(()=>false); // Existing painted/native art is the offline fallback.
}
export function hollowSpritesReady(){return Boolean(manifest&&textures.size===3);}
export function createHollowState(){return {entities:new Map(),corpses:new Map(),seen:new Set(),clock:0,last:null,lastHud:0};}
export function hollowDirection(dx,dy,previous){
    if(Math.hypot(dx,dy)<.001)return previous??'S';
    const angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
    const old=headings.indexOf(previous);
    if(old>=0&&Math.abs((angle-old*45+540)%360-180)<27.5)return previous;
    return headings[Math.round(angle/45)%8];
}
export function updateHollowSprites(state,snapshot,seconds,reducedMotion=false){
    const hud=Number(snapshot.hud?.seconds??0);
    if(seconds<state.last||hud<state.lastHud){Object.assign(state,createHollowState());}
    const dt=state.last==null?0:Math.max(0,Math.min(.1,seconds-state.last));
    state.last=seconds;state.lastHud=hud;
    if(!snapshot.paused&&!snapshot.ended)state.clock+=dt;
    const currentDeaths=new Set();
    for(const death of snapshot.deathBursts??[]){
        if(Number(death.kind)!==0||!Number.isSafeInteger(death.entityId))continue;
        const key=`${death.entityId}:0`;currentDeaths.add(key);
        if(state.seen.has(key))continue;
        const old=state.entities.get(death.entityId);
        state.corpses.set(key,{entityId:death.entityId,x:death.x,y:death.y,radius:death.bodyRadius,
            direction:old?.direction??'S',at:state.clock});
    }
    state.seen=currentDeaths;
    for(const [key,corpse] of state.corpses)if(state.clock-corpse.at>=4)state.corpses.delete(key);
    while(state.corpses.size>96)state.corpses.delete(state.corpses.keys().next().value);
    const present=new Set();
    for(const enemy of snapshot.enemies??[]){
        if(Number(enemy.kind)!==0)continue;
        const id=enemy.entityId;present.add(id);
        let pose=state.entities.get(id);
        if(!pose){pose={x:enemy.x,y:enemy.y,distance:0,direction:'S',clip:'walk',frame:0,attackAt:null,age:0,lastMove:-1};state.entities.set(id,pose);}
        const dx=enemy.x-pose.x,dy=enemy.y-pose.y,distance=Math.hypot(dx,dy);
        const advancing=!snapshot.paused&&!snapshot.ended&&!enemy.frozen;
        if(advancing)pose.age+=dt;
        if(advancing&&distance>.001&&distance<64){
            pose.distance+=distance;
            pose.lastMove=pose.age;
            if(pose.attackAt==null)pose.direction=hollowDirection(dx,dy,pose.direction);
        }
        if(distance>=64){pose.distance=0;pose.attackAt=null;}
        pose.x=enemy.x;pose.y=enemy.y;
        if(pose.attackAt!=null&&pose.age-pose.attackAt>=16/12)pose.attackAt=null;
        const player=snapshot.player;
        const touching=player&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<=(Number(enemy.radius)||11)+(Number(player.radius)||0);
        if(advancing&&touching&&pose.attackAt==null){
            pose.attackAt=pose.age;pose.direction=hollowDirection(player.x-enemy.x,player.y-enemy.y,pose.direction);
        }
        pose.clip=pose.attackAt==null?'walk':'attack';
        pose.frame=pose.clip==='attack'?Math.min(15,Math.floor((pose.age-pose.attackAt)*12)):
            pose.age-pose.lastMove<.12?Math.floor(pose.distance/18.387096774193548*16)%16:0;
        if(reducedMotion)pose.frame=pose.clip==='attack'?7:0;
        if(enemy.frozen)pose.frame=pose.frozenFrame??pose.frame;
        pose.frozenFrame=enemy.frozen?pose.frame:null;
    }
    for(const id of state.entities.keys())if(!present.has(id))state.entities.delete(id);
}
function draw(ctx,clipName,frame,direction,x,y,radius,opacity=1,filter='none'){
    const clip=manifest?.clips[clipName],image=textures.get(clipName);
    if(!hollowSpritesReady()||!clip||!image)return false;
    const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
    const size=clip.worldSize*scale,index=Math.max(0,Math.min(clip.frames-1,frame));
    ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));ctx.imageSmoothingEnabled=false;ctx.filter=filter;
    ctx.drawImage(image,index*clip.cell,Math.max(0,rows.indexOf(direction))*clip.cell,clip.cell,clip.cell,
        x-clip.anchor[0]/clip.cell*size,y-clip.anchor[1]/clip.cell*size,size,size);
    ctx.restore();return true;
}
export function drawHollowEnemy(ctx,enemy,state){
    if(Number(enemy.kind)!==0)return false;
    const pose=state.entities.get(enemy.entityId);
    if(!pose)return false;
    return draw(ctx,pose.clip,pose.frame,pose.direction,enemy.x,enemy.y,enemy.radius,enemy.opacity??1,
        enemy.hitFlash?'brightness(1.8) saturate(.25)':enemy.frozen?'sepia(1) saturate(1.7) hue-rotate(135deg)':'none');
}
export function drawHollowCorpses(ctx,state,reducedMotion=false){
    for(const corpse of state.corpses.values()){
        const age=state.clock-corpse.at;
        draw(ctx,'death',reducedMotion?23:Math.min(23,Math.floor(age*12)),corpse.direction,
            corpse.x,corpse.y,corpse.radius,age<3?1:4-age);
    }
}
export function hollowDiagnostics(state){
    return {ready:hollowSpritesReady(),entities:[...state.entities].map(([entityId,p])=>({entityId,clip:p.clip,frame:p.frame,direction:p.direction})),
        corpses:[...state.corpses.values()].map(p=>({entityId:p.entityId,direction:p.direction,age:state.clock-p.at,frame:Math.min(23,Math.floor((state.clock-p.at)*12))}))};
}

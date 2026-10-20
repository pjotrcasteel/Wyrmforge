// Profile-driven full-body sprites. Simulation snapshots remain read-only.
import {createSpriteAnimationState,updateSpriteAnimation} from './sprite-animation.js';
const headings=['E','SE','S','SW','W','NW','N','NE'];
export function spriteDirection(dx,dy,previous='S'){
    if(Math.hypot(dx,dy)<.001)return previous;
    const angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360,old=headings.indexOf(previous);
    if(old>=0&&Math.abs((angle-old*45+540)%360-180)<27.5)return previous;
    return headings[Math.round(angle/45)%8];
}
export function createRiggedSpriteRenderer({kind,base,fallbackProfile}){
    let manifest,profile=fallbackProfile,loading;const textures=new Map();
    const ready=()=>Boolean(manifest&&textures.size===Object.keys(manifest.clips).length);
    const createState=()=>({entities:new Map(),corpses:new Map(),seen:new Set(),clock:0,last:null,lastHud:0});
    function preload(){return loading??=Promise.all(['manifest.json','animation-profile.json'].map(file=>fetch(new URL(file,base)).then(r=>{if(!r.ok)throw Error('Sprite bundle unavailable');return r.json();}))).then(async([m,p])=>{
        const decoded=await Promise.all(Object.entries(m.clips).map(([name,c])=>new Promise(resolve=>{
            const image=new Image();image.onload=()=>{const valid=image.naturalWidth===c.cell*c.frames&&image.naturalHeight===c.cell*m.directions.length;if(valid)textures.set(name,image);resolve(valid);};image.onerror=()=>resolve(false);image.src=new URL(`${c.image}?v=${c.hash}`,base).href;
        })));
        if(decoded.every(Boolean)){manifest=m;profile=p;}return ready();
    }).catch(()=>false);}
    function update(state,snapshot,seconds,reducedMotion=false){
        const hud=Number(snapshot.hud?.seconds??0);
        if(seconds<state.last||hud<state.lastHud)Object.assign(state,createState());
        const dt=state.last==null?0:Math.max(0,Math.min(.1,seconds-state.last));state.last=seconds;state.lastHud=hud;
        if(!snapshot.paused&&!snapshot.ended)state.clock+=dt;
        const seen=new Set();
        for(const death of snapshot.deathBursts??[]){
            if(Number(death.kind)!==kind||!Number.isSafeInteger(death.entityId))continue;
            const key=`${death.entityId}:${kind}`;seen.add(key);if(state.seen.has(key))continue;
            state.corpses.set(key,{entityId:death.entityId,x:death.x,y:death.y,radius:death.bodyRadius,direction:state.entities.get(death.entityId)?.direction??'S',at:state.clock});
        }
        state.seen=seen;
        for(const[key,c]of state.corpses)if(state.clock-c.at>=4)state.corpses.delete(key);
        while(state.corpses.size>96)state.corpses.delete(state.corpses.keys().next().value);
        const present=new Set();
        for(const enemy of snapshot.enemies??[]){
            if(Number(enemy.kind)!==kind)continue;const id=enemy.entityId;present.add(id);
            let p=state.entities.get(id);
            if(!p){p={x:enemy.x,y:enemy.y,drawX:enemy.x,drawY:enemy.y,direction:'S',age:0,lastMove:-1,attackAt:null,animation:createSpriteAnimationState()};state.entities.set(id,p);}
            const dx=enemy.x-p.x,dy=enemy.y-p.y,distance=Math.hypot(dx,dy),advancing=!snapshot.paused&&!snapshot.ended&&!enemy.frozen;
            if(advancing){p.age+=dt;if(distance>.001&&distance<64){p.lastMove=p.age;p.direction=spriteDirection(dx,dy,p.direction);}}
            if(distance>=64){p.attackAt=null;p.animation=createSpriteAnimationState();p.drawX=enemy.x;p.drawY=enemy.y;}
            p.x=enemy.x;p.y=enemy.y;
            const attack=profile.actions.attack;
            if(p.attackAt!=null&&p.age-p.attackAt>=attack.frames/attack.fps)p.attackAt=null;
            const player=snapshot.player,touching=player&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<=(Number(enemy.radius)||11)+(Number(player.radius)||0);
            if(advancing&&touching&&p.attackAt==null){p.attackAt=p.age;p.anchor={x:p.drawX,y:p.drawY};p.window=-1;}
            if(advancing&&p.attackAt!=null&&player)p.direction=spriteDirection(player.x-enemy.x,player.y-enemy.y,p.direction);
            const sample=updateSpriteAnimation(p.animation,profile,{deltaSeconds:dt,distance:advancing&&distance<64?distance:0,moving:p.age-p.lastMove<.12,paused:snapshot.paused||snapshot.ended,frozen:enemy.frozen,reducedMotion,direction:p.direction,action:p.attackAt==null?null:{name:'attack',token:p.attackAt}});
            Object.assign(p,{direction:sample.direction,clip:sample.clip,frame:sample.frame,baseFrame:sample.baseFrame,layered:sample.layered});
            // A launch owns its support legs. Reconcile simulation travel only
            // during profile-authored flight/recovery windows, keeping plants still.
            if(advancing){
                if(sample.clip==='attack'&&!reducedMotion&&attack.motionWindows?.length){
                    const index=attack.motionWindows.findIndex(([start,end])=>sample.frame>=start&&sample.frame<=end);
                    if(index>=0){if(p.window!==index){p.anchor={x:p.drawX,y:p.drawY};p.window=index;}
                        const[start,end]=attack.motionWindows[index],amount=(sample.frame-start+1)/(end-start+1);
                        p.drawX=p.anchor.x+(enemy.x-p.anchor.x)*amount;p.drawY=p.anchor.y+(enemy.y-p.anchor.y)*amount;
                    }
                }else{p.drawX=enemy.x;p.drawY=enemy.y;}
            }
        }
        for(const id of state.entities.keys())if(!present.has(id))state.entities.delete(id);
    }
    function draw(ctx,name,frame,direction,x,y,radius,opacity=1,filter='none'){
        if(!ready())return false;const c=manifest.clips[name],image=textures.get(name);if(!c||!image)return false;
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11)),size=c.worldSize*scale;
        ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));ctx.imageSmoothingEnabled=false;ctx.filter=filter;
        ctx.drawImage(image,Math.max(0,Math.min(c.frames-1,frame))*c.cell,Math.max(0,manifest.directions.indexOf(direction))*c.cell,c.cell,c.cell,x-c.anchor[0]/c.cell*size,y-c.anchor[1]/c.cell*size,size,size);ctx.restore();return true;
    }
    function drawEnemy(ctx,enemy,state){
        if(Number(enemy.kind)!==kind)return false;const p=state.entities.get(enemy.entityId);if(!p)return false;
        return draw(ctx,p.clip,p.frame,p.direction,p.drawX,p.drawY,enemy.radius,enemy.opacity??1,enemy.hitFlash?'brightness(1.8) saturate(.25)':enemy.frozen?'sepia(1) saturate(1.7) hue-rotate(135deg)':'none');
    }
    function drawCorpses(ctx,state,reducedMotion=false){const spec=profile.actions.death;
        for(const c of state.corpses.values()){const age=state.clock-c.at;draw(ctx,'death',reducedMotion?spec.frames-1:Math.min(spec.frames-1,Math.floor(age*spec.fps)),c.direction,c.x,c.y,c.radius,age<3?1:4-age);}
    }
    function diagnostics(state){return{ready:ready(),entities:[...state.entities].map(([entityId,p])=>({entityId,clip:p.clip,frame:p.frame,direction:p.direction,baseFrame:p.baseFrame,phase:p.animation.phase,layered:p.layered,drawX:p.drawX,drawY:p.drawY,x:p.x,y:p.y})),corpses:[...state.corpses.values()].map(c=>({entityId:c.entityId,direction:c.direction,age:state.clock-c.at,frame:Math.min(profile.actions.death.frames-1,Math.floor((state.clock-c.at)*profile.actions.death.fps))}))};}
    return{preload,ready,createState,update,drawEnemy,drawCorpses,diagnostics};
}

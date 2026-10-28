// Presentation only: C# remains authoritative for movement, contact damage and death.
import { createCreatureAnimationAssets } from './creature-animation-assets.js';
import { createSpriteAnimationState, updateSpriteAnimation } from './sprite-animation.js';
import { createSpriteLayerCompositor } from './sprite-layer-compositor.js';
import { HOLLOW_RUN, sampleHollowRun } from './hollow-motion.js';
import { createHollowInjuryAssets, selectHollowInjuryVariant, hollowInjuryLabReview } from './hollow-injury-variants.js';
import { createHollowVariantAssets } from './hollow-arm-variants.js';
import { selectHollowAppearance } from './hollow-variation.js';
import { createHollowDeathAssets, selectHollowDeathVariant } from './hollow-death.js';
import { createHollowInjuryDeathAssets, selectHollowDeathInjury } from './hollow-injury-death.js';
import { createHollowFractureAssets, eligibleHollowFracture } from './hollow-fracture.js';
// The rejected procedural bone-burst proof is intentionally lab-only.
// Production deaths exclusively use the Hollowed's source-authored 3D atlases.
const foundationEnabled=new URLSearchParams(globalThis.location?.search??'').get('animationFoundation')==='1';
const foundation=createCreatureAnimationAssets(new URL('../art/review/animation-foundation-skin/',import.meta.url));
const base = new URL('../art/enemies/hollow-rigged/', import.meta.url);
const rows = ['N','NE','E','SE','S','SW','W','NW'];
const headings = ['E','SE','S','SW','W','NW','N','NE'];
const textures = new Map();
const injuries=createHollowInjuryAssets(new URL('injuries/',base));
const arms=createHollowVariantAssets(new URL('arms/',base));
const skeletalDeath=createHollowDeathAssets(new URL('death/',base));
const injuryDeaths=createHollowInjuryDeathAssets(new URL('death/injuries/',base));
const fracture=createHollowFractureAssets(new URL('death/fracture/',base));
const injuryLabReview=hollowInjuryLabReview();
let manifest, loading, profile, compositor;
export function preloadHollowSprites() {
    if(foundationEnabled)void foundation.preload();
    return loading ??= loadHollowSprites();
}
// Optional 3D death art never blocks normal enemy animation startup.
export function preloadHollowFracture() {
    return fracture.preload();
}
async function loadHollowSprites() {
    // Load cape-free actors independently: caped legacy atlas failures must not block them.
    const variants=Promise.all([injuries.preload(),arms.preload(),skeletalDeath.preload()]);
    void preloadHollowFracture();
    try {
        await loadLegacyHollowSprites();
    } catch {
        // The source-derived no-cape atlases are the production actors.
    }
    await variants;
    return hollowSpritesReady();
}
function loadLegacyHollowSprites() {
    return fetch(new URL('manifest.json',base)).then(r=>{
        if(!r.ok)throw new Error('Hollow manifest unavailable');return r.json();
    }).then(async data=>{
        const [metadata,animationProfile]=await Promise.all(['layers.json','animation-profile.json'].map(name=>fetch(new URL(name,base)).then(r=>{if(!r.ok)throw new Error('Hollow layer metadata unavailable');return r.json();})));
        for(const name of ['walk','attack'])if(metadata.sourceHashes[name].slice(0,12)!==data.clips[name].hash)throw new Error('Hollow metadata/source mismatch');
        const decoded=await Promise.all(Object.entries(data.clips).map(([name,clip])=>new Promise(resolve=>{
            const image=new Image();
            image.onload=()=>{const ready=image.naturalWidth===clip.cell*clip.frames&&image.naturalHeight===clip.cell*8;
                if(ready)textures.set(name,image);resolve(ready);};
            image.onerror=()=>resolve(false);image.src=new URL(`${clip.image}?v=${clip.hash}`,base).href;
        })));
        if(decoded.every(Boolean)){manifest=data;profile=animationProfile;compositor=createSpriteLayerCompositor(metadata,data.clips,textures,{maxTiles:96});}
        return Boolean(manifest&&textures.size===3);
    });
}
export function hollowSpritesReady(){return Boolean(arms.ready()||injuries.ready()||(manifest&&textures.size===3));}
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
            direction:old?.direction??'S',armVariant:old?.armVariant??'standard',
            visualScale:old?.visualScale??1,deathVariant:selectHollowDeathVariant(death.entityId),
            deathInjury:old?.deathInjury??'standard',
            deathStyle:fracture.ready() && eligibleHollowFracture(death.entityId,old?.deathInjury??'standard') ? 'fracture' : 'collapse',
            at:state.clock});
    }
    state.seen=currentDeaths;
    for(const [key,corpse] of state.corpses)if(state.clock-corpse.at>=4)state.corpses.delete(key);
    while(state.corpses.size>96)state.corpses.delete(state.corpses.keys().next().value);
    const present=new Set();
    for(const enemy of snapshot.enemies??[]){
        if(Number(enemy.kind)!==0)continue;
        const id=enemy.entityId;present.add(id);
        let pose=state.entities.get(id);
        if(!pose){
            const persona=selectHollowAppearance(id,injuryLabReview);
            const animation=createSpriteAnimationState();
            animation.phase=persona.initialPhase;
            pose={x:enemy.x,y:enemy.y,distance:0,visualDistance:0,runSpeed:null,lastSampleAge:null,
                direction:'S',clip:'walk',frame:0,injuryVariant:persona.injuryVariant,
                armVariant:persona.armVariant,visualScale:persona.visualScale,
                idleFrame:persona.idleFrame,signature:persona.signature,
                attackAt:null,age:0,lastMove:-1,animation};
            pose.deathInjury=selectHollowDeathInjury(pose);
            // Only download the specific 3D damaged collapse if this injured
            // silhouette actually spawns; no eager 3×7 MB mobile atlas load.
            if(pose.deathInjury!=='standard')
                void injuryDeaths.preload(pose.deathInjury);
            state.entities.set(id,pose);
        }
        const dx=enemy.x-pose.x,dy=enemy.y-pose.y,distance=Math.hypot(dx,dy);
        const advancing=!snapshot.paused&&!snapshot.ended&&!enemy.frozen;
        if(advancing)pose.age+=dt;
        if(advancing&&distance>.001&&distance<64){
            pose.direction=hollowDirection(dx,dy,pose.direction);
        }
        if(distance>=64){pose.distance=0;pose.visualDistance=0;pose.runSpeed=null;pose.lastSampleAge=null;
            pose.lastMove=-1;pose.attackAt=null;pose.animation=createSpriteAnimationState();pose.foundationAnimation=null;pose.foundationSample=null;pose.foundationCue=null;pose.foundationContacts=null;pose.foundationError=null;pose.foundationFailure=null;}
        pose.x=enemy.x;pose.y=enemy.y;
        const locomotion=sampleHollowRun(pose,distance,dt,advancing);
        if(pose.attackAt!=null&&pose.age-pose.attackAt>=16/12)pose.attackAt=null;
        const player=snapshot.player;
        const touching=player&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<=(Number(enemy.radius)||11)+(Number(player.radius)||0);
        if(advancing&&touching&&pose.attackAt==null){
            pose.attackAt=pose.age;pose.direction=hollowDirection(player.x-enemy.x,player.y-enemy.y,pose.direction);
        }
        // Continue steering the existing action toward its target. Changing
        // direction never creates a new action token or restarts either clip.
        if(advancing&&pose.attackAt!=null&&player)pose.direction=hollowDirection(player.x-enemy.x,player.y-enemy.y,pose.direction);
        // Playback uses a common controller; only the contact signal belongs
        // to this creature adapter. Profile data owns stride, regions and clips.
        const config=profile??fallbackProfile;
        const sample=updateSpriteAnimation(pose.animation,config,{deltaSeconds:dt,
            distance:locomotion.distance,moving:locomotion.moving,
            paused:snapshot.paused||snapshot.ended,frozen:enemy.frozen,reducedMotion,direction:pose.direction,
            action:pose.attackAt==null?null:{name:'attack',token:pose.attackAt}});
        pose.direction=sample.direction;pose.clip=sample.clip;
        pose.frame=!locomotion.moving&&sample.clip==='walk'&&!reducedMotion?pose.idleFrame:sample.frame;
        pose.baseFrame=sample.baseFrame;pose.layered=sample.layered;
        // Candidate cutover is explicit and anatomy-safe. Healthy proof never
        // substitutes a missing/broken limb; legacy gameplay/deaths stay intact.
        if(foundationEnabled&&foundation.ready()&&pose.armVariant==='standard'&&pose.injuryVariant==='standard'){
            pose.foundationAnimation??=createSpriteAnimationState();
            // The shared lifecycle owns action completion. Legacy render-age
            // expiration must not enqueue a second cue against C# sample time.
            if(advancing&&touching&&!pose.foundationAnimation.action){
                pose.foundationSequence=(pose.foundationSequence??-1)+1;
                pose.foundationCue={name:'attack',token:`proximity-${id}-${pose.foundationSequence}`,sequence:pose.foundationSequence};
            }
            pose.foundationSample=updateSpriteAnimation(pose.foundationAnimation,foundation.profile,{
                entityId:id,timestamp:Number.isFinite(snapshot.simulationTimeSeconds)?snapshot.simulationTimeSeconds:pose.age,travel:pose.distance,scale:Math.max(.65,Math.min(1.8,(Number(enemy.radius)||11)/11))*pose.visualScale,world:{x:enemy.x,y:enemy.y},direction:pose.direction,
                velocity:{x:dt>0?dx/dt:0,y:dt>0?dy/dt:0},
                moving:locomotion.moving,paused:snapshot.paused||snapshot.ended,frozen:enemy.frozen,reducedMotion,
                action:pose.foundationCue??null});
            if(foundation.manifest.regions||foundation.manifest.skin){
                pose.foundationContacts??={};
                try{
                    pose.foundationSample=(foundation.manifest.skin?foundation.updateSkin:foundation.updateRegions)(pose.foundationContacts,pose.foundationSample,{
                        timestamp:Number.isFinite(snapshot.simulationTimeSeconds)?snapshot.simulationTimeSeconds:pose.age,
                        world:{x:enemy.x,y:enemy.y},scale:Math.max(.65,Math.min(1.8,(Number(enemy.radius)||11)/11))*pose.visualScale,
                        paused:snapshot.paused||snapshot.ended,frozen:enemy.frozen,
                        maxCorrection:foundation.manifest.regions?.maxCorrectionMetres,
                        maxRootCorrection:foundation.manifest.regions?.maxRootCorrectionMetres??0});
                    pose.foundationError=null;pose.foundationFailure=null;
                }catch(error){
                    // Preserve the diagnosis and use this actor's existing art.
                    // Failed contact poses must never masquerade as grounded.
                    pose.foundationError=error.message;
                    pose.foundationFailure={clip:pose.foundationSample?.clip,frame:pose.foundationSample?.frame,direction:pose.foundationSample?.direction,phase:pose.foundationSample?.contactPhase,contactId:error.contactId??null,requiredCorrectionMetres:error.requiredCorrectionMetres??null,maxCorrectionMetres:error.maxCorrectionMetres??null};
                    pose.foundationSample=null;
                }
            }
        }
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
    if(pose.foundationSample&&foundation.draw(ctx,pose.foundationSample,enemy.x,enemy.y,enemy.radius*pose.visualScale,enemy.opacity??1))return true;
    const palette=enemy.hitFlash?'brightness(1.8) saturate(.25)':enemy.frozen?
        'sepia(1) saturate(1.7) hue-rotate(135deg)':'none';
    // Source-derived no-cape walk and reach animations own the runtime appearance.
    // Keep the previous caped compositor strictly as an offline asset fallback.
    if(injuries.draw(ctx,pose.injuryVariant,pose.clip,pose.frame,pose.direction,
        enemy.x,enemy.y,enemy.radius*pose.visualScale,enemy.opacity??1,palette))return true;
    if(arms.draw(ctx,pose.armVariant,pose.clip,pose.frame,pose.direction,
        enemy.x,enemy.y,enemy.radius*pose.visualScale,enemy.opacity??1,palette))return true;
    const legacyPreview=globalThis.location?.pathname?.includes('/enemy-lab')&&new URLSearchParams(globalThis.location.search).get('blend')==='whole';
    if(pose.layered&&compositor&&!legacyPreview){
        const tile=compositor.compose(pose.animation.sample);
        const scale=Math.max(.65,Math.min(1.8,(Number(enemy.radius)||11)/11));
        const size=manifest.clips.attack.worldSize*scale*pose.visualScale;
        ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,enemy.opacity??1));ctx.imageSmoothingEnabled=false;
        ctx.filter=enemy.hitFlash?'brightness(1.8) saturate(.25)':enemy.frozen?'sepia(1) saturate(1.7) hue-rotate(135deg)':'none';
        ctx.drawImage(tile,enemy.x-size/2,enemy.y-88/128*size,size,size);ctx.restore();return true;
    }
    return draw(ctx,pose.clip,pose.frame,pose.direction,enemy.x,enemy.y,enemy.radius*pose.visualScale,enemy.opacity??1,
        enemy.hitFlash?'brightness(1.8) saturate(.25)':enemy.frozen?'sepia(1) saturate(1.7) hue-rotate(135deg)':'none');
}
export function hollowSkinDescriptor(enemy,state){
    const pose=state.entities.get(enemy.entityId);
    if(!foundationEnabled||!pose?.foundationSample?.skinPose||pose.foundationError||enemy.hitFlash||enemy.frozen)return null;
    return {...foundation.renderDescriptor(pose.foundationSample),scale:Math.max(.65,Math.min(1.8,(Number(enemy.radius)||11)/11))*pose.visualScale};
}
export function drawHollowSkinSupportOverlay(ctx,state){
    if(new URLSearchParams(globalThis.location?.search??'').get('animationContacts')!=='1')return;
    ctx.save();ctx.lineWidth=.65;ctx.font='8px monospace';
    for(const pose of state.entities.values()){
        const sample=pose.foundationSample;if(!sample?.skinPose||!sample.sourcePose)continue;
        const scale=pose.foundationAnimation.sourceScale,b=sample.sourceSupport.groundBasis,h=foundation.profile.sourceSupport.heightProjection,z=foundation.profile.sourceSupport.groundZ;
        const project=p=>[pose.x+(b[0]*p[0]+b[1]*p[1]+h[0]*(p[2]-z))*scale,pose.y+(b[2]*p[0]+b[3]*p[1]+h[1]*(p[2]-z))*scale];
        ctx.strokeStyle='#99bbff';
        for(const bone of Object.values(sample.sourcePose.sourceBones)){const a=project(bone.head),b=project(bone.tail);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
        for(const contact of Object.values(sample.sourcePose.sourceContacts)){
            ctx.strokeStyle=contact.planted?'#55ff88':'#ffaa44';ctx.beginPath();contact.footprint.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.stroke();
        }
        const center=project(sample.sourcePose.massCenter);ctx.fillStyle='#ff66dd';ctx.fillRect(center[0]-1,center[1]-1,2,2);
        ctx.fillStyle='#ffffff';ctx.fillText(sample.clip+' '+sample.contactPhase.toFixed(2),pose.x-28,pose.y+12);
    }
    ctx.restore();
}
export function drawHollowCorpses(ctx,state,reducedMotion=false){
    for(const corpse of state.corpses.values()){
        const age=state.clock-corpse.at;
        // The approved original Blender fracture replaces collapse only with all 8 real atlases.
        // Missing art always falls back to source-authored 3D death poses.
        if(corpse.deathStyle==='fracture' && fracture.draw(ctx,corpse,age,reducedMotion))continue;
        const deathFrame=reducedMotion?23:Math.min(23,Math.floor(age*12));
        const alpha=age<3?1:Math.max(0,4-age);
        if(injuryDeaths.draw(ctx,corpse.deathInjury,deathFrame,corpse.direction,
            corpse.x,corpse.y,corpse.radius*corpse.visualScale,alpha))continue;
        if(corpse.deathInjury!=='standard') {
            // Failure-safe: never regenerate a missing/guarded arm or healthy
            // leg by switching a damaged corpse to the standard healthy rig.
            // Briefly fade its own source pose until the 3D injury atlas loads.
            const fallbackAlpha=Math.max(0,1-age/.3);
            if(fallbackAlpha>0) {
                const radius=corpse.radius*corpse.visualScale;
                if(corpse.deathInjury==='broken-leg-left')
                    injuries.draw(ctx,'broken-leg-left','walk',0,corpse.direction,
                        corpse.x,corpse.y,radius,fallbackAlpha);
                else
                    arms.draw(ctx,corpse.armVariant,'walk',0,corpse.direction,
                        corpse.x,corpse.y,radius,fallbackAlpha);
            }
            continue;
        }
        if(skeletalDeath.draw(ctx,corpse.deathVariant,deathFrame,
            corpse.direction,corpse.x,corpse.y,corpse.radius*corpse.visualScale,
            age<3?1:Math.max(0,4-age)))continue;
        if(arms.ready()) {
            // Missing 3D death art must never resurrect the cape or recreate the
            // rejected 2D spinning-corpse animation. Briefly fade the last actor.
            const opacity=Math.max(0,1-age/.3);
            if(opacity>0)arms.draw(ctx,corpse.armVariant,'walk',0,corpse.direction,
                corpse.x,corpse.y,corpse.radius*corpse.visualScale,opacity);
        } else {
            draw(ctx,'death',reducedMotion?23:Math.min(23,Math.floor(age*12)),corpse.direction,
                corpse.x,corpse.y,corpse.radius*corpse.visualScale,age<3?1:4-age);
        }
    }
}
export function hollowDiagnostics(state){
    return {ready:hollowSpritesReady(),fractureReady:fracture.ready(),capeFreeReady:arms.ready(),skeletalDeathReady:skeletalDeath.ready(),injuryDeathAtlasesLoaded:injuryDeaths.loadedCount(),injuriesReady:injuries.ready(),armsReady:arms.ready(),injuryLabReview,foundation:{enabled:foundationEnabled,ready:foundation.ready(),error:foundation.error??null},layers:compositor?{...compositor.stats,estimatedBytes:compositor.estimatedBytes()}:null,entities:[...state.entities].map(([entityId,p])=>({entityId,injuryVariant:p.injuryVariant,armVariant:p.armVariant,deathInjury:p.deathInjury,signature:p.signature,visualScale:p.visualScale,idleFrame:p.idleFrame,runSpeed:p.runSpeed,observedDistance:p.distance,visualDistance:p.visualDistance,injuryDrawn:injuries.ready()&&p.injuryVariant==='broken-leg-left'&&(p.clip==='walk'||p.clip==='attack'),clip:p.clip,frame:p.frame,direction:p.direction,baseFrame:p.baseFrame,phase:p.animation?.phase,layered:p.layered,foundationError:p.foundationError??null,foundationFailure:p.foundationFailure??null,foundation:p.foundationSample?{clip:p.foundationSample.clip,frame:p.foundationSample.frame,direction:p.foundationSample.direction,actionToken:p.foundationSample.actionToken,actionProgress:p.foundationSample.actionProgress,sourceYaw:p.foundationSample.sourceSupport?.yaw??null,contactPhase:p.foundationSample.contactPhase,transported:p.foundationSample.debug.transported??false,supportMargin:p.foundationSample.debug.support?.margin??null,maxSlip:p.foundationSample.debug.maxSlip,rootOffset:p.foundationSample.rootOffset,regional:p.foundationSample.debug.regional??null}:null})),
        corpses:[...state.corpses.values()].map(p=>({entityId:p.entityId,deathVariant:p.deathVariant,deathInjury:p.deathInjury,deathStyle:p.deathStyle,direction:p.direction,age:state.clock-p.at,frame:Math.min(23,Math.floor((state.clock-p.at)*12))}))};
}
// Preserve playback/fallback diagnostics while the asset bundle is loading.
const fallbackProfile={locomotion:{clip:'walk',frames:HOLLOW_RUN.frames,stride:HOLLOW_RUN.stride},actions:{attack:{clip:'attack',frames:16,fps:12,mode:'fullBody',reducedFrame:7}}};


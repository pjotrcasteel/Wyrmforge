// Production wizard sprites: same loader, animator, and frame renderer as other rigged actors.
// Never infer real animation from a still, and never activate unapproved prototype atlases.
import {createRiggedSpriteRenderer,spriteDirection} from './rigged-sprites.js';
import {createSpriteAnimationState,updateSpriteAnimation} from './sprite-animation.js';

export const WIZARD_VISUAL_ID='gothic-grey-wizard-2026-10-24';
export const WIZARD_DIRECTIONS=Object.freeze(['N','NE','E','SE','S','SW','W','NW']);
export const WIZARD_CLIPS=Object.freeze({idle:12,walk:16,cast:20,hurt:10,death:24});

export function isApprovedWizardManifest(manifest) {
    const proof=manifest?.acceptance;
    if(manifest?.schemaVersion!==1 || !Array.isArray(manifest.directions) ||
       manifest.directions.join(',')!==WIZARD_DIRECTIONS.join(','))return false;
    if(proof?.visualId!==WIZARD_VISUAL_ID || proof?.ownerApproved!==true ||
       proof?.nativeGameplayReviewed!==true || proof?.sharedLightingVerified!==true)return false;
    return Object.entries(WIZARD_CLIPS).every(([name,frames])=>{
        const clip=manifest.clips?.[name];
        return clip?.frames===frames && Number.isInteger(clip.cell) && clip.cell>=64 &&
            Array.isArray(clip.anchor) && clip.anchor.length===2 &&
            clip.anchor.every(x=>Number.isFinite(x)) && clip.worldSize>0 &&
            typeof clip.image==='string' && clip.image.endsWith('.png');
    });
}

export function createWizardPlayerSprites({
    base=new URL('../art/characters/wizard/fire/',import.meta.url),
    renderer=createRiggedSpriteRenderer({kind:-1,base,fallbackProfile:{}}),
}={}) {
    let approved=false;
    const ready=()=>approved&&renderer.ready();
    const preload=async()=>{
        try {
            const loaded=await renderer.preload();
            approved=Boolean(loaded && isApprovedWizardManifest(renderer.getManifest()));
        }catch{
            approved=false;
        }
        return ready();
    };
    const createState=()=>({
        animation:createSpriteAnimationState(),
        x:null,y:null,seconds:null,lastMove:-Infinity,
        direction:'S',castActive:false,castProgress:0,castToken:0,
        hurtToken:0,wasHit:false,
    });
    function draw(ctx,player,cast,seconds,state,options={}) {
        if(!ready() || !player || !state || !Number.isFinite(seconds))return false;
        const dx=state.x==null?0:player.x-state.x;
        const dy=state.y==null?0:player.y-state.y;
        const dist=Math.hypot(dx,dy),teleport=dist>=48;
        const step=state.seconds==null?0:Math.max(0,Math.min(.1,seconds-state.seconds));
        const advancing=!options.paused&&!options.frozen;
        if(teleport)state.animation=createSpriteAnimationState();
        if(advancing&&dist>.3&&!teleport){
            state.lastMove=seconds;
            state.direction=spriteDirection(dx,dy,state.direction);
        }
        state.x=player.x;state.y=player.y;state.seconds=seconds;
        const casting=cast&&Number.isFinite(cast.progress)&&cast.progress>=0&&cast.progress<1;
        if(casting){
            if(!state.castActive || cast.progress<state.castProgress-.25)state.castToken++;
            state.castProgress=cast.progress;
            state.castActive=true;
            if(Number.isFinite(cast.angle))
                state.direction=spriteDirection(Math.cos(cast.angle),Math.sin(cast.angle),state.direction);
        }else state.castActive=false;
        const hit=Boolean(options.hit);
        if(hit&&!state.wasHit)state.hurtToken++;
        state.wasHit=hit;
        const action=hit?{name:'hurt',token:'hurt-'+state.hurtToken}:
            casting?{name:'cast',token:'cast-'+state.castToken,progress:cast.progress}:null;
        const sample=updateSpriteAnimation(state.animation,renderer.getAnimationProfile(),{
            deltaSeconds:step,distance:advancing&&!teleport?dist:0,
            moving:advancing&&seconds-state.lastMove<.16,
            paused:options.paused,frozen:options.frozen,reducedMotion:options.reducedMotion,
            direction:state.direction,action,
        });
        return renderer.drawFrame(ctx,sample.clip,sample.frame,sample.direction,
            player.x,player.y,player.radius,1,hit?'brightness(1.2)':'none');
    }
    return{preload,ready,createState,draw};
}

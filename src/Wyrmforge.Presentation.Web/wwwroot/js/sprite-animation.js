// Shared, anatomy-independent playback. Input signals never change gameplay.
export function createSpriteAnimationState(){
    return {phase:0,time:0,action:null,lastToken:null,supportFrame:0,sample:null};
}
function resolveFacing(state,profile,input,dt,stopped){
    const target=input.direction??'S',spec=profile.facing;
    if(!spec)return target;
    const index=spec.directions.indexOf(target);
    if(index<0)return state.sample?.direction??target;
    const step=360/spec.directions.length,angle=index*step;
    if(state.facingAngle==null){state.facingAngle=angle;state.facingIndex=index;}
    if(!stopped){
        const delta=(angle-state.facingAngle+540)%360-180;
        const limit=input.reducedMotion?180:spec.degreesPerSecond*dt;
        state.facingAngle=(state.facingAngle+Math.max(-limit,Math.min(limit,delta))+360)%360;
        const fromRow=(state.facingAngle-state.facingIndex*step+540)%360-180;
        if(Math.abs(fromRow)>step/2+(spec.hysteresisDegrees??3))state.facingIndex=Math.round(state.facingAngle/step)%spec.directions.length;
    }
    return spec.directions[state.facingIndex];
}
export function updateSpriteAnimation(state,profile,input){
    const stopped=input.paused||input.frozen;
    const dt=stopped?0:Math.max(0,Math.min(profile.maxDeltaSeconds??.1,Number(input.deltaSeconds)||0));
    state.time+=dt;
    if(!stopped){
        const stride=profile.locomotion.stride;
        state.phase=((state.phase+(Number(input.distance)||0)/stride)%1+1)%1;
    }
    const signal=input.action;
    if(signal&&signal.token!==state.lastToken){
        const spec=profile.actions[signal.name];
        if(spec&&(!state.action||(spec.priority??0)>=(profile.actions[state.action.name].priority??0))){
            state.action={name:signal.name,token:signal.token,started:state.time,progress:null};state.lastToken=signal.token;
        }
    }
    let actionFrame=null,actionSpec=null;
    if(state.action){
        actionSpec=profile.actions[state.action.name];
        if(!stopped&&signal?.token===state.action.token&&Number.isFinite(signal.progress))state.action.progress=Math.max(0,Math.min(1,signal.progress));
        const elapsed=state.time-state.action.started;
        const position=state.action.progress==null?elapsed*actionSpec.fps:state.action.progress*actionSpec.frames;
        if(position>=actionSpec.frames&&!actionSpec.hold){state.action=null;actionSpec=null;}
        else actionFrame=Math.min(actionSpec.frames-1,Math.floor(position));
    }
    const moving=Boolean(input.moving);
    if(!stopped)state.supportFrame=moving?Math.floor(state.phase*profile.locomotion.frames)%profile.locomotion.frames:0;
    const idle=profile.idle;
    const useIdle=!moving && !state.action && idle?.clip && idle?.frames>0;
    const baseFrame=input.reducedMotion?0:
        useIdle?Math.floor(state.time*(idle.fps??12))%idle.frames:state.supportFrame;
    if(input.reducedMotion&&actionSpec)actionFrame=actionSpec.reducedFrame??0;
    const layered=Boolean(actionSpec?.mode==='regions'&&moving&&!input.reducedMotion);
    state.sample={baseClip:useIdle?idle.clip:profile.locomotion.clip,baseFrame,phase:state.phase,
        clip:actionSpec?.clip??(useIdle?idle.clip:profile.locomotion.clip),frame:actionSpec?actionFrame:baseFrame,
        direction:resolveFacing(state,profile,input,dt,stopped),layered,baseRegion:actionSpec?.supportRegion,actionRegion:actionSpec?.region,
        useBasePose:layered&&(actionFrame===(actionSpec.entryFrame??-1)||actionFrame===(actionSpec.exitFrame??-1))};
    return state.sample;
}

// Shared, anatomy-independent playback. Input signals never change gameplay.
export function createSpriteAnimationState(){
    return {phase:0,time:0,action:null,lastToken:null,supportFrame:0,sample:null};
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
    const baseFrame=input.reducedMotion?0:state.supportFrame;
    if(input.reducedMotion&&actionSpec)actionFrame=actionSpec.reducedFrame??0;
    const layered=Boolean(actionSpec?.mode==='regions'&&moving&&!input.reducedMotion);
    state.sample={baseClip:profile.locomotion.clip,baseFrame,phase:state.phase,
        clip:actionSpec?.clip??profile.locomotion.clip,frame:actionSpec?actionFrame:baseFrame,
        direction:input.direction??'S',layered,baseRegion:actionSpec?.supportRegion,actionRegion:actionSpec?.region,
        useBasePose:layered&&(actionFrame===(actionSpec.entryFrame??-1)||actionFrame===(actionSpec.exitFrame??-1))};
    return state.sample;
}

// Animation intent only. C# retains movement, collision, attack and damage authority.
// Lower-body stride (or crawler hand plants) and upper-body claw action run in
// independent channels; changing target direction MUST NOT restart a committed hit.
// Actual source-skinned layered assets are gated on Blender/mobile art approval.
const headings=Object.freeze(['E','SE','S','SW','W','NW','N','NE']);
export const HOLLOW_ATTACK_DURATION=16/12;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=t=>{const s=clamp(t,0,1);return s*s*(3-2*s);};
const toAngle=direction=>headings.indexOf(direction)*45;
const toDirection=angle=>headings[((Math.round(((angle%360)+360)%360/45))%8+8)%8];

export function createHollowCombatLayers(facing='S') {
    const direction=headings.includes(facing)?facing:'S';
    return {token:null,committedFacing:direction,upperAngle:toAngle(direction),
        movementFacing:direction,upperFacing:direction,actionWeight:0,
        lastFrame:0,actionFrame:0};
}

export function updateHollowCombatLayers(state,input) {
    const delta=input.paused||input.frozen?0:clamp(Number(input.deltaSeconds)||0,0,.1);
    const movement=headings.includes(input.movementFacing)?input.movementFacing:state.movementFacing;
    const target=headings.includes(input.targetFacing)?input.targetFacing:movement;
    const token=input.attackToken??null;
    const newAttack=token!==null&&state.token!==token;
    if(newAttack){
        // Latch the swing's direction when it starts. A fleeing player
        // cannot reverse a fully committed attack halfway through impact.
        state.token=token;
        state.committedFacing=target;
        state.upperAngle=toAngle(target);
    }
    const elapsed=Number(input.attackElapsed);
    const attacking=token!==null&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<HOLLOW_ATTACK_DURATION;
    const phase=attacking?elapsed/HOLLOW_ATTACK_DURATION:1;
    if(!attacking&&token===null)state.token=null;
    state.movementFacing=movement;
    const actionFrame=attacking?Math.min(15,Math.floor(elapsed*12)):0;
    // Upper body winds up and recovers independently of the legs/crawl cycle.
    // Lower-body animation is never stopped by this envelope.
    let weight=attacking?smooth(phase/.14)*smooth((1-phase)/.17):0;
    if(input.reducedMotion)weight=attacking?1:0;
    if(!input.paused&&!input.frozen)state.actionWeight=weight;
    // Lock head/chest through the strike. After impact, follow the player
    // smoothly into the next chase direction without resetting the action.
    const follow=!attacking||phase>=.61;
    if(delta>0&&follow){
        const desired=toAngle(target);
        const diff=(desired-state.upperAngle+540)%360-180;
        const limit=delta*(input.reducedMotion?1080:540);
        state.upperAngle=(state.upperAngle+clamp(diff,-limit,limit)+360)%360;
    }
    state.upperFacing=toDirection(state.upperAngle);
    if(!input.paused&&!input.frozen)state.actionFrame=actionFrame;
    return {
        actionActive:attacking,actionFrame:state.actionFrame,
        actionWeight:state.actionWeight,attackProgress:phase,
        upperFacing:state.upperFacing,lowerFacing:movement,
        lowerPhaseContinuous:true,committedFacing:state.committedFacing,
        // A crawler must keep its support hand planted. A one-arm model
        // must never synthesize a missing claw in a renderer.
        locomotionKind:input.crawling?'crawl':'walk',
    };
}

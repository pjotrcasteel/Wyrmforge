// Stable, art-grounded visual differences. These values never enter C# combat,
// navigation, collision, stats or enemy spawning.
const GAIT_PHASES=Object.freeze([0,.125,.25,.375,.5,.625,.75,.875]);
const SCALE_VARIANTS=Object.freeze([.95,.975,1,1.025,1.05]);
const IDLE_FRAMES=Object.freeze([0,8]);
const ACTION_POSE_VARIANTS=Object.freeze(['standard','broken-arm-right','one-arm-left']);

function mixEntityId(entityId) {
    const id=Number(entityId);
    if(!Number.isSafeInteger(id)||id<0)return 0;
    let n=(Math.imul(id|0,0x9e3779b1)^((Math.floor(id/0x100000000)|0)>>>0)^0x85ebca6b)>>>0;
    n=Math.imul(n^(n>>>16),0x7feb352d)>>>0;
    n=Math.imul(n^(n>>>15),0x846ca68b)>>>0;
    return (n^(n>>>16))>>>0;
}

export function selectHollowAppearance(entityId,forcedInjury=false) {
    const seed=mixEntityId(entityId);
    const valid=Number.isSafeInteger(Number(entityId))&&Number(entityId)>=0;
    // 25% of Hollowed still use the already-authored full-body leg injury.
    // The remaining population reuses three independently modelled/rendered
    // no-cape walk+attack silhouette pairs; there is NO CSS recolouring.
    const injuryVariant=forcedInjury||(valid&&(Math.imul(Number(entityId)|0,1597334677)>>>0)%4===0)?
        'broken-leg-left':'standard';
    const armVariant=ACTION_POSE_VARIANTS[(seed>>>3)%ACTION_POSE_VARIANTS.length];
    return Object.freeze({
        injuryVariant,armVariant,
        visualScale:SCALE_VARIANTS[(seed>>>12)%SCALE_VARIANTS.length],
        initialPhase:GAIT_PHASES[(seed>>>17)%GAIT_PHASES.length],
        idleFrame:IDLE_FRAMES[(seed>>>23)%IDLE_FRAMES.length],
        // Different source attack variants accompany each actual body rig.
        // Never re-time contact damage or invent an animation clip.
        signature:injuryVariant==='broken-leg-left'?'dragged-leg':armVariant,
    });
}

// Presentation-only gait synchronization. C# remains the sole owner of world movement.
// The no-cape Hollowed uses 16 CMU-derived poses authored at 25 fps. At the
// unmodified C# base Hollow speed of 52 world units/s, one authored run cycle
// therefore travels (16 / 25) * 52 = 33.28 world units.
export const HOLLOW_RUN = Object.freeze({
    frames:16,sourceFps:25,referenceSpeed:52,stride:33.28,
    sampleBlend:.45,maximumSampleSpeed:180,predictionSeconds:.055,movingGraceSeconds:.12,
});

export function sampleHollowRun(pose,displacement,dt,advancing) {
    if (!advancing) return {distance:0,moving:false};
    const moved=Number.isFinite(displacement)&&displacement>.001&&displacement<64;
    if (moved) {
        const since=pose.lastSampleAge==null?dt:pose.age-pose.lastSampleAge;
        const seconds=Math.max(.016,Math.min(.25,since));
        const measuredSpeed=Math.min(HOLLOW_RUN.maximumSampleSpeed,displacement/seconds);
        pose.runSpeed=pose.runSpeed==null?measuredSpeed:
            pose.runSpeed+(measuredSpeed-pose.runSpeed)*HOLLOW_RUN.sampleBlend;
        pose.lastSampleAge=pose.age;
        pose.distance+=displacement;
        pose.lastMove=pose.age;
    }
    const moving=pose.age-pose.lastMove<HOLLOW_RUN.movingGraceSeconds;
    if (!moving || !pose.runSpeed || dt<=0) return {distance:0,moving};
    // A duplicated render snapshot is not another simulation tick. Predict only
    // one snapshot interval ahead, then reconcile to the measured displacement.
    // This prevents visible "freeze, jump, freeze" gait at 60fps/20Hz, without
    // driving movement, changing positions or advancing when paused/frozen.
    const ceiling=pose.distance+pose.runSpeed*HOLLOW_RUN.predictionSeconds;
    const predicted=Math.min(pose.runSpeed*dt,Math.max(0,ceiling-pose.visualDistance));
    const discrepancy=pose.distance-pose.visualDistance-predicted;
    const correction=Math.max(-predicted*.45,Math.min(predicted*.45,discrepancy*.35));
    const step=Math.max(0,predicted+correction);
    pose.visualDistance+=step;
    return {distance:step,moving};
}

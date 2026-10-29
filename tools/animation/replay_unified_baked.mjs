// AN6: replay actual exported, full-body directional turns through the single
// production presentation controller. C# motion intent stays authoritative.
// A source-marker pass is NOT genuine in-game, GPU or physical mobile approval.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';

export function replayUnifiedTurns(profile,{rates=[15,30,60,120],entryPhases=[0,.25,.5,.75],targets}={}){
    validateCreatureRigProfile(profile);
    if(profile.facing.transition!=='source-pivot'||!profile.pivots?.positive||!profile.pivots?.negative){
        throw new TypeError('Bidirectional authored pivot pack required');
    }
    const directions=profile.facing.directions;
    const pairs=targets??directions.flatMap((direction,index)=>[
        {from:direction,to:directions[(index+1)%8]},
        {from:direction,to:directions[(index+7)%8]}
    ]);
    const tests=[];
    for(const hz of rates){
        if(!Number.isSafeInteger(hz)||hz<=0)throw new RangeError('Positive integer replay Hz required');
        for(const {from,to} of pairs)for(const entryPhase of entryPhases){
            if(!directions.includes(from)||!directions.includes(to)||from===to)throw new RangeError('Invalid direction pair');
            if(!Number.isFinite(entryPhase)||entryPhase<0||entryPhase>=1)throw new RangeError('Entry gait phase must be in [0,1)');
            const state=createSpriteAnimationState(),entityId='AN6-turn-'+from+'-'+to+'-'+entryPhase;
            const vector=profile.locomotion.stanceVelocityByDirection?.[from];
            if(entryPhase&&!vector)throw new TypeError('Calibrated source travel required for nonzero gait entry');
            const advanced={x:-(vector?.x??0)*entryPhase,y:-(vector?.y??0)*entryPhase};
            const distance=Math.hypot(advanced.x,advanced.y);
            const entryTime=entryPhase?0.25:0;
            const motion=(timestamp,direction,moving=false)=>({entityId,timestamp,travel:distance,
                world:advanced,moving,direction});
            let pose=updateSpriteAnimation(state,profile,{entityId,timestamp:0,travel:0,
                world:{x:0,y:0},moving:false,direction:from});
            if(entryPhase)pose=updateSpriteAnimation(state,profile,motion(entryTime,from,true));
            const initial=pose.clip, samples=[],nativeUnit=profile.unitsPerPixel;
            const stepCount=Math.ceil(hz*4),expected=profile.pivots[
                (directions.indexOf(to)-directions.indexOf(from)+8)%8===1?'positive':'negative'].clip;
            for(let step=1;step<=stepCount;step++){
                pose=updateSpriteAnimation(state,profile,motion(entryTime+step/hz,to));
                samples.push({at:entryTime+step/hz,clip:pose.clip,direction:pose.direction,frame:pose.frame,
                    slip:pose.debug.maxSlip/nativeUnit,correctionSaturated:pose.debug.correctionSaturated});
                if(pose.direction===to&&pose.clip===profile.locomotion.clip)break;
            }
            const turnFrames=samples.filter(s=>s.clip===expected);
            const peak=Math.max(0,...samples.map(s=>s.slip??0));
            const end=samples.at(-1);
            tests.push({hz,from,to,entryPhase,initial,expectedTurnClip:expected,turnFrames:turnFrames.length,
                firstTurnFrame:turnFrames[0]?.frame??null,lastTurnFrame:turnFrames.at(-1)?.frame??null,
                completed:end?.clip===profile.locomotion.clip&&end.direction===to,
                completedAt:end?.at??null,peakNativeSlip:peak,contactWithinOneNativePixel:peak<=1,
                correctionSaturated:samples.some(s=>s.correctionSaturated===true),
                noUnintendedClip:samples.every(s=>s.clip===expected||s.clip===profile.locomotion.clip)});
        }
    }
    return {measurement:'sampled shared runtime controller on real source atlas contact metadata; NOT real Hunt framebuffer, renderer, GPU, mobile or art acceptance',
        runtimeAccepted:false,samples:tests.length,
        sourceRuntimeGatePassed:tests.every(t=>t.turnFrames>0&&t.completed&&t.contactWithinOneNativePixel&&
            !t.correctionSaturated&&t.noUnintendedClip),
        results:tests};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const [profilePath,outputPath,diagnostic]=process.argv.slice(2);
    if(!profilePath||!outputPath||!['--diagnostic',undefined].includes(diagnostic)){
        console.error('Usage: node replay_unified_baked.mjs atlas/profile.json report.json [--diagnostic]');
        process.exitCode=2;
    }else{
        try{
            const report=replayUnifiedTurns(JSON.parse(readFileSync(profilePath,'utf8')));
            writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
            console.log(JSON.stringify({samples:report.samples,sourceRuntimeGatePassed:report.sourceRuntimeGatePassed,
                worstNativeSlip:Math.max(...report.results.map(r=>r.peakNativeSlip)),
                incomplete:report.results.filter(r=>!r.completed).length}));
            if(!report.sourceRuntimeGatePassed&&diagnostic!=='--diagnostic')process.exitCode=1;
        }catch(error){console.error(error.stack??error);process.exitCode=2;}
    }
}

// AN6: source-backed moving claw phase/direction diagnostic through ONE runtime controller.
// C# remains authoritative; this is not a renderer, game, GPU or mobile-device gate.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';

export function replayUnifiedClaw(profile,{rates=[15,30,60,120],entryPhases=[0,.25,.5,.75],paths=['forward','lateral','crossing']}={}){
    validateCreatureRigProfile(profile);
    const action=profile.actions?.attack,grid=action?.poseGrid;
    if(!grid||grid.travel!=='facing-projection'||!grid.stanceVelocityByDirection){
        throw new TypeError('Authored whole-body moving-claw grid with measured travel required');
    }
    if(!paths.length||paths.some(p=>!['forward','lateral','crossing'].includes(p)))throw new RangeError('Invalid source motion path');
    const directions=profile.facing.directions,results=[];
    for(const hz of rates){
        if(!Number.isSafeInteger(hz)||hz<=0)throw new RangeError('Positive integer source replay rate required');
        for(const [headingIndex,from] of directions.entries()){
            const v=grid.stanceVelocityByDirection[from],length=Math.hypot(v?.x??0,v?.y??0);
            if(!(length>0))throw new TypeError('Measured source travel missing for '+from);
            const forward={x:-v.x/length,y:-v.y/length},lateral={x:-forward.y,y:forward.x};
            const walk=profile.locomotion.stanceVelocityByDirection?.[from],walkLength=Math.hypot(walk?.x??0,walk?.y??0);
            if(!(walkLength>0))throw new TypeError('Measured source walk missing for '+from);
            const speed=walkLength*profile.locomotion.fps/profile.locomotion.frames;
            for(const entryPhase of entryPhases){
                if(!Number.isFinite(entryPhase)||entryPhase<0||entryPhase>=1)throw new RangeError('Entry phase outside gait cycle');
                for(const path of paths){
                    const entityId='AN6-claw-'+hz+'-'+from+'-'+entryPhase+'-'+path,state=createSpriteAnimationState();
                    let world={x:0,y:0},travel=0,time=0;
                    const cue={name:'attack',token:entityId,sequence:0};
                    const input=(direction,actionSignal)=>({entityId,timestamp:time,travel,world:{...world},moving:true,direction,action:actionSignal});
                    updateSpriteAnimation(state,profile,input(from,null));
                    if(entryPhase){
                        world={x:-walk.x*entryPhase,y:-walk.y*entryPhase};travel=Math.hypot(world.x,world.y);
                        time=.25;updateSpriteAnimation(state,profile,input(from,null));
                    }
                    time+=1/hz;
                    let pose=updateSpriteAnimation(state,profile,input(from,cue));
                    const firstActionFrame=pose.frame,actionDuration=grid.actionFrames/action.fps,slips=[],clips=[],headings=[];
                    let attackSamples=0,saturated=false,completed=false;
                    const steps=Math.ceil(actionDuration*hz)+2;
                    for(let tick=1;tick<=steps;tick++){
                        const elapsed=tick/hz,nextHeading=directions[(headingIndex+1)%directions.length];
                        const crossed=path==='crossing'&&elapsed>actionDuration/2;
                        const axis=path==='lateral'||crossed?lateral:forward;
                        world={x:world.x+axis.x*speed/hz,y:world.y+axis.y*speed/hz};
                        travel+=speed/hz;time+=1/hz;
                        pose=updateSpriteAnimation(state,profile,input(crossed?nextHeading:from,cue));
                        clips.push(pose.clip);headings.push(pose.direction);
                        if(pose.clip===action.clip){
                            attackSamples++;
                            slips.push(pose.debug.maxSlip/(profile.unitsPerPixel*(pose.scale??1)));
                            saturated||=pose.debug.correctionSaturated===true;
                        }else if(attackSamples){completed=pose.actionToken==null;break;}
                    }
                    const worst=Math.max(0,...slips);
                    results.push({hz,from,entryPhase,path,firstActionFrame,attackSamples,completed,
                        committedFacing:headings.every((direction,i)=>clips[i]!==action.clip||direction===from),
                        peakNativeSlip:worst,contactWithinOneNativePixel:worst<=1,correctionSaturated:saturated});
                }
            }
        }
    }
    return {measurement:'shared controller moving claw with actual source profile; NOT a C# framebuffer or physical mobile approval',
        runtimeAccepted:false,samples:results.length,sourceClawGatePassed:results.every(x=>x.attackSamples>0&&x.completed&&
            x.committedFacing&&x.contactWithinOneNativePixel&&!x.correctionSaturated),results};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const [profilePath,outputPath,diagnostic]=process.argv.slice(2);
    if(!profilePath||!outputPath||!['--diagnostic',undefined].includes(diagnostic)){
        console.error('Usage: node replay_unified_claw.mjs atlas/profile.json report.json [--diagnostic]');process.exitCode=2;
    }else try{
        const report=replayUnifiedClaw(JSON.parse(readFileSync(profilePath,'utf8')));
        writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
        console.log(JSON.stringify({samples:report.samples,sourceClawGatePassed:report.sourceClawGatePassed,
            worstNativeSlip:Math.max(...report.results.map(x=>x.peakNativeSlip)),
            failing:report.results.filter(x=>!x.contactWithinOneNativePixel||x.correctionSaturated).length}));
        if(!report.sourceClawGatePassed&&diagnostic!=='--diagnostic')process.exitCode=1;
    }catch(error){console.error(error.stack??error);process.exitCode=2;}
}

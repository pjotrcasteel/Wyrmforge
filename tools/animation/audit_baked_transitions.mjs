// AN6 source-contact gate. Replays the real baked profile through the ONE
// shared animation controller; never invents a stop/pivot/claw or changes C#.
// This is metadata and source-marker evidence, NOT a rendered Hunt acceptance.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSpriteAnimationState,updateSpriteAnimation,validateCreatureRigProfile} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';

const RATES=[15,30,60,120];
const SPEEDS=[30,60];
const close=(a,b)=>Math.abs(a-b)<1e-9;
const directionVelocity=(profile,direction,speed)=>{
    const v=profile.locomotion.stanceVelocityByDirection?.[direction];
    if(!v)throw new TypeError('Source motion lacks measured directional travel: '+direction);
    const n=Math.hypot(v.x,v.y);
    return {x:-v.x/n*speed,y:-v.y/n*speed};
};
const add=(v,t)=>({x:v.x*t,y:v.y*t});
function scenario(profile,name,time,speed) {
    const e=directionVelocity(profile,'E',speed);
    if(name==='stop-restart') {
        const advance=Math.min(time,.6)+Math.max(0,time-1);
        const moving=time<.6||time>1;
        return {world:add(e,advance),travel:speed*advance,moving,direction:'E',velocity:moving?e:{x:0,y:0}};
    }
    if(name==='stationary-turn') {
        return {world:{x:0,y:0},travel:0,moving:false,
            direction:time<.5?'E':'N',velocity:{x:0,y:0}};
    }
    if(name==='curved-chase'||name==='fast-curve-chase') {
        const rate=name==='fast-curve-chase'?1.2:.6,position={x:speed/rate*Math.sin(rate*time),y:speed/rate*(1-Math.cos(rate*time))};
        const velocity={x:speed*Math.cos(rate*time),y:speed*Math.sin(rate*time)};
        return {world:position,travel:speed*time,moving:true,direction:'E',velocity};
    }
    throw new RangeError('Unknown animation audit scenario');
}
export function auditBakedTransitions(profile,{rates=RATES,speeds=SPEEDS}={}) {
    validateCreatureRigProfile(profile);
    if(profile.sourceSupport||profile.facing.selection!=='projected-motion'||profile.facing.transition!=='row')
        throw new TypeError('AN6 baked audit requires a projected-motion row profile');
    const results=[];
    for(const name of ['stop-restart','stationary-turn','curved-chase','fast-curve-chase'])for(const hz of rates)for(const speed of speeds) {
        if(!Number.isSafeInteger(hz)||hz<=0||!Number.isFinite(speed)||speed<=0)throw new RangeError('Invalid audit sampling rate/speed');
        const state=createSpriteAnimationState();
        let peak=0,unsupportedSamples=0,firstUnsupported=null,previous=null,stopFrame=null;
        for(let index=0;index<=Math.round(hz*2);index++) {
            const timestamp=index/hz,trajectory=scenario(profile,name,timestamp,speed);
            const intent={entityId:`AN6-${name}-${hz}-${speed}`,timestamp,...trajectory};
            const sample=updateSpriteAnimation(state,profile,intent);
            if(sample.debug.measurementSpace!=='unsnapped-source-marker-world-projection')
                throw new TypeError('AN6 audit needs actual projected source markers');
            peak=Math.max(peak,sample.debug.maxSlip/profile.unitsPerPixel);
            if(name==='stationary-turn'&&previous&&previous.direction!==sample.direction&&
               !(profile.pivot||profile.pivots?.positive||profile.pivots?.negative)) {
                unsupportedSamples++;
                firstUnsupported??={timestamp,from:previous.direction,to:sample.direction,reason:'no authored weight-bearing pivot'};
            }
            if(name==='stop-restart'&&timestamp>=.6&&timestamp<=1&&!stopFrame)stopFrame={
                clip:sample.clip,frame:sample.frame,authoringProvided:Number.isSafeInteger(profile.locomotion.idleFrame)
            };
            previous=sample;
        }
        results.push({name,hz,speed,maxNativeMarkerSlip:peak,unsupportedTurnSamples:unsupportedSamples,
            firstUnsupported,stopFrame,contactPassed:peak<=1});
    }
    const missingSource={
        groundedStart:!profile.locomotion.start,
        groundedStop:!profile.locomotion.stop&&!Number.isSafeInteger(profile.locomotion.idleFrame),
        weightBearingTurn:!(profile.pivot||profile.pivots?.positive||profile.pivots?.negative),
        movingClaw:!Object.values(profile.actions??{}).some(a=>a.poseGrid)
    };
    const contactPassed=results.every(r=>r.contactPassed);
    const sourceDataGatePassed=contactPassed&&Object.values(missingSource).every(missing=>!missing)&&
        results.every(r=>r.unsupportedTurnSamples===0);
    // The metadata audit cannot certify rendered soles, C# gameplay captures,
    // native device performance or owner-reviewed art, even when this passes.
    return {measurement:'real source marker metadata through shared controller; not raster, in-Hunt, physical phone or aesthetic acceptance',
        runtimeAccepted:false,sourceDataGatePassed,contactPassed,missingSource,results};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    const profilePath=process.argv[2],diagnostic=process.argv[3]==='--diagnostic';
    if(!profilePath||process.argv.length!==(diagnostic?4:3)) {
        console.error('Usage: node tools/animation/audit_baked_transitions.mjs PACK/profile.json [--diagnostic]');
        process.exitCode=2;
    } else {
        try {
            const report=auditBakedTransitions(JSON.parse(readFileSync(profilePath,'utf8')));
            console.log(JSON.stringify(report,null,2));
            if(!report.sourceDataGatePassed&&!diagnostic)process.exitCode=1;
        } catch(error) {
            console.error(error.stack??error.message);process.exitCode=2;
        }
    }
}

// Diagnose actually sampled C# Hunt contact drift BY clip, without touching
// animation, C# authority or the <=1 native pixel acceptance criterion.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';

export function diagnoseHuntContact(trace,limitNativePixels=1){
    if(!Array.isArray(trace)||trace.length===0||!Number.isFinite(limitNativePixels)||limitNativePixels<=0)
        throw new TypeError('Nonempty C# motion trace and positive native pixel gate required');
    const byClip=new Map(),lastByActor=new Map();
    let total=0,violations=0;
    for(const row of trace){
        if(!Number.isFinite(row?.simulationTimeSeconds)||!Array.isArray(row?.hollow?.entities))
            throw new TypeError('Real C# simulation timestamp and Hollowed entities required');
        for(const entity of row.hollow.entities){
            const f=entity.foundation;
            if(!f||typeof f.clip!=='string'||!f.clip||!Number.isFinite(f.maxNativeMarkerSlip)||f.maxNativeMarkerSlip<0)
                continue; // Other monsters can coexist; never fabricate proof for missing rigs.
            const id=entity.entityId;
            if(id==null)throw new TypeError('A real C# entity ID is required');
            const key=String(id);
            const old=lastByActor.get(key);
            const travel=entity.observedDistance;
            const delta=Number.isFinite(travel)&&Number.isFinite(old?.travel)?
                Math.max(0,travel-old.travel):0;
            if(Number.isFinite(travel))lastByActor.set(key,{travel,clip:f.clip});
            const stat=byClip.get(f.clip)??{clip:f.clip,samples:0,violations:0,worstNativeMarkerSlip:0,
                firstViolationSeconds:null,cumulativeObservedTravel:0,movingSamples:0};
            stat.samples++;total++;
            if(delta>1e-6){stat.cumulativeObservedTravel+=delta;stat.movingSamples++;}
            if(f.maxNativeMarkerSlip>limitNativePixels){
                stat.violations++;violations++;
                stat.firstViolationSeconds??=row.simulationTimeSeconds;
            }
            stat.worstNativeMarkerSlip=Math.max(stat.worstNativeMarkerSlip,f.maxNativeMarkerSlip);
            byClip.set(f.clip,stat);
        }
    }
    if(total===0)throw new TypeError('Actual C# animation samples are required: empty success forbidden');
    return {schemaVersion:1,measurement:'actual C# Enemy Lab / Hunt samples; unsnapped authored source contacts',
        acceptanceGateNativePixels:limitNativePixels,sourceLitReviewOnly:true,
        physicalDevice:false,completedAcceptance:false,allClipsWithinNativePixel:violations===0,
        totalSamples:total,violations,clips:[...byClip.values()].sort((a,b)=>b.worstNativeMarkerSlip-a.worstNativeMarkerSlip)};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const [directory]=process.argv.slice(2);
    if(!directory||process.argv.length!==3){
        console.error('Usage: node tools/animation/diagnose_hunt_contact.mjs artifacts/real-csharp-capture');
        process.exitCode=2;
    }else{
        try{
            const trace=JSON.parse(readFileSync(join(directory,'motion-trace.json'),'utf8'));
            const report=diagnoseHuntContact(trace);
            writeFileSync(join(directory,'contact-diagnosis.json'),JSON.stringify(report,null,2)+'\n');
            console.log('Real C# native contact by clip:',JSON.stringify(report.clips));
            if(!report.allClipsWithinNativePixel)console.log('CONTACT NOT ACCEPTED: '+report.violations+' violating samples');
        }catch(error){console.error(error.stack??error);process.exitCode=2;}
    }
}

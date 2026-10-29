// AN6 native-raster residency preflight for directional whole-body actions.
// Models ONLY decoded RGBA storage of hypothetical authored frames with the
// measured source crop. A budget pass does NOT validate art, source contacts,
// materials, actual GPU allocation or dynamically switching world trajectories.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spriteAtlasLayout} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/lit-sprite.js';
import {auditBakedAtlasBudget,DEFAULT_BAKED_TEXTURE_BUDGET} from './check_baked_atlas_budget.mjs';

export function planBakedMotionResidency(manifest) {
    if(manifest?.schemaVersion!==2||!manifest.clips?.['attack-travel']) {
        throw new TypeError('Actual authored eight-direction moving-claw atlas required');
    }
    const source=manifest.clips['attack-travel'];
    const eight=manifest.directions?.length;
    if(eight!==8||!Array.isArray(source.crop)||!Number.isSafeInteger(source.cell)||!Number.isSafeInteger(source.frames)) {
        throw new TypeError('Measured source crop and eight camera views required');
    }
    const measured=auditBakedAtlasBudget(manifest,{requiredMaps:['normal','emissive']});
    if(measured.maxDecodedBytes!==DEFAULT_BAKED_TEXTURE_BUDGET)throw new Error('Unexpected source budget');
    const proposed=(name,frames)=>({
        ...source,image:name+'.png',frames,columns:Math.min(32,frames),
        // These do not yet exist as production atlases.
        materials:{normal:{hypothetical:true},emissive:{hypothetical:true}}
    });
    const bytes=frames=>{
        const layout=spriteAtlasLayout(proposed('directional',frames),eight);
        return layout.width*layout.height*4*3;
    };
    const neutral=Object.fromEntries(Object.entries(manifest.clips).filter(([name])=>name!=='attack-travel'));
    const nonAction=auditBakedAtlasBudget({...manifest,clips:neutral},{requiredMaps:['normal','emissive']}).decodedBytes;
    const options=[];
    // Whole-body 3-way action plan: forward plus both genuine lateral
    // directions. Travel heading is distinct from committed body facing.
    for(const phases of [8,16])for(const stages of [4,6,8,16]){
        const perClipFrames=phases*stages;
        const perClipBytes=bytes(perClipFrames);
        const totalBytes=nonAction+3*perClipBytes;
        options.push({gaitPhases:phases,actionStages:stages,actionVariants:3,framesPerDirection:perClipFrames,
            proposedClawBytes:perClipBytes,proposedTotalDecodedBytes:totalBytes,
            remainingBytes:DEFAULT_BAKED_TEXTURE_BUDGET-totalBytes,
            withinMemoryLimit:totalBytes<=DEFAULT_BAKED_TEXTURE_BUDGET,
            actualSourceClipsExist:false,contactAndVisualAccepted:false});
    }
    // An unchanged first-generation whole-body claw plus even one additional
    // side source cannot be called a complete resident directional library.
    const originalPlusSide=measured.decodedBytes+bytes(source.frames);
    return {
        measurement:'what-if decoded three-RGBA-map eight-view atlas memory, with current measured source crop; does not imply source or runtime acceptance',
        runtimeAccepted:false,
        budgetBytes:DEFAULT_BAKED_TEXTURE_BUDGET,
        originalDecodedBytes:measured.decodedBytes,
        originalWithinBudget:!measured.overBudget,
        originalClawFrames:source.frames,
        originalPlusOneLateralBytes:originalPlusSide,
        originalPlusOneLateralFits:originalPlusSide<=DEFAULT_BAKED_TEXTURE_BUDGET,
        nonActionDecodedBytes:nonAction,
        sourceCrop:source.crop,
        candidateMemoryLowerBound:true,
        // Lateral swing silhouettes may require a WIDER crop, so this plan
        // can only reject, never authorize material or game integration.
        options
    };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const [manifestPath,outputPath]=process.argv.slice(2);
    if(!manifestPath||!outputPath||process.argv.length!==4){
        console.error('Usage: node plan_baked_motion_residency.mjs atlas/manifest.json report.json');
        process.exitCode=2;
    }else try{
        const report=planBakedMotionResidency(JSON.parse(readFileSync(manifestPath,'utf8')));
        writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
        console.log(JSON.stringify({originalDecodedBytes:report.originalDecodedBytes,
            originalPlusOneLateralBytes:report.originalPlusOneLateralBytes,
            feasibleUnapprovedOptions:report.options.filter(x=>x.withinMemoryLimit).map(x=>[x.gaitPhases,x.actionStages])}));
    }catch(error){console.error(error.stack??error);process.exitCode=2;}
}

// AN6 preflight: exact decoded RGBA atlas budgeting using the shared renderer layout.
// Budget is per loaded library, not compressed PNG size or a sum of mutually
// exclusive review candidates. This never certifies raster, contact or GPU quality.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spriteAtlasLayout} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/lit-sprite.js';

export const DEFAULT_BAKED_TEXTURE_BUDGET = 64 * 1024 * 1024;

export function auditBakedAtlasBudget(manifest, {requiredMaps=[],maxDecodedBytes=DEFAULT_BAKED_TEXTURE_BUDGET}={}) {
    if(manifest?.schemaVersion!==2||!Array.isArray(manifest.directions)||manifest.directions.length!==8||
       new Set(manifest.directions).size!==8||!manifest.clips||typeof manifest.clips!=='object') {
        throw new TypeError('Expected a complete eight-view baked sprite manifest');
    }
    if(!Array.isArray(requiredMaps)||requiredMaps.some(map=>!['normal','emissive'].includes(map))||
       !Number.isSafeInteger(maxDecodedBytes)||maxDecodedBytes<=0) {
        throw new TypeError('Invalid requested maps or decoded texture budget');
    }
    const clips=Object.entries(manifest.clips).map(([name,clip])=>{
        const layout=spriteAtlasLayout(clip,manifest.directions.length);
        // The source color image becomes the primary albedo after material
        // packing. Do not add a duplicate albedo on top of that primary.
        const materials=new Set([...Object.keys(clip.materials??{}),...requiredMaps]);
        const textureCount=1+materials.size;
        const bytesPerTexture=layout.width*layout.height*4;
        const decodedBytes=bytesPerTexture*textureCount;
        if(!Number.isSafeInteger(decodedBytes))throw new RangeError('Texture size exceeds safe numeric range');
        return {name,frames:clip.frames,textureCount,bytesPerTexture,decodedBytes};
    });
    const decodedBytes=clips.reduce((total,clip)=>total+clip.decodedBytes,0);
    if(!Number.isSafeInteger(decodedBytes))throw new RangeError('Library texture size exceeds safe numeric range');
    return {decodedBytes,maxDecodedBytes,remainingBytes:maxDecodedBytes-decodedBytes,overBudget:decodedBytes>maxDecodedBytes,clips};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    const argv=process.argv.slice(2);
    const production=argv[0]==='--production-maps';
    const path=argv[production?1:0];
    if(!path||argv.length!==(production?2:1)) {
        console.error('Usage: node tools/animation/check_baked_atlas_budget.mjs [--production-maps] PACK/manifest.json');
        process.exitCode=2;
    } else {
        try {
            const manifest=JSON.parse(readFileSync(path,'utf8'));
            const result=auditBakedAtlasBudget(manifest,{requiredMaps:production?['normal','emissive']:[]});
            process.stdout.write(JSON.stringify(result,null,2)+'\n');
            if(result.overBudget)process.exitCode=1;
        } catch(error) {
            console.error(error.message);
            process.exitCode=2;
        }
    }
}

// Original source-only 32px art-review exporter. Does not patch the playable renderer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createDegradedMasonrySurface, buildDegradedLightingMaps,
    DEGRADATION_STATE_ORDER, DEGRADATION_MATERIALS, createDegradedBoundaryReview } from './terrain-hard-degradation.mjs';

const out=process.argv[2]??'docs/art/previews/wf32-hard-degradation';
const save=(filename,bitmap)=>writeFileSync(join(out,filename),encodePng(bitmap.width,bitmap.height,bitmap.data));
if(!process.argv[1]||fileURLToPath(import.meta.url)!==process.argv[1]){
    throw new Error('Review exporter must run from CLI');
}
mkdirSync(out,{recursive:true});
const sheet=new Bitmap(256*DEGRADATION_STATE_ORDER.length,256*DEGRADATION_MATERIALS.length);
const data={version:'wf32-hard-degradation.v1',tilePixels:32,periodPixels:256,
    status:'source-only owner art review; not a gameplay screenshot',
    materialTypes:DEGRADATION_MATERIALS,states:DEGRADATION_STATE_ORDER,
    lightingContract:['albedo sRGB','normal linear tangent space','roughness G non-color','scalar specular'],
    samples:[],boundaryExamples:['flagstone / grass','cobble / soil','brick / mud']};
for(let row=0;row<DEGRADATION_MATERIALS.length;row++){
    const type=DEGRADATION_MATERIALS[row];
    for(let col=0;col<DEGRADATION_STATE_ORDER.length;col++){
        const state=DEGRADATION_STATE_ORDER[col];
        const surface=createDegradedMasonrySurface(type,{seed:1781,state});
        const maps=buildDegradedLightingMaps(surface);
        const name=`${type}-${state}`;
        save(`${name}-albedo.png`,maps.albedo);
        if(state==='collapsed'){
            save(`${name}-normal.png`,maps.normal);
            save(`${name}-roughness.png`,maps.roughnessMap);
        }
        sheet.blit(maps.albedo,col*256,row*256);
        data.samples.push({type,state,...surface.stats});
    }
}
save('degradation-matrix.png',sheet);
const boundary=new Bitmap(3*256,256);
const examples=[['flagstone','grass'],['cobble','soil'],['brick','mud']];
for(let col=0;col<examples.length;col++){
    const [type,soft]=examples[col];
    const review=createDegradedBoundaryReview({type,soft,state:'reclaimed',seed:91,direction:'left'});
    boundary.blit(review.maps.albedo,col*256,0);
    if(col===0){save('reclaimed-edge-normal.png',review.maps.normal);
        save('reclaimed-edge-roughness.png',review.maps.roughnessMap);}
}
save('reclaimed-boundaries.png',boundary);
// Pairwise 2x nearest pixel magnification: details are intentional art pixels.
const nearest=new Bitmap(sheet.width*2,sheet.height*2);
for(let y=0;y<nearest.height;y++)for(let x=0;x<nearest.width;x++)
    nearest.set(x,y,sheet.get(Math.floor(x/2),Math.floor(y/2)));
save('degradation-matrix-2x.png',nearest);
writeFileSync(join(out,'manifest.json'),`${JSON.stringify(data,null,2)}\n`);
console.log(`WF32 hard-degradation review: ${data.samples.length} material/state samples in ${out}`);

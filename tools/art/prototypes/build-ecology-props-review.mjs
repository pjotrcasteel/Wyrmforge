// WF32-P1j-B offline 2.5D pixel-art review. Not a live Hunt or renderer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { buildEcologyPropAtlases, makeEcologyPropSprite, ECOLOGY_PROP_DEFINITIONS,
    proposeEcologyProps, ecologyPropMaterialDescriptors, ECOLOGY_PROP_VERSION } from './terrain-ecology-props.mjs';
import { createWorldBoundaryWindow } from './terrain-world-variation.mjs';

export function buildEcologyPropReview(outputDir) {
    mkdirSync(outputDir,{recursive:true});
    const atlases=buildEcologyPropAtlases();
    for(const [channel,atlas] of Object.entries(atlases)) {
        const bitmap=atlas.atlas;
        writeFileSync(join(outputDir,channel+'-atlas.png'),
            encodePng(bitmap.width,bitmap.height,bitmap.data));
    }
    const field=createWorldBoundaryWindow('flagstone','grass',{
        seed:2211,state:'reclaimed',role:'left',boundaryX:144,boundaryY:128,
        originX:0,originY:0,width:384,height:256
    });
    const placements=proposeEcologyProps(field,{
        seed:2211,soft:'grass',context:{moisture:.79,wear:.62,density:1}
    });
    const composition=field.albedo.clone();
    for(const prop of placements){
        const sprite=makeEcologyPropSprite(prop.kind,prop.variant);
        composition.blit(sprite.albedo,prop.x-prop.anchor[0],prop.y-prop.anchor[1]);
    }
    writeFileSync(join(outputDir,'composition-study.png'),
        encodePng(composition.width,composition.height,composition.data));
    const gallery=new Bitmap(512,4*92);
    for(const [row,kind] of Object.keys(ECOLOGY_PROP_DEFINITIONS).entries())
        for(let variant=0;variant<3;variant++){
            const sprite=makeEcologyPropSprite(kind,variant);
            gallery.blit(sprite.albedo,60+variant*144-sprite.anchor[0],
                row*92+77-sprite.anchor[1]);
        }
    writeFileSync(join(outputDir,'prop-gallery.png'),
        encodePng(gallery.width,gallery.height,gallery.data));
    const manifest={
        version:ECOLOGY_PROP_VERSION,status:'source-art-review-only / no live integration',
        objectTypes:ECOLOGY_PROP_DEFINITIONS,materials:ecologyPropMaterialDescriptors(),
        frames:atlases.albedo.frames,placements,
        lighting:'Shared G descriptors only; GPU material/geometry registration pending',
        physics:'C# authoritative IsBlocked/site geometry: no new colliders',
        approvedBlending:'P1i original source geometry and pixels unmodified'
    };
    writeFileSync(join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    return manifest;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
    const output=process.argv[2]||'docs/art/previews/wf32-ecology-props';
    console.log('Generated '+buildEcologyPropReview(output).placements.length+' cosmetic prop proposals');
}

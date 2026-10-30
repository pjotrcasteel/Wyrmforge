// WF32-P1d opt-in review CLI. Do not add to the production art pipeline before AR3 approval.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createMasonryField } from './wet-forest-masonry.mjs';
import { GRAMMAR_VERSION, createBoundaryReview, buildLightingMaps, cutReviewInto32,
    addMicroDetails, makeSoftField, materialDescriptor, TERRAIN_MATERIALS,
    LIGHTING_MAP_CONTRACT, boundaryKind } from './terrain-material-grammar.mjs';

export const REVIEW_SAMPLES = Object.freeze([
    { name: 'flagstone-grass', primary: 'flagstone', secondary: 'grass', direction: 'left', seed: 143 },
    { name: 'cobble-soil', primary: 'cobble', secondary: 'soil', direction: 'left', seed: 197 },
    { name: 'brick-mud', primary: 'brick', secondary: 'mud', direction: 'top', seed: 251 },
    { name: 'grass-soil', primary: 'grass', secondary: 'soil', direction: 'top', seed: 317 },
]);

function exportPng(path, image) {
    writeFileSync(path, encodePng(image.width, image.height, image.data));
}
export function createTerrainGrammarReview(outputDir) {
    mkdirSync(outputDir, {recursive:true});
    const composition=new Bitmap(512,512),normals=new Bitmap(512,512),roughness=new Bitmap(512,512);
    const entries=[];
    for(let i=0;i<REVIEW_SAMPLES.length;i++) {
        const def=REVIEW_SAMPLES[i];
        const review=createBoundaryReview(def);
        const maps=buildLightingMaps(review);
        const x=(i%2)*256,y=Math.floor(i/2)*256;
        composition.blit(maps.albedo,x,y);normals.blit(maps.normal,x,y);roughness.blit(maps.roughnessMap,x,y);
        for(const [label,image] of [
            ['albedo',maps.albedo],['normal',maps.normal],
            ['roughness',maps.roughnessMap],['specular-guide',maps.specularGuide]])
            exportPng(join(outputDir,`${def.name}-${label}.png`),image);
        entries.push({name:def.name,materials:[def.primary,def.secondary],policy:boundaryKind(def.primary,def.secondary),
            direction:def.direction,seed:def.seed,dimensions:[256,256],tileSize:32,
            files:['albedo','normal','roughness','specular-guide'].map(label=>`${def.name}-${label}.png`),
            phaseTiles:cutReviewInto32(maps.albedo).length,
            // Explicit art-only material descriptor; production asset registry must use G's existing texture registration.
            lighting:materialDescriptor(def.primary,{albedo:`${def.name}-albedo.png`,normal:`${def.name}-normal.png`,roughnessMap:`${def.name}-roughness.png`})});
    }
    exportPng(join(outputDir,'composition-512.png'),composition);
    exportPng(join(outputDir,'normal-512.png'),normals);
    exportPng(join(outputDir,'roughness-512.png'),roughness);
    for(const name of ['brick','flagstone','cobble'])exportPng(join(outputDir,`${name}-continuous.png`),createMasonryField(name,1387));
    const decoratedGrass=addMicroDetails(makeSoftField('grass',116),'grass',789,1);
    exportPng(join(outputDir,'grass-microdetails.png'),decoratedGrass);
    const manifest={version:GRAMMAR_VERSION,status:'source-only, not in live Hunt',source:'original authored pixels; no imported art packs',
        lightingContract:LIGHTING_MAP_CONTRACT,availableMaterials:Object.keys(TERRAIN_MATERIALS),
        samples:entries,previewFiles:['composition-512.png','normal-512.png','roughness-512.png','grass-microdetails.png'],
        approvals:{art:false,ar3Geography:false,gpuIntegration:false,phoneValidation:false}};
    writeFileSync(join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    return manifest;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
    const outputDir=process.argv[2]||'docs/art/previews/wet-forest-grammar-v1';
    const manifest=createTerrainGrammarReview(outputDir);
    console.log(`WF32-P1d: wrote ${manifest.samples.length} material/edge families and G-compatible map previews to ${outputDir}`);
}

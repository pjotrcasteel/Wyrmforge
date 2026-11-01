// WF32-P1i source-art inspection only. No runtime/C# material ownership.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createWorldMasonryWindow, createWorldBoundaryWindow,
    worldLightingMaps, WORLD_VARIATION_VERSION } from './terrain-world-variation.mjs';

if (!process.argv[1] || fileURLToPath(import.meta.url) !== process.argv[1])
    throw new Error('Review generator is CLI-only');
const dir=process.argv[2] ?? 'docs/art/previews/wf32-world-variation';
mkdirSync(dir,{recursive:true});
const save=(name, bitmap) => writeFileSync(join(dir,name),encodePng(bitmap.width,bitmap.height,bitmap.data));
const families=['flagstone','cobble','brick'];
const sheet=new Bitmap(512*3,384);
const samples=[];
for(let col=0;col<3;col++){
    const type=families[col];
    const study=createWorldMasonryWindow(type,{seed:1781,state:'collapsed',width:512,height:384});
    const maps=worldLightingMaps(study);
    for(const kind of ['albedo','normal','roughnessMap'])
        save(`${type}-${kind}.png`,maps[kind]);
    sheet.blit(maps.albedo,col*512,0);
    const ids=new Set(study.stoneIds.filter(v=>v>0));
    samples.push({type,originX:0,originY:0,width:512,height:384,survivingStoneCount:ids.size});
}
save('world-material-comparison.png',sheet);
const corners=new Bitmap(256*4,256);
const roles=['outer-nw','inner-nw','outer-se','inner-se'];
for(let col=0;col<4;col++){
    const patch=createWorldBoundaryWindow('flagstone','grass',{
        seed:319,state:'reclaimed',width:256,height:256,
        originX:0,originY:0,boundaryX:128,boundaryY:128,role:roles[col],
    });
    corners.blit(patch.albedo,col*256,0);
}
save('inner-outer-corners.png',corners);
const contrast=new Bitmap(1024,256);
for(const [col,offset] of [0,256].entries()){
    const patch=createWorldMasonryWindow('flagstone',{
        seed:1781,state:'collapsed',originX:offset,width:512,height:256});
    contrast.blit(patch.albedo,col*512,0);
}
save('offset-windows.png',contrast);
const manifesto={version:WORLD_VARIATION_VERSION,tilePixels:32,status:'source-only art preview',
    note:'World absolute stone placement; no repeated 256px stamps; corner masks are art-only not C# geography',
    samples,cornerRoles:roles,lightingContract:['albedo sRGB','tangent-space normal linear','roughness green channel linear','scalar specular'],
    generated:['world-material-comparison.png','inner-outer-corners.png','offset-windows.png',...families.flatMap(t=>['albedo','normal','roughnessMap'].map(k=>`${t}-${k}.png`))]};
writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifesto,null,2)+'\n');
console.log(`WF32-P1i generated world-scale preview: ${dir}`);

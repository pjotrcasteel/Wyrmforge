// Opt-in original-source art review only; no gameplay environment is read or changed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createWorldBoundaryWindow } from './terrain-world-variation.mjs';
import { createEcologyReviewWindow, worldLightingMaps, ECOLOGY_VERSION, ECOLOGY_COMPATIBILITY } from './terrain-ecology.mjs';

if (!process.argv[1] || fileURLToPath(import.meta.url) !== process.argv[1])
    throw new Error('Ecology review generator is CLI-only');
const target = process.argv[2] ?? 'docs/art/previews/wf32-ecology';
mkdirSync(target, {recursive:true});
const save = (name, bmp) => writeFileSync(join(target,name), encodePng(bmp.width,bmp.height,bmp.data));
const samples = [
    {type:'flagstone',soft:'grass',role:'left',state:'reclaimed',seed:1193,
        context:{moisture:.82,shelter:.88,wear:.32,density:1}},
    {type:'cobble',soft:'soil',role:'outer-nw',state:'collapsed',seed:1277,
        context:{moisture:.66,shelter:.69,wear:.78,density:1}},
    {type:'brick',soft:'mud',role:'inner-se',state:'broken',seed:1987,
        context:{moisture:.92,shelter:.57,wear:.63,density:1}},
];
const board = new Bitmap(3*256,2*256);
const records=[];
for(let col=0;col<samples.length;col++) {
    const s=samples[col];
    const coords={seed:s.seed,state:s.state,width:256,height:256,originX:0,originY:0,
        role:s.role,boundaryX:128,boundaryY:128};
    const before=createWorldBoundaryWindow(s.type,s.soft,coords);
    const after=createEcologyReviewWindow(s.type,s.soft,{...coords,context:s.context});
    board.blit(before.albedo,col*256,0);
    board.blit(after.albedo,col*256,256);
    const maps=worldLightingMaps(after);
    for(const key of ['albedo','normal','roughnessMap'])save(`${s.type}-${s.soft}-${key}.png`,maps[key]);
    records.push({material:s.type,soft:s.soft,edge:s.role,condition:s.context,
        details:after.detailPlacements.length,
        detailTypes:Object.fromEntries([...new Set(after.detailPlacements.map(x=>x.kind))].sort()
            .map(k=>[k,after.detailPlacements.filter(x=>x.kind===k).length]))});
}
save('ecology-before-after.png',board);
writeFileSync(join(target,'manifest.json'),JSON.stringify({version:ECOLOGY_VERSION,source:'original deterministic art',
    productionAdopted:false,cSharpGeographyAuthority:true,lighting:'existing G albedo/normal/roughness',
    approvedBlendingPreserved:true,tilePixels:32,detailCompatibility:ECOLOGY_COMPATIBILITY,
    rows:['original approved P1i boundary study','P1j conditioned environmental details'],records},null,2)+'\n');
console.log(`WF32-P1j generated source review in ${target}: ${records.map(r=>r.details).join('/')} details`);

// Off-line source-art orthographic scene study. Not a live Hunt capture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createWorldBoundaryWindow } from './terrain-world-variation.mjs';
import { makeEcology25DProp, buildEcology25DAtlases,
    ecology25DSceneCandidates, ECOLOGY_25D_VERSION } from './terrain-ecology-props-25d.mjs';
import { ECOLOGY_PROP_DEFINITIONS } from './terrain-ecology-props.mjs';

const write=(root,name,b)=>writeFileSync(join(root,name+'.png'),encodePng(b.width,b.height,b.data));
export function build25DReview(root) {
    mkdirSync(root,{recursive:true});
    const atlases=buildEcology25DAtlases();
    for(const [layer,channels] of Object.entries(atlases))
        for(const [channel,pack] of Object.entries(channels))write(root,layer+'-'+channel+'-atlas',pack.atlas);
    const gallery=new Bitmap(520,4*98);
    for(const [row,kind] of Object.keys(ECOLOGY_PROP_DEFINITIONS).entries())
        for(let variant=0;variant<3;variant++) {
            const sprite=makeEcology25DProp(kind,variant);
            const px=64+variant*155-sprite.anchor[0],py=row*98+75-sprite.anchor[1];
            for(const layer of ['footprint','rear','front'])gallery.blit(sprite.layers[layer].albedo,px,py);
            gallery.set(px+sprite.anchor[0],py+sprite.anchor[1],'#af8b53');
        }
    write(root,'volume-gallery',gallery);
    const world=createWorldBoundaryWindow('flagstone','grass',{
        seed:2211,state:'reclaimed',role:'left',boundaryX:144,boundaryY:128,
        originX:0,originY:0,width:384,height:256
    });
    const props=ecology25DSceneCandidates(world,{seed:2211,soft:'grass',context:{moisture:.79,wear:.62,density:1}});
    const scene=world.albedo.clone();
    // Painter's algorithm: anchor y order; ground, rear, then foreground per prop.
    for(const p of props.toSorted((a,b)=>a.y-b.y)){
        const sprite=makeEcology25DProp(p.kind,p.variant);
        for(const l of ['footprint','rear','front'])
            scene.blit(sprite.layers[l].albedo,p.x-sprite.anchor[0],p.y-sprite.anchor[1]);
    }
    write(root,'world-grounded-composition',scene);
    // A proof of physical layering, not an actual player screenshot.
    const study=new Bitmap(256,172);
    study.rect(0,0,256,172,'#293c2e');
    // Actual source pixels, nearest-neighbour; 2.5D foot overlap in one scene.
    const rock=makeEcology25DProp('rock-cluster',2),tall=makeEcology25DProp('grass-tall',1);
    const draw=(s,x,y,layer)=>study.blit(s.layers[layer].albedo,x-s.anchor[0],y-s.anchor[1]);
    draw(rock,80,122,'footprint');draw(rock,80,122,'rear');
    draw(tall,155,126,'footprint');draw(tall,155,126,'rear');
    // Pure review silhouette to show the foreground depth slice interacting with another actor.
    study.ellipse(155,125,10,3,'#3b4034');
    study.rect(151,94,9,26,'#8b8172');
    study.ellipse(155,86,6,7,'#b6a69a');
    study.line(151,116,148,125,'#a8a398',2);study.line(158,116,161,125,'#a8a398',2);
    draw(rock,80,122,'front');draw(tall,155,126,'front');
    write(root,'depth-occlusion-study',study);
    const manifest={version:ECOLOGY_25D_VERSION,status:'authoring-only / no live Hunt integration',
        props:Object.keys(ECOLOGY_PROP_DEFINITIONS),layers:['footprint','rear','front'],
        channels:['albedo','normal','roughnessMap','shadowAlpha'],
        candidates:props,source:'original 2.5D world-anchored geometry; C# physics/G renderer unchanged',
        acceptance:'Owner review + real in-Hunt light/occlusion/performance pending'};
    writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    return manifest;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
    console.log('Exported '+build25DReview(process.argv[2]||'docs/art/previews/wf32-ecology-2p5d').candidates.length+' 2.5D prop proposals');
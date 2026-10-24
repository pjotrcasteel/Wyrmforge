#!/usr/bin/env node
// Shared source atlas packer for any rig/body plan. No renderer or gameplay clock.
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {decodePng,encodePng} from '../art/lib/png.mjs';

export const DIRECTION_ROWS=Object.freeze(['N','NE','E','SE','S','SW','W','NW']);
export const MATERIAL_PASSES=Object.freeze(['albedo','normal','roughness','height','caster','emission']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeName=name=>typeof name==='string' && /^[a-z][a-z0-9-]{0,63}$/.test(name);

function selection(values,allowed,label) {
    if (!Array.isArray(values) || !values.length || values.some(x=>!safeName(x)||!allowed.includes(x)) ||
        new Set(values).size!==values.length) throw new Error('Invalid '+label+' selection');
    return values;
}
function parseArgs(argv) {
    const args={};
    for (let i=0;i<argv.length;i++) {
        const key=argv[i];
        if (!['--source','--output','--variant','--actor-id','--clips','--passes'].includes(key)||!argv[i+1])
            throw Error('Invalid argument: '+key);
        args[key.slice(2)]=argv[++i];
    }
    for(const required of ['source','output','variant']) if(!args[required]) throw Error('Missing --'+required);
    return {source:resolve(args.source),output:resolve(args.output),variant:args.variant,
        actorId:args['actor-id']??'actor',clips:args.clips?.split(','),passes:args.passes?.split(',')};
}

async function sourceTile(path,cell,isAlbedo) {
    const png=decodePng(await readFile(path));
    if(png.width!==cell||png.height!==cell) throw Error('Wrong cell dimensions '+path);
    let hasPixels=false;
    for(let y=0;y<cell;y++) for(let x=0;x<cell;x++) {
        const a=png.rgba[(y*cell+x)*4+3];
        if(a!==0&&a!==255) throw Error('Non-binary alpha: '+path);
        if(a && isAlbedo){
            hasPixels=true;
            if(x<2||y<2||x>=cell-2||y>=cell-2) throw Error('Clipped into padding: '+path);
        }
    }
    if(isAlbedo&&!hasPixels) throw Error('Blank authored frame: '+path);
    return png.rgba;
}
function tileCopy(target,tile,width,cell,col,row) {
    for(let y=0;y<cell;y++)target.set(tile.subarray(y*cell*4,(y+1)*cell*4),((row*cell+y)*width+col*cell)*4);
}

/** Build frame-accurate atlases for any body plan. No biped or school assumptions. */
export async function packActorAtlas({source,output,actorId='actor',variant,clips,passes=['albedo'],requiredClips,requiredPasses}) {
    if(!safeName(variant)||!safeName(actorId)) throw Error('Invalid actor id or variant');
    const profile=JSON.parse(await readFile(join(source,'export-profile.json'),'utf8'));
    const {cell,anchor,worldSize}=profile;
    if(JSON.stringify(profile.directions)!==JSON.stringify(DIRECTION_ROWS)) throw Error('Incorrect direction row order');
    if(!Number.isInteger(cell)||cell<32||cell>256||!Array.isArray(anchor)||anchor.length!==2||
       anchor.some(x=>!Number.isInteger(x)||x<0||x>=cell)||!Number.isFinite(worldSize)||worldSize<=0)
        throw Error('Invalid cell/feet anchor');
    const names=Object.keys(profile.clips??{});
    if(!names.length||names.some(x=>!safeName(x))) throw Error('Invalid authored clip names');
    clips=selection(clips??names,names,'clip');
    passes=selection(passes,MATERIAL_PASSES,'material pass');
    requiredClips=selection(requiredClips??names,names,'required clip');
    requiredPasses=selection(requiredPasses??MATERIAL_PASSES,MATERIAL_PASSES,'required pass');
    if(!passes.includes('albedo')) throw Error('Albedo is mandatory');
    const ordered=['albedo',...passes.filter(x=>x!=='albedo')];
    const manifest={schemaVersion:1,fps:profile.fps??12,directions:DIRECTION_ROWS,clips:{}};
    const materials={schemaVersion:1,actorId,variant,clips:{}};
    const report={actorId,variant,clips,passes,frameFilesValidated:0,atlasExportComplete:false,
        editableRigReviewed:false,animationReviewed:false,lightingApproved:false,mobileValidated:false,
        runtimeIntegrated:false};
    const outputs=[];
    for(const clip of clips) {
        const spec=profile.clips[clip];
        if(!spec||!Number.isInteger(spec.frames)||spec.frames<1||!Number.isFinite(spec.fps)||spec.fps<=0)
            throw Error('Invalid frame profile for '+clip);
        const width=spec.frames*cell,height=DIRECTION_ROWS.length*cell;
        if(width>16384) throw Error('Oversize atlas: '+clip);
        materials.clips[clip]={};
        let referenceAlpha;
        for(const pass of ordered) {
            const atlas=new Uint8Array(width*height*4);
            if(pass==='albedo')referenceAlpha=new Uint8Array(width*height);
            for(const [row,direction] of DIRECTION_ROWS.entries())for(let frame=0;frame<spec.frames;frame++) {
                const path=join(source,'frames',variant,pass,clip,direction,String(frame).padStart(3,'0')+'.png');
                let tile;
                try{tile=await sourceTile(path,cell,pass==='albedo');}
                catch(error){throw Error(actorId+'/'+variant+'/'+pass+'/'+clip+'/'+direction+'/'+frame+': '+error.message);}
                for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
                    const index=(row*cell+y)*width+frame*cell+x;
                    const alpha=tile[(y*cell+x)*4+3];
                    if(pass==='albedo')referenceAlpha[index]=alpha;
                    else if(alpha!==referenceAlpha[index])throw Error('Material alpha not aligned with albedo: '+path);
                }
                tileCopy(atlas,tile,width,cell,frame,row);
                report.frameFilesValidated++;
            }
            const filename=clip+(pass==='albedo'?'':'-'+pass)+'.png';
            const image=encodePng(width,height,atlas);
            outputs.push([filename,image]);
            materials.clips[clip][pass]={image:filename,sha256:sha(image)};
            if(pass==='albedo')manifest.clips[clip]={image:filename,hash:sha(image).slice(0,12),
                frames:spec.frames,cell,anchor,worldSize};
        }
    }
    report.atlasExportComplete=requiredClips.every(x=>clips.includes(x))&&requiredPasses.every(x=>passes.includes(x));
    // No destination is created before all source frames and masks have validated.
    const directory=join(output,variant);
    await mkdir(directory,{recursive:true});
    for(const [name,data] of outputs)await writeFile(join(directory,name),data);
    await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await writeFile(join(directory,'lit-material.json'),JSON.stringify(materials,null,2)+'\n');
    await writeFile(join(directory,'export-report.json'),JSON.stringify(report,null,2)+'\n');
    return {directory,manifest,materials,report};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
    packActorAtlas(parseArgs(process.argv.slice(2))).then(x=>console.log(x.directory))
        .catch(error=>{console.error(error.message);process.exitCode=1;});

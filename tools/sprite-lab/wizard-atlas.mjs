#!/usr/bin/env node
// Packs genuine source frames using the existing rigged-sprite manifest schema.
// Never guesses animation, normals, or occlusion geometry from albedo artwork.
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {decodePng,encodePng} from '../art/lib/png.mjs';

export const DIRECTION_ROWS=Object.freeze(['N','NE','E','SE','S','SW','W','NW']);
const CLIPS=['idle','walk','cast','hurt','death'];
const PASSES=['albedo','normal','roughness','height','caster'];
const SCHOOLS=['fire','frost','storm','arcane','necromancer','summoner'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function parseArgs(argv) {
    const args={};
    for (let i=0;i<argv.length;i++) {
        const key=argv[i];
        if (!['--source','--output','--school','--clips','--passes'].includes(key)||!argv[i+1])
            throw Error('Invalid argument: '+key);
        args[key.slice(2)]=argv[++i];
    }
    for (const key of ['source','output','school']) if (!args[key]) throw Error('Missing --'+key);
    const clips=(args.clips||CLIPS.join(',')).split(',');
    const passes=(args.passes||'albedo').split(',');
    if (!SCHOOLS.includes(args.school)) throw Error('Invalid school');
    if (!clips.length||new Set(clips).size!==clips.length||clips.some(x=>!CLIPS.includes(x)))
        throw Error('Invalid clip selection');
    if (!passes.includes('albedo')||new Set(passes).size!==passes.length||passes.some(x=>!PASSES.includes(x)))
        throw Error('Invalid pass selection');
    return {source:resolve(args.source),output:resolve(args.output),school:args.school,clips,passes};
}

async function decodeFrame(path,cell,strict) {
    const png=decodePng(await readFile(path));
    if (png.width!==cell||png.height!==cell) throw Error(path+': wrong cell dimensions');
    let visible=0;
    for (let y=0;y<cell;y++) for (let x=0;x<cell;x++) {
        const a=png.rgba[(y*cell+x)*4+3];
        if (a!==0&&a!==255) throw Error(path+': non-binary alpha');
        if (a) {
            visible++;
            if (strict&&(x<2||y<2||x>=cell-2||y>=cell-2)) throw Error(path+': clipped into padding');
        }
    }
    if (strict&&!visible) throw Error(path+': blank frame');
    return png.rgba;
}

function tileCopy(target,tile,width,cell,col,row) {
    for (let y=0;y<cell;y++)
        target.set(tile.subarray(y*cell*4,(y+1)*cell*4),((row*cell+y)*width+col*cell)*4);
}

export async function packWizardAtlas({source,output,school,clips,passes}) {
    if (!SCHOOLS.includes(school)) throw Error('Invalid school');
    const profile=JSON.parse(await readFile(join(source,'export-profile.json'),'utf8'));
    const {cell,anchor,worldSize}=profile;
    if (JSON.stringify(profile.directions)!==JSON.stringify(DIRECTION_ROWS))
        throw Error('Incorrect direction row order');
    if (!Number.isInteger(cell)||cell<32||cell>256||!Array.isArray(anchor)||anchor.length!==2||
        anchor.some(x=>!Number.isFinite(x)||x<0||x>=cell)||!(worldSize>0)) throw Error('Invalid cell/feet anchor');
    const manifest={schemaVersion:1,fps:12,directions:DIRECTION_ROWS,clips:{}};
    const materials={schemaVersion:1,school,clips:{}};
    const report={school,clips,passes,frameFilesValidated:0,atlasExportComplete:false,
        editableRigReviewed:false,animationReviewed:false,lightingApproved:false,mobileValidated:false,
        runtimeIntegrated:false};
    const outputs=[];
    for (const clip of clips) {
        const spec=profile.clips[clip];
        if (!spec||!Number.isInteger(spec.frames)||spec.frames<1||!(spec.fps>0))
            throw Error('Invalid frame profile for '+clip);
        const width=spec.frames*cell,height=8*cell;
        if (width>16384) throw Error('Oversize atlas');
        materials.clips[clip]={};
        let referenceAlpha=null;
        for (const pass of passes) {
            const atlas=new Uint8Array(width*height*4);
            if (pass==='albedo') referenceAlpha=new Uint8Array(width*height);
            for (const [row,direction] of DIRECTION_ROWS.entries()) for (let f=0;f<spec.frames;f++) {
                const path=join(source,'frames',school,pass,clip,direction,String(f).padStart(3,'0')+'.png');
                let tile;
                try {tile=await decodeFrame(path,cell,pass==='albedo');}
                catch(error) {throw Error('Wizard '+school+'/'+pass+'/'+clip+'/'+direction+'/'+f+': '+error.message);}
                for (let y=0;y<cell;y++) for (let x=0;x<cell;x++) {
                    const index=(row*cell+y)*width+f*cell+x;
                    const alpha=tile[(y*cell+x)*4+3];
                    if (pass==='albedo') referenceAlpha[index]=alpha;
                    else if (alpha!==referenceAlpha[index]) throw Error(path+': material alpha not aligned with albedo');
                }
                tileCopy(atlas,tile,width,cell,f,row);
                report.frameFilesValidated++;
            }
            const filename=clip+(pass==='albedo'?'':'-'+pass)+'.png';
            const png=encodePng(width,height,atlas);
            outputs.push([filename,png]);
            materials.clips[clip][pass]={image:filename,sha256:hash(png)};
            if (pass==='albedo')
                manifest.clips[clip]={image:filename,hash:hash(png).slice(0,12),
                    frames:spec.frames,cell,anchor,worldSize};
        }
    }
    report.atlasExportComplete=clips.length===CLIPS.length&&passes.length===PASSES.length;
    const directory=join(output,school);
    await mkdir(directory,{recursive:true});
    for (const [name,png] of outputs) await writeFile(join(directory,name),png);
    await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await writeFile(join(directory,'lit-material.json'),JSON.stringify(materials,null,2)+'\n');
    await writeFile(join(directory,'export-report.json'),JSON.stringify(report,null,2)+'\n');
    return {directory,manifest,materials,report};
}

if (process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
    packWizardAtlas(parseArgs(process.argv.slice(2))).then(({directory})=>console.log(directory))
        .catch(error=>{console.error(error.message);process.exitCode=1;});

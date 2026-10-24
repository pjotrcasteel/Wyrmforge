import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {encodePng,decodePng} from '../../art/lib/png.mjs';
import {DIRECTION_ROWS,packActorAtlas} from '../actor-atlas.mjs';

async function fixture(t,missing=false) {
    const root=await mkdtemp(join(tmpdir(),'wyrmforge-actor-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    const source=join(root,'source'),output=join(root,'output');
    await mkdir(source);
    await writeFile(join(source,'export-profile.json'),JSON.stringify({
        directions:DIRECTION_ROWS,cell:64,anchor:[31,53],worldSize:80,
        clips:{scuttle:{frames:2,fps:16},death:{frames:1,fps:12}}
    }));
    for(const clip of ['scuttle','death'])for(const direction of DIRECTION_ROWS)for(let frame=0;frame<(clip==='scuttle'?2:1);frame++){
        for(const pass of ['albedo','normal','emission']){
            if(missing&&clip==='scuttle'&&direction==='S'&&frame===1&&pass==='normal')continue;
            const folder=join(source,'frames','feral',pass,clip,direction);
            await mkdir(folder,{recursive:true});
            const rgba=new Uint8Array(64*64*4);
            for(let y=20;y<42;y++)for(let x=20;x<40;x++){
                const rgb=pass==='albedo'?[65+frame,57+DIRECTION_ROWS.indexOf(direction),48,255]:
                    pass==='normal'?[128,128,255,255]:[0,0,0,255];
                rgba.set(rgb,(y*64+x)*4);
            }
            await writeFile(join(folder,String(frame).padStart(3,'0')+'.png'),encodePng(64,64,rgba));
        }
    }
    return {source,output};
}
test('nonhumanoid motion clips and variants use shared atlas schema',async t=>{
    const {source,output}=await fixture(t);
    const {directory,manifest,materials,report}=await packActorAtlas({source,output,actorId:'mire-creature',
        variant:'feral',clips:['scuttle','death'],passes:['emission','normal','albedo'],
        requiredClips:['scuttle','death'],requiredPasses:['albedo','normal','emission']});
    assert.deepEqual(manifest.directions,DIRECTION_ROWS);
    assert.deepEqual(manifest.clips.scuttle.anchor,[31,53]);
    assert.equal(report.atlasExportComplete,true);
    assert.equal(report.frameFilesValidated,8*3*3);
    assert.equal(report.lightingApproved,false);
    assert.equal(materials.actorId,'mire-creature');
    const atlas=decodePng(await readFile(join(directory,'scuttle.png')));
    const emission=decodePng(await readFile(join(directory,'scuttle-emission.png')));
    assert.deepEqual([atlas.width,atlas.height],[128,512]);
    for(let i=0;i<atlas.rgba.length;i+=4){
        assert.equal(atlas.rgba[i+3],emission.rgba[i+3]);
        assert.equal(emission.rgba[i]+emission.rgba[i+1]+emission.rgba[i+2],0);
    }
});
test('missing original material frame stops before creating output directory',async t=>{
    const {source,output}=await fixture(t,true);
    await assert.rejects(()=>packActorAtlas({source,output,actorId:'mire-creature',variant:'feral',
        clips:['scuttle'],passes:['albedo','normal']}),/mire-creature\/feral\/normal\/scuttle\/S\/1/);
    await assert.rejects(()=>stat(join(output,'feral')),{code:'ENOENT'});
});
test('unsafe variants and unsupported material passes are rejected',async t=>{
    const {source,output}=await fixture(t);
    await assert.rejects(()=>packActorAtlas({source,output,variant:'../evil',clips:['scuttle']}),/Invalid actor/);
    await assert.rejects(()=>packActorAtlas({source,output,variant:'feral',clips:['scuttle'],
        passes:['albedo','baked-glow']}),/Invalid material pass/);
    await assert.rejects(()=>packActorAtlas({source,output,variant:'feral',clips:['scuttle'],
        passes:['normal']}),/Albedo is mandatory/);
});

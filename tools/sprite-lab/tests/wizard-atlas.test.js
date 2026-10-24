import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {encodePng,decodePng} from '../../art/lib/png.mjs';
import {DIRECTION_ROWS,packWizardAtlas} from '../wizard-atlas.mjs';

async function fixture(t) {
    const root=await mkdtemp(join(tmpdir(),'wizard-atlas-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    const source=join(root,'source'),output=join(root,'output');
    await mkdir(source);
    await writeFile(join(source,'export-profile.json'),JSON.stringify({
        cell:64,anchor:[32,54],worldSize:72,directions:DIRECTION_ROWS,
        clips:{idle:{frames:2,fps:12}}
    }));
    return {source,output};
}

async function frames(source,breakNormal=false) {
    for (const direction of DIRECTION_ROWS) for (const pass of ['albedo','normal','emission']) {
        const dir=join(source,'frames','fire',pass,'idle',direction);
        await mkdir(dir,{recursive:true});
        for (let f=0;f<2;f++) {
            const rgba=new Uint8Array(64*64*4);
            for (let y=20;y<42;y++) for (let x=20;x<40;x++)
                rgba.set(pass==='albedo'?[72,68+f,65,255]:pass==='emission'?[0,0,0,255]:[128,128,255,255],(y*64+x)*4);
            if (breakNormal&&pass==='normal'&&direction==='S'&&f===1)
                rgba[(21*64+21)*4+3]=0;
            await writeFile(join(dir,String(f).padStart(3,'0')+'.png'),encodePng(64,64,rgba));
        }
    }
}

test('wizard has real eight-direction atlas, existing manifest schema and aligned normals',async t=>{
    const {source,output}=await fixture(t);
    await frames(source);
    const result=await packWizardAtlas({source,output,school:'fire',clips:['idle'],passes:['albedo','normal','emission']});
    assert.deepEqual(result.manifest.directions,DIRECTION_ROWS);
    assert.deepEqual(result.manifest.clips.idle.anchor,[32,54]);
    assert.equal(result.report.frameFilesValidated,48);
    assert.equal(result.report.atlasExportComplete,false);
    const color=decodePng(await readFile(join(result.directory,'idle.png')));
    const normal=decodePng(await readFile(join(result.directory,'idle-normal.png')));
    const emission=decodePng(await readFile(join(result.directory,'idle-emission.png')));
    assert.deepEqual([color.width,color.height],[128,512]);
    for (let i=3;i<color.rgba.length;i+=4) { assert.equal(color.rgba[i],normal.rgba[i]); assert.equal(color.rgba[i],emission.rgba[i]); }
});

test('wizard writes no glow when idle emission pixels are black',async t=>{
    const {source,output}=await fixture(t);await frames(source);
    const result=await packWizardAtlas({source,output,school:'fire',clips:['idle'],passes:['albedo','emission']});
    const em=decodePng(await readFile(join(result.directory,'idle-emission.png')));
    for(let i=0;i<em.rgba.length;i+=4) assert.equal(em.rgba[i]+em.rgba[i+1]+em.rgba[i+2],0);
});

test('wizard rejects mismatched normal silhouette',async t=>{
    const {source,output}=await fixture(t);await frames(source,true);
    await assert.rejects(()=>packWizardAtlas({source,output,school:'fire',clips:['idle'],passes:['albedo','normal']}),
        /material alpha not aligned/);
});

test('wizard never fabricates missing motion source frames',async t=>{
    const {source,output}=await fixture(t);
    await assert.rejects(()=>packWizardAtlas({source,output,school:'fire',clips:['idle'],passes:['albedo']}),
        /Wizard fire\/albedo\/idle\/N\/0/);
});

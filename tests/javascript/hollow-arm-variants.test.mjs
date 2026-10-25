import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHollowVariantAssets,selectHollowArmVariant,HOLLOW_ARM_VARIANTS}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-arm-variants.js';

test('only standard and two damaged-ARM variants; stable entity selection, no broken-leg spawn',()=>{
    assert.deepEqual(HOLLOW_ARM_VARIANTS,['standard','broken-arm-right','one-arm-left']);
    const values=new Set();
    for(let id=0;id<150;id++){
        const first=selectHollowArmVariant(id);
        assert.equal(selectHollowArmVariant(id),first);
        assert.ok(HOLLOW_ARM_VARIANTS.includes(first));
        values.add(first);
    }
    assert.equal(values.size,3);
    assert.equal(selectHollowArmVariant('bad'),'standard');
});

test('load all six exact clip atlases atomically and render direction/frame offsets',async()=>{
    const previousFetch=globalThis.fetch,previousImage=globalThis.Image;
    const manifest={
        schemaVersion:1,cell:96,frames:16,directions:['N','NE','E','SE','S','SW','W','NW'],
        variants:[...HOLLOW_ARM_VARIANTS],clips:{}
    };
    for(const variant of HOLLOW_ARM_VARIANTS)
        manifest.clips[variant]=Object.fromEntries(['walk','attack'].map(clip=>
            [clip,{image:`${variant}-${clip}.png`,sha256:'a'.repeat(64),cell:96,frames:16,worldSize:93,anchor:[48,72]}]));
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(value){this.url=value;this.onload?.();}
        };
        const pack=createHollowVariantAssets(new URL('https://example.test/variants/'));
        assert.equal(await pack.preload(),true);
        assert.equal(pack.ready(),true);
        const calls=[];
        const ctx={
            globalAlpha:1,save(){},restore(){},
            drawImage(...args){calls.push(args);}
        };
        assert.equal(pack.draw(ctx,'broken-arm-right','walk',7,'SW',100,100,11),true);
        assert.equal(calls[0][1],7*96);
        assert.equal(calls[0][2],5*96);
        assert.equal(calls[0][5],100-48/96*93);
        assert.equal(calls[0][6],100-72/96*93);
        assert.equal(pack.draw(ctx,'one-arm-left','attack',15,'NE',100,100,11),true);
        assert.equal(calls[1][1],15*96);
        assert.equal(calls[1][2],1*96);
        assert.equal(pack.draw(ctx,'broken-leg-left','walk',0,'S',100,100,11),true);
        assert.equal(calls.length,3);
    }finally{globalThis.fetch=previousFetch;globalThis.Image=previousImage;}
});

test('reject partially missing variant atlases, leaving original playable as fallback',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:false});
        globalThis.Image=class {};
        const pack=createHollowVariantAssets(new URL('https://example.test/variants/'));
        assert.equal(await pack.preload(),false);
        assert.equal(pack.ready(),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('checked-in runtime packet contains only 3 variants and matching source geometry',()=>{
    const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/variants/',import.meta.url);
    const fs=requireRuntimeManifest();
    function requireRuntimeManifest(){
        try{return JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));}
        catch(error){if(error?.code==='ENOENT')return null;throw error;}
    }
    if(fs===null)return;
    assert.deepEqual(fs.variants,HOLLOW_ARM_VARIANTS);
    assert.equal(fs.brokenLegShipped,false);
    for(const variant of fs.variants)
        for(const clip of ['walk','attack']){
            const item=fs.clips[variant][clip];
            assert.equal(item.frames,16);
            assert.equal(item.cell,96);
            assert.equal(item.sourcePoseSha256.length,64);
            assert.ok(item.minimumMeshIoU>.90);
            for(const name of ['normal','depth','caster','emissive'])
                assert.equal(item.materials[name].sha256.length,64);
        }
});

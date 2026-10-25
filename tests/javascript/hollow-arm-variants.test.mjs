import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HOLLOW_ARM_VARIANTS,selectHollowArmVariant,createHollowVariantAssets}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-arm-variants.js';

const base=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/arms/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\\0')).update(bytes).digest('hex');

test('every Hollowed has a stable cape-free standard or approved arm injury',()=>{
    const counts=new Map(HOLLOW_ARM_VARIANTS.map(v=>[v,0]));
    for(let id=0;id<300;id++){
        const variant=selectHollowArmVariant(id);
        assert.equal(selectHollowArmVariant(id),variant);
        counts.set(variant,(counts.get(variant)??0)+1);
    }
    assert.deepEqual([...counts.values()],[100,100,100]);
    assert.equal(selectHollowArmVariant(-1),'standard');
    assert.deepEqual(manifest.variants,HOLLOW_ARM_VARIANTS);
    assert.equal(manifest.variants.includes('standard'),true);
});

test('six no-cape runtime atlases match their source git blob and expected dimensions',()=>{
    for(const variant of HOLLOW_ARM_VARIANTS)for(const action of ['walk','attack']){
        const clip=manifest.clips[variant][action];
        const png=readFileSync(new URL(clip.image,base));
        assert.equal(png.readUInt32BE(16),1536,variant+'/'+action);
        assert.equal(png.readUInt32BE(20),768,variant+'/'+action);
        assert.equal(gitBlobSha(png),clip.gitBlobSha,variant+'/'+action);
    }
});

test('all normal/injured poses use their matching cape-free atlas, including NW attack',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(url){this.url=url;queueMicrotask(()=>this.onload());}
        };
        const pack=createHollowVariantAssets(base);
        assert.equal(await pack.preload(),true);
        assert.equal(pack.ready(),true);
        const frames=[];
        const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){frames.push(args);}};
        for(const variant of HOLLOW_ARM_VARIANTS){
            assert.equal(pack.draw(ctx,variant,'walk',0,'S',40,50,11),true);
            assert.equal(pack.draw(ctx,variant,'attack',15,'NW',40,50,11),true);
        }
        assert.equal(frames.length,6);
        assert.equal(frames[1][1],15*96);
        assert.equal(frames[1][2],7*96);
        assert.equal(ctx.imageSmoothingEnabled,false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('partially downloaded pack is never marked ready',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        let count=0;
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(_url){if(count++===5)queueMicrotask(()=>this.onerror());else queueMicrotask(()=>this.onload());}
        };
        const pack=createHollowVariantAssets(base);
        assert.equal(await pack.preload(),false);
        assert.equal(pack.ready(),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

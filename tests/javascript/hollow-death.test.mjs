import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHollowDeathAssets,HOLLOW_DEATH_DIRECTIONS,HOLLOW_DEATH_VARIANTS,selectHollowDeathVariant}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-death.js';

const base=new URL('https://example.test/hollow/death/');
const manifest={
    schemaVersion:2,actor:'hollowed',clip:'death',
    renderedFrom3D:true,capeRemovedInActualMesh:true,
    frames:24,fps:12,cell:128,worldSize:124,anchor:[64,88],
    directions:HOLLOW_DEATH_DIRECTIONS,variants:HOLLOW_DEATH_VARIANTS,
    clips:{
        'collapse-forward':{image:'death.png',sha256:'a'.repeat(64)},
        'collapse-braced':{image:'death-braced.png',sha256:'b'.repeat(64)}
    }
};

test('two distinct 24-pose 3D death clips have all 8 views and stable planted pivots',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=3072;naturalHeight=1024;
            set src(value){this.url=value;queueMicrotask(()=>this.onload());}
        };
        const packet=createHollowDeathAssets(base);
        assert.equal(await packet.preload(),true);
        const draws=[];
        const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){draws.push(args);}};
        for(const variant of HOLLOW_DEATH_VARIANTS)for(let row=0;row<8;row++){
            assert.equal(packet.draw(ctx,variant,23,HOLLOW_DEATH_DIRECTIONS[row],80,100,11),true);
            const call=draws.at(-1);
            assert.equal(call[1],23*128);
            assert.equal(call[2],row*128);
            assert.equal(call[5],80-64/128*124);
            assert.equal(call[6],100-88/128*124);
            assert.ok(call[0].url.includes('/'+manifest.clips[variant].image+'?'));
        }
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.equal(packet.draw(ctx,'collapse-forward',-1,'S',0,0,11),true);
        assert.equal(draws.at(-1)[1],0);
        assert.equal(packet.draw(ctx,'collapse-braced',5,'INVALID',0,0,11),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('missing or partially loaded variant cannot become production art',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>({...manifest,renderedFrom3D:false})});
        let packet=createHollowDeathAssets(base);
        assert.equal(await packet.preload(),false);
        assert.equal(packet.ready(),false);
        assert.equal(packet.draw({},'collapse-forward',0,'S',0,0,11),false);
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=3072;naturalHeight=1024;
            set src(value){this.url=value;queueMicrotask(()=>{
                if(value.includes('death-braced.png'))this.onerror();
                else this.onload();
            });}
        };
        packet=createHollowDeathAssets(base);
        assert.equal(await packet.preload(),false);
        assert.equal(packet.ready(),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('different Hollowed receive stable forward and braced 3D skeletal deaths',()=>{
    const counts=new Map(HOLLOW_DEATH_VARIANTS.map(name=>[name,0]));
    for(let entityId=0;entityId<1000;entityId++){
        const chosen=selectHollowDeathVariant(entityId);
        assert.equal(chosen,selectHollowDeathVariant(entityId));
        counts.set(chosen,counts.get(chosen)+1);
    }
    assert.ok([...counts.values()].every(count=>count>=400&&count<=600));
    assert.equal(selectHollowDeathVariant(-1),'collapse-forward');
    assert.equal(selectHollowDeathVariant(NaN),'collapse-forward');
});

test('both published 3D death atlases have authentic manifest hashes and distinct poses',()=>{
    const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/death/',import.meta.url);
    const source=JSON.parse(readFileSync(new URL('manifest.json',root)));
    assert.equal(source.schemaVersion,2);
    assert.equal(source.renderedFrom3D,true);
    assert.deepEqual(source.variants,HOLLOW_DEATH_VARIANTS);
    const fingerprints=new Set();
    for(const variant of HOLLOW_DEATH_VARIANTS){
        const item=source.clips[variant];
        const bytes=readFileSync(new URL(item.image,root));
        assert.equal(bytes.readUInt32BE(16),128*24);
        assert.equal(bytes.readUInt32BE(20),128*8);
        assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
        fingerprints.add(item.sha256);
    }
    assert.equal(fingerprints.size,2,'both death variants need independently authored pixels');
});

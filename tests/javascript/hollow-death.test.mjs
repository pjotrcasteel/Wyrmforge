import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowDeathAssets,HOLLOW_DEATH_DIRECTIONS}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-death.js';

const base=new URL('https://example.test/hollow/death/');
const manifest={
    schemaVersion:1,actor:'hollowed',clip:'death',
    renderedFrom3D:true,capeRemovedInActualMesh:true,
    frames:24,fps:12,cell:128,worldSize:124,anchor:[64,88],
    directions:HOLLOW_DEATH_DIRECTIONS,image:'death.png',sha256:'a'.repeat(64)
};

test('24 authored 3D collapse frames have 8 actual rows and a grounded pivot',async()=>{
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
        for(let row=0;row<8;row++){
            assert.equal(packet.draw(ctx,23,HOLLOW_DEATH_DIRECTIONS[row],80,100,11),true);
            assert.equal(draws[row][1],23*128);
            assert.equal(draws[row][2],row*128);
            assert.equal(draws[row][5],80-64/128*124);
            assert.equal(draws[row][6],100-88/128*124);
        }
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.equal(packet.draw(ctx,-1,'S',0,0,11),true);
        assert.equal(draws.at(-1)[1],0);
        assert.equal(packet.draw(ctx,5,'INVALID',0,0,11),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('missing, fake, or partial death clip cannot displace the playable actor',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>({...manifest,renderedFrom3D:false})});
        let packet=createHollowDeathAssets(base);
        assert.equal(await packet.preload(),false);
        assert.equal(packet.ready(),false);
        assert.equal(packet.draw({},0,'S',0,0,11),false);
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=128;naturalHeight=128;
            set src(_value){queueMicrotask(()=>this.onload());}
        };
        packet=createHollowDeathAssets(base);
        assert.equal(await packet.preload(),false);
        assert.equal(packet.ready(),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

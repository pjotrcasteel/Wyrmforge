import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowInjuryDeathAssets,selectHollowDeathInjury,
        HOLLOW_INJURY_DEATH_VARIANTS,HOLLOW_INJURY_DEATH_DIRECTIONS}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-injury-death.js';

const manifest=Object.freeze({
    schemaVersion:1,actor:'hollowed',clip:'death',
    renderedFrom3D:true,capeRemovedInActualMesh:true,
    frames:24,fps:12,cell:96,worldSize:124,anchor:[48,66],
    variants:HOLLOW_INJURY_DEATH_VARIANTS,
    directions:HOLLOW_INJURY_DEATH_DIRECTIONS,
    clips:Object.fromEntries(HOLLOW_INJURY_DEATH_VARIANTS.map((variant,index)=>[
        variant,{image:'death-'+variant+'.png',sha256:(index+1).toString(16).repeat(64)}]))
});

test('injury death follows the body source and preserves leg precedence',()=>{
    assert.equal(selectHollowDeathInjury({injuryVariant:'broken-leg-left',armVariant:'one-arm-left'}),'broken-leg-left');
    assert.equal(selectHollowDeathInjury({injuryVariant:'standard',armVariant:'broken-arm-right'}),'broken-arm-right');
    assert.equal(selectHollowDeathInjury({injuryVariant:'standard',armVariant:'one-arm-left'}),'one-arm-left');
    assert.equal(selectHollowDeathInjury({injuryVariant:'standard',armVariant:'standard'}),'standard');
    assert.equal(selectHollowDeathInjury(undefined),'standard');
});

test('optional source atlases are lazy per spawn, not a 3-atlas eager memory allocation',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    let manifestRequests=0,bitmapRequests=0;
    try{
        globalThis.fetch=async()=>{manifestRequests++;return {ok:true,json:async()=>manifest};};
        globalThis.Image=class {
            naturalWidth=2304;naturalHeight=768;
            set src(value){this.url=value;bitmapRequests++;queueMicrotask(()=>this.onload());}
        };
        const packet=createHollowInjuryDeathAssets(new URL('https://example.test/death/injuries/'));
        assert.equal(packet.loadedCount(),0);
        assert.equal(await packet.preload('standard'),false);
        assert.equal(bitmapRequests,0);
        assert.equal(await packet.preload('one-arm-left'),true);
        assert.equal(packet.loadedCount(),1);
        assert.equal(packet.ready('broken-arm-right'),false);
        assert.equal(await packet.preload('one-arm-left'),true);
        assert.equal(bitmapRequests,1,'duplicate corpse/actor must reuse the same texture');
        assert.equal(await packet.preload('broken-arm-right'),true);
        assert.equal(packet.loadedCount(),2);
        assert.equal(manifestRequests,1);
        assert.equal(bitmapRequests,2);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('every real injured death uses correct 8-direction 3D atlas frame, ground pivot and opacity',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=2304;naturalHeight=768;
            set src(url){this.url=url;queueMicrotask(()=>this.onload());}
        };
        const packet=createHollowInjuryDeathAssets(new URL('https://example.test/death/injuries/'));
        const records=[];
        const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){records.push(args);}};
        for(const variant of HOLLOW_INJURY_DEATH_VARIANTS){
            assert.equal(await packet.preload(variant),true);
            for(let row=0;row<8;row++){
                const ok=packet.draw(ctx,variant,23,HOLLOW_INJURY_DEATH_DIRECTIONS[row],50,70,11,.6);
                assert.equal(ok,true);
                const args=records.at(-1);
                assert.ok(args[0].url.includes('/death-'+variant+'.png?'));
                assert.equal(args[1],23*96);
                assert.equal(args[2],row*96);
                assert.equal(args[5],50-48/96*124);
                assert.equal(args[6],70-66/96*124);
            }
        }
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.equal(packet.draw(ctx,'not-real',4,'S',0,0,11),false);
        assert.equal(packet.draw(ctx,'one-arm-left',4,'not-direction',0,0,11),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('bad manifests and incomplete image downloads never displace existing playable death',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>({...manifest,renderedFrom3D:false})});
        let packet=createHollowInjuryDeathAssets(new URL('https://example.test/death/injuries/'));
        assert.equal(await packet.preload('broken-leg-left'),false);
        assert.equal(packet.ready('broken-leg-left'),false);
        globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
        globalThis.Image=class {
            naturalWidth=1;naturalHeight=1;
            set src(_value){queueMicrotask(()=>this.onload());}
        };
        packet=createHollowInjuryDeathAssets(new URL('https://example.test/death/injuries/'));
        assert.equal(await packet.preload('broken-leg-left'),false);
        assert.equal(packet.loadedCount(),0);
        assert.equal(packet.draw({},'broken-leg-left',0,'S',0,0,11),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

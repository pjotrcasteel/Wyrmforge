import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHollowInjuryAssets,HOLLOW_INJURY_DIRECTIONS,
    selectHollowInjuryVariant,hollowInjuryLabReview}
from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-injury-variants.js';

const base=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/injuries/',import.meta.url);
const metadata=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
const correctGitBlobSha=bytes=>createHash('sha1')
    .update(Buffer.from('blob '+bytes.length+'\0'))
    .update(bytes).digest('hex');

test('one-in-four stable injury selection, no random gameplay changes; forced display only in enemy lab',()=>{
    const seen=new Set();
    for(let id=0;id<256;id++){
        const name=selectHollowInjuryVariant(id);
        assert.equal(selectHollowInjuryVariant(id),name);
        seen.add(name);
    }
    assert.deepEqual([...seen].sort(),['broken-leg-left','standard']);
    assert.equal(Array.from({length:256},(_,id)=>selectHollowInjuryVariant(id)).filter(v=>v==='broken-leg-left').length,64);
    assert.equal(selectHollowInjuryVariant(-2),'standard');
    assert.equal(selectHollowInjuryVariant('NaN'),'standard');
    assert.equal(hollowInjuryLabReview('/enemy-lab','?hollowInjury=left'),true);
    assert.equal(hollowInjuryLabReview('/hunting','?hollowInjury=left'),false);
    assert.equal(selectHollowInjuryVariant(7,true),'broken-leg-left');
});

test('walk/attack are exact 3D Blender RGB frames; no fabricated normals or runtime light contract',()=>{
    assert.equal(metadata.variant,'broken-leg-left');
    assert.deepEqual(metadata.directions,HOLLOW_INJURY_DIRECTIONS);
    assert.equal(metadata.gameplayAuthority,'C#');
    assert.equal(metadata.fullBodyAttack,true);
    assert.equal(metadata.death,'legacy approved Hollowed death');
    assert.match(metadata.lightingIntegration,/pending universal GPU/);
    for(const name of ['walk','attack']){
        const clip=metadata.clips[name];
        const png=readFileSync(new URL(clip.image,base));
        assert.equal(png.readUInt32BE(16),1536);
        assert.equal(png.readUInt32BE(20),768);
        assert.equal(correctGitBlobSha(png),clip.gitBlobSha);
        assert.equal(clip.frames,16);
        assert.equal(clip.cell,96);
        assert.deepEqual(clip.anchor,[48,72]);
    }
});

test('walk and attack load atomically, render native pixels, and leave death on old source',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>metadata});
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(url){this.url=url;queueMicrotask(()=>this.onload());}
        };
        const packet=createHollowInjuryAssets(base);
        assert.equal(await packet.preload(),true);
        assert.equal(packet.ready(),true);
        const calls=[];
        const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args);}};
        assert.equal(packet.draw(ctx,'broken-leg-left','walk',7,'SW',100,100,11),true);
        assert.equal(calls[0][1],7*96);
        assert.equal(calls[0][2],5*96);
        assert.equal(calls[0][5],100-48/96*93);
        assert.equal(calls[0][6],100-72/96*93);
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.equal(packet.draw(ctx,'broken-leg-left','attack',15,'NE',100,100,11),true);
        assert.equal(calls.length,2);
        assert.equal(calls[1][2],96);
        assert.equal(packet.draw(ctx,'broken-leg-left','death',5,'S',100,100,11),false);
        assert.equal(packet.draw(ctx,'standard','walk',5,'S',100,100,11),false);
        assert.equal(calls.length,2);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('one missing or incompatible image never causes half-loaded injury movement',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        globalThis.fetch=async()=>({ok:true,json:async()=>metadata});
        let i=0;
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(_){if(i++===0)queueMicrotask(()=>this.onload());else queueMicrotask(()=>this.onerror());}
        };
        const packet=createHollowInjuryAssets(base);
        assert.equal(await packet.preload(),false);
        assert.equal(packet.ready(),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

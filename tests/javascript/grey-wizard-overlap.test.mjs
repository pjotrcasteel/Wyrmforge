import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
const base=new URL('../../art/source/characters/grey-wizard/',import.meta.url);
test('reported wrist rectangle is open air throughout the affected support frames',()=>{
    for(let frame=5;frame<=10;frame++){
        const name=`frames/walk-${String(frame).padStart(2,'0')}.png`;
        const before=decodePng(readFileSync(new URL('gothic-southeast-v008-repair/'+name,base)));
        const after=decodePng(readFileSync(new URL('gothic-southeast-v009-overlap/'+name,base)));
        for(const [x,y]of [[54,70],[55,72],[56,73]]){
            assert.equal(before.rgba[(y*160+x)*4+3],255,'probe no longer reproduces the reported artifact');
            assert.equal(after.rgba[(y*160+x)*4+3],0,`wrist artifact returned in frame${frame} at${x},${y}`);
        }
    }
    const paint=decodePng(readFileSync(new URL('gothic-southeast-v009-overlap/source-layers/robe-under-staff.png',base)));
    for(let y=0;y<96;y++)for(let x=0;x<160;x++)assert.equal(paint.rgba[(y*160+x)*4+3],0,'cape paint extended above actual overlap');
});

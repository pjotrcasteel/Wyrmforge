import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
const base=new URL('../../art/source/characters/grey-wizard/',import.meta.url);
test('reported ankle has leg coverage instead of transparent gaps and travelling grey hem',()=>{
    for(const [frame,x,y]of [[0,47,127],[7,43,126],[8,43,125],[15,47,127]]){
        const name=`frames/walk-${String(frame).padStart(2,'0')}.png`;
        const old=decodePng(readFileSync(new URL('gothic-south-v011-boots/'+name,base)));
        const fixed=decodePng(readFileSync(new URL('gothic-south-v012-legs/'+name,base)));
        const p=(y*160+x)*4+3;
        assert.equal(old.rgba[p],0,'probe must reproduce the missing ankle coverage');
        assert.equal(fixed.rgba[p],255,`missing ankle coverage in frame${frame}`);
    }
    for(const frame of [0,15]){
        const name=`frames/walk-${String(frame).padStart(2,'0')}.png`;
        const old=decodePng(readFileSync(new URL('gothic-south-v011-boots/'+name,base)));
        const fixed=decodePng(readFileSync(new URL('gothic-south-v012-legs/'+name,base)));
        const p=(127*160+44)*4;
        assert.ok(Math.abs(old.rgba[p]-old.rgba[p+1])<12,'reported grey hem probe changed');
        assert.ok(fixed.rgba[p]-fixed.rgba[p+1]>18,'grey cloth still crosses the exposed leather shaft');
    }
});

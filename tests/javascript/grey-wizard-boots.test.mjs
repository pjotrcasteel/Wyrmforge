import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
const base=new URL('../../art/source/characters/grey-wizard/',import.meta.url);
test('reported trailing heel pixels do not stay behind during the raised-foot phase',()=>{
    for(let i=6;i<=10;i++){
        const frame=`frames/walk-${String(i).padStart(2,'0')}.png`;
        const old=decodePng(readFileSync(new URL('gothic-south-v010-stick/'+frame,base)));
        const fixed=decodePng(readFileSync(new URL('gothic-south-v011-boots/'+frame,base)));
        for(const[x,y]of [[50,135],[50,136],[51,135]]){
            const p=(y*160+x)*4+3;
            assert.equal(old.rgba[p],255,'probe must reproduce the reported heel remnant');
            assert.equal(fixed.rgba[p],0,`heel remnant in frame${i} at${x},${y}`);
        }
    }
});

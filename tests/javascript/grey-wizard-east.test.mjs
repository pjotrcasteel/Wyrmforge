import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
const base=new URL('../../art/source/characters/grey-wizard/gothic-east-v013/',import.meta.url);
const png=name=>decodePng(readFileSync(new URL(name,base)));
const alpha=(image,x,y)=>image.rgba[(y*image.width+x)*4+3];
function bottom(image){for(let y=image.height-1;y>=0;y--)for(let x=0;x<image.width;x++)if(alpha(image,x,y))return y;}
test('east stick actually reaches the near boot ground row and cannot leak wood into a boot layer',()=>{
    const staff=png('source-layers/staff.png'),near=png('source-layers/boot-left.png');
    assert.equal(bottom(staff),bottom(near),'stick floats above/below the authored foreground ground plane');
    assert.equal(alpha(staff,95,136),255);assert.equal(alpha(near,95,136),0,'shaft extension became part of the moving boot');
    assert.notDeepEqual(png('source-layers/boot-right.png').rgba,near.rgba,'far boot must have separate shaded/offset source coverage');
});
test('east body seam padding does not leave a remnant in the vacated staff gap',()=>{
    for(let i=7;i<=11;i++)assert.equal(alpha(png(`frames/walk-${String(i).padStart(2,'0')}.png`),96,100),0,`old shaft/cloth remnant in frame${i}`);
});

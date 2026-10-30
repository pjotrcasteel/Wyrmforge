import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
const base=new URL('../../art/source/characters/grey-wizard/gothic-northeast-v014/',import.meta.url);
const png=name=>decodePng(readFileSync(new URL(name,base)));
test('NE school embroidery stays in the cloth source and is not a cape light emitter',()=>{
    const source=png('source-master.png'),cloth=png('source-layers/cloak-left.png'),emission=png('walk-emission.png');
    let motif=0;
    for(let y=66;y<102;y++)for(let x=55;x<86;x++){
        const p=(y*160+x)*4,r=source.rgba[p],g=source.rgba[p+1],b=source.rgba[p+2];
        if(source.rgba[p+3]&&r>50&&r>g*1.25&&r>b*1.4){motif++;assert.equal(cloth.rgba[p+3],255,'cape pigment is split onto an unrelated layer');}
        for(let frame=0;frame<16;frame++)assert.equal(emission.rgba[(y*emission.width+frame*160+x)*4+3],0,'woven cape motif became emission');
    }
    assert.ok(motif>20,'review no longer contains a readable faded school motif');
});
test('NE crystal, shaft and finger pigments cannot remain on the stationary body',()=>{
    const source=png('source-master.png'),staff=png('source-layers/staff.png'),hand=png('source-layers/staff-hand.png');
    let checked=0;
    for(let y=27;y<=130;y++)for(let x=99;x<121;x++){
        const p=(y*160+x)*4,r=source.rgba[p],g=source.rgba[p+1],b=source.rgba[p+2];
        if(source.rgba[p+3]&&r>25&&r>g*1.25&&r>b*1.4){checked++;assert.ok(staff.rgba[p+3]||hand.rgba[p+3],`old-position staff pigment at${x},${y}`);}
    }
    assert.ok(checked>50);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
import {project,poses,staffPoint,staffGrip,transform} from '../../tools/art/grey-wizard/gothic-north-arm.mjs';

const base=new URL('../../art/source/characters/grey-wizard/gothic-north-v017/',import.meta.url);
const json=file=>JSON.parse(readFileSync(new URL(file,base),'utf8'));
const png=file=>decodePng(readFileSync(new URL(file,base)));

test('north v017 separates wrist fabric, staff, hand, sleeve, robe and leather shins',()=>{
    const source=json('project.json');
    assert.equal(source.restRecompositionExact,true);
    assert.equal(source.bleed,0);
    assert.equal(source.layers.length,13);
    assert.deepEqual(source.layers.map(p=>p.name),project.drawOrder);
    assert.equal(source.layers.find(p=>p.name==='wrist-cuff').pixels,93);
    assert.equal(source.layers.find(p=>p.name==='sleeve-underlay').pixels,206);
    assert.ok(!source.layers.some(p=>p.name.startsWith('cloak-')),
        'never split the embroidered robe into arbitrary halves');
});

test('new wrist and shoulder pigments are concealed by the correct native sleeve',()=>{
    const source=json('project.json');
    const master=png('source-master.png');
    const layers=source.layers.map(({file,name})=>({name,image:png(file)}));
    const pixels=new Uint8Array(master.rgba.length);
    for(const {image} of layers)for(let p=0;p<pixels.length;p+=4)
        if(image.rgba[p+3])pixels.set(image.rgba.slice(p,p+4),p);
    assert.deepEqual(pixels,master.rgba);
    const painted=layers.find(p=>p.name==='sleeve-underlay').image;
    const covers=layers.filter(p=>p.name==='arm-staff'||p.name==='wrist-cuff');
    for(let p=3;p<painted.rgba.length;p+=4){
        if(!painted.rgba[p])continue;
        assert.ok(covers.some(part=>part.image.rgba[p]),
            `underpaint escaped outside genuine cuff/sleeve at pixel ${(p-3)/4}`);
    }
});

test('gripping hand, wrist cuff and staff travel together while shoulder stays attached',()=>{
    for(let frame=0;frame<16;frame++){
        const p=poses[frame];
        const target=staffPoint(...staffGrip,p);
        assert.deepEqual(transform('staff-hand',...staffGrip,p),target);
        assert.deepEqual(transform('wrist-cuff',...staffGrip,p),target);
        assert.deepEqual(transform('staff',...staffGrip,p),target);
        assert.deepEqual(transform('arm-staff',98,62,p),[98,62],
            `shoulder detached in frame ${frame}`);
    }
    assert.ok(transform('arm-staff',110,68,poses[15])[1]>68,
        'forearm did not articulate toward the planted staff');
});

test('all v017 raster frames remain connected and the source cadence is unapproved',()=>{
    const review=json('review/artifact-report.json');
    const audit=json('review/package-cadence-audit.json');
    const verification=json('verification.json');
    assert.deepEqual(review.flaggedFrames,[]);
    assert.equal(review.frames.length,16);
    assert.ok(review.frames.every(frame=>frame.components.length===1&&frame.binaryAlpha));
    assert.equal(verification.uniqueFrames,16);
    assert.equal(verification.artisticallyApproved,false);
    assert.equal(audit.openRasterLayers,13);
    assert.equal(audit.sourceLayerBytesExact,true);
    assert.equal(audit.gifFrames,16);
    assert.equal(audit.mp4Decode,true);
    assert.equal(audit.sourceIsGameplayFit,false);
});

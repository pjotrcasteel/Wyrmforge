import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
import {project,poses,staffPoint,staffTip,staffGrip,transform} from '../../tools/art/grey-wizard/gothic-north-rebuild.mjs';

const base=new URL('../../art/source/characters/grey-wizard/gothic-north-v016/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,base),'utf8'));
const png=name=>decodePng(readFileSync(new URL(name,base)));

test('north v016 has independent semantic source parts and one continuous embroidered robe',()=>{
    const source=json('project.json');
    assert.equal(source.restRecompositionExact,true);
    assert.equal(source.id,'grey-wizard-fire-north-walk-v016');
    assert.deepEqual(source.layers.map(layer=>layer.name),[
        'shin-left','shin-right','boot-left','boot-right','robe',
        'arm-free','head-hair','hat','arm-staff','staff','staff-hand',
    ]);
    assert.equal(source.occludedLegs,undefined,'reject copied shoe donor geometry');
    assert.equal(source.bleed,0,'reject cross-part edge sampling');
    assert.ok(source.paintedUnderlays.every(part=>part.rows.length>=15));
});

test('every pixel of the native north rest pose recomposes exactly from source parts',()=>{
    const source=json('project.json');
    const master=png('source-master.png');
    const rendered=new Uint8Array(master.rgba.length);
    for(const {file} of source.layers){
        const layer=png(file);
        for(let p=0;p<rendered.length;p+=4){
            if(!layer.rgba[p+3])continue;
            rendered.set(layer.rgba.slice(p,p+4),p);
        }
    }
    assert.deepEqual(rendered,master.rgba);
    // Hidden shins must never become a visible resting-pose skin or lace.
    for(const name of ['shin-left','shin-right']){
        const leg=png(`source-layers/${name}.png`);
        const covering=source.layers.slice(source.layers.findIndex(layer=>layer.name===name)+1)
            .map(layer=>png(layer.file));
        for(let p=3;p<rendered.length;p+=4){
            if(leg.rgba[p])assert.ok(covering.some(layer=>layer.rgba[p]),
                `${name} leather became visible over native hem at pixel ${(p-3)/4}`);
        }
    }
});

test('wood and fire own the moving north shaft; grey robe owns its own edge pixels',()=>{
    const staff=png('source-layers/staff.png');
    const robe=png('source-layers/robe.png');
    const native=png('source-master.png');
    let wood=0,motif=0;
    for(let y=98;y<129;y++)for(let x=0;x<160;x++){
        const p=(y*160+x)*4;
        if(!staff.rgba[p+3])continue;
        wood++;
        assert.ok(staff.rgba[p]-staff.rgba[p+1]>=13&&staff.rgba[p]-staff.rgba[p+2]>=13,
            `non-wood cloth pigment assigned to staff at ${x},${y}`);
    }
    assert.ok(wood>50,'the actual narrow wooden shaft vanished');
    for(let y=69;y<106;y++)for(let x=65;x<94;x++){
        const p=(y*160+x)*4,[r,g,b,a]=native.rgba.slice(p,p+4);
        if(a&&r>50&&r>g*1.25&&r>b*1.4){
            motif++;
            assert.ok(robe.rgba[p+3],`embroidered robe pixel stolen at ${x},${y}`);
        }
    }
    assert.ok(motif>20,'Fire embroidery disappeared from the back view');
});

test('planted staff and left/right boot support have source-root contact',()=>{
    const verification=json('verification.json');
    const contacts=verification.contacts;
    assert.equal(verification.artisticallyApproved,false);
    assert.equal(verification.runtimeIntegrated,false);
    assert.equal(verification.uniqueFrames,16);
    for(const name of ['boot-left','boot-right']){
        const contact=contacts.find(c=>c.name===name);
        assert.ok(contact.maxSpreadNativePixels<=.5,name+' sole drifts');
    }
    const staff=contacts.find(c=>c.name==='staff-tip');
    assert.deepEqual(staff.frames,[8,15]);
    assert.equal(staff.analyticalDrift,0);
    for(let i=8;i<16;i++){
        const tip=staffPoint(...staffTip,poses[i]);
        assert.equal(tip[1]+project.rootPerFrame[1]*i,137);
        assert.deepEqual(transform('staff',...staffGrip,poses[i]),
            transform('staff-hand',...staffGrip,poses[i]));
    }
});

test('repaired north frames are connected source art, not accepted live locomotion',()=>{
    const review=json('review/artifact-report.json');
    const audit=json('review/package-cadence-audit.json');
    assert.deepEqual(review.flaggedFrames,[]);
    assert.equal(review.frames.length,16);
    for(const frame of review.frames){
        assert.equal(frame.components.length,1,`detached pixel island in frame ${frame.frame}`);
        assert.equal(frame.binaryAlpha,true);
    }
    assert.equal(audit.openRasterLayers,11);
    assert.equal(audit.sourceLayerBytesExact,true);
    assert.equal(audit.sourceIsGameplayFit,false);
    assert.equal(audit.gifFrames,16);
});

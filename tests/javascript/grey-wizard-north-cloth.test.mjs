import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng} from '../../tools/art/lib/png.mjs';
import {project,poses,staffGrip,transform} from '../../tools/art/grey-wizard/gothic-north-cloth.mjs';

const base=new URL('../../art/source/characters/grey-wizard/gothic-north-v021/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,base),'utf8'));
const png=name=>decodePng(readFileSync(new URL(name,base)));

test('north v021 reassigns warm-grey staff impostors to the continuous robe',()=>{
    const source=json('project.json');
    const staff=png('source-layers/staff.png');
    const robe=png('source-layers/robe.png');
    assert.equal(source.restRecompositionExact,true);
    assert.equal(source.id,'grey-wizard-fire-north-run-v021');
    assert.equal(source.staffStrictWoodGuard,true);
    assert.equal(source.layers.length,15);
    const count=name=>source.layers.find(p=>p.name===name).pixels;
    assert.equal(count('staff'),371);
    assert.equal(count('staff')+69+1,441,'70 original warm-grey staff owners must be reassigned');
    assert.equal(source.layers.filter(p=>p.name==='robe').length,1);
    assert.equal(count('robe'),3550,'warm-grey robe pigment must be retained');
    for(let y=99;y<142;y++)for(let x=0;x<160;x++){
        const index=(y*160+x)*4;
        if(!staff.rgba[index+3])continue;
        const [r,g,b]=staff.rgba.slice(index,index+3);
        assert.ok((r-g>=20&&r-b>=30)||(r<=100&&r-g>=12&&r-b>=18&&g<=65),
            `non-wood staff pixel at ${x},${y}: ${[r,g,b]}`);
    }
    // Former warm-grey fragments remain opaque garment, not deleted from art.
    for(const [x,y] of [[110,100],[109,103],[111,106],[110,112]]){
        const index=(y*160+x)*4;
        assert.equal(staff.rgba[index+3],0,`robe borrowed by staff at ${x},${y}`);
        assert.equal(robe.rgba[index+3],255,`robe pigment erased at ${x},${y}`);
    }
});

test('correct new wooden shaft is painted only behind existing robe pixels',()=>{
    const source=json('project.json');
    const hidden=png('source-layers/staff-occluded.png');
    const robe=png('source-layers/robe.png');
    let n=0;
    for(let p=3;p<hidden.rgba.length;p+=4)if(hidden.rgba[p]){
        n++;
        assert.equal(robe.rgba[p],255,`hidden shaft leaked over non-robe pixel ${(p-3)/4}`);
    }
    assert.ok(n>=100);
    const order=source.layers.map(p=>p.name);
    assert.ok(order.indexOf('staff-occluded')<order.indexOf('robe'));
    assert.ok(order.indexOf('staff')>order.indexOf('robe'));
});

test('one cloth surface uses destination-owned inverse resampling, preserving the moving grip',()=>{
    assert.ok(project.inversePixelLayers.includes('robe'));
    assert.ok(project.inversePixelLayers.includes('free-arm-underlay'));
    assert.ok(project.inversePixelLayers.includes('staff'));
    assert.equal(poses.length,16);
    assert.equal(poses[15].length,18);
    const source=json('project.json');
    assert.equal(source.bleed,0);
    const verification=json('verification.json');
    assert.equal(verification.idleRasterExact,true);
    assert.equal(verification.sourceLayerRecompositionExact,true);
    assert.equal(verification.artisticallyApproved,false);
    assert.equal(verification.runtimeIntegrated,false);
    for(const i of [0,5,10,15]){
        assert.deepEqual(transform('staff',...staffGrip,poses[i]),
            transform('staff-hand',...staffGrip,poses[i]));
        assert.deepEqual(transform('staff',...staffGrip,poses[i]),
            transform('wrist-cuff',...staffGrip,poses[i]));
    }
});

test('v021 visual exports have no isolated pixel parts and retain game-speed sole support',()=>{
    const verification=json('verification.json');
    const review=json('review/artifact-report.json');
    const audit=json('review/package-cadence-audit.json');
    const grid=json('review/ground-grid-report.json');
    assert.equal(verification.uniqueFrames,16);
    assert.deepEqual(review.flaggedFrames,[]);
    assert.ok(review.frames.every(p=>p.components.length===1&&p.binaryAlpha));
    for(const n of ['boot-left','boot-right']){
        const contact=verification.contacts.find(p=>p.name===n);
        assert.ok(contact.maxSpreadNativePixels<.1,`${n} source ground drift`);
    }
    assert.equal(audit.openRasterLayers,15);
    assert.equal(audit.gifFrames,16);
    assert.equal(audit.gifMilliseconds,500);
    assert.equal(audit.mp4Decode,true);
    assert.equal(audit.cadenceMatchesBaseSpeed,true);
    assert.equal(audit.sourceIsGameplayFit,false);
    assert.equal(grid.gameplayContactApproved,false);
});

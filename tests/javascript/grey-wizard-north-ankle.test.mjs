import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Bitmap} from '../../tools/art/lib/painter.mjs';
import {
    project,poses,transform,paintDynamicShins,staffGrip,
} from '../../tools/art/grey-wizard/gothic-north-ankle.mjs';
import {transform as previousClothTransform} from '../../tools/art/grey-wizard/gothic-north-cloth.mjs';

const base=new URL('../../art/source/characters/grey-wizard/gothic-north-v023/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,base),'utf8'));

test('v023 keeps the real source owner of each anatomy part, including one robe and hidden wood',()=>{
    const source=json('project.json');
    assert.equal(source.id,'grey-wizard-fire-north-run-v023');
    assert.equal(source.restRecompositionExact,true);
    assert.equal(source.staffStrictWoodGuard,true);
    assert.equal(source.layers.length,15);
    assert.equal(source.layers.filter(p=>p.name==='robe').length,1);
    assert.equal(source.layers.find(p=>p.name==='staff').pixels,371);
    assert.equal(source.layers.find(p=>p.name==='staff-occluded').pixels,126);
    assert.equal(source.bleed,0);
    assert.ok(project.inversePixelLayers.includes('robe'));
    assert.ok(project.inversePixelLayers.includes('staff'));
    assert.equal(json('verification.json').idleRasterExact,true);
});

test('trailing robe follows each advancing boot, but its shoulder remains anchored',()=>{
    assert.equal(poses.length,16);
    const left=poses[2],right=poses[10];
    const deltaY=(x,y,p)=>transform('robe',x,y,p)[1]-previousClothTransform('robe',x,y,p)[1];
    assert.ok(deltaY(67,136,left)>5,'left leading hem remains rigid');
    assert.ok(deltaY(96,136,right)>5,'right leading hem remains rigid');
    for(const p of [left,right]){
        assert.ok(Math.abs(deltaY(77,69,p))<.000001,'robe shoulder should not stretch with foot');
    }
    assert.deepEqual(transform('staff',...staffGrip,poses[6]),
        transform('staff-hand',...staffGrip,poses[6]));
    assert.deepEqual(transform('wrist-cuff',...staffGrip,poses[6]),
        transform('staff-hand',...staffGrip,poses[6]));
});

test('jointed cuffs are individually painted from approved trouser shades, never borrowed pixels',()=>{
    const b=new Bitmap(160,160);
    paintDynamicShins(b,poses[2]);
    const allowed=new Set(['60,55,56','73,66,65','103,91,84']);
    let painted=0;
    for(let p=0;p<b.data.length;p+=4)if(b.data[p+3]){
        painted++;
        assert.ok(allowed.has([...b.data.slice(p,p+3)].join(',')),'non-cloth pigment leaked into shin');
    }
    assert.ok(painted>=150,'hidden trouser anatomy missing');
    const idle=new Bitmap(160,160);
    paintDynamicShins(idle,Array(12).fill(0));
    assert.equal(idle.count(),0,'rest source must not acquire painted anatomy');
});

test('v023 supports are analytically planted, media decodes, and live game cutover remains blocked',()=>{
    const verification=json('verification.json'),audit=json('review/package-cadence-audit.json');
    const review=json('review/artifact-report.json'),grid=json('review/ground-grid-report.json');
    for(const n of ['boot-left','boot-right']){
        const c=verification.contacts.find(item=>item.name===n);
        assert.ok(c.maxSpreadNativePixels<.1,n+' planted sole drifts');
    }
    assert.deepEqual(review.flaggedFrames,[]);
    assert.ok(review.frames.every(frame=>frame.components.length===1));
    assert.equal(audit.openRasterLayers,15);
    assert.equal(audit.cadenceMatchesBaseSpeed,true);
    assert.equal(audit.sourceFps,32);
    assert.equal(audit.csharpBaseSpeed,190);
    assert.equal(audit.gifFrames,16);
    assert.equal(audit.mp4Decode,true);
    assert.equal(audit.sourceIsGameplayFit,false);
    assert.equal(grid.gameplayContactApproved,false);
    assert.equal(verification.runtimeIntegrated,false);
    assert.equal(verification.artisticallyApproved,false);
});

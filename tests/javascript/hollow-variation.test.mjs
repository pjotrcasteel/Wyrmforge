import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHollowAppearance}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-variation.js';

test('four actual no-cape source appearances are stable and appear across packs',()=>{
    const seen=new Map();
    const phases=new Set(),idle=new Set(),scales=new Set();
    for(let id=0;id<1024;id++){
        const first=selectHollowAppearance(id);
        assert.deepEqual(first,selectHollowAppearance(id));
        assert.ok(Object.isFrozen(first));
        seen.set(first.signature,(seen.get(first.signature)??0)+1);
        phases.add(first.initialPhase);
        idle.add(first.idleFrame);
        scales.add(first.visualScale);
        if(id%4===0)assert.equal(first.injuryVariant,'broken-leg-left');
        else assert.equal(first.injuryVariant,'standard');
        assert.ok(first.visualScale>=.95&&first.visualScale<=1.05);
    }
    assert.deepEqual([...seen.keys()].sort(),['broken-arm-right','dragged-leg','one-arm-left','standard']);
    assert.ok([...seen.values()].every(n=>n>=140),'each authored silhouette must be visible in real packs');
    assert.equal(phases.size,8);
    assert.deepEqual([...idle].sort((a,b)=>a-b),[0,8]);
    assert.equal(scales.size,5);
});

test('variation cannot invent gameplay properties, forced Injury Lab remains available',()=>{
    for(const id of [0,1,4,7,13,255,1024,2147483650,4294967297,-1,NaN,1.5]){
        const appearance=selectHollowAppearance(id);
        assert.deepEqual(Object.keys(appearance).sort(),[
            'armVariant','idleFrame','initialPhase','injuryVariant','signature','visualScale'].sort());
        assert.equal(typeof appearance.initialPhase,'number');
        assert.ok(appearance.initialPhase>=0&&appearance.initialPhase<1);
    }
    assert.equal(selectHollowAppearance(7,true).injuryVariant,'broken-leg-left');
    assert.equal(selectHollowAppearance(-1).injuryVariant,'standard');
    assert.equal(selectHollowAppearance(NaN).injuryVariant,'standard');
});

test('gait-start diversity does not introduce randomized spawning or time-based drift',()=>{
    const first=Array.from({length:32},(_,id)=>selectHollowAppearance(id));
    assert.ok(new Set(first.map(x=>x.initialPhase)).size>5);
    assert.ok(new Set(first.map(x=>x.armVariant)).size===3);
    assert.deepEqual(first,Array.from({length:32},(_,id)=>selectHollowAppearance(id)));
});

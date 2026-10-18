import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyPixelFrames, enemyWalkLegs, drawEnemyPixelArt, createEnemyMotionState, updateEnemyMotions } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-art.js';

test('four hand-authored enemy archetypes have different shapes, identifiable heads and limbs', () => {
    assert.equal(enemyPixelFrames.length,4);
    assert.equal(new Set(enemyPixelFrames.map(frame=>JSON.stringify(frame))).size,4);
    for(const [id,frame]of enemyPixelFrames.entries()){
        assert.ok(frame.length>=19,`kind ${id}`);
        assert.ok(frame.some(([part])=>part==='head'),`kind ${id}`);
        assert.ok(frame.some(([part])=>part==='eye'),`kind ${id}`);
        assert.ok(frame.every(([,x,y,w,h])=>w>0&&h>0&&x>=-18&&x+w<=18&&y>=-20&&y+h<=24),`kind ${id}`);
    }
});
test('lighting colors a side of the enemy without changing one sprite per actual enemy', () => {
    const oldDocument=globalThis.document;
    let allocations=0;
    try{
        globalThis.document={createElement:()=>{allocations++;return{width:0,height:0,getContext:()=>({
            fillRect(){},fillStyle:'#fff',
        })}}};
        const calls=[];
        const ctx={save(){},restore(){},drawImage(...args){calls.push(['image',...args])},
            fillRect(...args){calls.push(['light',...args])}};
        const enemy={x:100,y:100,kind:0,radius:12,healthRatio:1};
        drawEnemyPixelArt(ctx,enemy);
        const basicCount=calls.length;
        assert.equal(basicCount,1);
        drawEnemyPixelArt(ctx,enemy,{intensity:.65,color:[255,160,91],sourceX:70});
        assert.equal(calls.filter(([name])=>name==='image').length,2);
        assert.equal(calls.filter(([name])=>name==='light').length,2);
        drawEnemyPixelArt(ctx,enemy);
        assert.equal(allocations,1,'sprite asset is cached across combat frames');
    } finally {
        globalThis.document=oldDocument;
    }
});

test('actual stable enemy identity animates only when the corresponding C# actor has moved', () => {
    const state=createEnemyMotionState();
    const baseline=[{entityId:101,x:15,y:20,kind:0},{entityId:102,x:39,y:21,kind:3}];
    let poses=updateEnemyMotions(state,baseline,2);
    assert.equal(poses.get(101),0);
    assert.equal(poses.get(102),0);
    poses=updateEnemyMotions(state,[{...baseline[0],x:23},baseline[1]],2.03);
    assert.ok(poses.get(101)>0,'Moving enemies visibly advance their feet.');
    assert.equal(poses.get(102),0,'A stationary enemy never walks just because time advances.');
    assert.equal(updateEnemyMotions(state,[{...baseline[0],x:23},baseline[1]],2.3).get(101),0);
    assert.equal(updateEnemyMotions(state,[{...baseline[0],x:30},baseline[1]],2.31,true).get(101),0,
        'Reduced-motion accessibility suppresses foot-cycle changes.');
    updateEnemyMotions(state,[baseline[1]],2.5);
    assert.equal(state.entities.has(101),false,'Dead enemies release gait history immediately.');
    assert.equal(state.entities.size,1);
});

test('each walking variant has separately authored lower-body pixel art, with no extra combat actor', () => {
    for (const [kind,frames] of enemyWalkLegs.entries()) {
        assert.equal(frames.length,2);
        assert.notDeepEqual(frames[0],frames[1],`kind ${kind}`);
        assert.ok(frames.every(frame=>frame.length>=6));
        assert.ok(frames.flat().every(([,x,y,w,h])=>x>=-18&&x+w<=18&&y>=-20&&y+h<=24));
    }
    const original=globalThis.document;
    try {
        let frames=0;
        globalThis.document={createElement:()=>({width:36,height:44,getContext:()=>({fillRect(){frames++;}})})};
        const ctx={save(){},restore(){},drawImage(){draws++;}};
        let draws=0;
        drawEnemyPixelArt(ctx,{x:10,y:10,radius:12,kind:3},null,1);
        drawEnemyPixelArt(ctx,{x:10,y:10,radius:12,kind:3},null,2);
        assert.equal(draws,2);
        assert.ok(frames>25);
    } finally { globalThis.document=original; }
});

test('mire hounds step on a contact beat and never animate when standing still', () => {
    const state=createEnemyMotionState();
    const hound={entityId:221,x:0,y:0,kind:1};
    assert.equal(updateEnemyMotions(state,[hound],0).get(221),0);
    assert.equal(updateEnemyMotions(state,[{...hound,x:5}],.05).get(221),0,
        'The second pose is a planted contact, not a teleporting paw.');
    assert.equal(updateEnemyMotions(state,[{...hound,x:9}],.09).get(221),2,
        'The opposite diagonal should take the next stride.');
    assert.equal(updateEnemyMotions(state,[{...hound,x:9}],.4).get(221),0,
        'Standing hounds return to the grounded pose.');
    assert.equal(updateEnemyMotions(state,[{...hound,x:12}],.41,true).get(221),0,
        'Accessibility settings suppress motion changes.');
});

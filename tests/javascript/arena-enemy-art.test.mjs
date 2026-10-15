import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyPixelFrames, drawEnemyPixelArt } from
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

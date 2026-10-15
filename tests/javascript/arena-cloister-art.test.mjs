import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloisterPlan, drawCloisterFloor, drawCloisterWall, drawCloisterMist } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-cloister-art.js';
import { createTerrainPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const walls=[
    {x:0,y:.325,width:.35,height:.018,open:false,kind:'ruin'},
    {x:.35,y:.325,width:.30,height:.018,open:false,kind:'gate'},
    {x:.65,y:.325,width:.35,height:.018,open:false,kind:'ruin'},
    {x:0,y:.685,width:.35,height:.018,open:false,kind:'ruin'},
    {x:.35,y:.685,width:.30,height:.018,open:false,kind:'gate'},
    {x:.65,y:.685,width:.35,height:.018,open:false,kind:'ruin'},
];
const scene={seed:45113,district:'sanctuary',biome:'River valley',element:'fire',stage:3,barriers:walls};
function fakeContext(){
    const rectangles=[];
    const ctx={rectangles};
    for(const name of ['save','restore','beginPath','fill','stroke','moveTo','lineTo'])
        ctx[name]=()=>{};
    ctx.fillRect=(...args)=>rectangles.push({args,color:ctx.fillStyle,alpha:ctx.globalAlpha});
    return ctx;
}

test('courtyard derives its chapter-house boundaries from canonical C# crossings', () => {
    const a=createCloisterPlan(scene,900,1500);
    const b=createCloisterPlan(scene,900,1500);
    assert.deepEqual(a,b);
    assert.ok(a.north>a.height*.32);
    assert.ok(a.south>a.height*.68);
    assert.ok(a.court.y>a.north);
    assert.ok(a.court.y+a.court.h<a.south);
    assert.equal(a.slabs.length,52);
    assert.equal(a.grass.length,20);
    const moved=createCloisterPlan({...scene,seed:45114},900,1500);
    assert.notDeepEqual(a.slabs,moved.slabs);
    assert.equal(a.court.x,moved.court.x);
    assert.equal(a.court.w,moved.court.w);
    const fallback=createCloisterPlan({...scene,barriers:[]},900,1500);
    assert.ok(fallback.court.h>0);
    assert.equal(createCloisterPlan({...scene,district:'causeway'},900,1500),null);
    assert.equal(createCloisterPlan({...scene,biome:'Ashen caldera'},900,1500),null);
});

test('original monastery changes only a valley sanctuary and is cached in the world plan', () => {
    const plan=createTerrainPlan(scene,900,1500);
    assert.ok(plan.story.cloister);
    assert.equal(plan.story.cloister.north,createCloisterPlan(scene,900,1500).north);
    assert.equal(createTerrainPlan({...scene,district:'rift'},900,1500).story.cloister,null);
    const floor=fakeContext();
    assert.equal(drawCloisterFloor(floor,plan.story.cloister),true);
    assert.ok(floor.rectangles.length>=70);
    const mist=fakeContext();
    drawCloisterMist(mist,plan.story.cloister,1,true);
    assert.equal(mist.rectangles.length,3);
    assert.deepEqual(mist.rectangles,fakeMist(plan.story.cloister,500));
});
function fakeMist(plan,seconds){
    const ctx=fakeContext();drawCloisterMist(ctx,plan,seconds,true);return ctx.rectangles;
}

test('visual masonry follows actual hitbox dimensions and opens only with canonical gate state', () => {
    const closed=fakeContext();
    const b=walls[1];
    assert.equal(drawCloisterWall(closed,b,900,1500),true);
    assert.ok(closed.rectangles.some(item => item.args[0]===b.x*900 &&
        item.args[1]===b.y*1500 && item.args[2]===b.width*900 && item.args[3]===b.height*1500));
    const open=fakeContext();
    drawCloisterWall(open,{...b,open:true},900,1500);
    assert.ok(open.rectangles.length<closed.rectangles.length);
    assert.equal(drawCloisterWall(open,null,900,1500),false);
    assert.equal(drawCloisterWall(open,{...b,width:0},900,1500),false);
});

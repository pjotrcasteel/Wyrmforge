import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloisterPlan, drawCloisterFloor, drawCloisterWall, drawCloisterMist, drawCloisterReflections,
    createCloisterElevationLayers, drawCloisterElevation, sortSceneDepthLayers } from
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
    assert.equal(plan.remains.length, 0, 'The cloister must not inherit random spire-like monoliths.');
    assert.equal(createTerrainPlan({...scene,district:'causeway'},900,1500).remains.length,10);
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

test('water only reflects real nearby spell lights, with no autonomous glow in the monastery', () => {
    const plan=createCloisterPlan(scene,900,1500),c=plan.court;
    const water={x:c.x+c.w*.5,y:c.y+c.h*.6};
    const ctx=fakeContext();
    ctx.rect=()=>{};ctx.clip=()=>{};
    assert.equal(drawCloisterReflections(ctx,plan,[],.25),0);
    assert.equal(drawCloisterReflections(ctx,plan,[{
        x:water.x+300,y:water.y+300,radius:50,strength:1,center:[255,170,92],
    }],.25),0);
    assert.equal(ctx.rectangles.length,0);
    const fire={x:water.x,y:water.y,radius:100,strength:.9,center:[255,170,92]};
    assert.equal(drawCloisterReflections(ctx,plan,[fire],.25,true),3);
    assert.equal(ctx.rectangles.length,3);
    assert.ok(ctx.rectangles.every(item=>item.color.includes('255,170,92')));
    const before=ctx.rectangles.map(row=>row.args);
    const stable=fakeContext();stable.rect=()=>{};stable.clip=()=>{};
    drawCloisterReflections(stable,plan,[fire],900,true);
    assert.deepEqual(stable.rectangles.map(row=>row.args),before,
        'Reduced motion uses the same grounded water reflections without drifting.');
    const noPlan=fakeContext();
    assert.equal(drawCloisterReflections(noPlan,null,[fire],.25),0);
});

test('only actual closed monastery hitboxes receive perspective elevations, with no phantom spires', () => {
    const plan = createCloisterPlan(scene, 900, 1500);
    const layers = createCloisterElevationLayers(plan, walls, 900, 1500);
    assert.equal(layers.length, walls.length);
    assert.ok(layers.every(item => item.kind === 'masonry'));
    assert.ok(layers.every(item => item.depth === (item.barrier.y + item.barrier.height) * 1500));
    assert.equal(createCloisterElevationLayers(null, walls, 900, 1500).length, 0);
    const open = createCloisterElevationLayers(plan, walls.map((b, i) => i === 1 ? {...b, open: true} : b), 900, 1500);
    assert.equal(open.length, walls.length - 1, 'Unsealed gate loses its raised obstruction immediately.');
    const ctx = fakeContext();
    ctx.closePath = () => {};
    assert.equal(drawCloisterElevation(ctx, walls[0], 900, 1500), true);
    assert.ok(ctx.rectangles.some(rect => rect.args[1] < walls[0].y * 1500 &&
        rect.args[3] >= 12), 'Raised wall facade must extend upward from the actual footprint.');
    const missing = fakeContext();
    assert.equal(drawCloisterElevation(missing, {...walls[1],open:true}, 900, 1500), false);
    assert.equal(missing.rectangles.length, 0);
});

test('character feet cross in front of and behind world-space wall elevations', () => {
    const wall = createCloisterElevationLayers(createCloisterPlan(scene,900,1500),[walls[0]],900,1500)[0];
    const north = {kind:'mage',depth:wall.depth-40};
    const south = {kind:'enemy',depth:wall.depth+40};
    assert.deepEqual(sortSceneDepthLayers([south,wall,north]),[north,wall,south]);
    assert.deepEqual(sortSceneDepthLayers([wall,{kind:'mage',depth:wall.depth}]),
        [{kind:'mage',depth:wall.depth},wall], 'At the wall foot, facade wins the depth tie.');
});

test('closed monastery crossing is a restrained ward, not a full-width prison grille', () => {
    const ctx = fakeContext();
    ctx.closePath = () => {};
    assert.equal(drawCloisterElevation(ctx, walls[1], 900, 1500), true);
    const fullHeightSlats = ctx.rectangles.filter(row => row.args[2] <= 3 && row.args[3] >= 16);
    assert.equal(fullHeightSlats.length, 0, 'There must be no repeated long iron bars in the cloister.');
    assert.ok(ctx.rectangles.some(row => String(row.color).includes('78, 134, 105')),
        'The closed crossing has a subtle transparent seal between its masonry ends.');
});

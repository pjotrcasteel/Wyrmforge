import test from 'node:test';
import assert from 'node:assert/strict';
import { Bitmap } from '../../tools/art/lib/painter.mjs';
import { createWorldMasonryWindow, createWorldBoundaryWindow, worldBoundaryMask,
    worldLightingMaps, cutWorldInto32, WORLD_VARIATION_VERSION } from '../../tools/art/prototypes/terrain-world-variation.mjs';

const options = {seed:1781,state:'collapsed',originY:0,height:256,width:512};
const sample = (field,x,y) => {
    const i=y*field.width+x;
    return {color:field.albedo.get(x,y),id:field.stoneIds[i],height:field.heights[i],rough:field.roughness[i]};
};

for(const type of ['flagstone','cobble','brick']) {
    test(`${type}: absolute world coordinates produce identical overlapping windows without 256px stamps`, () => {
        const a=createWorldMasonryWindow(type,{...options,originX:0});
        const b=createWorldMasonryWindow(type,{...options,originX:256});
        let nonempty=0;
        for(let y=0;y<256;y+=7)for(let x=0;x<256;x+=5) {
            const atA=sample(a,x+256,y),atB=sample(b,x,y);
            assert.deepEqual(atA,atB,`world (${x+256},${y}) differs between chunks`);
            if(atA.id)nonempty++;
        }
        assert.ok(nonempty>20,'world field must contain continuous stones');
        // Repeating the old 256px field must not yield identical albedo/stone shapes.
        let different=0;
        for(let y=0;y<256;y+=9)for(let x=0;x<256;x+=9)
            if(a.stoneIds[y*a.width+x]!==a.stoneIds[y*a.width+x+256])different++;
        assert.ok(different>250,`${type} still has a repeated 256px stone pattern`);
        assert.deepEqual(a.albedo.data,
            createWorldMasonryWindow(type,{...options,originX:0}).albedo.data);
    });
}

test('generic boundary roles include four sides plus four inner and outer corners', () => {
    assert.equal(WORLD_VARIATION_VERSION,'wf32-world-variation.v1');
    const base={width:256,height:256,originX:0,originY:0,boundaryX:128,boundaryY:128,seed:1};
    for(const corner of ['nw','ne','sw','se']) {
        const outer=worldBoundaryMask({...base,type:`outer-${corner}`});
        const inner=worldBoundaryMask({...base,type:`inner-${corner}`});
        assert.ok(outer.some(Boolean));
        assert.ok(inner.some(Boolean));
        for(let i=0;i<outer.length;i++)if(outer[i])assert.equal(inner[i],1);
        assert.ok(inner.reduce((n,v)=>n+v,0)>outer.reduce((n,v)=>n+v,0));
    }
    for(const side of ['left','right','top','bottom'])assert.ok(worldBoundaryMask({...base,type:side}).some(Boolean));
    assert.throws(()=>worldBoundaryMask({...base,type:'unknown'}),RangeError);
});

test('whole-stone hard-to-soft erosion respects the same world-space inner-corner mask', () => {
    const options={type:'flagstone',soft:'grass',seed:1781,state:'reclaimed',width:256,height:256,
        originX:0,originY:0,role:'inner-nw',boundaryX:128,boundaryY:128};
    const result=createWorldBoundaryWindow(options.type,options.soft,options);
    const source=createWorldMasonryWindow('flagstone',{seed:1781,state:'reclaimed',width:256,height:256});
    const mask=worldBoundaryMask({...options,type:options.role});
    const present=new Set(result.stoneIds.filter(id=>id>0));
    const eliminated=new Set();
    for(let i=0;i<source.stoneIds.length;i++)if(!mask[i]&&source.stoneIds[i])
        eliminated.add(source.stoneIds[i]);
    for(const id of eliminated)assert.ok(!present.has(id),`stone ${id} clipped at boundary`);
    assert.ok(present.size>4);
    assert.ok(eliminated.size>4);
});

test('same absolute corner preview stitches without seams across 32px source cells', () => {
    const output=createWorldBoundaryWindow('cobble','soil',{
        seed:713,state:'broken',width:256,height:256,role:'outer-se',boundaryX:128,boundaryY:128});
    const maps=worldLightingMaps(output);
    for(const layer of [maps.albedo,maps.normal,maps.roughnessMap]) {
        const assembled=new Bitmap(256,256);
        for(const {col,row,tile} of cutWorldInto32(layer))assembled.blit(tile,col*32,row*32);
        assert.deepEqual(assembled.data,layer.data);
    }
    assert.ok(maps.roughnessMap.data.every((value,index)=>index%4!==3||value===255));
});

test('world extent contract rejects misaligned cells or unknown material families', () => {
    assert.throws(()=>createWorldMasonryWindow('pavement'),RangeError);
    assert.throws(()=>createWorldMasonryWindow('brick',{width:111}),RangeError);
    assert.throws(()=>createWorldMasonryWindow('brick',{state:'fictional'}),RangeError);
    assert.throws(()=>createWorldBoundaryWindow('brick','cobble',{}),RangeError);
});

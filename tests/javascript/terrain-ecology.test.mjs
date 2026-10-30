import test from 'node:test';
import assert from 'node:assert/strict';
import { Bitmap } from '../../tools/art/lib/painter.mjs';
import { createWorldBoundaryWindow, cutWorldInto32 } from '../../tools/art/prototypes/terrain-world-variation.mjs';
import { createEcologyReviewWindow, worldLightingMaps, ECOLOGY_DETAILS, ECOLOGY_COMPATIBILITY,
    ECOLOGY_GRID, ECOLOGY_VERSION, decorateEcologyField } from '../../tools/art/prototypes/terrain-ecology.mjs';

const base = {seed:771, state:'reclaimed', role:'inner-nw', boundaryX:128, boundaryY:128, width:256, height:256};
const context = {moisture:.85, shelter:.88, wear:.46, density:1};
for (const type of ['flagstone','cobble','brick']) {
    test(`${type}: deterministic context-aware decals preserve original whole-stone IDs`, () => {
        const p=createEcologyReviewWindow(type,'grass',{...base,context});
        const same=createEcologyReviewWindow(type,'grass',{...base,context});
        const source=createWorldBoundaryWindow(type,'grass',base);
        assert.equal(p.ecologyVersion,ECOLOGY_VERSION);
        assert.deepEqual(p.albedo.data,same.albedo.data);
        assert.deepEqual(p.detailPlacements,same.detailPlacements);
        assert.deepEqual(p.stoneIds,source.stoneIds);
        assert.ok(p.detailPlacements.length>1 && p.detailPlacements.length<80);
        for(const d of p.detailPlacements)assert.ok(ECOLOGY_COMPATIBILITY[d.material].includes(d.kind));
    });
}
test('ecological detail positions and pixels align across overlapping world windows', () => {
    const a=createEcologyReviewWindow('flagstone','soil',{...base,role:'left',originX:0,width:384,context});
    const b=createEcologyReviewWindow('flagstone','soil',{...base,role:'left',originX:128,width:384,context});
    for(let y=0;y<256;y+=3) for(let x=0;x<256;x+=3) {
        assert.deepEqual(a.albedo.get(x+128,y),b.albedo.get(x,y),`world ${x+128},${y}`);
        assert.equal(a.heights[y*a.width+x+128],b.heights[y*b.width+x]);
        assert.equal(a.roughness[y*a.width+x+128],b.roughness[y*b.width+x]);
    }
});
test('details never obscure approved boundary transition pixels or alter source geometry', () => {
    const material=createWorldBoundaryWindow('cobble','mud',base);
    const result=decorateEcologyField(material,{seed:771,soft:'mud',context});
    assert.deepEqual(result.stoneIds,material.stoneIds);
    let changed=0,good=0;
    for(let y=10;y<material.height-10;y++)for(let x=10;x<material.width-10;x++) {
        const i=y*material.width+x;
        if(material.albedo.get(x,y).join()===result.albedo.get(x,y).join())continue;
        changed++;
        const id=Boolean(material.stoneIds[i]);
        if([[9,0],[-9,0],[0,9],[0,-9]].some(([dx,dy])=>
            Boolean(material.stoneIds[(y+dy)*material.width+x+dx])!==id))good++;
    }
    assert.ok(changed>0);
    assert.equal(good,0,'decorations should not cover approved blending boundary');
});
test('compatible environmental detail selection respects dry/open and damp/sheltered conditions', () => {
    const dry={moisture:0,shelter:0,wear:.9,density:1};
    const wet={moisture:1,shelter:1,wear:.4,density:1};
    const a=createEcologyReviewWindow('flagstone','grass',{...base,context:dry});
    const b=createEcologyReviewWindow('flagstone','grass',{...base,context:wet});
    assert.ok(a.detailPlacements.every(d=>d.kind!=='mushroom'&&d.kind!=='moss'));
    assert.ok(b.detailPlacements.length>0);
    assert.notDeepEqual(a.albedo.data,b.albedo.data);
    assert.ok(Object.keys(ECOLOGY_DETAILS).length>=7);
    assert.equal(ECOLOGY_GRID,20);
    assert.throws(()=>createEcologyReviewWindow('flagstone','grass',{...base,context:{moisture:2}}),RangeError);
});
test('albedo, normal and roughness tile exports are 32px exact; wetness does not add an emissive map', () => {
    const field=createEcologyReviewWindow('cobble','grass',{...base,context});
    const maps=worldLightingMaps(field);
    for(const tex of [maps.albedo,maps.normal,maps.roughnessMap]){
        const rebuilt=new Bitmap(field.width,field.height);
        for(const {col,row,tile} of cutWorldInto32(tex))rebuilt.blit(tile,col*32,row*32);
        assert.deepEqual(rebuilt.data,tex.data);
    }
    assert.equal('emissiveMap' in maps,false);
});

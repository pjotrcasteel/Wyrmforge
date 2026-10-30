import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMasonryField } from '../../tools/art/prototypes/wet-forest-masonry.mjs';
import { createTerrainGrammarReview } from '../../tools/art/prototypes/build-terrain-grammar-review.mjs';
import { TERRAIN_MATERIALS, boundaryKind, makeBoundaryMask, classifyStoneInstances,
    makeSoftField, blendWorldPatch, buildLightingMaps, cutReviewInto32, createBoundaryReview,
    addMicroDetails, checkDetailAllowed, materialDescriptor, GRAMMAR_VERSION } from '../../tools/art/prototypes/terrain-material-grammar.mjs';
import { Bitmap } from '../../tools/art/lib/painter.mjs';

test('generic material grammar maps classes to boundary rules and reusable details', () => {
    assert.deepEqual(Object.keys(TERRAIN_MATERIALS), ['grass','soil','mud','flagstone','cobble','brick']);
    assert.equal(boundaryKind('grass','soil'),'soft-mingle');
    assert.equal(boundaryKind('flagstone','grass'),'whole-stone-erosion');
    assert.equal(boundaryKind('soil','cobble'),'whole-stone-erosion');
    assert.equal(boundaryKind('brick','flagstone'),'structural-junction');
    assert.equal(checkDetailAllowed('grass','mushroom'),true);
    assert.equal(checkDetailAllowed('mud','mushroom'),false);
    assert.throws(()=>boundaryKind('nope','grass'),RangeError);
    assert.throws(()=>boundaryKind('soil','soil'),RangeError);
});

test('whole-stone erosion never leaves half-stones at soft-boundary intersections', () => {
    const stone=createMasonryField('flagstone',143),soil=makeSoftField('soil',143);
    const topology=classifyStoneInstances(stone),mask=makeBoundaryMask('left',143);
    const result=blendWorldPatch(stone,soil,mask,{policy:'whole-stone-erosion',stoneInstances:topology});
    let removed=0,retained=0;
    for(const component of topology.components){
        if(component.size < 3)continue;
        const keep=Boolean(result.keptStones[component.id]);
        assert.equal(component.points.every(i=>mask[i]===1),keep);
        for(const i of component.points){
            const x=i%256,y=Math.floor(i/256);
            const expected=keep?stone.get(x,y):soil.get(x,y);
            assert.deepEqual(result.albedo.get(x,y),expected);
        }
        if(keep)retained++;else removed++;
    }
    assert.ok(removed>0&&retained>0);
});

test('all four edges and outer corners have directional masks without 32px-local resets',()=>{
    const dirs=['left','right','top','bottom','northwest','northeast','southwest','southeast'];
    for(const direction of dirs){
        const mask=makeBoundaryMask(direction,773);
        assert.equal(mask.length,65536);
        assert.ok(mask.some(x=>x===1));assert.ok(mask.some(x=>x===0));
        assert.deepEqual(mask,makeBoundaryMask(direction,773));
    }
    assert.notDeepEqual(makeBoundaryMask('left',773),makeBoundaryMask('right',773));
    assert.throws(()=>makeBoundaryMask('diagonal'),RangeError);
});

test('32px phases reassemble the same 256px authored image including G maps',()=>{
    const review=createBoundaryReview({primary:'cobble',secondary:'soil',direction:'left',seed:197});
    const maps=buildLightingMaps(review);
    for(const source of [maps.albedo,maps.normal,maps.roughnessMap,maps.specularGuide]) {
        const parts=cutReviewInto32(source),board=new Bitmap(256,256);
        for(const part of parts)board.blit(part.tile,part.col*32,part.row*32);
        assert.deepEqual(board.data,source.data);
    }
    const n=maps.normal.get(40,40);
    assert.ok(n[2]>160,'normal should face positive tangent-space Z');
    assert.ok(maps.roughnessMap.data.every((v,i)=>i%4===3||v>=0));
    assert.equal(maps.roughnessMap.get(100,100)[0],maps.roughnessMap.get(100,100)[1]);
});

test('maps reuse G albedo/normal/roughness contract; specular remains scalar',()=>{
    const d=materialDescriptor('mud',{albedo:'a',normal:'n',roughnessMap:'r'});
    assert.deepEqual([d.albedo,d.normal,d.roughnessMap],['a','n','r']);
    assert.ok(d.specular>0&&d.specular<1);
    assert.equal('specularMap' in d,false);
    assert.equal(d.emissionIntensity,0);
    assert.equal(d.normalScale,.7);
    assert.notDeepEqual(addMicroDetails(makeSoftField('grass',6),'grass',8,1).data,
        makeSoftField('grass',6).data);
});

test('review output is reproducible and documents all incomplete approval gates',()=>{
    const dir=mkdtempSync(join(tmpdir(),'wf32-grammar-'));
    try{
        const first=createTerrainGrammarReview(dir);
        assert.equal(first.version,GRAMMAR_VERSION);
        assert.equal(first.samples.length,4);
        assert.equal(first.approvals.art,false);
        const snap=readFileSync(join(dir,'flagstone-grass-normal.png'));
        assert.deepEqual([...snap.subarray(0,8)],[137,80,78,71,13,10,26,10]);
        createTerrainGrammarReview(dir);
        assert.deepEqual(snap,readFileSync(join(dir,'flagstone-grass-normal.png')));
        assert.equal(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')).status,'source-only, not in live Hunt');
    } finally{rmSync(dir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorldBoundaryWindow } from '../../tools/art/prototypes/terrain-world-variation.mjs';
import { ECOLOGY_PROP_DEFINITIONS, proposeEcologyProps } from '../../tools/art/prototypes/terrain-ecology-props.mjs';
import { ECOLOGY_25D_VERSION, PROP_LAYER_ORDER, PIXELS_PER_WORLD_UNIT,
    makeEcology25DProp, buildEcology25DAtlases, ecology25DSceneCandidates }
    from '../../tools/art/prototypes/terrain-ecology-props-25d.mjs';

const types = Object.keys(ECOLOGY_PROP_DEFINITIONS);

test('2.5D volume source has genuine ground, rear and front sprite regions', () => {
    assert.equal(ECOLOGY_25D_VERSION, 'wf32-ecology-props-2p5d.v1');
    assert.deepEqual(PROP_LAYER_ORDER,['footprint','rear','front']);
    for(const type of types)for(let v=0;v<3;v++){
        const p=makeEcology25DProp(type,v),spec=ECOLOGY_PROP_DEFINITIONS[type];
        assert.deepEqual(p.anchor,spec.anchor);
        assert.ok(p.geometry.worldHeight>0 && p.geometry.groundRadius>0);
        assert.equal(p.geometry.groundRadiusPixels,spec.groundRadius);
        assert.equal(p.geometry.worldHeight,p.geometry.projectedHeightPixels/PIXELS_PER_WORLD_UNIT);
        assert.ok(p.geometry.layers[0].depth<p.geometry.layers[1].depth);
        assert.ok(p.geometry.layers[1].depth<p.geometry.layers[2].depth);
        for(const layer of PROP_LAYER_ORDER){
            const ch=p.layers[layer];
            assert.equal(ch.albedo.width,spec.size[0]);
            assert.equal(ch.albedo.height,spec.size[1]);
            const alpha=ch.albedo.data.filter((_,i)=>i%4===3).reduce((s,v)=>s+(v!==0),0);
            assert.ok(alpha>5,`${type} ${v} ${layer} empty`);
            for(let i=3;i<ch.albedo.data.length;i+=4){
                assert.equal(ch.albedo.data[i],ch.normal.data[i]);
                assert.equal(ch.albedo.data[i],ch.roughnessMap.data[i]);
                if(layer==='footprint') assert.equal(ch.shadowAlpha.data[i],0);
                else if(ch.shadowAlpha.data[i])assert.equal(ch.albedo.data[i],255);
            }
        }
    }
});

test('rocks have separate upper visible planes and nonzero front face depth',()=>{
    for(const type of ['rock-small','rock-cluster'])for(let v=0;v<3;v++){
        const p=makeEcology25DProp(type,v);
        let top=0,front=0,normalDifferent=0;
        for(let y=0;y<p.layers.rear.albedo.height;y++)for(let x=0;x<p.layers.rear.albedo.width;x++){
            if(p.layers.rear.albedo.alpha(x,y)) top++;
            if(p.layers.front.albedo.alpha(x,y)) front++;
            if(p.layers.front.albedo.alpha(x,y)&&
                p.layers.front.normal.get(x,y)[1]!==p.layers.rear.normal.get(x,y)[1])normalDifferent++;
        }
        assert.ok(top>25 && front>17 && normalDifferent>15,`${type} lacks projected volume`);
    }
});

test('grass presents both rear and foreground occluding blades while remaining nonblocking',()=>{
    for(const type of ['grass-medium','grass-tall'])for(let v=0;v<3;v++){
        const p=makeEcology25DProp(type,v);
        const rear=p.layers.rear.albedo,front=p.layers.front.albedo;
        assert.ok(rear.data.some((n,i)=>i%4===3&&n===255));
        assert.ok(front.data.some((n,i)=>i%4===3&&n===255));
        assert.equal(ECOLOGY_PROP_DEFINITIONS[type].collision,'none');
    }
    assert.ok(makeEcology25DProp('grass-tall').geometry.worldHeight>
        makeEcology25DProp('grass-medium').geometry.worldHeight);
});

test('all 12 2.5D sprite variants have frame-aligned albedo/normal/roughness/caster atlases',()=>{
    const atlases=buildEcology25DAtlases();
    for(const layer of PROP_LAYER_ORDER){
        const ref=atlases[layer].albedo.frames;
        assert.equal(Object.keys(ref).length,12);
        for(const channel of ['normal','roughnessMap','shadowAlpha'])
            assert.deepEqual(ref,atlases[layer][channel].frames);
    }
});

test('world candidates preserve approved P1i blending, deterministic placement and C# collision authority',()=>{
    const field=createWorldBoundaryWindow('flagstone','grass',{
        seed:2211,state:'reclaimed',role:'left',boundaryX:144,boundaryY:128,
        originX:0,originY:0,width:384,height:256
    });
    const before=field.albedo.data.slice(),ids=field.stoneIds.slice(),heights=field.heights.slice();
    const opts={seed:2211,soft:'grass',context:{moisture:.79,wear:.62,density:1}};
    const proposals=proposeEcologyProps(field,opts);
    const p=ecology25DSceneCandidates(field,opts);
    assert.ok(p.length>1);
    assert.deepEqual(p.map(x=>x.id),proposals.map(x=>x.id));
    assert.deepEqual(ecology25DSceneCandidates(field,opts),p);
    assert.ok(p.every(x=>x.scene.visualOnly && x.scene.receivesLight));
    assert.ok(p.every(x=>x.scene.alphaOcclusion));
    assert.ok(p.filter(x=>x.kind.startsWith('grass')).every(x=>x.scene.collision==='nonblocking'));
    assert.deepEqual(field.albedo.data,before);
    assert.deepEqual(field.stoneIds,ids);
    assert.deepEqual(field.heights,heights);
});

test('no new collision/physics/GPU engine and retains shared authoring contracts',()=>{
    const path=new URL('../../tools/art/prototypes/terrain-ecology-props-25d.mjs',import.meta.url);
    const source=readFileSync(path,'utf8');
    assert.ok(!/new (?:PhysicsWorld|RigidBody|LightingEngine)/.test(source));
    assert.match(source,/shared G|shared LitSprite/i);
    assert.ok(types.length===4);
    assert.throws(()=>makeEcology25DProp('unknown'),RangeError);
    assert.throws(()=>makeEcology25DProp('grass-tall',7),RangeError);
});
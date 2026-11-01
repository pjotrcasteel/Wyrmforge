import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldBoundaryWindow } from '../../tools/art/prototypes/terrain-world-variation.mjs';
import { ECOLOGY_PROP_DEFINITIONS, ECOLOGY_PROP_VERSION, PROP_GRID, PROP_EDGE_GUARD,
    makeEcologyPropSprite, buildEcologyPropAtlases, proposeEcologyProps, ecologyPropMaterialDescriptors }
    from '../../tools/art/prototypes/terrain-ecology-props.mjs';

const field=(originX=0,width=384)=>createWorldBoundaryWindow('flagstone','grass',{
    seed:2201,state:'reclaimed',role:'left',boundaryX:144,boundaryY:128,
    originX,originY:0,width,height:256
});
const config={seed:2201,soft:'grass',context:{moisture:.85,wear:.75,density:1}};

test('original ecology props are separate native pixel sprites with foot anchors',()=>{
    assert.equal(ECOLOGY_PROP_VERSION,'wf32-ecology-props.v1');
    assert.equal(PROP_GRID,56);
    assert.equal(PROP_EDGE_GUARD,12);
    assert.deepEqual(Object.keys(ECOLOGY_PROP_DEFINITIONS),
        ['rock-small','rock-cluster','grass-medium','grass-tall']);
    for(const [kind,spec] of Object.entries(ECOLOGY_PROP_DEFINITIONS)){
        for(let variant=0;variant<3;variant++){
            const s=makeEcologyPropSprite(kind,variant);
            assert.equal(s.albedo.width,spec.size[0]);
            assert.equal(s.albedo.height,spec.size[1]);
            assert.deepEqual(s.anchor,spec.anchor);
            assert.deepEqual(s.albedo.data,makeEcologyPropSprite(kind,variant).albedo.data);
            let count=0;
            for(let y=0;y<s.albedo.height;y++)for(let x=0;x<s.albedo.width;x++){
                const a=s.albedo.alpha(x,y);
                assert.equal(a,s.normal.alpha(x,y));
                assert.equal(a,s.roughnessMap.alpha(x,y));
                if(a)count++;
            }
            assert.ok(count>20&&count<s.albedo.width*s.albedo.height*.8);
        }
    }
});

test('albedo normal and roughness atlases share footprints and frame coordinates',()=>{
    const atlases=buildEcologyPropAtlases();
    const frames=atlases.albedo.frames;
    assert.equal(Object.keys(frames).length,12);
    assert.deepEqual(frames,atlases.normal.frames);
    assert.deepEqual(frames,atlases.roughnessMap.frames);
    for(const [name,frame] of Object.entries(frames)){
        const kind=name.split('.').slice(1,-1).join('.');
        const spec=ECOLOGY_PROP_DEFINITIONS[kind];
        assert.equal(frame.w,spec.size[0]);
        assert.equal(frame.h,spec.size[1]);
        assert.equal(frame.ax,spec.anchor[0]);
        assert.equal(frame.ay,spec.anchor[1]);
    }
});

test('world-space prop placement is deterministic and consistent between windows',()=>{
    const a=proposeEcologyProps(field(),config);
    assert.deepEqual(a,proposeEcologyProps(field(),config));
    assert.ok(a.length>1);
    const b=proposeEcologyProps(field(128),config);
    assert.deepEqual(a.filter(p=>p.x>=160&&p.x<352),
        b.filter(p=>p.x>=160&&p.x<352));
    assert.equal(new Set(a.map(p=>p.id)).size,a.length);
});

test('rock footprints avoid P1i whole-stone borders; grass stays on soft ground',()=>{
    const source=field(),placements=proposeEcologyProps(source,config);
    for(const p of placements){
        assert.ok(ECOLOGY_PROP_DEFINITIONS[p.kind].compatible.includes(p.material));
        const d=p.collision.groundRadius+PROP_EDGE_GUARD;
        const hard=Boolean(source.stoneIds[p.y*source.width+p.x]);
        for(let dy=-d;dy<=d;dy+=3)for(let dx=-d;dx<=d;dx+=3){
            const x=p.x+dx,y=p.y+dy;
            assert.ok(x>=0&&y>=0&&x<source.width&&y<source.height);
            assert.equal(Boolean(source.stoneIds[y*source.width+x]),hard);
        }
        assert.equal(p.placement,'source-art-candidate-only');
        if(p.kind.startsWith('grass'))assert.equal(p.collision.mode,'none');
    }
});

test('shared-G lighting descriptors do not introduce emitters or new physics',()=>{
    const profiles=ecologyPropMaterialDescriptors();
    assert.equal(Object.keys(profiles).length,4);
    for(const [kind,p] of Object.entries(profiles)){
        assert.equal(p.emission,'#000000');
        assert.equal(p.emissionIntensity,0);
        assert.ok(p.albedo&&p.normal&&p.roughnessMap);
        assert.equal('specularMap' in p,false);
        assert.equal(p.doubleSided,kind.startsWith('grass'));
    }
    for(const p of proposeEcologyProps(field(),config)){
        assert.equal(p.lighting.receivesLight,true);
        assert.equal(p.collision.authority,
            'C# ArenaEnvironmentState / site geometry; no JS collider');
    }
});

test('candidate placement never paints over or mutates approved P1i ground',()=>{
    const source=field();
    const albedo=source.albedo.data.slice(),ids=source.stoneIds.slice(),heights=source.heights.slice();
    proposeEcologyProps(source,config);
    assert.deepEqual(source.albedo.data,albedo);
    assert.deepEqual(source.stoneIds,ids);
    assert.deepEqual(source.heights,heights);
    assert.throws(()=>proposeEcologyProps(source,{...config,context:{density:2}}),RangeError);
});

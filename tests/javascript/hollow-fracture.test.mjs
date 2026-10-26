import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    FRACTURE_DIRECTIONS,FRACTURE_FRAMES,isApprovedHollowFractureManifest,
    eligibleHollowFracture,createHollowFractureAssets,hollowFractureEmitters,hollowFractureCanvasLights,withHollowFractureLightingFrame
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-fracture.js';
import {validateSnapshot,selectLights} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const manifest=()=>({
    schemaVersion:1,actor:'hollowed',clip:'fracture',ownerApproved:true,
    sourceGeometry:'original-skinned-blender-mesh',injury:'standard',
    frames:24,fps:12,cell:128,worldSize:124,anchor:[64,88],
    directions:[...FRACTURE_DIRECTIONS],
    atlases:Object.fromEntries(FRACTURE_DIRECTIONS.map(dir=>[
        dir,{file:`fracture-${dir}.png`,sha256:'a'.repeat(64)}
    ]))
});
const standard={entityId:40,deathInjury:'standard',deathStyle:'fracture',
    direction:'S',x:200,y:125,radius:11,visualScale:1,at:5};
const record=()=>{
    const calls=[];
    const ctx={globalAlpha:1,imageSmoothingEnabled:true,filter:'blur(3px)',
        save(){calls.push('save')},restore(){calls.push('restore')},
        drawImage(...args){calls.push(['image',...args,this.globalAlpha])}};
    return {ctx,calls};
};

test('fracture clips must derive from the approved 3D Hollowed and include all eight actual directions',()=>{
    assert.ok(isApprovedHollowFractureManifest(manifest()));
    for(const patch of [
        {ownerApproved:false},{sourceGeometry:'procedural-glyphs'},{injury:'one-arm-left'},
        {cell:96},{worldSize:150},{frames:20},{anchor:[48,66]},{directions:['S']}
    ])assert.equal(isApprovedHollowFractureManifest({...manifest(),...patch}),false);
    const invalid=manifest();delete invalid.atlases.N;
    assert.equal(isApprovedHollowFractureManifest(invalid),false);
    const mismatched=manifest();mismatched.atlases.N.file='bones-random.png';
    assert.equal(isApprovedHollowFractureManifest(mismatched),false);
});

test('art choice is deterministic and never replaces an existing damaged Hollowed',()=>{
    const eligible=Array.from({length:400},(_,id)=>id).filter(id=>eligibleHollowFracture(id));
    assert.equal(eligible.length,400,'every intact standard Hollowed may fracture');
    assert.ok(eligibleHollowFracture(0));
    // Appearance chooses the impaired leg independently; other injuries are
    // filtered by the existing deathInjury source-rig contract below.
    for(const injury of ['one-arm-left','broken-arm-right','broken-leg-left'])
        for(const id of eligible)assert.equal(eligibleHollowFracture(id,injury),false);
    for(const id of [-1,1.5,NaN,Infinity])assert.equal(eligibleHollowFracture(id),false);
});

test('absent or unapproved source atlas keeps the existing 3D corpse; never retries per frame',async()=>{
    const old=globalThis.fetch;
    let requests=0;
    globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({...manifest(),ownerApproved:false})}};
    try{
        const asset=createHollowFractureAssets(new URL('https://example.test/hollow/'));
        assert.equal(await asset.preload(),false);assert.equal(await asset.preload(),false);
        assert.equal(asset.ready(),false);assert.equal(requests,1);
        assert.equal(asset.draw(record().ctx,standard,.5),false);
    } finally {globalThis.fetch=old;}
});

test('only full 3D atlas set draws at original pivot, nearest-neighbor and held terminal corpse',async()=>{
    const saved={fetch:globalThis.fetch,Image:globalThis.Image};
    let decoded=0;
    globalThis.fetch=async()=>({ok:true,json:async()=>manifest()});
    globalThis.Image=class {
        set src(value){
            this.url=String(value);
            this.naturalWidth=3072;this.naturalHeight=128;
            decoded++;queueMicrotask(()=>this.onload());
        }
    };
    try{
        const asset=createHollowFractureAssets(new URL('https://example.test/hollow/'));
        assert.equal(await asset.preload(),true);assert.equal(asset.ready(),true);
        assert.equal(decoded,8);
        const {ctx,calls}=record();
        assert.equal(asset.draw(ctx,standard,.52),true);
        const image=calls.find(c=>Array.isArray(c));
        assert.ok(image[1].url.includes('fracture-S.png?'));
        assert.equal(image[2],6*128);assert.equal(image[3],0);
        assert.equal(image[4],128);assert.equal(image[5],128);
        assert.equal(image[6],200-62);assert.equal(image[7],125-88/128*124);
        assert.equal(image[8],124);assert.equal(image[9],124);
        assert.equal(ctx.imageSmoothingEnabled,false);
        const still=record();
        asset.draw(still.ctx,standard,1.5,true);
        assert.equal(still.calls.find(c=>Array.isArray(c))[2],(FRACTURE_FRAMES-1)*128);
        const faded=record();
        asset.draw(faded.ctx,standard,3.5,false);
        assert.equal(faded.calls.find(c=>Array.isArray(c)).at(-1),.5);
        assert.equal(asset.draw(record().ctx,{...standard,deathInjury:'one-arm-left'},.8),false);
        assert.equal(asset.draw(record().ctx,{...standard,direction:'invalid'},.8),false);
    } finally {globalThis.fetch=saved.fetch;globalThis.Image=saved.Image;}
});

test('fracture ember light shares generic GPU contract and projects into the legacy night renderer',()=>{
    const corpses=new Map([[40,standard],[41,{...standard,entityId:41,at:2,deathStyle:'collapse'}]]);
    const before=hollowFractureEmitters(corpses,5.1);
    const impact=hollowFractureEmitters(corpses,5.62);
    const later=hollowFractureEmitters(corpses,6.1);
    assert.equal(before.length,0);assert.equal(impact.length,1);
    assert.equal(later.length,1);assert.ok(later[0].intensity < impact[0].intensity);
    assert.equal(hollowFractureEmitters(corpses,6.4).length,0);
    assert.deepEqual(hollowFractureEmitters(corpses,5.62),impact,'same visual time must be deterministic');
    assert.equal(impact[0].id,'hollow-fracture:40:ember');
    assert.equal(impact[0].castsShadow,false);
    const original={version:1,time:5.62,lights:[],materials:[],objects:[],
        environment:{ambient:.012,color:'#8c9cbb',exposure:1,emission:true}};
    const framed=withHollowFractureLightingFrame(original,impact);
    assert.equal(original.lights.length,0,'presentation must never mutate C# authoritative lights');
    assert.equal(framed.lights.length,1);
    assert.equal(withHollowFractureLightingFrame(original,[]),original);
    const zero={...original,environment:{ambient:0,color:'#000000',exposure:1,emission:false}};
    assert.equal(withHollowFractureLightingFrame(zero,impact),zero,
        'zero-light GPU diagnostics may never be illuminated by corpse VFX');
    assert.deepEqual(hollowFractureCanvasLights(impact,zero),[],
        'Canvas fallback must respect zero-light mode too');
    const scene=validateSnapshot(framed);
    assert.equal(selectLights(scene).length,1);
    const canvas=hollowFractureCanvasLights(impact);
    assert.equal(canvas[0].x,200);assert.equal(canvas[0].y,125);
    assert.equal(canvas[0].family,'fire');
    assert.equal(canvas[0].strength,impact[0].intensity);
    assert.ok(hollowFractureEmitters(corpses,5.62,true)[0].intensity<impact[0].intensity);
});

test('production uses original source atlases and never resurrects the rejected pixel bone renderer',()=>{
    const web=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
    const source=readFileSync(new URL('hollow-sprites.js',web),'utf8');
    const arena=readFileSync(new URL('arena.js',web),'utf8');
    const ours=readFileSync(new URL('hollow-fracture.js',web),'utf8');
    assert.ok(source.includes("deathStyle:fracture.ready() && eligibleHollowFracture"));
    assert.ok(source.includes("fracture.draw(ctx,corpse,age,reducedMotion)"));
    assert.ok(arena.includes('hollowFractureCanvasLights(fractureEmitters,snapshot.lighting)'));
    assert.ok(arena.includes('withHollowFractureLightingFrame(snapshot.lighting,fractureEmitters)'));
    assert.ok(arena.includes('hollowFractureEmitters(state.hollow.corpses,state.hollow.clock'));
    assert.ok(!source.includes('drawHollowBoneBurst'));
    assert.ok(!ours.includes('Math.random'));
    assert.ok(!ours.includes('paintBone'));
    assert.ok(!ours.includes('ctx.rotate'));
});

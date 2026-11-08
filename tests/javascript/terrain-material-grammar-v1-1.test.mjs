import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSoftField, makeBoundaryMask, blendWorldPatch, buildLightingMaps,
    createBoundaryReview, TERRAIN_CLASSES, TILE_ROLES, TERRAIN_MATERIALS,
    DETAIL_CATALOG, SURFACE_MODIFIERS, applySurfaceModifier } from '../../tools/art/prototypes/terrain-material-grammar.mjs';

test('generic terrain grammar includes four classes, conditional tile roles and compatible details', () => {
    assert.deepEqual(Object.keys(TERRAIN_CLASSES), ['soft','hard','loose','wet']);
    assert.deepEqual(TILE_ROLES.directional, ['left','right','top','bottom']);
    assert.deepEqual(TILE_ROLES.corner, ['northwest','northeast','southwest','southeast']);
    assert.ok(TILE_ROLES.conditional.includes('broken-edge'));
    for (const entry of Object.values(TERRAIN_MATERIALS)) {
        assert.ok(TERRAIN_CLASSES[entry.kind]);
        for (const detail of entry.details) assert.ok(DETAIL_CATALOG[detail], detail);
    }
    assert.equal(SURFACE_MODIFIERS.damp.class, 'wet');
});

test('grass and mud have repeatable broad variations rather than only scattered noise', () => {
    const grass=makeSoftField('grass',476),mud=makeSoftField('mud',476);
    assert.deepEqual(makeSoftField('grass',476).data, grass.data);
    assert.notDeepEqual(grass.data,mud.data);
    const uniqueMeans=(field) => {
        const means=[];
        for (let gy=0;gy<8;gy++) for (let gx=0;gx<8;gx++) {
            let total=0;
            for (let y=gy*32;y<gy*32+32;y++)for(let x=gx*32;x<gx*32+32;x++) total+=field.get(x,y)[1];
            means.push(Math.round(total/1024));
        }
        return new Set(means).size;
    };
    assert.ok(uniqueMeans(grass)>=5,'grass needs broad clustered variations');
    assert.ok(uniqueMeans(mud)>=5,'mud needs broad compressed/wet variations');
});

test('soft blending works across horizontal and vertical boundaries, not only X coordinates', () => {
    const soil=makeSoftField('soil',113),mud=makeSoftField('mud',114);
    for(const direction of ['left','top']) {
        const mask=makeBoundaryMask(direction,330);
        const blended=blendWorldPatch(soil,mud,mask,{policy:'soft-mingle',seed:331});
        const plain=blendWorldPatch(soil,mud,mask,{policy:'structural-junction',seed:331});
        let changed=0;
        for(let i=0;i<65536;i++) if(blended.owner[i]!==plain.owner[i]) changed++;
        assert.ok(changed>10, `${direction} must intermingle`);
        assert.ok(changed<10000, `${direction} must keep intermingling near the boundary`);
    }
});

test('damp modifiers alter roughness but leave geometry, albedo and material identity unchanged', () => {
    const patch=createBoundaryReview({primary:'mud',secondary:'grass',direction:'left',seed:344});
    const before=buildLightingMaps(patch);
    const mask=new Uint8Array(65536);mask.fill(255,0,32768);
    const after=applySurfaceModifier(before,'damp',mask);
    assert.deepEqual(after.albedo.data,before.albedo.data);
    assert.deepEqual(after.normal.data,before.normal.data);
    assert.ok(after.roughnessMap.get(3,3)[1]<before.roughnessMap.get(3,3)[1]);
    assert.equal(after.roughnessMap.get(200,200)[1],before.roughnessMap.get(200,200)[1]);
    assert.throws(()=>applySurfaceModifier(before,'unknown',mask),RangeError);
});

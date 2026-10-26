import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HOLLOW_INJURY_DEATH_VARIANTS,HOLLOW_INJURY_DEATH_DIRECTIONS}
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-injury-death.js';

const base=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/death/injuries/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));

test('all three injury death variants are separately source-authored Blender actions',()=>{
    assert.equal(manifest.schemaVersion,1);
    assert.equal(manifest.actor,'hollowed');
    assert.equal(manifest.renderedFrom3D,true);
    assert.equal(manifest.capeRemovedInActualMesh,true);
    assert.equal(manifest.frames,24);
    assert.equal(manifest.fps,12);
    assert.equal(manifest.cell,96);
    assert.deepEqual(manifest.anchor,[48,66]);
    assert.deepEqual(manifest.variants,HOLLOW_INJURY_DEATH_VARIANTS);
    assert.deepEqual(manifest.directions,HOLLOW_INJURY_DEATH_DIRECTIONS);
    const source=new URL('../../../../../../../../../art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-injury-deaths/hollow-injury-deaths.blend',base);
    assert.equal(existsSync(source),true,'preserve editable 3D rig, not only rendered pixels');
});

test('three rendered eight-direction atlases match published cryptographic hashes',()=>{
    const digests=new Set();
    for(const variant of HOLLOW_INJURY_DEATH_VARIANTS){
        const clip=manifest.clips[variant];
        assert.equal(clip.image,'death-'+variant+'.png');
        const bytes=readFileSync(new URL(clip.image,base));
        assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
        assert.equal(bytes.readUInt32BE(16),24*96);
        assert.equal(bytes.readUInt32BE(20),8*96);
        const sha=createHash('sha256').update(bytes).digest('hex');
        assert.equal(sha,clip.sha256,'real source atlas hash must match manifest');
        digests.add(sha);
        const boxes=manifest.boundingBoxes[variant];
        assert.equal(Object.keys(boxes).length,8*24);
        for(const direction of HOLLOW_INJURY_DEATH_DIRECTIONS)for(let frame=0;frame<24;frame++){
            const box=boxes[direction+':'+frame];
            assert.ok(Array.isArray(box)&&box.length===4);
            assert.ok(box[0]>0&&box[1]>0&&box[2]<96&&box[3]<96,
                'genuine 3D frame must not clip against cell edges: '+variant+'/'+direction+'/'+frame);
            assert.ok(box[2]>box[0]&&box[3]>box[1]);
        }
    }
    assert.equal(digests.size,3,'each injury must have a distinct rendered 3D death, not recolored/copied pixels');
});

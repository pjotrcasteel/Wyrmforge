import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePng} from '../../art/lib/png.mjs';

const root=fileURLToPath(new URL('../../../art/source/characters/wizard/exports/prototype/',import.meta.url));
const schools=['fire','frost','storm','arcane','necromancer','summoner'];
const passes=['normal','roughness','height','caster'];
const directions=['N','NE','E','SE','S','SW','W','NW'];
const cell=128,frameCount=16,width=cell*frameCount,height=cell*directions.length;

function assertAlphaAligned(base,candidate,school,pass) {
    assert.deepEqual([candidate.width,candidate.height],[width,height],school+' '+pass+' dimensions');
    const reference=base.rgba,other=candidate.rgba;
    assert.equal(other.length,reference.length);
    for(let i=3;i<other.length;i+=4)
        assert.equal(other[i],reference[i],school+' '+pass+' alpha offset '+i);
}

function assertValidFrames(rgba,school) {
    const unique=new Set();
    for(let row=0;row<directions.length;row++) for(let frame=0;frame<frameCount;frame++) {
        const hash=createHash('sha256');
        let pixels=0;
        for(let y=0;y<cell;y++) {
            const start=((row*cell+y)*width+frame*cell)*4;
            const strip=rgba.subarray(start,start+cell*4);
            hash.update(strip);
            for(let x=0;x<cell;x++) {
                const alpha=strip[x*4+3];
                assert.ok(alpha===0||alpha===255,school+' non-binary alpha');
                if(alpha) {
                    pixels++;
                    assert.ok(x>=2&&x<cell-2&&y>=2&&y<cell-2,
                        school+' clipped '+directions[row]+' frame '+frame);
                }
            }
        }
        assert.ok(pixels>0,school+' blank '+directions[row]+' frame '+frame);
        unique.add(hash.digest('hex'));
    }
    assert.equal(unique.size,128,school+' has duplicated directions or walking poses');
}

test('prototype wizard atlas schemas, foot anchors and all six pose-aligned lighting material passes',async()=>{
    for(const school of schools) {
        const directory=join(root,school);
        const manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
        assert.equal(manifest.schemaVersion,1);
        assert.deepEqual(manifest.directions,directions);
        assert.deepEqual(Object.keys(manifest.clips),['walk']);
        assert.equal(manifest.clips.walk.frames,frameCount);
        assert.equal(manifest.clips.walk.cell,cell);
        assert.deepEqual(manifest.clips.walk.anchor,[64,106]);
        assert.equal(manifest.clips.walk.worldSize,72);
        const atlas=decodePng(await readFile(join(directory,'walk.png')));
        assert.deepEqual([atlas.width,atlas.height],[width,height],school+' albedo dimensions');
        assertValidFrames(atlas.rgba,school);
        for(const pass of passes) {
            const candidate=decodePng(await readFile(join(directory,'walk-'+pass+'.png')));
            assertAlphaAligned(atlas,candidate,school,pass);
        }
    }
});

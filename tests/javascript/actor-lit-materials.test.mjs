import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { actorMaterialSample, validateActorMaterialManifest } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/actor-materials.js';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/', import.meta.url);
const expected = {
    'hollow-rigged': { walk: 16, attack: 16, death: 24 },
    'ashling-rigged': { walk: 16, attack: 22, death: 28 },
};
function json(folder, name) {
    return JSON.parse(readFileSync(fileURLToPath(new URL(`${folder}/${name}`, root)), 'utf8'));
}

test('shared actor contract uses one synchronous frame for all material passes', () => {
    for (const [folder, clips] of Object.entries(expected)) {
        const runtime = json(folder, 'manifest.json');
        const material = json(folder, 'lit-material-manifest.json');
        assert.equal(validateActorMaterialManifest(runtime, material), material);
        assert.deepEqual(runtime.directions, ['N','NE','E','SE','S','SW','W','NW']);
        let total = 0;
        for (const [clip, count] of Object.entries(clips)) {
            for (const direction of runtime.directions) {
                for (let frame = 0; frame < count; frame++) {
                    const sample = actorMaterialSample(runtime, material, { clip, direction, frame });
                    assert.deepEqual(sample.frame.repeat, [1/count, 1/8]);
                    assert.deepEqual(sample.frame.offset, [frame/count, 1-(runtime.directions.indexOf(direction)+1)/8]);
                    assert.ok(sample.textures.albedo.endsWith('.png'));
                    assert.ok(sample.textures.normal.endsWith('.png'));
                    assert.ok(sample.textures.depth.endsWith('.png'));
                    assert.ok(sample.textures.caster.endsWith('.png'));
                    assert.deepEqual(sample.anchor, runtime.clips[clip].anchor);
                    assert.equal(sample.worldSize, runtime.clips[clip].worldSize);
                    assert.equal(sample.castsShadow, true);
                    assert.equal(sample.receivesShadow, true);
                    assert.equal(sample.receivesLight, true);
                    assert.equal(sample.emissive, null);
                    total++;
                }
            }
            assert.throws(() => actorMaterialSample(runtime, material, { clip, direction: 'S', frame: count }), RangeError);
        }
        assert.equal(total, Object.values(clips).reduce((a,b) => a+b, 0)*8);
    }
});

test('fail closed on missing material, wrong frame count or changed feet anchor', () => {
    const runtime = json('hollow-rigged', 'manifest.json');
    const material = json('hollow-rigged', 'lit-material-manifest.json');
    const mutate = () => structuredClone(material);
    const missing = mutate(); delete missing.clips.attack.normal;
    assert.throws(() => validateActorMaterialManifest(runtime, missing), /Missing authored/);
    const count = mutate(); count.clips.death.frames++;
    assert.throws(() => validateActorMaterialManifest(runtime, count), /atlas mismatch/);
    const anchor = mutate(); anchor.clips.walk.anchor[1]++;
    assert.throws(() => validateActorMaterialManifest(runtime, anchor), /atlas mismatch/);
    const rows = mutate(); rows.directions.reverse();
    assert.throws(() => validateActorMaterialManifest(runtime, rows), /direction rows/);
});

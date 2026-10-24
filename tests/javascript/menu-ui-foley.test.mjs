import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const assetDir = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', assetDir), 'utf8'));
const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');

test('all three ordinary interface material auditions have real CC0 Ogg recordings', () => {
    assert.deepEqual(Object.keys(manifest.uiMaterials).sort(), ['iron', 'stone', 'vellum']);
    for (const [key, material] of Object.entries(manifest.uiMaterials)) {
        assert.ok(material.variants.length >= 1, key);
        assert.ok(material.mix.gain > 0 && material.mix.gain <= 1, key);
        for (const variant of material.variants) {
            const bytes = readFileSync(new URL(variant.file, assetDir));
            assert.equal(bytes.subarray(0, 4).toString(), 'OggS', variant.file);
            assert.equal(variant.license, 'CC0');
            if (variant.gitBlobSha) {
                const hash = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
                assert.equal(hash, variant.gitBlobSha, variant.file);
            } else {
                assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256, variant.file);
            }
        }
    }
    assert.equal(manifest.uiMaterials.vellum.variants.length, 2);
    assert.notEqual(manifest.uiMaterials.vellum.variants[0].gitBlobSha, manifest.uiMaterials.vellum.variants[1].gitBlobSha);
});

test('ordinary presses use persistent selectable real recordings without replacing combat audio', () => {
    assert.match(audio, /uiMaterialKey = 'wyrmforge\.audio\.ui\.material\.v1'/);
    assert.match(audio, /let uiMaterial = 'vellum'/);
    assert.match(audio, /savePreference\(uiMaterialKey, value\)/);
    assert.match(audio, /recordedManifest\?\.uiMaterials\?\.\[uiMaterial\]/);
    assert.match(audio, /play\('ui', true\)/);
    assert.match(audio, /button\.closest\('\.wyrmforge-sound-controls'\)/);
    assert.match(audio, /source\.playbackRate\.value = \[0\.99, 1, 1\.01\]/);
    assert.equal(manifest.cues.fire.variants.length, 3);
    assert.ok(manifest.music.menu && manifest.music.hunt);
});

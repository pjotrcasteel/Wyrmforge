import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const assetDir = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', assetDir), 'utf8'));
const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');

test('new ordinary interface materials have verified CC0 Ogg recordings, not legacy stone', () => {
    assert.deepEqual(Object.keys(manifest.uiMaterials).sort(), ['iron', 'vellum']);
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
    assert.equal(manifest.cues.fire.variants.length, 2);
    assert.equal(manifest.cues.fire.license, 'Original');
    assert.match(manifest.cues.fire.file, /^fireball-r1-cast-1\.ogg$/);
    assert.ok(manifest.music.menu && manifest.music.hunt);
});


test('Codex opens with a deliberate two-layer book-and-leather interaction, not the generic Town door', () => {
    const codex = manifest.cues['codex-open'];
    const open = readFileSync(new URL(codex.file, assetDir));
    assert.equal(open.subarray(0, 4).toString(), 'OggS');
    assert.equal(codex.source, 'bookOpen.ogg');
    assert.equal(codex.library, 'kenney-rpg');
    assert.equal(codex.license, 'CC0');
    assert.equal(codex.layers.length, 1);
    const leather = codex.layers[0];
    assert.equal(leather.file, 'menu-handleSmallLeather.ogg');
    assert.equal(leather.license, 'CC0');
    assert.equal(leather.delaySeconds, 0.12);
    assert.ok(leather.gainScale > 0 && leather.gainScale < 0.5);
    for (const entry of [codex, leather]) {
        const bytes = readFileSync(new URL(entry.file, assetDir));
        const sha = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
        assert.equal(sha, entry.gitBlobSha);
    }
    assert.notEqual(codex.file, manifest.cues['building-open'].file);
    const town = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor', import.meta.url), 'utf8');
    assert.match(town, /CodexUnlocked \? "codex-open" : "none"/);
    assert.match(town, /NexusUnlocked \? "building-open" : "none"/);
    assert.match(audio, /'building-open', 'codex-open', 'hunt-start'/);
    assert.match(audio, /play\('codex-open', true\)/);
});

test('Worn Vellum preference is classified rather than leaking into save-state invariants', () => {
    const layout = readFileSync(new URL('../../src/Wyrmforge.Application/Persistence/SaveLayout.cs', import.meta.url), 'utf8');
    assert.match(layout, /\["wyrmforge\.audio\.ui\.material\.v1"\] = SaveDomain\.Preferences/);
});


test('Wet Forest ambient sound is region-scoped, muted separately and activated only in a user gesture', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor', import.meta.url), 'utf8');
    assert.match(arena, /Region == RegionCatalog.CinderFrontierId \? "wet-forest" : "none"/);
    assert.match(audio, /\.game-screen\[data-ambient-biome="wet-forest"\]/);
    assert.match(audio, /function startForestFromGesture\(\)/);
    assert.match(audio, /startForestFromGesture\(\);/);
    assert.match(audio, /forestPlayer\?\.player\.pause\(\)/);
    assert.match(audio, /makeVolumeControl\('ambience', 'Wet Forest'\)/);
    const layout = readFileSync(new URL('../../src/Wyrmforge.Application/Persistence/SaveLayout.cs', import.meta.url), 'utf8');
    assert.match(layout, /\["wyrmforge\.audio\.ambience\.v1"\] = SaveDomain\.Preferences/);
});

test('Wet Forest carries transparent offline-source provenance when the recorded pack is built', () => {
    // Assets are installed by the soundscape build action before this PR can merge.
    assert.equal(manifest.ambience?.wetForest?.license, 'CC0');
    assert.equal(manifest.ambience.wetForest.file, 'wet-forest-bed.ogg');
    const bytes = readFileSync(new URL(manifest.ambience.wetForest.file, assetDir));
    assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.ambience.wetForest.sha256);
    const sources = new Set(manifest.sources.map(source => source.key));
    for (const key of manifest.ambience.wetForest.sourceKeys) assert.ok(sources.has(key));
});

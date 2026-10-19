import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const audioDir = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', audioDir), 'utf8'));
const audioCode = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
const soundDesign = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-design.js', import.meta.url), 'utf8');
const events = ['ui', 'ui-back', 'ui-open', 'ui-confirm', 'hunt-start', 'upgrade-open', 'upgrade-choice', 'trail-clear'];

function gitBlobSha(bytes) {
    return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

test('three distinct menu sound profiles cover all semantic action events', () => {
    assert.equal(manifest.menuSoundSchema, 1);
    assert.deepEqual(Object.keys(manifest.menuPalettes).sort(), ['iron', 'stone', 'vellum']);
    for (const [name, profile] of Object.entries(manifest.menuPalettes)) {
        assert.ok(profile.label && profile.description, name);
        assert.deepEqual(Object.keys(profile.cues).sort(), [...events].sort(), name);
        for (const [event, map] of Object.entries(profile.cues)) {
            const assets = map.variants ?? [map.asset];
            assert.ok(assets.length, `${name}/${event}`);
            for (const key of assets) {
                assert.ok(manifest.menuAssets[key], `${name}/${event}: unknown asset ${key}`);
            }
            assert.ok(map.mix.gain > 0 && map.mix.gain <= 0.6, `${name}/${event}: unsafe gain`);
            assert.ok(map.mix.lowpassHz >= 1500 && map.mix.lowpassHz <= 4000, `${name}/${event}: unexpected frequency`);
        }
    }
});

test('menu candidates are actual same-origin Ogg recordings with traceable CC0 provenance', () => {
    for (const [name, entry] of Object.entries(manifest.menuAssets)) {
        assert.equal(entry.license, 'CC0', name);
        assert.equal(entry.file.includes('/'), false, name);
        const bytes = readFileSync(new URL(entry.file, audioDir));
        assert.equal(bytes.subarray(0, 4).toString(), 'OggS', name);
        assert.ok(bytes.length > 1000, name);
        if (name !== 'stone') {
            assert.equal(entry.library, 'kenney-rpg');
            assert.equal(entry.sourcePage, 'https://kenney.nl/assets/rpg-audio');
            assert.equal(gitBlobSha(bytes), entry.gitBlobSha, name + ' differs from the attributed source');
        }
    }
});

test('phase-1 menu actions never resolve to the old healing chime or magic shield', () => {
    for (const profile of Object.values(manifest.menuPalettes)) {
        for (const map of Object.values(profile.cues)) {
            for (const key of map.variants ?? [map.asset]) {
                const sample = manifest.menuAssets[key].source.toLowerCase();
                assert.doesNotMatch(sample, /chime|shield|gem|bell/);
            }
        }
    }
});

test('runtime keeps palette choice at the playback boundary and exposes native-portable events', () => {
    assert.match(audioCode, /function menuEntry\(name, variation\)/);
    assert.match(audioCode, /function setMenuPalette\(name\)/);
    assert.match(audioCode, /data-sound-cue/);
    assert.match(audioCode, /menuPaletteKey/);
    assert.match(audioCode, /menuPaletteNames = \['vellum', 'stone', 'iron'\]/);
    for (const event of ['ui-back', 'ui-open', 'ui-confirm']) {
        assert.ok(soundDesign.includes(`'${event}':`), event);
    }
    const hub = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Forge/RunHubView.razor', import.meta.url), 'utf8');
    assert.match(hub, /class="enter-realm" data-sound-cue="none"/);
});

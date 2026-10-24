import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const directory = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('recorded fantasy music is bundled, not hotlinked or silently synthesized', () => {
    assert.equal(manifest.music.menu, 'music-osare.ogg');
    assert.equal(manifest.music.hunt, 'music-cave.ogg');
    for (const filename of Object.values(manifest.music)) {
        assert.ok(!filename.includes('/') && filename.endsWith('.ogg'));
        const bytes = readFileSync(new URL(filename, directory));
        assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
        assert.ok(bytes.length > 300_000, filename + ' does not look like an actual music recording');
    }
});

test('all spell schools and high-value cues use real checked-in recordings', () => {
    for (const name of ['arcane', 'fire', 'frost', 'lightning', 'hurt', 'wyrm', 'power-burst', 'upgrade-choice']) {
        const entry = manifest.cues[name];
        assert.ok(entry, name + ' was not imported');
        assert.ok(['CC0', 'CC-BY-4.0'].includes(entry.license));
        const bytes = readFileSync(new URL(entry.file, directory));
        assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
        assert.ok(bytes.length > 1000);
        assert.equal(sha256(bytes), entry.sha256);
    }
    const elemental = ['arcane', 'fire', 'frost', 'lightning'].map(name => manifest.cues[name].sha256);
    assert.equal(new Set(elemental).size, 4, 'the four spell schools must sound physically different');
});

test('every mage school has multiple real cast takes, impact takes and a separately licensed buildup', () => {
    assert.equal(manifest.version, 2);
    for (const school of ['arcane', 'fire', 'frost', 'lightning']) {
        const cue = manifest.cues[school];
        assert.ok(cue.variants.length >= 3, school + ' has no recorded cast variations');
        assert.ok(cue.hitVariants.length >= 2, school + ' has no recorded hit variations');
        const entries = [...cue.variants, ...cue.hitVariants, cue.buildup];
        assert.equal(new Set(entries.map(entry => entry.sha256)).size, entries.length, school + ' reuses the same sample');
        for (const entry of entries) {
            assert.equal(entry.library, 'fantasy');
            assert.equal(entry.author, 'JC Sounds');
            assert.equal(entry.license, 'CC-BY-4.0');
            assert.ok(entry.file.endsWith('.ogg'));
            const bytes = readFileSync(new URL(entry.file, directory));
            assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
            assert.equal(sha256(bytes), entry.sha256);
        }
    }
});

test('upgrade discovery and selection use distinct, welcoming licensed recordings with soft-release profiles', () => {
    const reveal = manifest.cues['upgrade-open'];
    const choice = manifest.cues['upgrade-choice'];
    assert.equal(reveal.file, manifest.cues.reward.file, 'opening an upgrade must not trigger a Magic Shield combat sound');
    assert.equal(reveal.source, 'item_gem_01.ogg');
    assert.equal(reveal.library, 'rpg');
    assert.equal(reveal.license, 'CC0');
    assert.notEqual(reveal.sha256, choice.sha256, 'discovery and confirmation must communicate distinct moments');
    assert.match(choice.source, /Healing Chime/);
    assert.equal(choice.license, 'CC-BY-4.0');
    for (const sound of [reveal, choice]) {
        assert.ok(sound.mix.gain > 0 && sound.mix.gain < 1);
        assert.ok(sound.mix.lowpassHz <= 4800);
        assert.ok(sound.mix.attackSeconds >= 0.02);
        assert.ok(sound.mix.releaseSeconds >= 0.25);
        assert.equal(sha256(readFileSync(new URL(sound.file, directory))), sound.sha256);
    }
    assert.ok(choice.mix.releaseSeconds > reveal.mix.releaseSeconds);
});

test('every bundled file can be traced to verified CC0 or CC BY source records', () => {
    const sources = new Map(manifest.sources.map(entry => [entry.key, entry]));
    assert.ok(sources.has('osare') && sources.has('cave'));
    assert.ok(sources.has('fantasy') && sources.has('rpg'));
    for (const source of sources.values()) {
        assert.ok(source.url.startsWith('https://opengameart.org/sites/default/files/') || source.url === 'https://kenney.nl/assets/rpg-audio');
        assert.ok(source.originalSha256.match(/^[a-f0-9]{64}$/));
    }
    for (const entry of Object.values(manifest.cues)) {
        assert.ok(sources.has(entry.library));
        assert.equal(entry.license, sources.get(entry.library).license);
    }
    assert.match(manifest.attribution, /JC Sounds.*CC BY 4.0/);
});

test('buildings, first hunt, arena trail and threatening encounter use distinct CC0 material sounds', () => {
    const cues = ['building-open', 'hunt-start', 'trail-enter', 'threat-reveal'];
    const samples = cues.map(name => manifest.cues[name]);
    assert.deepEqual(samples.map(cue => cue.source), [
        'doorOpen_1.ogg', 'footstep00.ogg', 'footstep02.ogg', 'creak1.ogg'
    ]);
    assert.equal(new Set(samples.map(cue => cue.sha256)).size, 4, 'different events must sound different');
    assert.equal(manifest.transitionDesign.schemaVersion, 1);
    for (const [index, cue] of samples.entries()) {
        assert.equal(cue.library, 'kenney-rpg');
        assert.equal(cue.author, 'Kenney');
        assert.equal(cue.license, 'CC0');
        assert.doesNotMatch(cue.source, /bell|chime|shield|magic/i);
        const recording = readFileSync(new URL(cue.file, directory));
        assert.equal(recording.subarray(0, 4).toString(), 'OggS', cues[index]);
        assert.equal(sha256(recording), cue.sha256, cues[index]);
    }
    assert.deepEqual(manifest.cues['hunt-start'].layers.map(layer => layer.source), [
        'cloth1.ogg', 'footstep02.ogg'
    ]);
    for (const layer of manifest.cues['hunt-start'].layers) {
        assert.equal(layer.license, 'CC0');
        assert.ok(layer.delaySeconds >= 0 && layer.delaySeconds < 0.3);
        assert.ok(layer.gainScale > 0 && layer.gainScale < 0.8);
        assert.equal(sha256(readFileSync(new URL(layer.file, directory))), layer.sha256);
    }
    const source = manifest.sources.find(source => source.key === 'kenney-rpg');
    assert.equal(source?.sourcePage, 'https://kenney.nl/assets/rpg-audio');
});

test('gate clicks do not add the generic UI sound on top of the hunt entrance sound', () => {
    const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
    assert.ok(audio.includes("button.matches('.town-door--gate, .refuge-town-spot--gate, .refuge-canonical-gate-action, .enter-realm, .gate-cta')"));
    assert.match(audio, /button\.getAttribute\('data-sound-cue'\) === 'none'/);
    const home = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/Home.razor.cs', import.meta.url), 'utf8');
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.cs', import.meta.url), 'utf8');
    assert.match(home, /TryPlayAudioAsync\("hunt-start"\)/);
    assert.match(arena, /node\.Type == WyrmrealmNodeType\.Dragon \? "wyrm" : "trail-enter"/);
    assert.match(arena, /TryPlayAudioAsync\("threat-reveal"\)/);
});

test('built-in browser playback can layer physical departure Foley without changing simulation', () => {
    const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
    const town = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor', import.meta.url), 'utf8');
    assert.match(audio, /function prewarmTransitions\(\)/);
    assert.match(audio, /entry\.layers\?\.length/);
    assert.match(audio, /layer\.delaySeconds/);
    assert.match(audio, /play\(cue && design\?\.palette\[cue\] \? cue : 'ui'\)/);
    assert.match(town, /data-sound-cue="none"/);
    assert.match(town, /data-sound-cue="none"/);
    assert.ok(manifest.transitionDesign.events['building-open']);
    assert.ok(manifest.transitionDesign.events['hunt-start']);
    assert.ok(manifest.transitionDesign.events['trail-enter']);
    assert.ok(manifest.transitionDesign.events['threat-reveal']);
});


test('Hollowed and Ashling each have two distinct checked-in CC0 performances per action', () => {
    const names = ['hollow-approach', 'hollow-hit', 'hollow-death', 'ashling-approach', 'ashling-hit', 'ashling-death'];
    for (const name of names) {
        const cue = manifest.cues[name];
        assert.equal(cue.license, 'CC0', name);
        assert.equal(cue.variants.length, 2, name);
        const shas = new Set();
        for (const take of cue.variants) {
            assert.equal(take.license, 'CC0');
            assert.ok(take.sourceKeys.includes(name.startsWith('ashling') ? 'monsters-cc0' : 'zombies-cc0'));
            const bytes = readFileSync(new URL(take.file, directory));
            assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
            assert.equal(sha256(bytes), take.sha256);
            assert.ok(take.mix.gain > 0 && take.mix.gain < 1);
            shas.add(take.sha256);
        }
        assert.equal(shas.size, 2, name + ' must have human-recorded variation rather than duplicated bytes');
    }
    assert.ok(manifest.cues['ashling-death'].variants[0].sourceKeys.includes('ash-fire-cc0'));
    const allKeys = manifest.sources.map(item => item.key);
    assert.ok(['zombies-cc0', 'monsters-cc0', 'ash-fire-cc0'].every(key => allKeys.includes(key)));
});

test('creature preview buttons play separate approach, hurt and death without rewriting game sprites', () => {
    const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
    const events = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-events.js', import.meta.url), 'utf8');
    assert.match(audio, /play\(family \+ '-approach', true\)/);
    assert.match(audio, /play\(family \+ '-hit', true\)/);
    assert.match(audio, /play\(family \+ '-death', true\)/);
    assert.match(events, /burst\.entityId/);
    assert.match(events, /burst\.kind/);
});


test('Sound Atelier auditions each creature action with alternating recorded A/B takes', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
    assert.match(js, /family \+ ' — ' \+ action\.toUpperCase\(\) \+ ' \(A\/B\)'/);
    assert.match(js, /play\(family \+ '-' \+ action, true\)/);
    assert.match(js, /function prewarmCreaturesInHunt\(\)/);
    assert.match(js, /if \(desired === 'hunt'\) prewarmCreaturesInHunt\(\)/);
});

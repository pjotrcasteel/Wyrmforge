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
            assert.match(entry.file, /\\.ogg$/);
            const bytes = readFileSync(new URL(entry.file, directory));
            assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
            assert.equal(sha256(bytes), entry.sha256);
        }
    }
});

test('every bundled file can be traced to verified CC0 or CC BY source records', () => {
    const sources = new Map(manifest.sources.map(entry => [entry.key, entry]));
    assert.ok(sources.has('osare') && sources.has('cave'));
    assert.ok(sources.has('fantasy') && sources.has('rpg'));
    for (const source of sources.values()) {
        assert.ok(source.url.startsWith('https://opengameart.org/sites/default/files/'));
        assert.ok(source.originalSha256.match(/^[a-f0-9]{64}$/));
    }
    for (const entry of Object.values(manifest.cues)) {
        assert.ok(sources.has(entry.library));
        assert.equal(entry.license, sources.get(entry.library).license);
    }
    assert.match(manifest.attribution, /JC Sounds.*CC BY 4.0/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const manifest = JSON.parse(read('src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/manifest.json'));

test('old placeholder sound recordings are not used in new audio authoring and demos', () => {
    const files = [
        'tools/audio/build_fireball_r1.py',
        '.github/workflows/audio-preview-mp3.yml',
    ];
    const forbidden = [
        'fire.ogg', 'impact.ogg', 'enemy-down.ogg', 'music-cave.ogg',
        'fire-cast-1.ogg', 'fire-hit-1.ogg', 'ui.ogg',
    ];
    for (const path of files) {
        const content = read(path);
        for (const legacy of forbidden) {
            // Whole quoted token or path segment, not part of fireball-r1-cast-1.ogg.
            assert.ok(!content.includes('"' + legacy + '"') && !content.includes('/' + legacy + '"'),
                path + ' must not reuse legacy asset: ' + legacy);
        }
    }
    for (const name of ['wet-forest-hunt-demo.mp3', 'weathered-stone.mp3',
        'fire-spell-impact.mp3', 'four-school-impact-comparison.mp3',
        'hollow-encounter-1.mp3', 'ashling-encounter-1.mp3']) {
        assert.equal(existsSync(new URL('docs/audio/previews/' + name, root)), false,
            name + ' was made with placeholders and must be withdrawn');
    }
});

test('Fireball uses new original assets exclusively, and Worn Vellum cannot fall back to Stone', () => {
    const fire = manifest.cues.fire;
    assert.equal(fire.license, 'Original');
    assert.equal(fire.buildup, undefined);
    assert.deepEqual(fire.variants.map(x => x.file),
        ['fireball-r1-cast-1.ogg', 'fireball-r1-cast-2.ogg']);
    assert.deepEqual(fire.hitVariants.map(x => x.file),
        ['fireball-r1-hit-1.ogg', 'fireball-r1-hit-2.ogg']);
    assert.equal(manifest.authoredFireballStages.R1.oldAudioSourceUsed, false);
    assert.equal(manifest.authoredFireballStages.R1.approved, false);
    assert.deepEqual(Object.keys(manifest.uiMaterials).sort(), ['iron', 'vellum']);
    const design = read('src/Wyrmforge.Presentation.Web/wwwroot/js/sound-design.js');
    assert.match(design, /previewNames: \['fire', 'fire-impact'\]/);
});

test('replacement ledger explicitly blocks merging with remaining legacy sound families', () => {
    const ledger = read('docs/audio/placeholder-replacement-ledger.md');
    assert.match(ledger, /no reused legacy placeholder sound/i);
    assert.match(ledger, /Other elemental magic/);
    assert.match(ledger, /Generic impacts and other enemies/);
    assert.match(ledger, /Music \/ Hunt soundtrack/);
    assert.match(ledger, /Not replaced/i);
});

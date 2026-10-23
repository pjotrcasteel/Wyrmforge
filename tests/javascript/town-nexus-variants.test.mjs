import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const base = 'src/Wyrmforge.Presentation.Web/wwwroot/art/town/nexus-approved';
const schools = ['arcane', 'fire', 'frost', 'storm', 'death', 'binding'];

test('all six user-approved building paintings are distinct actual WebP assets', () => {
    const hashes = new Set();
    for (const school of schools) {
        const path = join(root, base, school + '.webp');
        assert.ok(existsSync(path), school + ': approved Nexus image missing');
        const bytes = readFileSync(path);
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', school);
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', school);
        assert.equal(bytes.toString('ascii', 12, 16), 'VP8X', school);
        assert.ok(bytes[20] & 0x10, school + ' must contain a transparency channel');
        assert.equal(bytes.readUIntLE(24, 3) + 1, 560, school);
        assert.equal(bytes.readUIntLE(27, 3) + 1, 450, school);
        hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(hashes.size, schools.length, 'School images must not reuse the same recolored art');
});

test('town uses only explicit paintings, preserving original panorama and other building overlays', () => {
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    assert.match(town, /nexus-approved\/\{schoolName\}\.webp/);
    assert.match(town, /data-nexus-school-art/);
    assert.match(town, /art\/town\/night-active.webp\?v=140/);
    assert.match(town, /width="560" height="450"/);
    assert.match(town, /NexusArtworkUnlocked => NexusUnlocked \|\| NexusPreviewSchool is not null/);
    assert.match(town, /TownBuildingVisuals.StateName\(NexusUnlocked\)/);
    for (const name of ['ArcaneNexus', 'Blacksmith', 'Codex', 'HallOfFame'])
        assert.match(town, new RegExp('night-vacant-' + name));
    assert.doesNotMatch(town, /nexus-schools\/|syncNexusVariant|paintNexusSchool|canvas.*nexus/i);
});

test('visual-only debug selector preserves active character and school mastery', () => {
    const forge = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    assert.match(forge, /OnNexusPreviewChanged="SelectNexusPreview"/);
    assert.match(forge, /\(nexusPreviewSchool \?\? TownNexusSchool\)/);
    assert.match(town, /data-nexus-preview-school="auto"/);
    assert.match(town, /OnBuilding\.InvokeAsync\("build"\)/);
});

test('approved art overlays only owned Nexus crop, never a whole-town color filter', () => {
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(css, /\.refuge-town-nexus-school-art\s*\{/);
    assert.match(css, /width:33\.49282%;height:47\.82147%/);
    assert.match(css, /pointer-events:none/);
    assert.doesNotMatch(css, /refuge-town-nexus-chroma|refuge-town-nexus-pixels|mix-blend-mode:color/);
    assert.ok(!existsSync(join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/js/town-nexus-variants.js')));
});

test('all four canonical buildings preserve approved active/vacant source pair bytes', () => {
    const p = 'src/Wyrmforge.Presentation.Web/wwwroot/art/buildings';
    for (const school of ['ArcaneNexus','Blacksmith','Codex','HallOfFame']) {
        for (const state of ['active','vacant']) {
            const art = readFileSync(join(root,p,school,state+'.png'));
            const approved = readFileSync(join(root,'user_handover_files/concepts/buildings',school,state+'.png'));
            assert.deepEqual(art,approved, school + ':' + state + ' art cannot change');
        }
    }
});

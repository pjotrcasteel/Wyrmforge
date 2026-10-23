import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const dir = 'src/Wyrmforge.Presentation.Web/wwwroot/art/town/nexus-schools';
const schools = ['arcane', 'fire', 'frost', 'storm', 'death', 'binding'];

test('six physical school PNGs are baked and have canonical source dimensions', () => {
    for (const school of schools) {
        const path = join(root, dir, school + '.png');
        assert.ok(existsSync(path), school + ' visual asset missing: run tools/art/build-nexus-school-assets.py');
        const bytes = readFileSync(path);
        assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', school);
        assert.equal(bytes.readUInt32BE(16), 1672, school);
        assert.equal(bytes.readUInt32BE(20), 941, school);
        assert.equal(bytes[25], 6, 'must be RGBA with transparent non-Nexus regions');
    }
});

test('the canonical six schools use independently loaded images and Arcane is unchanged', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const control = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    assert.match(scene, /nexus-schools\/\{/);
    assert.match(scene, /data-nexus-school-art/);
    assert.match(scene, /art\/town\/night-active.webp\?v=140/);
    assert.match(scene, /NexusArtworkUnlocked => NexusUnlocked \|\| NexusPreviewSchool is not null/);
    assert.match(scene, /TownBuildingVisuals.StateName\(NexusUnlocked\)/);
    assert.match(control, /OnNexusPreviewChanged="SelectNexusPreview"/);
    assert.match(control, /\(nexusPreviewSchool \?\? TownNexusSchool\)/);
});

test('old runtime hue-pixel engine and broad CSS recoloring are entirely gone', () => {
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.doesNotMatch(town, /syncNexusVariant|refuge-town-nexus-pixels|nexus-chroma|canvas.*nexus/);
    assert.doesNotMatch(css, /refuge-town-nexus-chroma|refuge-town-nexus-pixels|mix-blend-mode:color/);
    assert.match(css, /refuge-town-nexus-school-art/);
    assert.match(css, /pointer-events:none/);
    assert.ok(!existsSync(join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/js/town-nexus-variants.js')));
});

test('other canonical buildings and independent vacancy images remain protected', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    for (const school of ['ArcaneNexus','Blacksmith','Codex','HallOfFame'])
        assert.match(scene, new RegExp('night-vacant-' + school));
    assert.match(scene, /OnBuilding\.InvokeAsync\("build"\)/);
    const base = 'src/Wyrmforge.Presentation.Web/wwwroot/art/buildings';
    for (const school of ['ArcaneNexus','Blacksmith','Codex','HallOfFame'])
        for (const state of ['active','vacant'])
            assert.deepEqual(readFileSync(join(root,base,school,state+'.png')),
                readFileSync(join(root,'user_handover_files/concepts/buildings',school,state+'.png')));
});

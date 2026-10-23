import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createHash } from 'node:crypto';

const root = process.cwd();
const read = path => readFileSync(join(root, path));
const source = path => read(path).toString('utf8');
const prefix = 'src/Wyrmforge.Presentation.Web/wwwroot/art/town/nexus-school-variants/';
const schools = ['arcane','fire','frost','storm','death','binding'];

test('all six independently authored approved Nexus paintings are valid transparent 560x450 WebP assets', () => {
    const hashes = new Set();
    for (const school of schools) {
        const file = prefix + school + '.webp';
        assert.ok(existsSync(join(root, file)), 'Missing approved '+school+' image');
        const data = read(file);
        assert.ok(data.length > 25000, 'The '+school+' art must be the actual approved painting, not a blank or placeholder');
        assert.equal(data.toString('ascii', 0, 4), 'RIFF');
        assert.equal(data.toString('ascii', 8, 12), 'WEBP');
        assert.equal(data.toString('ascii', 12, 16), 'VP8X');
        assert.equal(data.readUInt32LE(4) + 8, data.length);
        assert.equal((data[24] | data[25] << 8 | data[26] << 16) + 1, 560);
        assert.equal((data[27] | data[28] << 8 | data[29] << 16) + 1, 450);
        assert.ok((data[20] & 0x10) !== 0, school+' must have transparency outside the Nexus');
        hashes.add(createHash('sha256').update(data).digest('hex'));
    }
    assert.equal(hashes.size, 6, 'These must be six separate paintings, never repeated color-filter results');
});

test('game directly swaps six school-specific visual assets without JS recoloring', () => {
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(town, /nexus-school-variants\/\{nexusVariant\}\.webp/);
    assert.match(town, /data-nexus-school-art="@nexusVariant"/);
    assert.match(town, /NexusArtworkUnlocked && DisplayNexusSchool/);
    assert.match(css, /\.refuge-town-nexus-approved-variant/);
    assert.match(css, /width:33\.492823%;height:47\.821467%/);
    assert.match(css, /pointer-events:none/);
    assert.doesNotMatch(town, /nexusVariantModule|refuge-town-nexus-pixels|refuge-town-nexus-radiance|refuge-town-nexus-chroma/);
    assert.doesNotMatch(css, /refuge-town-nexus-pixels|refuge-town-nexus-chroma|mix-blend-mode:color|filter:grayscale/);
    assert.ok(!existsSync(join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/js/town-nexus-variants.js')),
        'Rejected filter engine should not ship');
});

test('canonical town architecture, gameplay unlocks, and other buildings stay independent', () => {
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const host = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    assert.match(town, /night-active.webp\?v=140/);
    assert.match(town, /NexusArtworkUnlocked => NexusUnlocked \|\| NexusPreviewSchool is not null/);
    assert.match(town, /TownBuildingVisuals.StateName\(NexusUnlocked\)/);
    assert.match(town, /OnBuilding\.InvokeAsync\("build"\)/);
    for (const name of ['Blacksmith','Codex','HallOfFame']) assert.ok(town.includes('night-vacant-'+name));
    assert.match(host, /NexusSchool="@TownNexusSchool"/);
    assert.match(host, /NexusPreviewSchool="@nexusPreviewSchool"/);
    assert.match(host, /OnNexusPreviewChanged="SelectNexusPreview"/);
    assert.match(host, /\(nexusPreviewSchool \?\? TownNexusSchool\)/);
    assert.match(source('src/Wyrmforge.Presentation.Web/Features/Forge/DebugResetCharacter.razor'),
        /OnNexusPreviewChanged\.InvokeAsync\(school\)/);
    assert.match(town, /data-nexus-preview-school="auto"/);
});

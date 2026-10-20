import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const runtime = join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/art/town');

test('original four canonical building pairs remain unchanged as separate source art', () => {
    for (const folder of ['ArcaneNexus', 'Blacksmith', 'Codex', 'HallOfFame']) {
        for (const state of ['active', 'vacant']) {
            const relative = `buildings/${folder}/${state}.png`;
            const approved = readFileSync(join(root, 'user_handover_files/concepts', relative));
            const shipped = readFileSync(join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/art', relative));
            assert.deepEqual(shipped, approved, `Do not overwrite existing ${folder} ${state} canonical art`);
        }
    }
});

test('night preview uses a single registered 1672x941 world and four alpha layers', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    const sceneFile = 'night-active.webp';
    assert.ok(existsSync(join(runtime, sceneFile)), 'Required nighttime panorama is missing');
    const webp = readFileSync(join(runtime, sceneFile));
    assert.equal(webp.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(webp.subarray(8, 12).toString('ascii'), 'WEBP');
    for (const file of ['ArcaneNexus', 'Blacksmith', 'Codex', 'HallOfFame']
            .map(name => `night-vacant-${name}.png`)) {
        assert.ok(existsSync(join(runtime, file)), `Required vacancy layer missing: ${file}`);
        const buffer = readFileSync(join(runtime, file));
        assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
        assert.ok(buffer.readUInt32BE(16) > 100 && buffer.readUInt32BE(20) > 100);
    }

    assert.match(scene, /refuge-canonical-scene/);
    assert.ok(scene.includes('src="art/town/night-active.webp?v=132"'));
    assert.match(scene, /class="refuge-town-vacant-layer"/);
    assert.match(css, /aspect-ratio:1672\/941/);
    assert.match(css, /width:177\.6833dvh/);
    assert.doesNotMatch(css, /filter:brightness|filter:grayscale|opacity:\.4/);
});

test('building clicks are independent preview toggles, never menu or progression navigation', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const host = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-town.js');
    for (const key of ['build', 'forge', 'codex', 'legends']) {
        assert.match(scene, new RegExp('ToggleBuilding\\("' + key + '"\\)'));
    }
    assert.match(scene, /private bool nexusActive = true/);
    assert.match(scene, /private bool blacksmithActive = true/);
    assert.match(scene, /private bool codexActive = true/);
    assert.match(scene, /private bool hallActive = true/);
    assert.match(scene, /OnGate\.InvokeAsync\(\)/);
    assert.doesNotMatch(scene, /OnBuilding\.InvokeAsync/);
    assert.doesNotMatch(host, /OnBuilding="ActivateCanonicalBuildingAsync"/);
    assert.match(js, /refuge-canonical-scene/);
    assert.match(js, /blockClickUntil/);
});

test('one panorama, no old district cards and no runtime vacancy blackout', () => {
    const markup = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    const index = source('src/Wyrmforge.Presentation.Web/wwwroot/index.html');
    assert.doesNotMatch(markup, /refuge-canonical-building/);
    assert.doesNotMatch(markup, /refuge-canonical-wing/);
    assert.match(markup, /refuge-canonical-districts/);
    assert.match(css, /\.refuge-town-spot--gate/);
    assert.match(index, /css\/town-canonical\.css/);
    assert.match(index, /js\/refuge-town\.js/);
});

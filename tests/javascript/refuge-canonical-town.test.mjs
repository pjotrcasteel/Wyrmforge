import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const web = join(root, 'src/Wyrmforge.Presentation.Web');
const source = path => readFileSync(join(root, path), 'utf8');

test('all four active/vacant paintings are first-party byte-identical canonical assets', () => {
    for (const folder of ['ArcaneNexus', 'Blacksmith', 'Codex', 'HallOfFame']) {
        for (const state of ['active', 'vacant']) {
            const relative = `buildings/${folder}/${state}.png`;
            const approved = readFileSync(join(root, 'user_handover_files/concepts', relative));
            const shipped = readFileSync(join(web, 'wwwroot/art', relative));
            assert.deepEqual(shipped, approved, `${folder} ${state} must not be regenerated or tinted`);
            assert.equal(shipped.subarray(1, 4).toString('ascii'), 'PNG');
            assert.equal(shipped.readUInt32BE(16), 1536);
            assert.equal(shipped.readUInt32BE(20), 1024);
        }
    }
});

test('canonical town binds the four PNG pairs to independent C# unlock flags', () => {
    const visuals = source('src/Wyrmforge.Presentation.Web/Features/Forge/TownBuildingVisuals.cs');
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const host = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    assert.match(visuals, /Building\("build", "ArcaneNexus", nexusUnlocked\)/);
    assert.match(visuals, /Building\("forge", "Blacksmith", forgeUnlocked\)/);
    assert.match(visuals, /Building\("codex", "Codex", codexUnlocked\)/);
    assert.match(visuals, /Building\("legends", "HallOfFame", hallUnlocked\)/);
    assert.match(visuals, /"buildings\/\{folder\}\/\{StateName\(unlocked\)\}\.png"/);
    assert.match(scene, /data-town-state="@building.StateName"/);
    assert.match(scene, /OnBuilding.InvokeAsync\(building.Key\)/);
    assert.match(host, /ForgeUnlocked="@ForgeUnlocked"/);
    assert.match(host, /HallUnlocked="@Progress.LeaderboardUnlocked"/);
    assert.match(host, /OnGate="\(\) => ActivateTownLocationAsync\(ShellSection.Gate\)"/);
    assert.match(host, /"legends" => OpenHallOfFameAsync\(\)/);
});

test('three-district town has no painted NPCs or dark vacancy overlays', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    const shell = source('src/Wyrmforge.Presentation.Web/wwwroot/index.html');
    assert.match(scene, /refuge-canonical-viewport/);
    assert.match(scene, /refuge-canonical-gate/);
    assert.match(scene, /refuge-canonical-wing--west/);
    assert.match(scene, /refuge-canonical-wing--east/);
    assert.match(css, /grid-template-columns:repeat\(3,100vw\)/);
    assert.doesNotMatch(css, /backdrop-filter|filter:brightness|filter:grayscale|opacity:\.4/);
    assert.match(shell, /css\/town-canonical\.css/);
    assert.match(shell, /js\/refuge-town\.js/);
});

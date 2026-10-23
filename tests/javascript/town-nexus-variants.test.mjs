import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The shipping asset code is ES-module JS even in repositories without
// a top-level package.json type=module; data imports test the same source.
const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');
const moduleSource = source('src/Wyrmforge.Presentation.Web/wwwroot/js/town-nexus-variants.js');
const { NEXUS_VARIANTS, isNexusMagicPixel, recolorNexusPixel } =
    await import('data:text/javascript,' + encodeURIComponent(moduleSource));

const classes = ['fire', 'frost', 'storm', 'arcane', 'death', 'binding'];
const spellPurple = [174, 86, 216];

test('six canonical Divine schools have one Nexus color each', () => {
    assert.deepEqual(Object.keys(NEXUS_VARIANTS), classes);
    const gameEnum = source('src/Wyrmforge.Domain/Progression/PassiveTree/PassiveSchool.cs');
    for (const name of classes) assert.match(gameEnum, new RegExp('\\b' + name[0].toUpperCase() + name.slice(1) + '\\b'));
});

test('Arcane is the exact original painting; no magic pixels are replaced', () => {
    assert.equal(recolorNexusPixel(...spellPurple, 'arcane', 24, 310, 117), null);
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    assert.match(scene, /displaySchool != PassiveSchool.Arcane/);
    assert.match(scene, /refuge-town-night-base/);
});

test('magic source pixels take on all five other school hues', () => {
    assert.ok(isNexusMagicPixel(...spellPurple, 310, 117));
    for (const school of classes.filter(name => name !== 'arcane')) {
        const rgb = recolorNexusPixel(...spellPurple, school, 0, 310, 117);
        assert.ok(rgb, school);
        assert.ok(rgb.every(value => value >= 0 && value <= 255));
    }
    const [fr, fg, fb] = recolorNexusPixel(...spellPurple, 'fire', 0, 310, 117);
    assert.ok(fr > fg * 1.5 && fr > fb * 1.5, 'Fire must be red, not the old yellow-orange');
    const [ir, ig, ib] = recolorNexusPixel(...spellPurple, 'frost', 0, 310, 117);
    assert.ok(ib > ir && ig > ir, 'Frost must be icy blue');
    const [sr, sg, sb] = recolorNexusPixel(...spellPurple, 'storm', 0, 310, 117);
    assert.ok(sr > sb && sg > sb, 'Storm must be yellow, not blue');
    const [dr, dg] = recolorNexusPixel(...spellPurple, 'death', 0, 310, 117);
    assert.ok(dg > dr, 'Death must be sickly green');
    const [br, bg, bb] = recolorNexusPixel(...spellPurple, 'binding', 0, 310, 117);
    assert.ok(bg > br && bb > br, 'Binding must be teal');
});

test('architecture and non-Nexus portions of the panorama are never repainted', () => {
    assert.equal(recolorNexusPixel(...spellPurple, 'fire', 24, 1000, 200), null);
    assert.equal(recolorNexusPixel(...spellPurple, 'fire', 24, 310, 650), null);
    assert.equal(recolorNexusPixel(...spellPurple, 'fire', 24, 310, 353), null, 'Blacksmith boundary must never be repainted');
    assert.equal(recolorNexusPixel(95, 74, 82, 'fire', 24, 310, 117), null, 'stone must be unchanged');
    assert.equal(recolorNexusPixel(66, 118, 212, 'fire', 24, 310, 117), null, 'blue window must be unchanged');
    assert.equal(recolorNexusPixel(210, 85, 59, 'fire', 24, 310, 117), null, 'torch must be unchanged');
});

test('real magic is dim at zero investment, grows with mastery, and saturates at cap', () => {
    const initial = recolorNexusPixel(...spellPurple, 'fire', 0, 310, 117);
    const learned = recolorNexusPixel(...spellPurple, 'fire', 12, 310, 117);
    const mastered = recolorNexusPixel(...spellPurple, 'fire', 24, 310, 117);
    const excess = recolorNexusPixel(...spellPurple, 'fire', 240, 310, 117);
    assert.ok(Math.max(...initial) < Math.max(...learned));
    assert.ok(Math.max(...learned) < Math.max(...mastered));
    assert.deepEqual(excess, mastered);
});

test('Debug preview is isolated from character school and other building unlocks', () => {
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const forge = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    const debug = source('src/Wyrmforge.Presentation.Web/Features/Forge/DebugResetCharacter.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(debug, /OnNexusPreviewChanged\.InvokeAsync\(school\)/);
    assert.match(town, /NexusArtworkUnlocked => NexusUnlocked \|\| NexusPreviewSchool is not null/);
    assert.match(town, /data-nexus-preview-school="auto"/);
    assert.match(town, /OnBuilding\.InvokeAsync\("build"\)/);
    assert.match(forge, /NexusSchool="@TownNexusSchool"/);
    assert.match(forge, /NexusPreviewSchool="@nexusPreviewSchool"/);
    assert.match(forge, /\(nexusPreviewSchool \?\? TownNexusSchool\)/);
    for (const name of ['Blacksmith', 'Codex', 'HallOfFame'])
        assert.match(town, new RegExp('night-vacant-' + name));
    assert.match(css, /\.refuge-town-nexus-pixels/);
    assert.doesNotMatch(css, /\.refuge-town-night-base\s*\{[^}]*filter:/);
});

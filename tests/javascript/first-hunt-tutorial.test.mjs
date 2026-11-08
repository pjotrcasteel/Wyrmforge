import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = path => readFileSync(join(process.cwd(), path), 'utf8');

test('first-Hunt guidance reacts to gameplay and never blocks movement', () => {
    const arena = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor');
    const behavior = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.cs');
    const css = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.css');
    assert.match(arena, /data-tutorial="first-hunt"/);
    assert.match(behavior, /if \(FirstHunt && MapCombatActive && !snapshot.Ended && !hadHuntEntrance\)/);
    assert.match(behavior, /simulation\?\.HuntEntranceActive == true/);
    assert.match(behavior, /Math.Abs\(movementX\) \+ Math.Abs\(movementY\)/);
    assert.match(behavior, /current.CurrentMapNodeKills > 0/);
    assert.match(behavior, /firstHuntHintAdvanced \|\| hadHuntEntrance && !current.HuntEntranceActive/);
    assert.match(css, /\.first-hunt-hint\s*\{[^}]*pointer-events:\s*none/s);
});

test('first upgrade teaches temporary and permanent power without changing reward selection', () => {
    const arena = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor');
    const behavior = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.cs');
    const upgrade = source('src/Wyrmforge.Presentation.Web/Features/LevelUp/LevelUpOverlay.razor');
    assert.match(arena, /FirstHuntFirstUpgrade="@\(FirstHunt && !firstHuntUpgradeChosen\)"/);
    assert.match(behavior, /if \(FirstHunt\) firstHuntUpgradeChosen = true/);
    assert.match(upgrade, /@if \(FirstHuntFirstUpgrade\)/);
    assert.match(upgrade, /It strengthens this Hunt; the Arcane Web grants permanent power afterward/);
    assert.match(upgrade, /@onclick="\(\) => ChooseAsync\(choice\)"/);
});

test('first-Hunt unlock button opens the Arcane Web and first-point guide until invested', () => {
    const home = source('src/Wyrmforge.Presentation.Web/Pages/Home.razor');
    const homeBehavior = source('src/Wyrmforge.Presentation.Web/Pages/Home.razor.cs');
    const forge = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    const web = source('src/Wyrmforge.Presentation.Web/Features/Forge/BuildView.razor');
    const progress = source('src/Wyrmforge.Domain/Progression/Onboarding/FirstHuntProgress.cs');
    assert.match(home, /@onclick="OpenFirstArcaneWeb">SPEND YOUR FIRST ARCANE POINT/);
    assert.match(home, /StartInFirstWeb="@firstWebRequested"/);
    assert.match(homeBehavior, /firstWebRequested = false;/);
    assert.match(homeBehavior, /firstWebRequested = true;/);
    assert.match(forge, /section = ShellSection.Build;\s*facet = NexusFacet.Web;/);
    assert.match(forge, /Progress.CompletedRuns == 1 && Selection.SpentPoints == 0/);
    assert.match(web, /FirstPointGuide && PointsLeft > 0/);
    assert.match(web, /data-tutorial="first-arcane-point"/);
    assert.match(progress, /public bool AtlasUnlocked => CompletedRuns >= 1/);
    assert.match(progress, /public bool TutorialRun => CompletedRuns == 0/);
});

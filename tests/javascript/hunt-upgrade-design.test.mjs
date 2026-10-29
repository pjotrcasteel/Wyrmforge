import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = path => readFileSync(join(process.cwd(), path), 'utf8');

test('live Hunt cards use only the temporary upgrade overlay without old Rank III ceremonies', () => {
    const markup = source('src/Wyrmforge.Presentation.Web/Features/LevelUp/LevelUpOverlay.razor');
    assert.match(markup, /data-hunt-upgrade-design="temporary"/);
    assert.match(markup, /Level > 0 && Level % 5 == 0/);
    assert.match(markup, /Choose a major power/);
    assert.match(markup, /Refine your magic/);
    assert.match(markup, /class="fateweave-reroll/);
    assert.doesNotMatch(markup, /EvolutionDraft|RANK III|evo-ceremony|SPELL EVOLUTION|IS EVOLVING/);
    const css = source('src/Wyrmforge.Presentation.Web/Features/LevelUp/LevelUpOverlay.razor.css');
    assert.doesNotMatch(css, /evolution-draft|\.evo-/, 'Legacy spell-evolution ceremony styling must not return');
    assert.match(css, /\.fateweave-reroll/, 'Temporary card rerolls must keep their mobile styling');
});

test('canonical Hunt reward service never drafts spell ranks or evolutions', () => {
    const service = source('src/Wyrmforge.Application/Runs/LevelUp/LevelChoiceService.cs');
    const start = service.indexOf('public IReadOnlyList<LevelChoice> RollForProgression(');
    const end = service.indexOf('public bool ApplyForProgression(', start);
    const roll = service.slice(start, end);
    assert.match(roll, /CreateMajorPool\(build\)/);
    assert.match(roll, /DraftRefinements\(/);
    assert.doesNotMatch(roll, /CreateEvolutionDraft|spell:\{|SpellUpgrade|NewSpell/);

    const majorStart = service.indexOf('private static List<LevelChoice> CreateMajorPool(');
    const majorEnd = service.indexOf('private static List<LevelChoice> RefinementPool(', majorStart);
    const major = service.slice(majorStart, majorEnd);
    assert.match(major, /LevelChoiceKind\.Rune/);
    assert.match(major, /LevelChoiceKind\.SchoolPower/);
    assert.doesNotMatch(major, /LevelChoiceKind\.SpellUpgrade|LevelChoiceKind\.Evolution|LevelChoiceKind\.NewSpell/);
});

test('visual rank badge describes temporary effects rather than permanent spell upgrades', () => {
    const presentation = source('src/Wyrmforge.Presentation.Web/Features/LevelUp/LevelChoicePresentation.cs');
    assert.match(presentation, /NEW HUNT POWER/);
    assert.match(presentation, /SMALL BOOST/);
    assert.match(presentation, /MAJOR • THIS RUN ONLY/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTerritoryStoryPlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-art.js';

const source = (relative) => readFileSync(new URL('../../' + relative, import.meta.url), 'utf8');

test('health HUD is readable without a question-mark button or blocking popover', () => {
    const markup = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor');
    const codebehind = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.cs');
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/arena-performance.js');
    assert.match(markup, /class="combat-hp-value">♥ HP 100\/100/);
    assert.match(markup, /class="combat-health-track" role="progressbar" aria-label="Health"/);
    assert.doesNotMatch(markup, /healthHelpOpen|combat-health-help|Explain health|How health works/);
    assert.doesNotMatch(codebehind, /healthHelpOpen/);
    assert.match(js, /healthFraction <= \.25 \? 'critical'/);
    assert.match(js, /aria-valuenow/);
});

test('the same overarching biome produces three distinct full-sized district compositions', () => {
    const context = { seed: 1204, biome: 'Ashen caldera', element: 'fire', stage: 3 };
    const plans = ['causeway', 'sanctuary', 'rift'].map(district => createTerritoryStoryPlan({ ...context, district }, 950, 2100));
    assert.deepEqual(plans.map(plan => plan.district), ['causeway', 'sanctuary', 'rift']);
    assert.notDeepEqual(plans[0].landmarks, plans[1].landmarks);
    assert.notDeepEqual(plans[1].landmarks, plans[2].landmarks);
    assert.equal(plans[0].element, plans[1].element);
    assert.equal(plans[0].biome, plans[2].biome);
    assert.ok(plans.every(plan => plan.width === 950 && plan.height === 2100));
});

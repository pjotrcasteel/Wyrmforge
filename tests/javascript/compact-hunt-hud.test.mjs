import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { clampHudFraction, cooldownPresentation, selectCombatSlots }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/combat-hud-state.js';

const source = path => readFileSync(join(process.cwd(), path), 'utf8');

test('cooldown ring is ready without a cast and tracks actual remaining time', () => {
    assert.deepEqual(cooldownPresentation(0, 0), {
        readyDegrees: 360, shadeDegrees: 0, text: '', recovering: false,
    });
    assert.deepEqual(cooldownPresentation(3.5, 7), {
        readyDegrees: 180, shadeDegrees: 180, text: '3.5s', recovering: true,
    });
    assert.deepEqual(cooldownPresentation(7, 7), {
        readyDegrees: 0, shadeDegrees: 360, text: '7.0s', recovering: true,
    });
    assert.equal(cooldownPresentation(12.2, 15).text, '13s');
    assert.deepEqual(cooldownPresentation(Number.NaN, 7), cooldownPresentation(0, 0));
    assert.equal(cooldownPresentation(0.01, 7).recovering, false);
    assert.equal(clampHudFraction(2), 1);
    assert.equal(clampHudFraction(-.5), 0);
});

test('only the committed primary and prepared contextual defensive slot are shown', () => {
    const fire = { name: 'Fire Bolt', isActive: true, contextual: false };
    const knowledge = { name: 'Frost Shard', isActive: false, contextual: false };
    const ward = { name: 'Warding Pulse', isActive: true, contextual: true };
    assert.deepEqual(selectCombatSlots([knowledge, fire]), { primary: fire, defensive: null });
    assert.deepEqual(selectCombatSlots([knowledge, fire, ward]), { primary: fire, defensive: ward });
    assert.deepEqual(selectCombatSlots(undefined), { primary: null, defensive: null });
});

test('approved HUD has no top bar and no invented secondary resource', () => {
    const markup = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor');
    const behavior = source('src/Wyrmforge.Presentation.Web/wwwroot/js/arena-performance.js');
    const domain = source('src/Wyrmforge.Application/Runs/Simulation/RunSimulation.cs');
    const css = source('src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.css');
    assert.doesNotMatch(markup, /class="arena-top-hud"/);
    assert.match(markup, /class="combat-health-track crystal-orb orb-health"/);
    assert.match(markup, /data-hud="health-fill"/);
    assert.match(markup, /class="crystal-orb orb-secondary"/);
    assert.doesNotMatch(markup.match(/<div class="crystal-orb orb-secondary"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '', /data-hud=".*"/);
    assert.match(markup, /data-hud="defensive-spell"/);
    assert.match(markup, /class="arcane-xp-row"/);
    assert.match(behavior, /dom\.healthFill\.style\.height/);
    assert.match(behavior, /updateText\(dom\.xpValue/);
    assert.match(domain, /PrimaryCooldownRemaining = Math\.Max/);
    assert.match(domain, /DefensiveCooldownRemaining = contextualPolicy is null/);
    assert.match(css, /art\/arcane-nexus\/socket-rim\.svg/);
    assert.match(css, /\.arcane-hunt-hud\s*\{[^}]*bottom:/s);
});

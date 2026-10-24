import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = 'src/Wyrmforge.Presentation.Web/';
const markup = readFileSync(root + 'Features/Forge/CanonicalTownView.razor', 'utf8');
const host = readFileSync(root + 'Features/Forge/ForgeView.razor', 'utf8');
const html = readFileSync(root + 'wwwroot/index.html', 'utf8');

test('Refuge is night-only, without Day / Auto controls or time-based JS', () => {
    assert.match(markup, /src="art\/town\/night-active\.webp\?v=140"/);
    assert.doesNotMatch(markup, /day-active\.webp/);
    assert.doesNotMatch(host, /<TownLightingSettings\s*\/>/);
    assert.doesNotMatch(html, /<script[^>]+js\/town-lighting\.js/);
});

test('saved Day/Auto preferences cannot change current town art', () => {
    // Former preferences remain harmless in localStorage; there is no script
    // executing the old override, and markup always starts from the night art.
    assert.doesNotMatch(host, /wyrmforgeTownLighting/);
    assert.match(markup, /night-vacant-Blacksmith\.png\?v=140/);
    assert.match(markup, /night-vacant-ArcaneNexus\.png\?v=140/);
    assert.match(markup, /night-vacant-Codex\.png\?v=140/);
    assert.match(markup, /night-vacant-HallOfFame\.png\?v=140/);
});

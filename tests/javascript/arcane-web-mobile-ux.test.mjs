import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const source = path => readFileSync(new URL(path, root), 'utf8');

test('Arcane Web opens at readable progression scale rather than full overview', () => {
    const js = source('src/Wyrmforge.Presentation.Web/wwwroot/js/arcane-web.js');
    const initialize = js.slice(js.indexOf('function initialize('), js.indexOf('function zoom('));
    assert.match(initialize, /reset\(viewport\);\s*\}/);
    assert.doesNotMatch(initialize, /overview\(viewport\);\s*\}/);
});

test('Selecting the same node twice never spends points', () => {
    const code = source('src/Wyrmforge.Presentation.Web/Features/Forge/BuildView.razor.cs');
    const inspect = code.slice(code.indexOf('private async Task InspectNode('), code.indexOf('private string? allocationFeedback;'));
    assert.doesNotMatch(inspect, /AllocateFocusedRoute\(/);
    assert.match(inspect, /inspectorOpen && focusedId == node.Id/);
});

test('The first-point guide explains explicit unlocking', () => {
    const view = source('src/Wyrmforge.Presentation.Web/Features/Forge/BuildView.razor');
    assert.match(view, /use Unlock to spend points/);
    assert.match(view, /@onclick="AllocateFocusedRoute"/);
});

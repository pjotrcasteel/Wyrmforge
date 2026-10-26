import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const razor = read('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
const css = read('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
const bridge = read('src/Wyrmforge.Presentation.Web/wwwroot/js/town-live-relighting.js');
const preview = read('src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js');

test('real Town GPU preview is strictly query-gated and never replaces original art', () => {
    assert.match(razor, /townGpuPreview=1/);
    assert.match(razor, /showTownGpuPreview\s*=\s*!showTownV2\s*&&/);
    assert.match(razor, /@if\s*\(showTownGpuPreview\s*&&\s*!showTownV2\)/);
    assert.match(razor, /art\/town\/night-active\.webp/);
    assert.match(razor, /refuge-town-gpu-canvas/);
    assert.match(razor, /mountTownLiveGpuPreview/);
    assert.match(razor, /disposeTownLiveGpuPreview/);
    assert.match(razor, /<RefugeTownActors\s+Crowd="crowd"/);
    assert.match(razor, /data-town-building="build"/);
    assert.match(razor, /data-town-building="forge"/);
    assert.match(razor, /data-town-building="codex"/);
    assert.match(razor, /data-town-building="legends"/);
});

test('opt-in canvas remains noninteractive and visible only after confirmed GPU readiness', () => {
    assert.match(css, /\.refuge-town-gpu-canvas\s*\{[^}]*visibility:hidden[^}]*pointer-events:none/s);
    assert.match(css, /\[data-town-gpu-preview="ready"\] \.refuge-town-gpu-canvas\s*\{[^}]*visibility:visible/s);
    assert.match(css, /\[data-town-gpu-preview="ready"\] \.refuge-town-night-base/s);
    assert.match(css, /\[data-town-gpu-preview="ready"\] \.refuge-town-citizen/s);
    assert.match(css, /\[data-town-gpu-preview="ready"\] \.refuge-town-scenery-foreground/s);
    assert.doesNotMatch(css.slice(css.indexOf('G4/T2 AUTHOR-ONLY')), /filter\s*:|mix-blend-mode|brightness\(/);
});

test('opt-in integration never schedules a second citizen simulation', () => {
    assert.match(bridge, /readTownCitizensFromDom\(scene\)/);
    assert.match(bridge, /updateTownPreviewCitizens\(canvas, citizens\)/);
    assert.match(bridge, /new MutationObserver/);
    assert.match(bridge, /cancelAnimationFrame/);
    assert.match(bridge, /disposeTownPreview/);
    assert.match(bridge, /scene\.dataset\.townGpuPreview = 'failed'/);
    assert.doesNotMatch(bridge, /setInterval|setTimeout|new PeriodicTimer|\.Step\(/);
    assert.match(preview, /state\.citizens\s*\?\?/);
    assert.match(preview, /export function updateTownPreviewCitizens/);
});

test('the original navigation and touch handlers remain in the existing Town implementation', () => {
    assert.match(css, /\.refuge-canonical-viewport\s*\{[^}]*touch-action:pan-x/s);
    assert.match(css, /\.refuge-town-spot\s*\{[^}]*pointer-events|\.refuge-town-spot\s*\{/);
    assert.match(razor, /SelectTownRouteCitizen/);
    assert.match(razor, /crowd\.Navigation\.Occluders/);
});

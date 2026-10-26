import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileTownLightingSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { townPreviewManifest } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { gradeTownPreviewLighting, TOWN_NIGHT_LIGHT_GRADE } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-lighting-grade.js';
import { selectLights } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Town G4 native visual review does not upscale a low resolution framebuffer', () => {
    const preview = read('src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js');
    const html = read('src/Wyrmforge.Presentation.Web/wwwroot/town-relighting-preview.html');
    const css = read('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    const engine = read('src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/engine.js');
    assert.match(preview, /maxFramebufferWidth:\s*TOWN_ART_SIZE\[0\]/);
    assert.equal((preview.match(/state\.engine\.render\(TOWN_ART_SIZE\[0\], TOWN_ART_SIZE\[1\]\)/g) ?? []).length, 2,
        'Both lit pass and diagnostic pass must use native source resolution');
    assert.match(preview, /Town review requires native-source GPU framebuffer resolution/);
    assert.match(html, /canvas\s*\{[^}]*image-rendering:\s*auto/s);
    const gpuCss = css.slice(css.indexOf('G4/T2 AUTHOR-ONLY'));
    assert.match(gpuCss, /image-rendering:auto/);
    assert.doesNotMatch(gpuCss, /image-rendering:pixelated/);
    assert.match(engine, /maxFramebufferWidth = 390/,
        'Do not increase the generic renderer budget in Hunts or unrelated scenes');
});

test('Town night illumination is cooler, legible and avoids saturated local lamps', () => {
    const manifest = townPreviewManifest();
    const snapshot = gradeTownPreviewLighting(
        compileTownLightingSnapshot(manifest, { mode: 'night' }), 'night');
    assert.equal(snapshot.environment.ambient, TOWN_NIGHT_LIGHT_GRADE.ambient);
    assert.equal(snapshot.environment.color, TOWN_NIGHT_LIGHT_GRADE.color);
    assert.ok(snapshot.environment.ambient >= .15 && snapshot.environment.ambient < .35);
    assert.deepEqual(snapshot.lights.map(l => l.intensity),
        [TOWN_NIGHT_LIGHT_GRADE.centralIntensity,
            TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity, TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity]);
    assert.ok(snapshot.lights.every(l => l.intensity <= 2.5));
    assert.ok(snapshot.lights.every(l => l.color === TOWN_NIGHT_LIGHT_GRADE.lanternColor));
    assert.equal(selectLights(snapshot).find(l => l.shadow)?.id, 'noticeboard-lantern');
});

test('Daylight removes extra orange lantern pools and absolute-zero world stays black', () => {
    const manifest = townPreviewManifest();
    const day = gradeTownPreviewLighting(
        compileTownLightingSnapshot(manifest, { mode: 'day' }), 'day');
    assert.deepEqual(selectLights(day), []);
    const zero = gradeTownPreviewLighting(
        compileTownLightingSnapshot(manifest, { mode: 'zero' }), 'zero');
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(selectLights(zero), []);
});

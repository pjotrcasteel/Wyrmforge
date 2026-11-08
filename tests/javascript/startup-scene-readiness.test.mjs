import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isTownStructureReady, decodeImage } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/startup-scene-readiness.js';

const source = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function scene({ navigation = 'true', cutouts = 8, cutoutsStatus = 'ready', base = true, v2 = false } = {}) {
    return {
        dataset: { townCutoutsStatus: cutoutsStatus },
        getAttribute(name) { return name === 'data-town-navigation-ready' ? navigation : null; },
        querySelector(selector) {
            if (selector === '.refuge-town-night-base') return base ? { naturalWidth: 1672 } : null;
            if (selector === '[data-town-v2-canvas]') return v2 ? {} : null;
            if (selector === '[data-town-v2-status]') return { textContent: v2 ? 'READY' : '' };
            return null;
        },
        querySelectorAll(selector) {
            if (selector === '[data-town-cutout]') return Array.from({ length: cutouts }, () => ({}));
            return [];
        }
    };
}

test('town readiness rejects missing navigation, panorama or foreground construction', () => {
    assert.equal(isTownStructureReady(null), false);
    assert.equal(isTownStructureReady(scene({ navigation: 'false' })), false);
    assert.equal(isTownStructureReady(scene({ base: false })), false);
    assert.equal(isTownStructureReady(scene({ cutoutsStatus: 'loading' })), false);
    assert.equal(isTownStructureReady(scene()), true);
    assert.equal(isTownStructureReady(scene({ cutouts: 0 })), true,
        'missing optional crowd does not prevent the painted town from loading');
    assert.equal(isTownStructureReady(scene({ cutoutsStatus: 'fallback' })), true,
        'failed optional cutouts explicitly keep the already loaded original painting');
});

test('town image decode is real and a broken image cannot silently unlock the gate', async () => {
    let decoded = false;
    await decodeImage({ complete: true, naturalWidth: 1672, async decode() { decoded = true; } });
    assert.equal(decoded, true);
    await assert.rejects(decodeImage({ complete: true, naturalWidth: 0, src: 'broken.webp' }),
        /failed to load/);
    await assert.rejects(decodeImage({
        complete: false, naturalWidth: 0, async decode() { throw new Error('decode failed'); }
    }), /decode failed/);
});

test('startup ignition holds until restored home and the exact first scene are ready', () => {
    const html = source('src/Wyrmforge.Presentation.Web/wwwroot/index.html');
    const home = source('src/Wyrmforge.Presentation.Web/Pages/Home.razor');
    const state = source('src/Wyrmforge.Presentation.Web/Pages/Home.razor.cs');
    const town = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const cutouts = source('src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js');
    const forge = source('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor');
    const startup = source('src/Wyrmforge.Presentation.Web/wwwroot/js/startup-scene-readiness.js');

    assert.match(html, /if \(isHomeRoute\(\)\) \{[\s\S]*?await sceneReadiness\.waitForInitialScene\(\)/);
    assert.doesNotMatch(html, /splash\.remove\(\)/, 'reuse ignition to cover entering town');
    assert.match(home, /data-wyrmforge-home-loaded/);
    assert.match(state, /startupDataReady = true;[\s\S]*?StateHasChanged\(\)/);
    assert.match(town, /data-town-navigation-ready=/);
    assert.match(cutouts, /scene\.dataset\.townCutoutsStatus = complete \? "ready" : "fallback"/);
    assert.match(startup, /await Promise\.all\(\[\.\.\.images\.map\(decodeImage\), decodeSvgSources\(svgSources\)\]\)/);
    assert.match(startup, /await afterPaint\(\)/);
    assert.match(forge, /wyrmforgeStartup\.beginTown/);
    assert.match(forge, /wyrmforgeStartup\.beginTown", true/);
    assert.match(html, /requireTown \? sceneReadiness\.waitForTownScene\(\) : sceneReadiness\.waitForTownOrCreation\(\)/);
    assert.match(html, /if \(isHomeRoute\(\)\)/, 'lab routes must not wait for town');
});

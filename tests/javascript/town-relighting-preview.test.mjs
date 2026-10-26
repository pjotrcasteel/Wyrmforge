import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTOUTS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/refuge-foreground-cutouts.js';
import { compileTownLightingSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { townPreviewManifest, townPreviewProjection, TOWN_PREVIEW_SOURCE }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { selectLights } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

test('Town preview references only original approved day painting; production nighttime art remains untouched', () => {
    assert.equal(TOWN_PREVIEW_SOURCE, 'art/town/day-active.webp');
    const manifest = townPreviewManifest();
    assert.deepEqual(manifest.artSize, [1672, 941]);
    assert.equal(manifest.layers[0].material, 'approved-day-reference');
    assert.equal(manifest.layers[1].material, 'town-level-paving');
    assert.equal(manifest.layers[1].geometry, 'approved-panorama-plane');
    assert.equal(manifest.materials[1].normal, 'town-paving-flat-normal');
    assert.equal(manifest.layers[0].geometry, 'approved-panorama-plane');
    assert.equal(manifest.materials[0].albedo, 'town-day-background');
    assert.equal(manifest.materials[1].albedo, 'town-day-paving');
});

test('GPU image plane has the canonical painting aspect and stable source-pixel anchors', () => {
    const left = townPreviewProjection(0, 0), right = townPreviewProjection(1672, 0);
    const bottom = townPreviewProjection(0, 941);
    const norm = v => Math.hypot(...v);
    const difference = (a,b) => a.map((v,i) => v-b[i]);
    assert.ok(Math.abs(norm(difference(right,left))-16) < 1e-8);
    assert.ok(Math.abs(norm(difference(bottom,left))-16*941/1672) < 1e-8);
    assert.ok(norm(townPreviewProjection(836, 470.5)) < 1e-8);
});

test('all authored NPC foreground alpha paths become independent GPU shadow casters', () => {
    const manifest = townPreviewManifest();
    assert.equal(manifest.layers.length, 2 + CUTOUTS.length);
    assert.equal(manifest.materials.length, 2 + CUTOUTS.length);
    const ids = new Set(manifest.layers.map(l=>l.id));
    assert.equal(ids.size, manifest.layers.length);
    for (const cutout of CUTOUTS) {
        const layer = manifest.layers.find(l=>l.id === 'foreground-'+cutout.id);
        assert.deepEqual(layer.artBounds, [cutout.x,cutout.y,cutout.width,cutout.height]);
        assert.equal(layer.occluderGeometry, 'approved-foreground-caster-'+cutout.id);
        assert.equal(layer.castsShadow, true);
        assert.match(cutout.path, /^M/);
        assert.ok(!/[^\dMLZ.\s-]/i.test(cutout.path), 'shape has only traced M/L/Z commands');
    }
});

test('G1–G3 registry sees all three lantern sources; zero diagnostic removes them completely', () => {
    const m = townPreviewManifest();
    const night = compileTownLightingSnapshot(m, { state:{},mode:'night' });
    assert.equal(selectLights(night).length, 3);
    assert.equal(night.objects.length, 2 + CUTOUTS.length);
    const zero = compileTownLightingSnapshot(m, { state:{},mode:'zero' });
    assert.equal(zero.environment.emission, false);
    assert.equal(zero.environment.ambient, 0);
    assert.deepEqual(selectLights(zero), []);
    assert.deepEqual(zero.objects, night.objects);
});

test('changing a fixture descriptor requires no Town-specific shader behavior', () => {
    const m=townPreviewManifest();
    m.fixtures[0].position[0]+=1;
    const sample=compileTownLightingSnapshot(m,{state:{},mode:'night'});
    assert.equal(sample.lights[0].position[0],m.fixtures[0].position[0]);
    assert.equal(sample.lights[0].artAnchor,undefined);
});

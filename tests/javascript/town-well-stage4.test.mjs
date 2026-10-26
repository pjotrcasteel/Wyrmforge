import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTownLightingSnapshot } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { selectLights } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';
import { townPreviewManifest } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import {
    WELL_STAGE4, WELL_STAGE4_CASTER_PATHS, STAGE4_REPLACED_CUTOUT_IDS,
    stage4WellLayer, stage4WellLight, stage4WellMaterial,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-well-stage4.js';

const project = (x, y) => [(x - 836) / 104.5, (470.5 - y) / 104.5, 0];
const toward = [0, 0, 1];

test('Stage 4 does not flatten transparent well into opaque square or reintroduce old cobblestone ring', () => {
    assert.deepEqual(WELL_STAGE4.artSize, [1672, 941]);
    assert.deepEqual(WELL_STAGE4.sprite, { x: 697, y: 357, width: 255, height: 207 });
    assert.deepEqual(WELL_STAGE4.foot, { x: 819, y: 564 });
    assert.equal(WELL_STAGE4.frontDepthY, 564);
    assert.equal(STAGE4_REPLACED_CUTOUT_IDS.length, 5);
    const m = townPreviewManifest({ wellV4: true });
    assert.equal(m.layers.filter(l => l.id === 'stage4-remade-well').length, 1);
    assert.ok(!m.layers.some(l => STAGE4_REPLACED_CUTOUT_IDS.some(
        id => l.id === 'foreground-' + id)));
    assert.ok(m.materials.some(x => x.albedo === 'stage4-well-albedo'));
    assert.ok(!m.fixtures.some(x => x.id === 'noticeboard-lantern'));
    assert.deepEqual(m.layers.find(l => l.id === 'stage4-remade-well').artBounds,
        [697, 357, 255, 207]);
    const scene = compileTownLightingSnapshot(m, { mode: 'night' });
    assert.equal(scene.objects.filter(x => x.id === 'stage4-remade-well').length, 1);
});

test('Only roof and structural posts cast real GPU shadows; stone floor and planters never cast', () => {
    assert.deepEqual(Object.keys(WELL_STAGE4_CASTER_PATHS),
        ['roof', 'leftPost', 'rightPost', 'boardLeftPost', 'boardRightPost']);
    assert.equal(WELL_STAGE4_CASTER_PATHS.roof.length, 11);
    for (const path of Object.values(WELL_STAGE4_CASTER_PATHS))
        for (const [x, y] of path) {
            assert.ok(x >= 0 && x <= 255 && y >= 0 && y <= 207);
        }
    const layer = stage4WellLayer(project, toward);
    assert.equal(layer.occluderGeometry, 'stage4-well-caster-proxies');
    assert.equal(layer.castsShadow, true);
    assert.equal(layer.receivesShadow, true);
    assert.deepEqual(layer.artBounds, [697, 357, 255, 207]);
    assert.equal(stage4WellMaterial().emissionIntensity, 0);
});

test('Remade lantern uses one movable G1/G3 spot source and the existing mobile shadow budget', () => {
    const fixture = stage4WellLight(project, toward);
    assert.equal(fixture.type, 'spot');
    assert.deepEqual(fixture.artAnchor, [917, 439]);
    assert.equal(fixture.castsShadow, true);
    assert.equal(fixture.penumbra, .7);
    assert.equal(fixture.priority, 4);
    const original = townPreviewManifest({ wellV4: true });
    const scene = compileTownLightingSnapshot(original, { mode: 'night' });
    const selected = selectLights(scene, 8, 8);
    assert.equal(selected.find(x => x.id === 'stage4-well-lantern').shadow, true);
    assert.equal(selected.find(x => x.id === 'stage4-well-lantern').shadowViews, 1);
    assert.deepEqual(selected.filter(x => x.shadow).map(x => x.id), ['stage4-well-lantern'],
        'Only the new well geometry may cast a new T2 shadow');
    assert.deepEqual(stage4WellLight(project, toward, { offset: 30 }).artAnchor, [947, 439]);
    assert.equal(stage4WellLight(project, toward, { enabled: false }).enabled, false);
    assert.throws(() => stage4WellLight(project, toward, { offset: 400 }), /controls/);
    assert.throws(() => stage4WellLayer(project, [0, 0, .6]), /unit-length/);
});

test('Stage 4 zero-light removes all well sources and all object emissive intensity', () => {
    const zero = compileTownLightingSnapshot(townPreviewManifest({ wellV4: true }), { mode: 'zero' });
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(selectLights(zero), []);
});

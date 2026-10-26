import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTownLightingSnapshot } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { townPreviewManifest } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { TOWN_NIGHT_LIGHT_GRADE, gradeTownPreviewLighting } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-lighting-grade.js';
import { selectLights } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

test('night Town remains visible without giant orange light pools', () => {
    const original = compileTownLightingSnapshot(townPreviewManifest(), { mode: 'night' });
    const night = gradeTownPreviewLighting(original, 'night');
    assert.ok(original.environment.ambient < .03, 'Old night profile is near-black');
    assert.ok(night.environment.ambient >= .15 && night.environment.ambient <= .3,
        'Night needs a subtle cool fill, not full daylight');
    assert.equal(night.environment.color, TOWN_NIGHT_LIGHT_GRADE.color);
    assert.deepEqual(night.lights.map(x => x.intensity),
        [TOWN_NIGHT_LIGHT_GRADE.centralIntensity, TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity,
            TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity]);
    assert.ok(night.lights.every(x => x.range <= 4 && x.color === '#ffdab7'));
    assert.equal(selectLights(night, 8).filter(x => x.shadow)[0].id, 'noticeboard-lantern');
    assert.ok(night.lights.every(x => x.intensity < 3), 'No runaway glowing orange town');
    assert.equal(original.environment.ambient, .012, 'Shared global defaults are never mutated');
});

test('day Town uses cool ambient daylight without duplicated lantern glow', () => {
    const original = compileTownLightingSnapshot(townPreviewManifest(), { mode: 'day' });
    const day = gradeTownPreviewLighting(original, 'day');
    assert.equal(day.environment.ambient, original.environment.ambient);
    assert.deepEqual(selectLights(day), []);
    assert.equal(original.lights.filter(x => x.enabled).length, 3);
});

test('zero light is strictly black even when the ambient night grade exists', () => {
    const zero = gradeTownPreviewLighting(
        compileTownLightingSnapshot(townPreviewManifest(), { mode: 'zero' }), 'zero');
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(selectLights(zero), []);
    const invalid = structuredClone(zero);
    invalid.environment.ambient = .2;
    assert.throws(() => gradeTownPreviewLighting(invalid, 'zero'), /zero-light/);
    assert.throws(() => gradeTownPreviewLighting(zero, 'invalid'), /Unknown/);
});

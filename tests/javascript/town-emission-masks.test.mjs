import test from 'node:test';
import assert from 'node:assert/strict';
import { emissionMaskPixels, TOWN_EMISSION_PLATES, TOWN_EMISSION_REGIONS }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-emission-masks.js';
import { townPreviewManifest } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';

const plate = (domain, x, y) => ({ domain, x, y, width: 4, height: 4 });
const pixels = (r, g, b) => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
    }
    return data;
};

test('Four building plates match canonical registered 1672x941 image bounds', () => {
    assert.deepEqual(TOWN_EMISSION_PLATES.map(x => x.domain),
        ['nexus', 'blacksmith', 'codex', 'hall']);
    for (const descriptor of TOWN_EMISSION_PLATES) {
        assert.ok(descriptor.x >= 0 && descriptor.y >= 0);
        assert.ok(descriptor.x + descriptor.width <= 1672);
        assert.ok(descriptor.y + descriptor.height <= 941);
        for (const region of Object.values(TOWN_EMISSION_REGIONS[descriptor.domain]).flat()) {
            assert.equal(region.length, 4);
            assert.ok(region[0] >= descriptor.x && region[1] >= descriptor.y);
        }
    }
});

test('Warm building window emits only if brighter than matching vacant pixels', () => {
    const match = plate('nexus', 100, 195);
    const active = pixels(240, 146, 48);
    const vacant = pixels(15, 10, 8);
    const emission = emissionMaskPixels(active, vacant, 4, 4, match, 'warm');
    assert.ok(emission[3] === 255 && emission[0] > emission[2]);
    const unlit = emissionMaskPixels(vacant, vacant, 4, 4, match, 'warm');
    assert.ok(unlit.every(x => x === 0), 'the renderer cannot turn unlit source art into illumination');
});

test('Dark cloth and blue spell pixels do not become warm windows', () => {
    const cloth = emissionMaskPixels(pixels(36, 46, 130), pixels(5, 5, 5),
        4, 4, plate('nexus', 100, 195), 'warm');
    assert.ok(cloth.every(x => x === 0));
    const magic = emissionMaskPixels(pixels(90, 124, 248), pixels(2, 2, 3),
        4, 4, plate('nexus', 400, 275), 'magic');
    assert.equal(magic[3], 255);
    assert.equal(magic[0], magic[1]);
    assert.equal(magic[1], magic[2], 'magic map is neutral, school tint is runtime material state');
});

test('Outside authored aperture region never emits regardless of RGB delta', () => {
    const mask = emissionMaskPixels(pixels(255, 155, 38), pixels(0, 0, 0),
        4, 4, plate('codex', 1000, 20), 'warm');
    assert.ok(mask.every(x => x === 0));
    assert.throws(() => emissionMaskPixels(new Uint8ClampedArray(7), pixels(0, 0, 0),
        4, 4, plate('codex', 1000, 20), 'warm'), /Invalid authored/);
});

test('Five GPU emissive layers use one generic world material pipeline', () => {
    const original = townPreviewManifest();
    const integrated = townPreviewManifest({ domains: true });
    assert.ok(!original.layers.some(x => x.emissionKind));
    const apertures = integrated.layers.filter(x => x.emissionKind);
    assert.equal(apertures.length, 5);
    for (const aperture of apertures) {
        assert.equal(aperture.castsShadow, false);
        assert.equal(aperture.receivesShadow, false);
        assert.match(aperture.ownerId, /^town-(nexus|blacksmith|codex|hall)$/);
        const material = integrated.materials.find(m => m.id === aperture.material);
        assert.ok(material.emissiveMap && material.emissionIntensity > 0);
    }
});


test('Four neutral day-vacant GPU diffuse surfaces have exact canonical atlas bounds', () => {
    const scene = townPreviewManifest({ domains: true });
    const base = townPreviewManifest();
    const diffuse = scene.layers.filter(layer => layer.diffuseDomain);
    assert.equal(diffuse.length, 4);
    assert.equal(base.layers.filter(layer => layer.diffuseDomain).length, 0);
    for (const plate of TOWN_EMISSION_PLATES) {
        const key = 'town-diffuse-' + plate.domain;
        const layer = diffuse.find(x => x.id === key);
        assert.ok(layer, key);
        assert.equal(layer.ownerId, 'town-' + plate.domain);
        assert.deepEqual(layer.artBounds, [plate.x, plate.y, plate.width, plate.height]);
        assert.equal(layer.castsShadow, false, 'No new fake building caster geometry');
        assert.equal(layer.receivesShadow, true);
        const surface = scene.materials.find(x => x.id === key + '-material');
        assert.equal(surface.albedo, key + '-albedo');
        assert.equal(surface.emissionIntensity, 0);
        assert.equal(surface.reflection, 'off');
        assert.ok(surface.roughness >= .9);
    }
    assert.equal(scene.layers[0].material, base.layers[0].material,
        'Night scenic backing is retained; never substituted by daytime sky');
    assert.equal(scene.layers[1].material, base.layers[1].material,
        'Both versions retain one canonical-pixel paving receiving plane');
});

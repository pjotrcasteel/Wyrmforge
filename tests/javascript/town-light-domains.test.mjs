import test from 'node:test';
import assert from 'node:assert/strict';
import {
    TOWN_LIGHT_DOMAINS, TOWN_NEXUS_SCHOOL_LIGHTS,
    createTownDomainFixtures, configureTownLightDomains,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-light-domains.js';
import { compileTownLightingSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';
import { townPreviewManifest, townPreviewProjection } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { selectLights } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const unlocked = { nexusUnlocked: true, forgeUnlocked: true, codexUnlocked: true, hallUnlocked: true };
const vacant = { nexusUnlocked: false, forgeUnlocked: false, codexUnlocked: false, hallUnlocked: false };
const fixtures = () => createTownDomainFixtures(townPreviewProjection, [0, 0, 1]);
const enabled = list => list.filter(light => light.enabled);
const config = (isolation, unlocks = unlocked, extra = {}) =>
    configureTownLightDomains(fixtures(), { isolation, unlocks, ...extra });

test('Five exclusive domains route thirty-three local lamps through the shared GPU registry', () => {
    assert.deepEqual(TOWN_LIGHT_DOMAINS, ['common', 'nexus', 'blacksmith', 'codex', 'hall']);
    const all = fixtures();
    assert.equal(all.length, 34);
    assert.equal(new Set(all.map(x => x.id)).size, all.length);
    for (const light of all) {
        assert.equal(light.ownerId, 'town-' + light.domain);
        assert.ok(light.artAnchor.every(Number.isFinite));
        assert.ok(light.position.every(Number.isFinite));
        assert.ok(!/banner|flag|cloth/i.test(light.id));
    }
    assert.equal(selectLights(compileTownLightingSnapshot(
        townPreviewManifest({ domains: true }), { mode: 'night' }), 8, 40).length, 34);
});
test('Each domain isolates only its own sources; common never enables chimney', () => {
    for (const domain of TOWN_LIGHT_DOMAINS) {
        const active = enabled(config(domain));
        assert.ok(active.length, 'Empty domain ' + domain);
        assert.ok(active.every(light => light.domain === domain));
        assert.equal(active.some(x => x.id === 'town-blacksmith-chimney'), domain === 'blacksmith');
    }
    assert.equal(enabled(config('off')).length, 0);
});
test('Vacancy suppresses all four building groups and leaves public square only', () => {
    assert.equal(enabled(config('combined', vacant)).length, 21);
    assert.ok(enabled(config('combined', vacant)).every(x => x.domain === 'common'));
    for (const key of Object.keys(vacant)) {
        const state = { ...unlocked, [key]: false };
        assert.ok(enabled(config('combined', state)).every(light =>
            light.domain !== ({ nexusUnlocked: 'nexus', forgeUnlocked: 'blacksmith',
                codexUnlocked: 'codex', hallUnlocked: 'hall' })[key]));
    }
});
test('Neutral-white magic and all six canonical schools cannot recolor other fixtures', () => {
    for (const [school, color] of Object.entries(TOWN_NEXUS_SCHOOL_LIGHTS)) {
        const lit = config('nexus', unlocked, { school, strength: .6 });
        assert.equal(lit.find(x => x.id === 'town-nexus-magic').color, color);
        assert.equal(lit.find(x => x.id === 'town-nexus-windows').color, '#ffcc93');
        assert.equal(config('nexus', unlocked, { school, neutralMagic: true })
            .find(x => x.id === 'town-nexus-magic').color, '#ffffff');
    }
});
test('Real C# mastery strength is bounded, monotonic and never becomes a second level', () => {
    const intensities = [.16, .3, .55, .86, 1].map(strength =>
        config('nexus', unlocked, { strength }).find(x => x.magic).intensity);
    assert.ok(intensities.every((v, i) => i === 0 || v >= intensities[i - 1]));
    assert.ok(Math.max(...intensities) <= 4.8);
    assert.throws(() => config('nexus', unlocked, { strength: 10 }), /radiance/);
    assert.throws(() => config('nexus', unlocked, { school: 'unknown' }), /radiance/);
});
test('Duplicate or cross-owned chimney fixtures fail before rendering', () => {
    const a = fixtures();
    a[0].id = a[1].id;
    assert.throws(() => configureTownLightDomains(a, { unlocks: unlocked }), /Duplicate/);
    const b = fixtures();
    b.find(x => x.id === 'town-blacksmith-chimney').ownerId = 'town-common';
    assert.throws(() => configureTownLightDomains(b, { unlocks: unlocked }), /Unowned/);
    assert.throws(() => configureTownLightDomains(fixtures(), { unlocks: {} }), /C# Town unlock/);
});
test('Domain lights reach same existing GPU manifest and black-world zero-light pass', () => {
    const m = townPreviewManifest({ domains: true, wellV4: true });
    configureTownLightDomains(m.fixtures, { unlocks: vacant });
    const common = compileTownLightingSnapshot(m, { mode: 'night' });
    assert.equal(common.lights.filter(x => x.enabled).length, 21);
    assert.ok(common.lights.filter(x => x.enabled).every(x => x.domain === 'common'));
    assert.equal(common.lights.find(x => x.id === 'town-blacksmith-chimney').enabled, false);
    const zero = compileTownLightingSnapshot(m, { mode: 'zero' });
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.equal(zero.lights.filter(x => x.enabled).length, 0);
});


test('Stage4 opt-in review uses the tight remade-well caster, not the old umbrella shadow', () => {
    const manifest = townPreviewManifest({ domains: true, wellV4: true });
    assert.ok(manifest.layers.some(x => x.id === 'stage4-remade-well' &&
        x.occluderGeometry === 'stage4-well-caster-proxies'));
    assert.ok(!manifest.layers.some(x => x.id === 'foreground-well-roof'));
    assert.ok(!manifest.layers.some(x => x.id === 'foreground-well-front-rim'));
    assert.equal(manifest.fixtures.find(x => x.id === 'town-gate-arch').castsShadow, false,
        'Flattened castle arch must not cast a fake black wedge across cobbles');
    assert.deepEqual(manifest.fixtures.filter(x => x.castsShadow).map(x => x.id),
        ['town-square-well'], 'Well roof/posts alone have a real T2 shadow volume');
});

test('All five previously omitted public wall and gate-foot lanterns have one common owner', () => {
    const list = fixtures();
    for (const suffix of ['gate-west-foot-lantern', 'gate-east-foot-lantern',
        'square-west-wall-lantern', 'square-east-wall-lantern', 'square-lower-west-lantern']) {
        const matches = list.filter(light => light.id === 'town-' + suffix);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].domain, 'common');
        assert.equal(matches[0].ownerId, 'town-common');
        assert.equal(config('common', vacant).find(light => light.id === matches[0].id).enabled, true);
    }
});

test('Domain paving is matte and the original well occlusion does not cast billboard block shadows', () => {
    const scene = townPreviewManifest({ domains: true });
    const ground = scene.materials.find(material => material.id === 'town-level-paving');
    assert.equal(ground.reflection, 'off');
    assert.equal(ground.specular, 0);
    assert.equal(ground.roughness, 1);
    assert.equal(ground.normal, undefined, 'No mismatched world-up normal on a camera-facing painted receiver');
    const foreground = scene.layers.filter(layer => layer.id.startsWith('foreground-'));
    assert.ok(foreground.length > 0, 'Keep NPC feet-depth occlusion geometry');
    assert.ok(foreground.every(layer => !layer.castsShadow && !layer.receivesShadow));
});


test('Gate attic emission has a bounded common-domain source and obeys isolation', () => {
    const light = config('common', vacant).find(x => x.id === 'town-gate-attic-window');
    assert.equal(light.ownerId, 'town-common');
    assert.equal(light.enabled, true);
    assert.deepEqual(light.artAnchor, [834, 38]);
    assert.ok(light.range <= 1, 'Attic spill must not become a roof-wide ambient wash');
    assert.equal(config('off', vacant).find(x => x.id === light.id).enabled, false);
    assert.equal(config('blacksmith', vacant).find(x => x.id === light.id).enabled, false);
});

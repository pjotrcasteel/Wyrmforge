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

test('Five exclusive domains route exactly eight lights through the shared GPU registry', () => {
    assert.deepEqual(TOWN_LIGHT_DOMAINS, ['common', 'nexus', 'blacksmith', 'codex', 'hall']);
    const all = fixtures();
    assert.equal(all.length, 8);
    assert.equal(new Set(all.map(x => x.id)).size, all.length);
    for (const light of all) {
        assert.equal(light.ownerId, 'town-' + light.domain);
        assert.ok(light.artAnchor.every(Number.isFinite));
        assert.ok(light.position.every(Number.isFinite));
        assert.ok(!/banner|flag|cloth/i.test(light.id));
    }
    assert.equal(selectLights(compileTownLightingSnapshot(
        townPreviewManifest({ domains: true }), { mode: 'night' }), 8, 8).length, 8);
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
    assert.deepEqual(enabled(config('combined', vacant)).map(x => x.domain), ['common', 'common']);
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
    assert.ok(Math.max(...intensities) <= 1.4);
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
    assert.deepEqual(common.lights.filter(x => x.enabled).map(x => x.domain),
        ['common', 'common']);
    const zero = compileTownLightingSnapshot(m, { mode: 'zero' });
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.equal(zero.lights.filter(x => x.enabled).length, 0);
});

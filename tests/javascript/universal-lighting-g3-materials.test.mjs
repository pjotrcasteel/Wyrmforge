import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const material = overrides => ({
    id: 'stone', color: '#777777', emission: '#000000', roughness: .8,
    metalness: 0, specular: .2, alphaCutoff: 0, emissionIntensity: 0,
    reflection: 'direct', ...overrides,
});
const snapshot = m => ({
    version: 1, time: 0, lights: [], objects: [], materials: [m],
    environment: { ambient: 0, exposure: 1, color: '#000000', emission: false },
});

test('G3 material maps and physical controls remain optional for G1 compatibility', () => {
    assert.equal(validateSnapshot(snapshot(material())).materials[0].aoMap, undefined);
    const m = validateSnapshot(snapshot(material({
        aoMap: 'stone-ao', aoIntensity: .7, emissiveMap: 'runes',
        normalScale: 1.5, foliageTransmission: .15, wetness: .6,
    }))).materials[0];
    assert.equal(m.aoMap, 'stone-ao');
    assert.equal(m.emissiveMap, 'runes');
    assert.equal(m.normalScale, 1.5);
    assert.equal(m.wetness, .6);
    assert.equal(validateSnapshot(snapshot(material({ reflection: 'probe', reflectionProbe: 'forest-cube' }))).materials[0].reflectionProbe, 'forest-cube');
});
test('G3 invalid material map IDs and out-of-range physical values fail validation', () => {
    for (const change of [
        { aoIntensity: -0.1 }, { aoIntensity: 1.1 }, { normalScale: -1 },
        { normalScale: 4.1 }, { foliageTransmission: 1.01 },
        { emissiveMap: '' }, { aoMap: 42 }, { aoIntensity: NaN },
        { reflection: 'probe' }, { reflection: 'probe', reflectionProbe: '' },
        { reflection: 'unknown' }, { reflectionProbe: 123 }, { wetness: -0.01 }, { wetness: 1.01 }, { wetness: Infinity },
    ]) assert.throws(() => validateSnapshot(snapshot(material(change))));
});

test('G3 distance fog accepts ordered bounds and rejects invalid ranges', () => {
    const s = snapshot(material());
    s.environment.fog = { color: '#343b4a', near: 3, far: 18 };
    assert.deepEqual(validateSnapshot(s).environment.fog, s.environment.fog);
    for (const fog of [
        { color: '#343b4a', near: 5, far: 5 },
        { color: '#343b4a', near: 8, far: 4 },
        { color: 'grey', near: 2, far: 8 },
        { color: '#343b4a', near: -1, far: 8 },
    ]) {
        s.environment.fog = fog;
        assert.throws(() => validateSnapshot(s));
    }
});

test('Emission additive mode rejects diffuse surfaces and unsupported blends', () => {
    const emitter = material({ color: '#000000', emissiveMap: 'aperture', specular: 0, metalness: 0, blendMode: 'emission-additive' });
    assert.equal(validateSnapshot(snapshot(emitter)).materials[0].blendMode, 'emission-additive');
    for (const change of [{color:'#777777'}, {specular:.2}, {metalness:.2}, {emissiveMap:undefined}, {blendMode:'screen'}])
        assert.throws(() => validateSnapshot(snapshot({...emitter,...change})), TypeError);
    assert.equal(validateSnapshot(snapshot(material())).materials[0].blendMode, undefined);
});

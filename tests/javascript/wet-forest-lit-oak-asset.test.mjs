import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { buildWetForestOakAsset } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/wet-forest-oak-asset.js';
import { validateSnapshot, environmentProfile } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/lighting-proof/', import.meta.url);
const source = JSON.parse(readFileSync(new URL('oak.json', root), 'utf8'));
const asset = JSON.parse(readFileSync(new URL('wet-forest-oak.asset.json', root), 'utf8'));
const byteLength = statSync(new URL('oak.bin', root)).size;
const build = (src = source, packet = asset, bytes = byteLength, options) =>
    buildWetForestOakAsset(src, packet, bytes, options);

test('original editable oak groups become physically relightable objects in the SAME shared G1 snapshot', () => {
    const before = [JSON.stringify(source), JSON.stringify(asset)];
    const { materials, objects } = build();
    assert.equal(materials.length, 6);
    assert.equal(objects.length, 6);
    assert.deepEqual(objects.map(o => o.id), source.groups.map(g => g.id));
    assert.deepEqual(materials.map(m => m.id), source.groups.map(g => g.id));
    assert.ok(objects.every(o => o.castsShadow && o.receivesShadow && o.receivesLight));
    assert.ok(materials.every(m => m.emissionIntensity === 0 && m.emission === '#000000'));
    assert.ok(materials.every(m => m.alphaCutoff === 0 && m.reflection === 'direct'));
    assert.ok(materials.every(m => m.normal === undefined), 'Original 3D vertex normals, not fake texture normals');
    assert.ok(materials.some(m => m.roughness !== materials[0].roughness), 'Per-surface authored physical parameters');
    const state = validateSnapshot({
        version: 1, time: 0, lights: [], materials, objects, environment: environmentProfile('zero'),
    });
    assert.equal(state.environment.ambient, 0);
    assert.equal(state.environment.emission, false);
    assert.deepEqual([JSON.stringify(source), JSON.stringify(asset)], before, 'Asset build cannot mutate originals');
});

test('review placement remains independent from authored source, collision and procedural world logic', () => {
    const { objects } = build(source, asset, byteLength, { position: [1, -2, 0], scale: [.6, .6, .6] });
    for (const object of objects) {
        assert.deepEqual(object.position, [1, -2, 0]);
        assert.deepEqual(object.scale, [.6, .6, .6]);
        assert.equal(object.ownerId, 'wet-forest/ancient-oak');
        assert.equal(object.occluderGeometry, undefined);
    }
    assert.throws(() => build(source, asset, byteLength, { scale: [0, 1, 1] }), /scale/);
    assert.throws(() => build(source, asset, byteLength, { position: [0, NaN, 0] }), /position/);
});

test('stale exports, incomplete materials and silently promoted concept art are rejected', () => {
    assert.throws(() => build(source, asset, byteLength - 24), /binary differs/);
    const missing = structuredClone(asset);
    missing.parts.pop();
    assert.throws(() => build(source, missing), /Missing\/extra/);
    const swapped = structuredClone(asset);
    [swapped.parts[0], swapped.parts[1]] = [swapped.parts[1], swapped.parts[0]];
    assert.throws(() => build(source, swapped), /Unmatched/);
    const approved = structuredClone(asset);
    approved.approval = 'production-approved';
    assert.throws(() => build(source, approved), /explicitly unapproved/);
    const fakeNormals = structuredClone(source);
    fakeNormals.stride = 3;
    assert.throws(() => build(fakeNormals), /source-derived/);
    const corrupt = structuredClone(source);
    corrupt.groups[2].byteOffset += 24;
    assert.throws(() => build(corrupt), /offsets/);
    const unphysical = structuredClone(asset);
    unphysical.parts[1].roughness = -1;
    assert.throws(() => build(source, unphysical), /roughness/);
});

test('packet preserves source provenance and explicitly documents lighting/art gaps', () => {
    assert.equal(source.approval, 'original-candidate-not-approved');
    assert.equal(asset.approval, source.approval);
    assert.match(asset.source.model, /\.blend$/);
    assert.match(asset.source.exporter, /export-lighting-oak\.py$/);
    assert.ok(asset.limitations.some(entry => /bark texture/i.test(entry)));
    assert.ok(asset.limitations.some(entry => /alpha-card foliage/i.test(entry)));
    assert.ok(asset.limitations.some(entry => /C# gameplay/i.test(entry)));
});

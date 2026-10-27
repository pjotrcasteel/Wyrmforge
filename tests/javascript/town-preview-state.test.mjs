import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { townDomainSnapshot, resolveTownPreviewMode } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-preview-state.js';
import { townPreviewManifest } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { TOWN_LIGHT_DOMAINS, TOWN_NEXUS_SCHOOL_LIGHTS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-light-domains.js';
import { SCHOOL_LIGHT_COLORS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/town-fixture.js';
const unlocked = { nexusUnlocked:true, forgeUnlocked:true, codexUnlocked:true, hallUnlocked:true };
const vacant = Object.fromEntries(Object.keys(unlocked).map(k => [k,false]));
const scene = () => townPreviewManifest({domains:true});
const snap = options => townDomainSnapshot(scene(), {unlocks:unlocked, ...options}).snapshot;
const receivers = snapshot => snapshot.objects.filter(o => !o.id.startsWith('town-emissive-'));

test('Every isolation and vacancy keeps identical non-emissive receivers and source registration', () => {
    const initial = receivers(snap({}));
    for (const isolation of ['off', 'combined', ...TOWN_LIGHT_DOMAINS]) {
        assert.deepEqual(receivers(snap({ isolation, unlocks:vacant })), initial);
        assert.deepEqual(receivers(snap({ isolation })), initial);
    }
    assert.deepEqual(receivers(snap({mode:'day'})), initial);
});
test('Single-domain isolation has no ambient wash, other emitters or chimney leak', () => {
    for (const isolation of TOWN_LIGHT_DOMAINS) {
        const s = snap({isolation});
        assert.equal(s.environment.ambient,0);
        assert.ok(s.lights.filter(l => l.enabled).every(l => l.domain === isolation));
        assert.ok(s.objects.filter(o => o.id.startsWith('town-emissive-')).every(o => o.ownerId === 'town-'+isolation));
        assert.equal(s.lights.find(l => l.id === 'town-blacksmith-chimney').enabled,isolation === 'blacksmith');
    }
});
test('Vacant combined Town keeps public sources, and strict black-world strips all radiance', () => {
    const v = snap({unlocks:vacant});
    assert.ok(v.lights.filter(l => l.enabled).every(l => l.domain === 'common'));
    assert.ok(!v.objects.some(o => o.id.startsWith('town-emissive-')));
    for (const settings of [{mode:'zero'},{isolation:'off'},{isolation:'off',mode:'day'}]) {
        const s = snap(settings);
        assert.equal(s.environment.ambient,0);assert.equal(s.environment.emission,false);
        assert.equal(s.lights.filter(l => l.enabled).length,0);
        assert.ok(!s.objects.some(o => o.id.startsWith('town-emissive-')));
    }
});
test('Six schools use existing palette; dome and portal tint together with actual mastery', () => {
    for (const [school,color] of Object.entries(SCHOOL_LIGHT_COLORS)) {
        assert.equal(TOWN_NEXUS_SCHOOL_LIGHTS[school],color);
        for (const strength of [.16,.4,.86]) {
            const s=snap({school,strength,isolation:'nexus'});
            const magic=s.lights.filter(l => l.magic);
            assert.equal(magic.length,2);assert.ok(magic.every(l => l.color===color && l.intensity<=4.8));
            assert.equal(s.materials.find(m => m.id==='town-emissive-nexus-magic-material').emission,color);
            const neutral=snap({school,strength,neutralMagic:true});
            assert.ok(neutral.lights.filter(l => l.magic).every(l => l.color==='#ffffff'));
        }
    }
});
test('Live mode follows device clock and scene attributes, with ephemeral explicit diagnostic override', () => {
    const query = value => new URLSearchParams(value);
    assert.equal(resolveTownPreviewMode({dataset:{}},query(''),{effective:'day'}),'day');
    assert.equal(resolveTownPreviewMode({dataset:{townTime:'night'}},query(''),{effective:'day'}),'night');
    assert.equal(resolveTownPreviewMode({dataset:{townTime:'day'}},query('townGpuMode=zero'),{effective:'day'}),'zero');
    assert.throws(()=>resolveTownPreviewMode({dataset:{}},query('townGpuMode=foo')),/diagnostic/);
});
test('Exposure is bounded, immutable and cannot enable emission in zero light', () => {
    const input=scene(), before=structuredClone(input);
    assert.equal(townDomainSnapshot(input,{unlocks:unlocked,exposure:1.5}).snapshot.environment.exposure,1.5);
    assert.deepEqual(input,before);
    assert.throws(()=>snap({exposure:10}),/calibration/);
    assert.throws(()=>snap({exposure:NaN}),/calibration/);
    assert.equal(snap({isolation:'off',exposure:2}).environment.emission,false);
});
test('All ten exact JPEG uploads are hash pinned and never falsely approved as registered runtime maps', () => {
    const folder=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/town/selected/2026-10-27/',import.meta.url);
    const manifest=JSON.parse(readFileSync(new URL('manifest.json',folder)));
    assert.equal(manifest.images.length,10);assert.equal(manifest.duplicateHashes,false);
    assert.deepEqual(manifest.images.filter(i=>TOWN_LIGHT_DOMAINS.includes(i.role)).map(i=>i.role).sort(),[...TOWN_LIGHT_DOMAINS].sort());
    for(const source of manifest.images) {
        const bytes=readFileSync(new URL(source.file,folder));
        assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
        assert.deepEqual(source.dimensions,[1536,864]);assert.equal(source.hasAlpha,false);
        assert.equal(source.usage,'reference-only');assert.equal(source.runtimeMaterialApproved,false);
        assert.equal(source.canonicalRegistration.pixelRegistered,false);
        assert.equal(bytes[0],255);assert.equal(bytes[1],216);
    }
});

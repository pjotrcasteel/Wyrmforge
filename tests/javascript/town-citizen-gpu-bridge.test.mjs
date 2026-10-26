import test from 'node:test';
import assert from 'node:assert/strict';
import { projectTownCitizens, TOWN_CITIZEN_ART_WIDTH, TOWN_CITIZEN_ART_HEIGHT,
    TOWN_CITIZEN_CSS_COLORS, TOWN_WELL_FRONT_DEPTH_Y }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-citizen-gpu-bridge.js';
import { townPreviewManifest, townPreviewProjection }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { compileTownLightingSnapshot }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relightable-scene.js';

const forward = [8, -12, 12].map(n => n / Math.hypot(8, -12, 12));
const project = (input) => projectTownCitizens(input, townPreviewProjection, forward);
const citizen = (id, feet, isPresent = true) => ({ id, feet, isPresent });
const render = (arr) => {
    const manifest = townPreviewManifest();
    const result = project(arr);
    manifest.layers.push(...result.layers);
    manifest.materials.push(...result.materials);
    return compileTownLightingSnapshot(manifest, { state: {}, mode: 'night' });
};

test('GPU proxy matches existing 16x30 pixel CSS Town citizen and source-pixel feet coordinates', () => {
    assert.equal(TOWN_CITIZEN_ART_WIDTH, 16);
    assert.equal(TOWN_CITIZEN_ART_HEIGHT, 30);
    assert.deepEqual(TOWN_CITIZEN_CSS_COLORS, ['#cb9975', '#8d9eaa', '#c1b28e']);
    const original = [citizen(7, [864, 513])];
    const out = project(original);
    assert.deepEqual(original, [citizen(7, [864, 513])], 'C# snapshot input is immutable');
    const npc = out.layers[0];
    assert.equal(npc.id, 'town-citizen-7');
    assert.equal(npc.material, 'town-css-citizen-color-0');
    assert.deepEqual(npc.artBounds, [856, 483, 16, 30]);
    assert.equal(npc.castsShadow, true);
    assert.equal(npc.occluderGeometry, 'town-citizen-css-rectangle');
    assert.equal(npc.receivesShadow, true);
    assert.equal(out.materials[0].emissionIntensity, 0);
    assert.ok(!('albedo' in out.materials[0]), 'No invented pixel-art texture');
});

test('well mask depth applies only to the diagnostic actor pose, without changing art or nav', () => {
    assert.equal(TOWN_WELL_FRONT_DEPTH_Y, 572);
    const behind = project([citizen(1, [864, 513])]).layers[0];
    const inFront = project([citizen(1, [864, 588])]).layers[0];
    const behindCenter = townPreviewProjection(864, 513 - TOWN_CITIZEN_ART_HEIGHT / 2);
    const frontCenter = townPreviewProjection(864, 588 - TOWN_CITIZEN_ART_HEIGHT / 2);
    const offset = (layer, center) =>
        layer.position.map((p, i) => p - center[i]).reduce((sum, n, i) => sum + n * forward[i], 0);
    assert.ok(Math.abs(offset(behind, behindCenter) - .045) < 1e-8);
    assert.ok(Math.abs(offset(inFront, frontCenter) - .15) < 1e-8);
    assert.ok(offset(behind, behindCenter) < offset(inFront, frontCenter));
    assert.equal(behind.ownerId, inFront.ownerId, 'Stable NPC identity through passing');
});

test('existing C# crowd identity, presence and ordering feed one shared GPU renderer', () => {
    const actors = [citizen(9, [650, 625]), citizen(10, [700, 625]),
        citizen(11, [730, 625]), citizen(12, [750, 625], false)];
    const { layers, materials } = project(actors);
    assert.deepEqual(layers.map(x => x.id), ['town-citizen-9', 'town-citizen-10', 'town-citizen-11']);
    assert.deepEqual(layers.map(x => x.material), materials.map(x => x.id));
    const gpu = render(actors);
    for (const layer of layers) {
        const item = gpu.objects.find(x => x.id === layer.id);
        assert.equal(item.castsShadow, true);
        assert.equal(item.receivesLight, true);
    }
    assert.ok(!gpu.objects.some(x => x.id === 'town-citizen-12'), 'Absent NPC must not cast a ghost shadow');
    assert.deepEqual(projectTownCitizens(actors, townPreviewProjection, forward, { enabled: false }).layers, []);
});

test('14 simultaneous citizens remain distinct and invalid authoritative positions cannot be rendered', () => {
    const fourteen = Array.from({ length: 14 }, (_, i) => citizen(i, [600 + i * 20, 650]));
    assert.equal(project(fourteen).layers.length, 14);
    assert.throws(() => project([...fourteen, citizen(14, [900, 650])]), /14-NPC/);
    assert.throws(() => project([citizen(1, [800, 500]), citizen(1, [820, 540])]), /duplicate/);
    assert.throws(() => project([citizen(1, [-10, 500])]), /canonical/);
    assert.throws(() => project([citizen(1, [800, 942])]), /canonical/);
    assert.throws(() => project([{ id: 1, feet: [800, 500] }]), /presence/);
    assert.throws(() => projectTownCitizens([citizen(1, [800, 500])], townPreviewProjection, [0, 0, 0]), /normalized/);
});

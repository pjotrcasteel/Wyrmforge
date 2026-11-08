import test from 'node:test';
import assert from 'node:assert/strict';

test('Hunt layer lab is opt-in and cannot alter normal gameplay', async () => {
    const previous = globalThis.location;
    try {
        globalThis.location = { search: '' };
        const lab = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-layer-lab.js?disabled-unit');
        assert.equal(lab.layerLabRequested(), false);
        assert.equal(lab.layerLabRequested('?layerLab=1'), true);
        assert.equal(lab.layerLabRequested('?layerLab=0'), false);
        for (const [key] of lab.LAYER_OPTIONS) {
            lab.setLayerLabEnabled(key, false);
            assert.equal(lab.layerLabEnabled(key), true, key + ' must remain visible outside diagnostic mode');
        }
        lab.setLayerLabView('albedo');
        assert.equal(lab.layerLabView(), 'lit');
        assert.equal(lab.layerLabSnapshot().active, false);
        const renderer = { begin() {}, render() {} };
        assert.strictEqual(lab.selectHuntGpuWorld({ lights: [] }, renderer), renderer,
            'Ordinary Hunts must keep the renderer object, not a boolean');
    } finally {
        globalThis.location = previous;
    }
});

test('enabled layer lab independently isolates named layers and resets without affecting the game state', async () => {
    const previous = globalThis.location;
    try {
        globalThis.location = { search: '?layerLab=1' };
        const lab = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-layer-lab.js?enabled-unit');
        assert.equal(lab.layerLabSnapshot().active, true);
        assert.equal(lab.LAYER_OPTIONS.length, 14);
        const renderer = { begin() {}, render() {}, dispose() {} };
        assert.strictEqual(lab.selectHuntGpuWorld({ lights: [] }, renderer), renderer,
            'Layer Lab GPU on must return the renderer instance, not true');
        assert.strictEqual(lab.selectHuntGpuWorld(null, renderer), null);
        assert.strictEqual(lab.selectHuntGpuWorld({ lights: [] }, null), null);
        lab.setLayerLabEnabled('gpu', false);
        assert.strictEqual(lab.selectHuntGpuWorld({ lights: [] }, renderer), null);
        lab.setLayerLabEnabled('gpu', true);
        assert.strictEqual(lab.selectHuntGpuWorld({ lights: [] }, renderer), renderer,
            'Toggling WebGL back on must recover the same GPU object');
        assert.equal(new Set(lab.LAYER_OPTIONS.map(option => option[0])).size, 14);
        assert.equal(lab.layerLabRequiresTerrainRebuild('gpu'), false,
            'GPU switch must preserve corrupted terrain raster during isolation');
        assert.equal(lab.layerLabRequiresTerrainRebuild('normals'), false);
        assert.equal(lab.layerLabRequiresTerrainRebuild('damageFx'), false);
        assert.equal(lab.layerLabRequiresTerrainRebuild('postGpuFx'), false);
        assert.equal(lab.layerLabRequiresTerrainRebuild('faces'), true);
        assert.equal(lab.layerLabRequiresTerrainRebuild('excavation'), true);
        assert.equal(lab.layerLabRequiresTerrainRebuild('incremental'), true);
        lab.setLayerLabEnabled('incremental', false);
        assert.equal(lab.layerLabEnabled('incremental'), false);
        lab.setLayerLabEnabled('incremental', true);
        const generation = lab.layerLabGeneration();
        lab.setLayerLabEnabled('excavation', false);
        lab.setLayerLabEnabled('normals', false);
        assert.equal(lab.layerLabEnabled('excavation'), false);
        assert.equal(lab.layerLabEnabled('normals'), false);
        assert.equal(lab.layerLabEnabled('albedo'), true);
        assert.deepEqual(lab.layerLabSnapshot().disabled, ['excavation', 'normals']);
        assert.ok(lab.layerLabGeneration() > generation);
        lab.setLayerLabView('albedo');
        assert.equal(lab.layerLabView(), 'albedo');
        assert.throws(() => lab.setLayerLabView('not-a-real-pass'), RangeError);
        assert.throws(() => lab.setLayerLabEnabled('not-a-real-layer', false), RangeError);
        lab.resetLayerLab();
        assert.deepEqual(lab.layerLabSnapshot().disabled, []);
        assert.equal(lab.layerLabView(), 'lit');
        assert.equal(lab.mountLayerLab(() => {}), null, 'Node has no document; browser UI is optional');
    } finally {
        globalThis.location = previous;
    }
});

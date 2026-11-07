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
        assert.equal(lab.LAYER_OPTIONS.length, 12);
        assert.equal(new Set(lab.LAYER_OPTIONS.map(option => option[0])).size, 12);
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

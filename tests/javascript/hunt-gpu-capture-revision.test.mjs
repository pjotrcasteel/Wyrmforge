import test from 'node:test';
import assert from 'node:assert/strict';
import { HuntGpuWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';
import { huntLayerRevision } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js';

function fakeCapture() {
    let drawings = 0;
    const context = { clearRect() {}, drawImage() { drawings++; } };
    const pixels = { width: 64, height: 64, getContext() { return context; } };
    const layer = { pixels, texture: { needsUpdate: false }, revision: 'stable' };
    const world = {
        layers: new Map([['prop', layer]]), used: new Set(), dirtyTextures: new Set(),
        materials: [], objects: [],
        canReuseCapture: HuntGpuWorld.prototype.canReuseCapture,
        submitSurface: HuntGpuWorld.prototype.submitSurface,
    };
    const capture = (revision, width = 64, height = 64) => {
        world.materials = []; world.objects = [];
        HuntGpuWorld.prototype.capture.call(world, 'prop', {}, 0, 0, width, height, 0, true,
            revision === null ? {} : { revision });
    };
    return { capture, world, layer, get drawings() { return drawings; } };
}

test('explicit stable surface revisions skip both Canvas copies and GPU uploads', () => {
    const c = fakeCapture();
    c.capture('stable');
    assert.equal(c.drawings, 0);
    assert.equal(c.world.dirtyTextures.size, 0);
    assert.equal(c.world.objects.length, 1, 'Existing GPU surface stays in scene every frame');
    assert.ok(c.world.used.has('prop'));
    c.capture('damaged');
    assert.equal(c.drawings, 1);
    assert.equal(c.layer.revision, 'damaged');
    assert.deepEqual([...c.world.dirtyTextures], ['prop']);
    c.world.dirtyTextures.clear();
    c.capture('damaged');
    assert.equal(c.drawings, 1);
    assert.equal(c.world.dirtyTextures.size, 0);
    c.capture('damaged', 96, 96);
    assert.equal(c.drawings, 2, 'Size changes must invalidate even unchanged revisions');
    assert.deepEqual([c.layer.pixels.width, c.layer.pixels.height], [96, 96]);
    assert.throws(() => c.capture(Infinity), TypeError);
});

test('unspecified revision always repaints animated or unknown assets', () => {
    const c = fakeCapture();
    c.capture(null); c.capture(null);
    assert.equal(c.drawings, 2);
    assert.ok(c.world.dirtyTextures.has('prop'));
});

test('only safe static props supply revisions; damage and late art invalidate their pixels', () => {
    const prop = { id: 17, kind: 'crate', x: .3, y: .5, healthFraction: 1 };
    const staticLayer = { kind: 'masonry', style: 'destructible', prop, width: 1000, height: 1200, wetForest: false };
    const original = structuredClone(staticLayer);
    const before = huntLayerRevision(staticLayer, false);
    assert.equal(before, huntLayerRevision(staticLayer, false));
    assert.notEqual(before, huntLayerRevision(staticLayer, true), 'Late-loaded art must repaint');
    assert.notEqual(before, huntLayerRevision({ ...staticLayer, prop: { ...prop, healthFraction: .3 } }, false),
        'Damage visuals must repaint');
    assert.notEqual(before, huntLayerRevision({ ...staticLayer, width: 2000 }, false));
    assert.equal(huntLayerRevision({ ...staticLayer, wetForest: true }, true), undefined,
        'Potentially animated forest art cannot be cached under a static revision');
    assert.equal(huntLayerRevision({ ...staticLayer, kind: 'enemy' }, false), undefined);
    assert.equal(huntLayerRevision({ ...staticLayer, style: 'territory' }, false), undefined);
    assert.deepEqual(staticLayer, original, 'No gameplay or asset state mutation');
});

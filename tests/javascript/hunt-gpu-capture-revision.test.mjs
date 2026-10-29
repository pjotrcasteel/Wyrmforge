import test from 'node:test';
import assert from 'node:assert/strict';
import { HuntGpuWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';
import { huntLayerRevision, prepareHuntGpuScratch, HuntGpuScratchPool } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js';

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


test('shared scratch canvas keeps bitmap allocation and isolates world-space paint state', () => {
    const calls = [], resets = [];
    const ctx = {
        setTransform(...args) { calls.push(['reset-transform', ...args]); },
        clearRect(...args) { calls.push(['clear', ...args]); },
        save() { calls.push(['save']); },
        translate(...args) { calls.push(['translate', ...args]); },
        restore() { calls.push(['restore']); },
        imageSmoothingEnabled: true,
    };
    let width = 160, height = 160;
    const canvas = {
        get width() { return width; },
        set width(value) { width = value; resets.push('width'); },
        get height() { return height; },
        set height(value) { height = value; resets.push('height'); },
        getContext(type) { assert.equal(type, '2d'); return ctx; },
    };
    assert.equal(prepareHuntGpuScratch(canvas, 160, 100, 200), ctx);
    ctx.restore();
    assert.deepEqual(resets, [], 'Same-sized actors must not reallocate the bitmap');
    assert.deepEqual(calls, [
        ['reset-transform', 1, 0, 0, 1, 0, 0],
        ['clear', 0, 0, 160, 160],
        ['save'], ['translate', -100, -200], ['restore'],
    ]);
    assert.equal(ctx.imageSmoothingEnabled, false);
    calls.length = 0;
    prepareHuntGpuScratch(canvas, 160, 350, 700);
    ctx.restore();
    assert.deepEqual(resets, [], 'Camera movement must reuse existing pixel storage');
    assert.deepEqual(calls[1], ['clear', 0, 0, 160, 160]);
    assert.deepEqual(calls[3], ['translate', -350, -700],
        'Every new actor needs its own correct world origin, never the previous transform');

    prepareHuntGpuScratch(canvas, 96.4, 0, 0);
    ctx.restore();
    assert.deepEqual(resets, ['width', 'height']);
    assert.deepEqual([width, height], [97, 97]);
    assert.throws(() => prepareHuntGpuScratch(canvas, 0, 0, 0), RangeError);
    assert.throws(() => prepareHuntGpuScratch(canvas, 160, Number.NaN, 0), RangeError);
    assert.deepEqual(resets, ['width', 'height']);
});


test('bounded Hunt raster pool reuses different actor sizes and evicts the least recently used surface', () => {
    const created = [];
    const pool = new HuntGpuScratchPool(2, () => {
        const canvas = { width: 0, height: 0 };
        created.push(canvas);
        return canvas;
    });
    const one = pool.acquire(160);
    const two = pool.acquire(96);
    assert.equal(pool.acquire(96), two);
    assert.equal(pool.acquire(160), one, 'Switching between sizes never reallocates a reusable bitmap');
    assert.deepEqual(pool.diagnostics(), {
        capacity: 2, active: 2, created: 2, reused: 2, evicted: 0,
        estimatedBytes: (160 * 160 + 96 * 96) * 4,
    });
    pool.acquire(320);
    assert.equal(pool.diagnostics().evicted, 1);
    assert.equal(pool.acquire(160), one,
        'Most-recently-used size remains available when another surface is evicted');
    const replacement = pool.acquire(96);
    assert.notEqual(replacement, two, 'Evicted sizes must be recreated when later needed');
    assert.equal(created.length, 4);
    assert.equal(pool.diagnostics().active, 2);
    assert.ok(pool.diagnostics().estimatedBytes <= (320 * 320 + 160 * 160) * 4);
    pool.clear();
    assert.equal(pool.diagnostics().active, 0);
    assert.equal(pool.diagnostics().estimatedBytes, 0);
    assert.throws(() => new HuntGpuScratchPool(0, () => ({})), RangeError);
    assert.throws(() => new HuntGpuScratchPool(9, () => ({})), RangeError);
    assert.throws(() => pool.acquire(-1), RangeError);
});

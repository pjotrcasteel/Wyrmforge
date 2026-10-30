import test from 'node:test';
import assert from 'node:assert/strict';
import { HuntGpuWorld, compositeHuntGpuFrame, huntGpuRendererBudget, needsRetainedHuntBuffer } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';
import { huntLayerRevision, prepareHuntGpuScratch, HuntGpuScratchPool } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js';

function fakeCapture() {
    let drawings = 0;
    const context = { clearRect() {}, imageSmoothingEnabled: true, drawImage() { drawings++; } };
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
    return { capture, world, layer, context, get drawings() { return drawings; } };
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
    assert.equal(c.context.imageSmoothingEnabled, false, 'Canvas-to-GPU capture must not bilinearly blur source pixels');
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


test('static cloister walls reuse GPU texture uploads across render frames and camera travel', () => {
    const barrier = { kind: 'ruin', x: .15, y: .35, width: .32, height: .05, open: false };
    const wall = { kind: 'masonry', barrier, width: 1280, height: 1600, depth: 640 };
    const original = structuredClone(wall);
    const revision = huntLayerRevision(wall, false);
    assert.equal(revision, huntLayerRevision({ ...wall, seconds: 12345 }, true),
        'Cloister wall pixels do not depend on time, camera or late character art');
    assert.ok(revision, 'A static masonry receiver must have an explicit GPU capture revision');
    assert.notEqual(revision, huntLayerRevision({ ...wall, barrier: { ...barrier, open: true } }),
        'Opening a C# gate must invalidate its old art');
    assert.notEqual(revision, huntLayerRevision({ ...wall, barrier: { ...barrier, kind: 'gate' } }),
        'Changed wall geometry/type must repaint');
    assert.notEqual(revision, huntLayerRevision({ ...wall, width: 1440 }),
        'World scale changes must repaint');
    assert.equal(huntLayerRevision({ ...wall, style: 'territory', seconds: 1 }), undefined,
        'Animated territory masonry must still repaint');
    assert.equal(huntLayerRevision({ ...wall, wetForest: true }), undefined,
        'Potentially animated forest art must never be cached as a cloister wall');
    assert.equal(huntLayerRevision({ ...wall, style: 'destructible' }), undefined,
        'Unknown destructible walls must remain dynamic');
    assert.deepEqual(wall, original);
    const c = fakeCapture();
    c.capture(revision);
    assert.equal(c.drawings, 1);
    c.world.dirtyTextures.clear();
    c.capture(huntLayerRevision({ ...wall, seconds: 500 }));
    assert.equal(c.drawings, 1, 'Unchanged wall skips the CPU Canvas copy');
    assert.equal(c.world.dirtyTextures.size, 0, 'Unchanged wall skips its GPU texture upload');
    c.capture(huntLayerRevision({ ...wall, barrier: { ...barrier, kind: 'gate' } }));
    assert.equal(c.drawings, 2, 'A new wall visual revision repaints');
    assert.deepEqual([...c.world.dirtyTextures], ['prop']);
});


test('animated territory walls upload only on actual rune changes, gate changes and atlas reloads', () => {
    const barrier = { kind: 'ruin', x: .1, y: .3, width: .4, height: .035, open: false };
    const layer = { kind: 'masonry', style: 'territory', barrier,
        width: 1280, height: 1600, wallStyle: 'valley', school: 'fire', seconds: 0 };
    const original = structuredClone(layer);
    const base = huntLayerRevision(layer, true, 7);
    assert.ok(base);
    assert.equal(base, huntLayerRevision({ ...layer, seconds: .0001 }, true, 7),
        'Subframe phase drift cannot trigger redundant texture uploads');
    assert.notEqual(base, huntLayerRevision({ ...layer, school: 'frost' }, true, 7),
        'School swap must change atlas material appearance');
    assert.notEqual(base, huntLayerRevision(layer, true, 8),
        'Reloaded authored atlas must invalidate the GPU capture');
    assert.notEqual(base, huntLayerRevision({ ...layer, barrier: { ...barrier, kind: 'gate' } }, true, 7),
        'A gate must replace its rune arrangement and stone silhouette');
    assert.equal(huntLayerRevision(layer, false, 7), undefined,
        'Unloaded art must not be cached as a complete territory wall');
    const transition = Array.from({ length: 2000 }, (_, i) => (i + 1) * .05)
        .find(seconds => huntLayerRevision({ ...layer, seconds }, true, 7) !== base);
    assert.ok(Number.isFinite(transition), 'A real animated rune must eventually change its authored frame');
    const next = huntLayerRevision({ ...layer, seconds: transition }, true, 7);
    assert.notEqual(next, base, 'Lit/dim transitions must invalidate immediately');

    const c = fakeCapture();
    c.capture(base);
    c.world.dirtyTextures.clear();
    c.capture(huntLayerRevision({ ...layer, seconds: .0001 }, true, 7));
    assert.equal(c.drawings, 1);
    assert.equal(c.world.dirtyTextures.size, 0, 'No upload between rune transitions');
    c.capture(next);
    assert.equal(c.drawings, 2, 'The changed rune is repainted exactly once');
    assert.deepEqual([...c.world.dirtyTextures], ['prop']);
    assert.deepEqual(layer, original, 'GPU presentation cannot mutate authoritative barriers');
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
    assert.equal(two.width, 0, 'Evicted staging canvas must release its CPU bitmap immediately');
    assert.equal(two.height, 0);
    assert.equal(pool.acquire(160), one,
        'Most-recently-used size remains available when another surface is evicted');
    const replacement = pool.acquire(96);
    assert.notEqual(replacement, two, 'Evicted sizes must be recreated when later needed');
    assert.equal(created.length, 4);
    assert.equal(pool.diagnostics().active, 2);
    assert.ok(pool.diagnostics().estimatedBytes <= (320 * 320 + 160 * 160) * 4);
    pool.clear();
    assert.equal(one.width, 0, 'Disposing the pool must release retained CPU bitmaps');
    assert.equal(one.height, 0);
    assert.equal(pool.diagnostics().active, 0);
    assert.equal(pool.diagnostics().estimatedBytes, 0);
    assert.throws(() => new HuntGpuScratchPool(0, () => ({})), RangeError);
    assert.throws(() => new HuntGpuScratchPool(9, () => ({})), RangeError);
    assert.throws(() => pool.acquire(-1), RangeError);
});

test('mobile Hunt GPU budget does not retain finished drawing buffers; labs retain defaults', () => {
    const mobile = huntGpuRendererBudget('mobile');
    assert.deepEqual(mobile, {
        maxLights: 6, shadowViews: 6, shadowMapSize: 256, preserveDrawingBuffer: false,
    });
    assert.equal(huntGpuRendererBudget('balanced').preserveDrawingBuffer, false);
    assert.equal(huntGpuRendererBudget('high').shadowMapSize, 1024);
    assert.throws(() => huntGpuRendererBudget('ultra'), RangeError);
});


test('iPhone/iPad WebKit retains the render buffer before copy; other browsers stay memory-efficient', () => {
    assert.equal(needsRetainedHuntBuffer('Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15', 5), true);
    assert.equal(needsRetainedHuntBuffer('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15', 5), true);
    assert.equal(needsRetainedHuntBuffer('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', 5), true);
    assert.equal(needsRetainedHuntBuffer('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', 0), false);
    assert.equal(needsRetainedHuntBuffer('Mozilla/5.0 (Linux; Android 16) Chrome/140.0', 5), false);
    assert.equal(huntGpuRendererBudget('mobile', true).preserveDrawingBuffer, true);
    assert.equal(huntGpuRendererBudget('mobile').preserveDrawingBuffer, false);
    assert.throws(() => huntGpuRendererBudget('mobile', 'true'), TypeError);
});

test('WebGL-to-Hunt composite always uses nearest pixel sampling and restores caller canvas state', () => {
    const calls = [];
    const ctx = {
        canvas: { width: 390, height: 844 },
        imageSmoothingEnabled: true,
        save() { this.oldSmoothing = this.imageSmoothingEnabled; calls.push('save'); },
        setTransform(...values) { calls.push(['transform', ...values]); },
        drawImage(image, x, y, width, height) {
            calls.push(['draw', image, x, y, width, height, this.imageSmoothingEnabled]);
        },
        restore() { this.imageSmoothingEnabled = this.oldSmoothing; calls.push('restore'); },
    };
    const image = { width: 320, height: 692 };
    compositeHuntGpuFrame(ctx, image);
    assert.deepEqual(calls, [
        'save', ['transform', 1, 0, 0, 1, 0, 0],
        ['draw', image, 0, 0, 390, 844, false], 'restore',
    ]);
    assert.equal(ctx.imageSmoothingEnabled, true, 'Do not change downstream HUD drawing');
    ctx.drawImage = () => { throw Error('context unavailable'); };
    assert.throws(() => compositeHuntGpuFrame(ctx, image), /context unavailable/);
    assert.equal(calls.at(-1), 'restore', 'A failed GPU composite must still unwind Canvas state');
});


test('G4 presents a complete WebGL/Canvas frame only once after all combat layers', async () => {
    const { prepareHuntGpuPresentation, presentCompletedHuntGpuFrame } =
        await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const events = [];
    const stageContext = {
        setTransform(...values) { events.push(['stage-transform', ...values]); },
        get globalAlpha() { return this._alpha; }, set globalAlpha(value) { this._alpha = value; },
        get imageSmoothingEnabled() { return this._smoothing; },
        set imageSmoothingEnabled(value) { this._smoothing = value; },
        set globalCompositeOperation(value) { this._blend = value; },
    };
    const stage = {
        width: 0, height: 0,
        getContext(mode) { assert.equal(mode, '2d'); return stageContext; }
    };
    const first = prepareHuntGpuPresentation(stage, 402.3, 656.2, 2);
    assert.equal(first, stageContext);
    assert.equal(stage.width, 804);
    assert.equal(stage.height, 1312);
    assert.equal(first.imageSmoothingEnabled, false);
    assert.equal(first._blend, 'source-over');
    prepareHuntGpuPresentation(stage, 402.3, 656.2, 2);
    assert.equal(stage.width, 804, 'stable mobile dimensions must not realloc the bitmap');
    assert.throws(() => prepareHuntGpuPresentation(stage, 0, 656, 2), RangeError);

    const visible = {
        save() { events.push(['save']); },
        restore() { events.push(['restore']); },
        setTransform(...values) { events.push(['visible-transform', ...values]); },
        set globalAlpha(value) { events.push(['alpha', value]); },
        set globalCompositeOperation(value) { events.push(['blend', value]); },
        set imageSmoothingEnabled(value) { events.push(['smoothing', value]); },
        drawImage(...values) { events.push(['present', ...values]); },
    };
    presentCompletedHuntGpuFrame(visible, stage);
    assert.equal(events.filter(e => e[0] === 'present').length, 1);
    assert.deepEqual(events.find(e => e[0] === 'present'), ['present', stage, 0, 0]);
    assert.ok(events.find(e => e[0] === 'blend' && e[1] === 'copy'));
    assert.ok(events.find(e => e[0] === 'smoothing' && e[1] === false));
    assert.equal(events.at(-1)[0], 'restore');
    assert.throws(() => presentCompletedHuntGpuFrame(visible, null), TypeError);

    const { readFile } = await import('node:fs/promises');
    const arena = await readFile(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const after = arena.slice(arena.indexOf('function draw(state, snapshot'));
    assert.match(after, /prepareHuntGpuPresentation\(presentation, width, height, state\.pixelRatio\)/);
    assert.match(after, /if \(presentation\) presentCompletedHuntGpuFrame\(state\.context, presentation\)/);
    assert.ok(after.indexOf('drawPerformanceCounter(state, ctx, snapshot') <
        after.indexOf('presentCompletedHuntGpuFrame(state.context, presentation)'),
        'Terrain, actor silhouettes, VFX and overlays must finish before the only visible commit');
});

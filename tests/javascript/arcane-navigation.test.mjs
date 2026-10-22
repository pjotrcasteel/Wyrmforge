import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function map(touchEvents = false) {
    const listeners = new Map(), frames = new Map(), captures = new Set();
    let nextFrame = 0, disconnected = false;
    const canvas = { style: { setProperty(name, value) { this[name] = value; } } };
    const viewport = {
        clientWidth: 340, clientHeight: 500,
        dataset: { worldSize: '3200', startX: '1600', startY: '1200' },
        querySelector: () => canvas,
        classList: { toggle() {}, remove() {} },
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: (name, action) => listeners.set(name, action),
        removeEventListener: name => listeners.delete(name),
        setPointerCapture: id => captures.add(id),
        hasPointerCapture: id => captures.has(id),
        releasePointerCapture: id => captures.delete(id),
    };
    const windowListeners = new Map();
    const window = { addEventListener: (name, action) => windowListeners.set(name, action), removeEventListener: name => windowListeners.delete(name) };
    if (touchEvents) window.ontouchstart = null;
    const context = { window, ResizeObserver: class { observe() {} disconnect() { disconnected = true; } },
        requestAnimationFrame: action => { frames.set(++nextFrame, action); return nextFrame; },
        cancelAnimationFrame: id => frames.delete(id) };
    vm.runInNewContext(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arcane-web.js', import.meta.url), 'utf8'), context);
    const api = context.window.wyrmforgeArcaneWeb;
    api.initialize(viewport);
    const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(action => action()); };
    const emit = (name, x = 170, y = 250, id = 1, button = null, extra = {}) => {
        const event = { type: name, clientX: x, clientY: y, pointerId: id, pointerType: 'touch', button: 0,
            target: { closest: () => button }, preventDefault() {}, stopImmediatePropagation() {}, deltaY: -100, ctrlKey:true, ...extra };
        listeners.get(name)?.(event);
        flush();
    };
    const view = () => {
        const [x, y, scale] = canvas.style.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
        return { x, y, scale };
    };
    const touch = (name, touches, button = null) => {
        let prevented = false;
        listeners.get(name)?.({ changedTouches:touches.map(([id,x,y]) => ({ identifier:id,clientX:x,clientY:y })),
            target:{ closest:() => button }, preventDefault() { prevented = true; } });
        flush(); return prevented;
    };
    return { api, viewport, emit, touch, view, listeners, windowListeners, disconnected: () => disconnected };
}

test('Web opens at reading scale and stays pannable even when the full world fits', () => {
    const m = map();
    assert.equal(m.view().scale, 0.95);
    m.api.overview(m.viewport);
    const before = m.view();
    m.emit('pointerdown', 100, 100);
    m.emit('pointermove', 220, 180);
    m.emit('pointerup', 220, 180);
    assert.ok(Math.abs(m.view().x - before.x - 120) < 0.001);
    assert.ok(Math.abs(m.view().y - before.y - 80) < 0.001);
    m.api.reset(m.viewport);
    assert.equal(m.view().scale, 0.95);
});

test('dragging from a node pans without selecting; taps select once and cancellations never select', () => {
    const m = map(); let clicks = 0;
    const button = { focus() {}, click() { clicks++; } };
    const before = m.view();
    m.emit('pointerdown', 100, 100, 1, button);
    m.emit('pointermove', 180, 140, 1, button);
    m.emit('pointerup', 180, 140, 1, button);
    assert.equal(clicks, 0);
    assert.notEqual(m.view().x, before.x);
    m.emit('pointerdown', 100, 100, 1, button);
    m.emit('pointerup', 102, 100, 1, button);
    assert.equal(clicks, 1);
    m.emit('pointerdown', 100, 100, 1, button);
    m.emit('pointercancel', 100, 100, 1, button);
    assert.equal(clicks, 1);
});

test('pinching keeps the midpoint anchored and never activates a node on release', () => {
    const m = map(); let clicks = 0;
    const button = { focus() {}, click() { clicks++; } };
    const before = m.view(), worldX = (150 - before.x) / before.scale;
    m.emit('pointerdown', 100, 250, 1, button);
    m.emit('pointerdown', 200, 250, 2, button);
    m.emit('pointermove', 60, 250, 1, button);
    m.emit('pointermove', 240, 250, 2, button);
    const after = m.view();
    assert.ok(after.scale > before.scale);
    assert.ok(Math.abs((150 - after.x) / after.scale - worldX) < 0.001);
    m.emit('pointerup', 60, 250, 1, button);
    m.emit('pointerup', 240, 250, 2, button);
    assert.equal(clicks, 0);
});

test('wheel zoom anchors under the cursor and disposing removes all gesture listeners', () => {
    const m = map(), before = m.view();
    const worldX = (50 - before.x) / before.scale;
    m.emit('wheel', 50, 80);
    const after = m.view();
    assert.ok(after.scale > before.scale);
    assert.ok(Math.abs((50 - after.x) / after.scale - worldX) < 0.001);
    m.api.dispose(m.viewport);
    assert.equal(m.listeners.size, 0);
    assert.equal(m.disconnected(), true);
});

test('wheel and trackpad scroll pan both axes without changing scale', () => {
    const m = map(), before = m.view();
    m.emit('wheel', 90, 100, 1, null, { ctrlKey:false, deltaX:40, deltaY:70 });
    const after = m.view();
    assert.equal(after.scale, before.scale);
    assert.ok(Math.abs(after.x - before.x + 40) < 0.001);
    assert.ok(Math.abs(after.y - before.y + 70) < 0.001);
});

test('a release at a different position flushes its final movement and never taps', () => {
    const m = map(); let clicks = 0;
    const node = { focus() {}, click() { clicks++; } }, before = m.view();
    m.emit('pointerdown', 100, 100, 1, node);
    m.emit('pointerup', 180, 140, 1, node);
    assert.equal(clicks, 0);
    assert.ok(Math.abs(m.view().x - before.x - 80) < 0.001);
});

test('Safari Touch Events pan and cancel without duplicate Pointer processing', () => {
    const m = map(true); let clicks = 0;
    const node = { focus() {}, click() { clicks++; } }, before = m.view();
    m.emit('pointerdown', 100, 100, 1, node);
    m.emit('pointermove', 170, 150, 1, node);
    assert.deepEqual(m.view(), before);
    assert.equal(m.touch('touchstart', [[0,100,100]], node), true);
    assert.equal(m.touch('touchmove', [[0,180,140]], node), true);
    m.touch('touchend', [[0,180,140]], node);
    assert.equal(clicks, 0);
    assert.ok(Math.abs(m.view().x - before.x - 80) < 0.001);
    m.touch('touchstart', [[0,100,100]], node);
    m.touch('touchcancel', [[0,100,100]], node);
    assert.equal(clicks, 0);
    m.touch('touchstart', [[0,100,100]], node);
    m.touch('touchend', [[0,100,100]], node);
    assert.equal(clicks, 1);
});

test('Safari pinch followed by one-finger panning stays continuous and never selects', () => {
    const m = map(true); let clicks = 0;
    const node = { focus() {}, click() { clicks++; } };
    m.touch('touchstart', [[0,100,250],[1,200,250]], node);
    m.touch('touchmove', [[0,60,250],[1,240,250]], node);
    assert.ok(m.view().scale > 0.95);
    m.touch('touchend', [[1,240,250]], node);
    const before = m.view();
    m.touch('touchmove', [[0,100,280]], node);
    m.touch('touchend', [[0,100,280]], node);
    assert.ok(Math.abs(m.view().x - before.x - 40) < 0.001);
    assert.ok(Math.abs(m.view().y - before.y - 30) < 0.001);
    assert.equal(clicks, 0);
    m.api.dispose(m.viewport);
    assert.equal(m.listeners.size, 0);
    assert.equal(m.windowListeners.size, 0);
});

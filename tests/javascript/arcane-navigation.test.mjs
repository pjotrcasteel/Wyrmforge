import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function map() {
    const listeners = new Map(), frames = new Map(), captures = new Set();
    let nextFrame = 0, disconnected = false;
    const canvas = { style: {} };
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
    const context = { window: {}, ResizeObserver: class { observe() {} disconnect() { disconnected = true; } },
        requestAnimationFrame: action => { frames.set(++nextFrame, action); return nextFrame; },
        cancelAnimationFrame: id => frames.delete(id) };
    vm.runInNewContext(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arcane-web.js', import.meta.url), 'utf8'), context);
    const api = context.window.wyrmforgeArcaneWeb;
    api.initialize(viewport);
    const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(action => action()); };
    const emit = (name, x = 170, y = 250, id = 1, button = null) => {
        const event = { type: name, clientX: x, clientY: y, pointerId: id, pointerType: 'touch', button: 0,
            target: { closest: () => button }, preventDefault() {}, stopImmediatePropagation() {}, deltaY: -100 };
        listeners.get(name)?.(event);
        flush();
    };
    const view = () => {
        const [x, y, scale] = canvas.style.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
        return { x, y, scale };
    };
    return { api, viewport, emit, view, listeners, disconnected: () => disconnected };
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

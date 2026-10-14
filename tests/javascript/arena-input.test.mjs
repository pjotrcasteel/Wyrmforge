import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachArenaInput, getArenaMovement } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-input.js';

class FakeTarget {
    listeners = new Map();
    hidden = false;
    addEventListener(name, listener) {
        if (!this.listeners.has(name)) this.listeners.set(name, new Set());
        this.listeners.get(name).add(listener);
    }
    removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
    dispatch(name, fields = {}) {
        const event = { type: name, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0,
            clientX: 10, clientY: 10, cancelable: true, key: '', defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; }, ...fields };
        for (const listener of this.listeners.get(name) ?? []) listener(event);
        return event;
    }
}
function arena(capture = () => {}) {
    const win = new FakeTarget();
    const doc = new FakeTarget();
    const canvas = new FakeTarget();
    canvas.setPointerCapture = capture;
    const state = { canvas, keys: new Set(), pointerId: null, touchOrigin: { x: 0, y: 0 }, touchCurrent: { x: 0, y: 0 } };
    const detach = attachArenaInput(state, win, doc);
    return { win, doc, canvas, state, detach };
}

test('short primary touch swipes steer without scrolling; extra fingers do not hijack movement', () => {
    const a = arena();
    assert.equal(a.canvas.dispatch('pointerdown').defaultPrevented, true);
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.canvas.dispatch('pointermove', { clientX: 14, clientY: 10 });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.canvas.dispatch('pointermove', { clientX: 16, clientY: 10 });
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });
    a.canvas.dispatch('pointerdown', { pointerId: 2, clientX: 200, clientY: 200, isPrimary: false });
    assert.equal(a.state.pointerId, 1);
    assert.equal(a.canvas.dispatch('pointermove', { clientX: 25, clientY: 10 }).defaultPrevented, true);
    a.canvas.dispatch('lostpointercapture');
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.canvas.dispatch('pointerdown', { pointerId: 3, clientX: 30 });
    a.canvas.dispatch('pointercancel', { pointerId: 3 });
    assert.equal(a.state.pointerId, null);
    a.detach();
});

test('blur, backgrounding, and disposal clear keyboard and captured pointer state', () => {
    const a = arena(() => { throw new Error('Pointer capture not supported'); });
    const down = a.win.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(down.defaultPrevented, true);
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });
    a.canvas.dispatch('pointerdown');
    a.win.dispatch('blur');
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.win.dispatch('keydown', { key: 'w' });
    a.doc.hidden = true;
    a.doc.dispatch('visibilitychange');
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.detach();
    a.canvas.dispatch('pointerdown');
    a.win.dispatch('keydown', { key: 'ArrowLeft' });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
});

test('editable controls keep keyboard navigation; right-click does not engage virtual stick', () => {
    const a = arena();
    const editable = { closest: () => ({ tagName: 'INPUT' }) };
    assert.equal(a.win.dispatch('keydown', { key: 'ArrowDown', target: editable }).defaultPrevented, false);
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.canvas.dispatch('pointerdown', { pointerType: 'mouse', button: 2 });
    assert.equal(a.state.pointerId, null);
    a.win.dispatch('keydown', { key: 'a' });
    a.win.dispatch('keydown', { key: 's' });
    assert.ok(Math.abs(getArenaMovement(a.state).x + Math.SQRT1_2) < 0.00001);
    a.win.dispatch('keyup', { key: 'a' });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 1 });
    a.detach();
});

test('active hunts lock background document scrolling while keeping accessible health help', () => {
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/css/app.css', import.meta.url), 'utf8');
    const markup = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor', import.meta.url), 'utf8');
    assert.match(css, /\.game-canvas\s*\{[^}]*touch-action:\s*none/);
    assert.match(css, /html:has\(\.game-screen\), body:has\(\.game-screen\)\s*\{[^}]*overflow:\s*hidden/);
    assert.match(markup, /aria-label="Explain health and recovery"/);
    assert.match(markup, /Mend Wounds at a Refuge/);
});

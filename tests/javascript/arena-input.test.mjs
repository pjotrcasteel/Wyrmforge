import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachArenaInput, getArenaMovement, getArenaAim } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-input.js';

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

test('Safari touch continues steering after pointercancel and prevents scrolling', () => {
    const a = arena();
    const touch = (identifier, x, y) => ({ identifier, clientX: x, clientY: y });
    const start = touch(37, 120, 180);
    const moved = touch(37, 165, 180);
    assert.equal(a.canvas.dispatch('touchstart', { changedTouches: [start], touches: [start] }).defaultPrevented, true);
    assert.equal(a.state.touchId, 37);
    a.canvas.dispatch('pointercancel', { pointerId: 1 });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    const scroll = a.canvas.dispatch('touchmove', { touches: [moved], changedTouches: [moved] });
    assert.equal(scroll.defaultPrevented, true);
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });
    a.canvas.dispatch('pointermove', { pointerId: 1, clientX: 100, clientY: 100 });
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });

    const other = touch(38, 50, 50);
    a.canvas.dispatch('touchstart', { changedTouches: [other], touches: [moved, other] });
    a.canvas.dispatch('touchend', { changedTouches: [other], touches: [moved] });
    assert.equal(a.state.touchId, 37, 'The second finger must not cancel primary steering.');
    a.canvas.dispatch('touchend', { changedTouches: [moved], touches: [] });
    assert.equal(a.state.touchId, null);
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.detach();
});

test('touch cancellation, blur and teardown clear touch steering', () => {
    const a = arena();
    const touch = { identifier: 14, clientX: 100, clientY: 100 };
    a.canvas.dispatch('touchstart', { changedTouches: [touch], touches: [touch] });
    a.canvas.dispatch('touchmove', { changedTouches: [{ ...touch, clientX: 144 }], touches: [{ ...touch, clientX: 144 }] });
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });
    a.canvas.dispatch('touchcancel', { changedTouches: [touch], touches: [] });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
    a.canvas.dispatch('touchstart', { changedTouches: [touch], touches: [touch] });
    a.win.dispatch('blur');
    assert.equal(a.state.touchId, null);
    a.canvas.dispatch('touchstart', { changedTouches: [touch], touches: [touch] });
    a.detach();
    assert.equal(a.state.touchId, null);
    a.canvas.dispatch('touchstart', { changedTouches: [touch], touches: [touch] });
    assert.equal(a.state.touchId, null);
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

test('active hunts lock background scrolling while passive health display remains accessible', () => {
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/css/app.css', import.meta.url), 'utf8');
    const markup = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor', import.meta.url), 'utf8');
    assert.match(css, /\.game-canvas\s*\{[^}]*touch-action:\s*none/);
    assert.match(css, /html:has\(\.game-screen\), body:has\(\.game-screen\)\s*\{[^}]*overflow:\s*hidden/);
    assert.match(markup, /role="progressbar" aria-label="Health"/);
    assert.match(markup, /class="combat-hp-value">♥ HP 100\/100/);
    assert.doesNotMatch(markup, /Explain health and recovery|healthHelpOpen/);
});

function aimedArena() {
    const a = arena();
    a.canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 390, height: 700 });
    a.state.latestSnapshot = { player: { x: 500, y: 700 }, world: { width: 1000, height: 1800 } };
    return a;
}
const touchAt = (identifier, clientX, clientY) => ({ identifier, clientX, clientY });

test('WASD and deliberately held mouse aim coexist; idle mouse and window release restore auto', () => {
    const a = aimedArena();
    a.canvas.dispatch('pointermove', { pointerType: 'mouse', clientX: 390, clientY: 370 });
    assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
    a.win.dispatch('keydown', { key: 'w' });
    a.canvas.dispatch('pointerdown', { pointerType: 'mouse', clientX: 390, clientY: 370 });
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: -1 });
    assert.deepEqual(getArenaAim(a.state), { x: 1, y: 0 });
    a.win.dispatch('pointerup', { pointerType: 'mouse' });
    assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
    a.detach();
});

test('two simultaneous Safari touches retain independent move/aim owners in either changedTouches order', () => {
    for (const reversed of [false, true]) {
        const a = aimedArena();
        const left = touchAt(17, 90, 500), right = touchAt(18, 380, 370);
        a.canvas.dispatch('touchstart', { changedTouches: reversed ? [right, left] : [left, right] });
        a.canvas.dispatch('touchmove', { touches: [{ ...left, clientY: 470 }, right] });
        assert.deepEqual(getArenaMovement(a.state), { x: 0, y: -1 });
        assert.deepEqual(getArenaAim(a.state), { x: 1, y: 0 });
        a.canvas.dispatch('touchcancel', { changedTouches: [right] });
        assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
        assert.deepEqual(getArenaMovement(a.state), { x: 0, y: -1 });
        a.canvas.dispatch('touchend', { changedTouches: [left] });
        assert.deepEqual(getArenaMovement(a.state), { x: 0, y: 0 });
        a.detach();
    }
});

test('right-side tap expires rather than latching a manual heading; drag release immediately restores auto', () => {
    const a = aimedArena(), right = touchAt(3, 380, 370);
    a.canvas.dispatch('touchstart', { changedTouches: [right] });
    a.canvas.dispatch('touchend', { changedTouches: [right] });
    assert.deepEqual(getArenaAim(a.state, a.state.tapAimUntil - 1), { x: 1, y: 0 });
    assert.deepEqual(getArenaAim(a.state, a.state.tapAimUntil + 1), { x: 0, y: 0 });
    a.canvas.dispatch('touchstart', { changedTouches: [right] });
    const moved = { ...right, clientY: 410 };
    a.canvas.dispatch('touchmove', { touches: [moved] });
    a.canvas.dispatch('touchend', { changedTouches: [moved] });
    assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
    a.detach();
});

test('resize, blur, hidden document and capture cancellation release manual aim', () => {
    for (const ending of ['resize', 'blur', 'hidden', 'pointercancel', 'lostpointercapture']) {
        const a = aimedArena();
        a.canvas.dispatch('pointerdown', { pointerType: 'mouse', clientX: 390, clientY: 370 });
        if (ending === 'hidden') { a.doc.hidden = true; a.doc.dispatch('visibilitychange'); }
        else if (ending === 'pointercancel' || ending === 'lostpointercapture') a.canvas.dispatch(ending);
        else a.win.dispatch(ending);
        assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 }, ending);
        a.detach();
    }
});

test('camera offset and canvas origin transform to authoritative world direction, including edges', () => {
    const a = aimedArena();
    a.state.latestSnapshot.player = { x: 30, y: 50 };
    a.canvas.dispatch('pointerdown', { pointerType: 'mouse', clientX: 140, clientY: 70 });
    assert.deepEqual(getArenaAim(a.state), { x: 1, y: 0 });
    a.detach();
});

test('controller right-stick deadzone returns auto; left and right sticks remain independent', () => {
    const a = aimedArena();
    a.state.gamepads = () => [{ connected: true, axes: [0, -1, .1, .1] }];
    assert.deepEqual(getArenaMovement(a.state), { x: 0, y: -1 });
    assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
    a.state.gamepads = () => [{ connected: true, axes: [0, -1, -1, 0] }];
    assert.deepEqual(getArenaAim(a.state), { x: -1, y: 0 });
    a.state.gamepads = () => [{ connected: true, axes: [0, 0, 0, 0] }];
    assert.deepEqual(getArenaAim(a.state), { x: 0, y: 0 });
    a.detach();
});


test('right thumb can aim west with a short drag while remaining on the right half', () => {
    const a = aimedArena(), left = touchAt(11, 80, 500), right = touchAt(12, 370, 420);
    a.canvas.dispatch('touchstart', { changedTouches: [left, right] });
    a.canvas.dispatch('touchmove', { touches: [{ ...left, clientX: 110 }, { ...right, clientX: 340 }] });
    assert.deepEqual(getArenaMovement(a.state), { x: 1, y: 0 });
    assert.deepEqual(getArenaAim(a.state), { x: -1, y: 0 });
    a.detach();
});

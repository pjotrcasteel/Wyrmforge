import { resolveArenaCamera } from './arena-camera.js';

// Touch Events back up Pointer Events on Safari. Each channel has its own owner;
// a simultaneous second finger can never replace the movement finger.
const navigationKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']);
export function attachArenaInput(state, browserWindow = window, browserDocument = document) {
    const { canvas } = state;
    state.touchId = state.aimTouchId = state.aimPointerId = null;
    state.aimPoint = null;
    state.tapAimUntil = 0;
    state.pendingPropId = null;
    state.inputSuspended = false;
    const reset = () => {
        state.keys.clear();
        state.pointerId = state.touchId = state.aimTouchId = state.aimPointerId = null;
        state.aimPoint = null;
        state.tapAimUntil = 0;
        state.pendingPropId = null;
    };
    state.resetInput = reset;
    const rightSide = point => {
        const rect = canvas.getBoundingClientRect?.();
        return rect && point.clientX >= rect.left + rect.width * .55;
    };
    const setMove = point => {
        state.touchOrigin = { x: point.clientX, y: point.clientY };
        state.touchCurrent = { ...state.touchOrigin };
    };
    const setAim = point => { state.aimPoint = { x: point.clientX, y: point.clientY }; };
    const focusAt = point => {
        const snapshot = state.latestSnapshot, rect = canvas.getBoundingClientRect?.();
        const world = snapshot?.world;
        if (!rect || !world || !snapshot?.player || snapshot.paused ||
            point.clientX < rect.left || point.clientX > rect.left + rect.width ||
            point.clientY < rect.top || point.clientY > rect.top + rect.height) return false;
        const camera = resolveArenaCamera(world, snapshot.player, rect.width, rect.height);
        const x = point.clientX - rect.left + camera.x, y = point.clientY - rect.top + camera.y;
        let chosen = null, distance = Infinity;
        // Snapshot hit-testing is a request only; the authoritative simulation rechecks
        // kind eligibility, range, line of sight and remaining health by stable ID.
        for (const prop of snapshot.environment?.props ?? []) {
            if (prop.healthFraction <= 0) continue;
            const gap = Math.hypot(x - prop.x * world.width, y - prop.y * world.height);
            if (gap <= prop.radius + 9 && (gap < distance || (gap === distance && prop.id < chosen?.id))) {
                chosen = prop;
                distance = gap;
            }
        }
        if (!chosen) return false;
        state.pendingPropId = chosen.id;
        return true;
    };
    const onKeyDown = event => {
        state.inputSuspended = false;
        if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [contenteditable], [role="dialog"]')) return;
        if (navigationKeys.has(event.key)) event.preventDefault();
        state.keys.add(event.key.toLowerCase());
    };
    const onKeyUp = event => state.keys.delete(event.key.toLowerCase());
    const onPointerDown = event => {
        state.inputSuspended = false;
        if ((event.pointerType === 'mouse' && event.button !== 0) || state.touchId !== null || state.aimTouchId !== null) return;
        if (event.pointerType === 'mouse' || rightSide(event)) {
            if (state.aimPointerId !== null) return;
            state.aimPointerId = event.pointerId;
            state.aimIsTouch = event.pointerType === 'touch';
            state.aimStartedAt = Date.now();
            state.aimStart = { x: event.clientX, y: event.clientY };
            setAim(event);
        } else {
            if (state.pointerId !== null || event.isPrimary === false) return;
            state.pointerId = event.pointerId;
            setMove(event);
            state.pointerStartedAt = Date.now();
        }
        try { canvas.setPointerCapture?.(event.pointerId); } catch { /* Touch Events remain active. */ }
        if (event.pointerType === 'touch' && event.cancelable) event.preventDefault();
    };
    const onPointerMove = event => {
        if (state.touchId !== null || state.aimTouchId !== null) return;
        if (event.pointerId === state.aimPointerId) setAim(event);
        if (event.pointerId === state.pointerId) state.touchCurrent = { x: event.clientX, y: event.clientY };
        if (event.pointerType === 'touch' && event.cancelable) event.preventDefault();
    };
    const onPointerEnd = event => {
        if (event.pointerId === state.pointerId) {
            const tap = event.type === 'pointerup' && Date.now() - state.pointerStartedAt <= 180 &&
                Math.hypot(event.clientX - state.touchOrigin.x, event.clientY - state.touchOrigin.y) < 8;
            if (tap) focusAt(event);
            state.pointerId = null;
        }
        if (event.pointerId === state.aimPointerId) {
            const tap = event.type === 'pointerup' && Date.now() - state.aimStartedAt <= 180 &&
                Math.hypot(event.clientX - state.aimStart.x, event.clientY - state.aimStart.y) < 8;
            if (tap) focusAt(event);
            state.aimPointerId = null;
            state.tapAimUntil = 0; // Release and interrupted capture restore auto immediately.
        }
    };
    const onTouchStart = event => {
        state.inputSuspended = false;
        for (const touch of Array.from(event.changedTouches ?? [])) {
            if (rightSide(touch)) {
                if (state.aimTouchId !== null) continue;
                state.aimTouchId = touch.identifier;
                state.aimIsTouch = true;
                state.aimPointerId = null;
                state.aimStartedAt = Date.now();
                state.aimStart = { x: touch.clientX, y: touch.clientY };
                state.tapAimUntil = 0;
                setAim(touch);
            } else if (state.touchId === null) {
                state.touchId = touch.identifier;
                state.pointerId = null;
                setMove(touch);
                state.touchStartedAt = Date.now();
            }
        }
        if (event.cancelable) event.preventDefault();
    };
    const onTouchMove = event => {
        for (const touch of Array.from(event.touches ?? [])) {
            if (touch.identifier === state.touchId) state.touchCurrent = { x: touch.clientX, y: touch.clientY };
            if (touch.identifier === state.aimTouchId) setAim(touch);
        }
        if (event.cancelable) event.preventDefault();
    };
    const onTouchEnd = event => {
        for (const touch of Array.from(event.changedTouches ?? [])) {
            if (touch.identifier === state.touchId) {
                const tap = event.type === 'touchend' && Date.now() - state.touchStartedAt <= 180 &&
                    Math.hypot(touch.clientX - state.touchOrigin.x, touch.clientY - state.touchOrigin.y) < 8;
                if (tap) focusAt(touch);
                state.touchId = null;
            }
            if (touch.identifier === state.aimTouchId) {
                state.aimTouchId = null;
                const tap = event.type === 'touchend' && Date.now() - state.aimStartedAt <= 180 &&
                    Math.hypot(touch.clientX - state.aimStart.x, touch.clientY - state.aimStart.y) < 8;
                const propFocused = tap && focusAt(touch);
                // Only a non-prop tap uses the existing brief manual pointing cue.
                state.tapAimUntil = tap && !propFocused ? Date.now() + 350 : 0;
            }
        }
    };
    const suspend = () => { reset(); state.inputSuspended = true; };
    const onVisibilityChange = () => { if (browserDocument.hidden) suspend(); else state.inputSuspended = false; };
    const listen = (target, name, fn, options) => {
        target.addEventListener(name, fn, options);
        return () => target.removeEventListener(name, fn);
    };
    const detach = [
        listen(browserWindow, 'keydown', onKeyDown, { passive: false }),
        listen(browserWindow, 'keyup', onKeyUp), listen(browserWindow, 'blur', suspend),
        listen(browserWindow, 'focus', () => { state.inputSuspended = false; }),
        listen(browserWindow, 'resize', reset), listen(browserWindow, 'orientationchange', reset),
        listen(browserWindow, 'pointerup', onPointerEnd), listen(browserWindow, 'pointercancel', onPointerEnd),
        listen(browserDocument, 'visibilitychange', onVisibilityChange),
        listen(canvas, 'pointerdown', onPointerDown, { passive: false }),
        listen(canvas, 'pointermove', onPointerMove, { passive: false }),
        ...['pointerup', 'pointercancel', 'lostpointercapture'].map(name => listen(canvas, name, onPointerEnd)),
        listen(canvas, 'touchstart', onTouchStart, { passive: false }),
        listen(canvas, 'touchmove', onTouchMove, { passive: false }),
        ...['touchend', 'touchcancel'].map(name => listen(canvas, name, onTouchEnd)),
    ];
    return () => { for (const remove of detach) remove(); reset(); };
}

function stick(state, offset) {
    const pads = state.gamepads?.() ?? globalThis.navigator?.getGamepads?.() ?? [];
    for (const pad of pads) {
        if (!pad || pad.connected === false) continue;
        const x = pad.axes?.[offset] ?? 0, y = pad.axes?.[offset + 1] ?? 0;
        if (Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x, y) > .24) return normalize(x, y);
    }
    return { x: 0, y: 0 };
}

export function getArenaMovement(state) {
    if (state.inputSuspended) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (state.keys.has('arrowleft') || state.keys.has('a')) x -= 1;
    if (state.keys.has('arrowright') || state.keys.has('d')) x += 1;
    if (state.keys.has('arrowup') || state.keys.has('w')) y -= 1;
    if (state.keys.has('arrowdown') || state.keys.has('s')) y += 1;
    if (x !== 0 || y !== 0) return normalize(x, y);
    if (state.pointerId === null && state.touchId === null) return stick(state, 0);
    const dx = state.touchCurrent.x - state.touchOrigin.x, dy = state.touchCurrent.y - state.touchOrigin.y;
    return Math.hypot(dx, dy) < 5 ? { x: 0, y: 0 } : normalize(dx, dy);
}

export function getArenaPropFocus(state) {
    const id = state.inputSuspended || state.latestSnapshot?.paused ? null : state.pendingPropId;
    state.pendingPropId = null;
    return id ?? null;
}

// The physical controller stick and a dragged virtual right-thumb stick both request
// directional snap. A pointer tap or deliberate mouse aim remains precise.
export function isArenaStickAim(state, aim, now = Date.now()) {
    if (state.inputSuspended || state.latestSnapshot?.paused || Math.hypot(aim.x, aim.y) <= .01) return false;
    const draggingRightThumb = state.aimIsTouch && (state.aimTouchId != null || state.aimPointerId != null) &&
        state.aimStart && state.aimPoint && Math.hypot(state.aimPoint.x - state.aimStart.x, state.aimPoint.y - state.aimStart.y) >= 8;
    if (draggingRightThumb) return true;
    return state.aimTouchId == null && state.aimPointerId == null && state.tapAimUntil <= now;
}

export function getArenaAim(state, now = Date.now()) {
    if (state.inputSuspended || state.latestSnapshot?.paused) return { x: 0, y: 0 };
    const engaged = state.aimTouchId != null || state.aimPointerId != null || state.tapAimUntil > now;
    if (!engaged || !state.aimPoint) return stick(state, 2);
    if (state.aimIsTouch && state.aimStart) {
        const dx = state.aimPoint.x - state.aimStart.x, dy = state.aimPoint.y - state.aimStart.y;
        if (Math.hypot(dx, dy) >= 8) return normalize(dx, dy);
    }
    const rect = state.canvas.getBoundingClientRect?.();
    const player = state.latestSnapshot?.player;
    if (!rect || !player) return { x: 0, y: 0 };
    const camera = resolveArenaCamera(state.latestSnapshot.world, player, rect.width, rect.height);
    const dx = state.aimPoint.x - rect.left + camera.x - player.x;
    const dy = state.aimPoint.y - rect.top + camera.y - player.y;
    return Math.hypot(dx, dy) < 5 ? { x: 0, y: 0 } : normalize(dx, dy);
}
function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

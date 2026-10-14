// Arena-specific input lifecycle. Keep this independent of rendering so touch recovery can be tested without a browser.
const navigationKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']);

export function attachArenaInput(state, browserWindow = window, browserDocument = document) {
    const { canvas } = state;
    const reset = () => {
        state.keys.clear();
        state.pointerId = null;
    };
    const onKeyDown = event => {
        if (event.target?.isContentEditable ||
            event.target?.closest?.('input, textarea, select, [contenteditable], [role="dialog"]')) return;
        if (navigationKeys.has(event.key)) event.preventDefault();
        state.keys.add(event.key.toLowerCase());
    };
    const onKeyUp = event => state.keys.delete(event.key.toLowerCase());
    const onPointerDown = event => {
        if (state.pointerId !== null || event.isPrimary === false ||
            (event.pointerType === 'mouse' && event.button !== 0)) return;
        state.pointerId = event.pointerId;
        state.touchOrigin = { x: event.clientX, y: event.clientY };
        state.touchCurrent = { ...state.touchOrigin };
        try { canvas.setPointerCapture?.(event.pointerId); }
        catch { /* Keep movement while the pointer remains on canvas if capture is unavailable. */ }
        if (event.pointerType === 'touch' && event.cancelable) event.preventDefault();
    };
    const onPointerMove = event => {
        if (event.pointerId !== state.pointerId) return;
        state.touchCurrent = { x: event.clientX, y: event.clientY };
        if (event.pointerType === 'touch' && event.cancelable) event.preventDefault();
    };
    const onPointerEnd = event => {
        if (event.pointerId === state.pointerId) state.pointerId = null;
    };
    const onBlur = () => reset();
    const onVisibilityChange = () => { if (browserDocument.hidden) reset(); };

    browserWindow.addEventListener('keydown', onKeyDown, { passive: false });
    browserWindow.addEventListener('keyup', onKeyUp);
    browserWindow.addEventListener('blur', onBlur);
    browserDocument.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, onPointerEnd);
    return () => {
        browserWindow.removeEventListener('keydown', onKeyDown);
        browserWindow.removeEventListener('keyup', onKeyUp);
        browserWindow.removeEventListener('blur', onBlur);
        browserDocument.removeEventListener('visibilitychange', onVisibilityChange);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.removeEventListener(name, onPointerEnd);
        reset();
    };
}

export function getArenaMovement(state) {
    let x = 0;
    let y = 0;
    if (state.keys.has('arrowleft') || state.keys.has('a')) x -= 1;
    if (state.keys.has('arrowright') || state.keys.has('d')) x += 1;
    if (state.keys.has('arrowup') || state.keys.has('w')) y -= 1;
    if (state.keys.has('arrowdown') || state.keys.has('s')) y += 1;
    if (x !== 0 || y !== 0) return normalize(x, y);
    if (state.pointerId === null) return { x: 0, y: 0 };

    const dx = state.touchCurrent.x - state.touchOrigin.x;
    const dy = state.touchCurrent.y - state.touchOrigin.y;
    if (Math.hypot(dx, dy) < 5) return { x: 0, y: 0 };
    return normalize(dx, dy);
}

function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

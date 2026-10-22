(function () {
    const states = new WeakMap();
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const readingScale = viewport => viewport.clientWidth < 700 ? 0.95 : 1;
    const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const midpoint = points => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });

    function render(viewport, state) {
        const x = viewport.clientWidth / 2 - state.x * state.scale;
        const y = viewport.clientHeight / 2 - state.y * state.scale;
        state.canvas.style.transform = `translate(${x}px, ${y}px) scale(${state.scale})`;
        state.canvas.style.setProperty('--web-scale', String(state.scale));
        viewport.dataset.scale = String(state.scale);
        viewport.classList.toggle('overview', state.scale < 0.5);
    }

    function worldPoint(viewport, state, point) {
        return { x: state.x + (point.x - viewport.clientWidth / 2) / state.scale,
            y: state.y + (point.y - viewport.clientHeight / 2) / state.scale };
    }

    function applyScale(viewport, state, scale, point = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }) {
        const world = worldPoint(viewport, state, point);
        state.scale = clamp(scale, 0.08, 1.6);
        state.x = world.x - (point.x - viewport.clientWidth / 2) / state.scale;
        state.y = world.y - (point.y - viewport.clientHeight / 2) / state.scale;
        render(viewport, state);
    }

    function initialize(viewport) {
        if (!viewport || states.has(viewport)) return;
        const canvas = viewport.querySelector('.arcane-web-canvas');
        if (!canvas) return;
        const size = Number(viewport.dataset.worldSize) || 3200;
        const state = { canvas, size, x: Number(viewport.dataset.startX) || size / 2,
            y: Number(viewport.dataset.startY) || size / 2, scale: readingScale(viewport),
            pointers: new Map(), moved: false, pinched: false, frame: 0, removers: [] };
        states.set(viewport, state);
        render(viewport, state);
        const listen = (target, name, action, options) => {
            target.addEventListener(name, action, options);
            state.removers.push(() => target.removeEventListener(name, action, options));
        };
        const point = event => {
            const rect = state.rect || viewport.getBoundingClientRect();
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        };
        const startPan = position => {
            state.pan = { pointer: position, x: state.x, y: state.y };
        };
        const flush = () => {
            state.frame = 0;
            const points = [...state.pointers.values()];
            if (points.length === 1 && state.pan && state.moved) {
                state.x = state.pan.x - (points[0].x - state.pan.pointer.x) / state.scale;
                state.y = state.pan.y - (points[0].y - state.pan.pointer.y) / state.scale;
                render(viewport, state);
            } else if (points.length === 2 && state.pinch) {
                const middle = midpoint(points);
                state.scale = clamp(state.pinch.scale * distance(points) / state.pinch.distance, 0.08, 1.6);
                state.x = state.pinch.world.x - (middle.x - viewport.clientWidth / 2) / state.scale;
                state.y = state.pinch.world.y - (middle.y - viewport.clientHeight / 2) / state.scale;
                render(viewport, state);
            }
        };
        const begin = event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            event.preventDefault();
            const position = point(event);
            if (state.pointers.size === 0) {
                state.rect = viewport.getBoundingClientRect();
                state.moved = false;
                state.pinched = false;
                state.button = event.target.closest('button');
                startPan(position);
            }
            state.pointers.set(event.pointerId, position);
            if (event.pointerType !== 'touch') viewport.setPointerCapture(event.pointerId);
            if (state.pointers.size === 2) {
                const points = [...state.pointers.values()];
                state.pinched = true;
                state.moved = true;
                state.pinch = { distance: Math.max(1, distance(points)), scale: state.scale,
                    world: worldPoint(viewport, state, midpoint(points)) };
            }
        };
        const move = event => {
            if (!state.pointers.has(event.pointerId)) return;
            event.preventDefault();
            const position = point(event);
            state.pointers.set(event.pointerId, position);
            if (state.pan && Math.hypot(position.x - state.pan.pointer.x, position.y - state.pan.pointer.y) > 6) state.moved = true;
            viewport.classList.toggle('dragging', state.moved);
            if (!state.frame) state.frame = requestAnimationFrame(flush);
        };
        const release = event => {
            if (!state.pointers.has(event.pointerId)) return;
            if (event.type === 'pointerup') {
                const position = point(event);
                state.pointers.set(event.pointerId, position);
                if (state.pan && Math.hypot(position.x - state.pan.pointer.x, position.y - state.pan.pointer.y) > 6) state.moved = true;
            }
            if (state.frame) cancelAnimationFrame(state.frame);
            flush();
            const tapped = event.type === 'pointerup' && state.pointers.size === 1 && !state.moved && !state.pinched;
            state.pointers.delete(event.pointerId);
            if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
            if (state.pointers.size === 1) {
                state.pinch = null;
                startPan([...state.pointers.values()][0]);
            } else if (state.pointers.size === 0) {
                viewport.classList.remove('dragging');
                state.pan = null;
                state.pinch = null;
                if (tapped && state.button) {
                    state.button.focus({ preventScroll: true });
                    state.button.click();
                }
                state.button = null;
                state.rect = null;
            }
        };
        // Safari's touch stream has explicit, non-passive ownership. Do not run
        // both Pointer and Touch streams for the same finger gesture.
        const touchEvents = 'ontouchstart' in window;
        listen(viewport, 'pointerdown', event => { if (!touchEvents || event.pointerType !== 'touch') begin(event); });
        listen(viewport, 'pointermove', event => { if (!touchEvents || event.pointerType !== 'touch') move(event); });
        listen(viewport, 'pointerup', event => { if (!touchEvents || event.pointerType !== 'touch') release(event); });
        const touch = (event, action, type) => {
            event.preventDefault();
            for (const finger of event.changedTouches) action({ type, pointerType:'touch', pointerId:finger.identifier,
                clientX:finger.clientX, clientY:finger.clientY, target:event.target, preventDefault() {} });
        };
        if (touchEvents) {
            listen(viewport, 'touchstart', event => touch(event, begin, 'pointerdown'), { passive:false });
            listen(viewport, 'touchmove', event => touch(event, move, 'pointermove'), { passive:false });
            listen(viewport, 'touchend', event => touch(event, release, 'pointerup'), { passive:false });
            listen(viewport, 'touchcancel', event => touch(event, release, 'pointercancel'), { passive:false });
        }
        listen(viewport, 'pointercancel', event => { if (!touchEvents || event.pointerType !== 'touch') release(event); });
        listen(viewport, 'lostpointercapture', event => { if (!touchEvents || event.pointerType !== 'touch') release(event); });
        // Capture retargets the native compatibility click. Dispatch one real
        // node action above for a tap; a drag, pinch or cancellation never taps.
        listen(viewport, 'click', event => {
            if (event.isTrusted && event.detail > 0) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
        listen(viewport, 'wheel', event => {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                applyScale(viewport, state, state.scale * Math.exp(-event.deltaY * 0.005), point(event));
            } else {
                const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
                state.x += (event.deltaX || 0) * unit / state.scale;
                state.y += event.deltaY * unit / state.scale;
                render(viewport, state);
            }
        }, { passive: false });
        listen(viewport, 'keydown', event => {
            if (event.target !== viewport) return;
            const moves = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
            if (moves[event.key]) {
                event.preventDefault();
                state.x += moves[event.key][0] / state.scale;
                state.y += moves[event.key][1] / state.scale;
                render(viewport, state);
            } else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(viewport, 0.15); }
            else if (event.key === '-') { event.preventDefault(); zoom(viewport, -0.15); }
            else if (event.key === 'Home') { event.preventDefault(); reset(viewport); }
        });
        listen(window, 'blur', () => {
            state.pointers.clear(); state.pan = null; state.pinch = null; state.button = null; state.rect = null;
            state.moved = true; viewport.classList.remove('dragging');
        });
        state.resize = new ResizeObserver(() => render(viewport, state));
        state.resize.observe(viewport);
    }

    function zoom(viewport, delta) {
        const state = states.get(viewport);
        if (state) applyScale(viewport, state, state.scale + delta);
    }

    function reset(viewport) {
        const state = states.get(viewport);
        if (!state) return;
        state.x = Number(viewport.dataset.startX) || state.size / 2;
        state.y = Number(viewport.dataset.startY) || state.size / 2;
        state.scale = readingScale(viewport);
        render(viewport, state);
    }

    function overview(viewport) {
        const state = states.get(viewport);
        if (!state) return;
        state.x = state.y = state.size / 2;
        state.scale = Math.max(0.08, Math.min(viewport.clientWidth, viewport.clientHeight) / (state.size - 240));
        render(viewport, state);
    }

    function focus(viewport, x, y) {
        const state = states.get(viewport);
        if (!state) return;
        state.x = x; state.y = y;
        if (state.scale < 0.5) state.scale = readingScale(viewport);
        render(viewport, state);
    }

    function focusSchool(viewport, x, y) {
        const state = states.get(viewport);
        if (!state) return;
        state.scale = readingScale(viewport);
        focus(viewport, x, y);
    }

    function revealInspector(element) {
        if (!element || window.innerWidth > 760) return;
        element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }

    function dispose(viewport) {
        const state = states.get(viewport);
        if (!state) return;
        if (state.frame) cancelAnimationFrame(state.frame);
        state.resize.disconnect();
        state.removers.forEach(remove => remove());
        states.delete(viewport);
    }

    function openRefundDialog(dialog) {
        if (!dialog || dialog.open) return;
        dialog.showModal();
        dialog.querySelector('button')?.focus();
    }

    window.wyrmforgeArcaneWeb = { initialize, zoom, reset, focus, revealInspector, overview, focusSchool, openRefundDialog, dispose };
})();

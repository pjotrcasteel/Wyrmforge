(function () {
    const width = 1200;
    const height = 900;
    const states = new WeakMap();

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function defaultScale(viewport) {
        if (viewport.clientWidth < 700) return clamp(viewport.clientWidth / 710, 0.55, 0.68);
        if (viewport.clientWidth < 1100) return 0.82;
        return 0.92;
    }

    function apply(viewport, state, scale, focusX, focusY) {
        const canvas = viewport.querySelector('.arcane-web-canvas');
        const space = viewport.querySelector('.web-pan-space');
        if (!canvas || !space) return;

        const oldScale = state.scale;
        const nextScale = clamp(scale, 0.55, 1.45);
        const anchorX = focusX ?? viewport.clientWidth / 2;
        const anchorY = focusY ?? viewport.clientHeight / 2;
        const worldX = (viewport.scrollLeft + anchorX) / oldScale;
        const worldY = (viewport.scrollTop + anchorY) / oldScale;

        state.scale = nextScale;
        canvas.style.transform = `scale(${nextScale})`;
        space.style.width = `${width * nextScale}px`;
        space.style.height = `${height * nextScale}px`;
        viewport.scrollLeft = worldX * nextScale - anchorX;
        viewport.scrollTop = worldY * nextScale - anchorY;
    }

    function center(viewport, state) {
        requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(0, width * state.scale / 2 - viewport.clientWidth / 2);
            viewport.scrollTop = Math.max(0, height * state.scale / 2 - viewport.clientHeight / 2);
        });
    }

    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function midpoint(a, b, viewport) {
        const rect = viewport.getBoundingClientRect();
        return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    }

    function initialize(viewport) {
        if (!viewport || states.has(viewport)) return;

        const state = {
            scale: defaultScale(viewport),
            pointers: new Map(),
            dragStart: null,
            pinchDistance: 0,
            pinchScale: 1
        };
        states.set(viewport, state);
        apply(viewport, state, state.scale);
        center(viewport, state);

        viewport.addEventListener('pointerdown', event => {
            if (event.target.closest('.web-node')) return;
            viewport.setPointerCapture(event.pointerId);
            state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            viewport.classList.add('dragging');

            if (state.pointers.size === 1) {
                state.dragStart = {
                    x: event.clientX,
                    y: event.clientY,
                    left: viewport.scrollLeft,
                    top: viewport.scrollTop
                };
            } else if (state.pointers.size === 2) {
                const points = Array.from(state.pointers.values());
                state.pinchDistance = distance(points[0], points[1]);
                state.pinchScale = state.scale;
                state.dragStart = null;
            }
        });

        viewport.addEventListener('pointermove', event => {
            if (!state.pointers.has(event.pointerId)) return;
            state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

            if (state.pointers.size === 1 && state.dragStart) {
                viewport.scrollLeft = state.dragStart.left - (event.clientX - state.dragStart.x);
                viewport.scrollTop = state.dragStart.top - (event.clientY - state.dragStart.y);
            } else if (state.pointers.size === 2 && state.pinchDistance > 0) {
                const points = Array.from(state.pointers.values());
                const ratio = distance(points[0], points[1]) / state.pinchDistance;
                const mid = midpoint(points[0], points[1], viewport);
                apply(viewport, state, state.pinchScale * ratio, mid.x, mid.y);
            }
        });

        const release = event => {
            state.pointers.delete(event.pointerId);
            if (state.pointers.size === 0) {
                state.dragStart = null;
                state.pinchDistance = 0;
                viewport.classList.remove('dragging');
            } else if (state.pointers.size === 1) {
                const point = Array.from(state.pointers.values())[0];
                state.dragStart = { x: point.x, y: point.y, left: viewport.scrollLeft, top: viewport.scrollTop };
                state.pinchDistance = 0;
            }
        };

        viewport.addEventListener('pointerup', release);
        viewport.addEventListener('pointercancel', release);

        viewport.addEventListener('wheel', event => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            const rect = viewport.getBoundingClientRect();
            apply(viewport, state, state.scale + (event.deltaY < 0 ? 0.1 : -0.1), event.clientX - rect.left, event.clientY - rect.top);
        }, { passive: false });
    }

    function zoom(viewport, delta) {
        const state = states.get(viewport);
        if (!state) return;
        apply(viewport, state, state.scale + delta);
    }

    function reset(viewport) {
        const state = states.get(viewport);
        if (!state) return;
        apply(viewport, state, defaultScale(viewport));
        center(viewport, state);
    }

    window.wyrmforgeArcaneWeb = { initialize, zoom, reset };
})();

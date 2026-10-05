import { disposeArena as disposeBaseArena, initializeArena as initializeBaseArena } from './arena.js';

const frameStates = new WeakMap();
const activeSimulationIntervalMilliseconds = 1000 / 60;
const pausedSimulationIntervalMilliseconds = 100;

export function initializeArena(canvas, dotNetReference) {
    const originalGetBoundingClientRect = canvas.getBoundingClientRect.bind(canvas);
    const state = {
        dotNetReference,
        lastSimulationTimestamp: performance.now() - activeSimulationIntervalMilliseconds,
        latestSnapshot: null,
        originalGetBoundingClientRect,
        canvasRect: originalGetBoundingClientRect(),
        resizeObserver: null,
        onViewportChanged: null,
    };
    state.onViewportChanged = () => state.canvasRect = state.originalGetBoundingClientRect();
    canvas.getBoundingClientRect = () => state.canvasRect;
    state.resizeObserver = new ResizeObserver(state.onViewportChanged);
    state.resizeObserver.observe(canvas);
    window.addEventListener('resize', state.onViewportChanged);
    window.addEventListener('scroll', state.onViewportChanged, { passive: true });
    frameStates.set(canvas, state);
    initializeBaseArena(canvas, createThrottledReference(state));
}

export function disposeArena(canvas) {
    const state = frameStates.get(canvas);
    if (state) {
        state.resizeObserver?.disconnect();
        window.removeEventListener('resize', state.onViewportChanged);
        window.removeEventListener('scroll', state.onViewportChanged);
        canvas.getBoundingClientRect = state.originalGetBoundingClientRect;
        frameStates.delete(canvas);
    }
    disposeBaseArena(canvas);
}

function createThrottledReference(state) {
    return {
        invokeMethodAsync(method, ...args) {
            if (method !== 'Frame') return state.dotNetReference.invokeMethodAsync(method, ...args);
            const now = performance.now();
            const interval = state.latestSnapshot?.paused ? pausedSimulationIntervalMilliseconds : activeSimulationIntervalMilliseconds;
            const wait = Math.max(0, interval - (now - state.lastSimulationTimestamp));
            if (wait <= 0.5) return invokeFrame(state, args);
            return new Promise((resolve, reject) => {
                window.setTimeout(() => invokeFrame(state, args).then(resolve, reject), wait);
            });
        },
    };
}

async function invokeFrame(state, args) {
    const now = performance.now();
    const delta = Math.min((now - state.lastSimulationTimestamp) / 1000, 0.05);
    state.lastSimulationTimestamp = now;
    const snapshot = await state.dotNetReference.invokeMethodAsync('Frame', delta, args[1], args[2], args[3], args[4]);
    state.latestSnapshot = snapshot;
    return snapshot;
}

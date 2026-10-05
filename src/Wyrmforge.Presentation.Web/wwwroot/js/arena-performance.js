import { disposeArena as disposeBaseArena, initializeArena as initializeBaseArena } from './arena.js';

const frameStates = new WeakMap();
const activeSimulationIntervalMilliseconds = 1000 / 30;
const pausedSimulationIntervalMilliseconds = 100;

export function initializeArena(canvas, dotNetReference) {
    const state = {
        dotNetReference,
        lastSimulationTimestamp: performance.now() - activeSimulationIntervalMilliseconds,
        latestSnapshot: null,
    };
    frameStates.set(canvas, state);
    initializeBaseArena(canvas, createThrottledReference(state));
}

export function disposeArena(canvas) {
    frameStates.delete(canvas);
    disposeBaseArena(canvas);
}

function createThrottledReference(state) {
    return {
        invokeMethodAsync(method, ...args) {
            if (method !== 'Frame') return state.dotNetReference.invokeMethodAsync(method, ...args);
            const now = performance.now();
            const interval = state.latestSnapshot?.paused ? pausedSimulationIntervalMilliseconds : activeSimulationIntervalMilliseconds;
            const wait = Math.max(0, interval - (now - state.lastSimulationTimestamp));
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

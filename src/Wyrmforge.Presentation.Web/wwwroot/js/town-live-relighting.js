// Explicit developer opt-in: ?townGpuPreview=1.
// NEVER replaces the original panorama or NPC markup in the default Town.
// One shared G1/G3 renderer, the exact approved reference painting and the
// existing C# TownCitizen positions; no duplicate animation or pathfinding.
import { initializeTownPreview, updateTownPreviewCitizens, disposeTownPreview }
    from './town-relighting-preview.js';
import { readTownCitizensFromDom } from './town-citizen-gpu-bridge.js';

const sessions = new WeakMap();
let activeSession = null;

// Blazor removes its DOM before IDisposable may call the JS module. Retain
// exactly one active reference so detached WebGL contexts still get disposed.
function cleanup(session) {
    if (!session || session.disposed) return;
    session.disposed = true;
    session.observer?.disconnect();
    if (session.frame !== null) cancelAnimationFrame(session.frame);
    disposeTownPreview(session.canvas);
    delete session.scene.dataset.townGpuPreview;
    sessions.delete(session.scene);
    if (activeSession === session) activeSession = null;
}

function liveCitizens(scene, canvas) {
    const citizens = readTownCitizensFromDom(scene);
    updateTownPreviewCitizens(canvas, citizens);
    canvas.dataset.authoritativeCitizenCount = String(citizens.length);
    return citizens.length;
}

export async function mountTownLiveGpuPreview(selector = '.refuge-canonical-scene') {
    const scene = document.querySelector(selector);
    if (!scene || sessions.has(scene)) return false;
    if (activeSession && activeSession.scene !== scene) cleanup(activeSession);
    const canvas = scene.querySelector('.refuge-town-gpu-canvas');
    if (!canvas) return false;

    const session = { scene, canvas, observer: null, frame: null, disposed: false };
    sessions.set(scene, session);
    activeSession = session;
    scene.dataset.townGpuPreview = 'loading';

    const disable = error => {
        if (session.disposed) return;
        scene.dataset.townGpuPreview = 'failed';
        canvas.dataset.error = error.message;
        console.error('Town GPU optional preview restored original art:', error);
        cleanup(session);
        scene.dataset.townGpuPreview = 'failed';
    };

    try {
        await initializeTownPreview(canvas);
        if (session.disposed || !scene.isConnected) return false;
        liveCitizens(scene, canvas); // Complete the first REAL C# actor frame before switching.
        // Mutation records from the C# actor subtree, not a second game clock.
        const update = () => {
            session.frame = null;
            if (session.disposed) return;
            if (!scene.isConnected) { cleanup(session); return; }
            try { liveCitizens(scene, canvas); }
            catch (error) { disable(error); }
        };
        session.observer = new MutationObserver(mutations => {
            if (session.disposed || session.frame !== null) return;
            if (mutations.every(m => !m.target?.closest?.('.refuge-town-crowd') &&
                !m.addedNodes?.length && !m.removedNodes?.length)) return;
            session.frame = requestAnimationFrame(update);
        });
        session.observer.observe(scene, {
            subtree: true, childList: true, attributes: true,
            attributeFilter: ['style', 'data-town-feet-y', 'data-town-citizen-id'],
        });
        scene.dataset.townGpuPreview = 'ready';
        return true;
    } catch (error) {
        disable(error);
        return false;
    }
}

export function disposeTownLiveGpuPreview(selector = '.refuge-canonical-scene') {
    const scene = document.querySelector(selector);
    // Accept late Blazor teardown after the actual scene node was detached.
    cleanup(scene ? sessions.get(scene) : activeSession);
}

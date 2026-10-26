// Explicit developer opt-in: ?townGpuPreview=1.
// NEVER replaces the original panorama or NPC markup in the default Town.
// One shared G1/G3 renderer, the exact approved reference painting and the
// existing C# TownCitizen positions; no duplicate animation or pathfinding.
import { initializeTownPreview, updateTownPreviewCitizens, disposeTownPreview }
    from './town-relighting-preview.js';
import { readTownCitizensFromDom } from './town-citizen-gpu-bridge.js';

const sessions = new WeakMap();

function liveCitizens(scene, canvas) {
    const citizens = readTownCitizensFromDom(scene);
    updateTownPreviewCitizens(canvas, citizens);
    canvas.dataset.authoritativeCitizenCount = String(citizens.length);
    return citizens.length;
}

export async function mountTownLiveGpuPreview(selector = '.refuge-canonical-scene') {
    const scene = document.querySelector(selector);
    if (!scene || sessions.has(scene)) return false;
    const canvas = scene.querySelector('.refuge-town-gpu-canvas');
    if (!canvas) return false;

    const session = { scene, canvas, observer: null, frame: null, disposed: false };
    sessions.set(scene, session);
    scene.dataset.townGpuPreview = 'loading';

    const disable = error => {
        if (session.disposed) return;
        scene.dataset.townGpuPreview = 'failed';
        canvas.dataset.error = error.message;
        console.error('Town GPU optional preview restored original art:', error);
        disposeTownLiveGpuPreview(selector);
        scene.dataset.townGpuPreview = 'failed';
    };

    try {
        await initializeTownPreview(canvas);
        if (session.disposed || !scene.isConnected) return false;
        liveCitizens(scene, canvas); // Complete the first REAL C# actor frame before switching.
        // Mutation records from the C# actor subtree, not a second game clock.
        const update = () => {
            session.frame = null;
            if (session.disposed || !scene.isConnected) return;
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
    if (!scene) return;
    const session = sessions.get(scene);
    if (!session) return;
    session.disposed = true;
    session.observer?.disconnect();
    if (session.frame !== null) cancelAnimationFrame(session.frame);
    disposeTownPreview(session.canvas);
    delete scene.dataset.townGpuPreview;
    sessions.delete(scene);
}

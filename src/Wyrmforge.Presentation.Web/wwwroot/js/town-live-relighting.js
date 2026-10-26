// Explicit developer opt-in: ?townGpuPreview=1.
// NEVER replaces the original panorama or NPC markup in the default Town.
// One shared G1/G3 renderer, the exact approved reference painting and the
// existing C# TownCitizen positions; no duplicate animation or pathfinding.
import { initializeTownPreview, updateTownPreviewCitizens, disposeTownPreview }
    from './town-relighting-preview.js';
import { readTownCitizensFromDom } from './town-citizen-gpu-bridge.js';
import { TOWN_LIGHT_ISOLATIONS } from './town-light-domains.js';

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

function authoritativeLighting(scene, query) {
    const bool = key => {
        const value = scene.dataset[key];
        if (value !== 'true' && value !== 'false')
            throw new TypeError('Missing authoritative C# Town flag: ' + key);
        return value === 'true';
    };
    const strength = Number(scene.dataset.nexusRadianceStrength);
    if (!Number.isFinite(strength) || strength < 0 || strength > 1)
        throw new TypeError('Invalid C# Nexus progression strength');
    const isolation = query.get('townLightDomain') ?? 'combined';
    if (!TOWN_LIGHT_ISOLATIONS.includes(isolation))
        throw new TypeError('Invalid developer domain override');
    return {
        unlocks: {
            nexusUnlocked: bool('townNexusUnlocked'),
            forgeUnlocked: bool('townForgeUnlocked'),
            codexUnlocked: bool('townCodexUnlocked'),
            hallUnlocked: bool('townHallUnlocked'),
        },
        school: scene.dataset.nexusSchool ?? 'none',
        strength,
        isolation,
        neutralMagic: query.get('townMagicWhite') === '1',
    };
}

function liveCitizens(scene, canvas, query) {
    const citizens = readTownCitizensFromDom(scene);
    updateTownPreviewCitizens(canvas, citizens, authoritativeLighting(scene, query));
    canvas.dataset.authoritativeCitizenCount = String(citizens.length);
    return citizens.length;
}

export async function mountTownLiveGpuPreview(selector = '.refuge-canonical-scene') {
    const scene = document.querySelector(selector);
    if (!scene || sessions.has(scene)) return false;
    if (activeSession && activeSession.scene !== scene) cleanup(activeSession);
    const canvas = scene.querySelector('.refuge-town-gpu-canvas');
    if (!canvas) return false;

    const query = new URLSearchParams(location.search);
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
        // Both Stage 3 art binaries must be installed for this secondary
        // opt-in. Default preview never changes or uses missing art paths.
        // Use the already-authored remade well for all opt-in lighting reviews.
        // Explicit developer ?townWellStage4=0 keeps old comparison possible.
        const wellV4 = query.get('townWellStage4') !== '0';
        await initializeTownPreview(canvas, { wellV4, domains: true,
            sourceMode: query.get('townGpuSource') === 'day-candidate' ? 'day-candidate' : 'night',
            ...authoritativeLighting(scene, query) });
        if (session.disposed || !scene.isConnected) return false;
        liveCitizens(scene, canvas, query); // Complete the first REAL C# actor frame before switching.
        // Mutation records from the C# actor subtree, not a second game clock.
        const update = () => {
            session.frame = null;
            if (session.disposed) return;
            if (!scene.isConnected) { cleanup(session); return; }
            try { liveCitizens(scene, canvas, query); }
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
            attributeFilter: ['style', 'data-town-feet-y', 'data-town-citizen-id',
                'data-nexus-school', 'data-nexus-radiance-strength',
                'data-town-nexus-unlocked', 'data-town-forge-unlocked',
                'data-town-codex-unlocked', 'data-town-hall-unlocked'],
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

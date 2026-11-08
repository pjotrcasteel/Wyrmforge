// The Hunt's first playable scene is hidden until the C# terrain and the actual
// renderer are ready. This is a presentation barrier, never a second simulator.
const TIPS = Object.freeze([
    'Drag to move. Your equipped spell attacks automatically.',
    'Keep moving when an enemy winds up. A dodge is better than a trade.',
    'Fireball breaks exposed ground. Watch where the stone gives way.',
    'Gather what survives the Hunt; secure it at the Refuge.',
]);

/** The active terrain site, not its mutable crater revision. Non-combat menus never open the gate. */
export function huntEntrySceneKey(snapshot) {
    const terrain = snapshot?.environment?.terrain;
    if (!terrain || snapshot.paused || snapshot.ended || !snapshot.player || !snapshot.world) return null;
    const world = snapshot.environment;
    return [world.seed, world.biome, world.landmark, terrain.columns, terrain.rows].join(':');
}

/** Real readiness signals only: no synthetic elapsed progress or fixed wait. */
export function huntEntryReadiness(snapshot, state) {
    if (!huntEntrySceneKey(snapshot)) return 'inactive';
    if (!state.terrainFrame || state.terrainFrame.revision !== snapshot.environment.terrain.revision)
        return 'terrain';
    if (!state.atlasSettled) return 'atlas';
    if (state.authoredPending) return 'actors';
    if (snapshot.environment.greybox && !state.gpuWorld && !state.gpuError)
        return 'lighting';
    if (state.renderError || state.renderingFailed) return 'renderer';
    if (!state.terrainCache || state.terrainCache.revision !== state.terrainFrame.revision)
        return 'painting';
    if (!state.framePresented) return 'scene';
    return 'ready';
}

const PHASE_LABELS = Object.freeze({
    terrain: 'SHAPING THE TRAIL',
    atlas: 'AWAKENING THE WORLD',
    actors: 'CALLING THE HUNTER',
    lighting: 'LIGHTING THE FOREST',
    renderer: 'PREPARING THE SCENE',
    painting: 'PAINTING THE TERRAIN',
    scene: 'OPENING THE GATE',
});

function createOverlay(document, parent) {
    const overlay = document.createElement('section');
    overlay.className = 'hunt-entry-loading';
    overlay.dataset.huntLoading = 'true';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Preparing the Hunt');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<div class="hunt-entry-loading__art" aria-hidden="true"></div>
        <div class="hunt-entry-loading__contents">
            <div class="hunt-entry-loading__sigil" aria-hidden="true">✦</div>
            <span class="hunt-entry-loading__eyebrow">WYRMFORGE · THE WILD HUNT</span>
            <strong class="hunt-entry-loading__title">BEYOND THE GATE</strong>
            <span class="hunt-entry-loading__phase" data-hunt-phase>AWAKENING THE WORLD</span>
            <div class="hunt-entry-loading__pulse" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="hunt-entry-loading__tip" data-hunt-tip>Drag to move. Your equipped spell attacks automatically.</p>
        </div>`;
    parent.appendChild(overlay);
    return overlay;
}

/**
 * A one-scene latch. The first newly selected Hunt site becomes visible only
 * after the compositor has painted a complete frame. Returning to a paused map
 * must not hide map choices, and later terrain revision changes must not re-lock
 * an already playing Hunt.
 */
export function createHuntEntryGate(parent) {
    const overlay = createOverlay(parent.ownerDocument, parent);
    const phase = overlay.querySelector('[data-hunt-phase]');
    const tip = overlay.querySelector('[data-hunt-tip]');
    let key = null, blocked = false, disposed = false, currentPhase = null;
    const show = value => {
        overlay.classList.toggle('hunt-entry-loading--visible', value);
        overlay.setAttribute('aria-hidden', value ? 'false' : 'true');
    };
    show(false);
    return {
        isBlocking: () => !disposed && blocked,
        update(snapshot, stage) {
            if (disposed) return;
            const next = huntEntrySceneKey(snapshot);
            if (!next) {
                // The C# map, level-up and refuge dialogs remain fully usable.
                if (snapshot?.paused || snapshot?.ended) {
                    blocked = false;
                    show(false);
                }
                return;
            }
            if (next !== key) {
                key = next;
                blocked = true;
                currentPhase = null;
            }
            if (!blocked) return;
            if (stage === 'ready') {
                blocked = false;
                show(false);
                return;
            }
            show(true);
            if (currentPhase === stage) return;
            currentPhase = stage;
            phase.textContent = PHASE_LABELS[stage] ?? PHASE_LABELS.scene;
            const salt = (snapshot.environment.seed >>> 0) % TIPS.length;
            const step = Object.keys(PHASE_LABELS).indexOf(stage);
            tip.textContent = TIPS[(salt + Math.max(0, step)) % TIPS.length];
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            blocked = false;
            overlay.remove();
        },
    };
}

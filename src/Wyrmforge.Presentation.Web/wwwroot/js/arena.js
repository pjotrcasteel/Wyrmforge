import { huntLayerCapture, huntLayerRevision, visibleHuntEnemyLayers, reusableEnemyPoseRevision, alignedEnemyPoseRaster,
    prepareHuntGpuScratch, HuntGpuScratchPool,
    prepareHuntGpuPresentation, presentCompletedHuntGpuFrame, shouldStageHuntGpuReviewFrame, shouldUseG4NeutralGround } from './hunt-gpu-layers.js?v=20261106-default-hunt1-gate-v1';
import { mountG4DeviceReview } from './lighting/g4-device-review.js';
import { lighting01Requested, submitLighting01Fixtures } from './lighting/g5-world-composition.js';
import { preloadFireballV5 } from './arena-fireball-v5.js';
import { createPlayerDangerState, updatePlayerDanger, playerDangerPresentation, drawPlayerDanger } from './player-danger.js';
import { attachArenaInput, getArenaMovement, getArenaAim, isArenaStickAim, getArenaPropFocus } from './arena-input.js';
import { resolveTargetIndicator, presentTargetSigil, drawTargetIndicator, preloadTargetSigilArt, targetSelectionLightEmitter, targetSelectionCanvasLight, actorLightsWithoutSigilOverlay } from './arena-target-indicator.js?v=20261028-feet-centered-v3';
import { drawArenaEnvironment, drawArenaExit, drawArenaCloisterReflections, getArenaCloisterElevations, createDestructibleLayers, drawArenaCloisterElevation, semanticSiteModeEnabled } from './arena-environment.js?v=20261106-default-hunt1-gate-v1';
import { drawAr1GeographyReview } from './arena-ar1-geography-review.js?v=20261031-ar1-site-detail-v1';
import { drawGreyboxGround } from './arena-greybox-ground.js';
import { TerrainCanvasCache, influenceBandIndex, blockInsetOverlayEnabled, drawBlockInsetOverlay, occludingTerrainCells, eraseTerrainOcclusion, repaintTerrainOcclusion, mergeTerrainFrame, terrainCaptureWindow, TERRAIN_PAD_UNITS } from './arena-terrain-canvas.js';
import { raisedActor, TERRAIN_ART_SCALE, FACE_PIXELS } from './arena-projection.js';
import { ambientParticles, drawAmbientParticles } from './arena-ambient-particles.js';
import { readArenaDebugFlags, botMovement, roadWalkDirection, createBotMemory, withDebugAmbient, withMoonShadows } from './arena-debug.js';
import { createFrameSampler, readHeapMegabytes, perfReport, perfLines } from './arena-perf.js';
import { createDestructionFx, observeTerrain, drawDestructionFx, drawFireZoneVignette, drawCrackGlow, drawBedrockGlow, paintGroundEmissive } from './arena-destruction-fx.js';
import { liveWetForestMaterialDiagnostics } from './arena-live-wet-forest-materials.js';
import { sortSceneDepthLayers } from './arena-cloister-art.js';
import { drawTree, treeLayers, collectTrees, collectBushes, collectBoulders } from './arena-tree-art.js';
import { drawTorch, torchLayers, collectTorches } from './arena-torch-art.js';
import { torchSprites } from './arena-torch-sprites.js';
import {
    ENEMY_CHARACTERS, AUTHORED_SETS, createAuthoredState, preloadAuthoredCharacter, preloadCrawlOut, loadedManifests, authoredCharacter, updateAuthoredEnemies, updateAuthoredWizard,
    drawAuthoredEnemy, drawAuthoredCorpses, drawAuthoredWizard, drawAuthoredAshfang, drawAuthoredAshfangDeath, authoredDiagnostics,
    setAuthoredRenderMode, enemyHasEmissivePose, emissionIntensity,
} from './authored-characters.js';
import { drawRecoveryGuide } from './arena-recovery.js';
import { drawSpellCastMotion, drawSpellProjectile, drawSpellImpact } from './arena-spell-vfx.js';
import { drawMage, updateMageWalk } from './arena-mage.js';
import { drawEnemyPixelArt, createEnemyMotionState, updateEnemyMotions, enemyFacing } from './arena-enemy-art.js';
import { preloadPaintedEnemies, drawPaintedEnemy, drawPaintedWyrm, updatePaintedCorpses, drawPaintedCorpses, mireHoundPixelPreviewEnabled } from './painted-enemies.js';
import { preloadHollowSprites, hollowSpritesReady, createHollowState, updateHollowSprites, drawHollowEnemy, drawHollowCorpses, hollowDiagnostics } from './hollow-sprites.js';
import { hollowFractureEmitters, hollowFractureCanvasLights, withHollowFractureLightingFrame } from './hollow-fracture.js';
import { preloadAshfang, createAshfangState, updateAshfang, drawAshfang, drawAshfangDeath, ashfangSockets, ashfangDiagnostics } from './ashfang-sprites.js';
import { drawAshfangWarning, drawAshfangGroundEffects, drawAshfangAirEffects, ashfangVfxDiagnostics } from './ashfang-vfx.js';
import { ashlingSprites } from './ashling-sprites.js';
import { drawFieldAmbushTell } from './arena-field-ambush-vfx.js';
import { drawTransformations } from './arena-transformation-vfx.js';
import { drawEnemyTelegraph, drawHostileProjectileGround, drawHostileProjectileEmber, drawShieldGuard, drawAshRemains, drawWraithRipple } from './arena-enemy-telegraphs.js';
import { drawReliquaryGround, drawReliquaryEmergence, drawReliquaryHushVeil, drawReliquaryBar } from './arena-reliquary-vfx.js';
import { drawBellWardenGround, drawBellWardenEntrance, drawBellWardenBar } from './arena-bellwarden-vfx.js';
import { drawWinterBellGround, drawWinterBellAir } from './arena-winterbell-vfx.js';
import { drawGlassReliquaryGround, drawGlassReliquaryAir } from './arena-glass-reliquary-vfx.js';
import { loadArt, artReady, artGeneration, hasArtFrame, drawArtFrame } from './art-atlas.js';
import { buildSpellLights, drawSpellLightSpill, sampleSpellLight, drawActorWithEmitter } from './arena-spell-lighting.js?v=20261028-ground-light-v3';
import { gothicNightLightSources, gothicNightPlan, drawGothicNight, GOTHIC_NIGHT } from './arena-night-lighting.js';
import { createWetForestFirelightPlan } from './arena-wet-forest-dressing.js';
import { resolveArenaCamera, drawExitGuide } from './arena-camera.js';
import { drawEliteGround, drawEliteCrest, enemyGroundDecorationVisible } from './arena-elite-vfx.js';
import { drawLightningTrace } from './arena-lightning-vfx.js';
import { drawDamageNumbers, loadDamageNumberMode, normalizeDamageNumberMode, saveDamageNumberMode } from './arena-damage-numbers.js';
import { drawBlackIce, drawSplinterBloom, drawIceLance, drawPlayerChill, drawAvalancheWave, drawSnowCloud, drawRimeHusk, drawRimeArmor } from './arena-frost-vfx.js';

const arenas = new WeakMap();

// One shared engine for both authored scenes and the textureless default Hunt.
// The actual C# snapshot identifies the greybox; labs and explicit legacy reviews
// keep their existing opt-in GPU behavior. A failed GPU retains Canvas night fallback.
function requestSharedGpuWorld(state, quality = 'mobile') {
    if (!state.active || state.gpuWorld || state.gpuPending || state.gpuError) return;
    state.gpuPending = true;
    void import('./arena-gpu-world.js').then(({ HuntGpuWorld }) => {
        if (state.active) state.gpuWorld = new HuntGpuWorld({ quality, projection: state.debug.shear ? 'metric' : 'legacy' });
    }).catch(error => { state.gpuError = String(error); })
        .finally(() => { state.gpuPending = false; });
}

export function initializeArena(canvas, dotNetReference) {
    disposeArena(canvas);
    // Atlases stream in; until they decode, every layer uses its code-painted fallback.
    loadArt(new URL('../art/', import.meta.url).href);
    preloadFireballV5();
    preloadPaintedEnemies();
    preloadHollowSprites();
    ashlingSprites.preload();
    for (const name of AUTHORED_SETS) preloadAuthoredCharacter(name);
    preloadCrawlOut();
    preloadAshfang();
    const state = createState(canvas, dotNetReference);
    const settings = canvas.closest('.game-screen')?.querySelector('[data-damage-numbers]');
    if (settings) {
        settings.value = state.damageNumberMode;
        state.damageNumberSettings = settings;
        state.onDamageNumberModeChanged = () => {
            state.damageNumberMode = normalizeDamageNumberMode(settings.value);
            saveDamageNumberMode(window.localStorage, state.damageNumberMode);
        };
        settings.addEventListener('change', state.onDamageNumberModeChanged);
    }
    arenas.set(canvas, state);
    state.detachInput = attachArenaInput(state);
    const params = new URLSearchParams(location.search);
    state.lighting01 = lighting01Requested(params);
    // Optional legacy review presets remain independent of the default greybox;
    // the normal grey receiver will be illuminated by this same shared engine.
    state.g4FlatGround = shouldUseG4NeutralGround(params, params.get('arenaGpu') === '1');
    state.g4StageFrames = shouldStageHuntGpuReviewFrame(params, params.get('arenaGpu') === '1');
    if (params.get('g4Review') === '1') {
        const gpuRequested = params.get('arenaGpu') === '1';
        state.g4Review = mountG4DeviceReview(canvas, () => state.gpuWorld?.diagnostics(),
            gpuRequested ? 'gpu' : 'canvas', gpuRequested ? params.get('gpuQuality') ?? 'balanced' : null);
    }
    if (params.get('arenaGpu') === '1')
        requestSharedGpuWorld(state, params.get('gpuQuality') ?? 'balanced');
    const now = performance.now();
    state.lastSimulationTimestamp = now;
    state.performanceWindowStarted = now;
    state.animationFrame = requestAnimationFrame(timestamp => frame(state, timestamp));
}

/** Browser-only design review: the whole Hunt 1.0 arena, painted terrain plus trees, bushes and boulders, as one unlit PNG at art density. Read-only. */
export function renderArenaMapOverview(canvas) {
    const state = arenas.get(canvas), frame = state?.terrainFrame, cache = state?.terrainCache;
    if (!frame || !cache?.canvas) return null;
    const band = huntBand(state, state.latestSnapshot);
    const out = document.createElement('canvas');
    out.width = cache.canvas.width; out.height = cache.canvas.height;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(cache.canvas, 0, 0);
    g.setTransform(TERRAIN_ART_SCALE, 0, 0, TERRAIN_ART_SCALE, 0, TERRAIN_PAD_UNITS * TERRAIN_ART_SCALE);
    const props = [...collectTrees(frame, band), ...collectBushes(frame, band), ...collectBoulders(frame, band),
        ...collectTorches(frame).map(torch => ({ torch, depth: torch.y + 2 }))].sort((a, b) => a.depth - b.depth);
    for (const prop of props) { if (prop.torch) drawTorch(g, prop.torch, 0); else drawTree(g, prop); }
    return { png: out.toDataURL('image/png'), columns: frame.columns, rows: frame.rows, face: FACE_PIXELS, band, pad: TERRAIN_PAD_UNITS, scale: TERRAIN_ART_SCALE,
        dug: [...frame.fine.keys()], stoneExposed: stoneExposedBlocks(frame) };
}

/** Indices of soil-topped blocks that have been dug down to their rock: evidence that excavation reached the strata. Read-only. */
function stoneExposedBlocks(frame) {
    if (!frame?.fine) return [];
    return [...frame.fine].filter(([, block]) => block.topsoil <= 1 && block.heights.some(height => height <= block.stoneTop)).map(([index]) => index);
}

// Read-only diagnostics allow browser smoke to verify actual movement, not merely visible canvas pixels.
export function readArenaDiagnostics(canvas) {
    const state = arenas.get(canvas);
    if (!state) return null;
    return {
        active: state.active,
        worldReady: hasAuthoritativeHuntWorld(state.latestSnapshot),
        hud: state.latestSnapshot?.hud??null,
        paused: state.latestSnapshot?.paused??false,
        ended: state.latestSnapshot?.ended??false,
        movement: getArenaMovement(state),
        aim: getArenaAim(state),
        pendingPropId: state.pendingPropId,
        aimedPropId: state.latestSnapshot?.player?.aimPropId ?? null,
        projectiles: state.latestSnapshot?.projectiles ?? [],
        // Read-only visual provenance for real-Hunt evidence captures.
        // These never modify the original scene, C# simulation, or VFX renderer.
        fireballVisual: state.latestSnapshot?.fireballVisual ?? null,
        elementalImpacts: state.latestSnapshot?.elementalImpacts ?? [],
        burningGrounds: state.latestSnapshot?.burningGrounds ?? [],
        essenceBursts: state.latestSnapshot?.essenceBursts ?? [],
        castMotion: state.latestSnapshot?.castMotion ?? null,
        pointerId: state.pointerId,
        touchId: state.touchId,
        player: state.latestSnapshot?.player ?? null,
        world: state.latestSnapshot?.world ?? null,
        exit: state.latestSnapshot?.exit ?? null,
        exitLandmark: state.latestSnapshot?.exitLandmark ?? null,
        exitPorts: state.latestSnapshot?.exitPorts ?? [],
        extraction: state.latestSnapshot?.extraction ?? null,
        enemies: state.latestSnapshot?.enemies ?? [],
        deathBursts: state.latestSnapshot?.deathBursts ?? [],
        damageNumbers: state.latestSnapshot?.damageNumbers ?? [],
        damageNumberMode: state.damageNumberMode,
        hollow: hollowDiagnostics(state.hollow),
        ashling: ashlingSprites.diagnostics(state.ashling),
        authored: authoredDiagnostics(state.authored),
        ashfang: ashfangDiagnostics(state.ashfang),
        ashfangVfx: ashfangVfxDiagnostics(state.latestSnapshot??{},ashfangSockets(state.ashfang)),
        ashfangEffects: state.latestSnapshot?.ashfangEffects??[],
        dragon: state.latestSnapshot?.dragon ?? null,
        dragonBreath: state.latestSnapshot?.dragonBreath ?? null,
        huntHazards: state.latestSnapshot?.huntHazards ?? [],
        hunt: state.latestSnapshot?.hunt ?? null,
        performance: { fps:state.displayFps, simulationHz:state.displaySimulationHz, simulationMilliseconds:state.displaySimulationMilliseconds, bridgeMilliseconds:state.displayBridgeMilliseconds },
        renderingFailed: Boolean(state.renderingFailed),
        renderError: state.renderError ?? null,
        renderingError: state.renderingError ?? null,
        sharedLighting: state.sharedLightingFrame ?? state.latestSnapshot?.lighting ?? null,
        lighting01: { enabled: Boolean(state.lighting01), fixedFixtures: state.lighting01FixtureCount ?? 0 },
        gpuWorld: state.gpuWorld
            ? { ...state.gpuWorld.diagnostics(), scratchPool: state.gpuScratchPool?.diagnostics() ?? null }
            : { error: state.gpuError ?? null },
        hollowFractureGpuEmitters: state.fractureGpuEmitters ?? [],
        greybox: state.latestSnapshot?.environment?.greybox ?? null,
        greyboxLighting: state.latestSnapshot?.environment?.greybox
            ? state.gpuWorld ? 'shared-gpu' : state.gpuError ? 'canvas-fallback' : 'starting'
            : null,
        wetForestGround: state.latestSnapshot?.environment?.wetForest
            ? state.g4FlatGround
                ? { status: 'flat-colors', source: 'C# recipe', variant: null }
                : liveWetForestMaterialDiagnostics(state.latestSnapshot.environment.seed) : null,
        terrainPresentation: state.latestSnapshot?.environment?.greybox
            ? 'one-meter-greybox' : state.g4FlatGround ? 'neutral-grey' : 'painted',
        framePresentation: state.g4StageFrames ? 'staged' : 'direct',
        debug: state.debug,
        perfReport: arenaPerfReport(state),
        veinSeams: state.veinSeams ?? null,
        fieldAmbush: state.latestSnapshot?.fieldAmbush ?? null,
        destructionFx: state.destructionFx
            ? { craters: state.destructionFx.craters, heat: state.destructionFx.heat.length, chips: state.destructionFx.chips.length } : null,
        gpuScene: state.debug.shear ? state.gpuWorld?.sceneReport?.() ?? null : null,
        hunt1Terrain: state.latestSnapshot?.environment?.terrain
            ? { columns: state.latestSnapshot.environment.terrain.columns, rows: state.latestSnapshot.environment.terrain.rows,
                snapshotRevision: state.latestSnapshot.environment.terrain.revision,
                paintedRevision: state.terrainCache?.revision ?? null, repaints: state.terrainCache?.repaints ?? 0,
                dugBlocks: state.terrainFrame?.fine?.size ?? 0, stoneExposed: stoneExposedBlocks(state.terrainFrame).length,
                torches: collectTorches(state.terrainFrame).map(torch => ({ x: torch.x, y: torch.y, variant: torch.variant, art: torchSprites(torch.variant) !== null })) }
            : null,
        lighting: { mode: 'night', darkness: GOTHIC_NIGHT.darkness, source: 'authoritative-csharp-snapshot' },
    };
}

/** Browser-only G4 review proof; compares real GPU shadow pixels without advancing C# gameplay. */
export function readArenaShadowPixelProof(canvas, sourceId) {
    const state = arenas.get(canvas);
    if (!state?.g4Review || !state.gpuWorld || typeof sourceId !== 'string') return null;
    return state.gpuWorld.shadowPixelProof(sourceId);
}

export function disposeArena(canvas) {
    const state = arenas.get(canvas);
    if (!state) return;
    state.active = false;
    cancelAnimationFrame(state.animationFrame);
    state.detachInput?.();
    if (state.damageNumberSettings) state.damageNumberSettings.removeEventListener('change', state.onDamageNumberModeChanged);
    state.g4Review?.dispose();
    state.gpuWorld?.dispose();
    state.gpuScratchPool?.clear();
    if (state.gpuPresentation) {
        state.gpuPresentation.width = 0;
        state.gpuPresentation.height = 0;
    }
    arenas.delete(canvas);
}

function createState(canvas, dotNetReference) {
    return {
        canvas,
        context: canvas.getContext('2d'),
        gpuPresentation: null,
        pixelRatio: 1,
        nightMask: document.createElement('canvas'),
        actorLightBuffer: document.createElement('canvas'),
        targetSigilArt: preloadTargetSigilArt(),
        damageNumberMode: loadDamageNumberMode(window.localStorage),
        targetSigil: { key: null, activeMarker: null, lastOpacity: 0, enteredAt: 0, exitedAt: null, exitMarker: null },
        dotNetReference,
        debug: readArenaDebugFlags(),
        frameSampler: createFrameSampler(),
        lastRenderTimestamp: 0,
        botMemory: createBotMemory(),
        active: true,
        simulationBusy: false,
        latestSnapshot: null,
        playerDanger: createPlayerDangerState(),
        mageWalk: { x: null, y: null, lastMove: Number.NEGATIVE_INFINITY },
        enemyMotion: createEnemyMotionState(),
        paintedCorpses: {},
        hollow: createHollowState(),
        ashling: ashlingSprites.createState(),
        // The owner's authored eight-direction characters; ?authored=0 returns to the old art for comparison.
        authored: createAuthoredState(),
        authoredCharacters: new URLSearchParams(location.search).get('authored') !== '0',
        ashfang: createAshfangState(),
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        keys: new Set(),
        pointerId: null,
        touchOrigin: { x: 0, y: 0 },
        touchCurrent: { x: 0, y: 0 },
        lastSimulationTimestamp: 0,
        performanceWindowStarted: 0,
        renderFrameCount: 0,
        simulationFrameCount: 0,
        simulationMillisecondsTotal: 0,
        bridgeMillisecondsTotal: 0,
        displayFps: 0,
        displaySimulationHz: 0,
        displaySimulationMilliseconds: 0,
        displayBridgeMilliseconds: 0,
        animationFrame: 0,
    };
}

function frame(state, timestamp) {
    if (!state.active) return;
    const rect = state.canvas.getBoundingClientRect();
    resizeCanvas(state, rect);
    recordRenderFrame(state, timestamp);

    try {
        // A C# bootstrap snapshot can carry a placeholder 800x600 world, Arcane
        // school and no terrain. Do not show it as a torn/black G4 Hunt frame.
        const waitingForWorld = state.g4StageFrames && !hasAuthoritativeHuntWorld(state.latestSnapshot);
        if (state.latestSnapshot && !waitingForWorld) draw(state, state.latestSnapshot, rect.width, rect.height);
        else drawWaiting(state, rect.width, rect.height);
        state.renderingFailed = false;
        state.renderingError = null;
    } catch (error) {
        state.renderError = String(error?.stack ?? error).slice(0, 600);
        if (!state.renderingFailed) console.error('Wyrmforge arena drawing failed; simulation continues.', error);
        state.renderingFailed = true;
        state.renderingError = error?.stack ?? String(error);
        // Canvas rendering must never silently stop player movement and the C# simulation.
        // Reset the canvas state stack as well as its transform: a failed
        // nested light/effect must not leave later frames in screen blending.
        state.canvas.width = state.canvas.width;
        state.context.setTransform(1, 0, 0, 1, 0, 0);
        state.context.fillStyle = '#14111b';
        state.context.fillRect(0, 0, state.canvas.width, state.canvas.height);
    }

    state.g4Review?.record(timestamp, {
        playing: Boolean(state.latestSnapshot && !state.latestSnapshot.paused && !state.latestSnapshot.ended &&
            (!state.g4StageFrames || hasAuthoritativeHuntWorld(state.latestSnapshot))),
        renderingFailed: Boolean(state.renderingFailed),
        gpuAvailable: Boolean(state.gpuWorld && state.latestSnapshot?.lighting),
        ended: Boolean(state.latestSnapshot?.ended),
    });
    startSimulationFrame(state, timestamp, rect);
    if (state.active) state.animationFrame = requestAnimationFrame(next => frame(state, next));
}

function startSimulationFrame(state, timestamp, rect) {
    if (state.simulationBusy) return;
    state.simulationBusy = true;
    const delta = Math.min((timestamp - state.lastSimulationTimestamp) / 1000, 0.05);
    state.lastSimulationTimestamp = timestamp;
    const movement = state.debug.botRoad ? (roadWalkDirection(state.latestSnapshot, state.terrainFrame, state.botMemory, performance.now()) ?? { x: 0, y: 0 })
        : state.debug.bot ? botMovement(state.latestSnapshot, state.botMemory, performance.now(), state.terrainFrame ?? null) : getArenaMovement(state);
    const aim = getArenaAim(state);
    const bridgeStarted = performance.now();

    state.dotNetReference.invokeMethodAsync('Frame', delta, rect.width, rect.height, movement.x, movement.y, aim.x, aim.y, getArenaPropFocus(state), isArenaStickAim(state, aim))
        .then(snapshot => {
            if (!state.active) return;
            updatePlayerDanger(state.playerDanger, snapshot, performance.now());
            if (snapshot.paused) state.resetInput?.();
            state.latestSnapshot = snapshot;
            requestTerrainFrame(state, snapshot);
            if (snapshot.environment?.greybox && snapshot.lighting)
                requestSharedGpuWorld(state, 'mobile');
            state.simulationFrameCount++;
            state.simulationMillisecondsTotal += snapshot.simulationMilliseconds ?? 0;
            state.bridgeMillisecondsTotal += performance.now() - bridgeStarted;
        })
        .catch(error => {
            console.error('Wyrmforge arena frame failed.', error);
            state.active = false;
        })
        .finally(() => state.simulationBusy = false);
}

// Hunt 1.0 terrain is pulled from C# only when its revision changes (one Fireball chip = one repaint).
function requestTerrainFrame(state, snapshot) {
    const terrain = snapshot.environment?.terrain;
    if (!terrain || state.terrainRequestBusy || state.terrainFrame?.revision === terrain.revision) return;
    state.terrainRequestBusy = true;
    state.dotNetReference.invokeMethodAsync('TerrainFrame', state.terrainFrame?.revision ?? -1)
        .then(frame => {
            if (!frame) return;
            const previous = state.terrainFrame;
            state.terrainFrame = mergeTerrainFrame(previous, frame);
            // Revision -1 is the initial full load, not destruction.
            if (previous) observeTerrain(state.destructionFx ??= createDestructionFx(), previous, state.terrainFrame,
                performance.now() / 1000, state.reducedMotion.matches);
        })
        .catch(error => console.error('Wyrmforge terrain frame failed.', error))
        .finally(() => state.terrainRequestBusy = false);
}
// Wyrm Influence band 0..3 for presentation; `?band=N` previews another band without touching C# state.
function huntBand(state, snapshot) {
    return state.debug.band ?? influenceBandIndex(snapshot.environment?.corruption);
}

function recordRenderFrame(state, timestamp) {
    if (state.lastRenderTimestamp) state.frameSampler.record(timestamp - state.lastRenderTimestamp);
    state.lastRenderTimestamp = timestamp;
    state.renderFrameCount++;
    const seconds = (timestamp - state.performanceWindowStarted) / 1000;
    if (seconds < 0.75) return;

    state.displayFps = Math.round(state.renderFrameCount / seconds);
    state.displaySimulationHz = Math.round(state.simulationFrameCount / seconds);
    state.displaySimulationMilliseconds = state.simulationFrameCount === 0 ? 0 : state.simulationMillisecondsTotal / state.simulationFrameCount;
    state.displayBridgeMilliseconds = state.simulationFrameCount === 0 ? 0 : state.bridgeMillisecondsTotal / state.simulationFrameCount;
    state.renderFrameCount = 0;
    state.simulationFrameCount = 0;
    state.simulationMillisecondsTotal = 0;
    state.bridgeMillisecondsTotal = 0;
    state.performanceWindowStarted = timestamp;
}

function resizeCanvas(state, rect) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    if (state.canvas.width !== width || state.canvas.height !== height) {
        state.canvas.width = width;
        state.canvas.height = height;
    }
    state.pixelRatio = dpr;
    state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function hasAuthoritativeHuntWorld(snapshot) {
    return Boolean(snapshot?.world && snapshot?.player && snapshot?.environment && snapshot?.lighting);
}

function drawWaiting(state, width, height) {
    const ctx = state.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14111b';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    drawPerformanceCounter(state, ctx, null, width, height);
}

function draw(state, snapshot, width, height) {
    const greybox = Boolean(snapshot.environment?.greybox);
    let gpu = snapshot.lighting && state.gpuWorld;
    // Safari already retains the WebGL source buffer through HuntGpuWorld.
    // The extra full-size Canvas stage adds expensive mobile memory bandwidth.
    // Retain it only as a diagnostic A/B switch; the default draws synchronously
    // into the visible Canvas in one requestAnimationFrame.
    const presentation = gpu && state.g4StageFrames
        ? (state.gpuPresentation ??= document.createElement('canvas')) : null;
    let ctx = presentation
        ? prepareHuntGpuPresentation(presentation, width, height, state.pixelRatio)
        : state.context;
    ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='source-over';
    const danger = playerDangerPresentation(state.playerDanger, snapshot, performance.now(), state.reducedMotion.matches);
    const camera = resolveArenaCamera(snapshot.world, snapshot.player, width, height);
    const selectedTarget = resolveTargetIndicator(snapshot);
    const visualSeconds = performance.now() / 1000;
    const targetId = snapshot.player?.aimPropId ?? snapshot.player?.aimTargetId;
    const targetIndicator = presentTargetSigil(state.targetSigil, selectedTarget, targetId,
        visualSeconds, state.reducedMotion.matches);
    // The authored characters play in every Hunt; a set that is still downloading draws nothing rather than the old art.
    const authoredOn = state.authoredCharacters;
    // GPU: sprites paint their albedo and a separate emissive tile; Canvas: the glow is added over the sprite.
    setAuthoredRenderMode(gpu ? 'albedo' : 'overlay');
    const authoredManifests = authoredOn ? loadedManifests() : new Map();
    if (authoredOn) {
        updateAuthoredEnemies(state.authored, snapshot, authoredManifests, visualSeconds, state.reducedMotion.matches);
        updateAuthoredWizard(state.authored, snapshot, authoredManifests.get('Wizard'), state.authored.clock, state.reducedMotion.matches);
        // Their corpses replace the old ones, including the old Hollowed's 3D fracture and its light.
        if (authoredManifests.has('Hollowed')) state.hollow.corpses.clear();
    }
    const worldWidth = camera.width;
    const worldHeight = camera.height;
    const lightViewport = { x: camera.x, y: camera.y, width, height };
    updateHollowSprites(state.hollow,snapshot,visualSeconds,state.reducedMotion.matches);
    // Source-derived death geometry and a shared GPU-compatible emitter; never procedural bones.
    const fractureEmitters = hollowFractureEmitters(state.hollow.corpses,state.hollow.clock,state.reducedMotion.matches);
    // Every illumination cue uses the SAME authoritative lighting frame.
    // The selected target supplies the SAME generic emitter, colored from the
    // C# active school. No independent lighting system or false school selection.
    const selectionEmitter = targetSelectionLightEmitter(targetIndicator, snapshot.lighting,
        snapshot.player?.activeSchool);
    state.fractureGpuEmitters = fractureEmitters;
    state.selectionGpuEmitter = selectionEmitter;
    state.sharedLightingFrame = withHollowFractureLightingFrame(snapshot.lighting,
        selectionEmitter ? [...fractureEmitters,selectionEmitter] : fractureEmitters);
    // Debug inspection light (opt-in by URL): lifts only the ambient term of the frame handed to the renderer.
    state.sharedLightingFrame = withDebugAmbient(state.sharedLightingFrame, state.debug.bright, state.debug.ambient);
    state.sharedLightingFrame = withMoonShadows(state.sharedLightingFrame, state.debug.moonShadows);
    const spellLights = [
        ...buildSpellLights(snapshot, visualSeconds, state.reducedMotion.matches, lightViewport),
        ...hollowFractureCanvasLights(fractureEmitters,snapshot.lighting),
        ...targetSelectionCanvasLight(selectionEmitter)
    ];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    let artScale = 1, groundAlbedo = null, terrainView = null;
    if (greybox) {
        // Level one-metre grey receiver. No material atlas or walls; the same
        // authoritative C# lights shade it and its actors through HuntGpuWorld.
        if (state.terrainFrame && snapshot.environment.terrain) {
            // Hunt 1.0: the C# heightfield as flat colour ramps in the metric oblique projection.
            const terrainCache = state.terrainCache ??= new TerrainCanvasCache();
            if (gpu) terrainCache.enableNormals();
            terrainCache.update(state.terrainFrame, huntBand(state, snapshot));
            // 64 px/m terrain: the GPU ground is its own surface at artScale pixels per world unit, not the 1x visible canvas.
            artScale = gpu ? Math.max(1, state.debug.renderScale ?? TERRAIN_ART_SCALE) : 1;
            if (artScale > 1) {
                terrainView = terrainCaptureWindow(camera, width, height);
                groundAlbedo = groundAlbedoView(state, terrainView, artScale);
            }
            else state.terrainCache.draw(ctx, { x: camera.x, y: camera.y, width, height });
        } else {
            drawGreyboxGround(ctx, snapshot.environment.greybox, worldWidth, worldHeight);
        }
    } else {
        if (!drawArenaEnvironment(ctx, snapshot.environment, worldWidth, worldHeight, visualSeconds, null,
            gpu ? 'gpu' : 'canvas', state.g4FlatGround)) {
            ctx.fillStyle = '#14111b';
            ctx.fillRect(0, 0, worldWidth, worldHeight);
            drawGrid(ctx, worldWidth, worldHeight);
        }
        if (snapshot.hunt && !state.g4FlatGround && !gpu) drawHuntArena(ctx, snapshot.hunt, worldWidth, worldHeight);
        if (!gpu) drawSpellLightSpill(ctx, spellLights, lightViewport, 'terrain');
        drawArenaCloisterReflections(ctx, snapshot.environment, worldWidth, worldHeight,
            spellLights, visualSeconds, state.reducedMotion.matches, state.g4FlatGround, gpu);
    }
    const exitLayers = [
        ...(snapshot.exit ?? snapshot.exitLandmark
            ? [{ kind: 'exit', exit: snapshot.exit ?? snapshot.exitLandmark, locked: !snapshot.exit }] : []),
        // Same physical outgoing ports the C# simulation accepts after a cleared AR1 trail.
        ...(snapshot.exitPorts ?? []).map(exit => ({ kind: 'exit', exit, locked: false })),
    ];
    if (!gpu) for (const layer of exitLayers) drawArenaExit(ctx, layer.exit, visualSeconds, layer.locked);
    drawRecoveryGuide(ctx, snapshot, camera, width, height, visualSeconds, state.reducedMotion.matches);

    drawAshfangGroundEffects(ctx,snapshot,state.reducedMotion.matches);
    for (const remains of snapshot.ashRemains ?? []) drawAshRemains(ctx, remains);
    for (const ripple of snapshot.wraithRipples ?? []) drawWraithRipple(ctx, ripple, visualSeconds);
    for (const patch of snapshot.blackIce ?? []) drawBlackIce(ctx, patch, state.reducedMotion.matches ? 0 : visualSeconds);
    for (const husk of snapshot.rimeHusks ?? []) drawRimeHusk(ctx, husk);
    drawReliquaryGround(ctx, snapshot, visualSeconds, state.reducedMotion.matches);
    drawBellWardenGround(ctx, snapshot, visualSeconds, state.reducedMotion.matches);
    drawWinterBellGround(ctx, snapshot, state.reducedMotion.matches ? 0 : visualSeconds);
    drawGlassReliquaryGround(ctx, snapshot, state.reducedMotion.matches ? 0 : visualSeconds);
    // Enemy attack lanes, landing marks and shield fronts sit on the ground beneath every actor.
    for (const enemy of snapshot.enemies) {
        if (!enemyGroundDecorationVisible(enemy, lightViewport)) continue;
        drawEliteGround(ctx, enemy, visualSeconds, state.reducedMotion.matches);
        drawShieldGuard(ctx, enemy);
    }
    for (const ember of snapshot.hostileProjectiles ?? []) drawHostileProjectileGround(ctx, ember);
    for (const bloom of snapshot.splinterBlooms ?? []) drawSplinterBloom(ctx, bloom);
    for (const wave of snapshot.avalancheRings ?? []) drawAvalancheWave(ctx, wave);
    drawPlayerChill(ctx, snapshot.player, state.reducedMotion.matches ? 0 : visualSeconds);
    for (const shard of snapshot.experienceShards ?? []) drawExperienceShard(ctx, shard);
    for (const pulse of snapshot.splashPulses) drawSplashPulse(ctx, pulse, snapshot.dragon?.school);
    // A floor decal: the actor's C# ground pivot sits at the sigil center.
    // Paint BOTH halves before depth-sorted actors. Opaque legs/body naturally mask
    // the back arc; never composite bright sigil artwork over the sprite afterward.
    drawTargetIndicator(ctx, targetIndicator, 'ground', visualSeconds, state.reducedMotion.matches,
        state.targetSigilArt, snapshot.player?.activeSchool);
    drawTargetIndicator(ctx, targetIndicator, 'contrast', visualSeconds, state.reducedMotion.matches,
        state.targetSigilArt, snapshot.player?.activeSchool);
    drawAimRune(ctx, snapshot.player);
    drawWardReadiness(ctx, snapshot.player, visualSeconds, state.reducedMotion.matches);
    if (snapshot.wardPulse) drawWardPulse(ctx, snapshot.wardPulse, state.reducedMotion.matches);
    updatePaintedCorpses(state.paintedCorpses, snapshot.deathBursts, state.enemyMotion, visualSeconds);
    const enemyPoses = updateEnemyMotions(state.enemyMotion, snapshot.enemies, visualSeconds, state.reducedMotion.matches);
    ashlingSprites.update(state.ashling,snapshot,visualSeconds,state.reducedMotion.matches);
    updateAshfang(state.ashfang,snapshot,visualSeconds,state.reducedMotion.matches);
    // Kinds with a loaded authored set draw their own corpses, so the old ones are skipped.
    const authoredKinds = new Set([...ENEMY_CHARACTERS].filter(([, name]) => authoredManifests.has(name)).map(([kind]) => kind));
    drawPaintedCorpses(ctx, state.paintedCorpses, visualSeconds,hollowSpritesReady(),ashlingSprites.ready(), authoredKinds);
    drawHollowCorpses(ctx,state.hollow,state.reducedMotion.matches);
    if (!authoredKinds.has(2)) ashlingSprites.drawCorpses(ctx,state.ashling,state.reducedMotion.matches);
    if (authoredOn) drawAuthoredCorpses(ctx, state.authored, { x: camera.x, y: camera.y, width, height });
    // The Mire Hound now uses authored pixel poses, including a real collapse.
    // Only C# identity-bearing death bursts create these bodies.
    for (const corpse of state.paintedCorpses.corpses?.values() ?? [])
        if (Number(corpse.kind) === 1 && mireHoundPixelPreviewEnabled() && !authoredKinds.has(1))
            drawEnemyPixelArt(ctx, { ...corpse, opacity: Math.max(0, 1 - (visualSeconds - corpse.at) / .8) },
                null, 7, corpse.facing);
    // Correct 2.5D ordering by WORLD foot position. A mage/enemy walking north of
    // a ruined wall goes behind its facade; walking south brings it forward.
    const entranceOmen = snapshot.hunt?.stage === 1 && snapshot.hunt?.entranceBeat === 1;
    const visibleGpuEnemyLayers = gpu ? visibleHuntEnemyLayers(snapshot.enemies, camera, width, height) : null;
    state.visibleGpuEnemyCount = visibleGpuEnemyLayers?.length ?? null;
    state.reusedGpuEnemyCaptures = 0;
    const depthLayers = [
        ...exitLayers.map(layer => ({ ...layer, depth: layer.exit.y + layer.exit.radius })),
        ...(snapshot.dragon && !entranceOmen ? [{kind: 'dragon', depth:state.ashfang.entity?.shadow?Number.NEGATIVE_INFINITY:snapshot.dragon.y, dragon:snapshot.dragon}] : []),
        ...(state.ashfang.death ? [{kind:'dragonDeath',depth:state.ashfang.death.y}] : []),
        // Depth sorts by the ground-plane feet; the drawn actor rises by its terrain height (metric oblique contract).
        ...(visibleGpuEnemyLayers ?? snapshot.enemies.map(enemy =>
            ({ kind: 'enemy', depth: enemy.y + (enemy.radius || 0), enemy: raisedActor(enemy) }))),
        { kind: 'mage', depth: snapshot.player.y + (snapshot.player.radius || 0), player: raisedActor(snapshot.player) },
        // The greybox keeps only the breakable salvage props (the Charred Scrap source), depth-sorted with actors.
        // Hunt 1.0 trees: the C# trunk blocks are in the terrain; their canopies are depth-sorted layers.
        ...(state.terrainFrame && snapshot.environment?.terrain
            ? [...treeLayers(state.terrainFrame, huntBand(state, snapshot), camera, width, height), ...torchLayers(state.terrainFrame, camera, width, height)] : []),
        ...(greybox ? createDestructibleLayers(snapshot.environment, worldWidth, worldHeight, visualSeconds)
            : getArenaCloisterElevations(snapshot.environment, worldWidth, worldHeight, visualSeconds, null, state.g4FlatGround, gpu)),
    ];
    // On the GPU path the ground glows (crack veins, hot craters, bedrock hint) ride the ground's emissive map and are lit surfaces
    // under every actor; the additive overlay versions below remain for the Canvas fallback.
    const view = { x: camera.x, y: camera.y, width, height };
    const groundView = terrainView ?? view;
    const emissive = gpu && state.terrainFrame && snapshot.environment?.terrain
        ? paintGroundEmissive(state, state.terrainFrame, state.destructionFx, huntBand(state, snapshot),
            groundView, performance.now() / 1000, state.reducedMotion.matches, artScale) : null;
    state.veinSeams = emissive?.seams ?? 0;
    const normal = gpu && state.terrainCache?.normalCanvas ? groundNormalView(state, groundView, artScale) : null;
    if (gpu) gpu.begin(ctx, camera, width, height, emissive?.canvas ?? null, normal,
        groundAlbedo ? { source: groundAlbedo, scale: artScale, revision: terrainViewRevision(state, groundView, artScale), view: groundView } : null);
    state.lighting01FixtureCount = gpu && state.lighting01
        ? submitLighting01Fixtures(gpu, snapshot.environment, state.sharedLightingFrame,
            camera, worldWidth, worldHeight) : 0;
    const worldContext = ctx;
    for (const layer of sortSceneDepthLayers(depthLayers)) {
        let tile, tileX, tileY, tileSize, capture, revision, poseRevision, poseOcclusion, reuse = false;
        // Canopies are 64 px/m art like the terrain; actors keep their 1x sprites.
        const pixelScale = layer.kind === 'tree' || layer.kind === 'torch' || layer.kind === 'torchFlame' ? artScale : 1;
        if (gpu) {
            capture = layer.capture ?? huntLayerCapture(layer, layer.player ?? snapshot.player, state.ashfang.death);
            if (!capture) continue;
            ({ x: tileX, y: tileY, size: tileSize } = capture);
            if (tileX + tileSize < camera.x - 384 || tileY + tileSize < camera.y - 384 ||
                tileX > camera.x + width + 384 || tileY > camera.y + height + 384) continue;
            if (layer.kind === 'enemy' && authoredOn) {
                const enemy = layer.enemy, pose = state.authored.enemies.get(enemy.entityId);
                const loaded = Boolean(pose && authoredCharacter(pose.name)?.strips?.has(pose.action)) &&
                    !enemyHasEmissivePose(state.authored, enemy.entityId);
                const candidate = reusableEnemyPoseRevision(layer, pose, loaded);
                if (candidate && state.terrainFrame)
                    poseOcclusion = occludingTerrainCells(state.terrainFrame, enemy.x,
                        enemy.y + (enemy.z || 0), enemy.z || 0, (enemy.radius || 16) * 1.25);
                if (candidate && !poseOcclusion?.length) poseRevision = candidate;
            }
            revision = poseRevision ?? huntLayerRevision(layer, artReady(), artGeneration());
            reuse = gpu.canReuseCapture(capture.id, revision, tileSize, tileSize, pixelScale);
            if (reuse && poseRevision) state.reusedGpuEnemyCaptures++;
            // A reused capture never repaints, so it only needs a stand-in source; real scratch canvases are for layers that redraw.
            tile = reuse ? (state.gpuReuseStub ??= document.createElement('canvas')) : (state.gpuScratchPool ??= new HuntGpuScratchPool(8)).acquire(Math.ceil(tileSize * pixelScale));
            if (!reuse) {
                ctx = prepareHuntGpuScratch(tile, tileSize, tileX, tileY, pixelScale);
            }
        }
        if (!reuse) {
            if (layer.kind === 'masonry') {
                drawArenaCloisterElevation(ctx, layer);
            } else if (layer.kind === 'dragon') {
                drawDragon(ctx, layer.dragon, state.reducedMotion.matches, snapshot.dragonBreath, state.ashfang, authoredOn);
            } else if (layer.kind === 'exit') {
                drawArenaExit(ctx, layer.exit, visualSeconds, layer.locked);
            } else if (layer.kind === 'tree') {
                drawTree(ctx, layer.tree);
            } else if (layer.kind === 'torch' || layer.kind === 'torchFlame') {
                drawTorch(ctx, layer.torch, visualSeconds, layer.kind === 'torch' ? 'post' : 'flame');
            } else if (layer.kind === 'dragonDeath') {
                if (!(authoredOn && drawAuthoredAshfangDeath(ctx, state.ashfang))) drawAshfangDeath(ctx,state.ashfang);
            } else if (layer.kind === 'enemy') {
                const enemy = layer.enemy;
                if (gpu) {
                    const aligned = poseRevision ? alignedEnemyPoseRaster(enemy) : null;
                    if (aligned) {
                        ctx.save();
                        ctx.translate(aligned.offsetX, aligned.offsetY);
                    }
                    drawEnemy(ctx, aligned?.actor ?? enemy, null,
                        enemyPoses.get(enemy.entityId) ?? 0, enemyFacing(state.enemyMotion, enemy.entityId),
                        state.hollow, state.ashling, authoredOn ? state.authored : null);
                    if (aligned) ctx.restore();
                } else {
                    const paintEnemy = surface => drawEnemy(surface, enemy, sampleSpellLight(spellLights, enemy.x, enemy.y),
                        enemyPoses.get(enemy.entityId) ?? 0, enemyFacing(state.enemyMotion, enemy.entityId),state.hollow,state.ashling, authoredOn ? state.authored : null);
                    drawActorWithEmitter(ctx, state.actorLightBuffer, enemy, selectionEmitter, paintEnemy);
                }
                drawEliteCrest(ctx, enemy, visualSeconds, state.reducedMotion.matches);
            } else {
                drawMage(ctx, layer.player ?? snapshot.player, snapshot.castMotion, danger.hit, state.reducedMotion.matches,
                    gpu ? null : sampleSpellLight(spellLights, snapshot.player.x, snapshot.player.y),
                    updateMageWalk(state.mageWalk, snapshot.player, visualSeconds, state.reducedMotion.matches),
                    state.mageWalk.facing,
                    // The authored wizard replaces the old art once its set has loaded.
                    authoredOn && authoredCharacter('Wizard')
                        ? surface => drawAuthoredWizard(surface, layer.player ?? snapshot.player, state.authored, danger.hit) : null);
            }
            if (state.terrainFrame && (layer.kind === 'enemy' || layer.kind === 'mage')) {
                // Raised rock in front of the actor hides it: the covered pixels fall away (GPU) or the rock is repainted (Canvas).
                const body = layer.enemy ?? layer.player;
                const cells = poseOcclusion ?? occludingTerrainCells(state.terrainFrame, body.x,
                    body.y + (body.z || 0), body.z || 0, (body.radius || 16) * 1.25);
                if (gpu) eraseTerrainOcclusion(ctx, state.terrainFrame, cells);
                else repaintTerrainOcclusion(ctx, state.terrainFrame, huntBand(state, snapshot), cells);
            }
        }
        if (gpu) {
            // The glowing pixels of an authored actor go up as its emissive map, so they stay bright in the dark and light the ground around them.
            const emissiveMaterial = !reuse && authoredOn && (layer.kind === 'enemy' || layer.kind === 'mage' || layer.kind === 'dragon')
                ? paintAuthoredEmissive(state, gpu, layer, snapshot, capture.id, tileX, tileY, tileSize, pixelScale) : null;
            if (!reuse) ctx.restore();
            gpu.capture(capture.id,
                tile, tileX - camera.x, tileY - camera.y, tileSize, tileSize,
                .12 + Math.max(0, Math.min(1, layer.depth / worldHeight)) * .1,
                layer.kind !== 'torchFlame', { revision, footFraction: capture.footFraction,
                    occluderHeightPx: capture.occluderHeightPx,
                    physicalVolume: capture.physicalVolume,
                    // Only the flame glows (its light is the C# emitter, not this); the post is an ordinary lit surface.
                    ...(layer.kind === 'torchFlame' ? { material: { roughness: .85, emission: '#ff8a30', emissionIntensity: .35 } } : {}),
                    ...(layer.kind === 'exit' ? { material: { roughness: .8, emission: '#b18ae1', emissionIntensity: layer.locked ? .12 : .45 } } : {}),
                    ...(emissiveMaterial ? { material: { roughness: .85, ...emissiveMaterial } } : {}),
                    ...(pixelScale !== 1 ? { pixelScale } : {}) });
            ctx = worldContext;
        }
    }
    if (gpu) {
        try {
            gpu.render(ctx, state.sharedLightingFrame);
        } catch (error) {
            state.gpuError = String(error); gpu.dispose(); state.gpuWorld = null; gpu = null;
        }
    }
    const glowOnGround = Boolean(emissive && gpu);
    drawReliquaryEmergence(ctx, snapshot.reliquary);
    drawBellWardenEntrance(ctx, snapshot.bellWarden);
    if (state.terrainFrame && snapshot.environment?.terrain) {
        drawAmbientParticles(ctx, ambientParticles(huntBand(state, snapshot), visualSeconds,
            { width: worldWidth, height: worldHeight }, state.reducedMotion.matches), { x: camera.x, y: camera.y, width, height });
        const nowSeconds = performance.now() / 1000;
        if (!glowOnGround) {
            state.veinSeams = drawCrackGlow(ctx, state.terrainFrame, huntBand(state, snapshot), { x: camera.x, y: camera.y, width, height }, nowSeconds, state.reducedMotion.matches);
            drawBedrockGlow(ctx, state.terrainFrame, { x: camera.x, y: camera.y, width, height }, nowSeconds, state.reducedMotion.matches);
        }
        if (state.destructionFx) drawDestructionFx(ctx, state.destructionFx, nowSeconds, { x: camera.x, y: camera.y, width, height }, glowOnGround ? 'chips' : 'all');
        // The world is drawn translated by -camera here; the furnace glow belongs to the screen edges.
        ctx.save();
        ctx.translate(camera.x, camera.y);
        drawFireZoneVignette(ctx, width, height, huntBand(state, snapshot), nowSeconds, state.reducedMotion.matches);
        ctx.restore();
        // The calibration overlay is drawn unlit over the composite so it is readable in any light.
        if (state.blockInset ??= blockInsetOverlayEnabled())
            drawBlockInsetOverlay(ctx, state.terrainFrame, { x: camera.x, y: camera.y, width, height });
    }
    if (snapshot.powerBurst) {
        const pulse = snapshot.powerBurst;
        const radius = pulse.radius * (state.reducedMotion.matches ? 0.7 : 0.15 + 0.85 * pulse.progress);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(188, 153, 255, ${0.12 * (1 - pulse.progress)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(221, 207, 255, ${0.85 * (1 - pulse.progress)})`;
        ctx.lineWidth = 4 * (1 - pulse.progress) + 1;
        ctx.stroke();
        ctx.restore();
    }
    // The WORLD is always at night. Render the SAME darkness across ground,
    // physical scenery, enemies, mage and Wyrm. Real fire/elemental cast,
    // impacts, burning trees and Fire Wyrm breath cut light into all layers.
    // Keep high-priority attack tells and magical VFX ABOVE the veil.
    // AR0 authoring diagnostics must expose the actual C# material classes at mobile scale.
    // Skip only the PRESENTATION night veil for the explicit semantic debug mode. No new
    // light solver, no authority changes, and normal Hunts retain exactly the same night.
    if (!gpu && !(semanticSiteModeEnabled() && snapshot.environment?.geography?.version === 1)) {
        const realFires = createWetForestFirelightPlan(snapshot.environment, worldWidth, worldHeight);
        const nightSources = gothicNightLightSources(snapshot, spellLights, worldWidth, worldHeight, realFires);
        drawGothicNight(ctx, gothicNightPlan(snapshot.player, nightSources, lightViewport), state.nightMask);
    }
    // Never redraw the floor seal over enemies after the night pass.
    // Tactical telegraphs must remain readable even when the ground is nearly
    // black. They are presentation cues, not physical light emitters.
    for (const hazard of snapshot.huntHazards ?? []) {
        if(Number(snapshot.dragon?.school)===1)drawAshfangWarning(ctx,hazard,state.reducedMotion.matches);
        else drawHuntHazard(ctx,hazard);
    }
    // Offscreen casters can telegraph an onscreen target: do not frustum-cull these attack marks.
    for (const enemy of snapshot.enemies) if (enemy.telegraph) drawEnemyTelegraph(ctx, enemy);
    drawTransformations(ctx, snapshot, visualSeconds, state.reducedMotion.matches);
    drawFieldAmbushTell(ctx, snapshot.fieldAmbush, visualSeconds, state.reducedMotion.matches);
    if (snapshot.dragonBreath) drawDragonBreath(ctx, snapshot.dragonBreath,
        snapshot.dragon?.school ?? snapshot.hunt?.school, snapshot.dragon);
    // A second weaker pass colors nearby silhouettes without whitening shadows.
    drawAshfangAirEffects(ctx,snapshot,ashfangSockets(state.ashfang),state.reducedMotion.matches);
    // The selection emitter belongs to the authoritative GPU snapshot; avoid Canvas double-lighting.
    if (!gpu) drawSpellLightSpill(ctx, actorLightsWithoutSigilOverlay(spellLights), lightViewport, 'actors');
    for (const impact of snapshot.elementalImpacts) drawSpellImpact(ctx, impact, state.reducedMotion.matches);
    for (const death of snapshot.deathBursts) drawDeathBurst(ctx, death);

    for (const ember of snapshot.hostileProjectiles ?? []) drawHostileProjectileEmber(ctx, ember);
    for (const lance of snapshot.iceLances ?? []) drawIceLance(ctx, lance);
    drawWinterBellAir(ctx, snapshot);
    drawGlassReliquaryAir(ctx, snapshot, state.reducedMotion.matches ? 0 : visualSeconds);
    for (const cloud of snapshot.snowClouds ?? []) drawSnowCloud(ctx, cloud, state.reducedMotion.matches ? 0 : visualSeconds);
    // The same authored V5 Fireball sprite now appears for every C# aim
    // direction. The GPU world still receives its C# projectile light and
    // casts shadows; never suppress the projectile graphic after GPU shading.
    for (const projectile of snapshot.projectiles)
        drawSpellProjectile(ctx, projectile, state.reducedMotion.matches, visualSeconds);

    for (const trace of snapshot.lightning) drawLightningTrace(ctx, trace, visualSeconds, state.reducedMotion.matches);

    for (const burst of snapshot.essenceBursts) {
        const alpha = Math.min(1, burst.life / 0.2);
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.radius * (1.08 - alpha * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 93, 42, ${alpha * 0.08})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 139, 72, ${alpha * 0.85})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    for (const bolt of snapshot.essenceBolts) {
        ctx.beginPath();
        ctx.moveTo(bolt.fromX, bolt.fromY);
        ctx.lineTo(bolt.toX, bolt.toY);
        ctx.strokeStyle = `rgba(255, 126, 57, ${Math.min(1, bolt.life / 0.18)})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    if (snapshot.extraction) drawExtractionRitual(ctx, snapshot.extraction);
    for (const pickup of snapshot.experiencePickups ?? []) drawExperiencePickup(ctx, pickup);

    // Draw readable non-emissive combat UI above the Gothic night pass; it never changes combat or animation.
    drawDamageNumbers(ctx, snapshot.damageNumbers, state.damageNumberMode, state.reducedMotion.matches, lightViewport);

    // Cast VFX stay in the spell pass; they do not alter collision or cast timing.
    drawSpellCastMotion(ctx, snapshot.castMotion, state.reducedMotion.matches);

    ctx.restore();
    const battleActive = Boolean(snapshot.dragon) && (!snapshot.hunt || snapshot.hunt.stage === 2);
    ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='source-over';
    drawPlayerDanger(ctx, { ...snapshot.player, x: snapshot.player.x - camera.x, y: snapshot.player.y - camera.y }, danger, width, height);
    // Draw navigation above the world but under the HUD. The arrow is not a touch target.
    drawExitGuide(ctx, snapshot.exit, camera, width, height);
    // Opt-in map context is presented on the real Hunt canvas. Default play is untouched.
    if (!greybox && location.search.includes('ar1Review=1') &&
        drawAr1GeographyReview(ctx, snapshot.environment?.geography,
            snapshot.environment?.geographyActive === true, snapshot.player, camera, width, height)) {
        globalThis.__wyrmforgeAr1Review = {
            siteId: snapshot.environment.geography.siteId,
            kind: snapshot.environment.geography.landscape.kind,
        };
    }
    // Combat vitals now share one accessible responsive HTML HUD with the encounter objective.
    drawReliquaryHushVeil(ctx, snapshot.reliquary, width, height);
    if (battleActive) drawBossBar(ctx, snapshot.dragon, snapshot.hunt, width, state.ashfang.hpTrail);
    else {
        drawReliquaryBar(ctx, snapshot.reliquary, width);
        drawBellWardenBar(ctx, snapshot.bellWarden, width);
    }
    if (snapshot.hunt && snapshot.hunt.stage !== 2) drawHuntStageBanner(ctx, snapshot.hunt, snapshot.dragon, width, height);
    drawTouchIndicator(state, ctx);
    drawPerformanceCounter(state, ctx, snapshot, width, height);
    if (presentation) presentCompletedHuntGpuFrame(state.context, presentation);
}

function drawHuntArena(ctx, hunt, width, height) {
    const palette = schoolPalette(hunt.school);
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.58, 20, width * 0.5, height * 0.58, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, `rgba(${palette.rgb}, 0.08)`);
    gradient.addColorStop(1, 'rgba(10, 8, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (hunt.arena === 1) drawCinderScar(ctx, width, height, palette);
    else if (hunt.arena === 2) drawStormField(ctx, width, height, palette);
    else if (hunt.arena === 3) drawFrozenBasin(ctx, width, height, palette);
    else if (hunt.arena === 4) drawAetherFracture(ctx, width, height, palette);

    if (hunt.isAscendant) {
        ctx.save();
        const breadth = Math.min(width, height);
        ctx.strokeStyle = `rgba(${palette.lightRgb}, .24)`;
        ctx.lineWidth = 2;
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            ctx.moveTo(width / 2 + side * breadth * .32, height * .12);
            ctx.lineTo(width / 2 + side * breadth * .43, height * .28);
            ctx.lineTo(width / 2 + side * breadth * .37, height * .5);
            ctx.stroke();
        }
        ctx.strokeStyle = `rgba(${palette.lightRgb}, .17)`;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.ellipse(width / 2, height * .56, breadth * .45, breadth * .35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawCinderScar(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.13)`;
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index++) {
        const x = width * (0.08 + index * 0.14);
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x + 22, height * 0.72);
        ctx.lineTo(x - 8, height * 0.56);
        ctx.stroke();
    }
    ctx.fillStyle = `rgba(${palette.rgb}, 0.035)`;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.restore();
}

function drawStormField(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.1)`;
    ctx.lineWidth = 1;
    for (let index = -4; index < 14; index++) {
        ctx.beginPath();
        ctx.moveTo(index * 90, 0);
        ctx.lineTo(index * 90 + height * 0.48, height);
        ctx.stroke();
    }
    ctx.restore();
}

function drawFrozenBasin(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.12)`;
    ctx.lineWidth = 1.5;
    const centerX = width * 0.5;
    const centerY = height * 0.55;
    for (let ring = 1; ring <= 4; ring++) {
        const radius = Math.min(width, height) * (0.12 * ring);
        drawPolygon(ctx, centerX, centerY, radius, 6, Math.PI / 6);
        ctx.stroke();
    }
    ctx.restore();
}

function drawAetherFracture(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.13)`;
    ctx.lineWidth = 1.5;
    for (let index = 0; index < 6; index++) {
        const x = width * (0.1 + index * 0.16);
        const y = height * (0.18 + (index % 3) * 0.24);
        ctx.beginPath();
        ctx.moveTo(x - 24, y - 58);
        ctx.lineTo(x + 8, y - 18);
        ctx.lineTo(x - 10, y + 14);
        ctx.lineTo(x + 30, y + 62);
        ctx.stroke();
    }
    ctx.restore();
}

function drawHuntHazard(ctx, hazard) {
    const palette = schoolPalette(hazard.school);
    const progress = Math.min(1, Math.max(0, hazard.progress));
    const radius = hazard.radius * (1.12 - progress * 0.12);
    const armedScale = hazard.armed === false ? 0.28 : 1;
    const alpha = (0.2 + progress * 0.62) * armedScale;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);

    if (hazard.signature === 1) drawCinderSweepTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 2) drawTempestCageTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 3) drawGlacialWallTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 4) drawRiftEchoTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 5) drawCrownfallTelegraph(ctx, radius, progress, alpha);
    else if (hazard.signature === 6) drawSkybreakCrossingTelegraph(ctx, radius, progress, alpha, palette);
    else drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette);

    ctx.restore();
}

function drawCrownfallTelegraph(ctx, radius, progress, alpha) {
    ctx.fillStyle = `rgba(255, 158, 73, ${.07 * alpha})`;
    ctx.strokeStyle = `rgba(255, 199, 106, ${alpha})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let index = -1; index <= 1; index++) {
        const offset = index * radius * .48;
        drawTriangle(ctx, offset - radius * .19, radius * .32, offset, -radius * (.5 + progress * .13), offset + radius * .19, radius * .32);
        ctx.stroke();
    }
    ctx.strokeStyle = `rgba(255, 229, 165, ${alpha * .9})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1 - progress * .65), 0, Math.PI * 2);
    ctx.stroke();
}

function drawSkybreakCrossingTelegraph(ctx, radius, progress, alpha, palette) {
    // Each node signals a charged relay on a shared crossing path; it is not a Tempest Cage ring.
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.fillStyle = `rgba(${palette.rgb}, ${0.09 * alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    const reach = radius * (.64 + progress * .18);
    for (let index = -1; index <= 1; index++) {
        const shift = index * radius * .19;
        ctx.moveTo(-reach + shift, -reach);
        ctx.lineTo(-radius * .11 + shift, 0);
        ctx.lineTo(radius * .17 + shift, -radius * .05);
        ctx.lineTo(reach + shift, reach);
    }
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${Math.min(1, alpha * 1.2)})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1 - progress * .6), 0, Math.PI * 2);
    ctx.stroke();
}

function drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${palette.rgb}, ${(0.035 + progress * 0.07) * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, ${alpha})`;
    ctx.lineWidth = 2 + progress * 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.35 + progress * 0.5), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${(0.2 + progress * 0.5) * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawCinderSweepTelegraph(ctx, radius, progress, alpha, palette) {
    drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${Math.min(1, alpha * 1.12)})`;
    ctx.lineWidth = 2.5;
    const reach = radius * (0.45 + progress * 0.4);
    ctx.beginPath();
    ctx.moveTo(-reach, -reach);
    ctx.lineTo(reach, reach);
    ctx.moveTo(reach, -reach);
    ctx.lineTo(-reach, reach);
    ctx.stroke();
}

function drawTempestCageTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2.5 + progress;
    for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.72 + ring * 0.28), ring * 0.55, Math.PI * 1.35 + ring * 0.7);
        ctx.stroke();
    }
    for (let index = 0; index < 4; index++) {
        const angle = index * Math.PI / 2 + progress * 0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35);
        ctx.lineTo(Math.cos(angle + 0.16) * radius, Math.sin(angle + 0.16) * radius);
        ctx.stroke();
    }
}

function drawGlacialWallTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.fillStyle = `rgba(${palette.rgb}, ${0.04 * alpha})`;
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2.2 + progress;
    drawPolygon(ctx, 0, 0, radius, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();
    drawPolygon(ctx, 0, 0, radius * (0.55 + progress * 0.18), 6, Math.PI / 6);
    ctx.stroke();
}

function drawRiftEchoTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2 + progress * 1.5;
    const outer = radius * 0.78;
    ctx.strokeRect(-outer, -outer, outer * 2, outer * 2);
    const inner = radius * (0.3 + progress * 0.24);
    ctx.strokeRect(-inner, -inner, inner * 2, inner * 2);
}

function drawHuntStageBanner(ctx, hunt, dragon, width, height) {
    if (hunt.stage === 1) {
        drawWyrmEntranceSequence(ctx, hunt, dragon, width, height);
        return;
    }

    const palette = schoolPalette(hunt.school);
    const progress = Math.min(1, Math.max(0, hunt.stageProgress));
    const fade = Math.min(1, progress * 5, Math.max(0.25, (1 - progress) * 5));
    ctx.save();
    ctx.fillStyle = `rgba(5, 4, 8, ${0.26 * fade})`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${palette.rgb}, ${0.05 * fade})`;
    ctx.fillRect(0, height * 0.41, width, height * 0.18);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${palette.lightRgb}, ${0.95 * fade})`;
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText(hunt.isAscendant ? 'ASCENDANT UNBOUND' : 'PHASE BREAK', width / 2, height * 0.47);
    ctx.fillStyle = `rgba(244, 238, 248, ${0.95 * fade})`;
    ctx.font = '900 21px system-ui, sans-serif';
    ctx.fillText(hunt.phaseTwoCallout ?? 'THE WYRM UNLEASHES ITS TRUE POWER', width / 2, height * 0.52);
    ctx.restore();
}

function drawWyrmEntranceSequence(ctx, hunt, dragon, width, height) {
    const palette = schoolPalette(hunt.school);
    const progress = Math.min(1, Math.max(0, hunt.entranceBeatProgress ?? 0));
    ctx.save();

    if (hunt.entranceBeat === 1) {
        const pulse = 0.45 + Math.sin(performance.now() / 70) * 0.12;
        ctx.fillStyle = `rgba(5, 4, 8, ${0.32 + progress * 0.25})`;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = `rgba(${palette.lightRgb}, ${Math.max(0.08, pulse * progress)})`;
        ctx.lineWidth = 2;
        const centerX = width / 2;
        const groundY = height * 0.78;
        for (let index = -4; index <= 4; index++) {
            const offset = index * Math.max(26, width * 0.065);
            ctx.beginPath();
            ctx.moveTo(centerX + offset - 11, groundY + (index % 2) * 6);
            ctx.lineTo(centerX + offset, groundY - 9 - progress * 11);
            ctx.lineTo(centerX + offset + 12, groundY + 4);
            ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(225, 216, 232, ${0.5 + progress * 0.44})`;
        ctx.font = '900 11px system-ui, sans-serif';
        ctx.fillText(hunt.isAscendant
            ? (hunt.school === 3 ? 'THE SKY REMEMBERS YOUR NAME' : 'THE FIRST CROWN AWAKENS')
            : 'THE WYRMREALM TREMBLES', width / 2, height * 0.56);
        ctx.restore();
        return;
    }

    if (hunt.entranceBeat === 2) {
        const impact = Math.max(0, progress - 0.72) / 0.28;
        ctx.fillStyle = `rgba(${palette.rgb}, ${impact * 0.13})`;
        ctx.fillRect(0, 0, width, height);
        if (impact > 0) {
            ctx.strokeStyle = `rgba(${palette.lightRgb}, ${impact * 0.7})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, height * 0.62);
            ctx.lineTo(width, height * 0.42);
            ctx.stroke();
        }
        ctx.restore();
        return;
    }

    const slam = Math.min(1, progress * 7);
    const hold = Math.min(1, (1 - progress) * 6);
    const visibility = Math.min(slam, 0.35 + hold);
    const kick = Math.max(0, 1 - progress * 8);
    const shakeX = Math.sin(progress * 95) * 9 * kick;
    const shakeY = Math.cos(progress * 78) * 5 * kick;
    const cardY = height * 0.45;
    const cardHeight = Math.min(190, height * 0.28);
    const overshoot = 1 + kick * 0.11;

    ctx.translate(shakeX, shakeY);
    ctx.fillStyle = `rgba(3, 2, 5, ${0.72 * visibility})`;
    ctx.fillRect(0, 0, width, height);

    if (progress < 0.12) {
        const flash = 1 - progress / 0.12;
        ctx.fillStyle = `rgba(${palette.lightRgb}, ${flash * 0.34})`;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.translate(width / 2, cardY);
    ctx.scale(overshoot, overshoot);
    ctx.rotate(-0.025);

    ctx.fillStyle = `rgba(8, 6, 12, ${0.96 * visibility})`;
    ctx.beginPath();
    ctx.moveTo(-width * 0.58, -cardHeight * 0.5);
    ctx.lineTo(width * 0.52, -cardHeight * 0.5 - 18);
    ctx.lineTo(width * 0.58, cardHeight * 0.5 - 10);
    ctx.lineTo(-width * 0.5, cardHeight * 0.5 + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(${palette.rgb}, ${0.85 * visibility})`;
    ctx.beginPath();
    ctx.moveTo(-width * 0.56, -cardHeight * 0.5);
    ctx.lineTo(-width * 0.43, -cardHeight * 0.5 - 5);
    ctx.lineTo(width * 0.34, cardHeight * 0.5 + 2);
    ctx.lineTo(width * 0.18, cardHeight * 0.5 + 11);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'left';
    const left = -Math.min(width * 0.42, 360);
    ctx.fillStyle = `rgba(255,255,255,${visibility})`;
    ctx.font = `950 ${Math.min(64, Math.max(34, width * 0.09))}px system-ui, sans-serif`;
    ctx.fillText(dragon?.name?.toUpperCase() ?? 'UNKNOWN WYRM', left, -8);

    ctx.fillStyle = `rgba(${palette.lightRgb}, ${0.96 * visibility})`;
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText(dragon?.title?.toUpperCase() ?? 'THE REALM ANSWERS', left + 3, 19);

    ctx.fillStyle = `rgba(238,232,243,${0.86 * visibility})`;
    ctx.font = '850 10px system-ui, sans-serif';
    ctx.fillText(`WYRM HUNT  •  SIGNATURE: ${hunt.signatureName?.toUpperCase() ?? 'UNKNOWN'}`, left + 3, 42);

    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${0.72 * visibility})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, 55);
    ctx.lineTo(Math.min(width * 0.34, 330), 55);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
}
function drawExperienceShard(ctx, shard) {
    if (artReady()) {
        // Faceted crystal sprite sized by value; a slow 2-frame glint replaces the rotating square.
        const size = shard.value >= 6 ? 'large' : shard.value >= 3 ? 'medium' : 'small';
        const glint = Math.floor(performance.now() / 420 + shard.x * .07) % 2;
        if (drawArtFrame(ctx, 'environment', `shard.${size}.${glint}`, Math.round(shard.x), Math.round(shard.y))) return;
    }
    const valueScale = Math.min(1, Math.log2(Math.max(1, shard.value)) / 4);
    const pulse = 0.9 + Math.sin(performance.now() / 130 + shard.x * 0.03 + shard.y * 0.02) * 0.1;
    const size = (5 + valueScale * 5) * pulse;
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = 'rgba(188, 135, 255, 0.55)';
    ctx.shadowBlur = 7 + valueScale * 7;
    ctx.fillStyle = shard.value >= 6 ? '#e7c874' : shard.value >= 3 ? '#c698ff' : '#a878e0';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = shard.value >= 6 ? '#fff0b8' : '#e4caff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
}

function drawExperiencePickup(ctx, pickup) {
    const progress = Math.min(1, Math.max(0, pickup.progress));
    const alpha = 1 - progress;
    const valueScale = Math.min(1.5, Math.log2(Math.max(1, pickup.value) + 1) * 0.32);
    const radius = 18 + progress * (28 + valueScale * 16);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201, 153, 255, ${alpha * 0.75})`;
    ctx.lineWidth = 3 - progress * 1.4;
    ctx.stroke();

    ctx.strokeStyle = `rgba(236, 215, 255, ${alpha * 0.72})`;
    ctx.lineWidth = 1.5;
    const rays = 4 + Math.min(4, pickup.value);
    for (let index = 0; index < rays; index++) {
        const angle = index * Math.PI * 2 / rays;
        ctx.beginPath();
        ctx.moveTo(pickup.x + Math.cos(angle) * radius * 0.45, pickup.y + Math.sin(angle) * radius * 0.45);
        ctx.lineTo(pickup.x + Math.cos(angle) * radius, pickup.y + Math.sin(angle) * radius);
        ctx.stroke();
    }
    ctx.restore();
}

function arenaPerfReport(state) {
    const snapshot = state.latestSnapshot;
    return perfReport({ sampler: state.frameSampler, renderer: state.gpuWorld ? 'gpu' : 'canvas', quality: state.gpuWorld?.quality ?? null,
        terrain: state.terrainCache, heapMb: readHeapMegabytes(), enemies: snapshot?.enemies?.length ?? 0,
        gpuVisibleEnemies: state.gpuWorld ? state.visibleGpuEnemyCount : null,
        gpuUploads: state.gpuWorld?.lastFrameUploads ?? null,
        gpuReusedEnemies: state.gpuWorld ? state.reusedGpuEnemyCaptures : null,
        projectiles: snapshot?.projectiles?.length ?? 0, devicePixelRatio: window.devicePixelRatio || 1 });
}

function drawPerformanceCounter(state, ctx, snapshot, width, height) {
    // A large performance readout obscured monsters in the iPhone combat viewport.
    // Keep diagnostics available to testers without making them part of the ordinary HUD.
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('perf') !== '1') return;
    const report = arenaPerfReport(state);
    // Testers can read the same numbers as JSON from the console on desktop or via remote inspection.
    window.__wyrmforgePerf = report;
    const lines = [`FPS ${state.displayFps}  •  SIM ${state.displaySimulationHz}/s  •  C# ${state.displaySimulationMilliseconds.toFixed(1)} ms  •  BRIDGE ${state.displayBridgeMilliseconds.toFixed(1)} ms`,
        ...perfLines(report)];
    const panelWidth = Math.max(160, width - 24);
    const panelHeight = 14 + lines.length * 13;
    const x = 12;
    const y = Math.max(12, height - panelHeight - 14);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 6, 12, 0.82)';
    roundRect(ctx, x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '700 9px ui-monospace, Menlo, monospace';
    lines.forEach((line, index) => {
        ctx.fillStyle = index === 0 ? '#e8e0ef' : '#a99db3';
        ctx.fillText(line, x + 8, y + 16 + index * 13, panelWidth - 16);
    });
    ctx.restore();
}
function drawEnemy(ctx, enemy, lighting = null, walkPhase = 0, facing = 1, hollow = null, ashling = null, authored = null) {
    if (authored && drawAuthoredEnemy(ctx, enemy, authored)) return;
    if (!(ashling&&ashlingSprites.drawEnemy(ctx,enemy,ashling))&&!(hollow&&drawHollowEnemy(ctx,enemy,hollow))&&!drawPaintedEnemy(ctx, enemy, walkPhase, facing)) drawEnemyPixelArt(ctx, enemy, lighting, walkPhase, facing);
    drawRimeArmor(ctx, enemy);
    if (enemy.frozen || enemy.hitFlash || enemy.healthRatio >= 0.72) return;
    const damage = 1 - enemy.healthRatio;
    ctx.strokeStyle = `rgba(255, 205, 190, ${0.18 + damage * 0.5})`;
    ctx.lineWidth = 1.2 + damage * 1.4;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.radius * 0.45, enemy.y - enemy.radius * 0.18);
    ctx.lineTo(enemy.x - enemy.radius * 0.06, enemy.y + enemy.radius * 0.08);
    ctx.lineTo(enemy.x + enemy.radius * 0.25, enemy.y - enemy.radius * 0.34);
    ctx.stroke();
    if (enemy.healthRatio > 0.35) return;
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.radius * 0.04, enemy.y + enemy.radius * 0.18);
    ctx.lineTo(enemy.x + enemy.radius * 0.4, enemy.y + enemy.radius * 0.44);
    ctx.stroke();
}

function enemyColor(enemy) {
    if (enemy.hitFlash) return '#fff1df';
    if (enemy.frozen) return '#9fdfff';
    if (enemy.healthRatio <= 0.25) return '#5f2731';
    if (enemy.kind === 1) return enemy.healthRatio <= 0.55 ? '#67356f' : '#9855a4';
    if (enemy.kind === 2) return enemy.healthRatio <= 0.55 ? '#9a472f' : '#df744c';
    if (enemy.kind === 3) return enemy.healthRatio <= 0.55 ? '#6d2a32' : '#9d3c47';
    return enemy.healthRatio <= 0.55 ? '#913640' : '#c14b54';
}

function enemyEdgeColor(kind) {
    if (kind === 1) return '#d393e4';
    if (kind === 2) return '#ffb07a';
    if (kind === 3) return '#d56b75';
    return '#e57b82';
}

// Warding Pulse readiness: a thin ground arc at the hunter's feet that closes as the ward recovers (Hades shows cast ammo on
// the hero, not in a corner). Full ring = the ward will answer the next crowd or windup.
function drawWardReadiness(ctx, player, seconds, reducedMotion) {
    if (player?.wardCharge === null || player?.wardCharge === undefined) return;
    const charge = Math.max(0, Math.min(1, player.wardCharge));
    const radius = (player.radius || 12) + 9;
    ctx.save();
    ctx.translate(player.x, player.y + (player.radius || 12) * .55);
    ctx.scale(1, .42);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(221, 214, 255, .14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
    const ready = charge >= 1;
    const glow = ready && !reducedMotion ? .55 + .2 * Math.sin(seconds * 3) : ready ? .65 : .32;
    ctx.strokeStyle = `rgba(221, 214, 255, ${glow})`;
    ctx.lineWidth = ready ? 2.6 : 2;
    ctx.stroke();
    ctx.restore();
}

// The pulse itself: a pale double ring that sweeps out to the exact push radius, with short outward ticks so the shove reads
// as a push rather than a hit. Reduced motion shows the final ring fading in place.
function drawWardPulse(ctx, pulse, reducedMotion) {
    const progress = Math.min(1, Math.max(0, pulse.progress));
    const eased = reducedMotion ? 1 : 1 - (1 - progress) * (1 - progress);
    const radius = pulse.radius * (.2 + .8 * eased);
    const alpha = 1 - progress;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 190, 255, ${alpha * .1})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(232, 228, 255, ${alpha * .9})`;
    ctx.lineWidth = 3.2 - progress * 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius * .82, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(170, 156, 240, ${alpha * .55})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = `rgba(232, 228, 255, ${alpha * .75})`;
    ctx.lineWidth = 2;
    for (let index = 0; index < 12; index++) {
        const angle = index / 12 * Math.PI * 2;
        const inner = radius + 3;
        const outer = radius + 3 + 7 * alpha;
        ctx.beginPath();
        ctx.moveTo(pulse.x + Math.cos(angle) * inner, pulse.y + Math.sin(angle) * inner);
        ctx.lineTo(pulse.x + Math.cos(angle) * outer, pulse.y + Math.sin(angle) * outer);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSplashPulse(ctx, pulse, school) {
    const palette = school === undefined || school === null ? schoolPalette(1) : schoolPalette(school);
    const progress = Math.min(1, Math.max(0, pulse.progress));
    const radius = pulse.radius * (0.35 + progress * 0.65);
    const alpha = (1 - progress) * 0.72;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${palette.rgb}, ${alpha * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, ${alpha})`;
    ctx.lineWidth = 4 - progress * 2;
    ctx.stroke();
}

function drawDeathBurst(ctx, death) {
    const progress = Math.min(1, Math.max(0, death.progress));
    const alpha = 1 - progress;
    const intensity = Math.max(1, death.intensity ?? 1);
    const ringRadius = death.radius * (0.65 + progress * (1.15 + intensity * 0.18));
    ctx.beginPath();
    ctx.arc(death.x, death.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 218, 211, ${Math.min(1, alpha * (0.68 + intensity * 0.08))})`;
    ctx.lineWidth = 2.4 + intensity * 0.45 - progress * 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(death.x, death.y, Math.max(1, death.radius * (0.66 + intensity * 0.05) * alpha), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 242, 235, ${alpha * 0.5})`;
    ctx.fill();

    const distance = death.radius * (0.3 + progress * (1.6 + intensity * 0.18));
    const size = Math.max(1, death.radius * (0.2 + intensity * 0.04) * alpha);
    const particles = 4 + intensity * 2;
    ctx.fillStyle = `rgba(210, 91, 101, ${alpha})`;
    for (let index = 0; index < particles; index++) {
        const angle = Math.PI / 4 + index * Math.PI * 2 / particles;
        const x = death.x + Math.cos(angle) * distance;
        const y = death.y + Math.sin(angle) * distance;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
}

function drawExtractionRitual(ctx, extraction) {
    const progress = Math.min(1, Math.max(0, extraction.progress));
    const alpha = extraction.isProgressing ? 1 : 0.48;
    ctx.save();

    ctx.beginPath();
    ctx.arc(extraction.x, extraction.y, extraction.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(157, 94, 226, ${0.06 * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(198, 154, 255, ${0.35 * alpha})`;
    ctx.lineWidth = 3;
    if (!extraction.isProgressing) ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(extraction.x, extraction.y, extraction.radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = `rgba(217, 183, 255, ${alpha})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    if (extraction.isProgressing) {
        const pulseRadius = extraction.radius + 7 + Math.sin(progress * Math.PI * 10) * 2;
        ctx.beginPath();
        ctx.arc(extraction.x, extraction.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(184, 135, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = extraction.isProgressing ? '#e8d7ff' : '#b8a6c9';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = extraction.isProgressing ? 'HOLD THE RITUAL' : 'RETURN TO RITUAL';
    ctx.fillText(`${label} ${Math.max(0, extraction.remainingSeconds).toFixed(1)}s`, extraction.x, extraction.y - extraction.radius - 12);
    ctx.restore();
}

function drawImpactBurst(ctx, x, y, radius, color, rays) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let index = 0; index < rays; index++) {
        const angle = index * Math.PI * 2 / rays;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35);
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        ctx.stroke();
    }
}

function drawImpactCross(ctx, x, y, radius, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.restore();
}

function drawDragonBreath(ctx, breath, school, dragon = null) {
    if(dragon?.action==='pounce'){
        ctx.save();ctx.strokeStyle='rgba(239,167,78,.8)';ctx.fillStyle='rgba(222,128,63,.12)';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(dragon.attackTargetX,dragon.attackTargetY,70,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(dragon.x,dragon.y);ctx.lineTo(dragon.attackTargetX,dragon.attackTargetY);ctx.stroke();ctx.restore();return;
    }
    const palette = schoolPalette(school ?? 1);
    const angle = Math.atan2(breath.directionY, breath.directionX);
    ctx.beginPath();
    ctx.moveTo(breath.x, breath.y);
    ctx.arc(breath.x, breath.y, breath.range, angle - breath.halfAngle, angle + breath.halfAngle);
    ctx.closePath();
    ctx.fillStyle = `rgba(${palette.rgb}, ${breath.active?.05:.16})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, ${breath.active?.4:.65})`;
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Paints the glowing pixels of one authored actor on a transparent tile the size of its capture and uploads it as that capture's emissive texture.
 * Returns the material for the capture, or null when the actor has nothing that glows this frame.
 */
function paintAuthoredEmissive(state, gpu, layer, snapshot, captureId, tileX, tileY, tileSize, pixelScale) {
    // The Fire Tier I enemy strips do not currently emit light. No secondary 160px+ tile needs allocating or clearing.
    // Evaluate the currently loaded action, not the enemy kind, so newly authored glow strips work without code changes.
    if (layer.kind === 'enemy' && !enemyHasEmissivePose(state.authored, layer.enemy.entityId)) return null;
    const tile = (state.gpuEmissivePool ??= new HuntGpuScratchPool(8)).acquire(Math.ceil(tileSize * pixelScale));
    const surface = prepareHuntGpuScratch(tile, tileSize, tileX, tileY, pixelScale);
    let drawn = false, set = null, change = null;
    setAuthoredRenderMode('emissive');
    try {
        if (layer.kind === 'enemy') {
            drawn = drawAuthoredEnemy(surface, layer.enemy, state.authored);
            set = state.authored.enemies.get(layer.enemy.entityId)?.name;
            if (layer.enemy.invulnerable) change = layer.enemy.telegraph?.progress ?? .5;
        } else if (layer.kind === 'dragon') {
            drawn = drawAuthoredAshfang(surface, state.ashfang, layer.dragon);
            set = state.ashfang.authoredForm;
        } else {
            drawn = drawAuthoredWizard(surface, layer.player ?? snapshot.player, state.authored);
            set = 'Wizard';
        }
        const body = layer.enemy ?? layer.player;
        if (drawn && body && state.terrainFrame && layer.kind !== 'dragon')
            eraseTerrainOcclusion(surface, state.terrainFrame, occludingTerrainCells(state.terrainFrame, body.x, body.y + (body.z || 0), body.z || 0, (body.radius || 16) * 1.25));
    } finally {
        setAuthoredRenderMode('albedo');
        surface.restore();
    }
    if (!drawn) return null;
    const id = `${captureId}:emissive`;
    gpu.uploadLayer(id, tile, tileSize, tileSize, undefined, true, pixelScale);
    return { emissiveMap: id, emission: '#ffffff', emissionIntensity: emissionIntensity(set, change) };
}

function drawDragon(ctx, dragon, reducedMotion = false, breath = null, ashfang = null, authored = false) {
    if (authored && ashfang && drawAuthoredAshfang(ctx, ashfang, dragon)) return;
    if (ashfang && drawAshfang(ctx,ashfang)) return;
    const palette = schoolPalette(dragon.school);
    ctx.save();
    ctx.translate(dragon.x, dragon.y);

    if (dragon.phase === 2) {
        ctx.beginPath();
        ctx.arc(0, 0, dragon.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${palette.rgb}, 0.5)`;
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    if (dragon.isAscendant) {
        ctx.strokeStyle = `rgba(${palette.lightRgb}, .75)`;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(${palette.rgb}, .65)`;
        ctx.shadowBlur = 17;
        ctx.beginPath();
        ctx.arc(0, 0, dragon.radius * 1.65, -Math.PI * .84, -Math.PI * .16);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    const art = artReady() ? `wyrm.${dragon.school}.${dragon.frozen ? 'frozen' : `p${dragon.phase === 2 ? 2 : 1}.f${reducedMotion ? 0 : Math.floor(performance.now() / 280) % 2}`}` : null;
    if (drawPaintedWyrm(ctx, dragon, breath ? 3 : 0)) {
        // Canonical breath telegraph and phase/ascendant crests remain separate from the bitmap.
    } else if (art && hasArtFrame('wyrms', art)) {
        // Authored wyrm sprite scaled to the canonical C# radius; flapping is presentation only.
        ctx.fillStyle = 'rgba(4,6,9,.34)';
        ctx.beginPath();
        ctx.ellipse(6, dragon.radius * 1.15, dragon.radius * 1.5, dragon.radius * .38, 0, 0, Math.PI * 2);
        ctx.fill();
        drawArtFrame(ctx, 'wyrms', art, 0, 0, { scale: dragon.radius / 34 });
    }
    else if (dragon.school === 0) drawArcaneWyrm(ctx, dragon, palette);
    else if (dragon.school === 1) drawFireWyrm(ctx, dragon, palette);
    else if (dragon.school === 2) drawFrostWyrm(ctx, dragon, palette);
    else drawStormWyrm(ctx, dragon, palette);

    if (dragon.isAscendant) {
        ctx.fillStyle = palette.edge;
        const peak = dragon.radius * 1.35;
        for (let index = -1; index <= 1; index++) {
            const x = index * dragon.radius * .38;
            drawTriangle(ctx, x - 7, -peak + 6, x, -peak - (index === 0 ? 22 : 10), x + 7, -peak + 6);
        }
    }

    ctx.restore();
}

function drawFireWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    drawDragonCore(ctx, dragon, palette, 1, 1);
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.66, -radius * 0.55, -radius * 0.28, -radius * 1.38, -radius * 0.08, -radius * 0.62);
    drawTriangle(ctx, radius * 0.66, -radius * 0.55, radius * 0.28, -radius * 1.38, radius * 0.08, -radius * 0.62);
    ctx.fillStyle = palette.phase;
    for (let index = -1; index <= 1; index++) {
        drawTriangle(ctx, index * radius * 0.38 - 5, radius * 0.72, index * radius * 0.38, radius * 1.25, index * radius * 0.38 + 5, radius * 0.72);
    }
    drawDragonEyes(ctx, radius, palette);
}

function drawStormWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    drawDragonCore(ctx, dragon, palette, 1.12, 0.78);
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.85, -radius * 0.1);
    ctx.lineTo(-radius * 1.45, -radius * 0.65);
    ctx.lineTo(-radius * 1.1, radius * 0.15);
    ctx.moveTo(radius * 0.85, -radius * 0.1);
    ctx.lineTo(radius * 1.45, -radius * 0.65);
    ctx.lineTo(radius * 1.1, radius * 0.15);
    ctx.stroke();
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.42, -radius * 0.55, -radius * 0.12, -radius * 1.22, -radius * 0.02, -radius * 0.52);
    drawTriangle(ctx, radius * 0.42, -radius * 0.55, radius * 0.12, -radius * 1.22, radius * 0.02, -radius * 0.52);
    drawDragonEyes(ctx, radius, palette);
}

function drawFrostWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    ctx.beginPath();
    for (let index = 0; index < 8; index++) {
        const angle = -Math.PI / 2 + index * Math.PI / 4;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = dragon.frozen ? '#d8f5ff' : dragon.phase === 2 ? palette.phase : palette.body;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.68, -radius * 0.42, -radius * 0.3, -radius * 1.55, -radius * 0.08, -radius * 0.6);
    drawTriangle(ctx, radius * 0.68, -radius * 0.42, radius * 0.3, -radius * 1.55, radius * 0.08, -radius * 0.6);
    drawDragonEyes(ctx, radius, palette);
}

function drawArcaneWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    ctx.strokeStyle = `rgba(${palette.lightRgb}, 0.45)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.55, radius * 0.72, Math.PI / 5, 0, Math.PI * 2);
    ctx.stroke();
    drawDragonCore(ctx, dragon, palette, 0.9, 0.9);
    ctx.fillStyle = palette.edge;
    for (let index = 0; index < 3; index++) {
        const angle = index * Math.PI * 2 / 3 + 0.35;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius * 1.35, Math.sin(angle) * radius * 0.72, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    drawDragonEyes(ctx, radius, palette);
}

function drawDragonCore(ctx, dragon, palette, scaleX, scaleY) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, dragon.radius, 0, Math.PI * 2);
    ctx.fillStyle = dragon.frozen ? '#bdeeff' : dragon.phase === 2 ? palette.phase : palette.body;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
}

function drawDragonEyes(ctx, radius, palette) {
    ctx.fillStyle = palette.eye;
    ctx.beginPath();
    ctx.arc(-radius * 0.32, -radius * 0.12, 3, 0, Math.PI * 2);
    ctx.arc(radius * 0.32, -radius * 0.12, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBossBar(ctx, dragon, hunt, width, healthTrail = null) {
    const palette = schoolPalette(dragon.school);
    const outerWidth = Math.min(350, width - 132);
    const x = (width - outerWidth) / 2;
    const y = width <= 520 ? 103 : 9;
    const barY = y + 20;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 6, 12, 0.74)';
    roundRect(ctx, x, y, outerWidth, 36, 10);
    ctx.fill();
    ctx.strokeStyle = dragon.isAscendant ? 'rgba(255, 206, 133, .8)' : `rgba(${palette.rgb}, 0.28)`;
    ctx.lineWidth = dragon.isAscendant ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.font = '900 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${dragon.name.toUpperCase()} • P${dragon.phase}`, x + 9, y + 12);

    if (hunt?.signatureName) {
        ctx.textAlign = 'right';
        ctx.fillStyle = palette.edge;
        ctx.font = '800 8px system-ui, sans-serif';
        const aerial=dragon.flightStage==='takeoff'?'TAKING FLIGHT':dragon.flightStage==='overhead'?'FIRE RAIN':dragon.flightStage==='land'?'LANDING':dragon.flightStage==='recover'?'EXPOSED':null;
        ctx.fillText(aerial??hunt.signatureName.toUpperCase(), x + outerWidth - 9, y + 12);
    }

    const innerX = x + 9;
    const innerWidth = outerWidth - 18;
    ctx.fillStyle = 'rgba(9, 7, 12, 0.88)';
    roundRect(ctx, innerX, barY, innerWidth, 8, 4);
    ctx.fill();
    if(Number(dragon.school)===1&&healthTrail!=null){ctx.fillStyle='#d6ad79';roundRect(ctx,innerX,barY,innerWidth*healthTrail,8,4);ctx.fill();}
    ctx.fillStyle = dragon.phase === 2 ? palette.phase : palette.body;
    roundRect(ctx, innerX, barY, innerWidth * Math.max(0, dragon.health / dragon.maxHealth), 8, 4);
    ctx.fill();
    ctx.restore();
}
function drawTouchIndicator(state, ctx) {
    if (state.pointerId === null) return;
    const rect = state.canvas.getBoundingClientRect();
    const originX = state.touchOrigin.x - rect.left;
    const originY = state.touchOrigin.y - rect.top;
    const currentX = state.touchCurrent.x - rect.left;
    const currentY = state.touchCurrent.y - rect.top;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(originX, originY, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
    ctx.stroke();
}

function drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 44) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 44) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
}

function schoolPalette(school) {
    if (school === 1) return { body: '#a44031', phase: '#ef5f35', edge: '#efaa63', eye: '#fff0b0', text: '#f4d6bb', dark: 'rgba(29, 10, 7, 0.92)', rgb: '238, 91, 48', lightRgb: '255, 188, 112' };
    if (school === 2) return { body: '#5a8ea3', phase: '#88d8ec', edge: '#b9eff8', eye: '#f2fdff', text: '#d8f6fb', dark: 'rgba(7, 20, 28, 0.92)', rgb: '128, 216, 238', lightRgb: '208, 248, 255' };
    if (school === 3) return { body: '#6f6d38', phase: '#d4c83e', edge: '#fff18a', eye: '#fffbd2', text: '#f3edbd', dark: 'rgba(20, 19, 6, 0.92)', rgb: '236, 220, 75', lightRgb: '255, 246, 164' };
    return { body: '#68458f', phase: '#a35de0', edge: '#d9b5ff', eye: '#f7edff', text: '#ead8f8', dark: 'rgba(18, 8, 27, 0.92)', rgb: '176, 103, 232', lightRgb: '226, 190, 255' };
}

function projectileColor(spell) {
    if (spell === 1) return '#ff7a45';
    if (spell === 2) return '#8fdcff';
    if (spell === 3) return '#ffe765';
    return '#b887ff';
}

function roman(value) {
    return ['0', 'I', 'II', 'III', 'IV', 'V'][value] ?? String(value);
}

function drawTriangle(ctx, x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
}

function drawPolygon(ctx, x, y, radius, sides, rotation) {
    ctx.beginPath();
    for (let index = 0; index < sides; index++) {
        const angle = rotation + index * Math.PI * 2 / sides;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

// Snapshot direction is the same C# direction used to launch the primary spell.
function drawAimRune(ctx, player) {
    if (!Number.isFinite(player.aimAngle) || (!player.manualAim && player.aimTargetId == null && player.aimPropId == null)) return;
    ctx.save();
    ctx.translate(player.x, player.y + 7);
    ctx.rotate(player.aimAngle);
    ctx.strokeStyle = player.manualAim ? 'rgba(225,204,159,.72)' : 'rgba(162,176,195,.36)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, 29, 20, 0, -.4, .4);
    ctx.moveTo(34, 0); ctx.lineTo(38, -3); ctx.lineTo(42, 0); ctx.lineTo(38, 3); ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

/** An immutable terrain capture only changes when its painted revision, camera window or output resolution changes. */
function terrainViewRevision(state, view, scale) {
    return state.terrainCache.viewportRevision(view, view.width, view.height, scale);
}

/** The visible window of the terrain normal map, flat where nothing is painted, for the ground's lit material. */
function groundNormalView(state, view, scale = 1) {
    const { x, y, width, height } = view;
    const canvas = state.normalViewCanvas ??= document.createElement('canvas');
    const pixelWidth = Math.ceil(width * scale), pixelHeight = Math.ceil(height * scale);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const revision = terrainViewRevision(state, view, scale);
    if (state.normalViewRevision === revision) return canvas;
    state.normalViewRevision = revision;
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#8080ff';
    g.fillRect(0, 0, pixelWidth, pixelHeight);
    g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
    state.terrainCache.drawNormals(g, view);
    return canvas;
}

/** The visible window of the painted terrain at `scale` pixels per world unit: the GPU ground's albedo at 64 art px/m. */
function groundAlbedoView(state, view, scale) {
    const { x, y, width, height } = view;
    const canvas = state.groundViewCanvas ??= document.createElement('canvas');
    const pixelWidth = Math.ceil(width * scale), pixelHeight = Math.ceil(height * scale);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const revision = terrainViewRevision(state, view, scale);
    if (state.groundViewRevision === revision) return canvas;
    state.groundViewRevision = revision;
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, pixelWidth, pixelHeight);
    g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
    state.terrainCache.draw(g, view);
    return canvas;
}

// Review-only vertical slice: C# terrain recipe -> three accepted art families
// -> cached material canvas -> SAME shared G1 LightingEngine as the rest of WyrmForge.
// Does not invent roads, collision, lighting algorithms, or change production Hunts.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { environmentProfile } from './lighting/registry.js';
import { GROUND_ATLAS_URL } from './arena-materials.js';
import { threeMaterialPlan, bakeThreeMaterialGround, bakeThreeMaterialRoughness, THREE_MATERIAL_REVIEW } from './wet-forest-three-material-kit.js';

const states = new WeakMap();
const profiles = new Set(['night', 'neutral', 'zero']);
const makeCanvas = () => document.createElement('canvas');

function lamp(id, color, position, intensity, priority) {
    return {
        id, ownerId: id, type: 'point', enabled: true, position,
        direction: [0, 0, -1], color, intensity, range: 15,
        coneAngle: .5, penumbra: .2, castsShadow: false, priority,
    };
}

function material(texture, roughness) {
    return {
        id: 'forest-ground-material', color: '#ffffff', albedo: texture,
        roughnessMap: roughness, roughness: 1, metalness: 0,
        specular: .35, reflection: 'direct',
        emission: '#000000', emissionIntensity: 0, alphaCutoff: 0,
        doubleSided: false,
    };
}

function ground() {
    return {
        id: 'forest-ground', ownerId: 'forest-ground', geometry: 'ground-plane',
        material: 'forest-ground-material', position: [0, 0, 0],
        rotation: [0, 0, 0], scale: [16, 25.6, 1],
        receivesLight: true, receivesShadow: true, castsShadow: false,
    };
}

export function inspectionSnapshot(textureId, profile, roughnessId = 'forest-roughness') {
    if (!profiles.has(profile)) throw new TypeError('Unknown lighting review profile');
    const zero = profile === 'zero';
    const environment = environmentProfile(zero ? 'zero' : profile === 'night' ? 'night' : 'day');
    if (profile === 'neutral') {
        environment.ambient = .72;
        environment.color = '#ffffff';
        environment.emission = false;
    }
    // Registered lighting descriptors, not baked orange CSS/canvas tint.
    const lights = profile === 'night'
        ? [lamp('forest-lamp-west', '#ffc58f', [-3.0, 5.1, 3.4], 48, 10),
           lamp('forest-lamp-east', '#9bb5d7', [4.0, -5.2, 4.1], 18, 5)]
        : [];
    return { version: 1, time: 0, environment, lights,
        materials: [material(textureId, roughnessId)], objects: [ground()] };
}

function redraw(state) {
    if (!state.alive || !state.textureId) return;
    const engine = state.engine;
    engine.apply(inspectionSnapshot(state.textureId, state.profile, state.roughnessId));
    engine.setDebugView('lit');
    engine.render(Math.max(1, state.canvas.clientWidth), Math.max(1, state.canvas.clientHeight));
    state.canvas.dataset.materialReviewReady = 'true';
    state.canvas.dataset.materialReviewProfile = state.profile;
    state.canvas.dataset.materialReviewSeed = String(state.seed);
}

function rebuild(state) {
    const plan = threeMaterialPlan(state.recipe, state.seed);
    if (!plan) throw new TypeError('Missing/invalid C# Wet Forest terrain recipe');
    const pixels = bakeThreeMaterialGround(plan, state.source, state.seed, makeCanvas);
    const roughness = bakeThreeMaterialRoughness(plan, makeCanvas);
    if (!pixels || !roughness) throw new Error('Could not bake shared-engine ground material maps');
    // Release previous material and GPU texture at re-seed (not once per frame).
    state.engine.removeObject('forest-ground');
    for (const id of [state.textureId, state.roughnessId]) if (id) {
        state.engine.textures.get(id)?.dispose();
        state.engine.textures.delete(id);
    }
    const version = ++state.version;
    state.textureId = 'forest-ground-' + version;
    state.roughnessId = 'forest-roughness-' + version;
    state.engine.registerTexture(state.textureId, new T.CanvasTexture(pixels));
    state.engine.registerTexture(state.roughnessId, new T.CanvasTexture(roughness), false);
    state.plan = plan;
    redraw(state);
}

export async function initializeThreeMaterialReview(canvas, recipe, seed = 1204, profile = 'night') {
    if (states.has(canvas)) return;
    if (!profiles.has(profile)) throw new TypeError('Unknown lighting review profile');
    const engine = new LightingEngine(canvas, { maxLights: 3, shadowViews: 0 });
    engine.registerGeometry('ground-plane', new T.PlaneGeometry(1, 1));
    // Explicit top-down camera: the same GPU lighting/material engine remains in charge.
    engine.camera.up.set(0, 1, 0);
    engine.camera.position.set(0, 0, 30);
    engine.camera.lookAt(0, 0, 0);
    engine.halfWidth = 8.25;
    const state = { canvas, engine, alive: true, source: null, plan: null,
        recipe, seed: seed | 0, profile, textureId: null, roughnessId: null, version: 0, resize: null };
    states.set(canvas, state);
    try {
        const source = new Image();
        source.src = GROUND_ATLAS_URL;
        await source.decode();
        if (!state.alive) return;
        state.source = source;
        rebuild(state);
        state.resize = new ResizeObserver(() => { if (state.alive) redraw(state); });
        state.resize.observe(canvas);
    } catch (error) {
        canvas.dataset.materialReviewError = String(error?.message || error);
        disposeThreeMaterialReview(canvas);
        throw error;
    }
}

export function configureThreeMaterialReview(canvas, recipe, seed, profile = 'night') {
    const state = states.get(canvas);
    if (!state || !state.alive) return;
    if (!profiles.has(profile)) throw new TypeError('Unknown lighting review profile');
    const nextSeed = seed | 0;
    const changed = nextSeed !== state.seed || recipe !== state.recipe;
    state.seed = nextSeed; state.profile = profile; state.recipe = recipe;
    if (!state.source) return;
    if (changed) rebuild(state);
    else redraw(state);
}

export function threeMaterialDiagnostics(canvas) {
    const state = states.get(canvas);
    if (!state) return null;
    return {
        seed: state.seed, profile: state.profile, ready: Boolean(state.plan),
        counts: state.plan?.counts ?? null, source: state.plan?.authority ?? null,
        materialFamilies: THREE_MATERIAL_REVIEW.selected,
        sourceNeutral: THREE_MATERIAL_REVIEW.neutralAlbedoApproved,
        provisionalRoughness: THREE_MATERIAL_REVIEW.roughnessProvisional,
        GPUMaps: state.textureId ? 2 : 0,
        gameIntegrated: false, lights: state.engine.selected?.length ?? 0,
    };
}

export function disposeThreeMaterialReview(canvas) {
    const state = states.get(canvas);
    if (!state) return;
    state.alive = false;
    state.resize?.disconnect();
    state.engine.dispose();
    states.delete(canvas);
}

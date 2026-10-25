// Isolated test fixture only. No RunSimulation, saves, collision or production imports.
import * as T from './vendor/three.module.js';
import { townFixture } from './town-fixture.js';
import { cutoutLeafPixels } from './cutout-fixture.js';
import { LightingEngine } from './engine.js';
import { environmentProfile } from './registry.js';
import { createSpriteAnimationState, updateSpriteAnimation } from '../sprite-animation.js';
import { spriteFrame, spritePlaneGeometry } from './lit-sprite.js';
import { GROUND_ATLAS_URL, buildGroundQuiltAtlas, drawReferenceGroundBoard, drawGroundMaterialTransitions } from '../arena-materials.js';
import { groundFoundationBoard, FOUNDATION_COLUMNS, FOUNDATION_ROWS, FOUNDATION_WIDTH, FOUNDATION_HEIGHT } from '../arena-ground-foundation.js';

const states = new WeakMap();
const light = (id, position, color, intensity, type = 'point', priority = 0) => ({
    id, ownerId: id, type, enabled: true, position, direction: [0, 1, -1], color, intensity,
    range: 18, coneAngle: .55, penumbra: .25, castsShadow: true, priority,
});
const material = (id, color, roughness = .85, extra = {}) => ({ id, color, roughness,
    metalness: 0, specular: .3, reflection: 'direct', emission: '#000000', emissionIntensity: 0,
    alphaCutoff: .5, doubleSided: true, ...extra });
const object = (id, geometry, materialId, position, scale = [1, 1, 1], extra = {}) => ({
    id, ownerId: id, geometry, material: materialId, position, scale, rotation: [0, 0, 0],
    receivesLight: true, receivesShadow: true, castsShadow: true, ...extra,
});
async function approvedGround() {
    const source = new Image(); source.src = GROUND_ATLAS_URL; await source.decode();
    const atlas = buildGroundQuiltAtlas(source, 1204, undefined, false);
    const board = groundFoundationBoard(1204, 'trails');
    const canvas = document.createElement('canvas'); canvas.width = FOUNDATION_WIDTH; canvas.height = FOUNDATION_HEIGHT;
    const ctx = canvas.getContext('2d');
    drawReferenceGroundBoard(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, 1204);
    drawGroundMaterialTransitions(ctx, board, atlas, FOUNDATION_COLUMNS, FOUNDATION_ROWS, 1204);
    return new T.CanvasTexture(canvas);
}
async function actorResources(engine, id, folder) {
    const base = new URL(`../../art/enemies/${folder}/`, import.meta.url);
    const response = await fetch(new URL('manifest.json', base));
    if (!response.ok) throw new Error(`Missing ${id} manifest`);
    const manifest = await response.json();
    const clip = manifest.clips.walk;
    const texture = await new T.TextureLoader().loadAsync(new URL(clip.image, base).href);
    engine.registerTexture(id, texture);
    const normal = await new T.TextureLoader().loadAsync(new URL(`../../art/lighting-proof/${id}-walk-normal.png`, import.meta.url).href);
    engine.registerTexture(`${id}-normal`, normal, false);
    engine.registerGeometry(id, spritePlaneGeometry(T, clip, 1 / 48, engine.camera.getWorldDirection(new T.Vector3()).negate().toArray()));
    manifest.animationProfile = await (await fetch(new URL('animation-profile.json', base))).json();
    return manifest;
}
export async function initializeProof(canvas) {
    if (states.has(canvas)) return;
    const engine = new LightingEngine(canvas);
    const state = { engine, alive: true, options: { profile: 'night', fireball: true, torch: true, spot: true,
        lighting: 'scene', townActive: true, school: 'arcane', mastery: 0, sourceDistance: 2, behind: false, cutouts: false, cutoutAlpha: true, rune: false, shadows: true, reflections: true, progress: .25, frame: 0, animate: false, view: 'lit', focus: 'overview', inspectObject: 'hollowed', castsShadow: true, receivesShadow: true, receivesLight: true, normals: true }, manifests: {}, animation: {}, samples: {} };
    states.set(canvas, state);
    try {
        engine.registerGeometry('box', new T.BoxGeometry(1, 1, 1));
        engine.registerGeometry('plane', new T.PlaneGeometry(1, 1));
        engine.registerTexture('cutout-test', new T.DataTexture(cutoutLeafPixels(), 64, 64));
        const water = new T.PlaneGeometry(1, 1, 40, 32);
        const vertices = water.attributes.position;
        for (let i = 0; i < vertices.count; i++) vertices.setZ(i, .007 * Math.sin(vertices.getX(i) * 42 + vertices.getY(i) * 24));
        water.computeVertexNormals(); engine.registerGeometry('water', water);
        engine.registerGeometry('sphere', new T.SphereGeometry(.12, 8, 6));
        engine.registerTexture('ground', await approvedGround());
        for (const [id, folder] of [['hollowed', 'hollow-rigged'], ['ashling', 'ashling-rigged']])
            { state.manifests[id] = await actorResources(engine, id, folder); state.animation[id] = createSpriteAnimationState(); }
        if (!state.alive) { engine.dispose(); return; }
        state.materials = [material('terrain', '#ffffff', .9, { albedo: 'ground' }), material('stone', '#777b80'),
            material('cutout-upper', '#ffffff', .9, { albedo: 'cutout-test' }),
            material('cutout-lower', '#ffffff', .9, { albedo: 'cutout-test' }), material('wood', '#68503a'), material('water', '#1a3034', .11, { specular: 1 }),
            material('hollowed', '#ffffff', .8, { albedo: 'hollowed', normal: 'hollowed-normal' }), material('ashling', '#ffffff', .9, { albedo: 'ashling', normal: 'ashling-normal' }),
            material('flame', '#321200', .7, { emission: '#ff792d', emissionIntensity: 2 }),
            material('rune', '#124138', .6, { emission: '#35edbc', emissionIntensity: 1 })];
        state.objects = [object('approved-ground', 'plane', 'terrain', [0, 0, 0], [16, 20, 1]),
            object('puddle', 'water', 'water', [1.2, -1.4, .015], [3.3, 2.7, 1]),
            object('wall', 'box', 'stone', [-2, 2.5, 1.1], [3.8, .35, 2.2]),
            object('roof', 'box', 'wood', [-2, 2.4, 2.3], [4.2, 1.8, .2], { rotation: [.13, 0, 0] }),
            object('foreground-post', 'box', 'wood', [2.5, 0, .9], [.16, .16, 1.8]),
            object('rock', 'box', 'stone', [-2.5, -.9, .35], [1.1, .8, .7], { rotation: [.1, .2, .25] }),
            object('hollowed', 'hollowed', 'hollowed', [-.8, -.6, 0]),
            object('ashling', 'ashling', 'ashling', [1.1, .7, 0]),
            // Existing actor reused to test the Town receiver seam, not proposed NPC artwork.
            object('npc-binding-proxy', 'hollowed', 'hollowed', [-2.2, 1.5, 0], [.7, .7, .7]),
            object('lantern-core', 'sphere', 'flame', [-2, 1.5, 1.7], [1, 1, 1], { castsShadow: false })];
        const oak = await originalOak(engine);
        if (!state.alive) { engine.dispose(); return; }
        state.objects.push(...oak.objects); state.materials.push(...oak.materials);
        state.resize = new ResizeObserver(() => { if (state.alive) state.engine.render(); });
        state.resize.observe(canvas);
        canvas.dataset.ready = 'true';
        configureProof(canvas, {});
    } catch (error) {
        engine.dispose(); states.delete(canvas); canvas.dataset.error = error.message; throw error;
    }
}
export function configureProof(canvas, options) {
    const state = states.get(canvas); if (!state?.materials || !state.alive) return;
    Object.assign(state.options, options);
    const cameras = { overview: [[0, 0, 1], 5], actors: [[0, 0, .8], 2],
        cutouts: [[-4, -3, .8], 2], oak: [[2.3, 3.4, 2], 2.5], town: [[-2, 1.8, 1.2], 2.5], water: [[1.2, -1.4, .1], 2] };
    const camera = cameras[state.options.focus];
    if (!camera) throw new RangeError('Unknown inspection camera');
    state.engine.setCamera(...camera);
    const p = state.options, zero = p.profile === 'zero';
    const firePosition = [-3.5 + p.progress * 7, p.behind ? 4 : -1.6, p.behind ? 3.6 : 2.4];
    const environment = environmentProfile(p.profile);
    const objects = structuredClone(state.objects);
    if (p.cutouts) objects.push(
        object('cutout-lower', 'plane', 'cutout-lower', [-4, -3, .55], [2.4, 2.4, 1]),
        object('cutout-upper', 'plane', 'cutout-upper', [-4, -3, 1.25], [2, 2, 1], { rotation: [.1, .15, .25] }));
    let lights = [light('fireball', firePosition, '#ff8d42', 32, 'point', 10),
        light('torch', [-2, 1.4, 1.7], '#ffc27a', 10, 'point', 5),
        light('lantern-beam', [3, -1, 3.5], '#adc3e9', 16, 'spot', 8),
        light('moon', [-4, -3, 8], '#99b4dc', environment.ambient > .1 ? 1.2 : .035, 'directional', 1)];
    lights[0].enabled = p.fireball; lights[1].enabled = p.torch; lights[2].enabled = p.spot;
    // New emitter/prop requires descriptor data only; engine source never mentions rune.
    if (p.rune) lights.push(light('rune', [2, -2, .7], '#48ffd1', 8, 'point', 2));
    if (p.lighting === 'neutral-key') {
        // Explicit inspection source, never a hidden actor boost or ambient veil.
        const receiver = objects.find(o => o.id === p.inspectObject);
        const [x, y, z] = receiver?.position ?? [-4, -3, .55];
        lights = [light('inspection-key', [x - 1.8 + p.progress * 3.6, y + (p.behind ? 2 : -2), z + 2.4], '#ffffff', 24, 'point', 10)];
        environment.ambient = 0; environment.emission = false;
    } else if (p.lighting === 'source-lifecycle') {
        // Diagnostic descriptors only: same receivers, BRDF, attenuation and shadow budget.
        const [x, y, z] = objects.find(o => o.id === p.inspectObject)?.position ?? [-4, -3, .55];
        lights = [light('fireball', [x - 1, y - p.sourceDistance, z + 2.4], '#ff8d42', 32, 'point', 10),
            light('torch', [x + 1, y - 2, z + 2.4], '#ffc27a', 10, 'point', 5)];
        lights[0].enabled = p.fireball; lights[1].enabled = p.torch;
        for (const source of lights) source.range = 12;
        environment.ambient = 0; environment.emission = false;
    } else if (p.lighting === 'town-fixture') {
        const fixture = townFixture({ active: p.townActive, school: p.school, mastery: p.mastery });
        lights = lights.filter(l => l.id === 'moon');
        if (fixture) {
            lights.push(fixture);
            objects.push(object('town-fixture-core', 'sphere', 'town-fixture', fixture.position, [1, 1, 1], { castsShadow: false }));
        } else objects.splice(objects.findIndex(o => o.id === 'npc-binding-proxy'), 1);
    } else if (p.lighting !== 'scene') throw new RangeError('Unknown lighting rig');
    if (p.lighting !== 'scene') {
        // Scene fixture cores would falsely mark different source positions in inspection rigs.
        objects.splice(objects.findIndex(o => o.id === 'lantern-core'), 1);
    }
    for (const l of lights) { l.enabled &&= !zero; l.castsShadow &&= p.shadows; }
    if (p.fireball && p.lighting === 'scene') objects.push(object('fireball-core', 'sphere', 'flame', firePosition, [1, 1, 1], { castsShadow: false }));
    if (p.rune && p.lighting === 'scene') objects.push(object('rune-prop', 'box', 'rune', [2, -2, .25], [.35, .35, .5]));
    for (const o of objects) {
        if (o.id === p.inspectObject) {
            o.castsShadow = p.castsShadow; o.receivesShadow = p.receivesShadow; o.receivesLight = p.receivesLight;
        }
        const id = o.id === 'npc-binding-proxy' ? 'hollowed' : o.id;
        if (state.manifests[id]) o.frame = spriteFrame(state.manifests[id], { clip: 'walk', frame: p.animate ? state.samples[id]?.frame ?? 0 : p.frame % 16, direction: 'S' });
    }
    const materials = state.materials.map(m => ({ ...m, alphaCutoff: m.id === 'cutout-upper' && !p.cutoutAlpha ? 0 : m.alphaCutoff, normal: p.normals ? m.normal : undefined, reflection: p.reflections ? m.reflection : 'off',
        emissionIntensity: m.id === 'flame' && !p.torch && !p.fireball ? 0 : m.emissionIntensity }));
    if (p.lighting === 'town-fixture' && p.townActive) {
        const fixture = townFixture({ active: p.townActive, school: p.school, mastery: p.mastery });
        materials.push(material('town-fixture', fixture.color, .7, { emission: fixture.color, emissionIntensity: 1 + p.mastery }));
    }
    // Disabling a fixture extinguishes its source surface too.
    if (!p.torch && p.lighting === 'scene') objects.splice(objects.findIndex(o => o.id === 'lantern-core'), 1);
    state.engine.apply({ version: 1, time: 0, lights, materials, objects, environment });
    state.engine.setDebugView('lit');
    state.engine.render();
    state.engine.inspectionObject = p.inspectObject;
    state.engine.setDebugView(zero ? 'lit' : p.view);
    if (state.engine.debugView !== 'lit') state.engine.render();
    canvas.dataset.diagnostics = JSON.stringify(state.engine.diagnostics());
    if (p.animate && !state.pending && !document.hidden) {
        state.pending = requestAnimationFrame(time => {
            state.pending = 0;
            if (!state.alive) return;
            const delta = Math.min(.1, Math.max(0, (time - (state.lastTime ?? time)) / 1000));
            state.lastTime = time;
            for (const [id, manifest] of Object.entries(state.manifests)) state.samples[id] = updateSpriteAnimation(
                state.animation[id], manifest.animationProfile, { deltaSeconds: delta,
                    distance: delta * manifest.animationProfile.locomotion.stride * .75, moving: true, direction: 'S' });
            configureProof(canvas, {});
        });
    }
    if (!p.animate) state.lastTime = null;
}
export function proofPixels(canvas) { const e = states.get(canvas).engine; e.render(); return [...e.pixels()]; }
export function proofOptions(canvas) { return structuredClone(states.get(canvas).options); }
export function proofDiagnostics(canvas) { return states.get(canvas).engine.diagnostics(); }
export function disposeProof(canvas) {
    const state = states.get(canvas); if (!state) return;
    state.alive = false; cancelAnimationFrame(state.pending); state.resize?.disconnect(); state.engine.dispose(); states.delete(canvas);
}

async function originalOak(engine) {
    const base = new URL('../../art/lighting-proof/', import.meta.url);
    const meta = await (await fetch(new URL('oak.json', base))).json();
    const bytes = await (await fetch(new URL('oak.bin', base))).arrayBuffer();
    const objects = [], materials = [];
    for (const group of meta.groups) {
        const geometry = new T.BufferGeometry();
        const data = new T.InterleavedBuffer(new Float32Array(bytes, group.byteOffset, group.vertexCount * 6), 6);
        geometry.setAttribute('position', new T.InterleavedBufferAttribute(data, 3, 0));
        geometry.setAttribute('normal', new T.InterleavedBufferAttribute(data, 3, 3));
        engine.registerGeometry(group.id, geometry);
        materials.push(material(group.id, group.color, .94));
        objects.push(object(group.id, group.id, group.id, [2.3, 3.4, 0], [.48, .48, .48]));
    }
    return { objects, materials };
}

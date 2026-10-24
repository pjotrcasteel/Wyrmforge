// Isolated material and animation review. Reuses PR #332's GPU engine unchanged.
// NOT a separate renderer, production Hunt integration or artist approval.
import * as T from './vendor/three.module.js';
import { LightingEngine } from './engine.js';
import { spritePlaneGeometry } from './lit-sprite.js';
import { litActorSample } from './actor-asset-contract.js';
import { planarCasterGeometry } from './actor-shadow-mask.js';
import { environmentProfile } from './registry.js';

const actors = [
    { id: 'hollowed', folder: 'hollow-rigged', position: [-1.25, 0, 0] },
    { id: 'ashling', folder: 'ashling-rigged', position: [1.25, 0, 0] },
];
const states = new WeakMap();
const material = (id, color, options = {}) => ({
    id, color, roughness: .9, metalness: 0, specular: .2, reflection: 'direct',
    emission: '#000000', emissionIntensity: 0, alphaCutoff: .5, doubleSided: true, ...options,
});
const object = (id, geometry, mat, position, extras = {}) => ({
    id, ownerId: id, geometry, material: mat, position, rotation: [0, 0, 0], scale: [1, 1, 1],
    castsShadow: true, receivesShadow: true, receivesLight: true, ...extras,
});
const light = (id, position, color, intensity, priority) => ({
    id, ownerId: id, type: 'point', enabled: true, position,
    direction: [0, 0, -1], color, intensity, range: 8,
    coneAngle: .6, penumbra: .3, castsShadow: true, priority,
});

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset fetch failed: ${url}`);
    return response.json();
}
export async function initializeActorReview(canvas) {
    if (states.has(canvas)) return;
    const engine = new LightingEngine(canvas, { shadowViews: 8, maxLights: 3 });
    engine.camera.zoom = 2.0; // tighter REVIEW framing; no change to global GPU renderer
    const state = { engine, canvas, ready: false, stamp: 0,
        config: { hollowed: 'walk', ashling: 'walk', frame: 0, direction: 'S', zero: false,
            lightX: -.5, shadows: true, animate: false }, actors: {}, lastTime: 0 };
    states.set(canvas, state);
    try {
        engine.registerGeometry('floor', new T.PlaneGeometry(16, 14));
        for (const actor of actors) {
            const base = new URL(`../../art/enemies/${actor.folder}/`, import.meta.url);
            const [sprite, lit] = await Promise.all([
                fetchJson(new URL('manifest.json', base)),
                fetchJson(new URL('lit-materials.json', base)),
            ]);
            for (const [clip, c] of Object.entries(sprite.clips)) {
                const sample = litActorSample(sprite, lit, { clip, frame: 0, direction: 'S' });
                const source = await new T.TextureLoader().loadAsync(new URL(sample.images.albedo, base).href);
                const normal = await new T.TextureLoader().loadAsync(new URL(sample.images.normal, base).href);
                engine.registerTexture(`${actor.id}-${clip}-albedo`, source);
                engine.registerTexture(`${actor.id}-${clip}-normal`, normal, false);
                engine.registerGeometry(`${actor.id}-${clip}`, spritePlaneGeometry(T, c));
            }
            const masks = {};
            for (const [clip, data] of Object.entries(lit.clips)) {
                const bitmap = new Image();
                bitmap.src = new URL(data.caster, base).href;
                await bitmap.decode();
                const plane = document.createElement('canvas');
                plane.width = bitmap.naturalWidth;
                plane.height = bitmap.naturalHeight;
                const context = plane.getContext('2d', { willReadFrequently: true });
                context.drawImage(bitmap, 0, 0);
                masks[clip] = context;
            }
            state.actors[actor.id] = { sprite, lit, masks };
        }
        state.ready = true;
        state.observer = new ResizeObserver(() => redrawActorReview(canvas));
        state.observer.observe(canvas);
        canvas.dataset.ready = 'true';
        redrawActorReview(canvas);
    } catch (error) {
        canvas.dataset.error = error.message;
        engine.dispose();
        state.ready = false;
        throw error;
    }
}
export function redrawActorReview(canvas, change = {}) {
    const state = states.get(canvas);
    if (!state?.ready) return;
    const c = Object.assign(state.config, change);
    const environment = environmentProfile(c.zero ? 'zero' : 'night');
    const materials = [material('floor', '#555454', { roughness: .97 })];
    const objects = [object('floor', 'floor', 'floor', [0, 0, -.035],
        { castsShadow: false })];
    for (const actor of actors) {
        const { sprite, lit, masks } = state.actors[actor.id];
        const clip = c[actor.id];
        const frame = Math.max(0, Math.min(sprite.clips[clip].frames - 1, Math.trunc(c.frame)));
        const sample = litActorSample(sprite, lit, { clip, frame, direction: c.direction });
        const id = `${actor.id}-${clip}`;
        materials.push(material(id, '#ffffff', { roughness: sample.material.roughness,
            metalness: sample.material.metalness, specular: sample.material.specular,
            albedo: `${id}-albedo`, normal: `${id}-normal` }));
        const row = sprite.directions.indexOf(c.direction);
        const casterId = `${actor.id}-${clip}-caster-${row}-${frame}`;
        if (!state.engine.geometries.has(casterId)) {
            const pixels = masks[clip].getImageData(frame * sample.cell, row * sample.cell,
                sample.cell, sample.cell).data;
            state.engine.registerGeometry(casterId, planarCasterGeometry(T, pixels, sample.cell,
                sample.anchor, sample.worldSize));
        }
        objects.push(object(actor.id, id, id, actor.position,
            { castsShadow: sample.castShadow && c.shadows, receivesShadow: sample.receiveShadow,
                occluderGeometry: casterId, frame: sample.frame }));
    }
    const lamps = [light('fireball', [c.lightX * 2.7, -1.7, 3.4], '#ff9c55', 64, 3),
        light('blue-rim', [3, -1, 3], '#8ca9ec', 9, 1)];
    for (const l of lamps) { l.enabled = !c.zero; l.castsShadow &&= c.shadows; }
    state.engine.apply({ version: 1, time: 0, lights: lamps, materials, objects, environment });
    state.engine.render();
    canvas.dataset.diagnostics = JSON.stringify({
        ...state.engine.diagnostics(),
        frame: c.frame, hollowed: c.hollowed, ashling: c.ashling,
        quality: 'rig-pose normals + alpha-plane shadow; full-volume caster not claimed',
    });
    if (c.animate && !state.raf && !document.hidden) {
        state.raf = requestAnimationFrame(timestamp => {
            state.raf = 0;
            if (!state.ready) return;
            if (state.lastTime && timestamp - state.lastTime >= 70) {
                state.config.frame = (state.config.frame + 1) % 28;
                state.lastTime = timestamp;
            }
            if (!state.lastTime) state.lastTime = timestamp;
            redrawActorReview(canvas);
        });
    }
}
export function actorReviewPixels(canvas) {
    const state = states.get(canvas);
    if (!state?.ready) throw new Error('Review not ready');
    state.engine.render();
    return [...state.engine.pixels()];
}
export function actorReviewDiagnostics(canvas) {
    return states.get(canvas)?.engine.diagnostics();
}
export function disposeActorReview(canvas) {
    const state = states.get(canvas);
    if (!state) return;
    state.ready = false;
    cancelAnimationFrame(state.raf);
    state.observer?.disconnect();
    state.engine.dispose();
    states.delete(canvas);
}

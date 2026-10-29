// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
const UNIT = 48;
const GROUND_Y = Math.SQRT2;
function projectLightDirection(direction) {
    const projected = [direction[0], -direction[1] * GROUND_Y, direction[2]];
    const length = Math.hypot(...projected);
    // Point emitters may have a zero direction; never introduce NaN there.
    return length === 0 ? projected : projected.map(value => value / length);
}
export function huntLightFrame(frame, camera, viewport = null) {
    if (!frame) throw new TypeError('Missing authoritative Hunt lighting');
    const visible = viewport ? lightsIntersectingView(frame.lights, {
        left: camera.x, top: camera.y,
        right: camera.x + viewport.width, bottom: camera.y + viewport.height,
    }) : frame.lights;
    return { ...frame, lights: visible.map(light => ({ ...light,
        position: [(light.position[0] - camera.x) / UNIT, -(light.position[1] - camera.y) * GROUND_Y / UNIT, light.position[2] / UNIT],
        direction: projectLightDirection(light.direction),
        range: light.range / UNIT, intensity: light.intensity,
    })) };
}
const material = id => ({ id, albedo: id, color: '#ffffff', roughness: .95, metalness: 0,
    specular: .15, reflection: 'direct', emission: '#000000', emissionIntensity: 0,
    alphaCutoff: .1, doubleSided: true });
/**
 * Generic Hunt-to-lighting adapter: asset sources describe geometry, material and shadow
 * participation. The shared LightingEngine remains ignorant of creature/terrain kinds.
 * A custom geometry is registered once via LightingEngine.registerGeometry().
 */
export function huntSurfaceRenderable(id, x, y, width, height, castsShadow, surface = {}) {
    const geometry = surface.geometry ?? (castsShadow ? 'hunt-billboard' : 'hunt-plane');
    const standing = surface.standing ?? geometry === 'hunt-billboard';
    return {
        id, ownerId: surface.ownerId ?? id, geometry, material: id,
        position: surface.position ?? [(x + width / 2) / UNIT, -(y + height * (standing ? .75 : .5)) * GROUND_Y / UNIT, standing ? .001 : 0],
        rotation: surface.rotation ?? [0, 0, 0],
        scale: surface.scale ?? [width / UNIT, height * (standing ? 1 : GROUND_Y) / UNIT, 1],
        castsShadow: surface.castsShadow ?? castsShadow,
        receivesShadow: surface.receivesShadow ?? true,
        receivesLight: surface.receivesLight ?? true,
        ...(surface.occluderGeometry ? { occluderGeometry: surface.occluderGeometry } : {}),
    };
}

/** Keeps asset-specific appearance data separate from lighting calculations. */
export function huntSurfaceMaterial(id, overrides = {}, hasAlbedoSource = true) {
    const descriptor = { ...material(id), ...overrides, id };
    if (!hasAlbedoSource && !overrides.albedo) delete descriptor.albedo;
    return descriptor;
}
export function huntActorGeometry() {
    const actor = new T.PlaneGeometry(1, 1);
    actor.translate(0, .25, 0);
    actor.rotateX(Math.PI / 4);
    return actor;
}
export class HuntGpuWorld {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.engine = new LightingEngine(this.canvas, { shadowViews: 6, maxLights: 8 });
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        this.engine.registerGeometry('hunt-billboard', huntActorGeometry());
        this.layers = new Map();
        this.used = new Set();
    }
    begin(ctx, camera, width, height) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.objects = []; this.materials = [];
        this.capture('hunt-ground', ctx.canvas, 0, 0, width, height, 0, false);
    }
    capture(id, source, x, y, width, height, elevation = 0, castsShadow = true, surface = {}) {
        // Existing Canvas layers remain a migration fallback. New renderables may instead
        // reference registered GPU texture IDs, authored geometry and surface channels.
        if (source) {
            this.used.add(id);
            let layer = this.layers.get(id);
            if (!layer) {
                const pixels = document.createElement('canvas');
                pixels.width = Math.max(1, Math.ceil(width)); pixels.height = Math.max(1, Math.ceil(height));
                const texture = new T.CanvasTexture(pixels);
                this.engine.registerTexture(id, texture);
                layer = { pixels, texture }; this.layers.set(id, layer);
            }
            if (layer.pixels.width !== Math.ceil(width)) layer.pixels.width = Math.ceil(width);
            if (layer.pixels.height !== Math.ceil(height)) layer.pixels.height = Math.ceil(height);
            const ctx = layer.pixels.getContext('2d');
            ctx.clearRect(0, 0, layer.pixels.width, layer.pixels.height);
            ctx.drawImage(source, 0, 0, layer.pixels.width, layer.pixels.height);
            layer.texture.needsUpdate = true;
        }
        this.materials.push(huntSurfaceMaterial(id, surface.material, Boolean(source)));
        this.objects.push(huntSurfaceRenderable(id, x, y, width, height, castsShadow, surface));
    }
    render(ctx, frame) {
        const engine = this.engine;
        engine.apply({ ...huntLightFrame(frame, this.camera, { width: this.width, height: this.height }), materials: this.materials, objects: this.objects });
        // CanvasTexture clones share pixels, but each GPU map needs an upload notification.
        for (const object of engine.objects.values()) if (object.mesh.material.map) object.mesh.material.map.needsUpdate = true;
        engine.halfWidth = this.width / UNIT / 2;
        engine.camera.up.set(0, 0, 1);
        const centerY = -this.height * GROUND_Y / UNIT / 2;
        engine.camera.position.set(this.width / UNIT / 2, centerY - 30, 30);
        engine.camera.lookAt(this.width / UNIT / 2, centerY, 0);
        engine.render(this.width, this.height);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
        for (const [id, layer] of this.layers) if (!this.used.has(id)) {
            engine.textures.delete(id); layer.texture.dispose(); this.layers.delete(id);
        }
    }
    dispose() { this.engine.dispose(); this.layers.clear(); }
}

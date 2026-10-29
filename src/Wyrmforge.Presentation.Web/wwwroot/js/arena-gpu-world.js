// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
import { lightingQualityBudget } from './lighting/quality.js';
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
        ...(surface.frame ? { frame: surface.frame } : {}),
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
    constructor({ quality = 'balanced' } = {}) {
        this.canvas = document.createElement('canvas');
        this.quality = quality;
        this.engine = new LightingEngine(this.canvas, lightingQualityBudget(quality));
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        this.engine.registerGeometry('hunt-billboard', huntActorGeometry());
        this.layers = new Map();
        this.used = new Set();
        this.dirtyTextures = new Set();
        this.lastFrameUploads = { dynamicTextures: 0, dynamicPixels: 0 };
    }
    /** Preloaded art textures and authored geometry are registered once, not captured each frame. */
    registerAssetTexture(id, texture, colorData = true) {
        if (!texture?.isTexture) throw new TypeError('Expected a preloaded GPU texture');
        this.engine.registerTexture(id, texture, colorData);
        texture.needsUpdate = true;
    }
    registerAssetGeometry(id, geometry) {
        if (!geometry?.isBufferGeometry) throw new TypeError('Expected authored buffer geometry');
        this.engine.registerGeometry(id, geometry);
    }
    /** Submit any already-described renderable: no creature, biome or Canvas special cases. */
    submitSurface(renderable, descriptor) {
        if (!this.objects || !this.materials) throw new Error('Begin a Hunt GPU frame before submitting surfaces');
        if (!renderable?.id || !descriptor?.id || renderable.material !== descriptor.id)
            throw new TypeError('Renderable must reference its registered material descriptor');
        const existing = this.materials.find(value => value.id === descriptor.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(descriptor))
            throw new TypeError('Conflicting material descriptors for shared resource ID');
        if (!existing) this.materials.push(descriptor);
        this.objects.push(renderable);
    }
    diagnostics() {
        return { ...this.engine.diagnostics(), quality: this.quality, textureUploads: this.lastFrameUploads,
            authoredTextures: this.engine.textures.size - this.layers.size, canvasCaptures: this.layers.size,
            // CPU submission only. True GPU time, thermals and battery need physical devices.
            submissionCpu: this.submissionCpu ?? { frames: 0, lastMs: 0, meanMs: 0, peakMs: 0 } };
    }
    begin(ctx, camera, width, height) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.dirtyTextures.clear(); this.objects = []; this.materials = [];
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
            this.dirtyTextures.add(id);
        }
        this.submitSurface(huntSurfaceRenderable(id, x, y, width, height, castsShadow, surface),
            huntSurfaceMaterial(id, surface.material, Boolean(source)));
    }
    render(ctx, frame) {
        const began = performance.now();
        const engine = this.engine;
        // In renderer coordinates (Z up): derive relevance from the actual camera
        // window, not source IDs or assumptions about creatures/spell schools.
        engine.lightViewBounds = { minX: 0, maxX: this.width / UNIT,
            minY: -this.height * GROUND_Y / UNIT, maxY: 0 };
        engine.apply({ ...huntLightFrame(frame, this.camera, { width: this.width, height: this.height }), materials: this.materials, objects: this.objects });
        // Only repainted Canvas sources need a new upload. Static authored textures and
        // atlas frames retain their GPU allocations across Hunt frames.
        const byMaterial = new Map(this.materials.map(value => [value.id, value]));
        let updatedPixels = 0;
        for (const entry of this.objects) {
            const material = byMaterial.get(entry.material);
            const mesh = engine.objects.get(entry.id)?.mesh;
            if (!mesh || !material) continue;
            for (const [key, mapKey] of [['albedo', 'map'], ['normal', 'normalMap'],
                ['roughnessMap', 'roughnessMap'], ['aoMap', 'aoMap'], ['emissiveMap', 'emissiveMap']]) {
                if (this.dirtyTextures.has(material[key]) && mesh.material[mapKey])
                    mesh.material[mapKey].needsUpdate = true;
            }
        }
        for (const id of this.dirtyTextures) {
            const pixels = this.layers.get(id)?.pixels;
            if (pixels) updatedPixels += pixels.width * pixels.height;
        }
        this.lastFrameUploads = { dynamicTextures: this.dirtyTextures.size, dynamicPixels: updatedPixels };
        this.dirtyTextures.clear();
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
        const elapsed = Math.max(0, performance.now() - began);
        const previous = this.submissionCpu;
        this.submissionCpu = { frames: (previous?.frames ?? 0) + 1, lastMs: elapsed,
            meanMs: previous?.frames ? previous.meanMs * .9 + elapsed * .1 : elapsed,
            peakMs: Math.max(previous?.peakMs ?? 0, elapsed) };
    }
    dispose() { this.engine.dispose(); this.layers.clear(); }
}

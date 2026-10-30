// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
import { lightingQualityBudget } from './lighting/quality.js';
const UNIT = 48;
const GROUND_Y = Math.SQRT2;

/** The live Hunt consumes its WebGL frame immediately in a 2D canvas.
 * Keep diagnostic/lab retention unchanged, but avoid preserving the mobile GPU
 * drawing buffer after composition. This is a renderer setting, not a new path.
 */
/**
 * iOS WebKit can discard an unpreserved offscreen WebGL drawing buffer before
 * drawImage copies it into the visible Canvas. Retain that frame only for iOS
 * WebKit; other browsers keep the existing G4 memory optimization.
 */
export function needsRetainedHuntBuffer(userAgent = '', maxTouchPoints = 0) {
    return /iPhone|iPad|iPod/i.test(userAgent) ||
        /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}
export function huntGpuRendererBudget(quality = 'balanced', preserveDrawingBuffer = false) {
    if (typeof preserveDrawingBuffer !== 'boolean') throw new TypeError('Invalid Hunt buffer policy');
    return { ...lightingQualityBudget(quality), preserveDrawingBuffer };
}

/** Composite exactly once with native nearest-neighbor pixel sampling. */
export function compositeHuntGpuFrame(ctx, source) {
    ctx.save();
    try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } finally {
        ctx.restore();
    }
}
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
        // Captured actor pixels above their 75%-height feet pivot form the
        // vertical cutout. Lower source pixels represent subfloor spill and
        // must not intersect the ground receiver or bury boss silhouettes.
        scale: surface.scale ?? [width / UNIT, height * (standing ? .75 : GROUND_Y) / UNIT, 1],
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
    // Source captures put the authoritative C# feet pivot at 75% of their
    // height. The previous centered plane crossed Z=0 and buried its bottom
    // quarter in the lit terrain's depth buffer (especially visible on the
    // mage, Warden and Wyrm). Keep the upper 75% of the captured texture and
    // raise it *from* the ground rather than through it. Generic actor
    // geometry; no creature-specific renderer or animation changes.
    const actor = new T.PlaneGeometry(1, 1);
    const uv = actor.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setY(i, .25 + uv.getY(i) * .75);
    actor.translate(0, .5, 0);
    actor.rotateX(Math.PI / 4);
    return actor;
}
export class HuntGpuWorld {
    constructor({ quality = 'balanced' } = {}) {
        this.canvas = document.createElement('canvas');
        this.quality = quality;
        const device = typeof navigator === 'undefined' ? null : navigator;
        this.engine = new LightingEngine(this.canvas, huntGpuRendererBudget(quality,
            needsRetainedHuntBuffer(device?.userAgent, device?.maxTouchPoints)));
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        this.engine.registerGeometry('hunt-billboard', huntActorGeometry());
        this.layers = new Map();
        this.used = new Set();
        this.dirtyTextures = new Set();
        this.lastFrameUploads = { dynamicTextures: 0, dynamicPixels: 0 };
        this.lastFrameTopUploads = [];
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
            largestDynamicUploads: this.lastFrameTopUploads,
            authoredTextures: this.engine.textures.size - this.layers.size, canvasCaptures: this.layers.size,
            // CPU submission only. True GPU time, thermals and battery need physical devices.
            submissionCpu: this.submissionCpu ?? { frames: 0, lastMs: 0, meanMs: 0, peakMs: 0 } };
    }
    begin(ctx, camera, width, height) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.dirtyTextures.clear(); this.objects = []; this.materials = [];
        this.capture('hunt-ground', ctx.canvas, 0, 0, width, height, 0, false);
    }
    /** Callers may skip repaint only when their explicit visual revision is unchanged. */
    canReuseCapture(id, revision, width, height) {
        const layer = this.layers.get(id);
        return revision !== undefined && layer?.revision === revision &&
            layer.pixels.width === Math.max(1, Math.ceil(width)) &&
            layer.pixels.height === Math.max(1, Math.ceil(height));
    }
    capture(id, source, x, y, width, height, elevation = 0, castsShadow = true, surface = {}) {
        // Existing Canvas layers remain a migration fallback. New renderables may instead
        // reference registered GPU texture IDs, authored geometry and surface channels.
        if (source) {
            const revision = surface.revision;
            if (revision !== undefined && (typeof revision !== 'string' &&
                !(typeof revision === 'number' && Number.isFinite(revision))))
                throw new TypeError('Capture revision must be a stable string or finite number');
            this.used.add(id);
            let layer = this.layers.get(id);
            const unchanged = this.canReuseCapture(id, revision, width, height);
            if (!layer) {
                const pixels = document.createElement('canvas');
                pixels.width = Math.max(1, Math.ceil(width)); pixels.height = Math.max(1, Math.ceil(height));
                const texture = new T.CanvasTexture(pixels);
                this.engine.registerTexture(id, texture);
                layer = { pixels, texture }; this.layers.set(id, layer);
            }
            if (!unchanged) {
                if (layer.pixels.width !== Math.ceil(width)) layer.pixels.width = Math.ceil(width);
                if (layer.pixels.height !== Math.ceil(height)) layer.pixels.height = Math.ceil(height);
                const ctx = layer.pixels.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, layer.pixels.width, layer.pixels.height);
                ctx.drawImage(source, 0, 0, layer.pixels.width, layer.pixels.height);
                layer.texture.needsUpdate = true;
                this.dirtyTextures.add(id);
                layer.revision = revision;
            }
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
        const uploaded = [];
        for (const id of this.dirtyTextures) {
            const pixels = this.layers.get(id)?.pixels;
            if (!pixels) continue;
            const count = pixels.width * pixels.height;
            updatedPixels += count;
            uploaded.push({ id, width: pixels.width, height: pixels.height, pixels: count });
        }
        // Report resource cost by generic ID: the engine neither knows nor cares
        // whether a surface came from a tree, actor, ground layer or VFX atlas.
        this.lastFrameTopUploads = uploaded.sort((a, b) => b.pixels - a.pixels ||
            a.id.localeCompare(b.id)).slice(0, 5);
        this.lastFrameUploads = { dynamicTextures: this.dirtyTextures.size, dynamicPixels: updatedPixels };
        this.dirtyTextures.clear();
        engine.halfWidth = this.width / UNIT / 2;
        engine.camera.up.set(0, 0, 1);
        const centerY = -this.height * GROUND_Y / UNIT / 2;
        engine.camera.position.set(this.width / UNIT / 2, centerY - 30, 30);
        engine.camera.lookAt(this.width / UNIT / 2, centerY, 0);
        engine.render(this.width, this.height);
        compositeHuntGpuFrame(ctx, this.canvas);
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

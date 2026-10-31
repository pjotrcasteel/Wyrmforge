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
/** Shadow-only alpha cutout for the captured pose.
 * The Canvas texture includes large transparent margins around each creature.
 * Keep its source-pixel scale: compressing the full tile to the actor's assumed
 * height makes the *opaque* pixels almost flat and erases ground shadows.
 */
export function huntCaptureSilhouetteCaster(x, y, width, height, footFraction = .75) {
    const heightWorld = height / UNIT;
    return { occluderGeometry: 'hunt-shadow-silhouette',
        occluderPosition: [(x + width / 2) / UNIT,
            -(y + height * footFraction) * GROUND_Y / UNIT,
            -(1 - footFraction) * heightWorld * Math.SQRT1_2],
        occluderRotation: [0, 0, 0],
        // Preserve capture width so the alpha mask, not its padded rectangle,
        // defines the actual silhouette footprint (also for long masonry layers).
        occluderScale: [width / UNIT, heightWorld, 1],
    };
}
export function huntSurfaceRenderable(id, x, y, width, height, castsShadow, surface = {}) {
    const geometry = surface.geometry ?? (castsShadow ? 'hunt-billboard' : 'hunt-plane');
    const standing = surface.standing ?? geometry === 'hunt-billboard';
    const footFraction = standing ? surface.footFraction ?? .75 : 1;
    if (!Number.isFinite(footFraction) || footFraction <= 0 || footFraction > 1)
        throw new RangeError('Invalid authored sprite foot fraction');
    // A captured actor is already painted into an exact x/y/width/height
    // screen rectangle by the existing Canvas renderer. The old "footFraction"
    // moved the whole upright plane up by (1 - footFraction) * height despite
    // retaining its entire texture: pixels no longer matched their 2D positions
    // and actors appeared disconnected/squashed against the terrain and sigil.
    // Billboard geometry starts at its bottom edge and rises one full unit;
    // position that edge at the source capture's BOTTOM, not its internal foot
    // marker. Foot metadata is retained for future separate shadow/occlusion
    // authoring, but cannot distort or shift the visible sprite.
    const frame = surface.frame;
    return {
        id, ownerId: surface.ownerId ?? id, geometry, material: id,
        position: surface.position ?? [(x + width / 2) / UNIT,
            -(y + height * (standing ? 1 : .5)) * GROUND_Y / UNIT, standing ? .001 : 0],
        rotation: surface.rotation ?? [0, 0, 0],
        scale: surface.scale ?? [width / UNIT, height * (standing ? 1 : GROUND_Y) / UNIT, 1],
        castsShadow: surface.castsShadow ?? castsShadow,
        receivesShadow: surface.receivesShadow ?? true,
        receivesLight: surface.receivesLight ?? true,
        ...(surface.occluderGeometry ? { occluderGeometry: surface.occluderGeometry } : {}),
        ...(surface.occluderPosition ? { occluderPosition: surface.occluderPosition } : {}),
        ...(surface.occluderRotation ? { occluderRotation: surface.occluderRotation } : {}),
        ...(surface.occluderScale ? { occluderScale: surface.occluderScale } : {}),
        ...(frame ? { frame } : {}),
    };
}
/** Keeps asset-specific appearance data separate from lighting calculations. */
export function huntSurfaceMaterial(id, overrides = {}, hasAlbedoSource = true) {
    const descriptor = { ...material(id), ...overrides, id };
    if (!hasAlbedoSource && !overrides.albedo) delete descriptor.albedo;
    return descriptor;
}
export function huntActorGeometry() {
    // The visual capture is already projected 2D artwork. Translate its bottom
    // edge to the origin, then face the actual GPU camera each frame. A fixed
    // 45-degree pitch silently shortened the screen-space image by ~35% on
    // iPhone, irrespective of the capture's unchanged width and height.
    const actor = new T.PlaneGeometry(1, 1);
    actor.translate(0, .5, 0);
    return actor;
}

/**
 * Generic G4 cutouts use the same camera-facing rotation as the renderer's
 * view plane. Do not change the shared lighting engine's object semantics or
 * rotate any authored world plane, scenery, collider or physical emitter.
 */
/** The captured image is mostly transparent padding. Bound the full plane
 * against a light's height without crushing the actual alpha silhouette.
 * 1.4x source altitude allows a normal 160px actor capture to retain its
 * painted height while keeping low-lying effects from making infinite wedges.
 */
export function boundedHuntShadowHeight(spriteHeightWorld, lightHeightWorld) {
    if (!(lightHeightWorld > 0)) return spriteHeightWorld;
    return Math.min(spriteHeightWorld, lightHeightWorld * 1.4);
}
export function alignHuntActorBillboards(objects, engine) {
    const shadowHeight = Math.min(...(engine.selected ?? [])
        .filter(light => light.shadow && light.type === 'point' && light.position[2] > 0)
        .map(light => light.position[2]));
    for (const descriptor of objects) {
        if (descriptor.geometry !== 'hunt-billboard') continue;
        const registered = engine.objects.get(descriptor.id);
        if (!registered) continue;
        registered.mesh.quaternion.copy(engine.camera.quaternion);
        // Match the G1 pose-aware sprite shadow: its alpha-cutout caster faces the
        // camera too. Explicit WF/AR solid occluders keep their authored rotation.
        if (descriptor.occluderGeometry === 'hunt-shadow-silhouette' && registered.caster) {
            const caster = registered.caster;
            caster.quaternion.copy(engine.camera.quaternion);
            if (Number.isFinite(shadowHeight)) {
                const baseHeight = descriptor.occluderScale[1];
                const height = boundedHuntShadowHeight(baseHeight, shadowHeight);
                caster.scale.y = height;
                // Preserve the authored foot even after light-height clamping.
                caster.position.z = descriptor.occluderPosition[2] * height / baseHeight;
            }
        }
    }
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
        // G1-style alpha-cutout sprite silhouettes retain source-pixel scale
        // until WF/AR supply authored 2.5D geometry.
        this.engine.registerGeometry('hunt-shadow-silhouette', huntActorGeometry());
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
        // Reuse the captured alpha pose instead of manufacturing a hard-edged
        // solid wedge. Explicit authored occluders always take precedence.
        const capturedSurface = castsShadow && !surface.geometry && !surface.occluderGeometry
            ? { ...surface, ...huntCaptureSilhouetteCaster(x, y, width, height, surface.footFraction ?? .75) }
            : surface;
        this.submitSurface(huntSurfaceRenderable(id, x, y, width, height, castsShadow, capturedSurface),
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
        alignHuntActorBillboards(this.objects, engine);
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
    /**
     * Diagnostic only: compare the same authoritative frame with one real GPU
     * light's shadow enabled/disabled. No synthetic caster, source, or gameplay
     * state is introduced. Restore the renderer before normal presentation.
     */
    shadowPixelProof(sourceId) {
        const engine = this.engine;
        const light = engine.lights.get(sourceId);
        if (!light?.castShadow) return { sourceId, available: false, changedPixels: 0, maxPixelDelta: 0 };
        let shadowed, unshadowed;
        // Prove shadows specifically on the ground receiver. Visible actors can
        // otherwise change their own pixels in the shadow toggle and yield a
        // false positive while the floor has no shadows (as on the iPhone).
        const hiddenMeshes = [];
        for (const [id, object] of engine.objects) {
            if (id === 'hunt-ground') continue;
            hiddenMeshes.push([object.mesh, object.mesh.visible]);
            object.mesh.visible = false;
        }
        try {
            engine.render(this.width, this.height);
            shadowed = engine.pixels();
            light.castShadow = false;
            engine.render(this.width, this.height);
            unshadowed = engine.pixels();
        } finally {
            light.castShadow = true;
            for (const [mesh, visible] of hiddenMeshes) mesh.visible = visible;
            engine.render(this.width, this.height);
        }
        let changedPixels = 0, maxPixelDelta = 0;
        for (let i = 0; i < shadowed.length; i += 4) {
            const delta = Math.abs(shadowed[i] - unshadowed[i]) +
                Math.abs(shadowed[i + 1] - unshadowed[i + 1]) +
                Math.abs(shadowed[i + 2] - unshadowed[i + 2]);
            if (delta >= 24) changedPixels++;
            maxPixelDelta = Math.max(maxPixelDelta, delta);
        }
        return { sourceId, available: true, changedPixels, maxPixelDelta,
            groundOnly: true, framebuffer: [engine.canvas.width, engine.canvas.height] };
    }
    dispose() { this.engine.dispose(); this.layers.clear(); }
}

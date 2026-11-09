// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
import { lightingQualityBudget } from './lighting/quality.js';
const UNIT = 48;
const GROUND_Y = Math.SQRT2;
export const GROUND_EMISSIVE_ID = 'hunt-ground-emissive';
export const GROUND_NORMAL_ID = 'hunt-ground-normal';
const GROUND_NORMAL_SCALE = 1.1;
const GROUND_EMISSION_INTENSITY = 1;

/**
 * Legacy stretches world ground and light data by sqrt2 so a 45 degree orthographic camera lands one ground pixel on one
 * screen pixel. Metric keeps the world 1:1:1 and squeezes the camera's vertical frustum by 1/sqrt2 instead: projecting
 * along (0,1,-1) onto the ground plane is the same orthographic view with an anisotropic screen scale, so screenY = y - z
 * holds while normals, light vectors and shadow maps stay in real units. Opt-in via the `shear=1` debug flag.
 */
export const HUNT_PROJECTIONS = Object.freeze({
    legacy: Object.freeze({ name: 'legacy', groundY: GROUND_Y, verticalScale: 1, uprightBillboards: false }),
    metric: Object.freeze({ name: 'metric', groundY: 1, verticalScale: Math.SQRT1_2, uprightBillboards: true }),
});
// The billboard plane lies in XY with its art growing along +Y; a quarter turn about X stands it upright facing the viewer (-Y).
const UPRIGHT_BILLBOARD = new T.Euler(Math.PI / 2, 0, 0);

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
function projectLightDirection(direction, groundY = GROUND_Y) {
    const projected = [direction[0], -direction[1] * groundY, direction[2]];
    const length = Math.hypot(...projected);
    // Point emitters may have a zero direction; never introduce NaN there.
    return length === 0 ? projected : projected.map(value => value / length);
}
export function huntLightFrame(frame, camera, viewport = null, profile = HUNT_PROJECTIONS.legacy) {
    if (!frame) throw new TypeError('Missing authoritative Hunt lighting');
    const visible = viewport ? lightsIntersectingView(frame.lights, {
        left: camera.x, top: camera.y,
        right: camera.x + viewport.width, bottom: camera.y + viewport.height,
    }) : frame.lights;
    return { ...frame, lights: visible.map(light => ({ ...light,
        position: [(light.position[0] - camera.x) / UNIT, -(light.position[1] - camera.y) * profile.groundY / UNIT, light.position[2] / UNIT],
        direction: projectLightDirection(light.direction, profile.groundY),
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
/** The legacy Hunt capture is billboard art, but its *occluder* is world geometry.
 * A camera-facing occluder has depth along the ground, which gives point lights
 * view-dependent and even reversed projections. Stand the alpha cutout upright
 * over its authored foot marker, independently of the moving light source.
 *
 * The Hunt camera is pitched 45 degrees: a physical vertical edge projects at
 * sin(45 degrees). The reciprocal is the existing GROUND_Y screen/world scale.
 * Transparent padding stays transparent; it cannot become a rectangle shadow.
 */
export function huntCaptureSilhouetteCaster(x, y, width, height, footFraction = .75, occluderHeightPx = undefined, profile = HUNT_PROJECTIONS.legacy) {
    occluderHeightPx ??= height * profile.groundY;
    if (!(width > 0 && height > 0) || !Number.isFinite(footFraction) || footFraction <= 0 || footFraction > 1 ||
        !Number.isFinite(occluderHeightPx) || occluderHeightPx <= 0)
        throw new RangeError('Invalid silhouette dimensions, physical height or foot anchor');
    const verticalHeight = occluderHeightPx / UNIT;
    return { occluderGeometry: 'hunt-shadow-silhouette',
        occluderPosition: [(x + width / 2) / UNIT,
            -(y + height * footFraction) * profile.groundY / UNIT,
            -(1 - footFraction) * verticalHeight],
        occluderRotation: [Math.PI / 2, 0, 0],
        occluderScale: [width / UNIT, verticalHeight, 1],
    };
}
/** A source-authored solid volume uses its real ground footprint and height.
 * Its opaque geometry is independent of any padded 2D presentation capture.
 */
export function huntSolidVolumeCaster({ x, y, width, depth, height }, profile = HUNT_PROJECTIONS.legacy) {
    if (![x, y, width, depth, height].every(Number.isFinite) || width <= 0 || depth <= 0 || height <= 0)
        throw new RangeError('Invalid physical caster volume');
    return { occluderGeometry: 'hunt-solid-volume', occluderAlphaSource: false,
        occluderPosition: [(x + width / 2) / UNIT, -(y + depth / 2) * profile.groundY / UNIT, height / (2 * UNIT)],
        occluderRotation: [0, 0, 0],
        occluderScale: [width / UNIT, depth * profile.groundY / UNIT, height / UNIT] };
}

export function huntSurfaceRenderable(id, x, y, width, height, castsShadow, surface = {}, profile = HUNT_PROJECTIONS.legacy) {
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
            -(y + height * (standing ? 1 : .5)) * profile.groundY / UNIT, standing ? .001 : 0],
        rotation: surface.rotation ?? [0, 0, 0],
        scale: surface.scale ?? [width / UNIT, height * (standing ? 1 : profile.groundY) / UNIT, 1],
        castsShadow: surface.castsShadow ?? castsShadow,
        receivesShadow: surface.receivesShadow ?? true,
        receivesLight: surface.receivesLight ?? true,
        ...(surface.occluderGeometry ? { occluderGeometry: surface.occluderGeometry } : {}),
        ...(surface.occluderPosition ? { occluderPosition: surface.occluderPosition } : {}),
        ...(surface.occluderRotation ? { occluderRotation: surface.occluderRotation } : {}),
        ...(surface.occluderScale ? { occluderScale: surface.occluderScale } : {}),
        ...(surface.occluderAlphaSource === false ? { occluderAlphaSource: false } : {}),
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

/** Two perpendicular alpha-cutout planes form a camera-independent 2.5D
 * shadow impostor. A single flat plane is edge-on to lights approaching from
 * its sides, and cannot cast 360-degree shadows regardless of light height.
 * Both faces reuse the same animated texture and are one shared GPU mesh.
 * Authored 3D/heightfield occluders bypass this fallback entirely.
 */
export function huntCrossedShadowGeometry() {
    const front = huntActorGeometry();
    const side = front.clone();
    side.rotateY(Math.PI / 2);
    const positions = [], normals = [], uvs = [], indices = [];
    for (const source of [front, side]) {
        const base = positions.length / 3;
        const position = source.getAttribute('position');
        const normal = source.getAttribute('normal');
        const uv = source.getAttribute('uv');
        for (let i = 0; i < position.count; i++) {
            positions.push(position.getX(i), position.getY(i), position.getZ(i));
            normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
            uvs.push(uv.getX(i), uv.getY(i));
        }
        for (let i = 0; i < source.index.count; i++) indices.push(base + source.index.getX(i));
    }
    front.dispose(); side.dispose();
    const merged = new T.BufferGeometry();
    merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);
    return merged;
}

/** Visible capture quads follow the camera; their separate GPU shadow
 * occluders retain the authored world rotation and exact foot anchor.
 * Neither pose height nor shadow geometry depends on active light selection.
 */
export function alignHuntActorBillboards(objects, engine, upright = false) {
    for (const descriptor of objects) {
        if (descriptor.geometry !== 'hunt-billboard') continue;
        const mesh = engine.objects.get(descriptor.id)?.mesh;
        if (!mesh) continue;
        // Metric projection: a vertical quad already lands one world unit on one screen pixel.
        if (upright) mesh.quaternion.setFromEuler(UPRIGHT_BILLBOARD);
        else mesh.quaternion.copy(engine.camera.quaternion);
    }
}
/** Reveal which authoritative emitters actually received scarce point-shadow views.
 * A visible glow never proves the same source got a GPU shadow map.
 * This report observes the shared renderer; it does not alter light priority.
 */
export function huntShadowAllocationReport(lights = [], selected = [], capacity = 0) {
    const requested = lights.filter(light => light.enabled && light.castsShadow &&
        light.intensity > 0);
    const byId = new Map(selected.map(light => [light.id, light]));
    const shadowed = requested.filter(light => byId.get(light.id)?.shadow);
    return {
        requestedIds: requested.map(light => light.id),
        shadowedIds: shadowed.map(light => light.id),
        notSelectedIds: requested.filter(light => !byId.has(light.id)).map(light => light.id),
        selectedWithoutShadowIds: requested.filter(light => byId.has(light.id) &&
            !byId.get(light.id).shadow).map(light => light.id),
        allocatedViews: shadowed.reduce((total, light) =>
            total + (byId.get(light.id).shadowViews ?? 0), 0),
        capacity,
    };
}

export class HuntGpuWorld {
    constructor({ quality = 'balanced', projection = 'legacy' } = {}) {
        this.projection = HUNT_PROJECTIONS[projection];
        if (!this.projection) throw new RangeError(`Unknown Hunt projection: ${projection}`);
        this.canvas = document.createElement('canvas');
        this.quality = quality;
        const device = typeof navigator === 'undefined' ? null : navigator;
        this.engine = new LightingEngine(this.canvas, huntGpuRendererBudget(quality,
            needsRetainedHuntBuffer(device?.userAgent, device?.maxTouchPoints)));
        this.engine.verticalScale = this.projection.verticalScale;
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        this.engine.registerGeometry('hunt-billboard', huntActorGeometry());
        // G1-style alpha-cutout sprite silhouettes retain source-pixel scale
        // until WF/AR supply authored 2.5D geometry.
        this.engine.registerGeometry('hunt-shadow-silhouette', huntCrossedShadowGeometry());
        this.engine.registerGeometry('hunt-solid-volume', new T.BoxGeometry(1, 1, 1));
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
        return { ...this.engine.diagnostics(), quality: this.quality, projection: this.projection.name,
            shadowAllocation: huntShadowAllocationReport(this.engine.snapshot?.lights ?? [],
                this.engine.selected ?? [], this.engine.shadowViews),
            textureUploads: this.lastFrameUploads,
            largestDynamicUploads: this.lastFrameTopUploads,
            authoredTextures: this.engine.textures.size - this.layers.size, canvasCaptures: this.layers.size,
            // CPU submission only. True GPU time, thermals and battery need physical devices.
            submissionCpu: this.submissionCpu ?? { frames: 0, lastMs: 0, meanMs: 0, peakMs: 0 } };
    }
    /** Diagnostic: where every submitted mesh sits in renderer units (x right, y ground depth, z up). */
    sceneReport(limit = 60) {
        const round = value => Math.round(value * 100) / 100;
        return [...this.engine.objects].slice(0, limit).map(([id, entry]) => {
            const mesh = entry.mesh;
            return { id, p: [mesh.position.x, mesh.position.y, mesh.position.z].map(round),
                s: [mesh.scale.x, mesh.scale.y, mesh.scale.z].map(round), visible: mesh.visible !== false };
        });
    }
    begin(ctx, camera, width, height, groundEmissive = null, groundNormal = null, ground = null, groundEmissiveRevision = undefined) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.dirtyTextures.clear(); this.objects = []; this.materials = [];
        // `ground` ({ source, scale }) supplies the ground albedo painted at `scale` pixels per world unit (the 64 px/m terrain); the emissive and
        // normal maps then share that density and the drawing buffer follows it. Without it the ground is the visible canvas at 1x as before.
        const scale = ground?.scale ?? 1;
        const groundView = ground?.view;
        const groundWidth = groundView?.width ?? width, groundHeight = groundView?.height ?? height;
        const groundX = groundView ? groundView.x - camera.x : 0;
        const groundY = groundView ? groundView.y - camera.y : 0;
        this.engine.renderScale = scale;
        // The emissive map is a second viewport-sized layer over the same ground plane: black where nothing glows, so crack veins,
        // hot craters and the bedrock hint are lit surfaces that stay bright in the dark and sit beneath every actor.
        if (groundEmissive) {
            // Emissive is animated and must refresh every frame. On mobile, upload its smooth glow at half
            // terrain pixel density: this quarters its texture bandwidth without changing the world-space
            // ground plane, terrain albedo, normal detail, crack geometry, or encounter simulation.
            const emissiveScale = this.quality === 'mobile' ? Math.max(1, scale / 2) : scale;
            // Animated glow needs no more than 30 uploads/sec on mobile; other frames reuse
            // the previous GPU texture while actor motion, terrain and lighting continue normally.
            // The emissive source is repainted relative to the current terrain capture window.
            // A time-only revision reuses pixels from the PREVIOUS window while the ground
            // mesh already follows the new window, making lava/crater glow jump across the screen.
            // Preserve 30 Hz throttling only while the capture origin remains unchanged.
            const emissiveRevision = groundEmissiveRevision ?? (this.quality === 'mobile'
                ? `${Math.floor(performance.now() / (1000 / 30))}:${groundView?.x ?? camera.x}:${groundView?.y ?? camera.y}`
                : undefined);
            this.uploadLayer(GROUND_EMISSIVE_ID, groundEmissive, groundWidth, groundHeight,
                emissiveRevision, true, emissiveScale);
        }
        // Normals are data, not colour: no sRGB decode. Convention OpenGL / three.js tangent space (G toward the top of the image).
        // Static terrain normals share the same immutable camera-window revision as its albedo. Moving lights do not change either.
        if (groundNormal) this.uploadLayer(GROUND_NORMAL_ID, groundNormal, groundWidth, groundHeight, ground?.revision, false, scale);
        const material = {
            ...(groundEmissive ? { emissiveMap: GROUND_EMISSIVE_ID, emission: '#ffffff', emissionIntensity: GROUND_EMISSION_INTENSITY } : {}),
            ...(groundNormal ? { normal: GROUND_NORMAL_ID, normalScale: GROUND_NORMAL_SCALE } : {}),
        };
        this.capture('hunt-ground', ground?.source ?? ctx.canvas, groundX, groundY, groundWidth, groundHeight, 0, false,
            { ...(Object.keys(material).length ? { material } : {}), ...(scale !== 1 ? { pixelScale: scale } : {}),
                ...(ground?.revision !== undefined ? { revision: ground.revision } : {}) });
    }
    /** Callers may skip repaint only when their explicit visual revision is unchanged. */
    canReuseCapture(id, revision, width, height, pixelScale = 1) {
        const layer = this.layers.get(id);
        return revision !== undefined && layer?.revision === revision &&
            layer.pixels.width === Math.max(1, Math.ceil(width * pixelScale)) &&
            layer.pixels.height === Math.max(1, Math.ceil(height * pixelScale));
    }
    /** Registers (once) and refreshes a Canvas-backed GPU texture; returns whether pixels were re-uploaded. */
    uploadLayer(id, source, width, height, revision, colorData = true, pixelScale = 1) {
        if (revision !== undefined && (typeof revision !== 'string' &&
            !(typeof revision === 'number' && Number.isFinite(revision))))
            throw new TypeError('Capture revision must be a stable string or finite number');
        this.used.add(id);
        let layer = this.layers.get(id);
        const unchanged = this.canReuseCapture(id, revision, width, height, pixelScale);
        const pixelWidth = Math.max(1, Math.ceil(width * pixelScale)), pixelHeight = Math.max(1, Math.ceil(height * pixelScale));
        if (!layer) {
            const pixels = document.createElement('canvas');
            pixels.width = pixelWidth; pixels.height = pixelHeight;
            const texture = new T.CanvasTexture(pixels);
            this.engine.registerTexture(id, texture, colorData);
            layer = { pixels, texture }; this.layers.set(id, layer);
        }
        if (unchanged) return false;
        if (layer.pixels.width !== pixelWidth) layer.pixels.width = pixelWidth;
        if (layer.pixels.height !== pixelHeight) layer.pixels.height = pixelHeight;
        const ctx = layer.pixels.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, layer.pixels.width, layer.pixels.height);
        ctx.drawImage(source, 0, 0, layer.pixels.width, layer.pixels.height);
        layer.texture.needsUpdate = true;
        this.dirtyTextures.add(id);
        layer.revision = revision;
        return true;
    }
    capture(id, source, x, y, width, height, elevation = 0, castsShadow = true, requested = {}) {
        // `pixelScale` is upload density only; it never reaches the renderable, the shadow caster or the material.
        const { pixelScale = 1, ...surface } = requested;
        // Existing Canvas layers remain a migration fallback. New renderables may instead
        // reference registered GPU texture IDs, authored geometry and surface channels.
        if (source) this.uploadLayer(id, source, width, height, surface.revision, true, pixelScale);
        // An explicit 2.5D/3D occluder always wins. Legacy Canvas captures
        // contribute their own alpha silhouette through the shared shadow maps.
        // Capture quads and C# lights are projected into the camera viewport.
        // Physical wall volumes originate in world space, so they must follow
        // the same camera transform. Never mutate the source-authored geometry.
        const authoredSurface = surface.physicalVolume
            ? { ...surface, ...huntSolidVolumeCaster({
                ...surface.physicalVolume,
                x: surface.physicalVolume.x - this.camera.x,
                y: surface.physicalVolume.y - this.camera.y,
            }, this.projection ?? HUNT_PROJECTIONS.legacy) } : surface;
        const capturedSurface = castsShadow && !authoredSurface.geometry && !authoredSurface.occluderGeometry
            ? { ...authoredSurface, ...huntCaptureSilhouetteCaster(x, y, width, height, authoredSurface.footFraction ?? .75,
                authoredSurface.occluderHeightPx ?? height * (this.projection ?? HUNT_PROJECTIONS.legacy).groundY, this.projection ?? HUNT_PROJECTIONS.legacy) }
            : authoredSurface;
        this.submitSurface(huntSurfaceRenderable(id, x, y, width, height, castsShadow, capturedSurface, this.projection ?? HUNT_PROJECTIONS.legacy),
            huntSurfaceMaterial(id, surface.material, Boolean(source)));
    }
    render(ctx, frame) {
        const began = performance.now();
        const engine = this.engine;
        // In renderer coordinates (Z up): derive relevance from the actual camera
        // window, not source IDs or assumptions about creatures/spell schools.
        engine.lightViewBounds = { minX: 0, maxX: this.width / UNIT,
            minY: -this.height * (this.projection ?? HUNT_PROJECTIONS.legacy).groundY / UNIT, maxY: 0 };
        engine.apply({ ...huntLightFrame(frame, this.camera, { width: this.width, height: this.height }, this.projection ?? HUNT_PROJECTIONS.legacy), materials: this.materials, objects: this.objects });
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
        const centerY = -this.height * (this.projection ?? HUNT_PROJECTIONS.legacy).groundY / UNIT / 2;
        engine.camera.position.set(this.width / UNIT / 2, centerY - 30, 30);
        engine.camera.lookAt(this.width / UNIT / 2, centerY, 0);
        alignHuntActorBillboards(this.objects, engine, (this.projection ?? HUNT_PROJECTIONS.legacy).uprightBillboards);
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

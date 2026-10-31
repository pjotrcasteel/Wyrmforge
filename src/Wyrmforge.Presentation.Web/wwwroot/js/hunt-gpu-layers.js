// Stable presentation resources derived from existing authoritative scene records.
import { territoryWallVisualRevision } from './arena-territory-walls.js';
export function huntLayerCapture(layer, player, dragonDeath = null) {
    let actor, id, size;
    if (layer.kind === 'masonry' && layer.prop) {
        const p = layer.prop;
        actor = { x: p.x * layer.width, y: p.y * layer.height, radius: p.radius };
        id = `prop:${p.id}`;
        size = Math.max(160, Math.min(768, (p.radius || 20) * 12));
    } else if (layer.kind === 'masonry' && layer.barrier) {
        const b = layer.barrier;
        actor = { x: (b.x + b.width / 2) * layer.width, y: layer.depth + 6 };
        id = `wall:${b.kind}:${b.x}:${b.y}:${b.width}:${b.height}`;
        size = Math.max(160, b.width * layer.width + 64, b.height * layer.height + 96);
    } else {
        actor = layer.enemy ?? layer.dragon ?? (layer.kind === 'dragonDeath' ? dragonDeath : player);
        if (!actor) return null;
        id = `${layer.kind}:${actor.entityId ?? actor.id ?? 'primary'}`;
        size = Math.max(160, Math.min(768, (actor.radius || 20) * 12));
    }
    // The capture extends below the C# position to leave room for painted feet,
    // shadows and articulated bosses. Supply this artwork-dependent pivot to
    // the generic GPU billboard rather than burying that part below ground.
    // These are existing Canvas paint extents, not physics or collision changes.
    let footOffset = null;
    switch (layer.kind) {
        case 'mage':
            footOffset = 12 * Math.max(.7, Math.min(1.45, (actor.radius || 12) / 12));
            break;
        case 'enemy':
            footOffset = 24 * Math.max(.62, Math.min(1.9, (actor.radius || 12) / 12));
            break;
        case 'dragon':
            footOffset = (actor.radius || 34) * 1.6;
            break;
        default:
            break;
    }
    const footFraction = footOffset === null ? undefined : Math.min(1, .75 + footOffset / size);
    // The 2.5D image can be taller than its physical body and includes padding.
    // A standing fallback is approximately 1.5 body diameters in world Z,
    // snapped to the 4px pixel-art unit so all approach angles share stable samples.
    // Authored heightfields/meshes take precedence once supplied by the asset.
    const occluderHeightPx = layer.kind === 'masonry' ? undefined : Math.max(4, Math.round(3 * (actor.radius || 12) / 4) * 4);
    return { id: 'hunt-' + id, x: actor.x - size / 2, y: actor.y - size * .75, size,
        ...(footFraction !== undefined ? { footFraction } : {}),
        ...(occluderHeightPx !== undefined ? { occluderHeightPx } : {}) };
}

/**
 * Explicit visual revisions for genuinely static legacy captures only.
 * Dynamic foliage, VFX and moving actors always redraw. No lighting behavior
 * depends on these names; the generic GPU engine accepts opaque revision keys.
 */
export function huntLayerRevision(layer, artAvailable = false, artRevision = 0) {
    if (layer.kind !== 'masonry') return undefined;
    // Cloister walls are drawn solely from immutable world geometry and colors.
    // Avoid re-rasterizing and uploading four large, unchanged cutouts every frame.
    // Other masonry styles may animate and must retain the dynamic fallback.
    if (layer.style === undefined && layer.barrier && !layer.wetForest) {
        return JSON.stringify(['cloister-wall-v1', layer.barrier, layer.width, layer.height]);
    }
    // Animated territory runes change art only at lit/dim transitions, not every tick.
    // Keep the authored timer and exact rune-state selection in the territory adapter.
    if (layer.style === 'territory' && layer.barrier && !layer.wetForest && artAvailable) {
        return territoryWallVisualRevision(layer, artRevision);
    }
    if (layer.style !== 'destructible' || layer.wetForest || !layer.prop) return undefined;
    // Damage, geometry, identity and late-loaded art each invalidate the capture.
    return JSON.stringify([layer.prop, layer.width, layer.height, Boolean(artAvailable)]);
}


/**
 * Reuse the same CPU raster surface between GPU fallback layers instead of
 * allocating its bitmap again for every actor. State is isolated by save/restore
 * in the caller, while per-layer pixels are cleared before repaint.
 */
export function prepareHuntGpuScratch(canvas, size, worldX, worldY) {
    if (![size, worldX, worldY].every(Number.isFinite) || size <= 0)
        throw new RangeError('Invalid GPU fallback layer bounds');
    const pixels = Math.ceil(size);
    if (canvas.width !== pixels) canvas.width = pixels;
    if (canvas.height !== pixels) canvas.height = pixels;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('GPU fallback layer needs a 2D raster context');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixels, pixels);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(-worldX, -worldY);
    return ctx;
}


/**
 * Bounded pool of CPU-only staging canvases keyed by raster size. The GPU
 * renderer remains the one shared LightingEngine; the pool only holds temporary
 * legacy asset pixels while that migration is in progress.
 */
export class HuntGpuScratchPool {
    constructor(capacity = 4, createCanvas = () => document.createElement('canvas')) {
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8)
            throw new RangeError('Invalid GPU raster pool capacity');
        this.capacity = capacity;
        this.createCanvas = createCanvas;
        this.surfaces = new Map();
        this.created = 0;
        this.reused = 0;
        this.evicted = 0;
    }
    acquire(size) {
        if (!Number.isFinite(size) || size <= 0) throw new RangeError('Invalid GPU raster size');
        const pixels = Math.ceil(size);
        let canvas = this.surfaces.get(pixels);
        if (canvas) {
            this.surfaces.delete(pixels);
            this.reused++;
        } else {
            canvas = this.createCanvas();
            canvas.width = pixels;
            canvas.height = pixels;
            this.created++;
            if (this.surfaces.size >= this.capacity) {
                const oldest = this.surfaces.keys().next().value;
                const retired = this.surfaces.get(oldest);
                this.surfaces.delete(oldest);
                // Dropping the key alone retains a full-size Canvas bitmap until GC.
                // This staging surface is no longer in use, so release its pixels now.
                retired.width = 0;
                retired.height = 0;
                this.evicted++;
            }
        }
        this.surfaces.set(pixels, canvas);
        return canvas;
    }
    diagnostics() {
        let pixels = 0;
        for (const size of this.surfaces.keys()) pixels += size * size;
        return { capacity: this.capacity, active: this.surfaces.size,
            created: this.created, reused: this.reused, evicted: this.evicted,
            estimatedBytes: pixels * 4 };
    }
    clear() {
        for (const canvas of this.surfaces.values()) {
            canvas.width = 0;
            canvas.height = 0;
        }
        this.surfaces.clear();
    }
}


/**
 * Safari must not present a half-painted frame when WebGL terrain, actor
 * cutouts and later Canvas combat effects are composed in separate passes.
 * Finish all GPU/Canvas work offscreen and commit exactly one full-size,
 * non-interpolated image to the visible interactive Hunt canvas.
 * This is a presentation staging surface, not a second lighting engine.
 */
/** The isolated GPU review uses neutral albedo; normal gameplay keeps authored ground. */
export function shouldUseG4NeutralGround(params, gpuRequested) {
    return gpuRequested && params.get('g4Review') === '1' &&
        params.get('g4PaintedGround') !== '1';
}

/** A G4 review frame is fully staged before it is presented to Safari. */
export function shouldStageHuntGpuReviewFrame(params, gpuRequested) {
    return gpuRequested && params.get('g4Review') === '1' &&
        params.get('g4StageFrames') !== '0';
}

export function prepareHuntGpuPresentation(canvas, width, height, dpr) {
    if (!canvas || ![width, height, dpr].every(Number.isFinite) ||
        width <= 0 || height <= 0 || dpr <= 0) throw new RangeError('Invalid G4 presentation dimensions');
    const pixelsX = Math.max(1, Math.floor(width * dpr));
    const pixelsY = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== pixelsX) canvas.width = pixelsX;
    if (canvas.height !== pixelsY) canvas.height = pixelsY;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('G4 frame staging requires Canvas2D');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    return ctx;
}

export function presentCompletedHuntGpuFrame(ctx, source) {
    if (!source?.width || !source?.height) throw new TypeError('Missing completed G4 frame');
    ctx.save();
    try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'copy';
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0);
    } finally {
        ctx.restore();
    }
}

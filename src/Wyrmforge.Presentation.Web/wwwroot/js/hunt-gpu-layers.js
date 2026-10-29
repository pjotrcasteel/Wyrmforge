// Stable presentation resources derived from existing authoritative scene records.
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
    return { id: 'hunt-' + id, x: actor.x - size / 2, y: actor.y - size * .75, size };
}

/**
 * Explicit visual revisions for genuinely static legacy captures only.
 * Dynamic foliage, VFX and moving actors always redraw. No lighting behavior
 * depends on these names; the generic GPU engine accepts opaque revision keys.
 */
export function huntLayerRevision(layer, artAvailable = false) {
    if (layer.kind !== 'masonry' || layer.style !== 'destructible' || layer.wetForest || !layer.prop)
        return undefined;
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
                this.surfaces.delete(this.surfaces.keys().next().value);
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
        this.surfaces.clear();
    }
}

// Runtime loader for the generated pixel-art atlases (tools/art/build-art.mjs).
// Presentation-only: every caller keeps its code-painted fallback until the atlas is ready,
// so tests, headless contexts and slow networks never see an empty world.
const state = {
    manifest: null,
    images: new Map(),
    ready: false,
    generation: 0,
    loading: null,
    listeners: new Set(),
};

export function artReady() { return state.ready; }
export function artGeneration() { return state.generation; }
export function onArtReady(listener) { state.listeners.add(listener); return () => state.listeners.delete(listener); }

export function loadArt(baseUrl = 'art/') {
    if (state.loading) return state.loading;
    if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof fetch === 'undefined') {
        return (state.loading = Promise.resolve(false));
    }
    state.loading = (async () => {
        try {
            const response = await fetch(`${baseUrl}manifest.json`, { cache: 'force-cache' });
            if (!response.ok) return false;
            const manifest = await response.json();
            const entries = Object.entries(manifest.atlases ?? {});
            const images = await Promise.all(entries.map(([, atlas]) => loadImage(`${baseUrl}${atlas.image}`)));
            entries.forEach(([name], index) => state.images.set(name, images[index]));
            state.manifest = manifest;
            state.ready = true;
            state.generation++;
            for (const listener of state.listeners) listener(state.generation);
            return true;
        } catch {
            return false;
        }
    })();
    return state.loading;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`art atlas failed: ${src}`));
        image.src = src;
    });
}

// Test hook: install a manifest + image-like sources without the network.
export function installArtForTesting(manifest, images) {
    state.manifest = manifest;
    state.images = new Map(Object.entries(images));
    state.ready = Boolean(manifest);
    state.generation++;
}

export function resetArtForTesting() {
    state.manifest = null;
    state.images = new Map();
    state.ready = false;
    state.loading = null;
}

export function artFrame(atlas, name) {
    if (!state.ready) return null;
    const frame = state.manifest.atlases[atlas]?.frames?.[name];
    return frame ? { frame, image: state.images.get(atlas) } : null;
}

export function hasArtFrame(atlas, name) { return Boolean(artFrame(atlas, name)); }

// Draws a frame with its anchor at (x, y). One art pixel equals `scale` world units.
// Returns false when the frame is unavailable so callers can fall back.
export function drawArtFrame(ctx, atlas, name, x, y, { scale = 1, flipX = false, alpha = 1 } = {}) {
    const entry = artFrame(atlas, name);
    if (!entry || typeof ctx.drawImage !== 'function') return false;
    const { frame, image } = entry;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (flipX) ctx.scale(-1, 1);
    // Integer source rects and anchor offsets keep pixel columns crisp.
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h,
        -frame.ax * scale, -frame.ay * scale, frame.w * scale, frame.h * scale);
    ctx.restore();
    return true;
}

// Repeating tile pattern for terrain bakes.
const patternCache = new WeakMap();
export function artTilePattern(ctx, name) {
    const entry = artFrame('tiles', name);
    if (!entry || typeof ctx.createPattern !== 'function' || typeof document === 'undefined') return null;
    let perContext = patternCache.get(ctx);
    if (!perContext || perContext.generation !== state.generation) {
        perContext = { generation: state.generation, patterns: new Map() };
        patternCache.set(ctx, perContext);
    }
    if (perContext.patterns.has(name)) return perContext.patterns.get(name);
    const { frame, image } = entry;
    const tile = document.createElement('canvas');
    tile.width = frame.w;
    tile.height = frame.h;
    const tileCtx = tile.getContext('2d');
    tileCtx.imageSmoothingEnabled = false;
    tileCtx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    const pattern = ctx.createPattern(tile, 'repeat');
    perContext.patterns.set(name, pattern);
    return pattern;
}

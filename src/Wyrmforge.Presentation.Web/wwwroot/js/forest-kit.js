// The gothic forest sprite kit (tools/art/build_gothic_forest_kit.py): one atlas image plus a manifest of rectangles and foot anchors.
// Loaded once, lazily; every consumer treats "not loaded yet" as "draw nothing yet".
//
// The kit is authored on the 32 px/m grid. Terrain art is now 64 px/m, so the atlas is enlarged 2x with Scale2x (edge-preserving pixel-art
// enlargement: diagonals become clean steps, nothing is blurred) when it loads. Sprite `x, y, w, h, ax, ay` stay in world units, the
// size a sprite occupies in the world; `sx, sy, sw, sh` are its rectangle in the enlarged atlas. Use `spriteSource` to read it.
import { TERRAIN_ART_SCALE } from './arena-projection.js';

let kit = null;
let requested = false;
let pendingLoad = null;

/** Installs a kit (`{ sprites, image }`) directly; used by tests and by anything that already holds the atlas. */
export function useForestKit(value) { kit = value; requested = true; }

/**
 * Scale2x of an RGBA buffer: each source pixel becomes a 2 x 2 block that copies the neighbour on a diagonal edge, so staircases
 * smooth into half-steps without inventing colours. Pure, so it runs in Node tests.
 */
export function scale2x(data, width, height) {
    const source = new Uint32Array(data.buffer, data.byteOffset, width * height);
    const out = new Uint32Array(width * height * 4), stride = width * 2;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const p = source[y * width + x];
        const up = y > 0 ? source[(y - 1) * width + x] : p, down = y < height - 1 ? source[(y + 1) * width + x] : p;
        const left = x > 0 ? source[y * width + x - 1] : p, right = x < width - 1 ? source[y * width + x + 1] : p;
        const o = y * 2 * stride + x * 2;
        out[o] = left === up && left !== down && up !== right ? up : p;
        out[o + 1] = up === right && up !== left && right !== down ? right : p;
        out[o + stride] = down === left && down !== right && left !== up ? left : p;
        out[o + stride + 1] = right === down && right !== up && down !== left ? down : p;
    }
    return new Uint8ClampedArray(out.buffer);
}

/** The manifest with each sprite's rectangle in an atlas enlarged by `factor`; world-unit fields are untouched. */
export function scaleManifest(sprites, factor) {
    return Object.fromEntries(Object.entries(sprites).map(([name, s]) => [name,
        { ...s, sx: s.x * factor, sy: s.y * factor, sw: s.w * factor, sh: s.h * factor }]));
}

/** `[sx, sy, sw, sh]` of a sprite in its atlas image: the enlarged rectangle when the kit was enlarged, otherwise the plain one. */
export function spriteSource(sprite) {
    return [sprite.sx ?? sprite.x, sprite.sy ?? sprite.y, sprite.sw ?? sprite.w, sprite.sh ?? sprite.h];
}

async function load() {
    const base = new URL('../art/environment/forest/', import.meta.url);
    const json = await (await fetch(new URL('forest-kit.json', base))).json();
    const image = new Image();
    image.src = new URL(json.atlas, base).href;
    await image.decode();
    const factor = TERRAIN_ART_SCALE;
    if (factor !== 2 || typeof document === 'undefined') return { sprites: json.sprites, image };
    const plain = document.createElement('canvas');
    plain.width = image.naturalWidth; plain.height = image.naturalHeight;
    const g = plain.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const pixels = g.getImageData(0, 0, plain.width, plain.height);
    const enlarged = document.createElement('canvas');
    enlarged.width = plain.width * 2; enlarged.height = plain.height * 2;
    enlarged.getContext('2d').putImageData(new ImageData(scale2x(pixels.data, plain.width, plain.height), enlarged.width, enlarged.height), 0, 0);
    return { sprites: scaleManifest(json.sprites, 2), image: enlarged };
}

/** Starts the shared load and settles even when the kit is unavailable. */
export function preloadForestKit() {
    if (!kit && !requested && typeof Image !== 'undefined' && typeof fetch !== 'undefined') {
        requested = true;
        pendingLoad = load().then(loaded => { kit = loaded; }).catch(() => { });
    }
    return pendingLoad ?? Promise.resolve();
}

/** The loaded kit, or null while it is still downloading. */
export function forestKit() {
    if (!requested) void preloadForestKit();
    return kit;
}

/** Sprite names of a kit that start with a prefix, sorted; cached per kit. */
export function kitNames(loaded, prefix, maxHeight = Infinity) {
    const cache = loaded.nameCache ??= new Map();
    const key = `${prefix}|${maxHeight}`;
    if (!cache.has(key)) cache.set(key, Object.keys(loaded.sprites).filter(name => name.startsWith(prefix) && loaded.sprites[name].h <= maxHeight).sort());
    return cache.get(key);
}

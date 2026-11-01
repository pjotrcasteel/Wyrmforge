// WF32-P1k: bounded source-art preview cache. Not a second renderer or C# site authority.
// Original world variation generators remain pure and byte-for-byte unchanged.
import { createWorldBoundaryWindow, createWorldMasonryWindow } from './terrain-world-variation.mjs';

const MASONRY_DEFAULTS = Object.freeze({
    seed: 1387, state: 'broken', originX: 0, originY: 0, width: 512, height: 512
});
const BOUNDARY_DEFAULTS = Object.freeze({
    seed: 1387, state: 'reclaimed', originX: 0, originY: 0, width: 512, height: 512,
    role: 'outer-nw', boundaryX: 256, boundaryY: 256
});

function effectiveOptions(options, defaults) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('World art window options must be an object');
    }
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
        [key, options[key] === undefined ? fallback : options[key]]));
}

function cloneWorldField(field) {
    const clone = {
        ...field,
        albedo: field.albedo.clone(),
        stoneIds: field.stoneIds.slice(),
        heights: field.heights.slice(),
        roughness: field.roughness.slice()
    };
    if (field.originalIds) {
        clone.originalIds = field.originalIds.slice();
    }
    return clone;
}

function fieldBytes(field) {
    return field.albedo.data.byteLength + field.stoneIds.byteLength +
        field.heights.byteLength + field.roughness.byteLength + (field.originalIds?.byteLength ?? 0);
}

/** Optional bounded LRU for repeatedly requested original world-art windows.
 * Returns independent copies so caller mutations cannot alter later reviews.
 * This does not register a gameplay atlas, change source pixels, or cache C# geography.
 */
export function createWorldArtWindowCache({maxEntries = 8, maxBytes = 16 * 1024 * 1024} = {}) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 ||
        !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
        throw new RangeError('World-art cache limits must be positive integers');
    }
    const entries = new Map();
    let bytesUsed = 0;
    let hits = 0;
    let misses = 0;
    let evictions = 0;

    const load = (key, producer) => {
        const existing = entries.get(key);
        if (existing) {
            entries.delete(key);
            entries.set(key, existing);
            hits++;
            return cloneWorldField(existing.field);
        }
        misses++;
        const field = producer(); // Source generator owns validation and pixel authority.
        const bytes = fieldBytes(field);
        if (bytes > maxBytes) {
            return field; // Oversize windows remain correct but are never retained.
        }
        while (entries.size >= maxEntries || bytesUsed + bytes > maxBytes) {
            const oldest = entries.keys().next().value;
            const evicted = entries.get(oldest);
            entries.delete(oldest);
            bytesUsed -= evicted.bytes;
            evictions++;
        }
        entries.set(key, {field: cloneWorldField(field), bytes});
        bytesUsed += bytes;
        return field;
    };

    return Object.freeze({
        masonry(type, options = {}) {
            const normalized = effectiveOptions(options, MASONRY_DEFAULTS);
            return load(JSON.stringify(['masonry', type, normalized]),
                () => createWorldMasonryWindow(type, normalized));
        },
        boundary(type, soft, options = {}) {
            const normalized = effectiveOptions(options, BOUNDARY_DEFAULTS);
            return load(JSON.stringify(['boundary', type, soft, normalized]),
                () => createWorldBoundaryWindow(type, soft, normalized));
        },
        stats() {
            return Object.freeze({hits, misses, evictions, entries: entries.size,
                bytesUsed, maxEntries, maxBytes});
        },
        clear() {
            entries.clear();
            bytesUsed = 0;
            hits = 0;
            misses = 0;
            evictions = 0;
        }
    });
}

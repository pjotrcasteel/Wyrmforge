# WF32-P1k-C1 — Bounded original world-art window cache

Status: source-authoring infrastructure only. This is **not** a C# site cache, renderer, gameplay feature, runtime GPU atlas, or measured mobile optimization.

The original `terrain-world-variation.mjs` source functions remain unchanged and authoritative for every sampled pixel:

- `createWorldMasonryWindow(type, options)` for absolute-coordinate hard surfaces.
- `createWorldBoundaryWindow(type, soft, options)` for whole-stone hard/soft transitions and approved P1i blending.

`terrain-world-window-cache.mjs` wraps those two functions with `createWorldArtWindowCache`, an **opt-in, bounded LRU** for repeated source-art previews. The cache key includes material, neighboring soft ground, wear state, seed, world origin, dimensions, boundary role and boundary coordinates. Explicit defaults and omitted defaults produce the same entry.

By default the cache retains no more than **8 entries or 16 MiB** of source field bytes. Every returned field has independent albedo, stone-ID, original-ID, height and roughness buffers. A consumer cannot mutate a cached entry through an earlier returned `Bitmap` or typed array. Oversized requests are rendered normally but not stored. `clear()` releases retained fields, and `stats()` exposes hits, misses, evictions, entry count and retained bytes for verification.

### Intended use

```js
import { createWorldArtWindowCache } from './terrain-world-window-cache.mjs';

const cache = createWorldArtWindowCache({ maxEntries: 8, maxBytes: 16 * 1024 * 1024 });
const window = cache.boundary('flagstone', 'grass', {
    seed: 1781, state: 'reclaimed', originX: 0, originY: 0,
    width: 256, height: 256, role: 'inner-nw', boundaryX: 128, boundaryY: 128
});
// All original albedo, relief and roughness data can be read from window.
```

This is a source-art helper and **is not wired into the live rendering loop**. A later runtime cache must be owned by the shared G/material subsystem and respect C# AR3 site identity; this authoring module must not become a competing per-frame renderer.

### Verification

Run:

```sh
node --test tests/javascript/terrain-world-window-cache.test.mjs tests/javascript/terrain-world-variation.test.mjs
```

Seven additional cache tests verify byte parity against the uncached generator, the existing normal-map contract, independent caller buffers, LRU eviction order, byte cap, identity key dimensions and preservation of invalid-window rejection. The approved 12 ecology prop variants and all P1i blends are untouched. P1k's remaining hard/hard pairings, richer regional wear, seed/biome studies and device-gated integration stay open.

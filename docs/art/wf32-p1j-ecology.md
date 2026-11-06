# WF32-P1j — context-aware ecological microdetails (30 October 2026)

**Scope:** optional original pixel-art study in draft PR #429. The **owner-approved P1i boundary and corner blending remains locked**. This work does not change the authoritative C# site recipe, renderer, lighting engine, collisions, or gameplay.

## Reusable environment-detail contracts

Source: `tools/art/prototypes/terrain-ecology.mjs`.

- Seven original sprites authored as tiny connected pixel clusters: mushrooms, pebbles, dead leaves, twigs, exposed roots, moss and loose rubble. No reference-art pixels are copied or traced.
- A material compatibility matrix distinguishes grass, soil, mud, flagstone, cobble and brick. Mushroom, root and leaf detail favors appropriate softer surfaces; moss and displaced rubble appear on hard surfaces.
- Deterministic placement uses 20px-spaced **absolute world-coordinate anchors**, with low-frequency regional patches rather than per-tile arbitrary random sprinkling. Review options `moisture`, `shelter`, `wear` and `density` are validated 0..1 *cosmetic coefficients*, not independent ecological authority.
- Source context must ultimately originate from AR3's C# semantic environmental fields and site intent. The reviewed values in the CLI are **illustrative source-art inputs only**; do not infer C# biome/path state from rendered pixels.
- Decal pixels are guarded from each hard-soft boundary in all directions. A correction after the initial failing test extended the 9px protection from the anchor to **every drawn pixel**. Original stone IDs remain identical, and none of the approved stone-erasure blends are repainted.
- The detail overlay preserves `LitMaterial` integration: albedo is original sRGB pixel art; relative surface heights and roughness update the existing tangent-space normal / G roughness maps through `worldLightingMaps`; specular is still a scalar property and there is no emissive map or second engine.
- Source windows use a 32px halo before cropping to stable 32px-aligned review images, preventing seam differences between overlapping world windows.

## Build and test

```sh
node tools/art/prototypes/build-ecology-review.mjs docs/art/previews/wf32-ecology
node --test tests/javascript/terrain-ecology.test.mjs
node --test --test-concurrency=2 tests/javascript/*forest-32.test.mjs tests/javascript/terrain-*.test.mjs
```

The generator produces the original 3-column before/after art study, albedo/normal/roughness PNGs and a manifest with compatibility, illustrative conditions and placement counts. Do not interpret the preview as a screenshot from a running Hunt.

**Local verification:** 7 P1j tests pass individually. Total offline authoring suite: **48/48 passed**, zero failures, including prior 41 regression cases. These results were obtained against the repository-compatible local art painter; GitHub CI is checked separately. Verification covers deterministic placements, overlap invariance, strict compatibility and low/high moisture behavior, exact 32px map reassembly and no alteration of approved transition pixels.

## Remaining gates

- **P1j-B:** owner approves/detail-tunes the 1x and magnified art. Native 320/390px Hunt legibility remains unverified.
- **P1k:** richer biome selection and controlled seed diversity; hard↔hard transitions; atlas caching for bounded GPU/mobile memory. No per-frame CPU texture baking.
- **P2/AR4:** after AR3 geographic sign-off, integrate the source-authored textures with the *existing* G material renderer and evaluate real lighting/shadows on actual geometry. Actual caster occlusion must be explicit; these tiny decals do not independently cast shadows.
- **P3/AR7:** real playable Hunt captures on devices, performance / memory/thermal and gameplay validation.

The seven user-supplied free/licensed asset packs remain technique references only and are not included in the repository.

# WF32-P1j-B — Lit 2.5D ecology prop source (30 October 2026)

**Source-only authoring checkpoint; no live Hunt, physics-engine or lighting-engine changes.** Owner-approved P1i terrain blending is immutable in this work.

## Existing engine contracts checked

- **C# owns gameplay physics and placement.** `ArenaEnvironmentState.IsBlocked` and `HuntArenaGenerator.Prop` already handle obstacles and destructibles, and the canonical engine ownership audit requires all collision and navigation to remain in RunSimulation. This milestone makes no C# edits and creates no JS collision solver. Every rock footprint is a *candidate* until the authoritative C# site accepts it.
- **Shared G handles light, shadow and material.** `lighting/contracts.d.ts` provides `LitMaterial` albedo, normal, roughnessMap, scalar specular, foliageTransmission, alphaCutoff and `LitRenderable` with world position, shadow receive/cast, optional occluderGeometry and frame. `lighting/lit-sprite.js` already supports foot-anchored 2.5D sprite planes. This source exports compatible *material descriptors* and art only. The atlas, geometry, light response and occluder are **not yet registered at runtime**.
- **Pixel-first 2.5D**: No mandatory 3D model, mesh physics, duplicate GPU renderer or competing world generator. Higher props span more than 32 pixels but keep original pixel-art discipline.

## Implementation

`tools/art/prototypes/terrain-ecology-props.mjs` defines four families: small rock, broken rock cluster, medium grass and tall grass, each in three original variants. Ground anchors are distinct from sprite bounding boxes. Each has aligned transparent albedo, normal and roughness frames in an opt-in atlas. Grass is always nonblocking; rocks can carry proposed ground radii, but C# must verify them later. No reference-pack pixels were reused.

`proposeEcologyProps(worldField,{seed,soft,context})` produces stable world-coordinate *cosmetic proposals* from the existing P1i stone IDs and soft terrain field using moisture, wear, density and deterministic grid samples. A 12px+foot-radius safety band prevents props from obscuring the approved stone/soft transition. This is **not** authoritative spawn logic; actual placement must consume approved AR3 site slots, geometry and collision clearances.

`tools/art/prototypes/build-ecology-props-review.mjs` exports an original sprite gallery, 3 lighting-compatible atlases, a static placement study and manifest. Neither the gallery nor the composition is an actual in-Hunt image.

### Validation

The opt-in `tests/javascript/terrain-ecology-props.test.mjs` covers all 12 transparent sprites, pixel-aligned atlas frames/anchors, deterministic overlapping windows, transition clearance, collision authority, shared-light material descriptors and ground immutability. **Six new tests passed locally** in the source prototype, bringing the intended milestone suite to 54 total (the prior 48 already recorded). Full suite in one local process exceeded the execution window and must not be claimed completed. Confirm GitHub CI separately.

### Acceptance still required

1. Owner art review: silhouettes, medium/tall grass volume, rock sizing, native 320/390px readability.
2. AR3 geography/scene slots and C# legal prop footprints; **do not alter the physics engine**.
3. Existing G material+sprite registration and real emitter/caster validation, not a proxy normal-map preview.
4. Full gameplay overlay, shadow, occlusion and physical mobile frame/memory tests. No milestone is production ready until these gates pass.

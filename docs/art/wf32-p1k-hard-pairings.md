# WF32-P1k-H1 — Hard-to-hard source-art transition study

Status: **source material mixing and variation direction liked by owner (30 October); physical 2.5D visual acceptance still open**. This is not a live WyrmForge Hunt screenshot, C# site placement or runtime GPU feature.

### What is implemented

`terrain-hard-pairings.mjs` composes two different authoritative P1i masonry families (`flagstone`, `cobble`, `brick`) into one world-coordinate preview. It reuses existing `createWorldMasonryWindow` stone identities, degradation state, colors, roughness and heights. Existing `worldBoundaryMask` supplies the review boundary role (four edges plus inner and outer corners); only AR3 C# can decide where such a boundary belongs in the actual world.

When an original stone spans both sides of the material boundary, the entire original identity is removed. The gap uses existing world-coordinate grass/soil/mud source pixels (soil in this first gallery). This keeps the owner's approved P1i **whole-stone, no half-face clipping** behavior. Stones with missing/fractured pixels are classified by original ID, not by a fragment's visible pixel ID. Each output pixel includes a 0/1/2 source tag, stone ID, original ID, albedo, height and roughness; compatible normals and roughness atlases are produced by the existing `worldLightingMaps` function, not a new renderer.

This first gallery shows the three unordered pairings **in both left/right directions** at native `256×192` source pixels per sample, plus a 3× nearest-neighbour view. The study uses moderate `worn` degradation so the underlying masonry shapes remain recognizable. It does not modify the approved P1i blend source, P1j ecology grass/rocks or the underlying masonry textures.

### H2 — physical elevation and shadow-caster source candidates (not engine output)

Owner review of H1: **"the mix and variation looks great"**, but the preview is flat without heightmap and shadows. This accepts the material-mixing *direction*, **not** the 2.5D depth, elevations, cast shadows, final scene, or full H1 visual gate. Preserve the visible mix while bringing material elevation through the existing architecture.

`terrain-hard-pairing-relief.mjs` now converts each visible original stone identity into source-only physical inputs:

- A candidate **elevation/height map** (opaque grayscale) in a fixed scale: 16 source-height units = 1 source pixel; the world projection uses the existing 48 pixels per world unit. Hard stone rise **candidates**, pending inspection: flagstone 4px, brick 5px, cobble 7px. Existing source tonal relief contributes at most 0.75px of top-face variation. Earth infill remains at zero.
- A **caster occupancy mask** (opaque only at actual stone pixels), plus exact per-stone row spans, original IDs, material tags, local bounding rectangles and candidate world rise. These preserve irregular stone outlines for future geometry authoring. They are **not rectangular colliders, meshes or final shadows**.
- **No new lighting or physics engine**. The existing G material contract consumes albedo, normal, roughness and actual registered `geometry`/`occluderGeometry`; it does **not** accept a height texture as an automatic shadow caster. A G-owned adapter must eventually construct/register proper geometry from an AR3-approved world representation, or explicitly approved caster geometry from these shapes. AR3 remains authoritative about where stones and terrain belong.

The new `flagstone-cobble-elevation.png` and `flagstone-cobble-caster-alpha.png` artifacts are labeled **unlit diagnostics**. They demonstrate data availability and coverage, not visual depth. **Only a real running Hunt capture with a moving Fireball and verified stone/prop/actor shadows** can close the 2.5D visual gate. The runtime G integration, performance, collision and physics work remain outside this source-art slice.

### Reproduce the gallery and tests

```sh
node tools/art/prototypes/build-hard-pairing-review.mjs artifacts/wf32-hard-pairings
node --test tests/javascript/terrain-hard-pairings.test.mjs tests/javascript/terrain-hard-pairing-relief.test.mjs tests/javascript/terrain-world-variation.test.mjs
```

Review outputs:

- `hard-pairing-gallery-native.png` (768×448 total, six 256×192 samples with labels)
- `hard-pairing-gallery-3x.png` (nearest-neighbour pixel inspection)
- `flagstone-cobble-normal.png` and `flagstone-cobble-roughness.png` (existing G material channels)
- `flagstone-cobble-elevation.png` and `flagstone-cobble-caster-alpha.png` (H2 source elevation/mask diagnostics, **not** live shadows)
- `manifest.json` (source tags, coverage and limitations)

Eight H1 hard-pairing tests check all three pair kinds and both orientations, stone identity and no-clipping, world-window overlap continuity, vertical inner corners, 32px source-tile reassembly, material map coherence, unchanged original source data and invalid-input rejection. Five H2 tests check source-masked elevation, exact caster spans, world-coordinate overlap, rejection of corrupt identities and honest review metadata. Owner has positively reviewed the H1 **mixing/variation direction**; the height/shadow and mobile-scale appearance are unapproved. The separate AR3/G/real-device and physics gates remain fully open.

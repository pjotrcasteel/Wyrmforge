# WF32-P1k-H1 — Hard-to-hard source-art transition study

Status: **original 2.5D terrain source grammar / owner visual review pending**. This is not a live WyrmForge Hunt screenshot, C# site placement or runtime GPU feature.

### What is implemented

`terrain-hard-pairings.mjs` composes two different authoritative P1i masonry families (`flagstone`, `cobble`, `brick`) into one world-coordinate preview. It reuses existing `createWorldMasonryWindow` stone identities, degradation state, colors, roughness and heights. Existing `worldBoundaryMask` supplies the review boundary role (four edges plus inner and outer corners); only AR3 C# can decide where such a boundary belongs in the actual world.

When an original stone spans both sides of the material boundary, the entire original identity is removed. The gap uses existing world-coordinate grass/soil/mud source pixels (soil in this first gallery). This keeps the owner's approved P1i **whole-stone, no half-face clipping** behavior. Stones with missing/fractured pixels are classified by original ID, not by a fragment's visible pixel ID. Each output pixel includes a 0/1/2 source tag, stone ID, original ID, albedo, height and roughness; compatible normals and roughness atlases are produced by the existing `worldLightingMaps` function, not a new renderer.

This first gallery shows the three unordered pairings **in both left/right directions** at native `256×192` source pixels per sample, plus a 3× nearest-neighbour view. The study uses moderate `worn` degradation so the underlying masonry shapes remain recognizable. It does not modify the approved P1i blend source, P1j ecology grass/rocks or the underlying masonry textures.

### Reproduce the gallery and tests

```sh
node tools/art/prototypes/build-hard-pairing-review.mjs artifacts/wf32-hard-pairings
node --test tests/javascript/terrain-hard-pairings.test.mjs tests/javascript/terrain-world-variation.test.mjs
```

Review outputs:

- `hard-pairing-gallery-native.png` (768×448 total, six 256×192 samples with labels)
- `hard-pairing-gallery-3x.png` (nearest-neighbour pixel inspection)
- `flagstone-cobble-normal.png` and `flagstone-cobble-roughness.png` (existing G material channels)
- `manifest.json` (source tags, coverage and limitations)

Eight hard-pairing tests check all three pair kinds and both orientations, stone identity and no-clipping, world-window overlap continuity, vertical inner corners, 32px source-tile reassembly, material map coherence, unchanged original source data and invalid-input rejection. The owner **has not yet approved the hard↔hard aesthetic**, seam width, or contrast at mobile game scale. The separate AR3/G/real-device and physics gates remain fully open.

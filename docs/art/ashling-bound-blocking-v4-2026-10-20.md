# Ashling explicit bound blocking v4a

Status: owner approved this explicit bound preview with “perfect” on 2026-10-20. No runtime integration. The previous v3 eight-direction export remains rejected and preserved.

This follows the [movement research](ashling-movement-research-2026-10-20.md). The source ankle controls were also found at incorrect fore/aft depths relative to the actual feet. The new rig corrects both leg chains and rebinds 19,881 lower-body vertices, preserving arm and authored-tail weights.

The 16-frame, 20 fps loop now explicitly authors loading, supporting-leg extension, toe release, staggered knee tuck, lead-foot catch and landing compression. The body and feet no longer share almost the same vertical arc. Lower legs receive independent targets; supporting toes compensate for travel and foot roll. Each view uses the actual deformed textured mesh. Rendering uses the local RTX 5090 through CUDA/nvdiffrast; no hosted generation.

Source: `art/source/enemies/ashling/model/local-appearance-002/rigged-block-v4a/ashling-rigged.blend`. Reproducible authoring, sampling and review scripts: `tools/sprite-lab/block-ashling-bound.py`, `sample-ashling-block.py`, `render-ashling-block.py`.

Review evidence inside that source directory:

- `blocking-review/bound-review.gif`: colored leg weights and sampled bone chains beside side/front/game textured views. Moving ground ticks show authored travel.
- `blocking-review/bound-slow.gif`: slowed timing for articulation inspection.
- `blocking-review/key-poses.png`: load, drive, release, tuck, catch and absorb poses.
- `blocking-review/game-review.gif`: native 96-pixel frames enlarged by nearest pixels.
- `blocking-samples.npz`: actual evaluated vertices, UVs, leg landmarks and camera matrices.
- `blocking-review/report.json`: exact loop closure, finite coordinates, minimum mesh Z -0.5 (floor), support-toe horizontal drift 3.10e-8 model units, 16 unique game frames, no frame clipping. Knee interior-angle ranges: left 40.7–125.3 degrees, right 30.2–149.1 degrees.

Visual inspection of the side and textured contact sheets shows distinct compression, extended trailing support and folded airborne legs. Owner approval applies to this blocking preview; subsequent directional exports remain separately reviewable. The standalone game GIF omits a shadow; the side review includes a ground reference.

## Approved motion exported to eight directions

`art/source/enemies/ashling/exports/movement-eight-directions-v2/` contains the rebuilt 1536×768 atlas, 128 individual 96×96 frames, synchronized eight-direction GIF, pose comparison sheet, manifest and independent validation. All directions use actual rotated geometry, without mirroring. Directional export review is pending; the source movement is approved.

Independent CPU validation decoded all 128 frames, checked 131,428 opaque pixels against atlas placement, verified binary alpha, 57 visible palette colors, clipping margins, unique poses, shared anchors, exact source loop closure and no mirrored rows. Horizontal support-toe drift after compensating travel and rotating each direction is at most 3.42e-8 model units. This measures horizontal toe planting; heel/toe roll is intentionally allowed vertically. Source pose and atlas SHA256 hashes are recorded in the manifest and validation report.

Remaining: directional owner review, attack/death, runtime metadata and integration. Earlier sources and renders remain preserved for comparison.

# Ashling explicit bound blocking v4a

Status: new movement candidate for owner review. No runtime integration or directional replacement. The previous v3 eight-direction export remains rejected and preserved.

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

Visual inspection of the side and textured contact sheets shows distinct compression, extended trailing support and folded airborne legs. These technical measurements and pose comparisons do not establish owner acceptance. The standalone game GIF omits a shadow; the side review includes a ground reference. Remaining: owner movement review, then directional regeneration and validation, attack/death, runtime metadata and integration. Preserve the earlier renders for comparison.

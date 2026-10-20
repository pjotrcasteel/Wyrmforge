# Ashling — eight-direction bounding movement

The owner accepted the low, feral hopping gait and authorized continuation. This export carries that exact saved sixteen-pose source into N, NE, E, SE, S, SW, W and NW using actual 3D rotations around the fixed ground root. No view is mirrored, and no extra animation poses or model changes were introduced during the directional export.

Source: `art/source/enemies/ashling/model/local-appearance-002/rigged-bound-v3/ashling-rigged.blend`. Export: `art/source/enemies/ashling/exports/movement-eight-directions-v1/`. The transparent PNG is 1536×768: sixteen 96px cells per row, eight compass rows. Playback is 20 fps and loops. Every facing uses anchor `[48,70]`, the same source palette and the same motion phase. The manifest records source/atlas hashes, each frame rectangle and the actual unmirrored rotations.

The export proposes a 48-world-unit source height (smaller than Hollow), a cell draw size of 81.6 and authored travel of 36 world units per cycle. These are explicit presentation metadata for later integration, not a simulation speed change. The game still uses its existing Ashling renderer.

Agent review: front views preserve the paired horns and separate claws; side views make the compression/flight/landing sequence clear; rear views retain independent tail and cloth motion. Four inspected phases per facing cover landing, compression and both flight halves. The synchronized eight-facing GIF keeps all views on the same phase so their silhouettes and phase continuity can be compared.

- [All eight directions animated](evidence/ashling-eight-directions-2026-10-20/eight-directions-review.gif)
- [Directional contact and flight poses](evidence/ashling-eight-directions-2026-10-20/direction-contact-poses.png)
- [Independent pixel/contact validation](evidence/ashling-eight-directions-2026-10-20/independent-validation.json)
- [Accepted single-view hopping reference](evidence/ashling-bound-2026-10-20/bounding-review.gif)

Validation decodes all 128 source frames and the packed atlas independently on CPU. Every alpha value and all 136,598 visible source pixels match their atlas cells exactly. There are 57 opaque colors, sixteen distinct frames in every row, binary alpha and at least two pixels of cell margin. No row duplicates a horizontally mirrored counterpart. The source hashes and frame rectangles match the manifest. Rotated world contacts retain maximum stance drift 8.94e-8 model units in all eight directions. Loop pose error is exactly 0.0; minimum evaluated mesh Z is -.498856 above the -.5 floor. Forward vectors project into their named compass octants.

Reproduce rendering with `render-ashling-directions.py <new-revision>` in the installed WSL CUDA environment, then run `validate-ashling-movement.py <export-folder>` with Python/Pillow/NumPy. Both scripts preserve older revisions. Sources and review results are checkpointed on draft PR #168.

Status: movement sheet technically validated and agent-reviewed; owner acceptance of the full directional export is separate from the accepted gait base. Attack, death, action-layer metadata and runtime integration remain unfinished. Current main and open PRs were checked before exporting; concurrent Refuge/Arcane Nexus work and PR #136 are untouched. No live deployment is part of this art-only slice.

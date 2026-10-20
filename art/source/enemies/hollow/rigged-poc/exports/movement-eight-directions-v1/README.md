# The Hollow: directional movement export

20 October 2026. Movement sheet complete for review: **8 actual 3D facings × 16 frames**, rendered locally on the RTX 5090 from the existing accepted zombie gait. Owner accepted the original one-view waddle in chat; acceptance of this directional sheet remains pending. Runtime hunt assets are unchanged. Death animation is next and is not included here.

- `hollow-movement.png`: transparent 1536×768 PNG, sixteen 96×96 cells per row.
- Rows, top to bottom: **N, NE, E, SE, S, SW, W, NW**. Columns: frames 0–15, 12 FPS, looping.
- `hollow-movement.manifest.json`: explicit frame rectangles, no mirrored facings, fixed cell anchor **48,72**, draw cell **93 world units**, travel **18.3870968 world units per cycle**. Consumers must use this scale contract rather than the older 192px atlas contract.
- `frames/`: all 128 individual RGBA sprites. `shared-palette.png`: same 64-color Wyrmforge Hollow ramp used by the accepted proof.
- `all-directions-review.gif`: synchronized animated overview, enlarged with nearest-neighbor sampling. `contact-poses.png`: four phases of every direction.
- Editable source: `../../model/local-appearance-004/rigged-pixel-v3/hollow-rigged.blend`; its unchanged evaluated mesh poses are the source for every facing. Reproduce with `tools/sprite-lab/render-hollow-directions.py` (destination must not already exist).

## Validation and limits

GPU render report: 128 nonempty frames, binary alpha, no frame touches an outer cell boundary, shared palette, exact first/closing source pose equality. Fixed camera, ground anchor and world lighting; the mesh and normals rotate in 3D. No independently synthesized or mirrored animation frames. Hardware settings were not changed.

Visual inspection covered eight facings at four representative gait phases and actual 390px Sprite Lab screenshots beside the existing mage. Back-facing cloth and limbs remain darker under the fixed light; this is preserved directional shading. Hidden surfaces remain inferred from the original reconstruction. Automated checks do not certify anatomical accuracy or owner artistic acceptance.

`browser-review/browser-report.json` records real browser playback in every direction, correct original row selection, changing animation frames, zero browser errors and a downloaded 16×8 manifest. Review locally at `http://127.0.0.1:8766/sprite-lab/?candidate=hollow-movement-8dir-v1` with the loopback server `tools/sprite-lab/serve-review.cjs` running. No gameplay replacement is part of this export.

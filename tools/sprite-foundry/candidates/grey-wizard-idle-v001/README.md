# Grey Wizard — REJECTED eight-direction idle v001

**Owner visual approval: REJECTED on 2 November 2026 — incorrect direction facings. Runtime integration: NONE.**

This package is preserved only as a rejected baseline. Do not animate from it or promote it to runtime. A technical atlas pass did not establish correct facing art.

This is the first Foundry-format 64×80 technical review package. It reuses the eight already independently painted Wizard facings from **draft PR #439**, source directory `art/source/characters/grey-wizard/gothic-directions-v005/`. It does **not** claim the full-body art was newly generated or that the Wizard walk is complete. The approved three-view reference stays pinned in `../../references/approved-grey-wizard.png`.

## Exact conversion

- Input: eight 160×160 transparent RGBA sources S, SE, E, NE, N, NW, W, SW from v005.
- Identical transform for every facing: nearest-neighbor resize to 85×85, then crop x=10..73, y=1..80 (64×80).
- No per-frame bounding-box recentering, mirroring, body-part deformation, or invented limb motion.
- The original atlas used the **wrong S-first row order**, conflicting with the existing Sprite Lab. This is a confirmed defect of v001; do not consume it. Feet anchor was (32, 74).
- The source already depicts the **Fire** staff. It must be reviewed against the accepted Wizard identity and school-equipment requirement; do not silently make it the universal staff.

## How to inspect

- Open [light/dark review](review.png) for nearest-neighbor ×4 inspection.
- Load `output/manifest.json` plus `output/idle.albedo.png` into `../../review.html`.
- Rebuild from the repo root:

      python tools/sprite-foundry/foundry.py --project tools/sprite-foundry/candidates/grey-wizard-idle-v001/project.json --source tools/sprite-foundry/candidates/grey-wizard-idle-v001/source --out /tmp/wf-wizard-idle-review

- Initial strict format check: 0 missing frames, 0 structural errors, but **artwork was rejected**. The importer order and the actual NE/NW/rear facings need separate verification.

## Owner review questions

1. Does the identity survive at actual 64×80 mobile sprite scale?
2. Do all eight directions convincingly rotate, without false costume changes?
3. Is the staff consistently in the Wizard's *anatomical right hand*?
4. Is the Fire staff glow acceptable as source emission to be separated later?
5. Are the hat, robe, beard and feet readable enough to proceed to walking key poses?

**Not done:** walking (target 16 frames ×8), casting, hurt/death, authored normal/emission/roughness/depth maps, gait/foot sliding, real Hunt lighting/occlusion, iOS/Android device validation. Technical validity does not mean visual acceptance.

# Wizard six-school eight-direction walk — unapproved prototype

Generated from `tools/sprite-lab/build-wizard-source.py` (one procedural 3D body, six skin/staff variants).
Each school provides `walk.png` and aligned `walk-normal.png`, `walk-roughness.png`,
`walk-height.png`, `walk-caster.png`, plus `manifest.json` and `lit-material.json`.
Atlas cells: 128x128; 16 columns x 8 direction rows, `N NE E SE S SW W NW`;
feet anchor [64,106], provisional world size 72. All 768 walk frames have unique image content.
Alphas are identical across passes; edge clipping and blank-frame checks passed.
The albedo is neutral/non-emissive; neither normal-map export nor alpha caster alone
provides a physically valid volumetric shadow. Use PR #332 shared LitSprite interface.

ARTISTIC BLOCKERS: coarse mesh and robes; ground-contact/gait, folds, beard motion and
staff-hand weighting still need significant work in Blender. No weighted production rig,
`.blend`, mobile/device validation, owner acceptance, or production renderer integration.
Idle (12), cast (20), hurt (10) and death (24) are South-facing prototype studies only,
not full eight-direction export; they are included in the conversation review ZIP.
Do not wire this folder into `arena.js` or mark the existing temporary mage replaced.
The generated images are archived for review and should be regenerated once the
editable final rig and camera are accepted. No changes to Hollowed/Ashling or PR #332.

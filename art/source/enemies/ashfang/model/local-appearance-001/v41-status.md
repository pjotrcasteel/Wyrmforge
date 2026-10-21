# V41 anatomical stance — 21 October 2026

Continues [V40's review](v40-status.md) under canonical art/creature authority.
V41 adds a persistent editable folded-membrane compliance shape key: membrane
bays follow the actual root/wrist/finger anchors, with the correction stored in
rest space through inverse blended skin transforms. This removes the V40 rounded
membrane hump without hiding wings or altering rendered frames. Open-wing motion
and transitions have not yet been checked for this changed source.

Additional authored brows and ember-eye geometry define the face. Broad fiery
patches in the new derived texture are reduced toward charcoal, keeping narrow
incandescent boundaries. Original concept art remains intact. All generation
and GPU rasterization were local; GPU receipt identifies the RTX 5090.

Evidence: `rigged-block-v41-stance/silhouette-review-v1/anatomy-gate.png` and
`before-after.png`. Four actual cameras, native 110px/unit, 256px cells; all
unclipped. Game-view visible width 92px (~20.9% of the 440px reference viewport).
Side view is 174px including the long tail; this is not proof that every facing
fits the desired range. Stance is finite and floor-safe (min Z -0.195633 against
floor -0.197), zero penetrating vertices. One pose only; no motion validation.

Local private `hunt-fit-review-v1/native-player-fit.png` is a screenshot composite,
not live integration. Native sprite pasted without scaling; player-region bytes
match the reference exactly. Private directory is ignored; no reference/composite
pixels are uploaded. Public comparison contains only owned source renders and
labels: identical camera/density, clay enlarged exactly 2x, texture at native size.

Internal result: chest/neck/thigh/paw masses read more coherently and neither
the long sail nor the membrane hump remains. This is an anatomical work in
progress, not owner acceptance or finished sprites. Remaining work includes
stronger skull/plate detail, improved tail UV/material, all-facing mobile scale,
fold/open deformation, and the full action library before runtime integration.
V37 motion is preserved separately and cannot certify the new anatomy.

PR #186 remains draft; source, code and review checkpoints pushed separately.
